/**
 * 封装带有指数退避 (Exponential Backoff) 的重试逻辑。
 * 遵循 Claude Code 的韧性工程实践，对 API 请求进行容错处理。
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
    onRetry?: (error: Error, attempt: number) => void
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3
  const baseDelayMs = options.baseDelayMs ?? 1000
  const maxDelayMs = options.maxDelayMs ?? 10000

  let attempt = 0

  while (true) {
    try {
      return await operation()
    } catch (error) {
      attempt++

      // 不要重试致命错误，比如认证失败 (401) 或无权限 (403)
      if (error instanceof Error) {
        const message = error.message.toLowerCase()
        if (message.includes('401') || message.includes('unauthorized')) {
          throw new Error(`认证失败 (401): 请检查 API Key 是否正确配置。原始错误: ${error.message}`)
        }
        if (message.includes('403') || message.includes('forbidden')) {
          throw new Error(`无权限访问 (403): ${error.message}`)
        }
      }

      if (attempt > maxRetries) {
        throw new Error(`操作失败，已重试 ${maxRetries} 次。最后一次错误: ${(error as Error).message}`)
      }

      if (options.onRetry) {
        options.onRetry(error as Error, attempt)
      }

      // 指数退避，带 jitter (抖动)
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      const jitter = Math.random() * 0.2 * delay // +/- 10% jitter
      const finalDelay = delay + jitter

      await new Promise(resolve => setTimeout(resolve, finalDelay))
    }
  }
}