"""
存储工具封装

封装 mcp_servers/store_server 的 get_seen 和 mark_seen 功能
"""
import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from .base import BaseTool, ToolCategory, ToolResult

logger = logging.getLogger(__name__)

# 延迟导入
notion_client = None


def _get_notion_client():
    """获取 Notion 客户端"""
    global notion_client
    if notion_client is None:
        from notion_client import Client
        token = os.getenv('NOTION_TOKEN')
        if not token:
            raise ValueError("未设置 NOTION_TOKEN 环境变量")
        # 使用 2022-06-28 API 版本，因为新版本移除了 databases/{id}/query 端点
        notion_client = Client(auth=token, notion_version='2022-06-28')
    return notion_client


class GetSeenTool(BaseTool):
    """
    获取已看过条目工具
    
    从 Notion 数据库获取已看过的条目（用于去重）
    """
    
    def __init__(self, database_id: Optional[str] = None):
        super().__init__()
        self.database_id = database_id or os.getenv('NOTION_DATABASE_ID')
    
    @property
    def name(self) -> str:
        return "get_seen"
    
    @property
    def description(self) -> str:
        return "从 Notion 获取已看过的条目（用于去重）"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "namespace": {
                    "type": "string",
                    "default": "daily_news",
                    "description": "命名空间（用于区分不同类型的数据）"
                },
                "since_days": {
                    "type": "integer",
                    "default": 30,
                    "description": "查询最近多少天的记录"
                },
                "report_use_only": {
                    "type": "boolean",
                    "default": False,
                    "description": "仅查询标为reportUse=star的条目"
                }
            }
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.READONLY
    
    @property
    def cost_estimate(self) -> float:
        return 0.3  # API 调用
    
    def execute(
        self,
        namespace: str = "daily_news",
        since_days: int = 30,
        report_use_only: bool = False
    ) -> ToolResult:
        """
        获取已看过的条目
        
        Args:
            namespace: 命名空间
            since_days: 查询最近多少天的记录
            report_use_only: 仅查询标为reportUse=star的条目
        
        Returns:
            ToolResult
        """
        if not self.database_id:
            return ToolResult(
                success=False,
                error="未设置 NOTION_DATABASE_ID 环境变量"
            )
        
        logger.info(f"查询已看过的条目: namespace={namespace}, since_days={since_days}")
        
        try:
            client = _get_notion_client()
            
            # 计算起始日期
            since_date = (datetime.now() - timedelta(days=since_days)).date().isoformat()
            
            # 构建过滤条件
            filter_conditions = [
                {
                    "property": "seen_at",
                    "date": {
                        "on_or_after": since_date
                    }
                }
            ]
            
            # 如果只需要reportUse=star的条目，添加额外条件
            if report_use_only:
                filter_conditions.append({
                    "property": "reportUse",
                    "select": {
                        "equals": "star"
                    }
                })
            
            # 查询 Notion 数据库 (使用 request 方法，因为 2.7.0 版本移除了 databases.query)
            # 支持分页，获取所有符合条件的记录
            urls = []
            hashes = []
            start_cursor = None
            has_more = True
            
            while has_more:
                request_body = {
                    "filter": {
                        "and": filter_conditions
                    }
                }
                if start_cursor:
                    request_body["start_cursor"] = start_cursor
                
                results = client.request(
                    path=f"databases/{self.database_id}/query",
                    method="POST",
                    body=request_body
                )
                
                for page in results.get('results', []):
                    props = page.get('properties', {})
                    
                    # 提取 URL
                    url_prop = props.get('url', {})
                    if url_prop.get('type') == 'url':
                        url = url_prop.get('url')
                        if url:
                            urls.append(url)
                    
                    # 提取 hash
                    hash_prop = props.get('hash', {})
                    if hash_prop.get('type') == 'rich_text':
                        hash_text = hash_prop.get('rich_text', [])
                        if hash_text:
                            hashes.append(hash_text[0].get('plain_text', ''))
                
                has_more = results.get('has_more', False)
                start_cursor = results.get('next_cursor')
            
            logger.info(f"查询到 {len(urls)} 条已看过的记录")
            
            return ToolResult(
                success=True,
                data={
                    'urls': urls,
                    'hashes': hashes,
                    'total': len(urls)
                }
            )
        
        except Exception as e:
            logger.error(f"查询失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={'urls': [], 'hashes': [], 'total': 0}
            )


class MarkSeenTool(BaseTool):
    """
    标记已看过工具
    
    将条目标记为已看过（写入 Notion）
    """
    
    def __init__(self, database_id: Optional[str] = None):
        super().__init__()
        self.database_id = database_id or os.getenv('NOTION_DATABASE_ID')
    
    @property
    def name(self) -> str:
        return "mark_seen"
    
    @property
    def description(self) -> str:
        return "将条目标记为已看过（写入 Notion）"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "namespace": {
                    "type": "string",
                    "description": "命名空间"
                },
                "items": {
                    "type": "array",
                    "description": "条目列表",
                    "items": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string"},
                            "title": {"type": "string"},
                            "source": {"type": "string"},
                            "published_at": {"type": "string"},
                            "hash": {"type": "string"}
                        },
                        "required": ["url"]
                    }
                }
            },
            "required": ["namespace", "items"]
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.SIDE_EFFECT
    
    @property
    def cost_estimate(self) -> float:
        return 1.0  # 多个 API 调用
    
    def execute(
        self,
        namespace: str,
        items: List[Dict[str, Any]]
    ) -> ToolResult:
        """
        标记条目为已看过
        
        Args:
            namespace: 命名空间
            items: 条目列表
        
        Returns:
            ToolResult
        """
        if not self.database_id:
            return ToolResult(
                success=False,
                error="未设置 NOTION_DATABASE_ID 环境变量"
            )
        
        logger.info(f"标记为已看: namespace={namespace}, items_count={len(items)}")
        
        try:
            client = _get_notion_client()
            
            created = 0
            updated = 0
            errors = []
            
            for item in items:
                url = item.get('url')
                if not url:
                    logger.warning(f"条目缺少 URL: {item}")
                    continue
                
                # 准备 Notion 页面属性
                properties = {
                    'url': {'url': url},
                    'seen_at': {'date': {'start': datetime.now().date().isoformat()}}
                }
                
                # 可选字段 - title
                title_text = item.get('title', 'Untitled')[:2000]
                properties['title'] = {
                    'title': [{'text': {'content': title_text}}]
                }
                
                # 可选字段 - source
                if item.get('source'):
                    properties['source'] = {'select': {'name': item['source']}}
                
                # 可选字段 - published_at
                if item.get('published_at'):
                    try:
                        properties['published_at'] = {
                            'date': {'start': item['published_at'].split('T')[0]}
                        }
                    except Exception:
                        pass
                
                # 可选字段 - hash
                if item.get('hash'):
                    properties['hash'] = {
                        'rich_text': [{'text': {'content': item['hash'][:2000]}}]
                    }
                
                # 检查是否已存在（支持分页）
                try:
                    existing_results = []
                    start_cursor = None
                    has_more = True
                    
                    while has_more:
                        request_body = {
                            "filter": {
                                "property": "url",
                                "url": {"equals": url}
                            }
                        }
                        if start_cursor:
                            request_body["start_cursor"] = start_cursor
                        
                        existing = client.request(
                            path=f"databases/{self.database_id}/query",
                            method="POST",
                            body=request_body
                        )
                        
                        existing_results.extend(existing.get('results', []))
                        has_more = existing.get('has_more', False)
                        start_cursor = existing.get('next_cursor')
                    
                    if existing_results:
                        # 更新已存在的页面
                        page_id = existing_results[0]['id']
                        client.pages.update(page_id=page_id, properties=properties)
                        updated += 1
                    else:
                        # 创建新页面
                        client.pages.create(
                            parent={'database_id': self.database_id},
                            properties=properties
                        )
                        created += 1
                
                except Exception as e:
                    logger.error(f"处理条目失败 ({url}): {e}")
                    errors.append({'url': url, 'error': str(e)})
            
            logger.info(f"标记完成: created={created}, updated={updated}")
            
            return ToolResult(
                success=True,
                data={
                    'created': created,
                    'updated': updated,
                    'errors': errors if errors else None
                }
            )
        
        except Exception as e:
            logger.error(f"标记失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={'created': 0, 'updated': 0}
            )


class MarkReportUseTool(BaseTool):
    """
    标记简报使用工具
    
    将被简报选中的条目的 reportUse 字段标记为 star
    """
    
    def __init__(self, database_id: Optional[str] = None):
        super().__init__()
        self.database_id = database_id or os.getenv('NOTION_DATABASE_ID')
    
    @property
    def name(self) -> str:
        return "mark_report_use"
    
    @property
    def description(self) -> str:
        return "将被简报选中的条目标记为 star（更新 reportUse 字段）"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "urls": {
                    "type": "array",
                    "description": "被选中的 URL 列表",
                    "items": {"type": "string"}
                }
            },
            "required": ["urls"]
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.SIDE_EFFECT
    
    @property
    def cost_estimate(self) -> float:
        return 1.0  # 多个 API 调用
    
    def execute(self, urls: List[str]) -> ToolResult:
        """
        将指定 URL 的条目标记为 star
        
        Args:
            urls: 被选中的 URL 列表
        
        Returns:
            ToolResult
        """
        if not self.database_id:
            return ToolResult(
                success=False,
                error="未设置 NOTION_DATABASE_ID 环境变量"
            )
        
        if not urls:
            return ToolResult(
                success=True,
                data={'updated': 0, 'created': 0, 'errors': None}
            )
        
        logger.info(f"标记简报使用: urls_count={len(urls)}")
        
        try:
            client = _get_notion_client()
            
            updated = 0
            created = 0
            errors = []
            
            for url in urls:
                try:
                    # 根据 URL 查找条目（支持分页）
                    existing_results = []
                    start_cursor = None
                    has_more = True
                    
                    while has_more:
                        request_body = {
                            "filter": {
                                "property": "url",
                                "url": {"equals": url}
                            }
                        }
                        if start_cursor:
                            request_body["start_cursor"] = start_cursor
                        
                        existing = client.request(
                            path=f"databases/{self.database_id}/query",
                            method="POST",
                            body=request_body
                        )
                        
                        existing_results.extend(existing.get('results', []))
                        has_more = existing.get('has_more', False)
                        start_cursor = existing.get('next_cursor')
                    
                    if existing_results:
                        # 更新 reportUse 字段为 star
                        page_id = existing_results[0]['id']
                        client.pages.update(
                            page_id=page_id,
                            properties={
                                'reportUse': {'select': {'name': 'star'}}
                            }
                        )
                        updated += 1
                        logger.debug(f"已更新标记: {url}")
                    else:
                        # 创建新条目并标记为 star
                        properties = {
                            'url': {'url': url},
                            'seen_at': {'date': {'start': datetime.now().date().isoformat()}},
                            'reportUse': {'select': {'name': 'star'}}
                        }
                        properties['title'] = {
                            'title': [{'text': {'content': 'Untitled'}}]
                        }
                        
                        client.pages.create(
                            parent={'database_id': self.database_id},
                            properties=properties
                        )
                        created += 1
                        logger.debug(f"已创建并标记: {url}")
                
                except Exception as e:
                    logger.error(f"处理条目失败 ({url}): {e}")
                    errors.append({'url': url, 'error': str(e)})
            
            logger.info(f"标记完成: updated={updated}, created={created}")
            
            return ToolResult(
                success=True,
                data={
                    'updated': updated,
                    'created': created,
                    'errors': errors if errors else None
                }
            )
        
        except Exception as e:
            logger.error(f"标记失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={'updated': 0, 'created': 0}
            )
