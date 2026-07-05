import type { ShookWorkflow } from './types.js'

export const goalWorkflow: ShookWorkflow = {
  name: 'goal',
  command: 'goal',
  description: '人生伙伴：基于精华档案对话式共创目标与执行计划',
  category: 'companion',
  async run() {
    return {
      exitCode: 0,
      message: '[goal] 请使用 /goal start|save|off|list|show|check 进入或操作目标共创对话',
    }
  },
}
