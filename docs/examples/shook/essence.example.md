<!--
这是 .shook/memory/essence.md 的示例文件。

写入约定（写给外部 agent，例如 Claude Code / Codex）：
- 真实文件路径：.shook/memory/essence.md，项目根目录下，不进 Git。
- Shook 自身不读取聊天记录、不做精华提取；这件事由有运行态能力的外部 agent 完成。
- 外部 agent 在每次对话结束、识别到值得记住的内容时，以追加（append）方式写入一个新的
  二级标题区块，不要覆盖已有内容。
- 每个区块建议包含：日期、来源（这次对话发生在哪个工具/项目里）、精华内容本身。
- Shook 的 /goal 工作流会读取整份文件作为上下文，理解用户是谁、在意什么、过去做过什么决定。
-->

## 2026-06-18 · Claude Code @ workdoc_runtime_impl

- 用户正在把 Shook 从"复刻 Claude Code"的定位转向"个人 Agent 管家"，更看重固定工作流和可读状态协议，而不是通用 coding 能力。
- 用户做事风格：先确认架构约束，再动手实现；不喜欢过度设计和臆造功能。

## 2026-06-19 · Codex @ side-project-x

- 用户提到想在年底前把某个副项目做到可以对外展示的程度，但目前精力分散在多个仓库之间。
