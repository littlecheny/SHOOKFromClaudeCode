#!/usr/bin/env python3
"""
NASDAQ 纳斯达克指数工具完整演示

展示如何在不同场景中使用 NASDAQ 工具
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from langgraph.tools.registry import get_default_registry


def demo_basic_usage():
    """演示 1: 基本使用"""
    print("=" * 60)
    print("演示 1: 基本使用 - 获取当天 NASDAQ 数据")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_nasdaq')
    
    result = tool.execute()
    
    if result.success:
        data = result.data
        print(f"✓ 成功获取数据")
        print(f"  当前价格: {data['current_price']}")
        print(f"  涨跌: {data['change']:+.2f} ({data['change_percent']:+.2f}%)")
        print(f"  今日最高: {data['high']}")
        print(f"  今日最低: {data['low']}")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_historical_data():
    """演示 2: 历史数据分析"""
    print("=" * 60)
    print("演示 2: 历史数据分析 - 获取 1 个月数据并分析")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_nasdaq')
    
    result = tool.execute(period='1mo', interval='1d')
    
    if result.success:
        data = result.data
        history = data['history']
        
        print(f"✓ 成功获取 {len(history)} 天数据")
        print()
        
        closes = [record['close'] for record in history]
        avg_price = sum(closes) / len(closes)
        max_price = max(closes)
        min_price = min(closes)
        
        print(f"统计分析:")
        print(f"  平均价格: {avg_price:.2f}")
        print(f"  最高价格: {max_price:.2f}")
        print(f"  最低价格: {min_price:.2f}")
        print(f"  价格区间: {max_price - min_price:.2f}")
        
        first_price = history[0]['close']
        last_price = history[-1]['close']
        trend_change = last_price - first_price
        trend_percent = (trend_change / first_price) * 100
        
        print()
        print(f"趋势分析:")
        print(f"  起始价格: {first_price:.2f}")
        print(f"  结束价格: {last_price:.2f}")
        print(f"  总变动: {trend_change:+.2f} ({trend_percent:+.2f}%)")
        
        if trend_change > 0:
            print(f"  趋势判断: 📈 上涨")
        elif trend_change < 0:
            print(f"  趋势判断: 📉 下跌")
        else:
            print(f"  趋势判断: ➡️ 持平")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_info_query():
    """演示 3: 获取基本信息"""
    print("=" * 60)
    print("演示 3: 获取基本信息 - 查询 NASDAQ 指数详情")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_nasdaq_info')
    
    result = tool.execute()
    
    if result.success:
        info = result.data
        print(f"✓ 成功获取信息")
        print(f"  代码: {info['symbol']}")
        print(f"  名称: {info['name']}")
        print(f"  描述: {info['description']}")
        print(f"  交易所: {info['exchange']}")
        print(f"  货币: {info['currency']}")
        print(f"  类型: {info['quote_type']}")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_multiple_periods():
    """演示 4: 多周期对比"""
    print("=" * 60)
    print("演示 4: 多周期对比 - 对比不同时间段的表现")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_nasdaq')
    
    periods = [
        ('1d', '今日'),
        ('5d', '本周'),
        ('1mo', '本月'),
        ('3mo', '本季度')
    ]
    
    print(f"{'周期':<10} {'涨跌':<15} {'涨跌幅':<10} {'数据点数'}")
    print("-" * 50)
    
    for period, label in periods:
        result = tool.execute(period=period, interval='1d')
        
        if result.success:
            data = result.data
            history = data['history']
            
            if len(history) > 1:
                first_price = history[0]['close']
                last_price = history[-1]['close']
                change = last_price - first_price
                change_percent = (change / first_price) * 100
            else:
                change = data['change']
                change_percent = data['change_percent']
            
            print(f"{label:<10} {change:+10.2f}    {change_percent:+6.2f}%    {len(history)} 天")
        else:
            print(f"{label:<10} 获取失败")
    
    print()


def demo_error_handling():
    """演示 5: 错误处理"""
    print("=" * 60)
    print("演示 5: 错误处理 - 展示如何处理异常情况")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_nasdaq')
    
    print("测试异常参数处理:")
    result = tool.execute(period='invalid_period', interval='1d')
    
    if result.success:
        print("  即使参数不标准，API 仍可能返回数据")
        print(f"  获取到 {len(result.data['history'])} 条数据")
    else:
        print(f"  捕获到错误: {result.error}")
    
    print()


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("NASDAQ 纳斯达克指数工具完整演示")
    print("=" * 60)
    print()
    
    demo_basic_usage()
    demo_historical_data()
    demo_info_query()
    demo_multiple_periods()
    demo_error_handling()
    
    print("=" * 60)
    print("演示完成！")
    print("=" * 60)
    print()
    print("更多使用方法请参考:")
    print("  - 运行 generate_report.py 生成技术分析看板")
    print("  - 查看 DXY 工具的使用示例")
    print()


if __name__ == '__main__':
    main()
