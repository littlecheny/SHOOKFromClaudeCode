import React, { useState } from 'react';
import { render, Box, Text, useInput } from 'ink';

function App({ onSubmit }) {
  const [input, setInput] = useState('');
  
  useInput((char, key) => {
    if (key.return) {
      onSubmit(input);
      return;
    }
    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }
    setInput(prev => prev + char);
  });

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderLeft={false} borderRight={false} borderBottom width={80}>
        <Text>❯ {input}</Text>
      </Box>
      <Text>Canvas line 1</Text>
      <Text>Canvas line 2</Text>
    </Box>
  );
}

let app;
function loop() {
  app = render(<App onSubmit={(text) => {
    app.unmount();
    console.log(`You typed: ${text}`);
    if (text !== 'exit') loop();
  }} />);
}
loop();
