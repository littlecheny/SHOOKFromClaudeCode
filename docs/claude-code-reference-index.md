# Claude Code Reference Index (For Shook Dev)

This document is a quick lookup index for the local Claude Code source tree
under `/Users/bytedance/claude-code/`. It is meant to help Shook development in
`/Users/bytedance/claude-code/workdoc_runtime_impl/`.

## Where To Look (By Topic)

### High-Level Architecture Notes
- Local “how Claude Code is built” notes: [AGENT_ARCHITECTURE_GUIDE.md](file:///Users/bytedance/claude-code/AGENT_ARCHITECTURE_GUIDE.md)

### System Prompt / Identity / Prompt Assembly
- System identity prefix and request attribution header: [system.ts](file:///Users/bytedance/claude-code/src/constants/system.ts)
- Prompt assembly (system prompt “lego” approach): [prompts.ts](file:///Users/bytedance/claude-code/src/constants/prompts.ts)

### Terminal UI (Input + Message Rendering)
- Prompt input component (behavior, key handling, layout): [PromptInput.tsx](file:///Users/bytedance/claude-code/src/components/PromptInput/PromptInput.tsx)
- Message list and rendering decisions: [Messages.tsx](file:///Users/bytedance/claude-code/src/components/Messages.tsx)
- Text input primitive and key handling hooks: [TextInput.tsx](file:///Users/bytedance/claude-code/src/components/TextInput.tsx)
- Output styles (why different output “modes” look different): [outputStyles.ts](file:///Users/bytedance/claude-code/src/constants/outputStyles.ts)
- Ink internals (layout/term parser/renderer): [src/ink](file:///Users/bytedance/claude-code/src/ink)

### Retry / Resilience (Industrial-Grade)
- Full-feature retry loop (errors, backoff, 401 handling, 429/529 policy): [withRetry.ts](file:///Users/bytedance/claude-code/src/services/api/withRetry.ts)

### MCP (Tools/Commands/Resources via Protocol)
- MCP client core (connect, cache, reconnection, large output handling): [client.ts](file:///Users/bytedance/claude-code/src/services/mcp/client.ts)

### Query Engine / Event Streaming
- Central query loop: [query.ts](file:///Users/bytedance/claude-code/src/query.ts)
- Query orchestration (UI consumes events): [QueryEngine.ts](file:///Users/bytedance/claude-code/src/QueryEngine.ts)
- Token budgeting: [tokenBudget.ts](file:///Users/bytedance/claude-code/src/query/tokenBudget.ts)

### Tools / Permissions / Safety
- Tool interface + shared fields: [Tool.ts](file:///Users/bytedance/claude-code/src/Tool.ts)
- Built-in tool implementations: [src/tools](file:///Users/bytedance/claude-code/src/tools)
- Permission types: [permissions.ts](file:///Users/bytedance/claude-code/src/types/permissions.ts)
- Tool invocation shaping / collapse heuristics: [groupToolUses.ts](file:///Users/bytedance/claude-code/src/utils/groupToolUses.ts)

### Sessions / History / Restore
- Session storage primitives: [sessionStorage.ts](file:///Users/bytedance/claude-code/src/utils/sessionStorage.ts)
- Session restore: [sessionRestore.ts](file:///Users/bytedance/claude-code/src/utils/sessionRestore.ts)

### CLI Command Routing
- Command definitions: [commands.ts](file:///Users/bytedance/claude-code/src/commands.ts)
- Built-in commands tree: [src/commands](file:///Users/bytedance/claude-code/src/commands)
- CLI handlers: [src/cli/handlers](file:///Users/bytedance/claude-code/src/cli/handlers)

### Skills (Plugin-Like Behaviors)
- Skills entry: [src/skills](file:///Users/bytedance/claude-code/src/skills)
- Skill command: [commands/skills](file:///Users/bytedance/claude-code/src/commands/skills)

## “If You Want X, Go Here”
- “How does Claude Code decide its identity / prefix?” -> [getCLISyspromptPrefix](file:///Users/bytedance/claude-code/src/constants/system.ts#L30-L46)
- “How does it build a big system prompt from multiple sections?” -> [prompts.ts](file:///Users/bytedance/claude-code/src/constants/prompts.ts)
- “How does it implement the input box / key handling?” -> [PromptInput.tsx](file:///Users/bytedance/claude-code/src/components/PromptInput/PromptInput.tsx)
- “How does it render user/assistant messages?” -> [Messages.tsx](file:///Users/bytedance/claude-code/src/components/Messages.tsx)
- “How does it do robust retry and avoid infinite 401 loops?” -> [withRetry.ts](file:///Users/bytedance/claude-code/src/services/api/withRetry.ts)
- “How does it do MCP connection + tool discovery + reconnect?” -> [client.ts](file:///Users/bytedance/claude-code/src/services/mcp/client.ts)
- “Where are built-in tools defined?” -> [src/tools](file:///Users/bytedance/claude-code/src/tools)
- “Where is the event-streaming query loop?” -> [QueryEngine.ts](file:///Users/bytedance/claude-code/src/QueryEngine.ts)

## Notes For Shook
- Shook’s editable todo/focus file: [todos.json](file:///Users/bytedance/claude-code/workdoc_runtime_impl/.shook/todos.json)
- Shook runtime entry: [cli.ts](file:///Users/bytedance/claude-code/workdoc_runtime_impl/runtime/cli.ts)
- Shook canvas rendering: [contextCanvas.ts](file:///Users/bytedance/claude-code/workdoc_runtime_impl/runtime/contextCanvas.ts)

## Next Index Expansion (If You Want)
- Model/tool calling and schema validation (Zod) patterns
- Permission gating/sandbox patterns
- Session persistence / history management patterns
