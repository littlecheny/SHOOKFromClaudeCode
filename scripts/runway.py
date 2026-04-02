#!/usr/bin/env python3
"""
Runway: 项目管理工具
管理多个项目的配置，保存到 runway_projects.json
"""
import argparse
import json
import sys
from pathlib import Path


def get_config_path() -> Path:
    """获取配置文件路径（项目根目录）"""
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    return project_root / "runway_projects.json"


def load_projects() -> list[dict[str, str]]:
    """加载项目列表"""
    config_path = get_config_path()
    if not config_path.exists():
        return []
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if not isinstance(data, list):
                print(f"错误：配置文件格式错误", file=sys.stderr)
                return []
            return data
    except json.JSONDecodeError:
        print(f"错误：配置文件 JSON 解析失败", file=sys.stderr)
        return []
    except Exception as e:
        print(f"错误：读取配置失败: {e}", file=sys.stderr)
        return []


def save_projects(projects: list[dict[str, str]]) -> bool:
    """保存项目列表"""
    config_path = get_config_path()
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(projects, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"错误：保存配置失败: {e}", file=sys.stderr)
        return False


def cmd_add(args) -> int:
    """添加项目"""
    name = args.name
    path_str = args.path
    
    # 解析为绝对路径
    project_path = Path(path_str).resolve()
    
    # 加载现有项目
    projects = load_projects()
    
    # 检查名称是否已存在
    for project in projects:
        if project.get("name") == name:
            print(f"错误：项目名称 '{name}' 已存在", file=sys.stderr)
            return 1
    
    # 添加新项目
    new_project = {
        "name": name,
        "path": str(project_path)
    }
    projects.append(new_project)
    
    # 保存
    if save_projects(projects):
        print(f"✓ 成功添加项目: {name}")
        print(f"  路径: {project_path}")
        return 0
    else:
        return 1


def cmd_delete(args) -> int:
    """删除项目"""
    name = args.name
    
    # 加载现有项目
    projects = load_projects()
    
    # 查找并删除
    original_count = len(projects)
    projects = [p for p in projects if p.get("name") != name]
    
    if len(projects) == original_count:
        print(f"错误：项目 '{name}' 不存在", file=sys.stderr)
        return 1
    
    # 保存
    if save_projects(projects):
        print(f"✓ 成功删除项目: {name}")
        return 0
    else:
        return 1


def cmd_list(args) -> int:
    """列出所有项目"""
    projects = load_projects()
    
    if not projects:
        print("当前没有 Runway 项目")
        return 0
    
    print(f"\nRunway 项目列表 (共 {len(projects)} 个):")
    print("=" * 70)
    for i, project in enumerate(projects, 1):
        name = project.get("name", "Unknown")
        path = project.get("path", "Unknown")
        print(f"{i}. {name}")
        print(f"   路径: {path}")
    print("=" * 70)
    return 0


def main():
    parser = argparse.ArgumentParser(
        description='Runway - 项目管理工具',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # add 子命令
    parser_add = subparsers.add_parser('add', help='添加项目')
    parser_add.add_argument('--name', required=True, help='项目名称')
    parser_add.add_argument('--path', required=True, help='项目路径')
    
    # delete 子命令
    parser_delete = subparsers.add_parser('delete', help='删除项目')
    parser_delete.add_argument('--name', required=True, help='项目名称')
    
    # list 子命令
    parser_list = subparsers.add_parser('list', help='列出所有项目')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    if args.command == 'add':
        return cmd_add(args)
    elif args.command == 'delete':
        return cmd_delete(args)
    elif args.command == 'list':
        return cmd_list(args)
    else:
        print(f"错误：未知命令 {args.command}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
