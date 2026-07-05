import SectionLabel from '../shared/SectionLabel'
import StatusDot from '../shared/StatusDot'
import RelativeTime from '../shared/RelativeTime'
import type { WorkflowRunRecord } from '../../shook'

const SHOWN = ['get-news', 'predict-btc']

export default function WorkflowPulse({
  workflows,
}: {
  workflows: Record<string, WorkflowRunRecord>
}) {
  return (
    <section>
      <SectionLabel>Workflows</SectionLabel>
      <div className="rounded-lg border border-line bg-surface">
        {SHOWN.map(name => {
          const record = workflows[name]
          return (
            <div
              key={name}
              className="flex items-center gap-2 border-b border-line px-3 py-2 text-[13px] last:border-b-0"
            >
              <StatusDot status={record?.last_status ?? 'idle'} />
              <span className="font-mono text-[12px]">{name}</span>
              <span className="ml-auto text-[11px] text-muted">
                <RelativeTime iso={record?.last_run_at} />
                {record?.duration_ms != null && (
                  <span className="ml-1.5">{(record.duration_ms / 1000).toFixed(0)}s</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
