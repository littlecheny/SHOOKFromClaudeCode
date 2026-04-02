import readline from 'readline/promises';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
process.stdout.write("Top\n\nBottom\nHint\nCanvas1\nCanvas2\n\x1b[5A\r");
rl.question("Prompt> ").then(() => rl.close());