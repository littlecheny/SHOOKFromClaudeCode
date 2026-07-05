# shook-memory-mcp

把 Shook 的 `.shook/memory/`（`essence.md` + `chats/`）暴露成一个 MCP server，供 Claude Desktop 等 MCP 客户端在对话中直接调用，把聊天精华/原始记录写进 Shook 能读到的位置。

## 工具

- `save_essence({ content, source? })` — 追加一段精华摘要到 `essence.md`。
- `save_chat_record({ content, topic?, source? })` — 把一段完整聊天记录存成 `chats/` 下的新文件。
- `read_essence()` — 读取 `essence.md` 全文，避免重复记录。
- `list_chat_records()` — 列出 `chats/` 下已有的记录文件名。

## 构建

```bash
npm install
npm run build
```

## 在 Claude Desktop 中注册

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`，加入：

```json
{
  "mcpServers": {
    "shook-memory": {
      "command": "node",
      "args": ["/Users/bytedance/claude-code/workdoc_runtime_impl/mcp-memory/dist/index.js"]
    }
  }
}
```

改完需要重启 Claude Desktop 才会生效。

## 存储位置

默认写入 `<项目根目录>/.shook/memory/`（即 `workdoc_runtime_impl/.shook/memory/`）。可通过环境变量 `SHOOK_MEMORY_ROOT` 覆盖，主要用于测试。

Shook 侧（`runtime/statePersistence.ts` 的 `loadEssence()`）只读取 `essence.md`，`/goal` 工作流用它理解用户。`chats/` 目录 Shook 目前不消费，是给未来"重新提炼"留的原始记录。
