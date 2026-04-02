import type { HandshakeResult } from './protocol.js'
import type { TodoItem } from './statePersistence.js'

const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'
const CYAN = '\x1b[36m'
const BLUE = '\x1b[34m'
const YELLOW = '\x1b[33m'
const GREEN = '\x1b[32m'
const MAGENTA = '\x1b[35m'
const GRAY = '\x1b[90m'

// Box drawing chars
const V_LINE = '┃'
const H_LINE = '━'
const BL_CORNER = '┗'

type CanvasState = {
  handshake: HandshakeResult
  transcript: string[]
  notes: string[]
  todos: TodoItem[]
  focus: string | null
  currentSession: string | null
  toolsCount: number
  width?: number
}

function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-9;]*m/g, '')
}

function clipToWidth(line: string, maxWidth: number): string {
  const clean = stripAnsi(line)
  if (clean.length <= maxWidth) {
    return line
  }
  // To correctly truncate strings with ANSI, we just clip the clean text for simplicity,
  // but wait, we lose colors!
  // Since we only clip if the user makes a huge terminal window or small,
  // let's just make sure the individual pieces are clipped aggressively.
  return line // Fallback: we clip the components before building the line
}

function clip(value: string, max = 88): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function lastLineMatching(lines: string[], prefix: string): string | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim()
    }
  }
  return null
}

function collectRecentSignals(lines: string[]): string[] {
  const signals: string[] = []
  const lastUser = lastLineMatching(lines, 'shook> ')
  const lastAssistant = lastLineMatching(lines, 'Shook: ')
  const lastTool = lastLineMatching(lines, '[tool-result] ')

  if (lastUser) {
    signals.push(`最近提问: ${clip(lastUser)}`)
  }
  if (lastAssistant) {
    signals.push(`最近回答: ${clip(lastAssistant)}`)
  }
  if (lastTool) {
    signals.push(`最近工具: ${clip(lastTool)}`)
  }

  const recentCommand = [...lines]
    .reverse()
    .find(line => line.startsWith('shook> !') || line.startsWith('shook> /'))
  if (recentCommand) {
    signals.push(`最近动作: ${clip(recentCommand.slice('shook> '.length))}`)
  }

  return signals.slice(0, 4)
}
export function buildContextCanvas(state: CanvasState): string {
  const lines: string[] = []
  const width = state.width ?? 88
  const maxFocus = Math.max(10, width - 60)
  const maxNote = Math.max(10, Math.floor((width - 20) / 2))
  const maxTodo = Math.max(10, Math.floor((width - 20) / 3))
  const maxSignal = Math.max(10, Math.floor((width - 20) / 2))

  const prefix = `${GRAY}${V_LINE}${RESET}`
  const focusText = state.focus ? `${GREEN}${clip(state.focus, maxFocus)}${RESET}` : `${DIM}未设置${RESET}`
  const sessionText = state.currentSession ? `${CYAN}${clip(state.currentSession, 12)}${RESET}` : `${DIM}latest${RESET}`
  const toolsText = `${YELLOW}${state.toolsCount} available${RESET}`
  const signals = collectRecentSignals(state.transcript)
  const noteText = state.notes.length > 0
    ? state.notes.slice(-2).map(note => clip(note, maxNote)).join(`${DIM} · ${RESET}`)
    : `${DIM}暂无工作记忆${RESET}`
  const todoText = state.todos.length > 0
    ? state.todos
        .slice(-3)
        .map(todo => `${todo.done ? `${GREEN}✓${RESET}` : `${GRAY}○${RESET}`} ${clip(todo.content, maxTodo)}`)
        .join(`${DIM} · ${RESET}`)
    : `${DIM}暂无待办事项${RESET}`
  const signalText = signals.length > 0
    ? signals.slice(0, 2).map(sig => clip(sig, maxSignal)).join(`${DIM} | ${RESET}`)
    : `${DIM}暂无近期交互${RESET}`

  lines.push(`${prefix} ${BOLD}${CYAN}✨ Canvas${RESET}  ${BOLD}Focus:${RESET} ${focusText}  ${DIM}|${RESET}  ${BOLD}Session:${RESET} ${sessionText}  ${DIM}|${RESET}  ${BOLD}Tools:${RESET} ${toolsText}`)
  lines.push(`${prefix} ${BOLD}${MAGENTA}🧠 Memory:${RESET} ${noteText}`)
  lines.push(`${prefix} ${BOLD}${BLUE}✅ Todos:${RESET} ${todoText}`)
  lines.push(`${prefix} ${BOLD}${YELLOW}📡 Signals:${RESET} ${signalText}`)
  lines.push(`${GRAY}${BL_CORNER}${H_LINE.repeat(Math.max(10, width - 2))}${RESET}`)

  return lines.join('\n')
}
