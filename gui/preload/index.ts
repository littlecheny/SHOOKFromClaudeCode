import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

type Listener<T> = (payload: T) => void

function subscribe<T>(channel: string, callback: Listener<T>): () => void {
  const handler = (_event: IpcRendererEvent, payload: T) => callback(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api = {
  getState: () => ipcRenderer.invoke('state:get'),
  getLifeWeeks: () => ipcRenderer.invoke('lifeweeks:get'),
  listWorkflows: () => ipcRenderer.invoke('workflow:list'),
  runWorkflow: (name: string) => ipcRenderer.invoke('workflow:run', { name }),
  openPath: (path: string) => ipcRenderer.invoke('open:path', { path }),
  setFocus: (focus: string | null) => ipcRenderer.invoke('state:setFocus', { focus }),
  addTodo: (content: string) => ipcRenderer.invoke('state:addTodo', { content }),
  toggleTodo: (id: number) => ipcRenderer.invoke('state:toggleTodo', { id }),
  removeTodo: (id: number) => ipcRenderer.invoke('state:removeTodo', { id }),
  onStateChanged: (cb: Listener<unknown>) => subscribe('state:changed', cb),
  onWorkflowLog: (cb: Listener<unknown>) => subscribe('workflow:log', cb),
  onWorkflowStatus: (cb: Listener<unknown>) => subscribe('workflow:status', cb),
  onNavigate: (cb: Listener<string>) => subscribe('ui:navigate', cb),
}

contextBridge.exposeInMainWorld('shook', api)

export type ShookApi = typeof api
