import process from 'node:process'
import type { ToolDescriptor } from './protocol.js'
import { withRetry } from './withRetry.js'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

export type ToolCall = {
  id?: string
  tool: string
  arguments: Record<string, unknown>
}

export type ModelResult = {
  content: string
  toolCalls: ToolCall[]
}

type ModelProvider = 'anthropic' | 'gemini' | 'kimi' | 'aicoding'

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
          id: Math.random().toString(36).substring(7),
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
  }
  return {}
}

function extractTextFromResponseContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return ''
  }

  let text = ''
  for (const part of content) {
    if (!part || typeof part !== 'object' || Array.isArray(part)) {
      continue
    }
    const record = part as Record<string, unknown>
    if (typeof record.text === 'string') {
      text += record.text
    } else if (typeof record.output_text === 'string') {
      text += record.output_text
    }
  }
  return text
}

function parseResponsesPayload(payload: unknown): ModelResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { content: '', toolCalls: [] }
  }

  const record = payload as Record<string, unknown>
  let content = typeof record.output_text === 'string' ? record.output_text : ''
  const toolCalls: ToolCall[] = []

  if (Array.isArray(record.output)) {
    for (const item of record.output) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue
      }

      const output = item as Record<string, unknown>
      if (output.type === 'message') {
        content += extractTextFromResponseContent(output.content)
        continue
      }

      if (output.type === 'function_call' && typeof output.name === 'string') {
        toolCalls.push({
          id: typeof output.call_id === 'string' ? output.call_id : typeof output.id === 'string' ? output.id : Math.random().toString(36).substring(7),
          tool: output.name,
          arguments: typeof output.arguments === 'string' ? parseJsonObject(output.arguments) : {},
        })
      }
    }
  }

  const choice = Array.isArray(record.choices)
    ? (record.choices[0] as Record<string, unknown> | undefined)
    : undefined
  const message = choice?.message as Record<string, unknown> | undefined
  if (message) {
    content += typeof message.content === 'string' ? message.content : ''
    if (Array.isArray(message.tool_calls)) {
      for (const call of message.tool_calls) {
        if (!call || typeof call !== 'object' || Array.isArray(call)) {
          continue
        }
        const toolCall = call as Record<string, unknown>
        const fn = toolCall.function as Record<string, unknown> | undefined
        if (typeof fn?.name === 'string') {
          toolCalls.push({
            id: typeof toolCall.id === 'string' ? toolCall.id : Math.random().toString(36).substring(7),
            tool: fn.name,
            arguments: typeof fn.arguments === 'string' ? parseJsonObject(fn.arguments) : {},
          })
        }
      }
    }
  }

  if (toolCalls.length === 0 && content.includes('```')) {
    toolCalls.push(...parseToolCalls(content))
  }

  return { content, toolCalls }
}

function parseResponsesStream(streamText: string): ModelResult {
  let content = ''
  const toolItems = new Map<string, { id?: string; name?: string; argumentsText: string }>()
  let completedPayload: unknown

  for (const rawLine of streamText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith('data:')) {
      continue
    }

    const dataText = line.slice('data:'.length).trim()
    if (!dataText || dataText === '[DONE]') {
      continue
    }

    let event: Record<string, unknown>
    try {
      const parsed = JSON.parse(dataText) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        continue
      }
      event = parsed as Record<string, unknown>
    } catch {
      continue
    }

    if (event.type === 'response.completed') {
      completedPayload = event.response
      continue
    }

    if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
      content += event.delta
      continue
    }

    if (event.type === 'response.output_text.done' && !content && typeof event.text === 'string') {
      content = event.text
      continue
    }

    const item = event.item as Record<string, unknown> | undefined
    if ((event.type === 'response.output_item.added' || event.type === 'response.output_item.done') && item?.type === 'function_call') {
      const key = typeof item.id === 'string'
        ? item.id
        : typeof item.call_id === 'string'
          ? item.call_id
          : String(event.output_index ?? toolItems.size)
      const current = toolItems.get(key) ?? { argumentsText: '' }
      current.id = typeof item.call_id === 'string' ? item.call_id : typeof item.id === 'string' ? item.id : current.id
      current.name = typeof item.name === 'string' ? item.name : current.name
      current.argumentsText = typeof item.arguments === 'string' ? item.arguments : current.argumentsText
      toolItems.set(key, current)
      continue
    }

    if (
      (event.type === 'response.function_call_arguments.delta' ||
        event.type === 'response.function_call_arguments.done') &&
      typeof event.delta === 'string'
    ) {
      const key = String(event.item_id ?? event.output_index ?? '0')
      const current = toolItems.get(key) ?? { argumentsText: '' }
      current.argumentsText += event.delta
      toolItems.set(key, current)
    }
  }

  const completed = parseResponsesPayload(completedPayload)
  if (!content) {
    content = completed.content
  }

  const toolCalls = [...completed.toolCalls]
  for (const item of toolItems.values()) {
    if (!item.name) {
      continue
    }
    toolCalls.push({
      id: item.id ?? Math.random().toString(36).substring(7),
      tool: item.name,
      arguments: parseJsonObject(item.argumentsText),
    })
  }

  if (toolCalls.length === 0 && content.includes('```')) {
    toolCalls.push(...parseToolCalls(content))
  }

  return { content, toolCalls }
}

export class ModelClient {
  private readonly geminiApiKey = process.env.GEMINI_API_KEY ?? ''
  private readonly anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? ''
  private readonly kimiApiKey = process.env.KIMI_API_KEY ?? ''
  private readonly aicodingApiKey = process.env.AICODING_API_KEY ?? process.env.OPENAI_RESPONSES_API_KEY ?? process.env.OPENAI_API_KEY ?? ''

  private readonly explicitProvider = process.env.LLM_PROVIDER
  private readonly provider: ModelProvider | null =
    this.explicitProvider === 'aicoding' || this.explicitProvider === 'chatgpt' || this.explicitProvider === 'openai' || this.explicitProvider === 'openai-responses' || (!this.explicitProvider && this.aicodingApiKey) ? 'aicoding' :
    this.explicitProvider === 'claude' || (!this.explicitProvider && this.anthropicApiKey) ? 'anthropic' :
    this.explicitProvider === 'gemini' || (!this.explicitProvider && this.geminiApiKey) ? 'gemini' :
    this.explicitProvider === 'kimi' || (!this.explicitProvider && this.kimiApiKey) ? 'kimi' : null

  private readonly geminiModel = process.env.LLM_MODEL ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  private readonly anthropicModel = process.env.LLM_MODEL ?? process.env.ANTHROPIC_MODEL ?? 'claude-3-7-sonnet-20250219'
  private readonly kimiModel = process.env.LLM_MODEL ?? process.env.KIMI_MODEL ?? 'moonshot-v1-8k'
  private readonly aicodingModel = process.env.LLM_MODEL ?? process.env.AICODING_MODEL ?? process.env.OPENAI_RESPONSES_MODEL ?? 'gpt-5.4'
  private readonly aicodingResponsesUrl = process.env.AICODING_RESPONSES_URL ?? process.env.OPENAI_RESPONSES_URL ?? 'https://aicoding.0011.ai/v1/responses'
  private readonly requestTimeoutMs = Number.parseInt(process.env.SHOOK_MODEL_TIMEOUT_MS ?? '45000', 10)

  async complete(messages: ChatMessage[], tools: ToolDescriptor[]): Promise<ModelResult> {
    if (!this.provider) {
      return {
        content: '当前未设置任何受支持的 API_KEY (AICODING, ANTHROPIC, GEMINI, KIMI) 或环境变量 LLM_PROVIDER 无效。请在 .env 中进行配置。',
        toolCalls: [],
      }
    }

    if (this.provider === 'anthropic') {
      return this.completeAnthropic(messages, tools)
    } else if (this.provider === 'kimi') {
      return this.completeKimi(messages, tools)
    } else if (this.provider === 'aicoding') {
      return this.completeAicodingResponses(messages, tools)
    }

    return this.completeGemini(messages, tools)
  }

  private async completeAicodingResponses(messages: ChatMessage[], tools: ToolDescriptor[]): Promise<ModelResult> {
    const systemInstruction = messages.find(message => message.role === 'system')?.content ?? ''
    const prompt = buildPrompt(messages, tools)
    const responseTools = tools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    }))

    const doFetch = async () => {
      const res = await fetchWithTimeout(this.aicodingResponsesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aicodingApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.aicodingModel,
          stream: true,
          instructions: systemInstruction || undefined,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: prompt || '你好',
                },
              ],
            },
          ],
          tools: responseTools.length > 0 ? responseTools : undefined,
          temperature: 0.3,
        }),
      }, Number.isFinite(this.requestTimeoutMs) ? this.requestTimeoutMs : 45000)

      if (!res.ok) {
        if (res.status === 401) throw new Error('AICoding API Key 无效或过期 (401 Unauthorized)')
        if (res.status === 403) throw new Error('AICoding API Key 无权限 (403 Forbidden)')
        if (res.status === 429) throw new Error('触发了 API 调用频率限制 (429 Too Many Requests)')
        if (res.status >= 500) throw new Error(`服务端错误 (${res.status} ${res.statusText})`)
        throw new Error(`请求失败: ${res.status} ${res.statusText}\n${await res.text()}`)
      }
      return res
    }

    try {
      const response = await withRetry(doFetch, {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      })

      const responseText = await response.text()
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        return parseResponsesPayload(JSON.parse(responseText) as unknown)
      }
      return parseResponsesStream(responseText)
    } catch (error) {
      return {
        content: `AICoding 模型调用失败：${(error as Error).message}`,
        toolCalls: [],
      }
    }
  }

  private async completeAnthropic(messages: ChatMessage[], tools: ToolDescriptor[]): Promise<ModelResult> {
    const systemInstruction = messages.find(message => message.role === 'system')?.content ?? ''

    // Anthropic API requires alternating user/assistant messages, and tool responses.
    const formattedMessages: any[] = []

    for (const msg of messages) {
      if (msg.role === 'system') continue

      if (msg.role === 'tool') {
        // Anthropic tool result
        formattedMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.tool_call_id ?? 'unknown',
              content: msg.content
            }
          ]
        })
      } else if (msg.role === 'assistant') {
        const parts: any[] = []
        if (msg.content) {
          parts.push({ type: 'text', text: msg.content })
        }
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          for (const call of msg.tool_calls) {
            parts.push({
              type: 'tool_use',
              id: call.id,
              name: call.tool,
              input: call.arguments
            })
          }
        }
        formattedMessages.push({
          role: 'assistant',
          content: parts.length > 0 ? parts : ' '
        })
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        })
      }
    }

    // Merge consecutive messages of the same role (Anthropic strict requirement)
    const mergedMessages: any[] = []
    for (const msg of formattedMessages) {
      if (mergedMessages.length > 0 && mergedMessages[mergedMessages.length - 1].role === msg.role) {
        const lastMsg = mergedMessages[mergedMessages.length - 1]
        if (Array.isArray(lastMsg.content) && Array.isArray(msg.content)) {
          lastMsg.content.push(...msg.content)
        } else if (typeof lastMsg.content === 'string' && typeof msg.content === 'string') {
          lastMsg.content += '\n\n' + msg.content
        } else {
          // Mixed types, convert string to text block
          const lastContent = typeof lastMsg.content === 'string' ? [{ type: 'text', text: lastMsg.content }] : lastMsg.content
          const newContent = typeof msg.content === 'string' ? [{ type: 'text', text: msg.content }] : msg.content
          lastMsg.content = [...lastContent, ...newContent]
        }
      } else {
        mergedMessages.push(msg)
      }
    }

    // If first message is not user, insert a dummy user message
    if (mergedMessages.length > 0 && mergedMessages[0].role !== 'user') {
      mergedMessages.unshift({ role: 'user', content: '继续' })
    }

    const anthropicTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema
    }))

    const doFetch = async () => {
      const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.anthropicModel,
          max_tokens: 4096,
          system: systemInstruction,
          messages: mergedMessages.length > 0 ? mergedMessages : [{ role: 'user', content: '你好' }],
          tools: anthropicTools.length > 0 ? anthropicTools : undefined,
          temperature: 0.3
        })
      }, Number.isFinite(this.requestTimeoutMs) ? this.requestTimeoutMs : 45000)

      if (!res.ok) {
        if (res.status === 401) throw new Error('Claude API Key 无效或过期 (401 Unauthorized)')
        if (res.status === 403) throw new Error('Claude API Key 无权限 (403 Forbidden)')
        if (res.status === 429) throw new Error('触发了 API 调用频率限制 (429 Too Many Requests)')
        if (res.status >= 500) throw new Error(`服务端错误 (${res.status} ${res.statusText})`)
        throw new Error(`请求失败: ${res.status} ${res.statusText}\n${await res.text()}`)
      }
      return res
    }

    try {
      const response = await withRetry(doFetch, {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      })

      const data = await response.json() as any

      let content = ''
      const toolCalls: ToolCall[] = []

      if (data.content && Array.isArray(data.content)) {
        for (const block of data.content) {
          if (block.type === 'text') {
            content += block.text
          } else if (block.type === 'tool_use') {
            toolCalls.push({
              id: block.id,
              tool: block.name,
              arguments: block.input
            })
          }
        }
      }

      return { content, toolCalls }
    } catch (error) {
      return {
        content: `Claude 模型调用失败：${(error as Error).message}`,
        toolCalls: [],
      }
    }
  }

  private async completeKimi(messages: ChatMessage[], tools: ToolDescriptor[]): Promise<ModelResult> {
    const systemInstruction = messages.find(message => message.role === 'system')?.content ?? ''

    // Kimi uses OpenAI-compatible format
    const formattedMessages: any[] = []
    if (systemInstruction) {
      formattedMessages.push({ role: 'system', content: systemInstruction })
    }

    for (const msg of messages) {
      if (msg.role === 'system') continue

      if (msg.role === 'tool') {
        formattedMessages.push({
          role: 'tool',
          tool_call_id: msg.tool_call_id ?? 'unknown',
          name: msg.name,
          content: msg.content
        })
      } else if (msg.role === 'assistant') {
        const assistantMsg: any = { role: 'assistant' }
        if (msg.content) {
          assistantMsg.content = msg.content
        }
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          assistantMsg.tool_calls = msg.tool_calls.map(call => ({
            id: call.id,
            type: 'function',
            function: {
              name: call.tool,
              arguments: JSON.stringify(call.arguments)
            }
          }))
        }
        formattedMessages.push(assistantMsg)
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        })
      }
    }

    const kimiTools = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema
      }
    }))

    const doFetch = async () => {
      const res = await fetchWithTimeout('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.kimiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.kimiModel,
          messages: formattedMessages.length > 0 ? formattedMessages : [{ role: 'user', content: '你好' }],
          tools: kimiTools.length > 0 ? kimiTools : undefined,
          temperature: 0.3
        })
      }, Number.isFinite(this.requestTimeoutMs) ? this.requestTimeoutMs : 45000)

      if (!res.ok) {
        if (res.status === 401) throw new Error('Kimi API Key 无效或过期 (401 Unauthorized)')
        if (res.status === 403) throw new Error('Kimi API Key 无权限 (403 Forbidden)')
        if (res.status === 429) throw new Error('触发了 API 调用频率限制 (429 Too Many Requests)')
        if (res.status >= 500) throw new Error(`服务端错误 (${res.status} ${res.statusText})`)
        throw new Error(`请求失败: ${res.status} ${res.statusText}\n${await res.text()}`)
      }
      return res
    }

    try {
      const response = await withRetry(doFetch, {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      })

      const data = await response.json() as any
      const choice = data.choices?.[0]?.message

      const content = choice?.content ?? ''
      const toolCalls: ToolCall[] = []

      if (choice?.tool_calls && Array.isArray(choice.tool_calls)) {
        for (const call of choice.tool_calls) {
          if (call.type === 'function') {
            let parsedArgs = {}
            try {
              parsedArgs = JSON.parse(call.function.arguments)
            } catch (e) {
              console.error('Failed to parse tool arguments from Kimi:', call.function.arguments)
            }
            toolCalls.push({
              id: call.id,
              tool: call.function.name,
              arguments: parsedArgs
            })
          }
        }
      }

      return { content, toolCalls }
    } catch (error) {
      return {
        content: `Kimi 模型调用失败：${(error as Error).message}`,
        toolCalls: [],
      }
    }
  }

  private async completeGemini(messages: ChatMessage[], tools: ToolDescriptor[]): Promise<ModelResult> {
    const systemInstruction = messages.find(message => message.role === 'system')?.content ?? ''

    // Gemini Native Tool Calling conversion
    const geminiTools = tools.length > 0 ? [{
      function_declarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.input_schema
      }))
    }] : undefined

    const formattedContents: any[] = []
    for (const msg of messages) {
      if (msg.role === 'system') continue

      if (msg.role === 'tool') {
        formattedContents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: msg.name ?? 'unknown',
              response: { result: msg.content }
            }
          }]
        })
      } else if (msg.role === 'assistant') {
        const parts: any[] = []
        if (msg.content) {
          parts.push({ text: msg.content })
        }
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          for (const call of msg.tool_calls) {
            parts.push({
              functionCall: {
                name: call.tool,
                args: call.arguments
              }
            })
          }
        }
        formattedContents.push({
          role: 'model',
          parts: parts.length > 0 ? parts : [{ text: ' ' }]
        })
      } else {
        formattedContents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        })
      }
    }

    // Workaround for consecutive user messages which Gemini might reject
    const mergedContents: any[] = []
    for (const content of formattedContents) {
      if (mergedContents.length > 0 && mergedContents[mergedContents.length - 1].role === content.role) {
        mergedContents[mergedContents.length - 1].parts.push(...content.parts)
      } else {
        mergedContents.push(content)
      }
    }

    const doFetch = async () => {
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: mergedContents.length > 0 ? mergedContents : [{ role: 'user', parts: [{ text: '你好' }] }],
          tools: geminiTools,
          generationConfig: {
            temperature: 0.3,
          },
        }),
      }, Number.isFinite(this.requestTimeoutMs) ? this.requestTimeoutMs : 45000)

      if (!res.ok) {
        if (res.status === 401) throw new Error('API Key 无效或过期 (401 Unauthorized)')
        if (res.status === 403) throw new Error('API Key 无权限 (403 Forbidden)')
        if (res.status === 429) throw new Error('触发了 API 调用频率限制 (429 Too Many Requests)')
        if (res.status >= 500) throw new Error(`服务端错误 (${res.status} ${res.statusText})`)
        throw new Error(`请求失败: ${res.status} ${res.statusText}\n${await res.text()}`)
      }

      return res
    }

    try {
      const response = await withRetry(doFetch, {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      })

      const payload = await response.json() as any
      const parts = payload.candidates?.[0]?.content?.parts ?? []

      let content = ''
      const toolCalls: ToolCall[] = []

      for (const part of parts) {
        if (part.text) {
          content += part.text
        }
        if (part.functionCall) {
          toolCalls.push({
            id: Math.random().toString(36).substring(7),
            tool: part.functionCall.name,
            arguments: part.functionCall.args
          })
        }
      }

      // 兜底支持旧的 JSON 文本提取模式，以防模型产生幻觉
      if (toolCalls.length === 0 && content.includes('```')) {
        const fallbackCalls = parseToolCalls(content)
        toolCalls.push(...fallbackCalls)
      }

      return {
        content,
        toolCalls,
      }
    } catch (error) {
      return {
        content: `模型调用失败：${(error as Error).message}`,
        toolCalls: [],
      }
    }
  }
}
