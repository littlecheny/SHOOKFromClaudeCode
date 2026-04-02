# 个人智能秘书（Shook）—— 基于 LangGraph 工具层

项目名称：**Shook** (TS 主控 runtime + Python 工具负载层)

目标：**自动化个人任务，包括每日新闻生成、金融数据监控**。

---

## 核心架构

当前采用 **TS runtime + Python worker** 架构，LangGraph 仅保留工具层。

### 三层入口/执行架构

1. **TS Runtime 层** (`runtime/`) - Node.js/TypeScript 入口、命令解析、自然语言对话、Context Canvas
2. **Python Worker 层** (`scripts/shook_worker.py`) - 负责桥接 Python 工具与 shell 执行
3. **工具与脚本层** (`langgraph/tools/` + `scripts/`) - 数据抓取、Runway、BTC 分析等能力

### 关键特性

- **工具层统一管理**：所有外部能力（RSS、Notion、GitHub、金融数据等）通过 `langgraph/tools/` 暴露
- **TS Runtime + Python Worker**：默认入口由 TypeScript runtime 驱动，通过 JSON over stdio 调用 Python worker
- **工具注册中心**：通过 `get_default_registry()` 获取和管理所有工具
- **标准化返回**：所有工具返回 `ToolResult(success, data, error)`
- **Context Canvas**：在顶部 Dashboard 下方实时显示 Focus、工作记忆、待办与最近动作
- **会话快照**：支持 `/save`、`/load`、`/sessions`，把当前工作上下文存入 `.shook/sessions/`
- **UI 资源文件化**：启动动画帧与 dashboard 图案已抽到 `runtime/ui/`，不再依赖旧版 Python UI 文件

---

## 目录结构

```text
.
├── langgraph/                    # LangGraph 工具层（保留）
│   ├── tools/                    # 工具层（直接实现）
│   │   ├── base.py              # 工具基类
│   │   ├── registry.py          # 工具注册中心
│   │   ├── news.py              # RSS/Atom 新闻采集
│   │   ├── store.py             # Notion 存储
│   │   ├── github.py            # Git 提交推送
│   │   ├── dxy.py               # DXY（美元指数）数据
│   │   ├── farside_btc.py       # FARSIDE BTC 数据
│   │   ├── fear_greed.py        # 恐惧贪婪指数
│   │   ├── nasdaq.py            # 纳斯达克指数
│   │   ├── okx_funding.py       # OKX 资金费率
│   │   ├── okx_futures.py       # OKX 期货数据
│   │   ├── okx_spot.py          # OKX 现货数据
│   │   ├── stablecoin.py        # 稳定币数据
│   │   ├── reminders.py         # macOS 提醒事项
│   │   ├── xhs*.py              # 小红书工具
│   │   ├── douyin*.py           # 抖音工具
│   │   └── *.md                 # 工具使用文档
│   ├── memory/                   # 记忆层（历史资产）
│   ├── observability/            # 监控层
│   ├── __init__.py
│
├── runtime/                      # TS runtime 入口
│   ├── cli.ts                   # 交互式命令循环
│   ├── contextCanvas.ts         # Context Canvas 语义画布
│   ├── getNews.ts               # getNews 工作流（迁移到 runtime）
│   ├── modelClient.ts           # TS 侧模型客户端
│   ├── protocol.ts              # runtime / worker 协议类型
│   ├── queryLoop.ts             # 对话与工具编排
│   ├── statePersistence.ts      # 会话快照、notes、todos
│   ├── ui/                      # UI 资源文件
│   │   ├── dashboard.json
│   │   ├── frames.json
│   │   └── monster.txt
│   └── workerClient.ts          # Python worker 客户端
│
├── scripts/                      # 脚本入口
│   ├── shook_worker.py          # TS runtime 的 Python worker
│   ├── runway.py                # Runway 项目管理
│   │
│   ├── orchestrator/            # 每日新闻数据资源
│   │   ├── feeds.yaml           # RSS/Atom 源配置
│   │   ├── policy/              # 策略配置
│   │   └── report_template.md   # 报告模板
│   │
│   ├── btc_predictor/           # BTC 预测分析
│   ├── dxy/                     # DXY（美元指数）工具
│   ├── farside_btc/             # FARSIDE BTC 工具
│   ├── fear_greed/              # 恐惧贪婪指数工具
│   ├── nasdaq/                  # 纳斯达克工具
│   ├── okx_funding/             # OKX 资金费率工具
│   ├── stablecoin/              # 稳定币工具
│   │
│   ├── com.personal.dailynews.plist  # macOS Launchd 配置
│   ├── install_launchd.sh       # Launchd 安装脚本
│   └── term-image.py            # 终端图片显示
│
├── reports/                      # 每日报告归档
│   ├── YYYY-MM-DD.md            # 每日新闻简报
│   └── btc_predictor/           # BTC 预测报告
│
├── logs/                         # 日志与截图
│   ├── orchestrator.log          # 编排器日志
│   └── screenshots/             # 工具截图
│       ├── xhs/                 # 小红书截图
│       └── douyin/              # 抖音截图
│
├── 启动动画/                     # 启动动画资源
│
├── .cursor/                      # Cursor IDE 配置
├── openclaw_skills/              # OpenClaw 技能
│
├── package.json                  # TS runtime 依赖与脚本
├── tsconfig.json                 # TypeScript 构建配置
├── requirements.txt              # Python 依赖
├── env.example.txt               # 环境变量模板
├── runway_projects.json          # Runway 项目配置
├── RUNAWAY_USAGE.md              # Runway 使用文档
├── QUICKSTART.md                 # 快速启动指南
└── README.md                     # 本文档
```

---

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
npm install
```

### 2. 配置环境变量

```bash
cp env.example.txt .env
# 编辑 .env，填入必要配置：
# - GEMINI_API_KEY: Gemini API 密钥
# - NOTION_TOKEN: Notion Integration Token
# - NOTION_DATABASE_ID: Notion 数据库 ID
# - GIT_REPO_PATH: Git 仓库路径（可选，默认项目根目录）
```

### 3. 运行命令

```bash
# 启动默认 TS runtime
./shook

# Context Canvas 示例
/focus set 写周报
/note add 记得关注DXY
/todo add 生成日报
/save morning-brief
/sessions

# 生成每日新闻（测试模式）
./shook --exec "/get-news --dry-run"

# 列出所有工具
python -m langgraph list-tools

# 测试单个工具
python -m langgraph test-tool get_dxy

# DXY 演示
python scripts/dxy/demo.py

# BTC 预测
python scripts/btc_predictor/main.py
```

---

## 核心功能

### 每日新闻智能秘书

自动从 RSS/Atom 源拉取新闻，由 TS runtime 调用主模型总结，生成报告并推送到 GitHub：

```bash
# 测试模式（不推送）
./shook --exec "/get-news --dry-run"

# 正式运行
./shook --exec "/get-news"

# 指定日期
./shook --exec "/get-news --date 2026-01-01"
```

**工作流程**：
1. 从 `feeds.yaml` 拉取 RSS/Atom 新闻（`fetch_feeds` 工具）
2. 从 Notion 获取已看过的条目（`get_seen` 工具）
3. 过滤去重后，调用 LLM 生成报告
4. 保存到 `reports/YYYY-MM-DD.md`
5. 提交并推送到 GitHub（`commit_and_push` 工具）
6. 可选择推送到 GitHub（`commit_and_push` 工具）

### 金融数据监控

支持多种金融数据源的监控和分析：

```bash
# DXY（美元指数）演示
python scripts/dxy/demo.py
python scripts/dxy/generate_report.py -p 1mo

# 恐惧贪婪指数
python scripts/fear_greed/demo.py
python scripts/fear_greed/generate_report.py

# FARSIDE BTC 数据
python scripts/farside_btc/demo.py

# 纳斯达克指数
python scripts/nasdaq/demo.py
python scripts/nasdaq/generate_report.py

# OKX 资金费率
python scripts/okx_funding/generate_report.py

# 稳定币数据
python scripts/stablecoin/demo.py
python scripts/stablecoin/generate_report.py

# BTC 预测分析（综合多个数据源）
python scripts/btc_predictor/main.py
```

### Context Canvas 工作流

在新 runtime 里，顶部 Dashboard 下方会出现一个 **Context Canvas**，它会持续汇总：

- 当前 Focus
- 最近提问 / 回答 / 动作
- 最近几条工作记忆
- 当前待办状态

常用命令：

```bash
/focus set 写周报
/note add 记得关注DXY
/todo add 生成日报
/todo done 1
/save weekly-brief
/load weekly-brief
/sessions
```

## 工具列表

通过 `python -m langgraph list-tools` 查看所有可用工具：

**新闻采集**：
- `fetch_feed` - 单个 RSS/Atom 源拉取
- `fetch_feeds` - 多个源批量拉取

**存储去重**（Notion）：
- `get_seen` - 获取已看过的条目
- `mark_seen` - 标记为已看
- `mark_report_use` - 标记简报使用

**Git 操作**：
- `commit_and_push` - 提交并推送

**金融数据**：
- `get_dxy` - 获取美元指数数据
- `get_dxy_info` - 获取 DXY 基本信息
- `get_farside_btc` - 获取 FARSIDE BTC 数据
- `get_fear_greed` - 获取恐惧贪婪指数
- `get_nasdaq` - 获取纳斯达克指数
- `get_okx_funding` - 获取 OKX 资金费率
- `get_okx_futures` - 获取 OKX 期货数据
- `get_okx_spot` - 获取 OKX 现货数据
- `get_stablecoin` - 获取稳定币数据


**提醒事项**（macOS）：
- `create_reminder` - 创建提醒
- `list_reminder_lists` - 列出提醒列表

---

## 环境变量说明

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `GEMINI_API_KEY` | Gemini API 密钥 | 是（使用 LLM 时） |
| `LLM_PROVIDER` | LLM 提供商（gemini/openai/custom） | 否（默认 gemini） |
| `LLM_MODEL` | LLM 模型名称 | 否（根据 provider 有默认值） |
| `NOTION_TOKEN` | Notion Integration Token | 是（使用 Notion 工具时） |
| `NOTION_DATABASE_ID` | Notion 数据库 ID | 是（使用 Notion 工具时） |
| `GIT_REPO_PATH` | Git 仓库路径 | 否（默认项目根目录） |
| `CDP_ENDPOINT` | Chrome DevTools Protocol 端点 | 否（默认 `http://127.0.0.1:9222`） |
| `LOG_LEVEL` | 日志级别 | 否（默认 `INFO`） |

---

## 配置文件说明

### LLM 配置

当前统一由 TS runtime 读取环境变量：

```bash
GEMINI_API_KEY=...
LLM_MODEL=gemini-2.5-flash
```

**配置优先级（高到低）**：
1. 函数参数
2. 环境变量 (LLM_PROVIDER, LLM_MODEL, GEMINI_API_KEY 等)
3. 配置文件
4. 默认值

### 新闻源配置（scripts/orchestrator/feeds.yaml）

```yaml
ai:
  - name: "阮一峰的网络日志"
    url: "http://www.ruanyifeng.com/blog/atom.xml"

github:
  - name: "官方博客"
    url: "https://github.blog/feed"
  - name: "Trending Repos"
    url: "https://github.com/trending.rss"
```

---

## 定时任务（macOS Launchd）

项目提供了 macOS Launchd 配置，可以定时运行每日新闻生成：

```bash
# 安装 Launchd 任务
./scripts/install_launchd.sh

# 查看任务状态
launchctl list | grep personal.dailynews

# 卸载任务
launchctl unload ~/Library/LaunchAgents/com.personal.dailynews.plist
```

---

## 开发规范

### 新增工具

1. 在 `langgraph/tools/` 下创建文件，继承 `BaseTool`
2. 实现必要属性：`name`, `description`, `input_schema`, `category`
3. 实现 `execute()` 方法，返回 `ToolResult`
4. 在 `registry.py` 中注册工具

### 新增命令

1. 在 `scripts/` 下创建新文件
2. 通过 `get_default_registry()` 获取工具
3. 在 `shook.py` 中添加命令入口

---

## 参考文档

- [QUICKSTART.md](QUICKSTART.md) - 快速启动指南
- [RUNAWAY_USAGE.md](RUNAWAY_USAGE.md) - Runway 使用文档
- [.cursor/rules/arch.mdc](.cursor/rules/arch.mdc) - 架构详细说明
- [langgraph/tools/XHS_POST_USAGE.md](langgraph/tools/XHS_POST_USAGE.md) - 小红书使用指南
- [langgraph/tools/FARSIDE_BTC_USAGE.md](langgraph/tools/FARSIDE_BTC_USAGE.md) - FARSIDE BTC 使用指南
- [scripts/btc_predictor/README.md](scripts/btc_predictor/README.md) - BTC 预测器文档

---

## License

MIT
