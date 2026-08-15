// 四千周人生视图的数据层。
// 这里的 commit 是用户每天的一条心情记录，真实数据按月存放在 .shook/moods/YYYY-MM.json。

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type Mood = 'passion' | 'joy' | 'sadness' | 'greed' | 'wealth' | 'calm' | 'focus' | 'anxiety'
export type MoodIntensity = 1 | 2 | 3

export type DayCommit = {
  date: string
  mood: Mood
  intensity: MoodIntensity
  note?: string
}

export type LifeWeek = {
  weekIndex: number
  startDate: string
  level: 0 | 1 | 2 | 3 | 4
  dominantMood: Mood | null
  days: DayCommit[]
}

export type LifeWeeksData = {
  birthDate: string
  lifespanYears: number
  totalWeeks: number
  currentWeekIndex: number
  trackedFromWeek: number
  todayCommit: DayCommit | null
  weeks: LifeWeek[]
}

export interface LifeCommitSource {
  getDailyCommits(fromISO: string, toISO: string): Promise<DayCommit[]>
}

const BIRTH_DATE = '2002-06-04'
const LIFESPAN_YEARS = 77
const TRACKED_WEEKS = 104 // mock 只覆盖最近约两年
const DAY_MS = 24 * 60 * 60 * 1000
const MONTH_FILE_PATTERN = /^\d{4}-\d{2}\.json$/

const MOODS: Mood[] = ['passion', 'joy', 'sadness', 'greed', 'wealth', 'calm', 'focus', 'anxiety']

export const MOOD_TOKEN: Record<Mood, string> = {
  passion: 'sponge',
  joy: 'patrick',
  sadness: 'squid',
  greed: 'plankton',
  wealth: 'krabs',
  calm: 'gary',
  focus: 'sandy',
  anxiety: 'puff',
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function birthUTC(): number {
  return Date.parse(`${BIRTH_DATE}T00:00:00Z`)
}

export function weekIndexOf(dateISO: string): number {
  return Math.floor((Date.parse(`${dateISO}T00:00:00Z`) - birthUTC()) / (7 * DAY_MS))
}

// mulberry32：确定性 PRNG，seed 取自日期字符串哈希，保证每次渲染一致。
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function isMood(value: unknown): value is Mood {
  return typeof value === 'string' && MOODS.includes(value as Mood)
}

function isIntensity(value: unknown): value is MoodIntensity {
  return value === 1 || value === 2 || value === 3
}

function parseDayCommit(value: unknown): DayCommit | null {
  if (!value || typeof value !== 'object') return null
  const record = value as { date?: unknown; mood?: unknown; intensity?: unknown; note?: unknown }
  if (typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) return null
  if (!isMood(record.mood) || !isIntensity(record.intensity)) return null
  const note = typeof record.note === 'string' ? record.note.trim() : ''
  return {
    date: record.date,
    mood: record.mood,
    intensity: record.intensity,
    ...(note ? { note } : {}),
  }
}

function monthsBetween(fromISO: string, toISO: string): string[] {
  const fromYear = Number(fromISO.slice(0, 4))
  const fromMonth = Number(fromISO.slice(5, 7))
  const toYear = Number(toISO.slice(0, 4))
  const toMonth = Number(toISO.slice(5, 7))
  const months: string[] = []

  let year = fromYear
  let month = fromMonth
  while (year < toYear || (year === toYear && month <= toMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return months
}

export class ShookCommitSource implements LifeCommitSource {
  constructor(private projectRoot: string) {}

  async hasMoodFiles(): Promise<boolean> {
    try {
      const entries = await readdir(join(this.projectRoot, '.shook', 'moods'), { withFileTypes: true })
      return entries.some(entry => entry.isFile() && MONTH_FILE_PATTERN.test(entry.name))
    } catch {
      return false
    }
  }

  async getDailyCommits(fromISO: string, toISO: string): Promise<DayCommit[]> {
    const commits: DayCommit[] = []

    for (const ym of monthsBetween(fromISO, toISO)) {
      const path = join(this.projectRoot, '.shook', 'moods', `${ym}.json`)
      try {
        const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown
        if (!Array.isArray(parsed)) continue
        for (const item of parsed) {
          const commit = parseDayCommit(item)
          if (commit) commits.push(commit)
        }
      } catch {
        // 文件不存在或内容不可读时视作该月无记录。
      }
    }

    return commits.filter(commit => commit.date >= fromISO && commit.date <= toISO).sort((a, b) => a.date.localeCompare(b.date))
  }
}

export class MockCommitSource implements LifeCommitSource {
  async getDailyCommits(fromISO: string, toISO: string): Promise<DayCommit[]> {
    const commits: DayCommit[] = []
    const from = Date.parse(`${fromISO}T00:00:00Z`)
    const to = Date.parse(`${toISO}T00:00:00Z`)
    for (let ts = from; ts <= to; ts += DAY_MS) {
      const date = toISODate(new Date(ts))
      const rand = mulberry32(hashString(date))
      const weekday = new Date(ts).getUTCDay()
      const isWeekend = weekday === 0 || weekday === 6
      // 偶发空档周：按周序号再掷一次骰子
      const weekRand = mulberry32(hashString(`week-${weekIndexOf(date)}`))()
      if (weekRand < 0.12) {
        continue
      }
      const base = rand()
      if (base > (isWeekend ? 0.55 : 0.25)) {
        const mood = MOODS[Math.floor(rand() * MOODS.length)]
        const intensity = (Math.floor(rand() * 3) + 1) as MoodIntensity
        commits.push({ date, mood, intensity })
      }
    }
    return commits
  }
}

export async function saveDayCommit(projectRoot: string, input: DayCommit): Promise<DayCommit> {
  const commit = parseDayCommit(input)
  if (!commit) throw new Error('心情记录格式不正确')

  const todayISO = toLocalISODate(new Date())
  if (commit.date !== todayISO) throw new Error('只能提交今天的心情')

  const moodsDir = join(projectRoot, '.shook', 'moods')
  await mkdir(moodsDir, { recursive: true })

  const monthPath = join(moodsDir, `${commit.date.slice(0, 7)}.json`)
  let existing: DayCommit[] = []
  try {
    const parsed = JSON.parse(await readFile(monthPath, 'utf8')) as unknown
    if (Array.isArray(parsed)) {
      existing = parsed.map(parseDayCommit).filter((item): item is DayCommit => Boolean(item))
    }
  } catch {
    existing = []
  }

  if (existing.some(item => item.date === commit.date)) {
    throw new Error('今天已经提交过心情记录')
  }

  const next = [...existing, commit].sort((a, b) => a.date.localeCompare(b.date))
  await writeFile(monthPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return commit
}

function levelOf(intensitySum: number): 0 | 1 | 2 | 3 | 4 {
  if (intensitySum <= 0) return 0
  if (intensitySum <= 4) return 1
  if (intensitySum <= 9) return 2
  if (intensitySum <= 15) return 3
  return 4
}

function aggregateWeek(days: DayCommit[]): { level: 0 | 1 | 2 | 3 | 4; dominantMood: Mood | null } {
  if (days.length === 0) return { level: 0, dominantMood: null }

  const score = new Map<Mood, number>()
  for (const day of days) {
    score.set(day.mood, (score.get(day.mood) ?? 0) + day.intensity)
  }

  let dominantMood: Mood = days[0].mood
  let best = -1
  for (const [mood, value] of score) {
    if (value > best) {
      dominantMood = mood
      best = value
    }
  }

  const intensitySum = days.reduce((sum, day) => sum + day.intensity, 0)
  return { level: levelOf(intensitySum), dominantMood }
}

export async function buildLifeWeeksData(source: LifeCommitSource): Promise<LifeWeeksData> {
  const totalWeeks = Math.floor((LIFESPAN_YEARS * 365.25) / 7)
  const todayISO = toLocalISODate(new Date())
  const currentWeekIndex = weekIndexOf(todayISO)
  const trackedFromWeek = Math.max(0, currentWeekIndex - TRACKED_WEEKS)

  const trackedFromISO = toISODate(new Date(birthUTC() + trackedFromWeek * 7 * DAY_MS))
  const dailyCommits = await source.getDailyCommits(trackedFromISO, todayISO)
  const byWeek = new Map<number, DayCommit[]>()
  for (const day of dailyCommits) {
    const index = weekIndexOf(day.date)
    if (index < 0 || index >= totalWeeks) continue
    const bucket = byWeek.get(index)
    if (bucket) bucket.push(day)
    else byWeek.set(index, [day])
  }

  const weeks: LifeWeek[] = []
  for (let i = 0; i < totalWeeks; i++) {
    const days = byWeek.get(i) ?? []
    const { level, dominantMood } = aggregateWeek(days)
    weeks.push({
      weekIndex: i,
      startDate: toISODate(new Date(birthUTC() + i * 7 * DAY_MS)),
      level,
      dominantMood,
      days,
    })
  }

  return {
    birthDate: BIRTH_DATE,
    lifespanYears: LIFESPAN_YEARS,
    totalWeeks,
    currentWeekIndex,
    trackedFromWeek,
    todayCommit: dailyCommits.find(commit => commit.date === todayISO) ?? null,
    weeks,
  }
}
