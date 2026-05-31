# Get News Workflow

命令：

```text
/get-news [--date YYYY-MM-DD]
```

职责：

- 读取 `scripts/orchestrator/feeds.yaml`
- 调用 Python 工具 `fetch_feeds`
- 用模型生成 Markdown 新闻日报
- 写入 `reports/YYYY-MM-DD.md`
- 报告只保存到本地 `reports/YYYY-MM-DD.md`
- 记录运行状态到 `.shook/workflows.json`

实现：

- `runtime/workflows/getNewsWorkflow.ts`
- `runtime/newsWorkflow.ts`

注意：

- `.shook/workflows.json` 是运行态，不进 Git。
- 新闻日报是本地运行产物，不纳入 Git 跟踪，也不由 workflow 自动推送。
