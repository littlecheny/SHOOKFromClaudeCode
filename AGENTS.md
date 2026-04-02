#  агенты.md

本文档为 `shook` 项目提供了一个高层次的架构概览，旨在帮助开发人员、代理或新用户快速理解代码库的结构、设计原则和核心功能。

## 1. 项目概览

`shook` 是一个采用 LangGraph 架构实现多 Agent 编排的个人助理项目。它旨在通过模块化的设计，将不同的功能（如新闻抓取、金融数据分析）封装成独立的工具，并通过一个统一的编排层进行调度。

### 核心架构

项目分为两套核心系统：

1.  **LangGraph 编排层 (`langgraph/`)**: 这是项目的核心，负责 Agent 的定义、工具的注册与调用、记忆管理和系统监控。所有新的、需要协同工作的复杂任务都应在此框架下开发。
2.  **传统脚本层 (`scripts/`)**: 包含一系列独立的命令行工具。这些脚本通常用于执行单一、独立的任务，并正在逐步迁移到 LangGraph 架构中。

## 2. 构建与命令

项目在 `conda` 的 `Shook` 虚拟环境中运行。

### 主要命令

**LangGraph CLI**

```bash
# 激活虚拟环境
conda activate Shook

# 列出所有可用工具
python -m langgraph list-tools

# 启动交互式聊天
python -m langgraph chat

# 测试单个工具
python -m langgraph test-tool <tool_name> [params]
```

**传统脚本**

```bash
# 运行主入口（交互式）
./shook

# 生成每日新闻简报（测试模式）
./shook --exec "/get-news --dry-run"

# 运行 DXY 演示
python scripts/dxy/demo.py
```

## 3. 代码风格

### 工具层开发

-   **工具 (Tools)**:
    -   新增工具应在 `langgraph/tools/` 目录下创建，并继承自 `BaseTool`。
    -   工具必须在 `langgraph/tools/registry.py` 中注册才能被 Agent 使用。
    -   使用 `ToolCategory` (`readonly`, `side_effect`, `expensive`) 对工具进行分类，以明确其行为。
-   **模块化**:
    -   当前仅保留 `tools`、`memory`、`observability` 作为 Python 资产层。

### 传统脚本开发

-   新增的命令逻辑应优先放在 TS runtime 中，由 `runtime/cli.ts` 统一路由。
-   Python 仅承担工具执行与独立脚本职责，不再承担主交互 UI。

### 通用规范

-   **LLM 调用**:
    -   所有与大语言模型 (LLM) 的交互都通过 `runtime/modelClient.ts` 统一封装。
    -   Python 侧不再保留独立的 LLM 客户端抽象层。
-   **Playwright 脚本**:
    -   网页自动化脚本应使用 Playwright Inspector 辅助开发，确保一次性成功率，减少调试成本。

## 4. 测试

-   **工具测试**: LangGraph 框架提供了 `test-tool` 命令，用于独立测试每个工具的功能。
-   **流程测试**: 对于编排流程，建议编写端到端的测试脚本，模拟真实的用户输入和预期的输出。
-   **网页脚本**: 网页自动化脚本在开发完成后，应直接运行以验证其功能，而不是编写独立的测试文件。

## 5. 安全

-   **凭证管理**:
    -   API 密钥、密码等敏感信息应通过环境变量进行配置。
-   **工具安全**:
    -   `side_effect` 和 `expensive` 类型的工具在执行前应有明确的提示或确认机制，以防止意外操作或高昂的成本。
-   **数据保护**:
    -   处理用户数据（例如 Notion、社交媒体）时，应遵守平台的服务条款，并确保数据的隐私和安全。

## 6. 配置

-   **运行环境**: 所有依赖项均通过 `conda` 在 `Shook` 虚拟环境中管理。
-   **LLM 配置**: LLM 的配置优先从环境变量中读取，例如 `GEMINI_API_KEY` 和 `LLM_MODEL`。
-   **Feeds 配置**: RSS/Atom 源的 URL 在 `scripts/orchestrator/feeds.yaml` 文件中进行管理。
-   **UI 资源**: 启动动画帧、monster 图案和 dashboard 配置都存放在 `runtime/ui/` 目录下。
