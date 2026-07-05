const VARIANTS: Record<string, string> = {
  sponge: 'bg-sponge-1 text-sponge-text',
  patrick: 'bg-patrick-bg text-patrick-text',
  gary: 'bg-gary-bg text-gary-text',
  squid: 'bg-squid-bg text-squid-text',
}

export default function Tag({
  variant = 'gary',
  children,
}: {
  variant?: keyof typeof VARIANTS
  children: React.ReactNode
}) {
  return (
    <span
      className={
        'inline-block rounded-full px-2 py-px text-[10px] uppercase tracking-[0.05em] ' +
        VARIANTS[variant]
      }
    >
      {children}
    </span>
  )
}
