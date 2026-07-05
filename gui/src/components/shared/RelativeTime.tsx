export function formatRelative(iso: string | undefined | null): string {
  if (!iso) return '从未'
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return '—'
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(then).toLocaleDateString('zh-CN')
}

export default function RelativeTime({ iso }: { iso: string | undefined | null }) {
  return <span title={iso ?? undefined}>{formatRelative(iso)}</span>
}
