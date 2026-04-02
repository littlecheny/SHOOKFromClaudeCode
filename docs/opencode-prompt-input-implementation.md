# OpenCode 输入框实现文档

> 本文档分析 [anomalyco/opencode](https://github.com/anomalyco/opencode) 项目中输入框组件的实现方式。

---

## 一、项目概览

**OpenCode** 是一个开源 AI 编程助手，提供终端 TUI 和桌面应用两种形态。其输入框组件是用户与 AI 交互的核心界面。

**技术栈**：
| 项目 | 技术选择 |
|------|----------|
| 框架 | SolidJS |
| 状态管理 | `createStore` / `createSignal` (solid-js/store) |
| UI 组件库 | `@opencode-ai/ui` (自研) |
| 路由 | `@solidjs/router` |
| 构建工具 | Vite + Bun |

---

## 二、源码文件路径

### 主组件文件

```
packages/app/src/components/prompt-input.tsx
```

**本地副本**：
- `docs/opencode-prompt-input.tsx` (已保存)

**GitHub 地址**：
- 查看：https://github.com/anomalyco/opencode/blob/dev/packages/app/src/components/prompt-input.tsx
- 原始文件：https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/app/src/components/prompt-input.tsx

### 相关依赖文件

| 文件路径 | 说明 |
|----------|------|
| `packages/app/src/context/prompt.tsx` | Prompt 状态管理 Context |
| `packages/app/src/context/local.tsx` | 本地设置 Context (Agent/Model) |
| `packages/app/src/context/file.tsx` | 文件选择 Context |
| `packages/app/src/context/command.tsx` | 命令系统 Context |
| `packages/app/src/context/sync.tsx` | 数据同步 Context |
| `packages/app/src/context/sdk.tsx` | SDK 客户端 Context |
| `packages/app/src/context/layout.tsx` | 布局管理 Context |
| `packages/app/src/context/permission.tsx` | 权限管理 Context |
| `packages/app/src/utils/persist.ts` | 持久化工具 |
| `packages/app/src/utils/id.ts` | ID 生成器 |
| `packages/app/src/hooks/use-providers.tsx` | Provider Hook |
| `packages/ui/src/hooks/index.ts` | UI Hooks (useFilteredList) |

### UI 组件依赖

```
packages/ui/src/
├── button.tsx
├── icon.tsx
├── icon-button.tsx
├── select.tsx
├── tooltip.tsx
├── file-icon.tsx
├── provider-icon.tsx
├── image-preview.tsx
├── toast.tsx
└── context/dialog.tsx
```

### SDK 依赖

```
packages/sdk/src/v2/client.ts    # OpenCode API 客户端
packages/util/src/
├── path.ts                       # 路径工具函数
├── binary.ts                     # 二分搜索
└── encode.ts                     # Base64 编码
```

---

## 三、核心实现分析

### 3.1 为什么使用 ContentEditable？

输入框使用 `contenteditable` div 而非原生 `<input>` 或 `<textarea>`：

```tsx
<div
  data-component="prompt-input"
  contenteditable="true"
  onInput={handleInput}
  onPaste={handlePaste}
  onCompositionStart={() => setComposing(true)}
  onCompositionEnd={() => setComposing(false)}
  onKeyDown={handleKeyDown}
/>
```

**优势**：
- 支持混合内容（纯文本 + 富文本标签）
- 可以将 `@agent` 和 `@file` 渲染为特殊样式的 "Pills"
- 支持多行输入和自定义光标行为
- 更灵活的 DOM 操作

### 3.2 数据模型设计

定义了多种内容类型：

```typescript
type ContentPart = 
  | { type: "text"; content: string; start: number; end: number }
  | { type: "file"; path: string; content: string; start: number; end: number; selection?: FileSelection }
  | { type: "image"; id: string; filename: string; mime: string; dataUrl: string }
  | { type: "agent"; name: string; content: string; start: number; end: number }

type Prompt = ContentPart[]
```

### 3.3 DOM ↔ 数据双向同步

**从 DOM 解析数据** (`parseFromDOM`)：
```typescript
const parseFromDOM = (): Prompt => {
  const parts: Prompt = []
  // 遍历 editorRef 的子节点
  // 文本节点 -> { type: "text", ... }
  // data-type="file" 元素 -> { type: "file", ... }
  // data-type="agent" 元素 -> { type: "agent", ... }
  // BR 元素 -> 换行符
  return parts
}
```

**将数据渲染到 DOM** (`renderEditor`)：
```typescript
const renderEditor = (parts: Prompt) => {
  editorRef.innerHTML = ""
  for (const part of parts) {
    if (part.type === "text") {
      editorRef.appendChild(createTextFragment(part.content))
    }
    if (part.type === "file" || part.type === "agent") {
      editorRef.appendChild(createPill(part))  // 创建 Pills 元素
    }
  }
}
```

### 3.4 Pills 元素创建

```typescript
const createPill = (part: FileAttachmentPart | AgentPart) => {
  const pill = document.createElement("span")
  pill.textContent = part.content
  pill.setAttribute("data-type", part.type)
  if (part.type === "file") pill.setAttribute("data-path", part.path)
  if (part.type === "agent") pill.setAttribute("data-name", part.name)
  pill.setAttribute("contenteditable", "false")  // 不可编辑
  pill.style.userSelect = "text"
  pill.style.cursor = "default"
  return pill
}
```

### 3.5 光标位置管理

```typescript
// 获取光标位置
function getCursorPosition(parent: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return 0
  const range = selection.getRangeAt(0)
  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(parent)
  preCaretRange.setEnd(range.startContainer, range.startOffset)
  return getTextLength(preCaretRange.cloneContents())
}

// 设置光标位置
function setCursorPosition(parent: HTMLElement, position: number) {
  // 遍历子节点，定位到正确位置
  // 处理文本节点、Pills、BR 等不同类型
}
```

---

## 四、交互功能实现

### 4.1 @ 符号触发 (文件/Agent 选择)

```typescript
const handleInput = () => {
  const rawText = rawParts.map(p => p.content).join("")
  const cursorPosition = getCursorPosition(editorRef)
  
  // 检测 @ 符号
  const atMatch = rawText.substring(0, cursorPosition).match(/@(\S*)$/)
  if (atMatch) {
    atOnInput(atMatch[1])  // 触发搜索
    setStore("popover", "at")  // 显示弹窗
  }
}
```

**搜索逻辑**：
```typescript
const { flat: atFlat, onInput: atOnInput } = useFilteredList<AtOption>({
  items: async (query) => {
    const agents = agentList()  // Agent 列表
    const paths = await files.searchFilesAndDirectories(query)  // 文件搜索
    return [...agents, ...paths.map(p => ({ type: "file", path: p }))]
  },
  filterKeys: ["display"],
  onSelect: handleAtSelect,
})
```

### 4.2 / 符号触发 (斜杠命令)

```typescript
const slashMatch = rawText.match(/^\/(\S*)$/)
if (slashMatch) {
  slashOnInput(slashMatch[1])
  setStore("popover", "slash")
}
```

**命令来源**：
- `builtin`: 内置命令 (来自 `command.options`)
- `custom`: 自定义命令 (来自 `sync.data.command`)

### 4.3 Shell 模式 (! 开头)

```typescript
if (event.key === "!" && store.mode === "normal") {
  const cursorPosition = getCursorPosition(editorRef)
  if (cursorPosition === 0) {  // 在开头输入 !
    setStore("mode", "shell")
    setStore("popover", null)
    event.preventDefault()
  }
}
```

Shell 模式下：
- 使用等宽字体 (`font-mono`)
- 独立的历史记录 (`shellHistory`)
- ESC 退出 Shell 模式

### 4.4 历史记录导航

```typescript
const MAX_HISTORY = 100

const [history, setHistory] = persisted(
  Persist.global("prompt-history", ["prompt-history.v1"]),
  createStore<{ entries: Prompt[] }>({ entries: [] })
)

const navigateHistory = (direction: "up" | "down") => {
  if (direction === "up") {
    // 保存当前输入 -> 显示上一条历史
  } else {
    // 显示下一条历史 -> 恢复保存的输入
  }
}
```

### 4.5 图片附件处理

**支持方式**：
1. 拖拽文件
2. Ctrl+V 粘贴
3. 点击附件按钮

```typescript
const ACCEPTED_FILE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]

const addImageAttachment = async (file: File) => {
  const reader = new FileReader()
  reader.onload = () => {
    const attachment: ImageAttachmentPart = {
      type: "image",
      id: crypto.randomUUID(),
      filename: file.name,
      mime: file.type,
      dataUrl: reader.result as string,
    }
    prompt.set([...prompt.current(), attachment], cursorPosition)
  }
  reader.readAsDataURL(file)
}
```

### 4.6 IME 输入法兼容

```typescript
const [composing, setComposing] = createSignal(false)

const isImeComposing = (event: KeyboardEvent) => 
  event.isComposing || composing() || event.keyCode === 229

// Shift+Enter 在 IME 检查之前处理
if (event.key === "Enter" && event.shiftKey) {
  addPart({ type: "text", content: "\n", start: 0, end: 0 })
  event.preventDefault()
  return
}

// IME 组合中，不处理 Enter
if (event.key === "Enter" && isImeComposing(event)) {
  return
}
```

### 4.7 占位符动画

```typescript
const PLACEHOLDERS = [
  "Fix a TODO in the codebase",
  "What is the tech stack of this project?",
  // ... 25 个提示语
]

createEffect(() => {
  const interval = setInterval(() => {
    setStore("placeholder", (prev) => (prev + 1) % PLACEHOLDERS.length)
  }, 6500)  // 每 6.5 秒切换
  onCleanup(() => clearInterval(interval))
})
```

---

## 五、UI 结构

```
┌─────────────────────────────────────────┐
│  @ / Popover 弹出菜单                    │
│  (文件列表 / 命令列表)                    │
├─────────────────────────────────────────┤
│  [图片附件预览区]                         │
│  ┌─────┐ ┌─────┐                        │
│  │ img │ │ img │                        │
│  └─────┘ └─────┘                        │
├─────────────────────────────────────────┤
│  contenteditable 输入区域                │
│                                         │
│  Ask anything... "Fix a TODO..."        │
│  (占位符动态轮换)                         │
│                                         │
│  @file.ts @agent 支持 Pills 样式         │
├─────────────────────────────────────────┤
│  [Agent▼] [Model▼] [Variant] [📎] [↑]  │
│  底部工具栏                              │
└─────────────────────────────────────────┘
```

---

## 六、关键设计模式总结

| 模式 | 说明 |
|------|------|
| **ContentEditable + 结构化数据** | DOM 与数据模型双向同步 |
| **光标位置精确管理** | 自定义 getCursor/setCursor |
| **渐进式 Popover** | 根据输入内容动态显示菜单 |
| **状态持久化** | 使用 localStorage 保存历史 |
| **IME 感知** | 正确处理中日韩输入法 |
| **乐观更新** | 发送消息时先更新 UI |

---

## 七、快速复用指南

如果要在自己的项目中实现类似功能：

### 7.1 最小实现

```tsx
// 1. ContentEditable 容器
<div
  contenteditable="true"
  onInput={handleInput}
  onKeyDown={handleKeyDown}
/>

// 2. 监听输入，检测 @ 和 /
const handleInput = () => {
  const text = editorRef.textContent
  if (text.match(/@\S*$/)) showAtMenu()
  if (text.match(/^\/\S*$/)) showSlashMenu()
}

// 3. 处理 Enter 提交
const handleKeyDown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}
```

### 7.2 注意事项

1. **光标管理复杂**：ContentEditable 的光标位置计算比 input 复杂很多
2. **IME 处理**：必须监听 `compositionstart/end` 事件
3. **Pills 不可编辑**：设置 `contenteditable="false"`
4. **零宽字符**：使用 `\u200B` 处理空行

---

## 八、参考资源

- **仓库地址**：https://github.com/anomalyco/opencode
- **SolidJS 文档**：https://www.solidjs.com/
- **ContentEditable MDN**：https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable

---

*文档生成时间：2026-01-15*
*OpenCode 版本：v1.1.21*
