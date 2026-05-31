# Cockpit Workflow

命令：

```text
/cockpit draft [TEXT]
/cockpit compress [TEXT]
/cockpit polish [TEXT]
/cockpit off
```

职责：

- 提供固定文本处理模式
- 进入模式后，普通文本会按当前模式处理，而不是进入通用 agent loop
- 当前模式写入 `.shook/latest.json`

实现：

- `runtime/cockpit.ts`
- `runtime/cli.ts`

说明：

Cockpit 是交互模式型工作流。它已在 help 和 dashboard 中体现，但执行逻辑仍保留在 `cli.ts`，避免把状态切换逻辑过度拆散。
