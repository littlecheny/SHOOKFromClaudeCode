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
