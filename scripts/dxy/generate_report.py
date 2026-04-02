#!/usr/bin/env python3
"""
生成 DXY 技术分析看板

使用 GenerateDXYDashboardTool 生成包含 MA24、RSI 和偏离度分析的交互式看板
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from langgraph.tools.registry import get_default_registry


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("DXY 技术分析看板生成器")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('generate_dxy_dashboard')
    
    if not tool:
        print("✗ 未找到 generate_dxy_dashboard 工具")
        return 1
    
    print("正在生成看板...")
    print("- 获取过去 7 天的 1 小时频率数据")
    print("- 计算 MA24、RSI 和偏离度指标")
    print("- 生成交互式 Plotly 看板")
    print()
    
    result = tool.execute()
    
    if result.success:
        data = result.data
        print("✓ 看板生成成功！")
        print()
        print(f"输出文件: {data['output_path']}")
        print(f"数据点数: {data['data_points']} 个")
        print()
        print("关键指标:")
        print(f"  当前价格: {data['current_price']}")
        print(f"  MA24:     {data['ma24']:.4f}")
        print(f"  RSI:      {data['rsi']:.2f}")
        print(f"  偏离度:   {data['deviation']:+.2f}%")
        print()
        
        # 技术分析解读
        print("技术分析:")
        
        # RSI 解读
        rsi = data['rsi']
        if rsi > 70:
            print(f"  📈 RSI = {rsi:.2f} > 70，处于超买区域，可能回调")
        elif rsi < 30:
            print(f"  📉 RSI = {rsi:.2f} < 30，处于超卖区域，可能反弹")
        else:
            print(f"  ➡️  RSI = {rsi:.2f}，处于正常区域")
        
        # 偏离度解读
        deviation = data['deviation']
        if abs(deviation) > 2:
            direction = "高于" if deviation > 0 else "低于"
            print(f"  ⚠️  当前价格 {direction} MA24 达 {abs(deviation):.2f}%，偏离较大")
        else:
            print(f"  ✓ 当前价格偏离 MA24 仅 {abs(deviation):.2f}%，走势稳定")
        
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
