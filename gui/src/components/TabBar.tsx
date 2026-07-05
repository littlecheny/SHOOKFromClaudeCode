export type Screen = 'status' | 'workflows'

const TABS: { id: Screen; label: string }[] = [
  { id: 'status', label: '状态' },
  { id: 'workflows', label: '功能' },
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
          onClick={() => onChange(tab.id)}
          className={
            'border-b pb-0.5 text-[13px] transition-colors ' +
            (screen === tab.id
              ? 'border-ink text-ink'
              : 'border-transparent text-muted hover:text-ink')
          }
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
