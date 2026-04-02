import process from 'node:process'
import type { ToolDescriptor } from './protocol.js'
import { withRetry } from './withRetry.js'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
}

export type ToolCall = {
  tool: string
  arguments: Record<string, unknown>
}

export type ModelResult = {
  content: string
  toolCalls: ToolCall[]
}

function parseToolCalls(content: string): ToolCall[] {
  const blocks = [...content.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map(match => match[1])
  const candidates = blocks.length > 0 ? blocks : [content]
  const calls: ToolCall[] = []

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.trim()) as unknown
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          continue
        }
        const record = item as Record<string, unknown>
        if (typeof record.tool !== 'string') {
          continue
        }
        if (!record.arguments || typeof record.arguments !== 'object' || Array.isArray(record.arguments)) {
          continue
        }
        calls.push({
          tool: record.tool,
          arguments: record.arguments as Record<string, unknown>,
        })
      }
    } catch {
    }
  }

  return calls
}

function buildPrompt(messages: ChatMessage[], tools: ToolDescriptor[]): string {
  const toolText = tools.length === 0
    ? '当前无可用工具。'
    : tools
        .map(tool => `- ${tool.name}: ${tool.description} | schema=${JSON.stringify(tool.input_schema)}`)
        .join('\n')

  const transcript = messages
    .filter(message => message.role !== 'system')
    .map(message => {
      if (message.role === 'tool') {
        return `[tool:${message.name ?? 'unknown'}]\n${message.content}`
      }
      return `[${message.role}]\n${message.content}`
    })
    .join('\n\n')

  return `${transcript}\n\n可用工具：\n${toolText}`
}

export class ModelClient {
  private readonly apiKey = process.env.GEMINI_API_KEY ?? ''
  private readonly model = process.env.LLM_MODEL ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

  async complete(messages: ChatMessage[], tools: ToolDescriptor[]): Promise<ModelResult> {
    if (!this.apiKey) {
      return {
        content: '当前未设置 GEMINI_API_KEY，因此自然语言对话暂时只能显示这条提示。设置好后，我就可以正常回答并调用 Python 工具。',
        toolCalls: [],
      }
    }

    const systemInstruction = messages.find(message => message.role === 'system')?.content ?? ''
    const prompt = buildPrompt(messages, tools)

    const doFetch = async () => {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
          },
        }),
      })

      if (!res.ok) {
        if (res.status === 401) throw new Error('API Key 无效或过期 (401 Unauthorized)')
        if (res.status === 403) throw new Error('API Key 无权限 (403 Forbidden)')
        if (res.status === 429) throw new Error('触发了 API 调用频率限制 (429 Too Many Requests)')
        if (res.status >= 500) throw new Error(`服务端错误 (${res.status} ${res.statusText})`)
        throw new Error(`请求失败: ${res.status} ${res.statusText}`)
      }

      return res
    }

    try {
      const response = await withRetry(doFetch, {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        onRetry: (error, attempt) => {
          // 这里可以接入一个日志收集或者终端显示 "正在重试..."
        }
      })

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>
          }
        }>
      }
      const content = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? ''
      return {
        content,
        toolCalls: parseToolCalls(content),
      }
    } catch (error) {
      return {
        content: `模型调用失败：${(error as Error).message}`,
        toolCalls: [],
      }
    }
  }
}
