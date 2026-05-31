"""
新闻采集工具封装

封装 mcp_servers/news_server 的 fetch_feed 和 fetch_feeds 功能
"""
import logging
import os
import socket
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import BaseTool, ToolCategory, ToolResult

logger = logging.getLogger(__name__)

DEFAULT_FEED_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 Shook/0.1 RSS Reader"
)
DEFAULT_FEED_ACCEPT = "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"

# 延迟导入，避免依赖问题
feedparser = None
date_parser = None


def _ensure_deps():
    """确保依赖已导入"""
    global feedparser, date_parser
    if feedparser is None:
        import feedparser as fp
        feedparser = fp
    if date_parser is None:
        from dateutil import parser
        date_parser = parser


def _feed_timeout_seconds() -> int:
    try:
        return int(os.getenv("SHOOK_FEED_TIMEOUT_SECONDS", "12"))
    except ValueError:
        return 12


def _format_fetch_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        return f"HTTP {error.code} {error.reason}"
    if isinstance(error, urllib.error.URLError):
        return f"URL error: {error.reason}"
    if isinstance(error, socket.timeout):
        return "timeout"
    return str(error)


class FetchFeedTool(BaseTool):
    """
    单 Feed 拉取工具
    
    从单个 RSS/Atom feed 拉取内容
    """
    
    @property
    def name(self) -> str:
        return "fetch_feed"
    
    @property
    def description(self) -> str:
        return "从单个 RSS/Atom feed 拉取内容"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "feed_url": {
                    "type": "string",
                    "description": "Feed URL"
                },
                "since": {
                    "type": "string",
                    "description": "起始时间（ISO 格式），只返回此时间之后的条目"
                },
                "limit": {
                    "type": "integer",
                    "default": 50,
                    "description": "最大返回数量"
                }
            },
            "required": ["feed_url"]
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.READONLY
    
    @property
    def cost_estimate(self) -> float:
        return 0.5  # 网络请求
    
    def execute(
        self,
        feed_url: str,
        since: Optional[str] = None,
        limit: int = 50
    ) -> ToolResult:
        """
        从 feed 拉取内容
        
        Args:
            feed_url: Feed URL
            since: 起始时间（ISO 格式）
            limit: 最大返回数量
        
        Returns:
            ToolResult
        """
        _ensure_deps()
        
        logger.info(f"拉取 feed: {feed_url}")
        
        try:
            # feedparser.parse(url) 没有稳定超时控制；同时部分站点会拒绝
            # Python 默认 User-Agent，所以这里显式设置 RSS 读取器请求头。
            request = urllib.request.Request(
                feed_url,
                headers={
                    "User-Agent": os.getenv("SHOOK_FEED_USER_AGENT", DEFAULT_FEED_USER_AGENT),
                    "Accept": DEFAULT_FEED_ACCEPT,
                },
            )
            with urllib.request.urlopen(request, timeout=_feed_timeout_seconds()) as response:
                feed_bytes = response.read()
            feed = feedparser.parse(feed_bytes)
            
            if feed.bozo:
                logger.warning(f"Feed 解析警告: {feed.bozo_exception}")
            
            # 解析起始时间
            since_dt = None
            if since:
                try:
                    since_dt = date_parser.parse(since)
                except Exception as e:
                    logger.warning(f"解析 since 时间失败: {e}")
            
            items = []
            for entry in feed.entries:
                # 解析发布时间
                published_at = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    try:
                        published_at = datetime(*entry.published_parsed[:6])
                    except Exception:
                        pass
                elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                    try:
                        published_at = datetime(*entry.updated_parsed[:6])
                    except Exception:
                        pass
                
                # 检查时间过滤
                if since_dt and published_at:
                    if published_at < since_dt:
                        continue
                
                # 提取摘要
                summary = entry.get('summary', entry.get('description', ''))
                
                items.append({
                    'title': entry.get('title', ''),
                    'url': entry.get('link', ''),
                    'source': feed.feed.get('title', feed_url),
                    'published_at': published_at.isoformat() if published_at else None,
                    'summary': summary
                })
                
                if len(items) >= limit:
                    break
            
            logger.info(f"从 {feed_url} 拉取到 {len(items)} 条")
            
            return ToolResult(
                success=True,
                data={
                    'items': items,
                    'total': len(items),
                    'feed_title': feed.feed.get('title', feed_url)
                }
            )
        
        except Exception as e:
            error_message = _format_fetch_error(e)
            logger.warning(f"拉取 feed 失败: {feed_url} - {error_message}")
            return ToolResult(
                success=False,
                error=error_message,
                data={'items': [], 'total': 0}
            )


class FetchFeedsTool(BaseTool):
    """
    多 Feed 拉取工具
    
    从多个 RSS/Atom feed 拉取内容并汇总
    """
    
    def __init__(self):
        super().__init__()
        self._fetch_feed_tool = FetchFeedTool()
    
    @property
    def name(self) -> str:
        return "fetch_feeds"
    
    @property
    def description(self) -> str:
        return "从多个 feeds 拉取内容并汇总"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "feeds": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "url": {"type": "string"}
                        },
                        "required": ["url"]
                    },
                    "description": "Feed 列表"
                },
                "since": {
                    "type": "string",
                    "description": "起始时间（ISO 格式）"
                },
                "limit_per_feed": {
                    "type": "integer",
                    "default": 20,
                    "description": "每个 feed 的最大返回数量"
                }
            },
            "required": ["feeds"]
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.READONLY
    
    @property
    def cost_estimate(self) -> float:
        return 2.0  # 多个网络请求
    
    def execute(
        self,
        feeds: List[Dict[str, str]],
        since: Optional[str] = None,
        limit_per_feed: int = 20
    ) -> ToolResult:
        """
        从多个 feeds 拉取内容
        
        Args:
            feeds: Feed 列表 [{'name': str, 'url': str}, ...]
            since: 起始时间（ISO 格式）
            limit_per_feed: 每个 feed 的最大返回数量
        
        Returns:
            ToolResult
        """
        logger.info(f"拉取 {len(feeds)} 个 feeds")
        
        all_items = []
        errors = []
        
        for feed_info in feeds:
            feed_url = feed_info.get('url')
            if not feed_url:
                logger.warning(f"Feed 缺少 URL: {feed_info}")
                continue
            
            result = self._fetch_feed_tool.execute(
                feed_url=feed_url,
                since=since,
                limit=limit_per_feed
            )
            
            if result.success:
                items = result.data.get('items', [])
                # 添加 feed 名称
                for item in items:
                    if 'name' in feed_info:
                        item['feed_name'] = feed_info['name']
                all_items.extend(items)
            else:
                errors.append({
                    'name': feed_info.get('name'),
                    'url': feed_url,
                    'error': result.error
                })
        
        # 按发布时间排序（最新的在前）
        all_items.sort(
            key=lambda x: x.get('published_at', ''),
            reverse=True
        )
        
        return ToolResult(
            success=True,
            data={
                'items': all_items,
                'total': len(all_items),
                'feeds_count': len(feeds),
                'errors': errors if errors else None
            }
        )
