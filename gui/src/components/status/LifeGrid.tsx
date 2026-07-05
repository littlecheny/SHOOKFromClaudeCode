import { useEffect, useMemo, useRef, useState } from 'react'
import SectionLabel from '../shared/SectionLabel'
import type { LifeWeeksData, LifeWeek } from '../../shook'

const COLS = 52
const PITCH = 6 // 5px 格子 + 1px 间隙
const CELL = 5

const LEVEL_COLORS = ['', '#fbf3db', '#f3e3a8', '#ebcf6f', '#e2b93e']
const FUTURE = '#faf9f6'
const PAST_UNTRACKED = '#f1efea'

type Hover = { week: LifeWeek; x: number; y: number }

export default function LifeGrid() {
  const [data, setData] = useState<LifeWeeksData | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void window.shook.getLifeWeeks().then(setData)
  }, [])

  const rows = data ? Math.ceil(data.totalWeeks / COLS) : 0
  const width = COLS * PITCH
  const height = rows * PITCH

  const cells = useMemo(() => {
    if (!data) return null
    return data.weeks.map(week => {
      const col = week.weekIndex % COLS
      const row = Math.floor(week.weekIndex / COLS)
      let fill: string
      if (week.weekIndex > data.currentWeekIndex) {
        fill = FUTURE
      } else if (week.level === 0) {
        fill = PAST_UNTRACKED
      } else {
        fill = LEVEL_COLORS[week.level]
      }
      const isCurrent = week.weekIndex === data.currentWeekIndex
      return (
        <rect
          key={week.weekIndex}
          x={col * PITCH}
          y={row * PITCH}
          width={CELL}
          height={CELL}
          rx={1}
          fill={fill}
          stroke={isCurrent ? '#111111' : undefined}
          strokeWidth={isCurrent ? 1 : undefined}
        />
      )
    })
  }, [data])

  if (!data) {
    return (
      <section>
        <SectionLabel>四千周</SectionLabel>
        <p className="text-[13px] text-muted">加载中…</p>
      </section>
    )
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const col = Math.floor((x / rect.width) * COLS)
    const row = Math.floor((y / rect.height) * rows)
    const weekIndex = row * COLS + col
    const week = data.weeks[weekIndex]
    if (!week || col < 0 || col >= COLS) {
      setHover(null)
      return
    }
    setHover({ week, x, y })
  }

  const ageYears = Math.floor(data.currentWeekIndex / 52.18)

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <SectionLabel>四千周</SectionLabel>
        <span className="text-[10px] text-muted">
          {ageYears} 岁 · 第 {data.currentWeekIndex + 1} / {data.totalWeeks} 周
        </span>
      </div>
      <div ref={containerRef} className="relative rounded-lg border border-line bg-surface p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          shapeRendering="crispEdges"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
        >
          {cells}
        </svg>
        {hover && <Tooltip hover={hover} data={data} />}
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
          <span className="mr-1">少</span>
          {[PAST_UNTRACKED, ...LEVEL_COLORS.slice(1)].map(color => (
            <span
              key={color}
              className="inline-block h-[9px] w-[9px] rounded-[2px]"
              style={{ background: color }}
            />
          ))}
          <span className="ml-1">多</span>
        </div>
      </div>
    </section>
  )
}

function Tooltip({ hover, data }: { hover: Hover; data: LifeWeeksData }) {
  const { week } = hover
  const start = new Date(week.startDate)
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
  const age = Math.floor(week.weekIndex / 52.18)
  const total = week.days.reduce((sum, day) => sum + day.count, 0)
  const isFuture = week.weekIndex > data.currentWeekIndex

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`

  // 靠右/靠下时翻转，避免溢出面板
  const flipX = hover.x > 190
  const flipY = hover.y > 300

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] leading-relaxed shadow-none"
      style={{
        left: flipX ? undefined : hover.x + 20,
        right: flipX ? 340 - hover.x : undefined,
        top: flipY ? undefined : hover.y + 24,
        bottom: flipY ? 480 - hover.y : undefined,
      }}
    >
      <div className="font-mono text-[10px] text-muted">
        第 {week.weekIndex + 1} 周 · {age} 岁
      </div>
      <div>
        {fmt(start)} – {fmt(end)}
      </div>
      <div className="text-muted">
        {isFuture ? '未来' : week.days.length === 0 ? '未记录' : `${total} 个 commit`}
      </div>
    </div>
  )
}
