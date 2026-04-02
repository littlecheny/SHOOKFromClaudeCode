import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { join } from 'node:path'
import readline from 'node:readline'
import type { ToolDescriptor, WorkerMessage, WorkerMethod, WorkerStreamEvent } from './protocol.js'

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  onStream?: (event: WorkerStreamEvent) => void
}

export class PythonWorkerClient {
  private child?: ChildProcessWithoutNullStreams
  private stdoutReader?: readline.Interface
  private stderrReader?: readline.Interface
  private readonly pending = new Map<string, PendingRequest>()
  private nextId = 0

  constructor(
    private readonly projectRoot: string,
    private readonly pythonExecutable = process.env.SHOOK_PYTHON ?? 'python3',
  ) {}

  private ensureStarted(): void {
    if (this.child) {
      return
    }

    const workerScript = join(this.projectRoot, 'scripts', 'shook_worker.py')

    this.child = spawn(this.pythonExecutable, [workerScript], {
      cwd: this.projectRoot,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.stdoutReader = readline.createInterface({
      input: this.child.stdout,
      crlfDelay: Infinity,
    })
    this.stderrReader = readline.createInterface({
      input: this.child.stderr,
      crlfDelay: Infinity,
    })

    this.stdoutReader.on('line', line => {
      this.handleWorkerMessage(line)
    })
    this.stderrReader.on('line', line => {
      process.stderr.write(`[worker] ${line}\n`)
    })
    this.child.on('exit', (code, signal) => {
      this.handleUnexpectedExit(code, signal)
    })
  }

  private handleWorkerMessage(rawLine: string): void {
    if (!rawLine.trim()) {
      return
    }

    let message: WorkerMessage

    try {
      message = JSON.parse(rawLine) as WorkerMessage
    } catch {
      process.stderr.write(`[worker] 无法解析消息: ${rawLine}\n`)
      return
    }

    if (message.type === 'stream') {
      this.pending.get(message.id)?.onStream?.(message)
      return
    }

    if (message.type === 'log') {
      const writer = message.level === 'error' ? process.stderr : process.stdout
      writer.write(`${message.message}\n`)
      return
    }

    const pending = this.pending.get(message.id)
    if (!pending) {
      return
    }

    this.pending.delete(message.id)

    if (message.ok) {
      pending.resolve(message.result)
      return
    }

    pending.reject(new Error(message.error ?? 'Python worker request failed'))
  }

  private handleUnexpectedExit(code: number | null, signal: NodeJS.Signals | null): void {
    const error = new Error(`Python worker exited unexpectedly (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)

    for (const pending of this.pending.values()) {
      pending.reject(error)
    }

    this.pending.clear()
    this.stdoutReader?.close()
    this.stderrReader?.close()
    this.child = undefined
  }

  async request<TResult, TParams>(
    method: WorkerMethod,
    params: TParams,
    onStream?: (event: WorkerStreamEvent) => void,
  ): Promise<TResult> {
    this.ensureStarted()

    const child = this.child
    if (!child || child.exitCode !== null) {
      throw new Error('Python worker is not available')
    }

    const id = `${++this.nextId}`

    return new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, {
        resolve: value => resolve(value as TResult),
        reject,
        onStream,
      })

      const payload = JSON.stringify({ id, method, params }) + '\n'
      child.stdin.write(payload, error => {
        if (!error) {
          return
        }

        this.pending.delete(id)
        reject(error instanceof Error ? error : new Error(String(error)))
      })
    })
  }

  async listTools(): Promise<ToolDescriptor[]> {
    return this.request<ToolDescriptor[], Record<string, never>>('list_tools', {})
  }

  async callTool(name: string, argumentsValue: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown, { tool: string; arguments: Record<string, unknown> }>('call_tool', {
      tool: name,
      arguments: argumentsValue,
    })
  }

  async close(): Promise<void> {
    const child = this.child
    if (!child) {
      return
    }

    try {
      if (child.exitCode === null) {
        await this.request<Record<string, never>, Record<string, never>>('shutdown', {})
      }
    } catch {
    }

    if (child.exitCode === null) {
      child.kill('SIGTERM')
    }

    this.stdoutReader?.close()
    this.stderrReader?.close()
    this.child = undefined
  }
}
