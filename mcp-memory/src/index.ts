#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const __dirname = dirname(fileURLToPath(import.meta.url))

// mcp-memory/dist/index.js -> mcp-memory/ -> workdoc_runtime_impl/ -> .shook/memory
const DEFAULT_MEMORY_ROOT = join(__dirname, '..', '..', '.shook', 'memory')
const MEMORY_ROOT = process.env.SHOOK_MEMORY_ROOT ?? DEFAULT_MEMORY_ROOT
const ESSENCE_PATH = join(MEMORY_ROOT, 'essence.md')
const CHATS_DIR = join(MEMORY_ROOT, 'chats')

async function ensureDirs(): Promise<void> {
  await mkdir(CHATS_DIR, { recursive: true })
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^\w一-龥]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'untitled'
}

async function uniqueChatFilePath(baseName: string): Promise<string> {
  let candidate = join(CHATS_DIR, `${baseName}.md`)
  let suffix = 2
  while (true) {
    try {
      await stat(candidate)
      candidate = join(CHATS_DIR, `${baseName}-${suffix}.md`)
      suffix += 1
    } catch {
      return candidate
    }
  }
}

const server = new McpServer({
  name: 'shook-memory',
  version: '0.1.0',
})

server.registerTool(
  'save_essence',
  {
    title: 'Save Essence',
    description:
      '把一段与用户对话中提炼出的精华摘要追加写入 Shook 的 essence.md（.shook/memory/essence.md）。' +
      '用于记录用户是谁、在意什么、做过什么决定——不要写原始对话全文，写提炼后的结论。',
    inputSchema: {
      content: z.string().min(1).describe('精华摘要正文（可以是多行 Markdown 要点）'),
      source: z.string().optional().describe('来源标识，例如 "Claude Desktop" 或具体项目名'),
    },
  },
  async ({ content, source }) => {
    await ensureDirs()
    const heading = `## ${todayIso()} · ${source?.trim() || 'Claude Desktop'}`
    const block = `${heading}\n\n${content.trim()}\n`
    let existing = ''
    try {
      existing = await readFile(ESSENCE_PATH, 'utf8')
    } catch {
      existing = ''
    }
    const separator = existing.trim() ? `${existing.replace(/\n+$/, '')}\n\n` : ''
    await writeFile(ESSENCE_PATH, `${separator}${block}`, 'utf8')
    return {
      content: [{ type: 'text', text: `已追加精华到 essence.md：\n\n${block}` }],
    }
  },
)

server.registerTool(
  'save_chat_record',
  {
    title: 'Save Chat Record',
    description:
      '把一段完整/较长的原始聊天记录存档到 .shook/memory/chats/ 目录，每次调用生成一个新文件，不会覆盖已有记录。' +
      '适合保存值得完整留档的对话，而不是随手提炼的摘要（摘要请用 save_essence）。',
    inputSchema: {
      content: z.string().min(1).describe('聊天记录正文，建议保留角色和时间信息'),
      topic: z.string().optional().describe('简短主题，用于生成文件名，例如 "职业规划讨论"'),
      source: z.string().optional().describe('来源标识，例如 "Claude Desktop"'),
    },
  },
  async ({ content, topic, source }) => {
    await ensureDirs()
    const sourceSlug = slugify(source?.trim() || 'claude-desktop')
    const topicSlug = slugify(topic?.trim() || 'chat')
    const baseName = `${todayIso()}-${sourceSlug}-${topicSlug}`
    const filePath = await uniqueChatFilePath(baseName)
    await writeFile(filePath, content, 'utf8')
    return {
      content: [{ type: 'text', text: `已保存聊天记录：${filePath}` }],
    }
  },
)

server.registerTool(
  'read_essence',
  {
    title: 'Read Essence',
    description: '读取 essence.md 的完整内容，用于查看目前已经记录了哪些精华，避免重复写入。',
    inputSchema: {},
  },
  async () => {
    try {
      const content = await readFile(ESSENCE_PATH, 'utf8')
      return { content: [{ type: 'text', text: content }] }
    } catch {
      return { content: [{ type: 'text', text: '（essence.md 尚不存在，还没有任何记录）' }] }
    }
  },
)

server.registerTool(
  'list_chat_records',
  {
    title: 'List Chat Records',
    description: '列出 .shook/memory/chats/ 目录下已保存的聊天记录文件名，用于回顾之前记过什么。',
    inputSchema: {},
  },
  async () => {
    await ensureDirs()
    const entries = await readdir(CHATS_DIR, { withFileTypes: true })
    const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.md')).map(entry => entry.name).sort()
    const text = files.length > 0 ? files.map(name => `- ${name}`).join('\n') : '（暂无聊天记录）'
    return { content: [{ type: 'text', text }] }
  },
)

async function main(): Promise<void> {
  await ensureDirs()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(error => {
  console.error('[shook-memory-mcp] fatal error:', error)
  process.exit(1)
})
