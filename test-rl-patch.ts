import readline from 'readline/promises';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

const canvas = `canvas1\ncanvas2\ncanvas3\ncanvas4\ncanvas5`;

const originalRefreshLine = (rl as any)._refreshLine.bind(rl);
(rl as any)._refreshLine = () => {
  originalRefreshLine();
  process.stdout.write('\x1b[s'); // Save cursor
  process.stdout.write('\n' + canvas);
  process.stdout.write('\x1b[u'); // Restore cursor
};

rl.question("❯ ").then((ans) => {
  console.log('You typed:', ans);
  rl.close();
});