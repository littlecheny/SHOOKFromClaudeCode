#!/usr/bin/env python3
"""
生成贪婪恐慌指数技术分析看板

使用 GenerateFearGreedDashboardTool 生成包含情绪动量、斜率和位阶分析的交互式看板
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from langgraph.tools.registry import get_default_registry


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("贪婪恐慌指数技术分析看板生成器")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('generate_fear_greed_dashboard')
    
    if not tool:
        print("✗ 未找到 generate_fear_greed_dashboard 工具")
        return 1
    
    print("正在生成看板...")
    print("- 从 Alternative.me API 获取历史数据")
    print("- 计算情绪动量、斜率和位阶指标")
    print("- 生成交互式 Plotly 看板")
    print()
    
    result = tool.execute(days=90)
    
    if result.success:
        data = result.data
        print("✓ 看板生成成功！")
        print()
        print(f"输出文件: {data['output_path']}")
        print(f"数据点数: {data['data_points']} 个")
        print()
        print("关键指标:")
        print(f"  当前值: {data['current_value']} - {data['current_classification']}")
        print(f"  情绪动量 (Momentum):   {data['momentum']:+.2f}")
        print(f"  情绪斜率 (Slope):      {data['slope']:+.2f}")
        print(f"  情绪位阶 (Percentile): {data['percentile']:.1f}%")
        print()
        
        # 技术分析解读
        print("技术分析:")
        
        value = data['current_value']
        momentum = data['momentum']
        slope = data['slope']
        percentile = data['percentile']
        
        # 解读当前情绪
        if value >= 76:
            print(f"  🔴 当前处于极度贪婪区域 ({value})，市场过热")
        elif value >= 56:
            print(f"  🟡 当前处于贪婪区域 ({value})，市场乐观")
        elif value >= 45:
            print(f"  ⚪ 当前处于中性区域 ({value})，市场平衡")
        elif value >= 25:
            print(f"  🟡 当前处于恐慌区域 ({value})，市场悲观")
        else:
            print(f"  🟢 当前处于极度恐慌区域 ({value})，市场低迷")
        
        # 解读情绪动量
        if momentum > 5:
            print(f"  📈 情绪动量强劲上升 ({momentum:+.2f})，市场转向贪婪")
        elif momentum < -5:
            print(f"  📉 情绪动量急剧下降 ({momentum:+.2f})，市场转向恐慌")
        else:
            print(f"  ➡️  情绪动量平稳 ({momentum:+.2f})，情绪稳定")
        
        # 解读情绪斜率
        if abs(slope) < 1:
            print(f"  ✓ 情绪斜率平稳 ({slope:.2f})，趋势安全")
        elif slope > 3:
            print(f"  ⚠️  情绪斜率突然变陡 (+{slope:.2f})，风险临近！")
        elif slope < -3:
            print(f"  ⚠️  情绪斜率急剧下滑 ({slope:.2f})，恐慌加剧！")
        
        # 解读情绪位阶
        if percentile > 90:
            print(f"  🔥 情绪位阶 {percentile:.1f}%，历史级疯狂！")
        elif percentile > 75:
            print(f"  📈 情绪位阶 {percentile:.1f}%，处于历史高位")
        elif percentile < 10:
            print(f"  ❄️  情绪位阶 {percentile:.1f}%，历史级绝望！")
        elif percentile < 25:
            print(f"  📉 情绪位阶 {percentile:.1f}%，处于历史低位")
        
        # 综合判断
        print()
        print("投资建议:")
        if value >= 76 and momentum > 0 and slope > 2:
            print("  ⛔ 极高风险：极度贪婪且快速上升，强烈建议减仓")
        elif value <= 24 and momentum < 0 and slope < -2:
            print("  ✅ 潜在机会：极度恐慌且快速下跌，可考虑分批建仓")
        elif value >= 56 and percentile > 70:
            print("  ⚠️  谨慎乐观：市场贪婪且处于高位，注意风险")
        elif value <= 44 and percentile < 30:
            print("  👀 保持观望：市场恐慌且处于低位，等待转机信号")
        else:
            print("  ⚖️  中性持有：市场情绪相对均衡，保持观察")
        
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
