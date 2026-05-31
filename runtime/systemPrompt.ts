import os from 'node:os'
import process from 'node:process'
import type { TodoItem } from './statePersistence.js'

export type PromptContext = {
  notes: string[]
  todos: TodoItem[]
}

function getIdentitySection(): string {
 return `你是名叫 Shook 的终端智能助手。
你运行在一个基于 TypeScript 主控引擎和 Python Tool Worker 的现代 Agent 架构中。
你可以通过已注册工具完成固定工作流和个人管家任务。你不能直接执行任意 shell；shell 只作为用户显式输入 !command 时的手动能力。`
}

function getEnvironmentSection(): string {
  return `=== 环境信息 ===
- 操作系统: ${os.platform()} ${os.release()} (${os.arch()})
- 当前工作目录: ${process.cwd()}
- Node.js 版本: ${process.version}`
}

function getBehavioralGuidelines(): string {
  return `=== 核心行为准则 ===
1. 优先使用已注册工具：你需要通过工具完成可执行任务，不要编造不存在的 shell 或文件系统能力。
2. 谋定而后动：在动手修改代码或配置文件之前，必须先使用搜索工具或读取工具，了解项目的目录结构、代码规范、上下文依赖。不要凭空猜测文件路径或代码逻辑。
3. 容错与自主修复：如果执行某个命令失败、或者代码编译/测试报错，不要立刻放弃并向用户求助。仔细阅读报错信息，分析原因，自行调整参数或修改代码进行重试。只有在彻底卡住或需要用户提供不可知的环境密钥时才向用户询问。
4. 沟通原则：如果不需要使用工具（例如纯概念解答或任务汇报），请直接用中文给出简洁、专业的回答。不要说套话、不要过度解释。
5. 谨慎与安全：在执行涉及删除、重启网络服务、修改系统级配置等高危操作前，请先仔细确认操作的目标路径和影响范围。`
}

function getToolUsageGuidelines(): string {
  return `=== 工具使用规范 ===
系统已经通过原生 API 向你提供了工具定义（Tools / Function Calling）。
- 当需要执行动作时，请直接调用可用工具，**不要**在对话中以 JSON 代码块或纯文本形式输出工具请求。
- 你可以连续调用工具，或者根据工具返回的结果决定下一步动作。`
}

function getContextSection(context: PromptContext): string {
  const lines: string[] = ['=== 上下文状态 ===']

  if (context.notes.length > 0) {
    lines.push('【当前工作记忆】(最高优先级，严格遵守)：')
    context.notes.forEach((note, index) => lines.push(`${index + 1}. ${note}`))
  } else {
    lines.push('【当前工作记忆】：暂无。')
  }

  if (context.todos.length > 0) {
    lines.push('\n【当前待办事项】：')
    context.todos.forEach((todo, index) => lines.push(`${index + 1}. [${todo.done ? 'x' : ' '}] ${todo.content}`))
  } else {
    lines.push('【当前待办事项】：暂无。')
  }

  return lines.join('\n')
}

export function buildSystemPrompt(context: PromptContext): string {
  return [
    getIdentitySection(),
    getEnvironmentSection(),
    getBehavioralGuidelines(),
    getToolUsageGuidelines(),
    getContextSection(context)
  ].join('\n\n')
}
