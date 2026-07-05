import type { CommandRunResult, WorkerStreamEvent } from '../protocol.js'
import type { ModelClient } from '../modelClient.js'
import type { PythonWorkerClient } from '../workerClient.js'

export type WorkflowCategory = 'daily' | 'finance' | 'project' | 'writing' | 'companion' | 'system'

export type WorkflowContext = {
  projectRoot: string
  workerClient: PythonWorkerClient
  modelClient: ModelClient
  onLog: (line: string) => void
  onStream?: (event: WorkerStreamEvent) => void
  runWorkerBuiltin: (command: string, args: string[]) => Promise<CommandRunResult>
}

export type WorkflowResult = {
  exitCode: number
  message?: string
  outputPath?: string
  runwayProjects?: CommandRunResult['runwayProjects']
}

export type ShookWorkflow = {
  name: string
  command: string
  aliases?: string[]
  description: string
  category: WorkflowCategory
  run(args: string[], context: WorkflowContext): Promise<WorkflowResult>
}
