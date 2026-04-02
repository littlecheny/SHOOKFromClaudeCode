import React from 'react';
import { render, Text } from 'ink';

const ANSI = '\x1b[31mRed\x1b[0m \x1b[1mBold\x1b[0m\nLine 2';
render(<Text>{ANSI}</Text>);
