const FG_WHITE = '\u001B[38;5;255m'
const FG_GRAY = '\u001B[38;5;245m'
const BG_USER = '\u001B[48;5;238m'
const RESET = '\u001B[0m'

export type MsgRole = 'user' | 'assistant' | 'tool' | 'notice' | 'log'

export function classify(line: string): MsgRole {
  if (line.startsWith('shook> ')) return 'user'
  if (line.startsWith('Shook: ')) return 'assistant'
  if (line.startsWith('[tool') || line.startsWith('[tool-result]')) return 'tool'
  if (
    line.startsWith('[focus]') ||
    line.startsWith('[note]') ||
    line.startsWith('[todo]') ||
    line.startsWith('[session]') ||
    line.startsWith('[tools]') ||
    line.startsWith('[cockpit]')
  ) {
    return 'notice'
  }
  return 'log'
}

function padRight(value: string, width: number): string {
  if (value.length >= width) return value
  return `${value}${' '.repeat(width - value.length)}`
}

function renderUser(line: string, width: number): string {
  const content = line.slice('shook> '.length)
  // Use \u001B[K to clear to the end of the line, which fills the background color
  return `${BG_USER}${FG_WHITE} ❯ ${content}\u001B[K${RESET}`
}

function renderAssistant(line: string): string {
  return `${FG_WHITE}${line}${RESET}`
}

function renderNotice(line: string): string {
  return `${FG_GRAY}${line}${RESET}`
}

function renderTool(line: string): string {
  return `${FG_GRAY}${line}${RESET}`
}

export function render(lines: string[], width: number): string {
  return lines
    .map(line => {
      const role = classify(line)
      if (role === 'user') return renderUser(line, width)
      if (role === 'assistant') return renderAssistant(line)
      if (role === 'notice') return renderNotice(line)
      if (role === 'tool') return renderTool(line)
      return line
    })
    .join('\n')
}
