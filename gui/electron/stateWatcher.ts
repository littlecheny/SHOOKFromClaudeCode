import { watch, type FSWatcher } from 'node:fs'
import { SHOOK_DIR } from './paths.js'

const WATCHED_FILES = new Set(['todos.json', 'workflows.json', 'latest.json'])
const DEBOUNCE_MS = 200

// 监听 .shook 目录本身：runtime 以 rename/替换方式重写文件，
// 目录级 watch 在文件被替换后仍然有效。
export function startStateWatcher(onChange: () => void): FSWatcher {
  let timer: NodeJS.Timeout | null = null
  const watcher = watch(SHOOK_DIR, (_event, filename) => {
    if (filename && !WATCHED_FILES.has(filename)) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      onChange()
    }, DEBOUNCE_MS)
  })
  watcher.on('error', () => {
    // 目录暂不可读时静默；下一次 push 由 workflow 完成事件兜底。
  })
  return watcher
}
