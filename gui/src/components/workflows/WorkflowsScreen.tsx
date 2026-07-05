import { useEffect, useState } from 'react'
import WorkflowCard from './WorkflowCard'
import { useWorkflowRuns } from '../../hooks/useWorkflowRuns'
import { useShookState } from '../../hooks/useShookState'
import type { WorkflowMeta } from '../../shook'

export default function WorkflowsScreen() {
  const [workflows, setWorkflows] = useState<WorkflowMeta[]>([])
  const runs = useWorkflowRuns()
  const snapshot = useShookState()

  useEffect(() => {
    void window.shook.listWorkflows().then(setWorkflows)
  }, [])

  if (workflows.length === 0) {
    return <div className="px-6 py-8 text-[13px] text-muted">读取工作流列表中…</div>
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      {workflows.map(workflow => (
        <WorkflowCard
          key={workflow.name}
          meta={workflow}
          run={runs[workflow.name]}
          record={snapshot?.workflows[workflow.name]}
        />
      ))}
    </div>
  )
}
