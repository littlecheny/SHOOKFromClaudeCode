import { useEffect, useRef, useState } from 'react'
import SectionLabel from '../shared/SectionLabel'

export default function FocusCard({ focus }: { focus: string | null }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(focus ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(focus ?? '')
  }, [focus, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (next !== (focus ?? '')) {
      void window.shook.setFocus(next || null)
    }
  }

  return (
    <section>
      <SectionLabel>Focus</SectionLabel>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={event => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') {
              setDraft(focus ?? '')
              setEditing(false)
            }
          }}
          placeholder="这周想推进什么？"
          className="w-full border-b border-line bg-transparent font-display text-[17px] leading-snug outline-none placeholder:text-muted"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="block w-full text-left font-display text-[17px] leading-snug"
        >
          {focus ? focus : <span className="text-[13px] text-muted">点击设置本周 focus</span>}
        </button>
      )}
    </section>
  )
}
