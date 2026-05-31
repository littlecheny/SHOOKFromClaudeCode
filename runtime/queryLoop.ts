import type { ToolDescriptor } from './protocol.js'
import type { TodoItem } from './statePersistence.js'
import type { PythonWorkerClient } from './workerClient.js'
import { ModelClient, type ChatMessage } from './modelClient.js'
import { buildSystemPrompt } from './systemPrompt.js'
import process from 'node:process'

export type QueryEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; tool: string; args: unknown }
  | { type: 'tool_result'; tool: string; result: unknown }
  | { type: 'tool_policy'; tool: string; message: string }
  | { type: 'error'; message: string }

export async function* runQueryLoop(options: {
  prompt: string
  tools: ToolDescriptor[]
  modelClient: ModelClient
  workerClient: PythonWorkerClient
  history: string[]
  notes: string[]
  todos: TodoItem[]
}): AsyncGenerator<QueryEvent, void, unknown> {
  const { prompt, tools, modelClient, workerClient, history, notes, todos } = options
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt({ notes, todos }),
    },
  ]

  // Context Management: Sliding window for transcript
  // Only keep the last 24 lines to prevent prompt explosion
  for (const line of history.slice(-24)) {
    if (line.startsWith('shook> ')) {
      messages.push({ role: 'user', content: line.slice('shook> '.length) })
      continue
    }
    if (line.startsWith('Shook: ')) {
      messages.push({ role: 'assistant', content: line.slice('Shook: '.length) })
    }
  }

  messages.push({ role: 'user', content: prompt })

  for (let index = 0; index < 5; index += 1) {
    const result = await modelClient.complete(messages, tools)

    if (result.toolCalls.length === 0) {
      if (result.content) {
        yield { type: 'text', content: `Shook: ${result.content}` }
      } else {
        yield { type: 'error', message: 'Shook: 模型未返回内容。' }
      }
      return
    }

    if (result.content && result.content.trim()) {
      yield { type: 'text', content: `Shook: ${result.content}` }
    }

    // 先推入 assistant 的内容和它所请求的 tool_calls
    messages.push({
      role: 'assistant',
      content: result.content,
      tool_calls: result.toolCalls,
    })

    for (const call of result.toolCalls) {
      const descriptor = tools.find(tool => tool.name === call.tool)
      if (descriptor?.category === 'side_effect' && process.env.SHOOK_ALLOW_SIDE_EFFECT_TOOLS !== '1') {
        const message = 'side_effect 工具不会在自然语言 agent loop 中自动执行；请使用明确 slash 工作流或设置 SHOOK_ALLOW_SIDE_EFFECT_TOOLS=1。'
        yield { type: 'tool_policy', tool: call.tool, message }
        messages.push({ role: 'tool', name: call.tool, content: `Blocked by tool policy: ${message}`, tool_call_id: call.id })
        continue
      }

      if (descriptor?.category === 'expensive') {
        const cost = typeof descriptor.cost_estimate === 'number' ? ` estimated_cost=${descriptor.cost_estimate}` : ''
        yield { type: 'tool_policy', tool: call.tool, message: `expensive 工具即将执行。${cost}` }
      }

      yield { type: 'tool_start', tool: call.tool, args: call.arguments }

      try {
        const toolResult = await workerClient.callTool(call.tool, call.arguments)
        const toolResultText = JSON.stringify(toolResult, null, 2)
        yield { type: 'tool_result', tool: call.tool, result: toolResultText }
        messages.push({ role: 'tool', name: call.tool, content: toolResultText, tool_call_id: call.id })
      } catch (error) {
        const errorMessage = (error as Error).message
        yield { type: 'error', message: `工具执行失败: ${errorMessage}` }
        messages.push({ role: 'tool', name: call.tool, content: `Error: ${errorMessage}`, tool_call_id: call.id })
      }
    }

    const followup = await modelClient.complete(messages, tools)
    if (followup.toolCalls.length === 0) {
      yield { type: 'text', content: `Shook: ${followup.content || '工具执行完成。'}` }
      return
    }

    messages.push({ role: 'assistant', content: followup.content })
  }

  yield { type: 'error', message: 'Shook: 已达到最大工具迭代次数，停止继续执行。' }
}
