# Runway Workflow

命令：

```text
/runway add --name NAME --path PATH
/runway delete --name NAME
/runway list
```

职责：

- 管理 `runway_projects.json`
- 在 dashboard 中展示当前 Runway 项目
- 记录运行状态到 `.shook/workflows.json`

实现：

- `runtime/workflows/runwayWorkflow.ts`
- `scripts/runway.py`
