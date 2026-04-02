R# Runway 命令使用说明

## 概述

Runway 是一个项目管理工具，集成在 shook 常驻调度器中，用于管理多个项目配置。

## 架构

- **独立程序**: `scripts/runway.py` - 负责项目的增删查改
- **调度器集成**: `runtime/cli.ts` - 调用 Python worker 执行 runway.py 并自动更新 dashboard
- **配置文件**: `runway_projects.json` - 存储项目列表（JSON 格式）

## 使用方法

### 在 shook 中使用（推荐）

```bash
# 启动 shook
./shook

# 在 shook 提示符中使用 Runway 命令
shook> /runway add --name myproject --path /path/to/project
shook> /runway list
shook> /runway delete --name myproject
```

### 直接使用

```bash
# 添加项目
python3 scripts/runway.py add --name myproject --path /path/to/project

# 列出所有项目
python3 scripts/runway.py list

# 删除项目
python3 scripts/runway.py delete --name myproject

# 查看帮助
python3 scripts/runway.py --help
```

## 功能特性

### 1. 添加项目 (add)
- 必填参数：`--name` 项目名称，`--path` 项目路径
- 自动将路径解析为绝对路径
- 检查项目名称重复，避免冲突
- 成功后自动更新 dashboard 显示

### 2. 删除项目 (delete)
- 必填参数：`--name` 项目名称
- 按名称删除项目
- 提供友好的错误提示
- 自动同步 dashboard

### 3. 列出项目 (list)
- 显示所有已配置的项目
- 包含项目名称和完整路径
- 显示项目总数
- 自动同步 dashboard

## Dashboard 显示

在 shook 的 dashboard 右侧 "Runway" 栏中会显示：
- 多个项目：逗号分隔的项目名（如 "project1, project2, project3"）
- 无项目：显示 "None"
- 启动时自动加载并显示
- 每次操作后自动更新

## 配置文件格式

`runway_projects.json` 存储格式：

```json
[
  {
    "name": "project1",
    "path": "/absolute/path/to/project1"
  },
  {
    "name": "project2",
    "path": "/absolute/path/to/project2"
  }
]
```

## 示例场景

```bash
# 场景1：添加多个项目
shook> Runway add --name backend --path ~/work/backend
✓ 成功添加项目: backend
  路径: /Users/username/work/backend

shook> Runway add --name frontend --path ~/work/frontend
✓ 成功添加项目: frontend
  路径: /Users/username/work/frontend

# 场景2：查看所有项目
shook> Runway list

Runway 项目列表 (共 2 个):
======================================================================
1. backend
   路径: /Users/username/work/backend
2. frontend
   路径: /Users/username/work/frontend
======================================================================

# 场景3：删除项目
shook> Runway delete --name backend
✓ 成功删除项目: backend
```

## 错误处理

- ❌ 添加重复名称的项目会提示错误
- ❌ 删除不存在的项目会提示错误
- ❌ 配置文件损坏会自动处理，不影响程序运行
- ✅ 所有操作都有清晰的成功/失败提示

## 技术细节

- 使用 Python 3.9+ 类型注解
- JSON 格式存储，支持 UTF-8 编码
- 路径自动规范化为绝对路径
- 与 shook 紧密集成，操作后自动触发 dashboard 更新
