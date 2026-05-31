import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type TodoItem = {
  id: number
  content: string
  done: boolean
  createdAt: string
  completedAt?: string
}

export type SessionSnapshot = {
  transcript: string[]
  notes: string[]
  todos: TodoItem[]
  mission: string | null
  mode: string
  canvasExpanded?: boolean
  savedAt: string
}

function getShookDir(projectRoot: string): string {
  return join(projectRoot, '.shook')
}

function getSessionsDir(projectRoot: string): string {
  return join(getShookDir(projectRoot), 'sessions')
}

function getLatestPath(projectRoot: string): string {
  return join(getShookDir(projectRoot), 'latest.json')
}

function getTodosPath(projectRoot: string): string {
  return join(getShookDir(projectRoot), 'todos.json')
}

function getWorkflowStatePath(projectRoot: string): string {
  return join(getShookDir(projectRoot), 'workflows.json')
}

/**
 * 独立的 Todo & Focus 文件结构，便于用户直接手动编辑
 */
export type TodosFile = {
  focus: string | null
  todos: TodoItem[]
  updatedAt?: string
  /** 文件顶部注释，写给用户看的 */
  _readme?: string[]
}

const TODOS_README = [
  '这个文件保存了 Shook 的 Focus 和 Todos。',
  '你可以直接编辑 focus 字段（字符串或 null）。',
  'todos 数组中每一项需要包含 id / content / done。',
  '保存后在 Shook 中执行 /refresh 即可立即生效。',
]

export async function loadTodosFile(projectRoot: string): Promise<TodosFile | null> {
  try {
    const raw = await readFile(getTodosPath(projectRoot), 'utf8')
    const parsed = JSON.parse(raw) as TodosFile
    return {
      focus: parsed.focus ?? null,
      todos: Array.isArray(parsed.todos) ? parsed.todos : [],
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

export async function saveTodosFile(projectRoot: string, data: { focus: string | null; todos: TodoItem[] }): Promise<void> {
  await ensureStateDirs(projectRoot)
  const payload: TodosFile = {
    _readme: TODOS_README,
    focus: data.focus,
    todos: data.todos,
    updatedAt: new Date().toISOString(),
  }
  await writeFile(getTodosPath(projectRoot), JSON.stringify(payload, null, 2), 'utf8')
}

export type WorkflowRunStatus = 'success' | 'failed'

export type WorkflowRunRecord = {
  last_run_at: string
  last_status: WorkflowRunStatus
  last_output?: string
  last_error?: string
  duration_ms: number
}

export type WorkflowStateFile = Record<string, WorkflowRunRecord>

export async function loadWorkflowState(projectRoot: string): Promise<WorkflowStateFile> {
  try {
    const raw = await readFile(getWorkflowStatePath(projectRoot), 'utf8')
    const parsed = JSON.parse(raw) as WorkflowStateFile
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export async function saveWorkflowState(projectRoot: string, state: WorkflowStateFile): Promise<void> {
  await ensureStateDirs(projectRoot)
  await writeFile(getWorkflowStatePath(projectRoot), JSON.stringify(state, null, 2), 'utf8')
}

export async function recordWorkflowRun(
  projectRoot: string,
  workflowName: string,
  record: WorkflowRunRecord,
): Promise<WorkflowStateFile> {
  const state = await loadWorkflowState(projectRoot)
  state[workflowName] = record
  await saveWorkflowState(projectRoot, state)
  return state
}

function sanitizeSessionName(name: string): string {
  return name.trim().replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'session'
}

export async function ensureStateDirs(projectRoot: string): Promise<void> {
  await mkdir(getSessionsDir(projectRoot), { recursive: true })
}

export async function saveLatestSnapshot(projectRoot: string, snapshot: SessionSnapshot): Promise<void> {
  await ensureStateDirs(projectRoot)
  await writeFile(getLatestPath(projectRoot), JSON.stringify(snapshot, null, 2), 'utf8')
}

export async function saveNamedSession(projectRoot: string, sessionName: string, snapshot: SessionSnapshot): Promise<string> {
  await ensureStateDirs(projectRoot)
  const fileName = `${sanitizeSessionName(sessionName)}.json`
  await writeFile(join(getSessionsDir(projectRoot), fileName), JSON.stringify(snapshot, null, 2), 'utf8')
  return fileName.replace(/\.json$/, '')
}

export async function listSavedSessions(projectRoot: string): Promise<string[]> {
  await ensureStateDirs(projectRoot)
  const files = await readdir(getSessionsDir(projectRoot), { withFileTypes: true })
  return files
    .filter(file => file.isFile() && file.name.endsWith('.json'))
    .map(file => file.name.replace(/\.json$/, ''))
    .sort()
}

export async function loadNamedSession(projectRoot: string, sessionName: string): Promise<SessionSnapshot> {
  await ensureStateDirs(projectRoot)
  const filePath = join(getSessionsDir(projectRoot), `${sanitizeSessionName(sessionName)}.json`)
  return JSON.parse(await readFile(filePath, 'utf8')) as SessionSnapshot
}

export async function loadLatestSnapshot(projectRoot: string): Promise<SessionSnapshot | null> {
  try {
    return JSON.parse(await readFile(getLatestPath(projectRoot), 'utf8')) as SessionSnapshot
  } catch {
    return null
  }
}
