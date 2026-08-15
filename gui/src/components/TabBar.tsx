export type Screen = 'instruments' | 'telemetry'

const TABS: { id: Screen; label: string }[] = [
  { id: 'instruments', label: 'instruments' },
  { id: 'telemetry', label: 'telemetry' },
]

export default function TabBar({
  screen,
  onChange,
}: {
  screen: Screen
  onChange: (screen: Screen) => void
}) {
  return (
    <nav className="flex gap-4">
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          aria-current={screen === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
          className={
            'appearance-none bg-transparent text-[13px] transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ' +
            (screen === tab.id
              ? 'text-ink'
              : 'text-muted hover:text-ink')
          }
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
