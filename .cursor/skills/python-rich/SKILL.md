---
name: python-rich
description: Enhance Python terminal output with rich library. Use when the user needs formatted console output, tables, trees, progress bars, spinners, styled logging, or beautiful CLI displays in Python scripts.
---

# Python Rich Library Expert

**Source:** Based on the official documentation of `rich` by Will McGugan.

**Objective:** Enhance Python script output in Zsh terminals using the `rich` library. Focus on beautiful static output (tables, trees, logs) and simple dynamic displays (progress bars, status spinners).

## Core Rules

1. **Console Object:** ALWAYS instantiate a single `Console` object at the entry point.

```python
from rich.console import Console
console = Console()
```

2. **No Native Print:** Do not use Python's built-in `print()`. Use `console.print()` or `rich.print()`.

3. **Styles:** Use Rich's built-in style syntax (e.g., `[bold red]Error[/]`) instead of ANSI codes.

4. **Tables:** Use `rich.table.Table`. Always add columns before adding rows.

5. **Progress Bars:** Use the `rich.progress.Progress` context manager for tasks.

## Common Patterns

### Basic Console Output

```python
from rich.console import Console
console = Console()

# Styled text
console.print("[bold green]Success![/] Operation completed.")
console.print("[red]Error:[/] Something went wrong.", style="bold")

# Rule (horizontal line with text)
console.rule("[bold blue]Section Title")
```

### Error Logging with Exception

```python
try:
    # risky operation
    result = 1 / 0
except Exception:
    console.print_exception(show_locals=True)  # Great for debugging
```

### Tables

```python
from rich.table import Table

table = Table(title="User List")
table.add_column("ID", style="cyan", justify="right")
table.add_column("Name", style="magenta")
table.add_column("Status", style="green")

table.add_row("1", "Alice", "Active")
table.add_row("2", "Bob", "Inactive")

console.print(table)
```

### Tree View

```python
from rich.tree import Tree

tree = Tree("📁 Project")
tree.add("📄 README.md")
src = tree.add("📁 src")
src.add("📄 main.py")
src.add("📄 utils.py")

console.print(tree)
```

### Progress Bar

```python
from rich.progress import Progress
import time

with Progress() as progress:
    task = progress.add_task("[cyan]Processing...", total=100)
    while not progress.finished:
        progress.update(task, advance=1)
        time.sleep(0.02)
```

### Status Spinner

```python
from rich.console import Console
console = Console()

with console.status("[bold green]Working on it...") as status:
    # Long running operation
    time.sleep(3)
console.print("[bold green]Done!")
```

### Panel

```python
from rich.panel import Panel

console.print(Panel("This is important content", title="Notice", border_style="blue"))
```

### Logging Integration

```python
from rich.logging import RichHandler
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True)]
)

log = logging.getLogger("rich")
log.info("This is an info message")
log.warning("This is a warning")
```

## Dashboard Pattern (Read-Only)

For static, read-only dashboards, use `rich.layout.Layout`:

```python
from rich.layout import Layout
from rich.panel import Panel

layout = Layout()
layout.split_column(
    Layout(name="header", size=3),
    Layout(name="body"),
    Layout(name="footer", size=3),
)
layout["body"].split_row(
    Layout(name="left"),
    Layout(name="right"),
)

layout["header"].update(Panel("Dashboard Header"))
layout["left"].update(Panel("Left Panel"))
layout["right"].update(Panel("Right Panel"))
layout["footer"].update(Panel("Footer"))

console.print(layout)
```

## Live Display (Auto-updating)

Use `Live` context manager for auto-updating specific parts:

```python
from rich.live import Live
from rich.table import Table
import time

def generate_table() -> Table:
    table = Table()
    table.add_column("Time")
    table.add_row(str(time.time()))
    return table

with Live(generate_table(), refresh_per_second=4) as live:
    for _ in range(10):
        time.sleep(0.4)
        live.update(generate_table())
```

## Code Constraint

**Dashboard Decision:**
- If the user asks for a "dashboard" and needs **interactivity** (keyboard input, mouse clicks, navigation) → Refuse and suggest `Textual` library instead.
- If the user needs a **read-only** dashboard (display only, no interaction) → Use `rich.layout.Layout` as shown above.

## Quick Reference

| Task | Module | Key Class/Function |
|------|--------|-------------------|
| Styled output | `rich.console` | `Console.print()` |
| Tables | `rich.table` | `Table` |
| Trees | `rich.tree` | `Tree` |
| Progress | `rich.progress` | `Progress` |
| Spinners | `rich.console` | `Console.status()` |
| Panels | `rich.panel` | `Panel` |
| Layout | `rich.layout` | `Layout` |
| Live update | `rich.live` | `Live` |
| Logging | `rich.logging` | `RichHandler` |
| Exceptions | `rich.console` | `Console.print_exception()` |
