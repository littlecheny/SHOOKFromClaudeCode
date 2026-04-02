const top = `top`;
const bottom = `bottom`;
const hint = `hint`;
const frame = `${top}\n\n${bottom}\n${hint}`;
const canvas = `canvas1\ncanvas2\ncanvas3\ncanvas4\ncanvas5`;

process.stdout.write(`${frame}\n${canvas}\n`);
process.stdout.write(`\x1b[8A\r`);
// simulate readline clear screen down and print prompt
process.stdout.write(`\x1b[0J❯ `);