declare module './getNews.js' {
  import type { ModelClient } from './modelClient.js'
  import type { PythonWorkerClient } from './workerClient.js'

  export function runGetNews(options: {
    projectRoot: string
    workerClient: PythonWorkerClient
    modelClient: ModelClient
    date?: string
    dryRun?: boolean
    onLog?: (line: string) => void
  }): Promise<string | null>
}
