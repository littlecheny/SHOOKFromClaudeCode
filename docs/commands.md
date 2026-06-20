# Shook Commands

This document lists the commands currently supported by Shook.

## Fixed Workflows

| Command | Description |
| --- | --- |
| `/get-news [--date YYYY-MM-DD]` | Fetch RSS/Atom candidates and generate a local news report at `reports/YYYY-MM-DD.md`. It does not commit or push. |
| `/predict-btc [--output-dir PATH]` | Generate a BTC market prediction report and dashboards. |
| `/runway add --name NAME --path PATH` | Add a Runway project path. |
| `/runway delete --name NAME` | Delete a Runway project path. |
| `/runway list` | List configured Runway projects. |
| `/cockpit draft [TEXT]` | Enter draft mode. If `TEXT` is provided, draft it immediately. |
| `/cockpit compress [TEXT]` | Enter compress mode. If `TEXT` is provided, compress it immediately. |
| `/cockpit polish [TEXT]` | Enter polish mode. If `TEXT` is provided, polish it immediately. |
| `/cockpit off` | Exit Cockpit mode. |

## Canvas And State

| Command | Description |
| --- | --- |
| `/focus set TEXT` | Set the current focus. |
| `/focus clear` | Clear the current focus. |
| `/note add TEXT` | Add a working-memory note. |
| `/note list` | List working-memory notes. |
| `/note clear` | Clear working-memory notes. |
| `/todo add TEXT` | Add a todo item. |
| `/todo list` | List todo items. |
| `/todo done N` | Mark todo item `N` as done. |
| `/todo undo N` | Mark todo item `N` as open again. |
| `/todo rm N` | Remove todo item `N`. |
| `/save [NAME]` | Save the current session snapshot. If `NAME` is omitted, Shook generates one. |
| `/load NAME` | Load a saved session snapshot. |
| `/sessions` | List saved sessions. |
| `/new` | Start a fresh session by clearing transcript, notes, todos, focus, and mode. |
| `/canvas refresh` | Refresh the canvas. It reloads `focus` and `todos` from `.shook/todos.json` when available. |
| `/refresh` | Alias for `/canvas refresh`. |
| `/detail` | Toggle expanded/collapsed canvas mode. |
| `/toggle` | Alias for `/detail`. |

## Tools And Runtime

| Command | Description |
| --- | --- |
| `/tools` | List loaded Python tools. |
| `/tools refresh` | Reload Python tools. |
| `/help` | Show help. |
| `/?` | Alias for `/help`. |
| `/exit` | Exit Shook. |
| `/quit` | Alias for `/exit`. |
| `/q` | Alias for `/exit`. |
| `!<command>` | Execute a shell command with `zsh -lc`, for example `!pwd`. |

## Plain Text

Plain text enters the natural-language agent loop. If Cockpit mode is active, plain text is transformed according to the current Cockpit mode.
