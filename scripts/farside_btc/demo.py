#!/usr/bin/env python3
"""
Farside BTC 截图工具演示脚本

展示如何使用 farside_btc_screenshot 工具
"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from langgraph.tools.registry import get_default_registry


def main():
    """主函数"""
    print("=== Farside BTC 截图工具演示 ===\n")
    
    # 获取工具注册中心
    registry = get_default_registry()
    
    # 获取 farside_btc_screenshot 工具
    tool = registry.get("farside_btc_screenshot")
    
    if tool is None:
        print("错误: 未找到 farside_btc_screenshot 工具")
        return 1
    
    print(f"工具名称: {tool.name}")
    print(f"工具描述: {tool.description}")
    print(f"工具分类: {tool.category}")
    print(f"成本估计: {tool.cost_estimate}\n")
    
    # 示例 1: 使用默认参数
    print("示例 1: 使用默认参数截图...")
    result = tool.execute()
    
    if result.success:
        print(f"✓ 截图成功!")
        print(f"  - 输出路径: {result.data['output_path']}")
        print(f"  - 文件大小: {result.data['file_size']:,} 字节")
        print(f"  - 全页面: {result.data['full_page']}")
        print(f"  - 视口大小: {result.data['viewport']['width']}x{result.data['viewport']['height']}")
        print(f"  - 时间戳: {result.data['timestamp']}\n")
    else:
        print(f"✗ 截图失败: {result.error}\n")
        return 1
    
    # 示例 2: 指定输出路径
    print("示例 2: 指定输出路径...")
    result = tool.execute(output_path="reports/farside_btc_custom.png")
    
    if result.success:
        print(f"✓ 截图成功!")
        print(f"  - 输出路径: {result.data['output_path']}")
        print(f"  - 文件大小: {result.data['file_size']:,} 字节\n")
    else:
        print(f"✗ 截图失败: {result.error}\n")
    
    # 示例 3: 自定义窗口大小
    print("示例 3: 使用 2K 分辨率截图...")
    result = tool.execute(
        output_path="reports/farside_btc_2k.png",
        width=2560,
        height=1440
    )
    
    if result.success:
        print(f"✓ 截图成功!")
        print(f"  - 输出路径: {result.data['output_path']}")
        print(f"  - 文件大小: {result.data['file_size']:,} 字节")
        print(f"  - 视口大小: {result.data['viewport']['width']}x{result.data['viewport']['height']}\n")
    else:
        print(f"✗ 截图失败: {result.error}\n")
    
    # 示例 4: 只截取视口（不包括整个页面）
    print("示例 4: 只截取视口...")
    result = tool.execute(
        output_path="reports/farside_btc_viewport.png",
        full_page=False,
        width=1920,
        height=1080
    )
    
    if result.success:
        print(f"✓ 截图成功!")
        print(f"  - 输出路径: {result.data['output_path']}")
        print(f"  - 文件大小: {result.data['file_size']:,} 字节")
        print(f"  - 全页面: {result.data['full_page']}\n")
    else:
        print(f"✗ 截图失败: {result.error}\n")
    
    print("=== 演示完成 ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
