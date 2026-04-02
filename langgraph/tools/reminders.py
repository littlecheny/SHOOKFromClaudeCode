"""
macOS Reminders 工具封装

通过 osascript/AppleScript 操作系统提醒事项 App，创建提醒并借助 iCloud 同步到手机。
"""
import logging
import subprocess
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from .base import BaseTool, ToolCategory, ToolResult

logger = logging.getLogger(__name__)

# 默认列表名（用户指定）
DEFAULT_LIST_NAME = "Shook"

# 回退列表名（iCloud 默认收件箱的几种可能名称）
FALLBACK_LIST_NAMES = ["Inbox", "收件箱", "Reminders", "提醒事项", "提醒", "每日"]

# 默认提醒时间偏移（秒）：10 分钟
DEFAULT_REMIND_OFFSET_SECONDS = 600


def _escape_applescript_string(s: str) -> str:
    """
    转义 AppleScript 字符串中的特殊字符
    
    AppleScript 字符串用双引号包裹，需要转义：
    - 反斜杠 -> \\
    - 双引号 -> \"
    - 换行 -> \n（AppleScript 支持）
    """
    if not s:
        return ""
    s = s.replace("\\", "\\\\")
    s = s.replace('"', '\\"')
    s = s.replace("\n", "\\n")
    s = s.replace("\r", "\\n")
    return s


class CreateReminderTool(BaseTool):
    """
    创建 macOS 提醒事项工具
    
    通过 AppleScript 在指定列表创建提醒，支持设置提醒时间。
    提醒会通过 iCloud 同步到 iPhone 并在指定时间推送通知。
    
    使用前提：
    1. macOS 提醒事项 App 已登录 iCloud
    2. 目标列表存在于 iCloud（非本地列表）
    3. 首次运行需要允许自动化权限
    """
    
    def __init__(
        self,
        default_list_name: str = DEFAULT_LIST_NAME,
        default_remind_offset_seconds: int = DEFAULT_REMIND_OFFSET_SECONDS,
    ):
        super().__init__()
        self.default_list_name = default_list_name
        self.default_remind_offset_seconds = default_remind_offset_seconds
    
    @property
    def name(self) -> str:
        return "create_reminder"
    
    @property
    def description(self) -> str:
        return (
            f"在 macOS 提醒事项创建提醒（默认列表 {self.default_list_name}，"
            f"默认 {self.default_remind_offset_seconds // 60} 分钟后提醒），"
            "通过 iCloud 同步到 iPhone 并推送通知"
        )
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "提醒标题（必填）"
                },
                "notes": {
                    "type": "string",
                    "description": "备注内容（可选）"
                },
                "list_name": {
                    "type": "string",
                    "description": f"目标列表名（默认 {self.default_list_name}）",
                    "default": self.default_list_name
                },
                "remind_at": {
                    "type": "string",
                    "description": (
                        "提醒时间，ISO8601 格式（如 2026-01-20T14:30:00）或 "
                        "'+Nm' 表示 N 分钟后（如 '+30m'）。"
                        f"未指定时默认 +{self.default_remind_offset_seconds // 60}m"
                    )
                },
                "fallback_to_inbox": {
                    "type": "boolean",
                    "description": "列表不存在时是否回退到 Inbox/收件箱（默认 true）",
                    "default": True
                }
            },
            "required": ["title"]
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.SIDE_EFFECT
    
    @property
    def cost_estimate(self) -> float:
        return 1.0
    
    @property
    def reliability(self) -> float:
        return 0.9  # AppleScript 比浏览器自动化稳定
    
    def _parse_remind_at(self, remind_at: Optional[str]) -> datetime:
        """
        解析提醒时间参数
        
        支持格式：
        - None / 空字符串：默认偏移（现在 + N 分钟）
        - '+Nm'：N 分钟后（如 '+10m', '+30m'）
        - '+Nh'：N 小时后（如 '+1h', '+2h'）
        - ISO8601：具体时间（如 '2026-01-20T14:30:00'）
        
        Returns:
            datetime: 提醒时间
        """
        now = datetime.now()
        
        if not remind_at:
            return now + timedelta(seconds=self.default_remind_offset_seconds)
        
        remind_at = remind_at.strip()
        
        # 相对时间：+Nm 或 +Nh
        if remind_at.startswith("+"):
            try:
                value = remind_at[1:-1]
                unit = remind_at[-1].lower()
                num = int(value)
                
                if unit == "m":
                    return now + timedelta(minutes=num)
                elif unit == "h":
                    return now + timedelta(hours=num)
                else:
                    logger.warning(f"未知时间单位 '{unit}'，使用默认偏移")
                    return now + timedelta(seconds=self.default_remind_offset_seconds)
            except (ValueError, IndexError):
                logger.warning(f"无法解析相对时间 '{remind_at}'，使用默认偏移")
                return now + timedelta(seconds=self.default_remind_offset_seconds)
        
        # ISO8601 格式
        try:
            # 尝试多种常见格式
            for fmt in [
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M",
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d %H:%M",
            ]:
                try:
                    return datetime.strptime(remind_at, fmt)
                except ValueError:
                    continue
            
            logger.warning(f"无法解析时间 '{remind_at}'，使用默认偏移")
            return now + timedelta(seconds=self.default_remind_offset_seconds)
        
        except Exception as e:
            logger.warning(f"时间解析异常: {e}，使用默认偏移")
            return now + timedelta(seconds=self.default_remind_offset_seconds)
    
    def _check_list_exists(self, list_name: str) -> bool:
        """检查列表是否存在"""
        script = f'''
tell application "Reminders"
    try
        get list "{_escape_applescript_string(list_name)}"
        return "exists"
    on error
        return "not_found"
    end try
end tell
'''
        try:
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True,
                text=True,
                timeout=10
            )
            return "exists" in result.stdout
        except Exception as e:
            logger.warning(f"检查列表 '{list_name}' 时出错: {e}")
            return False
    
    def _find_fallback_list(self) -> Optional[str]:
        """查找可用的回退列表"""
        for name in FALLBACK_LIST_NAMES:
            if self._check_list_exists(name):
                logger.info(f"找到回退列表: {name}")
                return name
        return None
    
    def _build_create_script(
        self,
        title: str,
        list_name: str,
        remind_at: datetime,
        notes: Optional[str] = None,
    ) -> str:
        """
        构建创建提醒的 AppleScript
        
        AppleScript 时间格式需要特殊处理：
        使用 date 字符串解析，格式为 "month/day/year hour:minute:second"
        """
        escaped_title = _escape_applescript_string(title)
        escaped_list = _escape_applescript_string(list_name)
        escaped_notes = _escape_applescript_string(notes or "")
        
        # AppleScript 日期格式（使用当前 locale）
        # 为了可靠性，我们用 current date 加秒数偏移
        now = datetime.now()
        offset_seconds = int((remind_at - now).total_seconds())
        
        # 确保偏移不为负
        if offset_seconds < 0:
            offset_seconds = 60  # 至少 1 分钟后
        
        # 构建属性
        props = f'name:"{escaped_title}"'
        if notes:
            props += f', body:"{escaped_notes}"'
        
        script = f'''
tell application "Reminders"
    set targetList to list "{escaped_list}"
    set remindTime to (current date) + {offset_seconds}
    set newReminder to make new reminder in targetList with properties {{{props}, remind me date:remindTime}}
    return name of newReminder
end tell
'''
        return script
    
    def execute(
        self,
        title: str,
        notes: Optional[str] = None,
        list_name: Optional[str] = None,
        remind_at: Optional[str] = None,
        fallback_to_inbox: bool = True,
    ) -> ToolResult:
        """
        创建提醒
        
        Args:
            title: 提醒标题
            notes: 备注内容
            list_name: 目标列表名
            remind_at: 提醒时间
            fallback_to_inbox: 列表不存在时是否回退
        
        Returns:
            ToolResult
        """
        if not title or not title.strip():
            return ToolResult(
                success=False,
                error="提醒标题不能为空"
            )
        
        title = title.strip()
        target_list = list_name or self.default_list_name
        used_fallback = False
        
        logger.info(f"创建提醒: title='{title}', list='{target_list}'")
        
        # 检查目标列表是否存在
        if not self._check_list_exists(target_list):
            logger.warning(f"列表 '{target_list}' 不存在")
            
            if fallback_to_inbox:
                fallback_list = self._find_fallback_list()
                if fallback_list:
                    logger.info(f"回退到列表: {fallback_list}")
                    target_list = fallback_list
                    used_fallback = True
                else:
                    return ToolResult(
                        success=False,
                        error=f"列表 '{list_name or self.default_list_name}' 不存在，且未找到可用的回退列表"
                    )
            else:
                return ToolResult(
                    success=False,
                    error=f"列表 '{target_list}' 不存在"
                )
        
        # 解析提醒时间
        remind_datetime = self._parse_remind_at(remind_at)
        logger.info(f"提醒时间: {remind_datetime.isoformat()}")
        
        # 构建并执行 AppleScript
        script = self._build_create_script(
            title=title,
            list_name=target_list,
            remind_at=remind_datetime,
            notes=notes,
        )
        
        logger.debug(f"执行 AppleScript:\n{script}")
        
        try:
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode != 0:
                error_msg = result.stderr.strip() or "未知错误"
                logger.error(f"AppleScript 执行失败: {error_msg}")
                
                # 检查是否是权限问题
                if "not allowed" in error_msg.lower() or "permission" in error_msg.lower():
                    return ToolResult(
                        success=False,
                        error="权限被拒绝。请在「系统设置 → 隐私与安全性 → 自动化」中允许终端/Python 控制提醒事项。"
                    )
                
                return ToolResult(
                    success=False,
                    error=f"创建提醒失败: {error_msg}"
                )
            
            created_title = result.stdout.strip()
            logger.info(f"提醒创建成功: '{created_title}' in '{target_list}'")
            
            return ToolResult(
                success=True,
                data={
                    "message": "提醒创建成功",
                    "title": title,
                    "list_name": target_list,
                    "remind_at": remind_datetime.isoformat(),
                    "used_fallback": used_fallback,
                    "notes": notes,
                }
            )
        
        except subprocess.TimeoutExpired:
            logger.error("AppleScript 执行超时")
            return ToolResult(
                success=False,
                error="创建提醒超时，可能是提醒事项 App 未响应"
            )
        
        except Exception as e:
            logger.error(f"创建提醒异常: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=f"创建提醒异常: {str(e)}"
            )


class ListReminderListsTool(BaseTool):
    """
    列出 macOS 提醒事项中的所有列表（只读工具，用于排查）
    """
    
    @property
    def name(self) -> str:
        return "list_reminder_lists"
    
    @property
    def description(self) -> str:
        return "列出 macOS 提醒事项中的所有列表名称（用于排查列表名是否正确）"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": []
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.READONLY
    
    def execute(self) -> ToolResult:
        """列出所有提醒列表"""
        script = '''
tell application "Reminders"
    set listNames to {}
    repeat with aList in lists
        set end of listNames to name of aList
    end repeat
    return listNames
end tell
'''
        try:
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                error_msg = result.stderr.strip() or "未知错误"
                return ToolResult(
                    success=False,
                    error=f"获取列表失败: {error_msg}"
                )
            
            # AppleScript 返回格式: "list1, list2, list3"
            raw_output = result.stdout.strip()
            if raw_output:
                lists = [name.strip() for name in raw_output.split(",")]
            else:
                lists = []
            
            return ToolResult(
                success=True,
                data={
                    "lists": lists,
                    "count": len(lists)
                }
            )
        
        except subprocess.TimeoutExpired:
            return ToolResult(
                success=False,
                error="获取列表超时"
            )
        
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"获取列表异常: {str(e)}"
            )
