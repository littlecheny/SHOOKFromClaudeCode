# 快速启动指南

本文档帮助你快速启动"个人智能秘书 Shook"项目。

---

## 项目结构

```
.
├── README.md                          # 项目说明文档
├── QUICKSTART.md                      # 本文档
├── RUNAWAY_USAGE.md                   # Runway 使用文档
├── requirements.txt                   # Python 全局依赖
├── env.example.txt                    # 环境变量模板
├── .gitignore                         # Git 忽略规则
│
├── langgraph/                         # LangGraph 编排层
│   ├── tools/                        # 工具层（核心）
│   │   ├── base.py                   # 工具基类
│   │   ├── registry.py               # 工具注册中心
│   │   ├── news.py                   # RSS/Atom 新闻采集
│   │   ├── store.py                  # Notion 存储
│   │   ├── github.py                 # Git 提交推送
│   │   ├── dxy.py                    # DXY（美元指数）数据
│   │   ├── farside_btc.py            # FARSIDE BTC 数据
│   │   ├── fear_greed.py             # 恐惧贪婪指数
│   │   ├── nasdaq.py                 # 纳斯达克指数
│   │   ├── okx_funding.py            # OKX 资金费率
│   │   ├── okx_futures.py            # OKX 期货数据
│   │   ├── okx_spot.py               # OKX 现货数据
│   │   ├── stablecoin.py             # 稳定币数据
│   │   ├── xhs*.py                   # 小红书工具
│   │   ├── douyin*.py                # 抖音工具
│   │   ├── reminders.py              # macOS 提醒事项
│   │   └── *.md                      # 工具使用文档
│   ├── memory/                        # 记忆层
│   ├── observability/                 # 监控层
│   ├── __init__.py
│   ├── __main__.py
│   └── run.py
│
├── runtime/                           # TS runtime 入口
│   ├── cli.ts                         # 交互式命令循环
│   ├── contextCanvas.ts               # 语义画布
│   ├── getNews.ts                     # getNews 工作流
│   ├── modelClient.ts                 # 主 runtime 模型客户端
│   ├── protocol.ts                    # runtime / worker 协议
│   ├── queryLoop.ts                   # 对话工具回路
│   ├── statePersistence.ts            # 会话快照
│   ├── ui/                            # UI 资源文件
│   └── workerClient.ts                # Python worker 客户端
│
├── scripts/                           # 脚本入口
│   ├── shook_worker.py               # TS runtime 的 Python worker
│   ├── runway.py                     # Runway 项目管理
│   │
│   ├── orchestrator/                 # 每日新闻数据资源
│   │   ├── feeds.yaml                # RSS/Atom 源配置
│   │   ├── policy/                   # 策略配置
│   │   └── report_template.md        # 报告模板
│   │
│   ├── btc_predictor/                # BTC 预测分析
│   │   ├── README.md
│   │   ├── IMPLEMENTATION.md
│   │   └── main.py
│   ├── dxy/                           # DXY 示例脚本
│   │   ├── demo.py                   # 完整演示
│   │   └── generate_report.py        # 简报生成器
│   ├── farside_btc/                   # FARSIDE BTC 工具
│   │   ├── README.md
│   │   ├── IMPLEMENTATION.md
│   │   └── demo.py
│   ├── fear_greed/                    # 恐惧贪婪指数工具
│   │   ├── demo.py
│   │   └── generate_report.py
│   ├── nasdaq/                        # 纳斯达克工具
│   │   ├── demo.py
│   │   └── generate_report.py
│   ├── okx_funding/                   # OKX 资金费率工具
│   │   └── generate_report.py
│   ├── stablecoin/                    # 稳定币工具
│   │   ├── demo.py
│   │   └── generate_report.py
│   │
│   ├── com.personal.dailynews.plist  # macOS Launchd 配置
│   ├── install_launchd.sh            # Launchd 安装脚本
│   └── term-image.py                 # 终端图片显示
│
├── docs/                              # 文档
│   ├── opencode-prompt-input-implementation.md
│   └── opencode-prompt-input.tsx
│
├── reports/                           # 每日报告归档（自动生成）
│   ├── YYYY-MM-DD.md                 # 每日新闻简报
│   └── btc_predictor/                # BTC 预测报告
│
├── logs/                              # 日志与截图
│   ├── orchestrator.log               # 编排器日志
│   └── screenshots/                   # 工具截图
│       ├── xhs/                       # 小红书截图
│       └── douyin/                    # 抖音截图
│
├── 启动动画/                          # 启动动画资源
│
├── .cursor/                           # Cursor IDE 配置
├── openclaw_skills/                   # OpenClaw 技能
│
├── package.json                       # TS runtime 依赖与脚本
├── tsconfig.json                      # TypeScript 构建配置
├── runway_projects.json               # Runway 项目配置
└── shook                              # 快捷启动脚本
```

---

## 一、前置准备

### 1. 检查 Python 版本

```bash
python3 --version
# 需要 Python 3.8 或更高版本
```

### 2. 安装依赖

```bash
# 进入项目目录
cd /Users/bytedance/workdoc

# 安装 Python 依赖
pip3 install -r requirements.txt

# 安装 TS runtime 依赖
npm install

# 如果使用小红书/抖音工具，安装 Playwright 浏览器
playwright install chromium
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp env.example.txt .env

# 编辑 .env 文件，填入真实配置
vim .env  # 或使用其他编辑器
```

需要配置的变量：

- `GEMINI_API_KEY`: 从 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取
- `LLM_PROVIDER`: LLM 提供商（gemini/openai/custom），可选
- `LLM_MODEL`: LLM 模型名称，可选
- `NOTION_TOKEN`: 见 [docs/notion_setup.md](docs/notion_setup.md)
- `NOTION_DATABASE_ID`: 见 [docs/notion_setup.md](docs/notion_setup.md)
- `GIT_REPO_PATH`: 本项目路径（可选，默认项目根目录）
- `CDP_ENDPOINT`: Chrome 远程调试端点（默认 `http://127.0.0.1:9222`）

### 4. 配置 Notion 数据库

**请仔细阅读并完成：**[docs/notion_setup.md](docs/notion_setup.md)

---

## 二、配置信息源

编辑 `scripts/orchestrator/feeds.yaml`，添加你想订阅的 RSS/Atom 源：

```yaml
ai:
  - name: "OpenAI Blog"
    url: "https://openai.com/blog/rss"
  - name: "Hugging Face Blog"
    url: "https://huggingface.co/blog/feed.xml"

jobs:
  - name: "某公司招聘动态"
    url: "https://company.com/careers/rss"

github:
  - name: "Python Releases"
    url: "https://github.com/python/cpython/releases.atom"
  - name: "Trending Repos"
    url: "https://github.com/trending.rss"
```

**如何找 RSS 源**：
- 网站页脚常有 RSS 图标或链接
- 尝试访问：`网站域名/feed`、`/rss`、`/atom.xml`
- GitHub 项目：`https://github.com/owner/repo/releases.atom`

---

## 三、测试运行

### 1. 测试 TS runtime 入口

```bash
cd /Users/bytedance/workdoc
npm run build
printf 'help\nexit\n' | ./shook --no-banner
```

### 2. 查看可用工具

```bash
# 列出所有注册的工具
python -m langgraph list-tools

# 应该看到：fetch_feeds, get_seen, mark_seen, commit_and_push,
# get_dxy, get_farside_btc, get_fear_greed, get_nasdaq,
# get_okx_funding, get_stablecoin, xhs_post_text, douyin_like_video, 等
```

### 3. 测试单个工具

```bash
# 测试 DXY 工具
python -m langgraph test-tool get_dxy

# 测试恐惧贪婪指数工具
python -m langgraph test-tool get_fear_greed

# 测试新闻拉取（需要配置 feeds.yaml）
python -m langgraph test-tool fetch_feeds '{"feeds": [{"name": "Test", "url": "https://example.com/feed"}]}'
```

### 4. 测试每日新闻生成（推荐先测试）

```bash
cd /Users/bytedance/workdoc

# 测试模式（不会推送到 GitHub）
./shook --exec "/get-news --dry-run"

# 查看生成的报告
cat reports/$(date +%Y-%m-%d).md
```

### 5. 测试金融数据工具

```bash
# DXY（美元指数）演示
python scripts/dxy/demo.py

# 恐惧贪婪指数演示
python scripts/fear_greed/demo.py

# FARSIDE BTC 演示
python scripts/farside_btc/demo.py

# 纳斯达克演示
python scripts/nasdaq/demo.py

# 稳定币演示
python scripts/stablecoin/demo.py

# BTC 预测分析（综合多个数据源）
python scripts/btc_predictor/main.py
```

### 6. 正式运行

```bash
# 正式运行
./shook --exec "/get-news"

# 指定日期运行
./shook --exec "/get-news --date 2026-01-01"
```

---

## 四、使用交互式调度器

```bash
# 启动默认 TS runtime
./shook

# 在 shook> 提示符下可执行：
shook> /get-news --dry-run      # 生成每日新闻
shook> /runway list             # 列出 Runway 项目
shook> !python scripts/dxy/demo.py  # 运行 DXY 演示
shook> /help                    # 查看帮助
shook> /exit                    # 退出
```

---

## 六、定时任务（macOS Launchd）

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

## 七、查看日志

```bash
# 编排器日志
tail -f logs/orchestrator.log

# 查看截图（调试用）
open logs/screenshots/xhs/        # 小红书截图
open logs/screenshots/douyin/     # 抖音截图
```

---

## 八、常见问题

### Q1: 工具列表为空？

**原因**：Python 路径问题或依赖未安装

**解决**：
```bash
# 确保在项目根目录
cd /Users/bytedance/workdoc

# 重新安装依赖
pip3 install -r requirements.txt

# 检查导入
python3 -c "from langgraph.tools.registry import get_default_registry; print(len(get_default_registry()))"
```

### Q3: 每日新闻生成失败？

**原因**：环境变量未配置或 Notion 连接失败

**解决**：
1. 检查 `.env` 文件配置
2. 确认 `feeds.yaml` 中的 RSS 源可访问
3. 参考 [docs/notion_setup.md](docs/notion_setup.md) 配置 Notion
4. 运行 `--dry-run` 查看详细日志

### Q4: Notion 连接失败？

请仔细阅读 [docs/notion_setup.md](docs/notion_setup.md)，确认：
- Integration Token 正确
- Database ID 正确
- Integration 已被授权访问数据库

### Q5: Git 推送失败？

**原因**：GIT_REPO_PATH 配置错误

**解决**：
- 删除或注释掉 .env 中的 GIT_REPO_PATH，使用项目根目录
- 或设置为正确的本地仓库路径（不是 GitHub URL）

### Q6: 金融数据工具返回错误？

**原因**：网络问题或数据源变动

**解决**：
- 检查网络连接
- 查看对应工具的 README 或 IMPLEMENTATION.md 文档
- 检查数据源是否仍然可用

---

## 九、下一步

- 配置定时任务：使用 launchd（macOS）或 cron（Linux）定时运行 `./shook --exec "/get-news"`
- 探索更多工具：`python -m langgraph list-tools`
- 开发自定义工具：参考 `langgraph/tools/` 下的示例
- 阅读架构文档：[.cursor/rules/arch.mdc](.cursor/rules/arch.mdc)
- 阅读金融工具文档：查看 `scripts/btc_predictor/README.md` 等

---

## 十、参考文档

- [README.md](README.md) - 项目整体说明
- [RUNAWAY_USAGE.md](RUNAWAY_USAGE.md) - Runway 使用文档
- [langgraph/tools/FARSIDE_BTC_USAGE.md](langgraph/tools/FARSIDE_BTC_USAGE.md) - FARSIDE BTC 使用指南
- [scripts/btc_predictor/README.md](scripts/btc_predictor/README.md) - BTC 预测器文档
- [.cursor/rules/arch.mdc](.cursor/rules/arch.mdc) - 架构详细说明

---

祝你使用愉快！
