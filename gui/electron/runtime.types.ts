// 手写的 dist/runtime 最小类型面：根包 tsc 不产出 .d.ts，这里只声明 GUI 用到的表面。

export type TodoItem = {
  id: number
  content: string
  done: boolean
  createdAt?: string
  completedAt?: string
}

export type TodosFile = {
  focus: string | null
  todos: TodoItem[]
  updatedAt?: string
}

export type SessionSnapshot = {
  transcript: string[]
  notes: string[]
  todos: TodoItem[]
  mode?: string
  savedAt?: string
}

export type WorkflowRunRecord = {
  last_run_at: string
  last_status: 'success' | 'failed'
  last_output?: string
  last_error?: string
  duration_ms: number
}

export type WorkflowStateFile = Record<string, WorkflowRunRecord>

export type WorkflowResult = {
  exitCode: number
  outputPath?: string
  message?: string
}

export type WorkflowContext = {
  projectRoot: string
  workerClient: PythonWorkerClientLike
  modelClient: ModelClientLike
  onLog?: (line: string) => void
}

export type ShookWorkflow = {
  name: string
  command: string
  aliases?: string[]
  description: string
  category: string
  run(args: string[], context: WorkflowContext): Promise<WorkflowResult>
}

export interface PythonWorkerClientLike {
  listTools(): Promise<unknown[]>
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>
  close(): Promise<void>
  setDiagnosticHandler(handler: (line: string) => void): void
}

// ModelClient 的具体方法 GUI 不直接调用，仅作为 WorkflowContext 传递。
export type ModelClientLike = object

export type RuntimeModules = {
  registry: {
    getWorkflow(command: string): ShookWorkflow | undefined
    listWorkflows(): ShookWorkflow[]
  }
  statePersistence: {
    ensureStateDirs(projectRoot: string): Promise<void>
    loadTodosFile(projectRoot: string): Promise<TodosFile | null>
    saveTodosFile(projectRoot: string, data: { focus: string | null; todos: TodoItem[] }): Promise<void>
    loadWorkflowState(projectRoot: string): Promise<WorkflowStateFile>
    loadLatestSnapshot(projectRoot: string): Promise<SessionSnapshot | null>
    recordWorkflowRun(
      projectRoot: string,
      workflowName: string,
      record: WorkflowRunRecord,
    ): Promise<WorkflowStateFile>
  }
  workerClient: {
    PythonWorkerClient: new (projectRoot: string, pythonExecutable?: string) => PythonWorkerClientLike
  }
  modelClient: {
    ModelClient: new () => ModelClientLike
  }
}
