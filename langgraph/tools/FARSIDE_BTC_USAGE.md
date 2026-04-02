# Farside BTC 截图工具使用指南

## 概述

`farside_btc_screenshot` 工具使用 Playwright 对 [Farside BTC](https://farside.co.uk/btc/) 网站进行截图，该网站提供比特币 ETF 资金流向数据的可视化。

## 工具信息

- **工具名称**: `farside_btc_screenshot`
- **分类**: `SIDE_EFFECT`（生成文件）
- **成本估计**: 1.5（网络请求 + 浏览器操作）

## 功能特性

- 全页面截图或视口截图
- 自定义浏览器窗口大小
- 自动创建输出目录
- 返回截图文件信息（路径、大小、时间戳等）

## 输入参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `output_path` | string | 否 | `reports/farside_btc_<timestamp>.png` | 截图输出路径 |
| `full_page` | boolean | 否 | `true` | 是否截取整个页面 |
| `width` | integer | 否 | `1920` | 浏览器窗口宽度 |
| `height` | integer | 否 | `1080` | 浏览器窗口高度 |

## 输出结果

成功时返回：

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

## 使用示例

### 1. 命令行测试

```bash
# 使用默认参数
python -m langgraph test-tool farside_btc_screenshot

# 指定输出路径
python -m langgraph test-tool farside_btc_screenshot '{"output_path": "my_screenshot.png"}'

# 只截取视口（不包括整个页面）
python -m langgraph test-tool farside_btc_screenshot '{"full_page": false}'

# 自定义窗口大小
python -m langgraph test-tool farside_btc_screenshot '{"width": 2560, "height": 1440}'
```

### 2. Python 代码调用

```python
from langgraph.tools.registry import get_default_registry

# 获取工具
registry = get_default_registry()
tool = registry.get("farside_btc_screenshot")

# 调用工具（使用默认参数）
result = tool.execute()

if result.success:
    print(f"截图已保存到: {result.data['output_path']}")
    print(f"文件大小: {result.data['file_size']} 字节")
else:
    print(f"截图失败: {result.error}")

# 指定输出路径
result = tool.execute(output_path="btc_flow.png")

# 自定义参数
result = tool.execute(
    output_path="reports/btc_screenshot.png",
    full_page=True,
    width=2560,
    height=1440
)
```

### 3. 集成到工作流

```python
from langgraph.tools.farside_btc import FarsideBTCScreenshotTool

# 在 BTC 预测看板中使用
def generate_btc_report():
    screenshot_tool = FarsideBTCScreenshotTool()
    
    # 生成截图
    result = screenshot_tool.execute(
        output_path="reports/btc_farside_flow.png"
    )
    
    if result.success:
        # 截图成功，继续生成报告
        screenshot_path = result.data['output_path']
        # ... 使用截图路径
    else:
        # 处理失败
        print(f"截图失败: {result.error}")
```

## 注意事项

1. **网络要求**: 需要能够访问 `https://farside.co.uk/btc/`
2. **依赖要求**: 需要安装 Playwright 及其浏览器：
   ```bash
   pip install playwright
   playwright install chromium
   ```
3. **超时时间**: 默认页面加载超时为 90 秒
4. **文件大小**: 全页面截图通常在 300-500 KB 左右
5. **并发使用**: Playwright 会为每次调用创建独立的浏览器实例，支持并发

## 常见问题

### Q: 截图失败，提示超时

A: 可能原因：
- 网络连接不稳定
- 网站响应慢
- 防火墙或代理问题

解决方法：检查网络连接，或增加超时时间（修改源码中的 `timeout` 参数）。

### Q: 截图内容不完整

A: 尝试：
- 增加 `wait_for_timeout` 等待时间
- 调整 `width` 和 `height` 参数
- 确保 `full_page=true`

### Q: 想要截取特定区域

A: 当前版本只支持全页面或视口截图，如需截取特定区域，可以修改源码添加 `clip` 参数。

## 应用场景

1. **定时监控**: 定期截取 Farside BTC 资金流向图表
2. **报告生成**: 集成到 BTC 预测看板中
3. **数据存档**: 保存历史数据快照用于分析
4. **社交媒体**: 生成用于分享的可视化图片

## 相关工具

- `get_dxy` - 美元指数数据获取
- `get_nasdaq` - 纳斯达克指数数据获取
- `get_fear_greed` - 贪婪恐慌指数数据获取
- `get_okx_funding_rate` - OKX 资金费率数据获取
- `get_stablecoin` - 稳定币数据获取
