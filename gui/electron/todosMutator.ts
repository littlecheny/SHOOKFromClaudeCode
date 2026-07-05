import { PROJECT_ROOT } from './paths.js'
import type { RuntimeModules, TodoItem, TodosFile } from './runtime.types.js'

// 复刻 cli.js /todo、/focus 的读-改-写语义：每次改动都基于最新的 todos.json 重新加载，
// 避免覆盖用户或 TUI 并发写入的内容。单用户本地工具，不做乐观锁。

async function loadOrDefault(runtime: RuntimeModules): Promise<TodosFile> {
  const file = await runtime.statePersistence.loadTodosFile(PROJECT_ROOT)
  return file ?? { focus: null, todos: [] }
}

async function persist(
  runtime: RuntimeModules,
  next: { focus: string | null; todos: TodoItem[] },
): Promise<void> {
  await runtime.statePersistence.saveTodosFile(PROJECT_ROOT, next)
}

export async function setFocus(runtime: RuntimeModules, focus: string | null): Promise<void> {
  const current = await loadOrDefault(runtime)
  await persist(runtime, { focus: focus?.trim() ? focus.trim() : null, todos: current.todos })
}

export async function addTodo(runtime: RuntimeModules, content: string): Promise<void> {
  const value = content.trim()
  if (!value) return
  const current = await loadOrDefault(runtime)
  const todo: TodoItem = { id: Date.now(), content: value, done: false, createdAt: new Date().toISOString() }
  await persist(runtime, { focus: current.focus, todos: [...current.todos, todo] })
}

export async function toggleTodo(runtime: RuntimeModules, id: number): Promise<void> {
  const current = await loadOrDefault(runtime)
  const todos = current.todos.map(todo => {
    if (todo.id !== id) return todo
    const done = !todo.done
    return { ...todo, done, completedAt: done ? new Date().toISOString() : undefined }
  })
  await persist(runtime, { focus: current.focus, todos })
}

export async function removeTodo(runtime: RuntimeModules, id: number): Promise<void> {
  const current = await loadOrDefault(runtime)
  await persist(runtime, { focus: current.focus, todos: current.todos.filter(todo => todo.id !== id) })
}
