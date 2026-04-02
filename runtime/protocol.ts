export type WorkerMethod = 'handshake' | 'run_builtin' | 'run_shell' | 'list_tools' | 'call_tool' | 'shutdown'
export type WorkerStreamName = 'stdout' | 'stderr'

export interface RunwayProject {
  name: string
  path: string
}

export interface HandshakeResult {
  projectRoot: string
  commands: string[]
  runwayProjects: RunwayProject[]
  pythonExecutable: string
  workerScript: string
}

export interface CommandRunResult {
  exitCode: number
  runwayProjects?: RunwayProject[]
}

export interface ToolDescriptor {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface WorkerRequest<T = unknown> {
  id: string
  method: WorkerMethod
  params: T
}

export interface WorkerResponse<T = unknown> {
  type: 'response'
  id: string
  ok: boolean
  result?: T
  error?: string
}

export interface WorkerStreamEvent {
  type: 'stream'
  id: string
  stream: WorkerStreamName
  line: string
}

export interface WorkerLogEvent {
  type: 'log'
  level: 'info' | 'error'
  message: string
}

export type WorkerMessage = WorkerResponse | WorkerStreamEvent | WorkerLogEvent
