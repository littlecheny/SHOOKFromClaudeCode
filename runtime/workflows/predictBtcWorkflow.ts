import { runPredictBtc } from '../predictBtc.js'
import type { ShookWorkflow } from './types.js'

export const predictBtcWorkflow: ShookWorkflow = {
  name: 'predict-btc',
  command: 'predict_btc',
  aliases: ['predict-btc'],
  description: '生成 BTC 市场预测看板和简报',
  category: 'finance',
  async run(args, context) {
    const outputDirArgIndex = args.findIndex(arg => arg === '--output-dir')
    const outputDir = outputDirArgIndex >= 0 ? (args[outputDirArgIndex + 1] ?? '') : ''
    const reportPath = await runPredictBtc({
      projectRoot: context.projectRoot,
      outputDir,
      workerClient: context.workerClient,
      modelClient: context.modelClient,
      onLog: context.onLog,
    })

    return {
      exitCode: 0,
      outputPath: reportPath,
      message: `[predict-btc] 报告已生成：${reportPath}`,
    }
  },
}
