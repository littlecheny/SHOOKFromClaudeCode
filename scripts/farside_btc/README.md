# Farside BTC 截图工具

这是一个使用 Playwright 对 [Farside BTC](https://farside.co.uk/btc/) 网站进行截图的 LangGraph 工具。

## 什么是 Farside BTC？

Farside BTC 是一个提供比特币 ETF 资金流向数据可视化的网站，展示每日各个比特币 ETF 产品的资金流入流出情况，是比特币市场分析的重要参考指标。

## 功能特性

- 🌐 自动访问并截取 Farside BTC 网站
- 📸 支持全页面截图或视口截图
- 🎨 自定义浏览器窗口大小
- 📁 自动创建输出目录
- 📊 返回详细的截图信息（路径、大小、时间戳等）

## 快速开始

### 命令行使用

```bash
# 使用默认参数
python -m langgraph test-tool farside_btc_screenshot

# 指定输出路径
python -m langgraph test-tool farside_btc_screenshot '{"output_path": "my_screenshot.png"}'
```

### Python 代码使用

```python
from langgraph.tools.registry import get_default_registry

# 获取工具
registry = get_default_registry()
tool = registry.get("farside_btc_screenshot")

# 执行截图
result = tool.execute()

if result.success:
    print(f"截图已保存到: {result.data['output_path']}")
```

### 运行演示脚本

```bash
# 激活虚拟环境
conda activate Shook

# 运行演示
python scripts/farside_btc/demo.py
```

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `output_path` | string | `reports/farside_btc_<timestamp>.png` | 截图输出路径 |
| `full_page` | boolean | `true` | 是否截取整个页面 |
| `width` | integer | `1920` | 浏览器窗口宽度 |
| `height` | integer | `1080` | 浏览器窗口高度 |

## 应用场景

1. **定时监控**: 使用 cron 或 launchd 定期截取资金流向图表
2. **报告生成**: 集成到 BTC 预测看板中，作为市场分析的一部分
3. **数据存档**: 保存历史数据快照，用于回溯分析
4. **社交分享**: 生成用于社交媒体分享的可视化图片

## 输出示例

成功截图后会返回：

```json
{
  "output_path": "reports/farside_btc_20260221_235211.png",
  "url": "https://farside.co.uk/btc/",
  "timestamp": "2026-02-21T23:52:29.325355",
  "file_size": 330763,
  "full_page": true,
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}
```

## 依赖要求

```bash
pip install playwright
playwright install chromium
```

## 相关资源

- [使用文档](../../langgraph/tools/FARSIDE_BTC_USAGE.md) - 完整使用指南
- [工具源码](../../langgraph/tools/farside_btc.py) - 查看实现细节
- [Farside BTC 网站](https://farside.co.uk/btc/) - 数据来源

## 相关工具

本工具可与以下 LangGraph 工具配合使用，生成完整的 BTC 市场分析报告：

- `get_dxy` - 美元指数数据
- `get_nasdaq` - 纳斯达克指数数据
- `get_fear_greed` - 贪婪恐慌指数
- `get_okx_funding_rate` - OKX 资金费率
- `get_stablecoin` - 稳定币市场数据

## 注意事项

1. 需要稳定的网络连接以访问 Farside 网站
2. 首次运行需要下载 Chromium 浏览器
3. 截图文件通常在 300-500 KB 左右
4. 页面加载超时时间为 90 秒

## 开发者

工具分类：`SIDE_EFFECT`（生成文件）  
成本估计：1.5（网络请求 + 浏览器操作）  
可靠性：0.9（依赖网络和网站稳定性）
