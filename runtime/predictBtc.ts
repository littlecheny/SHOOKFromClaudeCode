import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PythonWorkerClient } from './workerClient.js'
import { ModelClient } from './modelClient.js'

type PredictBtcOptions = {
  projectRoot: string
  outputDir?: string
  workerClient: PythonWorkerClient
  modelClient: ModelClient
  onLog?: (line: string) => void
}

type ToolData = Record<string, unknown>

function timestampId(): string {
  const now = new Date()
  const part = (value: number): string => String(value).padStart(2, '0')
  return `${now.getFullYear()}${part(now.getMonth() + 1)}${part(now.getDate())}_${part(now.getHours())}${part(now.getMinutes())}${part(now.getSeconds())}`
}

async function callToolData(workerClient: PythonWorkerClient, tool: string, args: Record<string, unknown>): Promise<ToolData> {
  const result = await workerClient.callTool(tool, args) as { success?: boolean; data?: ToolData; error?: string }
  if (!result?.success) {
    throw new Error(result?.error ?? `工具执行失败: ${tool}`)
  }
  return result.data ?? {}
}

function buildPrompt(payload: Record<string, unknown>): string {
  return [
    '你是一个资深加密市场分析师，请基于以下结构化市场数据生成一份 BTC 市场简报。',
    '要求：',
    '1. 用中文输出 Markdown',
    '2. 先给出市场结论，再解释依据',
    '3. 明确区分宏观、市场情绪、链上/资金面、交易层信号',
    '4. 给出未来 24 小时与未来 7 天的关注要点',
    '5. 不要编造数据；只依据提供的 JSON',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n')
}

export async function runPredictBtc(options: PredictBtcOptions): Promise<string> {
  const { projectRoot, workerClient, modelClient, outputDir, onLog } = options
  const baseOutputDir = outputDir ? join(projectRoot, outputDir) : join(projectRoot, 'reports', 'btc_predict')
  await mkdir(baseOutputDir, { recursive: true })
  const stamp = timestampId()

  onLog?.('[predict-btc] 拉取市场数据')
  const [dxy, nasdaq, fearGreed, stablecoin, fundingRate, spot, futures, farside] = await Promise.all([
    callToolData(workerClient, 'get_dxy', { period: '1mo', interval: '1d' }),
    callToolData(workerClient, 'get_nasdaq', { period: '1mo', interval: '1d' }),
    callToolData(workerClient, 'get_fear_greed', { limit: 30 }),
    callToolData(workerClient, 'get_stablecoin', { days: 14 }),
    callToolData(workerClient, 'get_okx_funding_rate', {}),
    callToolData(workerClient, 'get_okx_spot_price', {}),
    callToolData(workerClient, 'get_okx_futures_price', {}),
    callToolData(workerClient, 'farside_btc_screenshot', { output_path: join(baseOutputDir, `farside_btc_${stamp}.png`) }),
  ])

  onLog?.('[predict-btc] 生成图表')
  const [dxyDashboard, nasdaqDashboard, fearGreedDashboard, stablecoinDashboard, fundingDashboard, spotDashboard, futuresDashboard] = await Promise.all([
    callToolData(workerClient, 'generate_dxy_dashboard', { output_path: join(baseOutputDir, `dxy_${stamp}.html`) }),
    callToolData(workerClient, 'generate_nasdaq_dashboard', { output_path: join(baseOutputDir, `nasdaq_${stamp}.html`) }),
    callToolData(workerClient, 'generate_fear_greed_dashboard', { output_path: join(baseOutputDir, `fear_greed_${stamp}.html`) }),
    callToolData(workerClient, 'generate_stablecoin_dashboard', { output_path: join(baseOutputDir, `stablecoin_${stamp}.html`) }),
    callToolData(workerClient, 'generate_okx_funding_rate_dashboard', { output_path: join(baseOutputDir, `funding_${stamp}.html`) }),
    callToolData(workerClient, 'generate_okx_spot_dashboard', { output_path: join(baseOutputDir, `spot_${stamp}.html`) }),
    callToolData(workerClient, 'generate_okx_futures_dashboard', { output_path: join(baseOutputDir, `futures_${stamp}.html`) }),
  ])

  onLog?.('[predict-btc] 调用主模型生成研判')
  const modelResult = await modelClient.complete([
    { role: 'system', content: '你是一名谨慎、结构化的加密市场分析师。' },
    {
      role: 'user',
      content: buildPrompt({
        generated_at: new Date().toISOString(),
        dxy,
        nasdaq,
        fear_greed: fearGreed,
        stablecoin,
        okx_funding_rate: fundingRate,
        okx_spot: spot,
        okx_futures: futures,
        farside_btc: farside,
        dashboards: {
          dxy: dxyDashboard.output_path,
          nasdaq: nasdaqDashboard.output_path,
          fear_greed: fearGreedDashboard.output_path,
          stablecoin: stablecoinDashboard.output_path,
          funding: fundingDashboard.output_path,
          spot: spotDashboard.output_path,
          futures: futuresDashboard.output_path,
        },
      }),
    },
  ], [])

  const reportPath = join(baseOutputDir, `btc_predict_${stamp}.md`)
  await writeFile(reportPath, modelResult.content || '# BTC 市场简报\n\n（模型未返回内容）\n', 'utf8')
  onLog?.(`[predict-btc] 已生成报告：${reportPath}`)
  return reportPath
}
