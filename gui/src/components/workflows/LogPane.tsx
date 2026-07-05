import { useEffect, useRef } from 'react'

export default function LogPane({ logs, running }: { logs: string[]; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  return (
    <div
      ref={ref}
      className="max-h-36 overflow-y-auto border-t border-line bg-canvas px-4 py-2 font-mono text-[10px] leading-relaxed text-muted"
    >
      {logs.map((line, index) => (
        <div key={index} className="whitespace-pre-wrap break-all">
          {line}
        </div>
      ))}
      {running && logs.length === 0 && <div>启动中…</div>}
    </div>
  )
}
