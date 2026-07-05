<!--
这是 .shook/memory/chats/ 目录下聊天记录文件的示例。

写入约定（写给外部 agent，例如 Claude Code / Codex）：
- 真实目录：.shook/memory/chats/，项目根目录下，不进 Git。
- 这里存放的是原始/完整的聊天记录（比 essence.md 更细，essence.md 是从这些记录里提炼出的精华）。
- Shook 自己不写入、不读取这个目录，只保证目录存在（见 runtime/statePersistence.ts 的 ensureStateDirs）。
- 建议命名：<YYYY-MM-DD>-<来源 agent>-<简短主题>.md，每次对话一个文件，避免互相覆盖。
- 文件内容格式不强制，但建议保留原始对话的角色和时间信息，方便以后被其他 agent 重新读取、提炼。
-->

# 2026-06-20 · Claude Code · Shook 人生伙伴定位讨论

**user**: 我要让 shook 增加一个定位，那就是我的人生伙伴...

**assistant**: 这是一个有意思的新定位扩展...

（此处省略，完整对话内容由写入方自行决定保留的详细程度）
