import { useEffect, useState } from 'react'
import type { StatusSnapshot } from '../shook'

export function useShookState(): StatusSnapshot | null {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null)

  useEffect(() => {
    let alive = true
    void window.shook.getState().then(s => {
      if (alive) setSnapshot(s)
    })
    const unsubscribe = window.shook.onStateChanged(s => setSnapshot(s))
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  return snapshot
}
