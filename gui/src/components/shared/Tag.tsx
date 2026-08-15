const VARIANTS: Record<string, string> = {
  sponge: 'bg-sponge-1 text-sponge-text',
  patrick: 'bg-patrick-1 text-patrick-text',
  gary: 'bg-gary-1 text-gary-text',
  squid: 'bg-squid-1 text-squid-text',
  plankton: 'bg-plankton-1 text-plankton-text',
  krabs: 'bg-krabs-1 text-krabs-text',
  sandy: 'bg-sandy-1 text-sandy-text',
  puff: 'bg-puff-1 text-puff-text',
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
