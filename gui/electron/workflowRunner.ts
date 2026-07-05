import { Notification, type WebContents } from 'electron'
import { PROJECT_ROOT } from './paths.js'
import type {
  ModelClientLike,
  PythonWorkerClientLike,
  RuntimeModules,
  WorkflowRunRecord,
} from './runtime.types.js'

export type WorkflowStatusPayload = {
  runId: string
  name: string
  status: 'running' | 'success' | 'failed'
  startedAt: string
  finishedAt?: string
  outputPath?: string
  message?: string
  error?: string
}

export type RunnerDeps = {
  runtime: RuntimeModules
  getWorkerClient: () => PythonWorkerClientLike
  resetWorkerClient: () => PythonWorkerClientLike
  modelClient: ModelClientLike
  send: (channel: string, payload: unknown) => void
  onRunFinished: () => void
  setBusyIndicator: (busy: boolean) => void
  showWindow: () => void
}

let busy = false
let runCounter = 0

export function isBusy(): boolean {
  return busy
}

export async function runWorkflow(
  deps: RunnerDeps,
  name: string,
): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  const workflow = deps.runtime.registry.getWorkflow(name)
  if (!workflow) return { ok: false, error: `未知工作流：${name}` }
  if (busy) return { ok: false, error: 'busy' }

  busy = true
  const runId = `run-${Date.now()}-${++runCounter}`
  const startedAt = new Date().toISOString()
  const startedMs = Date.now()
  deps.setBusyIndicator(true)
  deps.send('workflow:status', {
    runId,
    name: workflow.name,
    status: 'running',
    startedAt,
  } satisfies WorkflowStatusPayload)

  // 与 CLI 的 runRegisteredWorkflow 保持一致：run → recordWorkflowRun → 终态
  void (async () => {
    let record: WorkflowRunRecord
    let terminal: WorkflowStatusPayload
    try {
      const result = await workflow.run([], {
        projectRoot: PROJECT_ROOT,
        workerClient: deps.getWorkerClient(),
        modelClient: deps.modelClient,
        onLog: line => deps.send('workflow:log', { runId, name: workflow.name, line, ts: new Date().toISOString() }),
      })
      record = {
        last_run_at: startedAt,
        last_status: 'success',
        last_output: result.outputPath,
        duration_ms: Date.now() - startedMs,
      }
      terminal = {
        runId,
        name: workflow.name,
        status: 'success',
        startedAt,
        finishedAt: new Date().toISOString(),
        outputPath: result.outputPath,
        message: result.message,
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error)
      record = {
        last_run_at: startedAt,
        last_status: 'failed',
        last_error: messageText,
        duration_ms: Date.now() - startedMs,
      }
      terminal = {
        runId,
        name: workflow.name,
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        error: messageText,
      }
      // worker 传输层挂掉后重建 client，避免后续运行全部失败
      if (/worker|EPIPE|ECONNRESET|spawn/i.test(messageText)) {
        try {
          await deps.getWorkerClient().close()
        } catch {
          // 忽略关闭失败
        }
        deps.resetWorkerClient()
      }
    }

    try {
      await deps.runtime.statePersistence.recordWorkflowRun(PROJECT_ROOT, workflow.name, record)
    } catch {
      // 状态文件写入失败不阻塞 UI 终态
    }

    busy = false
    deps.setBusyIndicator(false)
    deps.send('workflow:status', terminal)
    notifyCompletion(deps, terminal)
    deps.onRunFinished()
  })()

  return { ok: true, runId }
}

function notifyCompletion(deps: RunnerDeps, terminal: WorkflowStatusPayload): void {
  if (!Notification.isSupported()) return
  const success = terminal.status === 'success'
  const notification = new Notification({
    title: success ? `${terminal.name} 完成` : `${terminal.name} 失败`,
    body: success
      ? (terminal.message ?? terminal.outputPath ?? '运行成功')
      : (terminal.error ?? '运行失败'),
  })
  notification.on('click', () => {
    deps.showWindow()
    deps.send('ui:navigate', 'workflows')
  })
  notification.show()
}

export function broadcastTo(webContents: WebContents | null) {
  return (channel: string, payload: unknown) => {
    if (webContents && !webContents.isDestroyed()) {
      webContents.send(channel, payload)
    }
  }
}
