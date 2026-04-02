---
name: prompt-toolkit
description: Build interactive command-line interfaces (REPLs) using python-prompt-toolkit. Use when creating CLI applications with autocompletion, key bindings, input validation, or when the user mentions PTK, PromptSession, or interactive prompts.
---

# Prompt Toolkit (PTK) Specialist

Based on the official architecture of `python-prompt-toolkit` by Jonathan Slenders.

## Key Components

### 1. PromptSession

The core entry point. Do NOT use the legacy `prompt()` function directly for complex apps; use `PromptSession()` to persist history.

```python
from prompt_toolkit import PromptSession

session = PromptSession()
text = session.prompt('> ')
```

### 2. Completer

Use `WordCompleter` for simple lists, or inherit from `Completer` for custom logic.

*Must implement:* `get_completions(document, complete_event)`

```python
from prompt_toolkit.completion import Completer, Completion

class MyCompleter(Completer):
    def get_completions(self, document, complete_event):
        word = document.get_word_before_cursor()
        for item in ['option1', 'option2', 'option3']:
            if item.startswith(word):
                yield Completion(item, start_position=-len(word))
```

### 3. Key Bindings

Use the `@kb.add` decorator pattern.

```python
from prompt_toolkit.key_binding import KeyBindings

kb = KeyBindings()

@kb.add('c-q')
def _(event):
    event.app.exit()

@kb.add('c-c')
def _(event):
    event.app.exit(result=None)
```

## Styling

Use `Style.from_dict` to map token names to colors. PTK uses a specific XML-like formatting for prompt text.

```python
from prompt_toolkit.styles import Style
from prompt_toolkit import HTML

style = Style.from_dict({
    'prompt': '#00aa00 bold',
    'command': '#884444',
})

session = PromptSession(style=style)
text = session.prompt(HTML('<b><style class="prompt">&gt; </style></b>'))
```

## Async Compatibility

For `asyncio` integration, use `prompt_async()` and run inside an async loop.

```python
import asyncio
from prompt_toolkit import PromptSession

async def main():
    session = PromptSession()
    while True:
        text = await session.prompt_async('> ')
        print(f'You said: {text}')

asyncio.run(main())
```

## Complete Example

```python
from prompt_toolkit import PromptSession, HTML
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.styles import Style

# Setup
kb = KeyBindings()
completer = WordCompleter(['help', 'exit', 'status', 'run'])
style = Style.from_dict({'prompt': 'ansicyan bold'})

@kb.add('c-q')
def exit_handler(event):
    event.app.exit()

session = PromptSession(
    completer=completer,
    key_bindings=kb,
    style=style,
)

# Main loop
while True:
    try:
        text = session.prompt(HTML('<prompt>&gt; </prompt>'))
        if text.strip() == 'exit':
            break
        print(f'Command: {text}')
    except (EOFError, KeyboardInterrupt):
        break
```

## Anti-Hallucination Rule

**Do NOT mix `urwid` or `curses` methods into PTK code.** PTK handles its own rendering loop independently.
