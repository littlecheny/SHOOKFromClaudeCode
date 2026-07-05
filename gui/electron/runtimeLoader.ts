import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROJECT_ROOT, RUNTIME_DIST } from './paths.js'
import type { RuntimeModules } from './runtime.types.js'

// 复刻 dist/runtime/cli.js 的 loadEnvFile：只设置未定义的 key，支持引号包裹的值。
export async function loadEnvFile(projectRoot: string): Promise<void> {
  let content = ''
  try {
    content = await readFile(join(projectRoot, '.env'), 'utf8')
  } catch {
    return
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim()
    if (!key || process.env[key]) continue
    let value = line.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

const moduleUrl = (relPath: string) => pathToFileURL(join(RUNTIME_DIST, relPath)).href

let cached: RuntimeModules | null = null

export async function loadRuntime(): Promise<RuntimeModules> {
  if (cached) return cached
  await loadEnvFile(PROJECT_ROOT)
  // 动态 import 编译产物，路径为运行期变量，bundler 不会追踪打包。
  // 禁止 import cli.js / inkInput.js（Ink/TUI 耦合）。
  const [registry, statePersistence, workerClient, modelClient] = await Promise.all([
    import(/* @vite-ignore */ moduleUrl('workflows/registry.js')),
    import(/* @vite-ignore */ moduleUrl('statePersistence.js')),
    import(/* @vite-ignore */ moduleUrl('workerClient.js')),
    import(/* @vite-ignore */ moduleUrl('modelClient.js')),
  ])
  cached = { registry, statePersistence, workerClient, modelClient } as RuntimeModules
  return cached
}
