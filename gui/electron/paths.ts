import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 打包产物位于 gui/out/main/index.js，上三级即 workdoc_runtime_impl 项目根。
export const PROJECT_ROOT =
  process.env.SHOOK_PROJECT_ROOT ??
  resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export const SHOOK_DIR = join(PROJECT_ROOT, '.shook')
export const RUNTIME_DIST = join(PROJECT_ROOT, 'dist', 'runtime')
