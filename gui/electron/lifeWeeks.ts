// 四千周人生视图的数据层。
// 单日 commit 的真实生产方式暂未定义：稳定契约是 LifeCommitSource 接口
// 和 lifeweeks:get 的返回形状，未来接入真实数据只需替换 MockCommitSource。

export type DayCommit = { date: string; count: number }

export type LifeWeek = {
  weekIndex: number
  startDate: string
  level: 0 | 1 | 2 | 3 | 4
  days: DayCommit[]
}

export type LifeWeeksData = {
  birthDate: string
  lifespanYears: number
  totalWeeks: number
  currentWeekIndex: number
  trackedFromWeek: number
  weeks: LifeWeek[]
}

export interface LifeCommitSource {
  getDailyCommits(fromISO: string, toISO: string): Promise<DayCommit[]>
}

const BIRTH_DATE = '2002-06-04'
const LIFESPAN_YEARS = 77
const TRACKED_WEEKS = 104 // mock 只覆盖最近约两年
const DAY_MS = 24 * 60 * 60 * 1000

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
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
        commits.push({ date, count: 0 })
        continue
      }
      const base = rand()
      let count = 0
      if (base > (isWeekend ? 0.55 : 0.25)) {
        count = Math.floor(rand() * (isWeekend ? 3 : 6)) + 1
      }
      commits.push({ date, count })
    }
    return commits
  }
}

function levelOf(totalCount: number): 0 | 1 | 2 | 3 | 4 {
  if (totalCount <= 0) return 0
  if (totalCount <= 3) return 1
  if (totalCount <= 7) return 2
  if (totalCount <= 14) return 3
  return 4
}

export async function buildLifeWeeksData(source: LifeCommitSource): Promise<LifeWeeksData> {
  const totalWeeks = Math.floor((LIFESPAN_YEARS * 365.25) / 7)
  const todayISO = toISODate(new Date())
  const currentWeekIndex = weekIndexOf(todayISO)
  const trackedFromWeek = Math.max(0, currentWeekIndex - TRACKED_WEEKS)

  const trackedFromISO = toISODate(new Date(birthUTC() + trackedFromWeek * 7 * DAY_MS))
  const dailyCommits = await source.getDailyCommits(trackedFromISO, todayISO)
  const byWeek = new Map<number, DayCommit[]>()
  for (const day of dailyCommits) {
    const index = weekIndexOf(day.date)
    const bucket = byWeek.get(index)
    if (bucket) bucket.push(day)
    else byWeek.set(index, [day])
  }

  const weeks: LifeWeek[] = []
  for (let i = 0; i < totalWeeks; i++) {
    const days = byWeek.get(i) ?? []
    const total = days.reduce((sum, d) => sum + d.count, 0)
    weeks.push({
      weekIndex: i,
      startDate: toISODate(new Date(birthUTC() + i * 7 * DAY_MS)),
      level: days.length > 0 ? levelOf(total) : 0,
      days,
    })
  }

  return {
    birthDate: BIRTH_DATE,
    lifespanYears: LIFESPAN_YEARS,
    totalWeeks,
    currentWeekIndex,
    trackedFromWeek,
    weeks,
  }
}
