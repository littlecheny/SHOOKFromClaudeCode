import React, { useState } from 'react'
import { render, Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { buildContextCanvas } from './contextCanvas.js'

type InputState = {
  commandHistory?: string[]
  [key: string]: any
}

type InkInputProps = {
  state: InputState
  onSubmit: (text: string) => void
}

function InkInput({ state, onSubmit }: InkInputProps) {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [draftBeforeHistory, setDraftBeforeHistory] = useState('')
  const history = state.commandHistory ?? []

  useInput((_input, key) => {
    if (key.upArrow) {
      if (history.length === 0) return
      setHistoryIndex(previousIndex => {
        const nextIndex = previousIndex === null ? history.length - 1 : Math.max(previousIndex - 1, 0)
        if (previousIndex === null) {
          setDraftBeforeHistory(input)
        }
        setInput(history[nextIndex] ?? '')
        return nextIndex
      })
      return
    }

    if (key.downArrow) {
      setHistoryIndex(previousIndex => {
        if (previousIndex === null) return null
        const nextIndex = previousIndex + 1
        if (nextIndex >= history.length) {
          setInput(draftBeforeHistory)
          setDraftBeforeHistory('')
          return null
        }
        setInput(history[nextIndex] ?? '')
        return nextIndex
      })
    }
  })

  const handleSubmit = (value: string) => {
    onSubmit(value)
  }

  const handleChange = (value: string) => {
    setInput(value)
    if (historyIndex !== null) {
      setHistoryIndex(null)
      setDraftBeforeHistory('')
    }
  }

  const width = process.stdout.columns ?? 88
  const contentWidth = Math.max(30, Math.min(120, width - 2))
  
  const canvas = buildContextCanvas({
    handshake: state.handshake,
    transcript: state.transcript,
    notes: state.notes,
    todos: state.todos,
    focus: state.focus,
    currentSession: state.currentSession,
    toolsCount: state.tools.length,
    expanded: state.canvasExpanded,
    width,
  })

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderLeft={false} borderRight={false} borderBottom width={contentWidth + 2} borderColor="gray">
        <Text color="white"> ❯ </Text>
        <TextInput value={input} onChange={handleChange} onSubmit={handleSubmit} />
      </Box>
      <Text dimColor color="gray">? for shortcuts</Text>
      <Text>{canvas}</Text>
    </Box>
  )
}

export function readInputWithInk(state: InputState): Promise<string> {
  return new Promise((resolve) => {
    let app: any
    const handleSubmit = (text: string) => {
      if (app) {
        app.unmount()
      }
      const trimmed = text.trim()
      if (trimmed) {
        const history = state.commandHistory ?? []
        state.commandHistory = history[history.length - 1] === trimmed
          ? history
          : [...history, trimmed].slice(-100)
      }
      resolve(text)
    }
    app = render(<InkInput state={state} onSubmit={handleSubmit} />)
  })
}
