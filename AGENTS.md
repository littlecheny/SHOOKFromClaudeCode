# Shook Development Rules

本仓库是 Shook 个人 Agent 管家。开发时以当前代码为真源，不要按过期 README 假设架构。

## 定位

- Shook 是个人 Agent 管家，不是 Claude Code / Codex 平替。
- 默认操作边界：当用户在外层 `/Users/bytedance/claude-code` 工作区里说"仓库"、"整个仓库"、"commit"、"push"、"运行命令"或类似指令时，除非明确指定外层仓库，都默认操作本内层 `workdoc_runtime_impl` Git 仓库。
- 固定、重复、需要状态和 UI 的工作流安装到 Shook。
- 一次性探索和复杂代码任务交给 Codex / Claude Code。
- UI 是核心产品能力，不能当作无关装饰随意移除。
- Shook 不是通用 coding agent，不要投入 repo-wide editing、sandboxing 或 permission UX。
- Shook 还是用户的人生伙伴：承载"最懂用户的精华档案"和"对话式共创目标"两个能力，见下方「精华档案协议」「Goal 工作流」「精华档案 MCP server」。
- GUI（`gui/`）是 `.shook/` 状态的视图层 + 系统通知推送介面，不承载业务逻辑——运行时逻辑始终在 TS runtime 里，GUI 只通过动态 import 复用编译产物。见下方「GUI（菜单栏 App）」。

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

## GUI（菜单栏 App）

- 子项目位置：`gui/`，独立的 Electron + React + Vite + Tailwind 项目（独立 `package.json`/`tsconfig.json`，不共享根目录 tsc-only 配置）。
- 定位：macOS 菜单栏（tray）常驻 App，作为 `.shook/` 状态的视图层 + 系统通知推送介面；TUI 保留不动，两者共享同一份 `.shook/` 状态。
- 复用方式：Electron 主进程通过 `pathToFileURL` 动态 import 根目录编译产物 `dist/runtime/*.js`（`workflows/registry.js`、`statePersistence.js`、`workerClient.js`、`modelClient.js`）。**改了 runtime 后要先在根目录 `npm run build`，`gui` 端再重启才能看到新代码**——它读的是 `dist/`，不是 `runtime/` 源码。
- 禁止 import `cli.js` / `inkInput.js`（Ink/TUI 耦合，只给 REPL 用）。
- 界面：
  - 「状态」：focus / todos / workflow 最近运行状态（与 TUI dashboard 同源数据）+ 四千周人生视图（`gui/electron/lifeWeeks.ts`，出生日期写死 `2002-06-04`；单日 commit 数据来源尚未定义，用 `MockCommitSource` 实现 `LifeCommitSource` 接口占位，纯内存不落盘到 `.shook/`——未来接入真实数据只替换这一处构造）。
  - 「功能」：可点击运行 `get-news` / `predict-btc`（白名单见 `gui/electron/ipc.ts` 的 `WORKFLOW_ALLOWLIST`；`runway`/`cockpit`/`goal` 是 TUI 交互式命令，不在 GUI 暴露），实时日志流 + 完成后系统 Notification。
- Focus/Todos 可在 GUI 里直接编辑（`gui/electron/todosMutator.ts`），读-改-写同一份 `.shook/todos.json`，字段语义（`id: Date.now()`、`createdAt`、`completedAt`）与 `cli.js` 的 `/focus`、`/todo` 命令保持一致。
- IPC 面集中注册在 `gui/electron/ipc.ts`：只读 `state:get`/`lifeweeks:get`/`workflow:list`，写 `state:setFocus`/`state:addTodo`/`state:toggleTodo`/`state:removeTodo`/`workflow:run`，推送事件 `state:changed`/`workflow:log`/`workflow:status`。`contextIsolation: true`、`nodeIntegration: false`。
- UI 设计原则：遵循本机 `minimalist-ui` skill 协议（暖白画布、1px 边框、无重阴影/渐变、衬线大标题、8-12px 圆角）。色彩 token 定义在 `gui/src/index.css` 的 `@theme` 里；四千周热力图色阶和状态点用海绵宝宝低饱和 accent（海绵黄 `sponge-1..4`、派大星粉 `patrick`、加里蓝 `gary`、章鱼哥青 `squid`），只做 spot accent，不大面积铺色。改视觉风格前先看这份 token 定义，不要引入新的配色系统。

```bash
cd gui
npm install
npm run dev      # electron-vite dev，renderer 有 HMR；main/preload 改动需要重启进程才生效
npm run build    # → gui/out/{main,preload,renderer}
npm run start    # electron-vite preview，跑已构建产物
```

## 状态与 Git

`.shook/` contains runtime state — **not tracked in Git**:

| File | Purpose |
|---|---|
| `.shook/latest.json` | transcript, notes, todos, focus, mode, canvas state |
| `.shook/todos.json` | hand-editable todo list; TUI 用 `/refresh` 重新加载，GUI 直接写入并实时推送 |
| `.shook/workflows.json` | last-run status per workflow |
| `.shook/sessions/*.json` | named session snapshots |
| `.shook/memory/essence.md` | 精华档案，见下方协议 |
| `.shook/memory/chats/*.md` | 原始聊天记录，见下方协议 |
| `.shook/goals/*.md` | `/goal` 生成的目标文档 |

- 状态 schema 或示例放在 `docs/examples/shook/`。
- 修改运行态格式时，同时更新示例和文档。

## 精华档案协议（人生伙伴 · 数据源）

- 真实文件位置：`.shook/memory/essence.md`，由 `ensureStateDirs` 保证目录存在，但文件内容**不**由 Shook 自己写入。
- Shook 不主动读取 Claude Code / Codex 等其他 agent 的聊天记录，也不做精华提取——这部分能力依赖外部 agent 自身的运行态能力。
- 外部 agent 负责在对话中识别值得记住的内容，以追加方式写入 `.shook/memory/essence.md`（建议每条记录带日期和来源）。
- Shook 侧只做一件事：`runtime/statePersistence.ts` 的 `loadEssence()` 读取整份文件，作为 `/goal` 工作流理解用户的上下文。
- 示例格式见 `docs/examples/shook/essence.example.md`。

## 原始聊天记录目录（人生伙伴 · 留存位置）

- 真实目录位置：`.shook/memory/chats/`，由 `ensureStateDirs` 保证目录存在，文件内容同样**不**由 Shook 写入或读取。
- 用于存放用户和 Claude Code / Codex 等 agent 的原始/完整聊天记录，比 `essence.md` 的精华摘要更细。
- 建议命名：`<YYYY-MM-DD>-<来源 agent>-<简短主题>.md`，每次对话一个文件，避免互相覆盖。
- Shook 目前不消费这个目录；它是给未来"从原始记录里重新提炼"留的位置。
- 示例格式见 `docs/examples/shook/chat-record.example.md`。

## 精华档案 MCP server（人生伙伴 · 写入入口）

- 子项目位置：`mcp-memory/`，独立的 Node/TS 项目（不共享主 runtime 的 tsconfig），用 `@modelcontextprotocol/sdk` 实现一个 stdio MCP server。
- 暴露四个工具：`save_essence`（追加精华到 `essence.md`）、`save_chat_record`（新建文件存到 `chats/`）、`read_essence`（读取 `essence.md` 全文）、`list_chat_records`（列出 `chats/` 下文件名）。
- 用途：让 Claude Desktop 等 MCP 客户端在对话过程中直接调用这些工具，把聊天精华/原始记录写进 Shook 能读到的 `.shook/memory/`，不需要用户手动复制粘贴。
- 存储路径默认相对于 `mcp-memory/` 的项目根（即 `workdoc_runtime_impl/.shook/memory/`），可用 `SHOOK_MEMORY_ROOT` 环境变量覆盖（主要用于测试）。
- 构建：`cd mcp-memory && npm install && npm run build`，产物在 `mcp-memory/dist/index.js`。
- 在 Claude Desktop 里注册：`~/Library/Application Support/Claude/claude_desktop_config.json` 的 `mcpServers.shook-memory` 指向 `node <绝对路径>/mcp-memory/dist/index.js`，改完需重启桌面版。
- 这个 server 只负责写入/读取文件，不做精华提取判断——由 MCP 客户端侧的模型决定什么时候调用 `save_essence`。

## Goal 工作流（人生伙伴 · 目标共创）

- 命令：`/goal start [TEXT]` 进入对话、`/goal save [NAME]` 结束并生成文档、`/goal off` 放弃、`/goal list`、`/goal show NAME`、`/goal check NAME N`。
- 实现：`runtime/goal.ts`（对话与文档生成的 prompt 逻辑）+ `runtime/cli.ts` 里的 `handleGoalCommands`（命令路由与状态机，模式与 `/cockpit` 一致）。
- 对话历史只保存在内存的 `state.goalHistory` 中，不随 `/save` 持久化到会话快照；`/goal save` 时才会把对话浓缩成 Markdown 目标文档写入 `.shook/goals/<name>.md`。
- 目标文档结构固定为 `# 标题` + `## 动机` + `## 里程碑` + `## 执行步骤`，里程碑/步骤用 Markdown checkbox 表示，`/goal check` 通过统计文件内第 N 个 checkbox 来勾选/取消。
- TUI 呈现：目标文档本身就是 Markdown 文本，`/goal show` 直接把内容打印进终端 transcript；`/goal list` 汇总每个目标的完成进度（`done/total`）。

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
