export declare function runGetNews(options: {
  projectRoot: string
  workerClient: import('./workerClient.js').PythonWorkerClient
  modelClient: import('./modelClient.js').ModelClient
  date?: string
  dryRun?: boolean
  onLog?: (line: string) => void
}): Promise<string | null>
