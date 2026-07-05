# Shook

Shook 是一个个人 Agent 管家：把固定工作流、个人工具、长期状态和高品质终端 UI 组织到一个可日常使用的终端工作台中。

Shook 不定位为 Claude Code / Codex 的替代品。复杂临时代码任务继续交给 Codex / Claude Code；已经稳定、会重复发生、需要固定入口和固定状态的流程安装到 Shook。

## 当前定位

- 固定工作流容器：新闻日报、BTC/金融监控、Runway 项目管理、Cockpit 文本处理。
- 个人状态面板：Focus、Todos、会话快照、工作流最近运行状态。
- 工具协议层：TypeScript runtime 调度 Python 工具资产。
- 终端产品体验：启动动画、dashboard、Ink 输入和个人化视觉。
- 人生伙伴：承接用户与 Claude Code / Codex / Claude Desktop 等 agent 的聊天精华（`.shook/memory/essence.md`），并通过 `/goal` 对话式共创目标与执行计划。
  写入入口除了外部 agent 直接编辑文件，还有一个独立的 [`mcp-memory/`](mcp-memory/) MCP server，可以在 Claude Desktop 对话里直接调用写入。

需求管理工具暂不接入；后续应作为新的固定 workflow 接入。

## 架构

```text
./shook
  |
  v
runtime/                         TypeScript 主控层
  - cli.ts                       命令解析、交互循环、UI 状态装载
  - workflows/                   固定工作流注册与执行
  - modelClient.ts               Anthropic / Gemini / Kimi 模型适配
  - queryLoop.ts                 自然语言 agent loop
  - statePersistence.ts          .shook 状态持久化
  - workerClient.ts              Python worker JSON-over-stdio 客户端
  |
  v
scripts/shook_worker.py          Python worker 桥接层
  |
  v
langgraph/tools/                 Python 工具资产层

mcp-memory/                      独立 MCP server，供 Claude Desktop 等客户端写入 .shook/memory/
```

## 固定工作流

| 命令 | 说明 |
| --- | --- |
| `/get-news [--date YYYY-MM-DD]` | 拉取 RSS/Atom 候选并生成本地新闻日报 |
| `/predict-btc [--output-dir PATH]` | 拉取市场数据并生成 BTC 简报和 dashboard |
| `/runway add/delete/list ...` | 管理 Runway 项目路径 |
| `/cockpit draft/compress/polish` | 文本草拟、压缩、润色模式 |
| `/goal start/save/off/list/show/check` | 人生伙伴：对话式共创目标，生成执行计划文档 |

工作流状态写入 `.shook/workflows.json`，该文件是本地运行态，不进 Git。

## 状态文件

真实运行状态位于 `.shook/`：

```text
.shook/latest.json
.shook/todos.json
.shook/workflows.json
.shook/sessions/
.shook/memory/essence.md   # 由外部 agent 写入的精华档案，Shook 只读
.shook/memory/chats/       # 原始聊天记录留存目录，Shook 不读写
.shook/goals/*.md          # /goal 生成的目标文档
```

这些文件会随使用变化，默认不跟踪到 Git。可版本化示例位于：

```text
docs/examples/shook/
```

## 常用命令

```bash
npm install
npm run build
./shook
./shook --exec "/get-news"
./shook --exec "/predict-btc"
npm run typecheck
```

## 工具策略

自然语言 agent loop 只能调用注册工具，不直接暴露任意 shell。

- `readonly` 工具可以自动执行。
- `side_effect` 工具默认不会在自然语言 agent loop 中自动执行。
- `expensive` 工具执行前会在 transcript 中给出策略提示。
- 用户显式输入 `!<command>` 时，才通过 worker 执行 shell。

## 相关文档

- [当前状态盘点](docs/shook-agent-current-state.md)
- [个人 Agent 管家改造路线](docs/shook-personal-agent-steward-roadmap.md)
- [命令索引](docs/commands.md)
- [新闻工作流](docs/workflows/get-news.md)
- [BTC 工作流](docs/workflows/predict-btc.md)
- [Runway 工作流](docs/workflows/runway.md)
- [Cockpit 工作流](docs/workflows/cockpit.md)
- [精华档案 MCP server](mcp-memory/README.md)
