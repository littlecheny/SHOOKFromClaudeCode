import { ipcMain, shell, type BrowserWindow } from 'electron'
import { MockCommitSource, buildLifeWeeksData, type LifeWeeksData } from './lifeWeeks.js'
import { readStatusSnapshot } from './stateReader.js'
import { runWorkflow, type RunnerDeps } from './workflowRunner.js'
import { addTodo, removeTodo, setFocus, toggleTodo } from './todosMutator.js'
import type { RuntimeModules } from './runtime.types.js'

// GUI 只暴露这两个固定工作流；registry 里的 runway/cockpit/goal 是 TUI 交互式的。
const WORKFLOW_ALLOWLIST = new Set(['get-news', 'predict-btc'])

const lifeCommitSource = new MockCommitSource()
let lifeWeeksCache: LifeWeeksData | null = null

export function registerIpc(runtime: RuntimeModules, win: BrowserWindow, runnerDeps: RunnerDeps): void {
  ipcMain.handle('state:get', () => readStatusSnapshot(runtime))

  ipcMain.handle('lifeweeks:get', async () => {
    lifeWeeksCache ??= await buildLifeWeeksData(lifeCommitSource)
    return lifeWeeksCache
  })

  ipcMain.handle('workflow:list', () =>
    runtime.registry
      .listWorkflows()
      .filter(w => WORKFLOW_ALLOWLIST.has(w.name))
      .map(w => ({ name: w.name, description: w.description, category: w.category })),
  )

  ipcMain.handle('workflow:run', (_event, { name }: { name: string }) => runWorkflow(runnerDeps, name))

  ipcMain.handle('open:path', (_event, { path }: { path: string }) => shell.openPath(path))

  // Focus/Todos 直接可写：每次改动读-改-写 todos.json，然后立即推送新快照，
  // 不等待 fs.watch 的防抖周期。
  const mutate = (fn: () => Promise<void>) => async () => {
    await fn()
    await pushState(runtime, win)
    return readStatusSnapshot(runtime)
  }

  ipcMain.handle('state:setFocus', (_event, { focus }: { focus: string | null }) =>
    mutate(() => setFocus(runtime, focus))(),
  )
  ipcMain.handle('state:addTodo', (_event, { content }: { content: string }) =>
    mutate(() => addTodo(runtime, content))(),
  )
  ipcMain.handle('state:toggleTodo', (_event, { id }: { id: number }) =>
    mutate(() => toggleTodo(runtime, id))(),
  )
  ipcMain.handle('state:removeTodo', (_event, { id }: { id: number }) =>
    mutate(() => removeTodo(runtime, id))(),
  )
}

export async function pushState(runtime: RuntimeModules, win: BrowserWindow): Promise<void> {
  if (win.isDestroyed()) return
  const snapshot = await readStatusSnapshot(runtime)
  win.webContents.send('state:changed', snapshot)
}
