import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { buildContextCanvas } from './contextCanvas.js'
import { getCockpitHelp, runCockpitTransform, type CockpitMode } from './cockpit.js'
import { buildInputChrome, cursorUpCount } from './inputChrome.js'
import { readInputWithInk } from './inkInput.js'
import { render as renderMessages } from './messages.js'
import { ModelClient } from './modelClient.js'
import type { CommandRunResult, HandshakeResult, ToolDescriptor, WorkerStreamEvent } from './protocol.js'
import { runQueryLoop } from './queryLoop.js'
import { runGetNews } from './newsWorkflow.js'
import { runPredictBtc } from './predictBtc.js'
import {
  ensureStateDirs,
  listSavedSessions,
  loadLatestSnapshot,
  loadNamedSession,
  saveLatestSnapshot,
  saveNamedSession,
  type SessionSnapshot,
  type TodoItem,
} from './statePersistence.js'
import { PythonWorkerClient } from './workerClient.js'

type CliOptions = {
  execCommands: string[]
  showBanner: boolean
  showHelp: boolean
  showVersion: boolean
}

type CommandOutcome = {
  continueRunning: boolean
  exitCode: number
}

type RuntimeState = {
  handshake: HandshakeResult
  projectRoot: string
  transcript: string[]
  tools: ToolDescriptor[]
  notes: string[]
  todos: TodoItem[]
  focus: string | null
  currentSession: string | null
  cockpitMode: CockpitMode | null
  busy: boolean
}

const RUNTIME_VERSION = '0.1.0'
const BUILTIN_COMMANDS = new Set(['getNews', 'Runway'])
const RED = '\u001B[31m'
const LIGHT_RED = '\u001B[38;5;203m'
const RESET = '\u001B[0m'

type DashboardConfig = {
  title: string
  leftWidth: number
  rightWidth: number
  monsterWidth: number
  leftPadding: number
  tagline: string
}

function getProjectRoot(): string {
  const runtimeFile = fileURLToPath(import.meta.url)
  return dirname(dirname(dirname(runtimeFile)))
}

async function loadEnvFile(projectRoot: string): Promise<void> {
  const envPath = join(projectRoot, '.env')
  let content = ''

  try {
    content = await readFile(envPath, 'utf8')
  } catch {
    return
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    if (!key || process.env[key]) {
      continue
    }

    let value = line.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    execCommands: [],
    showBanner: true,
    showHelp: false,
    showVersion: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--no-banner') {
      options.showBanner = false
      continue
    }

    if (value === '--help' || value === '-h') {
      options.showHelp = true
      continue
    }

    if (value === '--version') {
      options.showVersion = true
      continue
    }

    if (value === '--exec') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error('--exec 需要一个命令字符串')
      }
      options.execCommands.push(nextValue)
      index += 1
      continue
    }

    throw new Error(`未知参数: ${value}`)
  }

  return options
}

function splitCommandLine(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let escaped = false

  for (const char of input) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (quote) {
      if (char === quote) {
        quote = null
      } else {
        current += char
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (escaped) {
    current += '\\'
  }

  if (quote) {
    throw new Error('命令存在未闭合的引号')
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

function formatRunwayProjects(projects: HandshakeResult['runwayProjects']): string {
  if (projects.length === 0) {
    return 'None'
  }

  return projects.map(project => project.name).join(', ')
}

function normalizeCommand(command: string): string {
  if (command === 'get-news') return 'getNews'
  if (command === 'predict-btc') return 'predict_btc'
  if (command === 'runway') return 'Runway'
  return command
}

async function loadAnimationFrames(projectRoot: string): Promise<string[]> {
  try {
    const path = join(projectRoot, 'runtime', 'ui', 'frames.json')
    const text = await readFile(path, 'utf8')
    const arr = JSON.parse(text) as string[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function loadMonsterLines(projectRoot: string): Promise<string[]> {
  try {
    const path = join(projectRoot, 'runtime', 'ui', 'monster.txt')
    const text = await readFile(path, 'utf8')
    return text
      .replace(/\u001B\[\?25[hl]/g, '')
      .split('\n')
      .filter(line => line.trim().length > 0)
  } catch {
    return []
  }
}

async function loadDashboardConfig(projectRoot: string): Promise<DashboardConfig> {
  const path = join(projectRoot, 'runtime', 'ui', 'dashboard.json')
  try {
    return JSON.parse(await readFile(path, 'utf8')) as DashboardConfig
  } catch {
    return {
      title: ' Shook v0.3.0 ',
      leftWidth: 52,
      rightWidth: 42,
      monsterWidth: 40,
      leftPadding: 6,
      tagline: 'SHOOK AIR — One Helicopter. Infinite Horizons.',
    }
  }
}

function buildDashboard(monsterLines: string[], handshake: HandshakeResult, busy: boolean, config: DashboardConfig): string {
  const leftDashCount = Math.max(config.leftWidth - config.title.length - 1, 0)
  const rightDashCount = Math.max(config.rightWidth - 1, 0)
  const lines: string[] = []
  const runway = formatRunwayProjects(handshake.runwayProjects)
  const rightContent = [
    '',
    '',
    `${RED}    P l i o t s :${RESET}  ${busy ? '1 / 0' : '0 / 1'}`,
    '',
    `${RED}    R u n w a y :${RESET}  ${runway}`,
    '',
    '',
  ]

  lines.push(`${RED}┌─${config.title}${'─'.repeat(leftDashCount)}┬${'─'.repeat(rightDashCount)}┐${RESET}`)
  const maxLines = Math.max(monsterLines.length + 2, rightContent.length)
  for (let index = 0; index < maxLines; index += 1) {
    const monsterIndex = index - 1
    const leftContent = monsterIndex >= 0 && monsterIndex < monsterLines.length ? `${' '.repeat(config.leftPadding)}${monsterLines[monsterIndex]}` : ''
    const remainingSpace = monsterIndex >= 0 && monsterIndex < monsterLines.length ? config.leftWidth - config.leftPadding - config.monsterWidth - 1 : config.leftWidth - 1
    const rightText = rightContent[index] ?? ''
    const visibleRight = rightText.replace(/\u001B\[[0-9;]*m/g, '')
    const rightPadding = Math.max(config.rightWidth - visibleRight.length - 1, 0)
    lines.push(`${RED}│${RESET}${leftContent}${' '.repeat(Math.max(remainingSpace, 0))}${LIGHT_RED}│${RESET}${rightText}${' '.repeat(rightPadding)}${RED}│${RESET}`)
  }
  lines.push(`${RED}└${'─'.repeat(config.leftWidth)}┴${'─'.repeat(config.rightWidth)}┘${RESET}`)
  return `${lines.join('\n')}\n`
}

function appendTranscript(state: RuntimeState, content: string): void {
  const normalized = content.replace(/\r/g, '')
  const lines = normalized.split('\n')
  for (const line of lines) {
    state.transcript.push(line)
  }
  if (state.transcript.length > 120) {
    state.transcript.splice(0, state.transcript.length - 120)
  }
}

async function refreshTools(state: RuntimeState, client: PythonWorkerClient): Promise<{ ok: boolean; message: string }> {
  try {
    const tools = await client.listTools()
    state.tools = tools
    return {
      ok: true,
      message: `[tools] 已加载 ${tools.length} 个工具`,
    }
  } catch (error) {
    state.tools = []
    return {
      ok: false,
      message: `[tools] 加载失败：${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function buildSnapshot(state: RuntimeState): SessionSnapshot {
  return {
    transcript: state.transcript,
    notes: state.notes,
    todos: state.todos,
    mission: state.focus,
    mode: state.cockpitMode ? `cockpit:${state.cockpitMode}` : 'standard',
    savedAt: new Date().toISOString(),
  }
}

async function persistLatestState(state: RuntimeState): Promise<void> {
  await saveLatestSnapshot(state.projectRoot, buildSnapshot(state))
}

function loadSnapshotIntoState(state: RuntimeState, snapshot: SessionSnapshot, sessionName: string | null): void {
  state.transcript = snapshot.transcript ?? []
  state.notes = snapshot.notes ?? []
  state.todos = snapshot.todos ?? []
  state.focus = snapshot.mission ?? null
  state.currentSession = sessionName
  state.cockpitMode = snapshot.mode?.startsWith('cockpit:') ? snapshot.mode.slice('cockpit:'.length) as CockpitMode : null
}

async function renderIntroAnimation(projectRoot: string): Promise<void> {
  if (process.env.SHOOK_SKIP_ANIM === '1') {
    return
  }
  const frames = await loadAnimationFrames(projectRoot)
  for (let index = 0; index < frames.length; index += 1) {
    process.stdout.write('\u001B[2J\u001B[H')
    process.stdout.write(`${frames[index]}\n`)
    if (index < frames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }
  await new Promise(resolve => setTimeout(resolve, 500))
}

function renderUi(state: RuntimeState, monsterLines: string[], dashboardConfig: DashboardConfig): void {
  process.stdout.write('\u001B[2J\u001B[3J\u001B[H')
  const width = Math.max(40, Math.min(120, process.stdout.columns ?? 88))
  process.stdout.write(buildDashboard(monsterLines, state.handshake, state.busy, dashboardConfig))
  process.stdout.write(`${dashboardConfig.tagline}\n\n`)
  if (state.transcript.length > 0) {
    process.stdout.write(`${renderMessages(state.transcript, width)}\n\n`)
  }
}

function printHelp(handshake?: HandshakeResult): void {
  const lines = [
    'Shook TS Runtime',
    '',
    'slash 命令：',
    '  /get-news [--dry-run] [--date YYYY-MM-DD]   生成日报',
    '  /predict-btc [--output-dir PATH]            生成 BTC 预测看板',
    '  /cockpit draft|compress|polish [TEXT]       进入/执行草拟-压缩-润色模式',
    '  /cockpit off                                退出 Cockpit 模式',
    '  /runway add --name NAME --path PATH         添加 Runway 项目',
    '  /runway delete --name NAME                  删除 Runway 项目',
    '  /runway list                                列出所有项目',
    '  /focus set TEXT | /focus clear             设置当前任务焦点',
    '  /note add TEXT | /note list | /note clear  管理工作记忆',
    '  /todo add TEXT | /todo done N              管理待办事项',
    '  /todo list | /todo undo N | /todo rm N     查看/恢复/删除待办',
    '  /save [NAME] | /load NAME                  保存或加载会话快照',
    '  /sessions                                  列出已保存会话',
    '  /tools [refresh]                           查看或刷新当前可用工具',
    '  /help                                       显示帮助',
    '  /exit                                       退出运行时',
    '',
    '!<command> 以 zsh 执行系统命令。',
    '普通文本会进入自然语言对话模式，必要时调用 Python 工具。',
  ]

  if (handshake) {
    lines.push(`当前 Runway 项目：${formatRunwayProjects(handshake.runwayProjects)}`)
  }

  console.log(lines.join('\n'))
}

function writeCommandStream(event: WorkerStreamEvent): void {
  const writer = event.stream === 'stderr' ? process.stderr : process.stdout
  writer.write(`${event.line}\n`)
}

function createTranscriptStreamWriter(state: RuntimeState): (event: WorkerStreamEvent) => void {
  return (event: WorkerStreamEvent) => {
    appendTranscript(state, event.line)
  }
}

function getTodoByDisplayIndex(state: RuntimeState, indexValue: string | undefined): TodoItem | null {
  const index = Number(indexValue)
  if (!Number.isInteger(index) || index < 1 || index > state.todos.length) {
    return null
  }
  return state.todos[index - 1] ?? null
}

async function handleCanvasCommands(command: string, args: string[], state: RuntimeState, client: PythonWorkerClient): Promise<boolean> {
  if (command === 'focus') {
    const subcommand = args[0]
    if (subcommand === 'set') {
      const value = args.slice(1).join(' ').trim()
      state.focus = value || null
      appendTranscript(state, state.focus ? `[focus] ${state.focus}` : '[focus] 已清空')
      await persistLatestState(state)
      return true
    }
    if (subcommand === 'clear') {
      state.focus = null
      appendTranscript(state, '[focus] 已清空')
      await persistLatestState(state)
      return true
    }
  }

  if (command === 'note') {
    const subcommand = args[0]
    if (subcommand === 'add') {
      const value = args.slice(1).join(' ').trim()
      if (value) {
        state.notes.push(value)
        appendTranscript(state, `[note] 已记录：${value}`)
        await persistLatestState(state)
      }
      return true
    }
    if (subcommand === 'list') {
      appendTranscript(state, state.notes.length > 0 ? state.notes.map((note, index) => `${index + 1}. ${note}`).join('\n') : '[note] 暂无记录')
      return true
    }
    if (subcommand === 'clear') {
      state.notes = []
      appendTranscript(state, '[note] 已清空')
      await persistLatestState(state)
      return true
    }
  }

  if (command === 'todo') {
    const subcommand = args[0]
    if (subcommand === 'add') {
      const value = args.slice(1).join(' ').trim()
      if (value) {
        const todo: TodoItem = {
          id: Date.now(),
          content: value,
          done: false,
          createdAt: new Date().toISOString(),
        }
        state.todos.push(todo)
        appendTranscript(state, `[todo] 已添加：${value}`)
        await persistLatestState(state)
      }
      return true
    }
    if (subcommand === 'list') {
      appendTranscript(state, state.todos.length > 0 ? state.todos.map((todo, index) => `${index + 1}. [${todo.done ? 'x' : ' '}] ${todo.content}`).join('\n') : '[todo] 暂无待办')
      return true
    }
    if (subcommand === 'done' || subcommand === 'undo' || subcommand === 'rm') {
      const todo = getTodoByDisplayIndex(state, args[1])
      if (!todo) {
        appendTranscript(state, `[todo] 无效序号：${args[1] ?? '空'}`)
        return true
      }
      if (subcommand === 'done') {
        todo.done = true
        todo.completedAt = new Date().toISOString()
        appendTranscript(state, `[todo] 已完成：${todo.content}`)
      } else if (subcommand === 'undo') {
        todo.done = false
        delete todo.completedAt
        appendTranscript(state, `[todo] 已恢复：${todo.content}`)
      } else {
        state.todos = state.todos.filter(item => item.id !== todo.id)
        appendTranscript(state, `[todo] 已删除：${todo.content}`)
      }
      await persistLatestState(state)
      return true
    }
  }

  if (command === 'save') {
    const sessionName = args[0] ?? `session-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`
    const savedName = await saveNamedSession(state.projectRoot, sessionName, buildSnapshot(state))
    state.currentSession = savedName
    appendTranscript(state, `[session] 已保存：${savedName}`)
    await persistLatestState(state)
    return true
  }

  if (command === 'sessions') {
    const sessions = await listSavedSessions(state.projectRoot)
    appendTranscript(state, sessions.length > 0 ? sessions.join('\n') : '[session] 暂无已保存会话')
    return true
  }

  if (command === 'tools') {
    if (args[0] === 'refresh') {
      const result = await refreshTools(state, client)
      appendTranscript(state, result.message)
      await persistLatestState(state)
      return true
    }
    appendTranscript(
      state,
      state.tools.length > 0
        ? `[tools] 当前共 ${state.tools.length} 个工具\n${state.tools.map(tool => `- ${tool.name}`).join('\n')}`
        : '[tools] 当前没有已加载工具，可尝试 /tools refresh',
    )
    return true
  }

  if (command === 'load') {
    const sessionName = args[0]
    if (!sessionName) {
      appendTranscript(state, '[session] /load 需要会话名')
      return true
    }
    const snapshot = sessionName === 'latest' ? await loadLatestSnapshot(state.projectRoot) : await loadNamedSession(state.projectRoot, sessionName)
    if (!snapshot) {
      appendTranscript(state, `[session] 未找到会话：${sessionName}`)
      return true
    }
    loadSnapshotIntoState(state, snapshot, sessionName === 'latest' ? state.currentSession : sessionName)
    appendTranscript(state, `[session] 已加载：${sessionName}`)
    await persistLatestState(state)
    return true
  }

  return false
}

async function handleCockpitCommands(
  args: string[],
  state: RuntimeState,
  modelClient: ModelClient,
): Promise<boolean> {
  const subcommand = args[0]
  if (!subcommand) {
    appendTranscript(state, getCockpitHelp(state.cockpitMode))
    return true
  }

  if (subcommand === 'off') {
    state.cockpitMode = null
    appendTranscript(state, '[cockpit] 已退出')
    await persistLatestState(state)
    return true
  }

  if (subcommand === 'draft' || subcommand === 'compress' || subcommand === 'polish') {
    state.cockpitMode = subcommand
    appendTranscript(state, `[cockpit] 已进入 ${subcommand} 模式`)
    const inlineText = args.slice(1).join(' ').trim()
    if (inlineText) {
      const result = await runCockpitTransform({
        mode: subcommand,
        text: inlineText,
        modelClient,
      })
      appendTranscript(state, `Cockpit(${subcommand}): ${result}`)
    }
    await persistLatestState(state)
    return true
  }

  appendTranscript(state, getCockpitHelp(state.cockpitMode))
  return true
}

async function runCommand(
  line: string,
  client: PythonWorkerClient,
  state: RuntimeState,
  modelClient: ModelClient,
  options?: {
    interactive?: boolean
    dashboardConfig?: DashboardConfig
  },
): Promise<CommandOutcome> {
  const trimmed = line.trim()
  if (!trimmed) {
    return { continueRunning: true, exitCode: 0 }
  }

  const isInteractive = options?.interactive ?? false
  const streamWriter = isInteractive ? createTranscriptStreamWriter(state) : writeCommandStream
  if (isInteractive) {
    appendTranscript(state, `shook> ${trimmed}`)
  }

  if (trimmed.startsWith('!')) {
    const shellCommand = trimmed.slice(1).trim()
    if (!shellCommand) {
      const message = '[shook] ! 后面需要跟要执行的 shell 命令'
      if (isInteractive) {
        appendTranscript(state, message)
      } else {
        console.error(message)
      }
      return { continueRunning: true, exitCode: 1 }
    }
    try {
      const result = await client.request<CommandRunResult, { commandLine: string }>(
        'run_shell',
        { commandLine: shellCommand },
        streamWriter,
      )
      if (result.exitCode !== 0) {
        const message = `[shook] 命令退出码: ${result.exitCode}`
        if (isInteractive) {
          appendTranscript(state, message)
        } else {
          console.error(message)
        }
      }
      return { continueRunning: true, exitCode: result.exitCode }
    } catch (error) {
      const message = `[shook] ${(error as Error).message}`
      if (isInteractive) {
        appendTranscript(state, message)
      } else {
        console.error(message)
      }
      return { continueRunning: true, exitCode: 1 }
    }
  }

  let tokens: string[]

  try {
    tokens = splitCommandLine(trimmed)
  } catch (error) {
    const message = `[shook] ${(error as Error).message}`
    if (isInteractive) {
      appendTranscript(state, message)
    } else {
      console.error(message)
    }
    return { continueRunning: true, exitCode: 1 }
  }

  const [command, ...args] = tokens
  const normalizedCommand = normalizeCommand(command.startsWith('/') ? command.slice(1) : command)

  if (!normalizedCommand) {
    return { continueRunning: true, exitCode: 0 }
  }

  if (normalizedCommand === 'help' || normalizedCommand === '?') {
    if (isInteractive) {
      appendTranscript(state, [
        'Shook TS Runtime',
        '',
        'slash 命令：',
        '  /get-news [--dry-run] [--date YYYY-MM-DD]   生成日报',
        '  /predict-btc [--output-dir PATH]            生成 BTC 预测看板',
        '  /cockpit draft|compress|polish [TEXT]       进入/执行草拟-压缩-润色模式',
        '  /cockpit off                                退出 Cockpit 模式',
        '  /runway add --name NAME --path PATH         添加 Runway 项目',
        '  /runway delete --name NAME                  删除 Runway 项目',
        '  /runway list                                列出所有项目',
        '  /focus set TEXT | /focus clear             设置当前任务焦点',
        '  /note add TEXT | /note list | /note clear  管理工作记忆',
        '  /todo add TEXT | /todo done N              管理待办事项',
        '  /todo list | /todo undo N | /todo rm N     查看/恢复/删除待办',
        '  /save [NAME] | /load NAME                  保存或加载会话快照',
        '  /sessions                                  列出已保存会话',
        '  /tools [refresh]                           查看或刷新当前可用工具',
        '  /help                                       显示帮助',
        '  /exit                                       退出运行时',
        '',
        '!<command> 以 zsh 执行系统命令。',
        '普通文本会进入自然语言对话模式，必要时调用 Python 工具。',
        `当前 Runway 项目：${formatRunwayProjects(state.handshake.runwayProjects)}`,
      ].join('\n'))
    } else {
      printHelp(state.handshake)
    }
    return { continueRunning: true, exitCode: 0 }
  }

  if (normalizedCommand === 'exit' || normalizedCommand === 'quit' || normalizedCommand === 'q') {
    return { continueRunning: false, exitCode: 0 }
  }

  if (trimmed.startsWith('/') && normalizedCommand === 'cockpit') {
    await handleCockpitCommands(args, state, modelClient)
    return { continueRunning: true, exitCode: 0 }
  }

  if (trimmed.startsWith('/') && normalizedCommand === 'predict_btc') {
    try {
      state.busy = true
      const outputDirArgIndex = args.findIndex(arg => arg === '--output-dir')
      const outputDir = outputDirArgIndex >= 0 ? (args[outputDirArgIndex + 1] ?? '') : ''
      const reportPath = await runPredictBtc({
        projectRoot: state.projectRoot,
        outputDir,
        workerClient: client,
        modelClient,
        onLog: (line: string) => isInteractive ? appendTranscript(state, line) : console.log(line),
      })
      const message = `[predict-btc] 报告已生成：${reportPath}`
      if (isInteractive) appendTranscript(state, message)
      else console.log(message)
      await persistLatestState(state)
      return { continueRunning: true, exitCode: 0 }
    } catch (error) {
      const message = `[shook] ${(error as Error).message}`
      if (isInteractive) appendTranscript(state, message)
      else console.error(message)
      return { continueRunning: true, exitCode: 1 }
    } finally {
      state.busy = false
    }
  }

  if (trimmed.startsWith('/') && await handleCanvasCommands(normalizedCommand, args, state, client)) {
    return { continueRunning: true, exitCode: 0 }
  }

  if (!trimmed.startsWith('/') && !BUILTIN_COMMANDS.has(normalizedCommand)) {
    try {
      state.busy = true
      if (state.cockpitMode) {
        const result = await runCockpitTransform({
          mode: state.cockpitMode,
          text: trimmed,
          modelClient,
        })
        const label = state.cockpitMode === 'draft' ? '草拟' : state.cockpitMode === 'compress' ? '压缩' : '润色'
        if (isInteractive) appendTranscript(state, `Cockpit(${label}): ${result}`)
        else console.log(`Cockpit(${label}): ${result}`)
        await persistLatestState(state)
        return { continueRunning: true, exitCode: 0 }
      }
      const generator = runQueryLoop({
        prompt: trimmed,
        tools: state.tools,
        modelClient,
        workerClient: client,
        history: state.transcript,
        notes: state.notes,
        todos: state.todos,
      })

      for await (const event of generator) {
        if (event.type === 'text') {
          if (isInteractive) appendTranscript(state, event.content)
          else console.log(event.content)
        } else if (event.type === 'tool_start') {
          const msg = `[tool] ${event.tool}\n${JSON.stringify(event.args, null, 2)}`
          if (isInteractive) appendTranscript(state, msg)
          else console.log(msg)
        } else if (event.type === 'tool_result') {
          const msg = `[tool-result] ${event.tool}\n${event.result}`
          if (isInteractive) appendTranscript(state, msg)
          else console.log(msg)
        } else if (event.type === 'error') {
          if (isInteractive) appendTranscript(state, event.message)
          else console.error(event.message)
        }

        // 每次收到新事件，刷新一次 UI，实现真正的流式响应体验！
        if (isInteractive && options?.dashboardConfig) {
          renderUi(state, [], options.dashboardConfig)
        }
      }

      await persistLatestState(state)
      return { continueRunning: true, exitCode: 0 }
    } catch (error) {
      const message = `[shook] ${(error as Error).message}`
      if (isInteractive) {
        appendTranscript(state, message)
      } else {
        console.error(message)
      }
      return { continueRunning: true, exitCode: 1 }
    } finally {
      state.busy = false
    }
  }

  try {
    state.busy = true
    if (BUILTIN_COMMANDS.has(normalizedCommand)) {
      if (normalizedCommand === 'getNews') {
        // 直接走 TS runtime 的编排，不再调用旧 Python orchestrator
        const dryRun = args.includes('--dry-run')
        const dateArgIndex = args.findIndex(a => a === '--date')
        const date = dateArgIndex >= 0 ? (args[dateArgIndex + 1] ?? '') : ''
        const reportPath = await runGetNews({
          projectRoot: state.projectRoot,
          workerClient: client,
          modelClient,
          date,
          dryRun,
          onLog: (line: string) => isInteractive ? appendTranscript(state, line) : console.log(line),
        })
        if (reportPath) {
          const message = `[get-news] 报告已生成：${reportPath}`
          if (isInteractive) appendTranscript(state, message)
          else console.log(message)
        }
        await persistLatestState(state)
        return { continueRunning: true, exitCode: 0 }
      }
      const result = await client.request<CommandRunResult, { command: string; args: string[] }>(
        'run_builtin',
        { command: normalizedCommand, args },
        streamWriter,
      )

      if (result.runwayProjects) {
        state.handshake = {
          ...state.handshake,
          runwayProjects: result.runwayProjects,
        }
      }

      if (result.exitCode !== 0) {
        const message = `[shook] 命令退出码: ${result.exitCode}`
        if (isInteractive) {
          appendTranscript(state, message)
        } else {
          console.error(message)
        }
      }

      await persistLatestState(state)
      return { continueRunning: true, exitCode: result.exitCode }
    }

    const result = await client.request<CommandRunResult, { commandLine: string }>(
      'run_shell',
      { commandLine: trimmed },
      streamWriter,
    )

    if (result.exitCode !== 0) {
      const message = `[shook] 命令退出码: ${result.exitCode}`
      if (isInteractive) {
        appendTranscript(state, message)
      } else {
        console.error(message)
      }
    }

    await persistLatestState(state)
    return { continueRunning: true, exitCode: result.exitCode }
  } catch (error) {
    const message = `[shook] ${(error as Error).message}`
    if (isInteractive) {
      appendTranscript(state, message)
    } else {
      console.error(message)
    }
    return { continueRunning: true, exitCode: 1 }
  } finally {
    state.busy = false
  }
}

async function runExecCommands(
  commands: string[],
  client: PythonWorkerClient,
  state: RuntimeState,
  modelClient: ModelClient,
): Promise<number> {
  let lastExitCode = 0

  for (const command of commands) {
    const outcome = await runCommand(command, client, state, modelClient)
    lastExitCode = outcome.exitCode
    if (!outcome.continueRunning) {
      return lastExitCode
    }
  }

  return lastExitCode
}

async function readCommandsFromStdin(): Promise<string[]> {
  const chunks: string[] = []

  for await (const chunk of process.stdin) {
    chunks.push(String(chunk))
  }

  return chunks
    .join('')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

async function runInteractiveSession(
  client: PythonWorkerClient,
  state: RuntimeState,
  monsterLines: string[],
  dashboardConfig: DashboardConfig,
  modelClient: ModelClient,
): Promise<number> {
  let lastExitCode = 0

  try {
    while (true) {
      renderUi(state, monsterLines, dashboardConfig)
      const line = await readInputWithInk(state)
      process.stdout.write(RESET)
      const outcome = await runCommand(line, client, state, modelClient, { 
        interactive: true,
        dashboardConfig
      })
      lastExitCode = outcome.exitCode
      if (!outcome.continueRunning) {
        break
      }
    }
  } finally {
    // Cleanup if necessary
  }

  return lastExitCode
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2))

  if (options.showVersion) {
    console.log(`Shook TS Runtime v${RUNTIME_VERSION}`)
    return 0
  }

  const projectRoot = getProjectRoot()
  await loadEnvFile(projectRoot)
  const client = new PythonWorkerClient(projectRoot)
  const modelClient = new ModelClient()

  try {
    await ensureStateDirs(projectRoot)
    const handshake = await client.request<HandshakeResult, Record<string, never>>('handshake', {})
    const state: RuntimeState = {
      handshake,
      projectRoot,
      transcript: [],
      tools: [],
      notes: [],
      todos: [],
      focus: null,
      currentSession: null,
      cockpitMode: null,
      busy: false,
    }
    const latestSnapshot = await loadLatestSnapshot(projectRoot)
    if (latestSnapshot) {
      loadSnapshotIntoState(state, latestSnapshot, 'latest')
    }
    const initialTools = await refreshTools(state, client)
    if (!initialTools.ok) {
      appendTranscript(state, initialTools.message)
    }
    const monsterLines = await loadMonsterLines(projectRoot)
    const dashboardConfig = await loadDashboardConfig(projectRoot)

    if (options.showHelp) {
      printHelp(handshake)
      return 0
    }

    if (options.showBanner) {
      await renderIntroAnimation(projectRoot)
      renderUi(state, monsterLines, dashboardConfig)
    }

    if (options.execCommands.length > 0) {
      return await runExecCommands(options.execCommands, client, state, modelClient)
    }

    if (!process.stdin.isTTY) {
      const commands = await readCommandsFromStdin()
      return await runExecCommands(commands, client, state, modelClient)
    }

    return await runInteractiveSession(client, state, monsterLines, dashboardConfig, modelClient)
  } finally {
    await client.close()
  }
}

void main().then(
  code => {
    process.exitCode = code
  },
  error => {
    console.error(`[shook] ${(error as Error).message}`)
    process.exitCode = 1
  },
)
