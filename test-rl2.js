import readline from 'readline/promises';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
process.stdout.write("Top\n\nBottom\nHint\nCanvas1\nCanvas2\n\x1b[5A\r");
setTimeout(() => {
  rl.question("Prompt> ").then(() => rl.close());
}, 1000);