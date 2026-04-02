# BTC 预测看板生成器

生成包含以下指标的 BTC 预测技术分析看板：

1. **DXY 美元指数** - 美元指数走势、MA24、RSI、偏离度
2. **NASDAQ 纳斯达克指数** - 科技股走势、MA24、RSI、偏离度
3. **稳定币总市值** - 市场资金流向、MA7、RSI、偏离度
4. **贪婪恐慌指数** - 市场情绪、动量、斜率、位阶
5. **OKX 资金费率** - 合约多空情绪、费率斜率、MA8
6. **Bitcoin 现货价格** - BTC-USDT 现货价格、MA24、RSI、偏离度
7. **Bitcoin 合约价格** - BTC-USDT-SWAP 合约价格、MA24、RSI、偏离度
8. **Farside BTC 截图** - 比特币资金流向可视化

## 使用方法

### 1. 通过 shook 调度器（推荐）

```bash
# 进入 shook 交互式命令行
./shook

# 输入命令
shook> /predict-btc
```

### 2. 直接运行脚本

```bash
# 使用默认输出目录（自动生成带时间戳的目录）
/opt/homebrew/Caskroom/miniconda/base/envs/Shook/bin/python scripts/btc_predictor/main.py

# 自定义输出目录
/opt/homebrew/Caskroom/miniconda/base/envs/Shook/bin/python scripts/btc_predictor/main.py --output-dir custom_path
```

## 输出

脚本会自动创建带时间戳的文件夹（格式：`btc_predictor_YYYYMMDD_HHMMSS`），并生成以下文件：

- `dxy_dashboard.html` - DXY 美元指数看板
- `nasdaq_dashboard.html` - NASDAQ 纳斯达克指数看板
- `stablecoin_dashboard.html` - 稳定币总市值看板
- `fear_greed_dashboard.html` - 贪婪恐慌指数看板
- `okx_funding_dashboard.html` - OKX 资金费率看板
- `btc_spot_dashboard.html` - Bitcoin 现货价格看板
- `btc_futures_dashboard.html` - Bitcoin 合约价格看板
- `farside_btc.png` - Farside BTC 截图

**示例输出路径**：`reports/btc_predictor_20260222_003133/`

所有 HTML 看板会自动在 Chrome 浏览器中打开。

## 技术指标说明

### DXY 美元指数
- **当前价格**：实时价格
- **MA24**：24 小时移动平均
- **RSI**：相对强弱指标（>70 超买，<30 超卖）
- **偏离度**：当前价格与 MA24 的偏离百分比

### NASDAQ 纳斯达克指数
- 同 DXY 指标
- 反映科技股整体走势

### 稳定币总市值
- **当前市值**：所有稳定币总市值
- **MA7**：7 天移动平均
- **增长率**：日增长率
- **流入流出**：资金流向分析

### 贪婪恐慌指数
- **当前值**：0-100（0 极度恐慌，100 极度贪婪）
- **动量**：今日情绪 - 昨日情绪
- **斜率**：过去3天情绪线性回归斜率
- **位阶**：当前情绪在过去一年的百分位

### OKX 资金费率
- **当前费率**：永续合约资金费率（正值多头付给空头）
- **预测费率**：下一期预测费率
- **费率斜率**：近期费率趋势
- **MA8**：8 期移动平均

## 依赖

- yfinance - 金融数据
- plotly - 交互式图表
- pandas/numpy - 数据处理
- requests - API 请求

所有依赖已在 `requirements.txt` 中定义，安装在 conda Shook 环境中。

## 架构说明

- 使用 LangGraph 工具注册中心统一管理工具
- 每个指标都有独立的工具实现（位于 `langgraph/tools/`）
- 遵循 `getNews` 的编排器模式（独立脚本 + shook 集成）
