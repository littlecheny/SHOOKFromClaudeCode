import { app, BrowserWindow } from 'electron'
import { PROJECT_ROOT } from './paths.js'
import { loadRuntime } from './runtimeLoader.js'
import { createPanelWindow } from './window.js'
import { createTray, setTrayBusy, showWindowUnderTray } from './tray.js'
import { registerIpc, pushState } from './ipc.js'
import { startStateWatcher } from './stateWatcher.js'
import type { PythonWorkerClientLike, RuntimeModules } from './runtime.types.js'
import type { RunnerDeps } from './workflowRunner.js'

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let win: BrowserWindow | null = null
let workerClient: PythonWorkerClientLike | null = null

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }

  const runtime: RuntimeModules = await loadRuntime()
  const { PythonWorkerClient } = runtime.workerClient
  const { ModelClient } = runtime.modelClient
  workerClient = new PythonWorkerClient(PROJECT_ROOT)
  const modelClient = new ModelClient()

  win = createPanelWindow()
  createTray(win)

  const send = (channel: string, payload: unknown) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
  }

  const runnerDeps: RunnerDeps = {
    runtime,
    getWorkerClient: () => workerClient!,
    resetWorkerClient: () => {
      workerClient = new PythonWorkerClient(PROJECT_ROOT)
      return workerClient
    },
    modelClient,
    send,
    onRunFinished: () => {
      if (win) void pushState(runtime, win)
    },
    setBusyIndicator: setTrayBusy,
    showWindow: () => {
      if (win) showWindowUnderTray(win)
    },
  }

  registerIpc(runtime, win, runnerDeps)
  startStateWatcher(() => {
    if (win) void pushState(runtime, win)
  })

  // dev 模式启动即弹窗，便于调试
  if (process.env.ELECTRON_RENDERER_URL) {
    win.webContents.once('did-finish-load', () => {
      if (win) showWindowUnderTray(win)
    })
  }

  app.on('second-instance', () => {
    if (win) showWindowUnderTray(win)
  })
})

app.on('window-all-closed', () => {
  // 菜单栏 App：窗口关闭不退出
})

app.on('before-quit', async () => {
  try {
    await workerClient?.close()
  } catch {
    // worker 已退出时忽略
  }
})
