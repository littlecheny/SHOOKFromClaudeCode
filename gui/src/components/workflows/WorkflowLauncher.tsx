import { useEffect, useState } from 'react'
import SectionLabel from '../shared/SectionLabel'
import WorkflowCard from './WorkflowCard'
import { useWorkflowRuns } from '../../hooks/useWorkflowRuns'
import { useShookState } from '../../hooks/useShookState'
import type { WorkflowMeta } from '../../shook'

export default function WorkflowLauncher() {
  const [workflows, setWorkflows] = useState<WorkflowMeta[]>([])
  const runs = useWorkflowRuns()
  const snapshot = useShookState()

  useEffect(() => {
    void window.shook.listWorkflows().then(setWorkflows)
  }, [])

  return (
    <section>
      <SectionLabel>功能</SectionLabel>
      {workflows.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-muted">
          读取工作流列表中…
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {workflows.map(workflow => (
            <WorkflowCard
              key={workflow.name}
              meta={workflow}
              run={runs[workflow.name]}
              record={snapshot?.workflows[workflow.name]}
            />
          ))}
        </div>
      )}
    </section>
  )
}
