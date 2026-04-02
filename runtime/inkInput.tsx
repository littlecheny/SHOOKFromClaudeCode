import React, { useState } from 'react'
import { render, Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { buildContextCanvas } from './contextCanvas.js'

type InkInputProps = {
  state: any
  onSubmit: (text: string) => void
}

function InkInput({ state, onSubmit }: InkInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (value: string) => {
    onSubmit(value)
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
    width,
  })

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderLeft={false} borderRight={false} borderBottom width={contentWidth + 2} borderColor="gray">
        <Text color="white"> ❯ </Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>
      <Text dimColor color="gray">? for shortcuts</Text>
      <Text>{canvas}</Text>
    </Box>
  )
}

export function readInputWithInk(state: any): Promise<string> {
  return new Promise((resolve) => {
    let app: any
    const handleSubmit = (text: string) => {
      if (app) {
        app.unmount()
      }
      resolve(text)
    }
    app = render(<InkInput state={state} onSubmit={handleSubmit} />)
  })
}
