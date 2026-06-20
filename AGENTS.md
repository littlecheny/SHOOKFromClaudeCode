# Shook Development Rules

本仓库是 Shook 个人 Agent 管家。开发时以当前代码为真源，不要按过期 README 假设架构。

## 定位

- Shook 是个人 Agent 管家，不是 Claude Code / Codex 平替。
- 固定、重复、需要状态和 UI 的工作流安装到 Shook。
- 一次性探索和复杂代码任务交给 Codex / Claude Code。
- UI 是核心产品能力，不能当作无关装饰随意移除。
- Shook 不是通用 coding agent，不要投入 repo-wide editing、sandboxing 或 permission UX。

## Build & Validate

```bash
npm install                        # install TS dependencies
pip install -r requirements.txt    # install Python dependencies
npm run build                      # compile TS → dist/
npm run typecheck                  # type-check without emitting (same as lint)
```

There is no test suite. Validation is `npm run typecheck`.

## Run

```bash
./shook                            # interactive REPL
./shook --exec "/get-news"         # run a single workflow then exit
SHOOK_SKIP_ANIM=1 ./shook --no-banner  # skip startup animation
```

## Environment

Copy `env.example.txt` to `.env`. Key variables:

- `LLM_PROVIDER` — `aicoding|openai|gemini|claude|kimi`
- Provider API keys: `AICODING_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `KIMI_API_KEY`
- `SHOOK_PYTHON` — override the Python interpreter for the worker

## 架构

Three-layer design: **TS runtime → Python worker → Python tools**.

```
./shook  →  runtime/cli.ts (entry, REPL, UI, state loading)
                │
                ├── runtime/queryLoop.ts      — NL agent loop (max 5 tool iterations, 24-line sliding window)
                ├── runtime/modelClient.ts    — multi-provider model adapter (Anthropic/Gemini/Kimi/AICoding)
                ├── runtime/workflows/        — fixed workflows registered via registry.ts
                ├── runtime/statePersistence.ts — .shook/ state read/write
                └── runtime/workerClient.ts   — JSON-over-stdio bridge to Python
                        │
                        v
                scripts/shook_worker.py       — Python worker process
                        │
                        v
                langgraph/tools/              — Python tool assets (BaseTool + ToolRegistry)
```

### TS runtime (主控层)

- `runtime/cli.ts` — command parsing, interactive loop, state loading, Python worker lifecycle.
- `runtime/workflows/registry.ts` — maps slash commands to `ShookWorkflow` implementations. Each workflow implements `run(args, context) → WorkflowResult`.
- `runtime/queryLoop.ts` — NL input → system prompt + history → model call → tool execution loop → response. Yields `QueryEvent` items (text / tool_start / tool_result / tool_policy / error).
- `runtime/protocol.ts` — shared types for the TS↔Python JSON wire protocol (`WorkerRequest`, `WorkerResponse`, `WorkerStreamEvent`, `ToolDescriptor`).

### Python worker (工具桥接层)

`scripts/shook_worker.py` reads JSON requests from stdin and writes JSON responses to stdout. Methods: `handshake`, `list_tools`, `call_tool`, `run_shell`, `run_builtin`, `shutdown`.

### Python tools (工具资产层)

All tools live in `langgraph/tools/`, inherit `BaseTool`, and register in `langgraph/tools/registry.py`. Each tool declares a `ToolCategory`:

- `readonly` — 可自动执行。
- `side_effect` — 默认不应在自然语言 agent loop 中自动执行。
- `expensive` — 执行前应有策略提示或预算说明。

## 状态与 Git

`.shook/` contains runtime state — **not tracked in Git**:

| File | Purpose |
|---|---|
| `.shook/latest.json` | transcript, notes, todos, focus, mode, canvas state |
| `.shook/todos.json` | hand-editable todo list (reload with `/refresh`) |
| `.shook/workflows.json` | last-run status per workflow |
| `.shook/sessions/*.json` | named session snapshots |

- 状态 schema 或示例放在 `docs/examples/shook/`。
- 修改运行态格式时，同时更新示例和文档。

## 添加新工作流

1. Create `runtime/workflows/myWorkflow.ts` implementing `ShookWorkflow`.
2. Register it in `runtime/workflows/registry.ts`.
3. The workflow receives `WorkflowContext` with `workerClient`, `modelClient`, and `onLog`.
4. Write run results to `.shook/workflows.json`.
5. 需求管理工具暂不接入，除非用户明确要求。

## 添加新 Python 工具

1. Create a file in `langgraph/tools/` with a class inheriting `BaseTool`.
2. Register it in `langgraph/tools/registry.py` via `get_default_registry()`.
3. Set `category`, `cost_estimate`, and `reliability` on the tool schema.
4. Verify: `python3 -c "from langgraph.tools.registry import get_default_registry; print([t.name for t in get_default_registry()])"`.

## 架构约束

- TypeScript runtime 是主控层，位于 `runtime/`。
- 固定工作流通过 `runtime/workflows/` 注册。
- Python worker 位于 `scripts/shook_worker.py`，通过 JSON-over-stdio 桥接。
- Python 工具资产位于 `langgraph/tools/`。
- 自然语言 agent loop 不直接暴露任意 shell。
- `run_shell` 只用于用户显式 `!command`。

## 验证

修改 TypeScript 后至少运行：

```bash
npm run typecheck
```

涉及 worker 或工具 schema 时，验证 Python registry 能加载：

```bash
python3 -c "from langgraph.tools.registry import get_default_registry; get_default_registry()"
```
