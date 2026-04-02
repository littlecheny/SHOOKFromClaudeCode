import { ModelClient } from './modelClient.js'

export type CockpitMode = 'draft' | 'compress' | 'polish'

const MODE_LABEL: Record<CockpitMode, string> = {
  draft: '草拟',
  compress: '压缩',
  polish: '润色',
}

function buildPrompt(mode: CockpitMode, text: string): string {
  if (mode === 'draft') {
    return [
      '请把下面的零散想法整理成一个清晰、可直接发出的初稿。',
      '要求：保留原意，补足结构，输出中文 Markdown。',
      '',
      text,
    ].join('\n')
  }

  if (mode === 'compress') {
    return [
      '请把下面内容压缩成更短、更密集、更适合快速阅读的版本。',
      '要求：保留关键信息，不要空话，可用要点列表。',
      '',
      text,
    ].join('\n')
  }

  return [
    '请把下面内容润色成更自然、更专业、更有说服力的版本。',
    '要求：不改变原意，不夸张，不虚构事实。',
    '',
    text,
  ].join('\n')
}

export async function runCockpitTransform(options: {
  mode: CockpitMode
  text: string
  modelClient: ModelClient
}): Promise<string> {
  const result = await options.modelClient.complete([
    {
      role: 'system',
      content: `你正在运行 Shook 的 Cockpit 模式，当前任务是“${MODE_LABEL[options.mode]}”。请严格围绕这个编辑目标进行处理。`,
    },
    {
      role: 'user',
      content: buildPrompt(options.mode, options.text),
    },
  ], [])
  return result.content || '（模型未返回内容）'
}

export function getCockpitHelp(currentMode: CockpitMode | null): string {
  return [
    'Cockpit 模式（草拟-压缩-润色）',
    '',
    `当前模式：${currentMode ?? '未开启'}`,
    '用法：',
    '  /cockpit draft                 进入草拟模式',
    '  /cockpit compress             进入压缩模式',
    '  /cockpit polish               进入润色模式',
    '  /cockpit off                  退出 Cockpit 模式',
    '  /cockpit draft 这里是一段想法   一次性处理并进入草拟模式',
    '',
    '进入模式后，直接输入普通文本即可按当前模式处理。',
  ].join('\n')
}
