import { PROJECT_ROOT } from './paths.js'
import type { RuntimeModules, TodoItem, WorkflowStateFile } from './runtime.types.js'

export type StatusSnapshot = {
  focus: string | null
  todos: TodoItem[]
  todosUpdatedAt: string | null
  workflows: WorkflowStateFile
  latest: { mode: string | null; savedAt: string | null } | null
  readAt: string
}

export async function readStatusSnapshot(runtime: RuntimeModules): Promise<StatusSnapshot> {
  const { loadTodosFile, loadWorkflowState, loadLatestSnapshot } = runtime.statePersistence
  const [todosFile, workflows, latest] = await Promise.all([
    loadTodosFile(PROJECT_ROOT),
    loadWorkflowState(PROJECT_ROOT),
    loadLatestSnapshot(PROJECT_ROOT),
  ])
  return {
    focus: todosFile?.focus ?? null,
    todos: todosFile?.todos ?? [],
    todosUpdatedAt: todosFile?.updatedAt ?? null,
    workflows,
    latest: latest ? { mode: latest.mode ?? null, savedAt: latest.savedAt ?? null } : null,
    readAt: new Date().toISOString(),
  }
}
