import { useState } from 'react'
import SectionLabel from '../shared/SectionLabel'
import type { TodoItem } from '../../shook'

export default function TodoList({ todos }: { todos: TodoItem[] }) {
  const [draft, setDraft] = useState('')
  const open = todos.filter(todo => !todo.done)

  const submit = () => {
    const value = draft.trim()
    if (!value) return
    setDraft('')
    void window.shook.addTodo(value)
  }

  return (
    <section>
      <SectionLabel>
        Todos{open.length > 0 && <span className="ml-1 text-sponge-text">{open.length}</span>}
      </SectionLabel>
      <div className="rounded-lg border border-line bg-surface">
        {open.length > 0 && (
          <ul>
            {open.map(todo => (
              <li
                key={todo.id}
                className="group flex items-start gap-2 border-b border-line px-3 py-2 text-[13px] last:border-b-0"
              >
                <button
                  onClick={() => void window.shook.toggleTodo(todo.id)}
                  aria-label="标记完成"
                  className="mt-[3px] h-3.5 w-3.5 shrink-0 rounded-full border border-line transition-colors hover:border-sponge-4 hover:bg-sponge-1"
                />
                <span className="flex-1 leading-snug">{todo.content}</span>
                <button
                  onClick={() => void window.shook.removeTodo(todo.id)}
                  aria-label="删除"
                  className="shrink-0 text-muted opacity-0 transition-opacity hover:text-patrick-text group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') submit()
          }}
          placeholder="添加待办，回车确认"
          className="w-full border-t border-line bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-muted"
        />
      </div>
    </section>
  )
}
