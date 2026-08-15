import { useShookState } from '../../hooks/useShookState'
import FocusCard from './FocusCard'
import TodoList from './TodoList'
import WorkflowLauncher from '../workflows/WorkflowLauncher'

export default function StatusScreen() {
  const snapshot = useShookState()

  if (!snapshot) {
    return <div className="px-6 py-8 text-[13px] text-muted">读取 .shook 状态中…</div>
  }

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      <FocusCard focus={snapshot.focus} />
      <TodoList todos={snapshot.todos} />
      <WorkflowLauncher />
    </div>
  )
}
