import { useEffect, useState } from 'react'
import TabBar, { type Screen } from './components/TabBar'
import StatusScreen from './components/status/StatusScreen'
import TelemetryScreen from './components/telemetry/TelemetryScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('instruments')

  useEffect(() => {
    return window.shook.onNavigate(target => {
      if (target === 'instruments' || target === 'status' || target === 'workflows') {
        setScreen('instruments')
      }
      if (target === 'telemetry' || target === 'life') setScreen('telemetry')
    })
  }, [])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-baseline justify-between border-b border-line px-6 pb-3 pt-5">
        <h1 className="font-display text-[22px] font-medium tracking-tight">SHOOK</h1>
        <TabBar screen={screen} onChange={setScreen} />
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {screen === 'instruments' ? <StatusScreen /> : <TelemetryScreen />}
      </main>
    </div>
  )
}
