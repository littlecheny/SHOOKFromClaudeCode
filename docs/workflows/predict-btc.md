# Predict BTC Workflow

命令：

```text
/predict-btc [--output-dir PATH]
```

职责：

- 拉取 DXY、Nasdaq、Fear & Greed、Stablecoin、OKX、Farside BTC 数据
- 生成 HTML dashboard
- 用模型生成 BTC 市场简报
- 写入 `reports/btc_predict/` 或指定输出目录
- 记录运行状态到 `.shook/workflows.json`

实现：

- `runtime/workflows/predictBtcWorkflow.ts`
- `runtime/predictBtc.ts`
- `langgraph/tools/dxy.py`
- `langgraph/tools/nasdaq.py`
- `langgraph/tools/fear_greed.py`
- `langgraph/tools/stablecoin.py`
- `langgraph/tools/okx_funding.py`
- `langgraph/tools/okx_spot.py`
- `langgraph/tools/okx_futures.py`
- `langgraph/tools/farside_btc.py`
