import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent as ReactFormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import SectionLabel from '../shared/SectionLabel'
import type { DayCommit, LifeWeeksData, LifeWeek, Mood, MoodIntensity } from '../../shook'

const OVERVIEW_COLS = 52
const OVERVIEW_PITCH = 6 // 5px 格子 + 1px 间隙
const OVERVIEW_CELL = 5

const PAGE_SIZE = 100
const DETAIL_COLS = 20
const DETAIL_PITCH = 14 // 11px 格子 + 3px 间隙
const DETAIL_CELL = 11

const DAY_MS = 24 * 60 * 60 * 1000
const FUTURE = '#faf9f6'
const PAST_UNTRACKED = '#f1efea'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MOOD_LABEL: Record<Mood, string> = {
  passion: '热情',
  joy: '开心',
  sadness: '低落',
  greed: '野心',
  wealth: '回报',
  calm: '平静',
  focus: '专注',
  anxiety: '焦虑',
}
const INTENSITY_LABEL: Record<MoodIntensity, string> = {
  1: '轻',
  2: '中',
  3: '强',
}
const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'passion', label: '热情' },
  { value: 'joy', label: '开心' },
  { value: 'sadness', label: '低落' },
  { value: 'greed', label: '野心' },
  { value: 'wealth', label: '回报' },
  { value: 'calm', label: '平静' },
  { value: 'focus', label: '专注' },
  { value: 'anxiety', label: '焦虑' },
]
const INTENSITY_OPTIONS: { value: MoodIntensity; label: string }[] = [
  { value: 1, label: '轻' },
  { value: 2, label: '中' },
  { value: 3, label: '强' },
]
const MOOD_RAMP: Record<Mood, [string, string, string, string]> = {
  passion: ['#fbf3db', '#f3e3a8', '#ebcf6f', '#e2b93e'],
  joy: ['#fbe7ec', '#f4cdd8', '#e9a6b8', '#d97a95'],
  sadness: ['#e6f0ee', '#c3ddd7', '#93c2b8', '#5fa093'],
  greed: ['#e9f2e4', '#cfe4c4', '#a9cf98', '#7bb267'],
  wealth: ['#fae8e0', '#f2cdbd', '#e5a288', '#cf7355'],
  calm: ['#e1f0fb', '#c2ddf2', '#93c2e6', '#5b9fd6'],
  focus: ['#f2ecdf', '#e2d3b6', '#ccb182', '#b08f52'],
  anxiety: ['#f4efe6', '#e6dcc6', '#d0c09a', '#b3a06f'],
}
const WEEK_DETAIL_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: 6,
} satisfies CSSProperties
const WEEK_DETAIL_DAY_STYLE = {
  alignItems: 'center',
  border: '1px solid var(--color-line)',
  borderRadius: 6,
  display: 'flex',
  height: 46,
  justifyContent: 'center',
  minWidth: 0,
  overflow: 'hidden',
  paddingInline: 4,
  textAlign: 'center',
} satisfies CSSProperties
const WEEK_DETAIL_DAY_LABEL_STYLE = {
  color: 'var(--color-muted)',
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 9,
  lineHeight: 1,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} satisfies CSSProperties
const COMMIT_FORM_STYLE = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-line)',
  borderRadius: 8,
  marginTop: 10,
  padding: 10,
} satisfies CSSProperties
const COMMIT_FORM_GRID_STYLE = {
  display: 'grid',
  gap: 8,
} satisfies CSSProperties
const COMMIT_FIELD_STYLE = {
  display: 'grid',
  gap: 4,
} satisfies CSSProperties
const COMMIT_LABEL_STYLE = {
  color: 'var(--color-muted)',
  fontSize: 10,
} satisfies CSSProperties
const COMMIT_CONTROL_STYLE = {
  background: 'var(--color-canvas)',
  border: '1px solid var(--color-line)',
  borderRadius: 6,
  color: 'var(--color-ink)',
  fontSize: 12,
  minWidth: 0,
  padding: '5px 7px',
  width: '100%',
} satisfies CSSProperties
const COMMIT_TEXTAREA_STYLE = {
  ...COMMIT_CONTROL_STYLE,
  minHeight: 62,
  resize: 'vertical',
} satisfies CSSProperties
const COMMIT_ACTIONS_STYLE = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
} satisfies CSSProperties
const COMMIT_BUTTON_STYLE = {
  border: '1px solid var(--color-line)',
  borderRadius: 6,
  fontSize: 11,
  padding: '3px 8px',
} satisfies CSSProperties
const COMMIT_PRIMARY_BUTTON_STYLE = {
  ...COMMIT_BUTTON_STYLE,
  background: 'var(--color-ink)',
  borderColor: 'var(--color-ink)',
  color: 'var(--color-surface)',
} satisfies CSSProperties
const COMMIT_ERROR_STYLE = {
  color: '#a6522f',
  fontSize: 11,
} satisfies CSSProperties

type ViewMode = 'overview' | 'hundred'
type Hover = { week: LifeWeek; x: number; y: number }
type WeekDay = { date: string; commit: DayCommit | null; isFuture: boolean }
type DayHover = { day: WeekDay; x: number; y: number }
type CommitDraft = { mood: Mood; intensity: MoodIntensity; note: string }

type GridView = {
  weeks: LifeWeek[]
  cols: number
  rows: number
  pitch: number
  cell: number
  width: number
  height: number
  startWeek: number
  endWeek: number
}

export default function LifeGrid() {
  const [data, setData] = useState<LifeWeeksData | null>(null)
  const [mode, setMode] = useState<ViewMode>('overview')
  const [detailPage, setDetailPage] = useState(0)
  const [hover, setHover] = useState<Hover | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<LifeWeek | null>(null)
  const [dayHover, setDayHover] = useState<DayHover | null>(null)
  const [commitTargetDate, setCommitTargetDate] = useState<string | null>(null)
  const [commitDraft, setCommitDraft] = useState<CommitDraft>({
    mood: 'passion',
    intensity: 2,
    note: '',
  })
  const [commitError, setCommitError] = useState<string | null>(null)
  const [savingCommit, setSavingCommit] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void window.shook.getLifeWeeks().then(setData)
  }, [])

  const pageCount = data ? Math.ceil(data.totalWeeks / PAGE_SIZE) : 0
  const currentWeekIndex = useMemo(() => {
    if (!data) return null
    const localIndex = weekIndexOfDate(toLocalISODate(new Date()), data.birthDate)
    return Math.max(0, Math.min(data.totalWeeks - 1, localIndex))
  }, [data])

  useEffect(() => {
    if (currentWeekIndex == null) return
    setDetailPage(Math.floor(currentWeekIndex / PAGE_SIZE))
  }, [currentWeekIndex])

  useEffect(() => {
    if (!selectedWeek) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (detailRef.current?.contains(target)) return
      setSelectedWeek(null)
      setDayHover(null)
      setCommitTargetDate(null)
      setCommitError(null)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [selectedWeek])

  const view = useMemo<GridView | null>(() => {
    if (!data) return null
    const detail = mode === 'hundred'
    const startWeek = detail ? detailPage * PAGE_SIZE : 0
    const endWeek = detail ? Math.min(startWeek + PAGE_SIZE, data.totalWeeks) : data.totalWeeks
    const weeks = data.weeks.slice(startWeek, endWeek)
    const cols = detail ? DETAIL_COLS : OVERVIEW_COLS
    const pitch = detail ? DETAIL_PITCH : OVERVIEW_PITCH
    const cell = detail ? DETAIL_CELL : OVERVIEW_CELL
    const rows = Math.ceil(weeks.length / cols)

    return {
      weeks,
      cols,
      rows,
      pitch,
      cell,
      width: cols * pitch,
      height: rows * pitch,
      startWeek,
      endWeek,
    }
  }, [data, detailPage, mode])

  const cells = useMemo(() => {
    if (!data || !view || currentWeekIndex == null) return null
    return view.weeks.map((week, index) => {
      const col = index % view.cols
      const row = Math.floor(index / view.cols)
      const isCurrent = week.weekIndex === currentWeekIndex
      const isSelected = selectedWeek?.weekIndex === week.weekIndex

      return (
        <rect
          key={week.weekIndex}
          x={col * view.pitch}
          y={row * view.pitch}
          width={view.cell}
          height={view.cell}
          rx={mode === 'hundred' ? 2 : 1}
          fill={fillForWeek(week, currentWeekIndex)}
          stroke={isSelected || isCurrent ? '#111111' : undefined}
          strokeWidth={isSelected || isCurrent ? 1 : undefined}
        />
      )
    })
  }, [currentWeekIndex, data, mode, selectedWeek, view])

  if (!data || !view || currentWeekIndex == null) {
    return (
      <section>
        <SectionLabel>四千周 commits</SectionLabel>
        <p className="text-[13px] text-muted">加载中…</p>
      </section>
    )
  }

  const weekAtPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svgRect = event.currentTarget.getBoundingClientRect()
    const svgX = event.clientX - svgRect.left
    const svgY = event.clientY - svgRect.top
    const col = Math.floor((svgX / svgRect.width) * view.cols)
    const row = Math.floor((svgY / svgRect.height) * view.rows)

    if (col < 0 || col >= view.cols || row < 0 || row >= view.rows) return null
    return view.weeks[row * view.cols + col] ?? null
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const week = weekAtPointer(event)
    if (!week) {
      setHover(null)
      return
    }

    const containerRect = containerRef.current?.getBoundingClientRect()
    const svgRect = event.currentTarget.getBoundingClientRect()
    setHover({
      week,
      x: containerRect ? event.clientX - containerRect.left : event.clientX - svgRect.left,
      y: containerRect ? event.clientY - containerRect.top : event.clientY - svgRect.top,
    })
  }

  const handleGridClick = (event: ReactPointerEvent<SVGSVGElement>) => {
    const week = weekAtPointer(event)
    if (!week) return
    setSelectedWeek(week)
    setHover(null)
    setDayHover(null)
    setCommitTargetDate(null)
    setCommitError(null)
  }

  const handleDayPointerMove = (day: WeekDay, event: ReactPointerEvent<HTMLElement>) => {
    const containerRect = containerRef.current?.getBoundingClientRect()
    const targetRect = event.currentTarget.getBoundingClientRect()
    setDayHover({
      day,
      x: containerRect ? event.clientX - containerRect.left : event.clientX - targetRect.left,
      y: containerRect ? event.clientY - containerRect.top : event.clientY - targetRect.top,
    })
  }

  const closeWeekDetail = () => {
    setSelectedWeek(null)
    setDayHover(null)
    setCommitTargetDate(null)
    setCommitError(null)
  }

  const handleDayClick = (day: WeekDay) => {
    setDayHover(null)
    setCommitError(null)
    if (day.date !== todayISO || data.todayCommit || day.isFuture) {
      setCommitTargetDate(null)
      return
    }

    setCommitDraft({
      mood: 'passion',
      intensity: 2,
      note: '',
    })
    setCommitTargetDate(day.date)
  }

  const handleCommitSubmit = async (event: ReactFormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!commitTargetDate || !selectedWeek) return

    setSavingCommit(true)
    setCommitError(null)
    try {
      if (typeof window.shook.saveMoodCommit !== 'function') {
        throw new Error('需要重启 Shook 以加载提交接口')
      }
      const next = await window.shook.saveMoodCommit({
        date: commitTargetDate,
        mood: commitDraft.mood,
        intensity: commitDraft.intensity,
        ...(commitDraft.note.trim() ? { note: commitDraft.note.trim() } : {}),
      })
      setData(next)
      setSelectedWeek(next.weeks[selectedWeek.weekIndex] ?? null)
      setCommitTargetDate(null)
      setCommitDraft({ mood: 'passion', intensity: 2, note: '' })
    } catch (error) {
      setCommitError(error instanceof Error ? error.message : '提交失败')
    } finally {
      setSavingCommit(false)
    }
  }

  const ageYears = Math.floor(currentWeekIndex / 52.18)
  const canPrev = detailPage > 0
  const canNext = detailPage < pageCount - 1
  const todayISO = toLocalISODate(new Date())

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <SectionLabel>四千周 commits</SectionLabel>
        <span className="text-[10px] text-muted">
          {ageYears} 岁 · 第 {currentWeekIndex + 1} / {data.totalWeeks} 周
        </span>
      </div>

      <div ref={containerRef} className="relative rounded-lg border border-line bg-surface p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex rounded-md border border-line bg-canvas p-0.5 text-[11px]">
            <ModeButton active={mode === 'overview'} onClick={() => setMode('overview')}>
              总览
            </ModeButton>
            <ModeButton active={mode === 'hundred'} onClick={() => setMode('hundred')}>
              100周
            </ModeButton>
          </div>

          {mode === 'hundred' && (
            <div className="flex min-w-0 items-center gap-2 text-[10px] text-muted">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setDetailPage(page => Math.max(0, page - 1))}
                className="outline-none transition-colors hover:text-ink disabled:text-line focus-visible:outline-none"
              >
                上一百周
              </button>
              <span className="shrink-0 font-mono">
                {view.startWeek + 1}-{view.endWeek}
              </span>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setDetailPage(page => Math.min(pageCount - 1, page + 1))}
                className="outline-none transition-colors hover:text-ink disabled:text-line focus-visible:outline-none"
              >
                下一百周
              </button>
            </div>
          )}
        </div>

        <svg
          viewBox={`0 0 ${view.width} ${view.height}`}
          width="100%"
          className="block cursor-pointer"
          shapeRendering="crispEdges"
          onClick={handleGridClick}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
        >
          {cells}
        </svg>
        {hover && <Tooltip hover={hover} currentWeekIndex={currentWeekIndex} />}

        {selectedWeek && (
          <WeekDetail
            refEl={detailRef}
            week={selectedWeek}
            todayISO={todayISO}
            todayCommitted={Boolean(data.todayCommit)}
            commitTargetDate={commitTargetDate}
            commitDraft={commitDraft}
            commitError={commitError}
            savingCommit={savingCommit}
            onClose={closeWeekDetail}
            onDayClick={handleDayClick}
            onDayPointerMove={handleDayPointerMove}
            onDayPointerLeave={() => setDayHover(null)}
            onCommitDraftChange={setCommitDraft}
            onCommitCancel={() => {
              setCommitTargetDate(null)
              setCommitError(null)
            }}
            onCommitSubmit={handleCommitSubmit}
          />
        )}
        {dayHover && !commitTargetDate && <DayTooltip hover={dayHover} />}

      </div>
    </section>
  )
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        'rounded-[5px] px-2 py-0.5 outline-none transition-colors focus-visible:outline-none ' +
        (active ? 'bg-surface text-ink' : 'text-muted hover:text-ink')
      }
    >
      {children}
    </button>
  )
}

function WeekDetail({
  refEl,
  week,
  todayISO,
  todayCommitted,
  commitTargetDate,
  commitDraft,
  commitError,
  savingCommit,
  onClose,
  onDayClick,
  onDayPointerMove,
  onDayPointerLeave,
  onCommitDraftChange,
  onCommitCancel,
  onCommitSubmit,
}: {
  refEl: RefObject<HTMLDivElement | null>
  week: LifeWeek
  todayISO: string
  todayCommitted: boolean
  commitTargetDate: string | null
  commitDraft: CommitDraft
  commitError: string | null
  savingCommit: boolean
  onClose: () => void
  onDayClick: (day: WeekDay) => void
  onDayPointerMove: (day: WeekDay, event: ReactPointerEvent<HTMLElement>) => void
  onDayPointerLeave: () => void
  onCommitDraftChange: (draft: CommitDraft) => void
  onCommitCancel: () => void
  onCommitSubmit: (event: ReactFormEvent<HTMLFormElement>) => void
}) {
  const days = useMemo(() => buildWeekDays(week), [week])

  return (
    <div ref={refEl} className="mt-3 border-t border-line pt-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] text-muted">第 {week.weekIndex + 1} 周</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted outline-none transition-colors hover:text-ink focus-visible:outline-none"
        >
          返回
        </button>
      </div>

      <div style={WEEK_DETAIL_GRID_STYLE}>
        {days.map(day => (
          <button
            key={day.date}
            type="button"
            onClick={() => onDayClick(day)}
            onPointerMove={event => onDayPointerMove(day, event)}
            onPointerLeave={onDayPointerLeave}
            style={dayCellStyle(day, todayISO, todayCommitted)}
            aria-label={dayAriaLabel(day)}
          >
            <span style={WEEK_DETAIL_DAY_LABEL_STYLE}>{weekdayLabel(day.date)}</span>
          </button>
        ))}
      </div>
      {commitTargetDate && (
        <MoodCommitForm
          date={commitTargetDate}
          draft={commitDraft}
          error={commitError}
          saving={savingCommit}
          onChange={onCommitDraftChange}
          onCancel={onCommitCancel}
          onSubmit={onCommitSubmit}
        />
      )}
    </div>
  )
}

function dayCellStyle(day: WeekDay, todayISO: string, todayCommitted: boolean): CSSProperties {
  const canCommitToday = day.date === todayISO && !todayCommitted && !day.isFuture
  return {
    ...WEEK_DETAIL_DAY_STYLE,
    background: fillForDay(day),
    border: canCommitToday ? '1px solid var(--color-ink)' : WEEK_DETAIL_DAY_STYLE.border,
    cursor: canCommitToday ? 'pointer' : 'default',
  }
}

function MoodCommitForm({
  date,
  draft,
  error,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  date: string
  draft: CommitDraft
  error: string | null
  saving: boolean
  onChange: (draft: CommitDraft) => void
  onCancel: () => void
  onSubmit: (event: ReactFormEvent<HTMLFormElement>) => void
}) {
  return (
    <form style={COMMIT_FORM_STYLE} onSubmit={onSubmit}>
      <div style={COMMIT_FORM_GRID_STYLE}>
        <div className="font-mono text-[10px] text-muted">{formatISODate(date)}</div>
        <label style={COMMIT_FIELD_STYLE}>
          <span style={COMMIT_LABEL_STYLE}>主心情</span>
          <select
            value={draft.mood}
            onChange={event => onChange({ ...draft, mood: event.target.value as Mood })}
            style={COMMIT_CONTROL_STYLE}
            disabled={saving}
          >
            {MOOD_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={COMMIT_FIELD_STYLE}>
          <span style={COMMIT_LABEL_STYLE}>强度</span>
          <select
            value={draft.intensity}
            onChange={event => onChange({ ...draft, intensity: Number(event.target.value) as MoodIntensity })}
            style={COMMIT_CONTROL_STYLE}
            disabled={saving}
          >
            {INTENSITY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={COMMIT_FIELD_STYLE}>
          <span style={COMMIT_LABEL_STYLE}>记录</span>
          <textarea
            value={draft.note}
            onChange={event => onChange({ ...draft, note: event.target.value })}
            style={COMMIT_TEXTAREA_STYLE}
            disabled={saving}
          />
        </label>
        {error && <div style={COMMIT_ERROR_STYLE}>{error}</div>}
        <div style={COMMIT_ACTIONS_STYLE}>
          <button type="button" style={COMMIT_BUTTON_STYLE} onClick={onCancel} disabled={saving}>
            取消
          </button>
          <button type="submit" style={COMMIT_PRIMARY_BUTTON_STYLE} disabled={saving}>
            {saving ? '提交中' : '提交'}
          </button>
        </div>
      </div>
    </form>
  )
}

function fillForWeek(week: LifeWeek, currentWeekIndex: number): string {
  if (week.weekIndex > currentWeekIndex) return FUTURE
  if (!isMood(week.dominantMood) || week.level === 0) return PAST_UNTRACKED
  return MOOD_RAMP[week.dominantMood][week.level - 1]
}

function fillForDay(day: WeekDay): string {
  if (!day.commit) return day.isFuture ? FUTURE : PAST_UNTRACKED
  return MOOD_RAMP[day.commit.mood][day.commit.intensity - 1]
}

function buildWeekDays(week: LifeWeek): WeekDay[] {
  const byDate = new Map<string, DayCommit>()
  const days = Array.isArray(week.days) ? week.days : []
  for (const day of days) {
    if (isDayCommit(day)) byDate.set(day.date, day)
  }
  const start = Date.parse(`${week.startDate}T00:00:00Z`)
  const todayISO = toLocalISODate(new Date())

  return Array.from({ length: 7 }, (_, index) => {
    const date = toISODate(new Date(start + index * DAY_MS))
    return {
      date,
      commit: byDate.get(date) ?? null,
      isFuture: date > todayISO,
    }
  })
}

function isMood(value: unknown): value is Mood {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MOOD_RAMP, value)
}

function isIntensity(value: unknown): value is MoodIntensity {
  return value === 1 || value === 2 || value === 3
}

function isDayCommit(value: unknown): value is DayCommit {
  if (!value || typeof value !== 'object') return false
  const commit = value as { date?: unknown; mood?: unknown; intensity?: unknown }
  return typeof commit.date === 'string' && isMood(commit.mood) && isIntensity(commit.intensity)
}

function Tooltip({ hover, currentWeekIndex }: { hover: Hover; currentWeekIndex: number }) {
  const { week } = hover
  const start = new Date(`${week.startDate}T00:00:00Z`)
  const end = new Date(start.getTime() + 6 * DAY_MS)
  const age = Math.floor(week.weekIndex / 52.18)
  const isFuture = week.weekIndex > currentWeekIndex
  const moodText = isFuture ? '未来' : week.dominantMood ? MOOD_LABEL[week.dominantMood] : '未记录'

  const flipX = hover.x > 190
  const flipY = hover.y > 360

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] leading-relaxed shadow-none"
      style={{
        left: flipX ? undefined : hover.x + 14,
        right: flipX ? 12 : undefined,
        top: flipY ? undefined : hover.y + 14,
        bottom: flipY ? 12 : undefined,
      }}
    >
      <div className="font-mono text-[10px] text-muted">
        第 {week.weekIndex + 1} 周 · {age} 岁
      </div>
      <div>
        {formatDate(start)} - {formatDate(end)}
      </div>
      <div className="text-muted">主心情 · {moodText}</div>
    </div>
  )
}

function DayTooltip({ hover }: { hover: DayHover }) {
  const { day } = hover
  const flipX = hover.x > 190
  const flipY = hover.y > 360

  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[210px] rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] leading-relaxed shadow-none"
      style={{
        left: flipX ? undefined : hover.x + 14,
        right: flipX ? 12 : undefined,
        top: flipY ? undefined : hover.y + 14,
        bottom: flipY ? 12 : undefined,
      }}
    >
      <div className="font-mono text-[10px] text-muted">{formatISODate(day.date)}</div>
      {day.commit ? (
        <>
          <div>
            {MOOD_LABEL[day.commit.mood]} · {INTENSITY_LABEL[day.commit.intensity]}
          </div>
          {day.commit.note && <div className="text-muted">{day.commit.note}</div>}
        </>
      ) : (
        <div className="text-muted">{day.isFuture ? '未来' : '未记录'}</div>
      )}
    </div>
  )
}

function dayAriaLabel(day: WeekDay): string {
  if (!day.commit) return `${day.date} ${day.isFuture ? '未来' : '未记录'}`
  return `${day.date} ${MOOD_LABEL[day.commit.mood]} ${INTENSITY_LABEL[day.commit.intensity]}`
}

function weekdayLabel(dateISO: string): string {
  return WEEKDAY_LABELS[new Date(`${dateISO}T00:00:00Z`).getUTCDay()]
}

function formatISODate(dateISO: string): string {
  return `${dateISO.slice(0, 4)}.${dateISO.slice(5, 7)}.${dateISO.slice(8, 10)}`
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function weekIndexOfDate(dateISO: string, birthDateISO: string): number {
  return Math.floor((Date.parse(`${dateISO}T00:00:00Z`) - Date.parse(`${birthDateISO}T00:00:00Z`)) / (7 * DAY_MS))
}
