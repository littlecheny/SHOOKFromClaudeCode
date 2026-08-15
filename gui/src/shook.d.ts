// window.shook —— preload 暴露的 API 与共享数据形状

export type TodoItem = {
  id: number
  content: string
  done: boolean
  createdAt?: string
  completedAt?: string
}

export type WorkflowRunRecord = {
  last_run_at?: string
  last_status?: 'success' | 'failed'
  last_output?: string
  last_error?: string
  duration_ms?: number
}

export type StatusSnapshot = {
  focus: string | null
  todos: TodoItem[]
  todosUpdatedAt: string | null
  workflows: Record<string, WorkflowRunRecord>
  latest: { mode: string | null; savedAt: string | null } | null
  readAt: string
}

export type WorkflowMeta = {
  name: string
  description: string
  category: string
}

export type WorkflowLogEvent = {
  runId: string
  name: string
  line: string
  ts: string
}

export type WorkflowStatusEvent = {
  runId: string
  name: string
  status: 'running' | 'success' | 'failed'
  startedAt: string
  finishedAt?: string
  outputPath?: string
  message?: string
  error?: string
}

export type Mood = 'passion' | 'joy' | 'sadness' | 'greed' | 'wealth' | 'calm' | 'focus' | 'anxiety'
export type MoodIntensity = 1 | 2 | 3

export type DayCommit = {
  date: string
  mood: Mood
  intensity: MoodIntensity
  note?: string
}

export type LifeWeek = {
  weekIndex: number
  startDate: string
  level: 0 | 1 | 2 | 3 | 4
  dominantMood: Mood | null
  days: DayCommit[]
}

export type LifeWeeksData = {
  birthDate: string
  lifespanYears: number
  totalWeeks: number
  currentWeekIndex: number
  trackedFromWeek: number
  todayCommit: DayCommit | null
  weeks: LifeWeek[]
}

export type ShookApi = {
  getState(): Promise<StatusSnapshot>
  getLifeWeeks(): Promise<LifeWeeksData>
  saveMoodCommit(commit: DayCommit): Promise<LifeWeeksData>
  listWorkflows(): Promise<WorkflowMeta[]>
  runWorkflow(name: string): Promise<{ ok: true; runId: string } | { ok: false; error: string }>
  openPath(path: string): Promise<string>
  setFocus(focus: string | null): Promise<StatusSnapshot>
  addTodo(content: string): Promise<StatusSnapshot>
  toggleTodo(id: number): Promise<StatusSnapshot>
  removeTodo(id: number): Promise<StatusSnapshot>
  onStateChanged(cb: (snapshot: StatusSnapshot) => void): () => void
  onWorkflowLog(cb: (event: WorkflowLogEvent) => void): () => void
  onWorkflowStatus(cb: (event: WorkflowStatusEvent) => void): () => void
  onNavigate(cb: (screen: string) => void): () => void
}

declare global {
  interface Window {
    shook: ShookApi
  }
}

export {}
