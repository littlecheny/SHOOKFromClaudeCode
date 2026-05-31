# Shook Development Rules

本仓库是 Shook 个人 Agent 管家。开发时以当前代码为真源，不要按过期 README 假设架构。

## 定位

- Shook 是个人 Agent 管家，不是 Claude Code / Codex 平替。
- 固定、重复、需要状态和 UI 的工作流安装到 Shook。
- 一次性探索和复杂代码任务交给 Codex / Claude Code。
- UI 是核心产品能力，不能当作无关装饰随意移除。

## 架构约束

- TypeScript runtime 是主控层，位于 `runtime/`。
- 固定工作流通过 `runtime/workflows/` 注册。
- Python worker 位于 `scripts/shook_worker.py`，通过 JSON-over-stdio 桥接。
- Python 工具资产位于 `langgraph/tools/`。
- 自然语言 agent loop 不直接暴露任意 shell。
- `run_shell` 只用于用户显式 `!command`。

## 状态与 Git

- `.shook/latest.json`、`.shook/todos.json`、`.shook/workflows.json`、`.shook/sessions/` 是真实运行态，不应跟踪到 Git。
- 状态 schema 或示例放在 `docs/examples/shook/`。
- 修改运行态格式时，同时更新示例和文档。

## 工作流规则

- 新固定流程优先做成 `ShookWorkflow`，注册到 `runtime/workflows/registry.ts`。
- 工作流应写入 `.shook/workflows.json` 的运行结果。
- 需求管理工具暂不接入，除非用户明确要求。

## 工具策略

- Python 工具必须继承 `BaseTool` 并在 `langgraph/tools/registry.py` 注册。
- `readonly` 工具可自动执行。
- `side_effect` 工具默认不应在自然语言 agent loop 中自动执行。
- `expensive` 工具执行前应有策略提示或预算说明。

## 验证

修改 TypeScript 后至少运行：

```bash
npm run typecheck
```

涉及 worker 或工具 schema 时，验证 Python registry 能加载。
