#!/usr/bin/env python3
"""
生成稳定币市值技术分析看板

使用 GenerateStablecoinDashboardTool 生成包含 MA7、RSI 和偏离度分析的交互式看板
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from langgraph.tools.registry import get_default_registry


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("稳定币市值技术分析看板生成器")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('generate_stablecoin_dashboard')
    
    if not tool:
        print("✗ 未找到 generate_stablecoin_dashboard 工具")
        return 1
    
    print("正在生成看板...")
    print("- 从 DefiLlama API 获取历史数据")
    print("- 计算 MA7、RSI 和偏离度指标")
    print("- 生成交互式 Plotly 看板")
    print()
    
    result = tool.execute(days=30)
    
    if result.success:
        data = result.data
        print("✓ 看板生成成功！")
        print()
        print(f"输出文件: {data['output_path']}")
        print(f"数据点数: {data['data_points']} 个")
        print()
        print("关键指标:")
        print(f"  当前市值: ${data['current_marketcap']:,.0f}")
        print(f"  MA7:      ${data['ma7']:,.0f}")
        print(f"  RSI:      {data['rsi']:.2f}")
        print(f"  偏离度:   {data['deviation']:+.2f}%")
        print()
        
        # 技术分析解读
        print("技术分析:")
        
        # RSI 解读
        rsi = data['rsi']
        if rsi > 70:
            print(f"  📈 RSI = {rsi:.2f} > 70，市场过热，可能回调")
        elif rsi < 30:
            print(f"  📉 RSI = {rsi:.2f} < 30，市场低迷，可能反弹")
        else:
            print(f"  ➡️  RSI = {rsi:.2f}，市场处于正常区域")
        
        # 偏离度解读
        deviation = data['deviation']
        if abs(deviation) > 2:
            direction = "高于" if deviation > 0 else "低于"
            print(f"  ⚠️  当前市值 {direction} MA7 达 {abs(deviation):.2f}%，偏离较大")
        else:
            print(f"  ✓ 当前市值偏离 MA7 仅 {abs(deviation):.2f}%，走势稳定")
        
        # 市值解读
        current = data['current_marketcap']
        ma7 = data['ma7']
        if current > ma7:
            print(f"  📊 市值高于 7 日均值，呈增长态势")
        else:
            print(f"  📊 市值低于 7 日均值，呈收缩态势")
        
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
