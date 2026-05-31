# Quickstart

## 1. 安装

```bash
cd /Users/bytedance/claude-code/workdoc_runtime_impl
npm install
pip install -r requirements.txt
```

如需指定 Python：

```bash
export SHOOK_PYTHON=/path/to/python
```

## 2. 配置环境变量

复制模板：

```bash
cp env.example.txt .env
```

常用变量：

```text
LLM_PROVIDER=aicoding|openai|gemini|claude|kimi
AICODING_API_KEY=...
AICODING_MODEL=gpt-5.4
AICODING_RESPONSES_URL=https://aicoding.0011.ai/v1/responses
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
KIMI_API_KEY=...
LLM_MODEL=...
SHOOK_SKIP_ANIM=1
SHOOK_MESSAGE_SPACING=1
```

## 3. 验证构建

```bash
npm run typecheck
npm run build
```

## 4. 启动

```bash
./shook
```

无动画启动：

```bash
SHOOK_SKIP_ANIM=1 ./shook --no-banner
```

执行单条命令：

```bash
./shook --exec "/get-news"
```

## 5. 常用固定工作流

```bash
./shook --exec "/get-news"
./shook --exec "/get-news --date 2026-05-30"
./shook --exec "/predict-btc"
./shook --exec "/runway list"
```

交互模式里可用：

```text
/focus set TEXT
/todo add TEXT
/todo list
/save NAME
/load NAME
/sessions
/tools refresh
/refresh
/detail
```

显式 shell：

```text
!git status
!npm run typecheck
```

## 6. 状态文件

Shook 会写入本地运行态：

```text
.shook/latest.json
.shook/todos.json
.shook/workflows.json
.shook/sessions/
```

这些文件不进入 Git。示例文件在 `docs/examples/shook/`。

## 7. 工具列表

```bash
python3 - <<'PY'
from langgraph.tools.registry import get_default_registry
registry = get_default_registry()
for tool in registry:
    schema = tool.get_schema()
    print(schema.name, schema.category.value)
PY
```
