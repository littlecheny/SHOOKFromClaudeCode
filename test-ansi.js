const BG_USER = '\u001B[48;5;238m'
const RESET = '\u001B[0m'
process.stdout.write(`${BG_USER} ❯ 你好 \u001B[K${RESET}\n`)
