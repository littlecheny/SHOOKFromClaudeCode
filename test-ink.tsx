import React from 'react';
import { render, Box, Text } from 'ink';

function Test() {
  return (
    <Box flexDirection="column">
      <Box backgroundColor="gray" width={80}>
        <Text>❯ prompt text</Text>
      </Box>
      <Box borderStyle="round" borderLeft={false} borderRight={false} borderBottom width={80}>
        <Text>❯ </Text>
      </Box>
    </Box>
  );
}

render(<Test />);