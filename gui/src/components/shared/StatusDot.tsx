const COLOR: Record<string, string> = {
  success: 'bg-squid-text',
  failed: 'bg-patrick-text',
  running: 'bg-sponge-4',
  idle: 'bg-line',
}

export default function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={
        'inline-block h-1.5 w-1.5 shrink-0 rounded-full ' + (COLOR[status] ?? COLOR.idle) +
        (status === 'running' ? ' animate-pulse' : '')
      }
    />
  )
}
