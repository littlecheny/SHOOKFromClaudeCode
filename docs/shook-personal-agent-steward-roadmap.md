# Shook Personal Agent Steward Roadmap

本文档基于新的产品定位制定改造方向：Shook 不是 Claude Code / Codex 的替代品，而是个人 Agent 管家。

## 1. 新定位

Shook 的目标是成为个人长期运行的 Agent 管家，负责承载固定工作流、个人工具、可持续状态和高品质终端 UI。

定义：

> Shook 是一个个人 Agent 管家。它把固定工作流、新闻获取、金融监控、提醒、状态面板和长期任务组织到一个漂亮、稳定、可控的终端工作台中。

这个定位下，Shook 不需要和 Codex / Claude Code 竞争通用代码能力。Codex / Claude Code 负责高质量临时推理、代码修改和复杂任务执行；Shook 负责把已经确定下来的个人流程产品化、固定化、日常化。

## 2. 产品原则

### 2.1 固定工作流优先

Shook 应优先支持已经稳定、会重复发生的工作流：

- 获取新闻和生成日报
- BTC / 金融数据监控
- 需求管理工具后续可接入，但当前阶段暂不接入
- 提醒事项同步
- 固定项目状态检查
- 未来新增的个人自动化流程

判断标准：

- 如果任务是一次性的、探索性的，交给 Codex / Claude Code。
- 如果任务会重复运行、需要固定入口、固定输出、固定状态，就安装到 Shook。

### 2.2 UI 是核心产品能力

漂亮 UI 不是附属品，而是 Shook 的产品价值之一。

Shook 是个人管家，不只是脚本集合。终端 UI 应该承担：

- 让用户愿意每天打开
- 明确展示当前状态
- 降低固定工作流的启动成本
- 保持个人审美一致性

因此后续不应把启动动画、dashboard、输入体验视为“可有可无”。但 UI 投入必须服务于固定工作流和状态可读性，避免只做装饰。

### 2.3 可控，不追求通用全能

Shook 不应默认获得无限 shell 能力或复杂代码编辑能力。它的核心是：

- 固定命令
- 已注册工具
- 明确 workflow
- 明确状态文件
- 明确运行日志

自然语言能力可以保留，但不应成为唯一入口。

## 3. 当前架构应保留的部分

### 3.1 TS runtime

保留 TypeScript runtime 作为主控层：

- 终端 UI
- slash 命令
- 工作流路由
- 状态读取和写入
- 模型调用
- Python worker 通信

相关文件：

- `runtime/cli.ts`
- `runtime/inkInput.tsx`
- `runtime/messages.ts`
- `runtime/contextCanvas.ts`
- `runtime/statePersistence.ts`
- `runtime/modelClient.ts`
- `runtime/workerClient.ts`

### 3.2 Python 工具层

保留 Python 工具层，原因是已有工具资产集中在 Python，且数据抓取/金融处理/截图类任务适合 Python。

相关文件：

- `scripts/shook_worker.py`
- `langgraph/tools/base.py`
- `langgraph/tools/registry.py`
- `langgraph/tools/*.py`

但 Python worker 需要被约束成正式工具运行时，而不是任意脚本入口。

### 3.3 .shook 状态目录

`.shook/` 应继续作为 Shook 的运行状态目录，但要区分真实运行状态和可版本化样例。

建议目标：

```text
.shook/
  latest.json        真实运行态，不进 Git
  todos.json         真实运行态，不进 Git
  sessions/          真实运行态，不进 Git

docs/examples/shook/
  latest.example.json
  todos.example.json
  session.example.json
```

## 4. 已知必须执行的改造任务

### 4.1 真实运行状态取消 Git 跟踪

目标：避免每次运行 Shook 都污染 Git 状态。

当前问题：

- `.shook/latest.json` 已被 Git 跟踪，并且经常修改。
- `.shook/todos.json` 是运行态文件，不应该作为真实用户状态提交。
- `.shook/sessions/*.json` 也是运行态。

建议操作：

1. 在 `.gitignore` 增加：

```gitignore
# Shook runtime state
.shook/latest.json
.shook/todos.json
.shook/sessions/
```

2. 从索引中移除已跟踪运行态文件，但保留本地文件：

```bash
git rm --cached .shook/latest.json
git rm --cached -r .shook/sessions
```

3. 新增示例文件：

```text
docs/examples/shook/latest.example.json
docs/examples/shook/todos.example.json
```

原则：运行态不进 Git，schema 和示例进 Git。

### 4.2 历史文档更新，与现状一致

目标：停止让 README / QUICKSTART / AGENTS 描述过期架构。

当前问题：

- 文档仍有“LangGraph 多 Agent 编排层”的表达，但当前实际主控是 TS runtime。
- 部分命令、目录描述和现状不完全一致。
- 文档没有体现“个人 Agent 管家”的新定位。

建议文档结构：

```text
README.md
  项目定位、快速入口、核心工作流、架构简图

QUICKSTART.md
  安装、配置、启动、常用命令

AGENTS.md
  给开发 Agent 的仓库规则和架构约束

docs/shook-agent-current-state.md
  当前状态盘点

docs/shook-personal-agent-steward-roadmap.md
  本文档，改造路线

docs/workflows/
  get-news.md
  predict-btc.md
  requirement-manager.md
```

文档真源顺序：

1. 实际代码
2. `docs/shook-agent-current-state.md`
3. README / QUICKSTART
4. 历史文档

### 4.3 固定工作流安装到 Shook

目标：所有稳定工作流都有统一入口、统一状态、统一日志、统一 UI 呈现。

现有工作流：

- `/get-news`
- `/predict-btc`
- `/runway`
- `/cockpit`

当前阶段明确不接入需求管理工具；等该工具边界稳定后再作为新 workflow 接入。

建议抽象一个 workflow registry，而不是继续把所有 workflow 写死在 `runtime/cli.ts`。

目标形态：

```text
runtime/workflows/
  registry.ts
  types.ts
  getNewsWorkflow.ts
  predictBtcWorkflow.ts
```

统一接口：

```ts
type ShookWorkflow = {
  name: string
  command: string
  description: string
  category: 'daily' | 'finance' | 'project' | 'writing' | 'system'
  run(args: string[], context: WorkflowContext): Promise<WorkflowResult>
}
```

收益：

- 新工作流接入不需要扩大 `cli.ts`
- UI 可以按 workflow 状态展示
- 日志、错误、耗时统计可以统一
- 后续可以支持定时运行

## 5. UI 改造方向

### 5.1 UI 目标

Shook UI 应该像个人驾驶舱，而不是普通 CLI。

需要持续保留并强化：

- 启动动画
- 顶部 dashboard
- 当前 focus
- 今日工作流状态
- todos
- 最近执行记录
- 运行中状态
- 错误状态

### 5.2 Dashboard 信息架构

建议 dashboard 分区：

```text
┌ Shook Steward ─────────────────────────────────────┐
│ Identity / Theme                                   │
│ Focus: 当前主任务                                  │
│ Workflows: news ok | btc stale | requirements new  │
│ Todos: 3 open / 1 done                             │
│ Last Run: get-news 08:30 success                   │
│ Status: idle                                       │
└────────────────────────────────────────────────────┘
```

现有 `runtime/ui/dashboard.json` 可以继续作为主题配置，但需要从“静态配置”升级为“主题 + 信息布局配置”。

### 5.3 UI 代码边界

建议把 UI 逻辑从 `cli.ts` 中继续拆出：

```text
runtime/ui/
  dashboard.json
  frames.json
  monster.txt

runtime/uiRenderer.ts
runtime/theme.ts
runtime/layout.ts
```

原则：

- `cli.ts` 不负责复杂布局。
- UI 展示基于状态对象渲染。
- 状态对象由 workflow 和 state persistence 更新。

## 6. 工具和权限边界

当前 `run_shell` 只通过用户显式 `!command` 暴露，不在自然语言 tool registry 中。这一点应继续保持。

建议：

- `run_shell` 保留为用户手动命令能力。
- 自然语言 agent loop 只能调用注册工具。
- `side_effect` 工具需要明确确认机制。
- `expensive` 工具需要展示成本或耗时预期。
- `readonly` 工具可以自动运行。

工具 schema 中已有：

- `category`
- `cost_estimate`
- `reliability`

下一步应让 runtime 真正使用这些字段。

## 7. 工作流运行状态

为了支撑个人 Agent 管家定位，Shook 需要记录每个固定工作流的运行状态。

建议新增：

```text
.shook/workflows.json
```

运行态，不进 Git。

结构示例：

```json
{
  "get-news": {
    "last_run_at": "2026-05-30T08:30:00+08:00",
    "last_status": "success",
    "last_output": "reports/2026-05-30.md",
    "duration_ms": 18200
  },
  "predict-btc": {
    "last_run_at": "2026-05-30T09:10:00+08:00",
    "last_status": "failed",
    "last_error": "get_okx_funding_rate timeout"
  }
}
```

这会让 UI 有真实状态可展示，而不是只展示静态图案。

## 8. 需求管理工具后续接入建议

需求管理工具当前暂不接入。后续接入前，应先明确它的输入输出、状态文件和 UI 呈现方式。

建议先明确接口：

```text
/requirements
/requirements list
/requirements add
/requirements status
/requirements sync
```

如果工具已有 Python 实现：

- 先通过 Python tool registry 暴露底层能力。
- 再在 TS workflow 层封装成用户命令。

如果工具已有 TS 实现：

- 直接作为 `runtime/workflows/requirementManagerWorkflow.ts` 接入。

关键要求：

- 输出固定格式
- 状态写入 `.shook/workflows.json`
- dashboard 显示需求数量和最近变化
- 文档写入 `docs/workflows/requirement-manager.md`

## 9. 建议实施顺序

### Phase 1: 仓库卫生和文档真源

1. `.shook` 真实运行态取消 Git 跟踪。
2. 新增 `.shook` 示例文件。
3. 更新 README，写清“个人 Agent 管家”定位。
4. 更新 QUICKSTART，删除或修正过期命令和路径。
5. 更新 AGENTS，明确 TS runtime + Python worker 架构约束。

### Phase 2: Workflow registry

1. 抽出 `runtime/workflows/types.ts`。
2. 抽出 `runtime/workflows/registry.ts`。
3. 迁移 `/get-news`。
4. 迁移 `/predict-btc`。
5. 预留需求管理工具接入点，但不在当前阶段实现。

### Phase 3: UI 状态化

1. 定义 `DashboardState`。
2. 从 `.shook/workflows.json` 读取 workflow 状态。
3. dashboard 显示 focus、todos、workflow last run。
4. 把 UI 渲染从 `cli.ts` 继续拆出。

### Phase 4: 工具策略

1. runtime 读取 tool category。
2. readonly 自动执行。
3. side_effect 加确认机制。
4. expensive 加成本/耗时提示。
5. 记录工具调用日志。

## 10. 非目标

现阶段不做：

- 复刻 Codex 的通用代码编辑能力
- 复刻 Claude Code 的完整工具生态
- 复杂多 Agent 编排
- 任意 shell 自动执行
- 大规模重写 Python 工具到 TS

这些方向会稀释“个人 Agent 管家”的核心目标。

## 11. 成功标准

改造完成后，Shook 应满足：

- 打开后能清楚看到个人状态和固定工作流状态。
- 每个固定工作流都有 slash 命令、文档、运行日志和 UI 状态。
- 真实运行状态不会污染 Git。
- README / QUICKSTART / AGENTS 与当前架构一致。
- 新工具接入路径清楚：Python tool 或 TS workflow 二选一。
- UI 仍然保持个人风格，并且服务于实际工作流。

最终目标不是让 Shook 变得更像 Codex，而是让它更像一个每天可用、可看、可维护的个人 Agent 管家。
