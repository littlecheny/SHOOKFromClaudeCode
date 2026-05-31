import { runGetNews } from '../newsWorkflow.js'
import type { ShookWorkflow } from './types.js'

export const getNewsWorkflow: ShookWorkflow = {
  name: 'get-news',
  command: 'getNews',
  aliases: ['get-news'],
  description: '生成每日新闻简报',
  category: 'daily',
  async run(args, context) {
    const dateArgIndex = args.findIndex(arg => arg === '--date')
    const date = dateArgIndex >= 0 ? (args[dateArgIndex + 1] ?? undefined) : undefined
    const reportPath = await runGetNews({
      projectRoot: context.projectRoot,
      workerClient: context.workerClient,
      modelClient: context.modelClient,
      date,
      onLog: context.onLog,
    })

    return {
      exitCode: 0,
      outputPath: reportPath ?? undefined,
      message: reportPath ? `[get-news] 报告已生成：${reportPath}` : '[get-news] 已完成',
    }
  },
}
