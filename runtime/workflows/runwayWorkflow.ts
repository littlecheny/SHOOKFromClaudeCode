import type { ShookWorkflow } from './types.js'

export const runwayWorkflow: ShookWorkflow = {
  name: 'runway',
  command: 'Runway',
  aliases: ['runway'],
  description: '管理 Runway 项目路径',
  category: 'project',
  async run(args, context) {
    const result = await context.runWorkerBuiltin('Runway', args)
    return {
      exitCode: result.exitCode,
      runwayProjects: result.runwayProjects,
      message: result.exitCode === 0 ? '[runway] 已完成' : `[runway] 退出码：${result.exitCode}`,
    }
  },
}
