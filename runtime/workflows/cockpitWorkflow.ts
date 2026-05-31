import type { ShookWorkflow } from './types.js'

export const cockpitWorkflow: ShookWorkflow = {
  name: 'cockpit',
  command: 'cockpit',
  description: '草拟、压缩、润色文本的交互模式',
  category: 'writing',
  async run() {
    return {
      exitCode: 0,
      message: '[cockpit] 请使用 /cockpit draft|compress|polish [TEXT] 进入或执行模式',
    }
  },
}
