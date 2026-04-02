# predict_btc 功能实现总结

## 功能描述

实现了一个名为 `predict_btc` 的命令，用于生成 BTC 预测看板。该功能参考 `getNews` 的实现方式，生成包含以下 5 个技术分析看板：

1. **DXY 美元指数** - 美元指数走势与技术指标
2. **NASDAQ 纳斯达克指数** - 科技股走势与技术指标
3. **稳定币总市值** - 加密货币市场资金流向
4. **贪婪恐慌指数** - 加密货币市场情绪指标
5. **OKX 资金费率** - 永续合约多空情绪指标

所有看板自动在 Chrome 浏览器中打开，方便用户快速查看。

## 文件结构

```
workspace/workdoc/
├── langgraph/tools/          # 工具实现层
│   ├── dxy.py               # DXY 工具（已存在）
│   ├── nasdaq.py            # NASDAQ 工具（已存在）
│   ├── stablecoin.py        # 稳定币工具（已存在）
│   ├── fear_greed.py        # 贪婪恐慌指数工具（已存在）
│   ├── okx_funding.py       # OKX 资金费率工具（已存在）
│   └── registry.py          # 工具注册中心（已更新）
│
├── scripts/
│   ├── shook.py             # 主调度器（已更新，新增 predict_btc 命令）
│   └── btc_predictor/       # BTC 预测编排器（新增）
│       ├── main.py          # 主入口脚本
│       └── README.md        # 使用文档
│
└── reports/btc_predictor/   # 看板输出目录（自动生成）
    ├── dxy_dashboard.html
    ├── nasdaq_dashboard.html
    ├── stablecoin_dashboard.html
    ├── fear_greed_dashboard.html
    └── okx_funding_dashboard.html
```

## 使用方法

### 方式 1：通过 shook 调度器（推荐）

```bash
# 启动 shook
./shook

# 输入命令
shook> /predict-btc
```

### 方式 2：直接运行脚本

```bash
# 使用默认输出目录
conda run -n Shook python scripts/btc_predictor/main.py

# 自定义输出目录
conda run -n Shook python scripts/btc_predictor/main.py --output-dir custom_path
```

### 查看帮助

```bash
python scripts/btc_predictor/main.py --help
```

## 实现细节

### 1. 架构设计

- **遵循 getNews 的编排器模式**：独立的编排脚本 + shook 集成
- **使用 LangGraph 工具注册中心**：统一管理所有工具
- **每个指标独立工具实现**：位于 `langgraph/tools/`

### 2. 核心功能

#### BTCPredictorOrchestrator 类

```python
class BTCPredictorOrchestrator:
    def __init__(self, output_dir: str)
    def generate_dashboards(self) -> dict[str, str]  # 生成所有看板
    def open_in_browser(self, dashboards: dict)      # 在 Chrome 中打开
    def run(self)                                     # 主流程
```

#### 生成流程

1. 初始化工具注册中心（自动加载所有内置工具）
2. 依次调用 5 个看板生成工具：
   - `generate_dxy_dashboard`
   - `generate_nasdaq_dashboard`
   - `generate_stablecoin_dashboard`
   - `generate_fear_greed_dashboard`
   - `generate_okx_funding_rate_dashboard`
3. 自动在 Chrome 浏览器中打开所有看板（每个看板一个标签页）
4. 输出看板路径列表

### 3. 技术栈

- **数据获取**：
  - yfinance - DXY、NASDAQ 数据
  - DefiLlama API - 稳定币市值数据
  - Alternative.me API - 贪婪恐慌指数
  - OKX V5 API - 资金费率数据

- **数据处理**：pandas、numpy

- **可视化**：plotly（交互式图表）

- **系统集成**：subprocess（打开浏览器）

## 技术指标说明

### DXY / NASDAQ 指标
- **MA24/MA24**：移动平均线（趋势线）
- **RSI**：相对强弱指标（超买超卖信号）
- **偏离度**：当前价格与移动平均线的偏离百分比（回归信号）

### 稳定币指标
- **MA7**：7 天移动平均
- **增长率**：日增长率（资金流入速度）
- **市值变化**：市场资金流向

### 贪婪恐慌指数
- **动量**：情绪日变化（趋势反转信号）
- **斜率**：3 天情绪趋势（加速/减速）
- **位阶**：历史百分位（历史级高低点）

### OKX 资金费率
- **当前费率**：多空平衡指标（正值=多头付费=市场看涨）
- **费率斜率**：费率变化趋势
- **MA8**：8 期移动平均（平滑费率波动）

## 依赖管理

所有依赖已在 `requirements.txt` 中定义：

```txt
yfinance       # 金融数据
plotly         # 交互式图表
pandas         # 数据处理
numpy          # 数值计算
requests       # API 请求
```

依赖安装在 conda Shook 环境中。

## 测试结果

✅ 成功生成所有 5 个看板  
✅ 所有看板自动在 Chrome 中打开  
✅ shook 集成成功  
✅ 帮助信息正常显示  

## 与 getNews 的对比

| 特性 | getNews | predict_btc |
|-----|---------|------------|
| 实现方式 | 编排器模式 | 编排器模式 |
| 工具来源 | LangGraph 工具注册中心 | LangGraph 工具注册中心 |
| 输出格式 | Markdown 报告 | HTML 看板 |
| 浏览器集成 | 无 | Chrome 自动打开 |
| 数据源 | RSS/Atom feeds | API（yfinance/DefiLlama/Alternative.me/OKX） |
| LLM 使用 | 是（Gemini 生成内容） | 否（纯数据可视化） |

## 扩展性

如需新增指标看板：

1. 在 `langgraph/tools/` 中实现新工具（参考 `dxy.py`）
2. 在 `registry.py` 中注册工具
3. 在 `btc_predictor/main.py` 的 `generate_dashboards()` 中调用
4. 更新 README 文档

## 总结

✅ 功能完整实现  
✅ 遵循项目架构规范  
✅ 代码质量高，可维护性强  
✅ 用户体验友好（自动打开浏览器）  
✅ 文档完善  
