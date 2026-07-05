import { useEffect, useState } from 'react'
import TabBar, { type Screen } from './components/TabBar'
import StatusScreen from './components/status/StatusScreen'
import WorkflowsScreen from './components/workflows/WorkflowsScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('status')

  useEffect(() => {
    return window.shook.onNavigate(target => {
      if (target === 'workflows' || target === 'status') setScreen(target)
    })
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-baseline justify-between border-b border-line px-6 pb-3 pt-5">
        <h1 className="font-display text-[22px] font-medium tracking-tight">SHOOK</h1>
        <TabBar screen={screen} onChange={setScreen} />
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {screen === 'status' ? <StatusScreen /> : <WorkflowsScreen />}
      </main>
    </div>
  )
}
