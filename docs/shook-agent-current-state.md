# Shook Agent Current State

本文档记录截至 2026-05-30 看到的 Shook Agent 架构、已有能力、历史痕迹，以及当前建议定位。判断以当前仓库实际代码为主，README/AGENTS 中的历史描述仅作为辅助参考。

## 1. 一句话结论

Shook 当前不是 Claude Code / Codex 平替，而是一个“TS 交互运行时 + Python 工具资产层”的个人 Agent 管家。

它已经具备基本 agent loop、工具调用、会话状态、日报/金融工作流和命令行 UI，但在权限治理、代码编辑可靠性、上下文管理、工具安全、生态集成和模型能力上，不应继续和 Codex / Claude Code 做正面竞争。

更合理的定位是：让 Shook 承载固定工作流、个人工具、长期状态和高品质终端 UI。Codex / Claude Code 负责复杂临时推理和代码任务，Shook 负责把已经确定下来的流程产品化、固定化、日常化。

## 2. 当前架构

当前主架构是三层：

```text
用户终端
  |
  v
runtime/                         TypeScript 主控层
  - cli.ts                       命令解析、交互循环、UI、状态装载
  - queryLoop.ts                 模型-工具循环
  - modelClient.ts               Anthropic / Gemini / Kimi 模型适配
  - statePersistence.ts          .shook 状态、session、todo 持久化
  - newsWorkflow.ts              每日新闻工作流
  - predictBtc.ts                BTC 市场简报工作流
  - workerClient.ts              Python worker JSON-over-stdio 客户端
  |
  v
scripts/shook_worker.py          Python worker 桥接层
  - handshake
  - list_tools
  - call_tool
  - run_shell
  - run_builtin
  |
  v
langgraph/tools/                 Python 工具资产层
  - registry.py                  工具注册中心
  - base.py                      BaseTool / ToolResult / ToolSchema
  - news/store/github/reminders  信息源、Notion、Git、提醒事项
  - dxy/nasdaq/stablecoin/...    金融和市场数据工具
```

### 2.1 TS runtime 是主控

实际入口是 `./shook`，它最终运行 TypeScript runtime 的构建产物。核心控制在 `runtime/cli.ts`：

- 解析 `--exec`、`--help`、`--version`、`--no-banner`
- 启动 Python worker
- 加载 `.env`
- 加载 `.shook/latest.json` 和 `.shook/todos.json`
- 加载工具列表
- 进入交互式循环或执行批处理命令

### 2.2 Python worker 是工具桥

`scripts/shook_worker.py` 通过标准输入/输出和 TS runtime 通信。协议定义在 `runtime/protocol.ts`。

支持的方法：

- `handshake`
- `run_builtin`
- `run_shell`
- `list_tools`
- `call_tool`
- `shutdown`

它的价值是把 Python 生态里的工具、历史脚本、金融数据脚本保留下来，同时让 TS runtime 负责交互和编排。

### 2.3 LangGraph 现在更像工具层，不是完整编排层

虽然目录叫 `langgraph/`，当前实际职责主要是工具注册和工具执行：

- `langgraph/tools/base.py` 定义统一工具接口。
- `langgraph/tools/registry.py` 注册内置工具。
- `langgraph/memory/` 和 `langgraph/observability/` 是历史资产，当前没有成为主编排中心。

因此当前不应把 Shook 描述为“LangGraph 多 Agent 编排系统”。更准确的说法是：保留了 LangGraph 风格工具资产层。

## 3. 当前已有功能

### 3.1 终端交互 UI

已有能力：

- 启动动画：`runtime/ui/frames.json`
- dashboard 配置：`runtime/ui/dashboard.json`
- monster 图案：`runtime/ui/monster.txt`
- Ink 输入：`runtime/inkInput.tsx`
- 消息渲染：`runtime/messages.ts`
- 交互式命令循环：`runtime/cli.ts`

这部分更偏产品外壳和个人化体验。

### 3.2 Slash 命令

当前 help 中列出的核心命令：

```text
/get-news [--date YYYY-MM-DD]
/predict-btc [--output-dir PATH]
/cockpit draft|compress|polish [TEXT]
/cockpit off
/runway add --name NAME --path PATH
/runway delete --name NAME
/runway list
/focus set TEXT
/focus clear
/note add TEXT
/note list
/note clear
/todo add TEXT
/todo done N
/todo list
/todo undo N
/todo rm N
/save [NAME]
/load NAME
/sessions
/new
/tools [refresh]
/canvas refresh
/refresh
/detail
/toggle
/help
/exit
```

另外支持：

```text
!<command>
```

用于通过 Python worker 调 `/bin/zsh -i -c` 执行 shell 命令。

### 3.3 自然语言 agent loop

普通文本会进入 `runtime/queryLoop.ts`：

1. 构造 system prompt。
2. 注入最近 transcript。
3. 注入 notes / todos。
4. 调用 `ModelClient.complete()`。
5. 如果模型返回工具调用，则通过 Python worker 执行。
6. 把工具结果塞回模型上下文。
7. 最多迭代 5 轮。

当前 query loop 已具备基本 function calling 能力，但还比较薄：

- transcript 只保留最近 24 行。
- 没有 Codex 级别的上下文压缩、文件检索策略、变更规划和权限治理。
- 工具失败会返回错误给模型，但没有成熟的恢复策略。

### 3.4 模型适配

`runtime/modelClient.ts` 当前支持：

- Anthropic Claude：`ANTHROPIC_API_KEY`
- Gemini：`GEMINI_API_KEY`
- Kimi：`KIMI_API_KEY`
- AICoding / ChatGPT 中转站：`AICODING_API_KEY`

选择逻辑：

- 显式 `LLM_PROVIDER`
- 否则按可用 API key 推断

默认模型：

- Gemini: `gemini-2.5-flash`
- Anthropic: `claude-3-7-sonnet-20250219`
- Kimi: `moonshot-v1-8k`
- AICoding: `gpt-5.4`

模型调用有 retry 包装，但没有统一 tracing、token 预算、成本统计或多模型路由策略。

### 3.5 Context Canvas / 状态

状态文件在 `.shook/`：

```text
.shook/latest.json
.shook/todos.json
.shook/sessions/*.json
```

当前支持：

- focus
- notes
- todos
- transcript
- cockpit mode
- canvas expanded/collapsed
- named sessions

`todos.json` 是一个可手动编辑文件。用户编辑后可在 Shook 内执行 `/refresh` 重新加载。

这是 Shook 目前最值得保留的一类资产：结构简单、可读、可迁移，适合作为个人 agent 状态协议雏形。

### 3.6 每日新闻工作流

入口：`/get-news`

实现：`runtime/newsWorkflow.ts`

流程：

1. 读取 `scripts/orchestrator/feeds.yaml`
2. 调 Python 工具 `fetch_feeds`
3. 构造新闻分析 prompt
4. 调模型生成 Markdown 报告
5. 写入 `reports/YYYY-MM-DD.md`
6. 写入本地 `reports/YYYY-MM-DD.md`

问题：

- YAML 解析是手写的窄解析，只支持当前固定结构。
- 报告生成和 push 耦合在工作流里。
- 对失败、去重、质量评估的机制还弱。

### 3.7 BTC / 金融数据工作流

入口：`/predict-btc`

实现：`runtime/predictBtc.ts`

它会并行调用多类市场数据工具：

- DXY
- Nasdaq
- Fear & Greed
- Stablecoin
- OKX funding rate
- OKX spot
- OKX futures
- Farside BTC screenshot

然后生成若干 HTML dashboard 和 Markdown 简报。

相关 Python 工具和脚本分布在：

- `langgraph/tools/dxy.py`
- `langgraph/tools/nasdaq.py`
- `langgraph/tools/fear_greed.py`
- `langgraph/tools/stablecoin.py`
- `langgraph/tools/okx_funding.py`
- `langgraph/tools/okx_spot.py`
- `langgraph/tools/okx_futures.py`
- `langgraph/tools/farside_btc.py`
- `scripts/btc_predictor/`

这是 Shook 当前最像“垂直工作流”的部分。

### 3.8 工具注册体系

当前内置工具由 `langgraph/tools/registry.py` 注册，主要包括：

- Git：`commit_and_push`
- News：`fetch_feed`, `fetch_feeds`
- Store/Notion：`get_seen`, `mark_seen`, `mark_report_use`
- DXY：数据、信息、dashboard
- Nasdaq：数据、信息、dashboard
- Stablecoin：数据、信息、dashboard
- Fear & Greed：数据、信息、dashboard
- OKX funding：数据、信息、dashboard
- OKX spot：价格、dashboard
- OKX futures：价格、dashboard
- Farside BTC：截图
- Reminders：创建提醒、列出提醒列表

工具接口有 `category`、`cost_estimate`、`reliability` 字段。当前 runtime 会读取这些字段：`side_effect` 工具默认不会在自然语言 agent loop 中自动执行，`expensive` 工具执行前会输出策略提示。

### 3.9 Runway 项目管理

相关文件：

- `scripts/runway.py`
- `runway_projects.json`
- `RUNAWAY_USAGE.md`

当前 runtime 支持通过 `/runway` 添加、删除、列出项目。它更像一个个人项目路径管理器。

### 3.10 Cockpit 文本模式

相关文件：

- `runtime/cockpit.ts`

当前支持：

- draft
- compress
- polish

进入 cockpit mode 后，普通文本会按当前模式做文本转换，而不是进入完整 agent loop。

## 4. 历史痕迹和不一致

当前仓库里有明显演进痕迹：

1. 早期文档曾称“LangGraph 多 Agent 编排”，但当前主控已经转向 TS runtime。
2. README/QUICKSTART/AGENTS 已更新为“个人 Agent 管家”定位；更早的历史描述只作为背景参考。
3. `dist/runtime/` 存在构建产物，`runtime/` 是源代码。
4. `ts_runtime_worker.patch` 像是一次迁移 TS runtime / worker 架构时留下的补丁文件。
5. `test-*.js/tsx/ts` 多数像 UI/终端输入实验文件，不是正式测试体系。
6. `.shook/latest.json`、`.shook/todos.json`、`.shook/workflows.json` 和 `.shook/sessions/` 属于运行状态，已配置为不进入 Git；示例文件放在 `docs/examples/shook/`。

## 5. 与 Codex / Claude Code 的差距

如果按“通用 coding agent”评估，Shook 当前差距很大：

- 没有成熟权限系统。
- 没有 sandbox。
- 没有稳定的代码编辑协议。
- 没有上下文检索和压缩体系。
- 没有可靠 diff / patch / review 工作流。
- 自然语言 agent loop 已有基础工具策略，但还没有完整交互式审批 UI。
- 没有长期会话压缩和恢复策略。
- Shell 执行仅保留为用户显式 `!command`，不进入自然语言 tool registry。

因此不建议继续把 Shook 定位成 Claude Code / Codex 的个人复刻版。

## 6. 当前建议定位

当前定位：

> Shook 是一个个人 Agent 管家，用来承载固定工作流、个人状态、可回放工作流和垂直自动化能力；底层模型和重型 coding 工作可以继续依赖 Codex / Claude Code。

这个定位下，Shook 的目标不是“比 Codex 更会做事”，而是：

1. 定义个人工具协议。
2. 定义个人状态协议。
3. 承载垂直自动化工作流。
4. 做低风险 agent loop 实验。
5. 作为理解 Claude Code / Codex 架构的可修改样机。

## 7. 建议保留的核心资产

### 7.1 保留 TS runtime + Python worker 协议

这是当前最清楚的架构骨架。它允许：

- TS 做交互和模型编排。
- Python 做数据抓取和历史工具复用。
- 两边通过 JSON-over-stdio 解耦。

### 7.2 保留 `.shook/` 状态格式

`.shook/latest.json`、`.shook/todos.json`、`.shook/sessions/*.json` 应该继续演化成明确的 personal agent state schema。

但建议区分：

- schema / 示例可以进 Git
- 真实运行状态不要频繁进 Git

### 7.3 保留金融/日报垂直工作流

这些是 Shook 相对 Codex 的差异化资产。Codex 可以临时做，但 Shook 可以把流程、数据源、输出格式固化下来。

### 7.4 保留工具注册中心

`BaseTool` + `ToolRegistry` 是一个够小、够可控的工具协议雏形。后续应该增强，而不是推倒。

## 8. 建议停止投入的方向

### 8.1 停止追通用 coding agent

这部分 Codex / Claude Code 优势太大。Shook 不应投入大量精力复刻：

- repo-wide code editing
- review
- patch planning
- sandbox
- permission UX
- model context engineering

除非目标是学习，不是生产使用。

### 8.2 停止过度 UI 化

启动动画、monster、dashboard 可以保留，但不应继续消耗主要开发时间。当前更重要的是协议、状态、工作流可靠性。

### 8.3 停止把历史文档当真源

README/QUICKSTART/AGENTS 需要一次对齐。后续应以实际 runtime 架构为真源。

## 9. 建议下一步

按优先级：

1. 继续把 dashboard 渲染从 `cli.ts` 拆成独立 UI renderer。
2. 为 `side_effect` 工具补交互式确认 UI，而不仅是默认阻断。
3. 把 `/get-news` 和 `/predict-btc` 的配置继续外置，减少 workflow 内硬编码。
4. 清理历史测试文件和过期补丁文件，但要先单独列清单，不要直接删除。

## 10. 最终判断

Shook 还有意义，但意义已经不是“做一个自己的 Claude Code”。

它适合变成：

- 个人 Agent 管家
- 可控工具协议层
- 可读状态/会话格式
- 垂直自动化工作流容器

如果继续追通用 agent 产品，维护成本会越来越高，实际价值会被 Codex / Claude Code 挤压。当前最务实的路线是把 Shook 缩小、变硬、变清楚。
