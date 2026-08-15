import { useState } from 'react'
import StatusDot from '../shared/StatusDot'
import Tag from '../shared/Tag'
import RelativeTime from '../shared/RelativeTime'
import LogPane from './LogPane'
import type { RunState } from '../../hooks/useWorkflowRuns'
import type { WorkflowMeta, WorkflowRunRecord } from '../../shook'

const CATEGORY_VARIANT: Record<string, 'gary' | 'squid' | 'sponge' | 'patrick'> = {
  daily: 'gary',
  finance: 'squid',
}

export default function WorkflowCard({
  meta,
  run,
  record,
}: {
  meta: WorkflowMeta
  run?: RunState
  record?: WorkflowRunRecord
}) {
  const [error, setError] = useState<string | null>(null)
  const running = run?.status === 'running'
  const lastStatus = run?.lastEvent && run.status !== 'running' ? run.status : record?.last_status
  const lastError = run?.lastEvent?.error ?? record?.last_error
  const outputPath = run?.lastEvent?.outputPath ?? record?.last_output

  const handleRun = async () => {
    setError(null)
    const result = await window.shook.runWorkflow(meta.name)
    if (!result.ok) {
      setError(result.error === 'busy' ? '有工作流正在运行，请稍候' : result.error)
    }
  }

  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2 px-4 pt-3">
        <StatusDot status={running ? 'running' : (lastStatus ?? 'idle')} />
        <span className="font-mono text-[13px]">{meta.name}</span>
        <Tag variant={CATEGORY_VARIANT[meta.category] ?? 'gary'}>{meta.category}</Tag>
        <button
          onClick={handleRun}
          disabled={running}
          className={
            'ml-auto rounded-md px-3 py-1 text-[12px] transition-transform active:scale-[0.98] ' +
            (running
              ? 'cursor-default bg-canvas text-muted'
              : 'bg-ink text-white hover:bg-[#333333]')
          }
        >
          {running ? '运行中…' : '运行'}
        </button>
      </div>
      <p className="px-4 pb-1 pt-1.5 text-[12px] text-muted">{meta.description}</p>
      <div className="flex items-center gap-2 px-4 pb-3 text-[11px] text-muted">
        <RelativeTime iso={run?.lastEvent?.finishedAt ?? record?.last_run_at} />
        {record?.duration_ms != null && !running && (
          <span>{(record.duration_ms / 1000).toFixed(0)}s</span>
        )}
        {outputPath && !running && (
          <button
            onClick={() => void window.shook.openPath(outputPath)}
            className="text-gary-text hover:underline"
          >
            打开报告
          </button>
        )}
      </div>
      {(error || (lastStatus === 'failed' && lastError && !running)) && (
        <div className="mx-4 mb-3 rounded-md bg-patrick-1 px-3 py-2 text-[11px] leading-snug text-patrick-text">
          {error ?? lastError}
        </div>
      )}
      {run && (running || run.logs.length > 0) && <LogPane logs={run.logs} running={running} />}
    </section>
  )
}
