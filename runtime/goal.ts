import type { ChatMessage, ModelClient } from './modelClient.js'

function buildGoalSystemPrompt(essence: string | null): string {
  return [
    '你正在扮演 Shook 的人生伙伴模式：基于用户过去与各类 AI agent 的对话精华，',
    '与用户对话式地共同制定目标。',
    '要求：先理解动机和真实处境，再把目标拆解为可执行的里程碑和具体步骤；',
    '语气真诚、具体，不说空话，不要一次性输出长篇大论，像在对话一样一步步推进。',
    essence
      ? `下面是用户的精华档案（来自其他 agent 的记录），请结合这些信息理解用户：\n\n${essence}`
      : '当前还没有精华档案，可以先直接询问用户的处境和动机。',
  ].join('\n\n')
}

export async function runGoalTurn(options: {
  modelClient: ModelClient
  essence: string | null
  history: ChatMessage[]
  userText: string
}): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildGoalSystemPrompt(options.essence) },
    ...options.history,
    { role: 'user', content: options.userText },
  ]
  const result = await options.modelClient.complete(messages, [])
  return result.content || '（模型未返回内容）'
}

export async function composeGoalDocument(options: {
  modelClient: ModelClient
  essence: string | null
  history: ChatMessage[]
}): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildGoalSystemPrompt(options.essence) },
    ...options.history,
    {
      role: 'user',
      content: [
        '请把以上对话整理成一份目标文档，使用 Markdown，严格遵循下面的结构：',
        '',
        '# <目标标题>',
        '',
        '## 动机',
        '<一两句话说明为什么要做这件事>',
        '',
        '## 里程碑',
        '- [ ] <里程碑 1>',
        '- [ ] <里程碑 2>',
        '',
        '## 执行步骤',
        '- [ ] <具体步骤 1>',
        '- [ ] <具体步骤 2>',
        '',
        '只输出文档本身，不要任何额外解释或代码块包裹。',
      ].join('\n'),
    },
  ]
  const result = await options.modelClient.complete(messages, [])
  return result.content || '# 目标\n\n（模型未返回内容）'
}

export function getGoalHelp(active: boolean): string {
  return [
    'Goal 模式（人生伙伴 · 目标共创）',
    '',
    `当前状态：${active ? '对话中' : '未开启'}`,
    '用法：',
    '  /goal start [TEXT]      进入目标共创对话，可附带第一句话',
    '  /goal save [NAME]       结束当前对话并生成目标文档',
    '  /goal off               放弃当前对话，不保存',
    '  /goal list              列出已保存的目标文档及完成进度',
    '  /goal show NAME         查看目标文档内容',
    '  /goal check NAME N      勾选/取消第 N 个步骤',
    '',
    '进入对话后，直接输入普通文本即可继续和 Shook 共创目标。',
    '精华档案位置：.shook/memory/essence.md（由 Claude Code / Codex 等其他 agent 写入）。',
  ].join('\n')
}
