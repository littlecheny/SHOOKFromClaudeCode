#!/bin/bash
# launchd 安装脚本
# 用法：./scripts/install_launchd.sh

set -e

echo "========================================="
echo "  每日新闻智能秘书 - launchd 安装脚本"
echo "========================================="
echo ""

# 定义变量
PLIST_FILE="com.personal.dailynews.plist"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE_PLIST="$SCRIPT_DIR/$PLIST_FILE"
TARGET_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$TARGET_DIR/$PLIST_FILE"

echo "项目目录: $PROJECT_DIR"
echo "源 plist: $SOURCE_PLIST"
echo "目标目录: $TARGET_DIR"
echo ""

# 检查源 plist 文件是否存在
if [ ! -f "$SOURCE_PLIST" ]; then
    echo "❌ 错误: plist 文件不存在: $SOURCE_PLIST"
    exit 1
fi

# 创建目标目录（如果不存在）
mkdir -p "$TARGET_DIR"

# 检查 Python 是否可用
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node"
    exit 1
fi

NODE_PATH=$(which node)
echo "✓ Node 路径: $NODE_PATH"

# 检查 shook 入口是否存在
SHOOK_BIN="$PROJECT_DIR/shook"
if [ ! -f "$SHOOK_BIN" ]; then
    echo "❌ 错误: shook 不存在: $SHOOK_BIN"
    exit 1
fi
echo "✓ 主程序: $SHOOK_BIN"

# 检查 .env 文件（提醒用户配置）
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  警告: .env 文件不存在"
    echo "   请先复制 env.example.txt 为 .env 并配置环境变量"
    read -p "   是否继续安装？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 创建日志目录
LOGS_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOGS_DIR"
echo "✓ 日志目录: $LOGS_DIR"

echo ""
echo "准备安装 launchd 任务..."
echo ""

# 如果已经加载，先卸载
if launchctl list | grep -q "com.personal.dailynews"; then
    echo "检测到已加载的任务，正在卸载..."
    launchctl unload "$TARGET_PLIST" 2>/dev/null || true
    echo "✓ 已卸载旧任务"
fi

# 复制 plist 文件
echo "复制 plist 文件到 $TARGET_DIR ..."
cp "$SOURCE_PLIST" "$TARGET_PLIST"

# 修改 plist 中的路径（使用 sed 替换占位符）
# 注意：macOS 的 sed 需要 -i '' 参数
sed -i '' "s|/usr/bin/node|$NODE_PATH|g" "$TARGET_PLIST"
sed -i '' "s|/Users/chenyulin/workspace/workdoc|$PROJECT_DIR|g" "$TARGET_PLIST"

echo "✓ 已复制并更新 plist 文件"

# 加载任务
echo "加载 launchd 任务..."
launchctl load "$TARGET_PLIST"

if [ $? -eq 0 ]; then
    echo "✓ launchd 任务加载成功"
else
    echo "❌ launchd 任务加载失败"
    exit 1
fi

echo ""
echo "========================================="
echo "  安装完成！"
echo "========================================="
echo ""
echo "任务将在每个工作日（周一至周五）10:00 自动运行"
echo ""
echo "常用命令："
echo "  查看任务状态: launchctl list | grep dailynews"
echo "  卸载任务:     launchctl unload $TARGET_PLIST"
echo "  重新加载:     launchctl unload $TARGET_PLIST && launchctl load $TARGET_PLIST"
echo "  查看日志:     tail -f $LOGS_DIR/dailynews.out.log"
echo "  查看错误日志: tail -f $LOGS_DIR/dailynews.err.log"
echo ""
echo "手动测试运行："
echo "  cd $PROJECT_DIR"
echo "  ./shook --exec '/get-news'"
echo ""
