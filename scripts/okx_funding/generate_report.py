#!/usr/bin/env python3
"""生成 OKX 资金费率技术分析看板"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from langgraph.tools.registry import get_default_registry

def main():
    print("\n" + "=" * 60)
    print("OKX 资金费率技术分析看板生成器")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('generate_okx_funding_rate_dashboard')
    
    if not tool:
        print("✗ 未找到 generate_okx_funding_rate_dashboard 工具")
        return 1
    
    print("正在生成看板...")
    print("- 从 OKX V5 API 获取历史资金费率")
    print("- 计算费率斜率和移动平均")
    print("- 生成交互式 Plotly 看板")
    print()
    
    result = tool.execute(inst_id="BTC-USDT-SWAP", limit=100)
    
    if result.success:
        data = result.data
        print("✓ 看板生成成功！")
        print()
        print(f"输出文件: {data['output_path']}")
        print(f"产品: {data['inst_id']}")
        print(f"数据点数: {data['data_points']} 个")
        print()
        print("关键指标:")
        print(f"  当前费率: {data['current_rate']:.4f}%")
        print(f"  预测费率: {data['next_rate']:.4f}%")
        print(f"  费率斜率: {data['rate_slope']:.6f}")
        print(f"  MA8:      {data['ma8']:.4f}%")
        print(f"  MA24:     {data['ma24']:.4f}%")
        print()
        
        # 技术分析
        print("技术分析:")
        current = data['current_rate']
        next_r = data['next_rate']
        slope = data['rate_slope']
        
        # 费率解读
        if current > 0.1:
            print(f"  🔴 当前费率 {current:.4f}% 较高，多头支付空头，市场看多")
        elif current < -0.1:
            print(f"  🟢 当前费率 {current:.4f}% 为负，空头支付多头，市场看空")
        else:
            print(f"  ⚪ 当前费率 {current:.4f}% 中性，市场平衡")
        
        # 预测变化
        change = next_r - current
        if abs(change) > 0.01:
            direction = "上升" if change > 0 else "下降"
            print(f"  📊 预测费率 {next_r:.4f}%，{direction} {abs(change):.4f}%")
        
        # 斜率解读
        if abs(slope) > 0.001:
            trend = "上升" if slope > 0 else "下降"
            print(f"  📈 费率斜率 {slope:.6f}，趋势{trend}")
        else:
            print(f"  ➡️  费率斜率平稳 ({slope:.6f})")
        
        print()
        print("=" * 60)
        print(f"在浏览器中打开 {data['output_path']} 查看完整看板")
        print("=" * 60)
        print()
        
        return 0
    else:
        print(f"✗ 生成失败: {result.error}")
        print()
        return 1

if __name__ == '__main__':
    sys.exit(main())
