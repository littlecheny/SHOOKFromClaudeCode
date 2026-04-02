#!/usr/bin/env python3
"""
稳定币总市值工具完整演示

展示如何在不同场景中使用稳定币工具
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from langgraph.tools.registry import get_default_registry


def demo_basic_usage():
    """演示 1: 基本使用"""
    print("=" * 60)
    print("演示 1: 基本使用 - 获取稳定币总市值")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_stablecoin')
    
    result = tool.execute(days=7)
    
    if result.success:
        data = result.data
        print(f"✓ 成功获取数据")
        print(f"  总市值: ${data['current_marketcap']:,.0f}")
        print(f"  24h 变化: ${data['change_24h']:+,.0f} ({data['change_24h_percent']:+.2f}%)")
        print(f"  稳定币总数: {data['total_stablecoins']}")
        print()
        print(f"  前 10 大稳定币:")
        for i, coin in enumerate(data['top_stablecoins'], 1):
            print(f"    {i}. {coin['name']} ({coin['symbol']}): ${coin['marketcap']:,.0f}")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_historical_data():
    """演示 2: 历史数据分析"""
    print("=" * 60)
    print("演示 2: 历史数据分析 - 获取 30 天数据并分析")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_stablecoin')
    
    result = tool.execute(days=30)
    
    if result.success:
        data = result.data
        history = data['history']
        
        print(f"✓ 成功获取 {len(history)} 天数据")
        print()
        
        marketcaps = [record['marketcap'] for record in history]
        avg_marketcap = sum(marketcaps) / len(marketcaps)
        max_marketcap = max(marketcaps)
        min_marketcap = min(marketcaps)
        
        print(f"统计分析:")
        print(f"  平均市值: ${avg_marketcap:,.0f}")
        print(f"  最高市值: ${max_marketcap:,.0f}")
        print(f"  最低市值: ${min_marketcap:,.0f}")
        print(f"  波动幅度: ${max_marketcap - min_marketcap:,.0f}")
        
        first_marketcap = history[0]['marketcap']
        last_marketcap = history[-1]['marketcap']
        trend_change = last_marketcap - first_marketcap
        trend_percent = (trend_change / first_marketcap) * 100
        
        print()
        print(f"趋势分析:")
        print(f"  起始市值: ${first_marketcap:,.0f}")
        print(f"  当前市值: ${last_marketcap:,.0f}")
        print(f"  总变动: ${trend_change:+,.0f} ({trend_percent:+.2f}%)")
        
        if trend_change > 0:
            print(f"  趋势判断: 📈 增长")
        elif trend_change < 0:
            print(f"  趋势判断: 📉 收缩")
        else:
            print(f"  趋势判断: ➡️ 持平")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_info_query():
    """演示 3: 获取基本信息"""
    print("=" * 60)
    print("演示 3: 获取基本信息 - 查询稳定币生态系统概况")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_stablecoin_info')
    
    result = tool.execute()
    
    if result.success:
        info = result.data
        print(f"✓ 成功获取信息")
        print(f"  总市值: ${info['total_marketcap']:,.0f}")
        print(f"  稳定币总数: {info['total_stablecoins']}")
        print(f"  数据来源: {info['data_source']}")
        print()
        print(f"  前 3 大稳定币:")
        for i, name in enumerate(info['top_3'], 1):
            print(f"    {i}. {name}")
    else:
        print(f"✗ 获取失败: {result.error}")
    
    print()


def demo_market_dominance():
    """演示 4: 市场主导地位分析"""
    print("=" * 60)
    print("演示 4: 市场主导地位分析 - 分析前 5 大稳定币占比")
    print("=" * 60)
    print()
    
    registry = get_default_registry()
    tool = registry.get('get_stablecoin')
    
    result = tool.execute()
    
    if result.success:
        data = result.data
        total_marketcap = data['current_marketcap']
        top_coins = data['top_stablecoins'][:5]
        
        print(f"总市值: ${total_marketcap:,.0f}")
        print()
        print(f"{'稳定币':<20} {'市值 (USD)':<20} {'占比':<10}")
        print("-" * 55)
        
        for coin in top_coins:
            dominance = (coin['marketcap'] / total_marketcap) * 100
            print(f"{coin['name']:<20} ${coin['marketcap']:>18,.0f} {dominance:>8.2f}%")
        
        top_5_total = sum(coin['marketcap'] for coin in top_coins)
        top_5_dominance = (top_5_total / total_marketcap) * 100
        
        print("-" * 55)
        print(f"前 5 大合计占比: {top_5_dominance:.2f}%")
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
    tool = registry.get('get_stablecoin')
    
    print("测试参数验证:")
    result = tool.execute(days=0)
    
    if result.success:
        print(f"  获取到 {len(result.data.get('history', []))} 条数据")
    else:
        print(f"  捕获到错误: {result.error}")
    
    print()


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("稳定币总市值工具完整演示")
    print("=" * 60)
    print()
    
    demo_basic_usage()
    demo_historical_data()
    demo_info_query()
    demo_market_dominance()
    demo_error_handling()
    
    print("=" * 60)
    print("演示完成！")
    print("=" * 60)
    print()
    print("更多使用方法请参考:")
    print("  - 运行 generate_report.py 生成技术分析看板")
    print("  - 数据来源: DefiLlama API (https://defillama.com)")
    print()


if __name__ == '__main__':
    main()
