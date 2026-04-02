const FG_GRAY = '\u001B[38;5;245m'
const FG_WHITE = '\u001B[38;5;255m'
const RESET = '\u001B[0m'
const DIM = '\u001B[2m'

export function buildInputChrome(width: number): { frame: string; prompt: string; lineCount: number } {
  const contentWidth = Math.max(30, Math.min(120, width - 2))
  const top = `${FG_GRAY}${'─'.repeat(contentWidth)}${RESET}`
  const bottom = `${FG_GRAY}${'─'.repeat(contentWidth)}${RESET}`
  const hint = `${DIM}${FG_GRAY}? for shortcuts${RESET}`
  const frame = `${top}\n\n${bottom}\n${hint}`
  const prompt = `${FG_WHITE} ❯ ${RESET}`
  return { frame, prompt, lineCount: 4 }
}

export function cursorUpCount(extraLinesBelowPrompt: number): number {
  return extraLinesBelowPrompt + 3
}
