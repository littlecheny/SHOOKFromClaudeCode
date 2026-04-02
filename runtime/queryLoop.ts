import type { ToolDescriptor } from './protocol.js'
import type { TodoItem } from './statePersistence.js'
import type { PythonWorkerClient } from './workerClient.js'
import { ModelClient, type ChatMessage } from './modelClient.js'

export type QueryEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; tool: string; args: unknown }
  | { type: 'tool_result'; tool: string; result: unknown }
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
      content: [
        '你是 Shook 的终端智能助手。',
        '运行环境为 TS 主控 + Python tool worker。',
        '用户当前看到的是顶部固定 UI 和下方 transcript。',
        '当且仅当确实需要工具时，输出 JSON 代码块，格式为 {"tool":"工具名","arguments":{...}} 或数组。',
        '如果不需要工具，直接用中文给出简洁回答。',
        notes.length > 0 ? `当前工作记忆：\n${notes.map((note, index) => `${index + 1}. ${note}`).join('\n')}` : '当前没有额外工作记忆。',
        todos.length > 0
          ? `当前待办：\n${todos.map((todo, index) => `${index + 1}. [${todo.done ? 'x' : ' '}] ${todo.content}`).join('\n')}`
          : '当前没有待办。',
      ].join('\n'),
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

    for (const call of result.toolCalls) {
      yield { type: 'tool_start', tool: call.tool, args: call.arguments }
      
      try {
        const toolResult = await workerClient.callTool(call.tool, call.arguments)
        const toolResultText = JSON.stringify(toolResult, null, 2)
        yield { type: 'tool_result', tool: call.tool, result: toolResultText }
        messages.push({ role: 'tool', name: call.tool, content: toolResultText })
      } catch (error) {
        const errorMessage = (error as Error).message
        yield { type: 'error', message: `工具执行失败: ${errorMessage}` }
        messages.push({ role: 'tool', name: call.tool, content: `Error: ${errorMessage}` })
      }
    }

    messages.push({ role: 'assistant', content: result.content })

    const followup = await modelClient.complete(messages, tools)
    if (followup.toolCalls.length === 0) {
      yield { type: 'text', content: `Shook: ${followup.content || '工具执行完成。'}` }
      return
    }

    messages.push({ role: 'assistant', content: followup.content })
  }

  yield { type: 'error', message: 'Shook: 已达到最大工具迭代次数，停止继续执行。' }
}
