import { join } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import process from 'node:process'
import type { PythonWorkerClient } from './workerClient.js'
import { ModelClient } from './modelClient.js'

type GetNewsOptions = {
  projectRoot: string
  workerClient: PythonWorkerClient
  modelClient: ModelClient
  date?: string
  onLog?: (line: string) => void
}

type FeedEntry = { name?: string; url: string }
type FeedFetchError = { name?: string; url: string; error: string }
type FeedFetchResult = { items: any[]; errors: FeedFetchError[] }

function defaultReportDate(): string {
  const timeZone = process.env.SHOOK_TIMEZONE ?? 'Asia/Shanghai'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

async function loadFeeds(projectRoot: string): Promise<Record<string, FeedEntry[]>> {
  const path = join(projectRoot, 'scripts', 'orchestrator', 'feeds.yaml')
  let text = ''
  const result: Record<string, FeedEntry[]> = { ai: [], jobs: [], github: [] }
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return result
  }
  let currentSection: 'ai' | 'jobs' | 'github' | null = null
  let pending: Partial<FeedEntry> = {}
  const applyField = (line: string): boolean => {
    const match = line.match(/^(name|url):\s*(?:"(.*?)"|'(.*?)'|(.+))$/)
    if (!match) return false
    const value = match[2] ?? match[3] ?? match[4]?.trim() ?? ''
    if (match[1] === 'name') pending.name = value
    if (match[1] === 'url') pending.url = value
    return true
  }
  const flush = () => {
    if (currentSection && pending.url) {
      result[currentSection].push({ name: pending.name, url: pending.url })
    }
    pending = {}
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('ai:')) {
      flush()
      currentSection = 'ai'
      continue
    }
    if (line.startsWith('jobs:')) {
      flush()
      currentSection = 'jobs'
      continue
    }
    if (line.startsWith('github:')) {
      flush()
      currentSection = 'github'
      continue
    }
    if (line.startsWith('- ')) {
      flush()
      pending = {}
      const rest = line.slice(2).trim()
      if (rest) applyField(rest)
      continue
    }
    if (applyField(line)) continue
  }
  flush()
  return result
}

async function fetchCategoryFeeds(workerClient: PythonWorkerClient, feeds: FeedEntry[], limitPerFeed = 20): Promise<FeedFetchResult> {
  if (feeds.length === 0) return { items: [], errors: [] }
  const result = await workerClient.callTool('fetch_feeds', {
    feeds,
    since: null,
    limit_per_feed: limitPerFeed,
  }) as { success?: boolean; data?: { items?: any[]; errors?: FeedFetchError[] }; error?: string }
  if (!result?.success) {
    return {
      items: [],
      errors: feeds.map(feed => ({
        name: feed.name,
        url: feed.url,
        error: result?.error ?? 'fetch_feeds failed',
      })),
    }
  }
  const payload = result.data ?? {}
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    errors: Array.isArray(payload?.errors) ? payload.errors : [],
  }
}

function logFeedResult(section: string, result: FeedFetchResult, onLog?: (line: string) => void): void {
  const failedCount = result.errors.length
  onLog?.(`[get-news] ${section}: 拉取 ${result.items.length} 条，失败 ${failedCount} 个源`)
  for (const error of result.errors.slice(0, 5)) {
    const label = error.name || error.url
    onLog?.(`[get-news] ${section} 源失败：${label} - ${error.error}`)
  }
}

function buildNewsPrompt(date: string, sections: Record<string, any[]>): string {
  const json = JSON.stringify({
    date,
    ai: sections.ai,
    jobs: sections.jobs,
    github: sections.github,
  }, null, 2)
  return [
    '你是一个专业的科技信息分析师和个人智能秘书，专门为用户筛选和总结每日值得关注的科技资讯。',
    '',
    '任务：',
    '1. 从提供的新闻候选中，筛选出最有价值、最值得关注的内容',
    '2. 用简洁、专业的语言总结新闻要点',
    '3. 分析新闻的影响和用户应该关注的重点',
    '4. 保持客观中立的立场，不夸大也不贬低',
    '',
    '请针对以下 JSON 新闻候选数据生成 Markdown 报告：',
    json,
    '',
    '报告结构：',
    `# 每日新闻简报 - ${date}`,
    '',
    '## 📚 GitHub 值得学习项目',
    '从 github 候选中推荐 1 个项目，给出项目名称、一句话定位、为什么值得学、链接',
    '',
    '## 🤖 AI 圈新闻',
    '选择 3 条新闻，给出标题、摘要、影响与关注点、原文链接',
    '',
    '## 💼 就业相关',
    '列出前 5 条值得关注的职位或趋势，给出标题和链接',
    '',
    '在报告末尾加一句：*本报告由智能秘书自动生成*',
  ].join('\n')
}

export async function runGetNews(options: GetNewsOptions): Promise<string | null> {
  const { projectRoot, workerClient, modelClient, onLog } = options
  const date = options.date || defaultReportDate()
  onLog?.(`[get-news] 加载 feeds 配置`)
  const feedsBySection = await loadFeeds(projectRoot)
  onLog?.(`[get-news] 拉取新闻候选`)
  const fetched = {
    ai: await fetchCategoryFeeds(workerClient, feedsBySection.ai),
    jobs: await fetchCategoryFeeds(workerClient, feedsBySection.jobs),
    github: await fetchCategoryFeeds(workerClient, feedsBySection.github),
  }
  logFeedResult('AI', fetched.ai, onLog)
  logFeedResult('Jobs', fetched.jobs, onLog)
  logFeedResult('GitHub', fetched.github, onLog)
  const sections = {
    ai: fetched.ai.items,
    jobs: fetched.jobs.items,
    github: fetched.github.items,
  }
  const totalCandidates = sections.ai.length + sections.jobs.length + sections.github.length
  if (totalCandidates === 0) {
    throw new Error('未拉取到任何新闻候选，请检查网络连接或 scripts/orchestrator/feeds.yaml')
  }
  onLog?.(`[get-news] 调用模型生成报告`)
  const prompt = buildNewsPrompt(date, sections)
  const result = await modelClient.complete([
    { role: 'system', content: '你是一个专业的科技信息分析师和个人智能秘书。' },
    { role: 'user', content: prompt },
  ], [])
  const report = result.content || `# 每日新闻简报 - ${date}\n\n（模型未返回内容）\n`
  const reportsDir = join(projectRoot, 'reports')
  await mkdir(reportsDir, { recursive: true })
  const reportPath = join(reportsDir, `${date}.md`)
  await writeFile(reportPath, report, 'utf8')
  onLog?.(`[get-news] 报告已保存：${reportPath}`)
  return reportPath
}
