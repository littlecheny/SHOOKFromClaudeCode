import readline from 'readline/promises';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

const top = `top`;
const bottom = `bottom`;
const hint = `hint`;
const frame = `${top}\n\n${bottom}\n${hint}`;
const canvas = `canvas1\ncanvas2\ncanvas3\ncanvas4\ncanvas5`;

process.stdout.write(`${frame}\n\n${canvas}\n`);
process.stdout.write(`\x1b[8A\r`);

setTimeout(() => {
  rl.question("❯ ").then(() => rl.close());
}, 500);