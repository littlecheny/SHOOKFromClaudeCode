import { join } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import type { PythonWorkerClient } from './workerClient.js'
import { ModelClient } from './modelClient.js'

type GetNewsOptions = {
  projectRoot: string
  workerClient: PythonWorkerClient
  modelClient: ModelClient
  date?: string
  dryRun?: boolean
  onLog?: (line: string) => void
}

type FeedEntry = { name?: string; url: string }

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
      continue
    }
    const nameMatch = line.match(/^name:\s*"(.*?)"$/)
    if (nameMatch) {
      pending.name = nameMatch[1]
      continue
    }
    const urlMatch = line.match(/^url:\s*"(.*?)"$/)
    if (urlMatch) {
      pending.url = urlMatch[1]
      continue
    }
  }
  flush()
  return result
}

async function fetchCategoryFeeds(workerClient: PythonWorkerClient, feeds: FeedEntry[], limitPerFeed = 20): Promise<any[]> {
  if (feeds.length === 0) return []
  const payload = await workerClient.callTool('fetch_feeds', {
    feeds,
    since: null,
    limit_per_feed: limitPerFeed,
  }) as { items?: any[] }
  return Array.isArray(payload?.items) ? payload.items : []
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
  const { projectRoot, workerClient, modelClient, date = new Date().toISOString().slice(0, 10), dryRun = false, onLog } = options
  onLog?.(`[get-news] 加载 feeds 配置`)
  const feedsBySection = await loadFeeds(projectRoot)
  onLog?.(`[get-news] 拉取新闻候选`)
  const sections = {
    ai: await fetchCategoryFeeds(workerClient, feedsBySection.ai),
    jobs: await fetchCategoryFeeds(workerClient, feedsBySection.jobs),
    github: await fetchCategoryFeeds(workerClient, feedsBySection.github),
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
  if (!dryRun) {
    onLog?.(`[get-news] 推送报告到 GitHub`)
    await workerClient.callTool('commit_and_push', {
      repo_path: projectRoot,
      paths: [`reports/${date}.md`],
      message: `docs: 每日简报 ${date}`,
    })
  } else {
    onLog?.(`[get-news] [DRY RUN] 跳过 GitHub 推送`)
  }
  return reportPath
}
