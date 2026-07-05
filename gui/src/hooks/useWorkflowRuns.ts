import { useEffect, useReducer } from 'react'
import type { WorkflowLogEvent, WorkflowStatusEvent } from '../shook'

export type RunState = {
  status: 'idle' | 'running' | 'success' | 'failed'
  runId: string | null
  logs: string[]
  lastEvent: WorkflowStatusEvent | null
}

type State = Record<string, RunState>

const EMPTY_RUN: RunState = { status: 'idle', runId: null, logs: [], lastEvent: null }
const MAX_LOG_LINES = 200

type Action =
  | { kind: 'status'; event: WorkflowStatusEvent }
  | { kind: 'log'; event: WorkflowLogEvent }

function reducer(state: State, action: Action): State {
  const name = action.event.name
  const current = state[name] ?? EMPTY_RUN
  if (action.kind === 'status') {
    const event = action.event
    return {
      ...state,
      [name]: {
        status: event.status,
        runId: event.runId,
        logs: event.status === 'running' ? [] : current.logs,
        lastEvent: event,
      },
    }
  }
  if (current.runId !== action.event.runId) return state
  return {
    ...state,
    [name]: { ...current, logs: [...current.logs, action.event.line].slice(-MAX_LOG_LINES) },
  }
}

export function useWorkflowRuns(): State {
  const [state, dispatch] = useReducer(reducer, {})

  useEffect(() => {
    const unsubStatus = window.shook.onWorkflowStatus(event => dispatch({ kind: 'status', event }))
    const unsubLog = window.shook.onWorkflowLog(event => dispatch({ kind: 'log', event }))
    return () => {
      unsubStatus()
      unsubLog()
    }
  }, [])

  return state
}
