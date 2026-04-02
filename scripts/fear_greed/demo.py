#!/usr/bin/env python3
"""
贪婪恐慌指数工具完整演示

展示如何在不同场景中使用贪婪恐慌指数工具
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from langgraph.tools.registry import get_default_registry


def demo_basic_usage():
    """演示 1: 基本使用"""
    print("=" * 60)
    print("演示 1: 基本使用 - 获取贪婪恐慌指数")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_fear_greed')
    
    result = tool.execute(limit=30)
    
    if result.success:
        data = result.data
        print(f"✓ 成功获取数据")
        print(f"  当前值: {data['current_value']} - {data['current_classification']}")
        print()
        print(f"  三大核心指标:")
        print(f"    情绪动量 (Momentum):   {data['momentum']:+d}")
        print(f"    情绪斜率 (Slope):      {data['slope']:+.2f}")
        print(f"    情绪位阶 (Percentile): {data['percentile']:.1f}%")
        print()
        
        # 解读情绪动量
        if data['momentum'] > 5:
            print(f"  📈 情绪动量强劲上升 (+{data['momentum']})，市场转向贪婪")
        elif data['momentum'] < -5:
            print(f"  📉 情绪动量急剧下降 ({data['momentum']})，市场转向恐慌")
        else:
            print(f"  ➡️  情绪动量平稳 ({data['momentum']:+d})，市场情绪稳定")
        
        # 解读情绪斜率
        if abs(data['slope']) < 1:
            print(f"  ✓ 情绪斜率平稳 ({data['slope']:.2f})，趋势安全")
        elif data['slope'] > 3:
            print(f"  ⚠️  情绪斜率突然变陡 (+{data['slope']:.2f})，风险临近！")
        elif data['slope'] < -3:
            print(f"  ⚠️  情绪斜率急剧下滑 ({data['slope']:.2f})，恐慌加剧！")
        else:
            print(f"  ➡️  情绪斜率 {data['slope']:+.2f}，趋势正常")
        
        # 解读情绪位阶
        if data['percentile'] > 90:
            print(f"  🔥 情绪位阶 {data['percentile']:.1f}%，历史级疯狂！")
        elif data['percentile'] > 75:
            print(f"  📈 情绪位阶 {data['percentile']:.1f}%，处于高位")
        elif data['percentile'] < 10:
            print(f"  ❄️  情绪位阶 {data['percentile']:.1f}%，历史级绝望！")
        elif data['percentile'] < 25:
            print(f"  📉 情绪位阶 {data['percentile']:.1f}%，处于低位")
        else:
            print(f"  ➡️  情绪位阶 {data['percentile']:.1f}%，处于中位")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_historical_analysis():
    """演示 2: 历史数据分析"""
    print("=" * 60)
    print("演示 2: 历史数据分析 - 分析过去 90 天情绪变化")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_fear_greed')
    
    result = tool.execute(limit=90)
    
    if result.success:
        data = result.data
        history = data['history']
        
        print(f"✓ 成功获取 {len(history)} 天数据")
        print()
        
        values = [record['value'] for record in history]
        avg_value = sum(values) / len(values)
        max_value = max(values)
        min_value = min(values)
        
        print(f"统计分析:")
        print(f"  平均值: {avg_value:.1f}")
        print(f"  最高值: {max_value} (极度贪婪)")
        print(f"  最低值: {min_value} (极度恐慌)")
        print(f"  波动幅度: {max_value - min_value}")
        
        # 统计各情绪分类的天数
        extreme_fear = sum(1 for v in values if v <= 24)
        fear = sum(1 for v in values if 25 <= v <= 44)
        neutral = sum(1 for v in values if 45 <= v <= 55)
        greed = sum(1 for v in values if 56 <= v <= 75)
        extreme_greed = sum(1 for v in values if v >= 76)
        
        print()
        print(f"情绪分布:")
        print(f"  极度恐慌: {extreme_fear} 天 ({extreme_fear/len(values)*100:.1f}%)")
        print(f"  恐慌:     {fear} 天 ({fear/len(values)*100:.1f}%)")
        print(f"  中性:     {neutral} 天 ({neutral/len(values)*100:.1f}%)")
        print(f"  贪婪:     {greed} 天 ({greed/len(values)*100:.1f}%)")
        print(f"  极度贪婪: {extreme_greed} 天 ({extreme_greed/len(values)*100:.1f}%)")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_info_query():
    """演示 3: 获取基本信息"""
    print("=" * 60)
    print("演示 3: 获取基本信息 - 了解指标含义")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_fear_greed_info')
    
    result = tool.execute()
    
    if result.success:
        info = result.data
        print(f"✓ 成功获取信息")
        print(f"  名称: {info['name']}")
        print(f"  描述: {info['description']}")
        print(f"  数据来源: {info['data_source']}")
        print()
        print(f"  分类标准:")
        for range_str, classification in info['classifications'].items():
            print(f"    {range_str}: {classification}")
        print()
        print(f"  三大核心指标:")
        for key, desc in info['indicators'].items():
            print(f"    {key.capitalize()}: {desc}")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_trend_prediction():
    """演示 4: 趋势预测分析"""
    print("=" * 60)
    print("演示 4: 趋势预测分析 - 基于三大指标判断市场走向")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_fear_greed')
    
    result = tool.execute(limit=30)
    
    if result.success:
        data = result.data
        value = data['current_value']
        momentum = data['momentum']
        slope = data['slope']
        percentile = data['percentile']
        
        print(f"当前情绪: {value} - {data['current_classification']}")
        print()
        
        # 综合判断
        signals = []
        
        # 动量信号
        if momentum > 5:
            signals.append("动量上升")
        elif momentum < -5:
            signals.append("动量下降")
        
        # 斜率信号
        if abs(slope) > 3:
            signals.append("斜率剧烈")
        
        # 位阶信号
        if percentile > 90:
            signals.append("历史高位")
        elif percentile < 10:
            signals.append("历史低位")
        
        print(f"信号检测: {', '.join(signals) if signals else '无特殊信号'}")
        print()
        
        # 投资建议
        print("趋势判断:")
        if value >= 76 and momentum > 0 and slope > 2:
            print("  🔴 危险：极度贪婪且加速上升，回调风险极高！")
        elif value <= 24 and momentum < 0 and slope < -2:
            print("  🟢 机会：极度恐慌且加速下跌，可能触底反弹！")
        elif 56 <= value <= 75 and slope > 0 and percentile > 70:
            print("  🟡 谨慎：贪婪上升中，注意获利了结")
        elif 25 <= value <= 44 and slope < 0 and percentile < 30:
            print("  🟡 观望：恐慌下降中，等待企稳信号")
        else:
            print("  ⚪ 中性：市场情绪相对稳定")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_error_handling():
    """演示 5: 错误处理"""
    print("=" * 60)
    print("演示 5: 错误处理 - 展示如何处理异常情况")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_fear_greed')
    
    print("测试参数验证:")
    result = tool.execute(limit=1)
    
    if result.success:
        print(f"  获取到 {len(result.data.get('history', []))} 天数据")
        print(f"  当前值: {result.data['current_value']}")
    else:
        print(f"  捕获到错误: {result.error}")
    
    print()


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("贪婪恐慌指数工具完整演示")
    print("=" * 60)
    print()
    
    demo_basic_usage()
    demo_historical_analysis()
    demo_info_query()
    demo_trend_prediction()
    demo_error_handling()
    
    print("=" * 60)
    print("演示完成！")
    print("=" * 60)
    print()
    print("更多使用方法请参考:")
    print("  - 运行 generate_report.py 生成技术分析看板")
    print("  - 数据来源: Alternative.me API")
    print()


if __name__ == '__main__':
    main()
