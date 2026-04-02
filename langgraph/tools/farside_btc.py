"""
Farside BTC 截图工具

使用 playwright 对 https://farside.co.uk/btc/ 网站进行截图
"""
import logging
from typing import Any, Dict
from pathlib import Path
from datetime import datetime
import asyncio

from .base import BaseTool, ToolCategory, ToolResult

logger = logging.getLogger(__name__)

# 延迟导入，避免依赖问题
playwright = None
sync_playwright = None


def _ensure_deps():
    """确保依赖已导入"""
    global playwright, sync_playwright
    if sync_playwright is None:
        from playwright.sync_api import sync_playwright as sp
        sync_playwright = sp


class FarsideBTCScreenshotTool(BaseTool):
    """
    Farside BTC 截图工具
    
    对 https://farside.co.uk/btc/ 网站进行截图，
    保存比特币资金流向数据可视化
    """
    
    FARSIDE_URL = "https://farside.co.uk/btc/"
    
    @property
    def name(self) -> str:
        return "farside_btc_screenshot"
    
    @property
    def description(self) -> str:
        return "对 Farside BTC 网站进行截图，保存比特币资金流向数据"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "output_path": {
                    "type": "string",
                    "description": "截图输出路径（默认：reports/farside_btc_<timestamp>.png）",
                    "default": None
                },
                "full_page": {
                    "type": "boolean",
                    "description": "是否截取整个页面（默认：True）",
                    "default": True
                },
                "width": {
                    "type": "integer",
                    "description": "浏览器窗口宽度（默认：1920）",
                    "default": 1920
                },
                "height": {
                    "type": "integer",
                    "description": "浏览器窗口高度（默认：1080）",
                    "default": 1080
                }
            },
            "required": []
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.SIDE_EFFECT
    
    @property
    def cost_estimate(self) -> float:
        return 1.5  # 网络请求 + 浏览器操作
    
    def execute(
        self,
        output_path: str = None,
        full_page: bool = True,
        width: int = 1920,
        height: int = 1080
    ) -> ToolResult:
        """
        对 Farside BTC 网站进行截图
        
        Args:
            output_path: 截图输出路径
            full_page: 是否截取整个页面
            width: 浏览器窗口宽度
            height: 浏览器窗口高度
        
        Returns:
            ToolResult，包含：
            - output_path: 截图文件路径
            - url: 网站 URL
            - timestamp: 截图时间戳
            - file_size: 文件大小（字节）
        """
        _ensure_deps()
        
        # 设置默认输出路径
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"reports/farside_btc_{timestamp}.png"
        
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"开始截取 Farside BTC 网站截图: {self.FARSIDE_URL}")
        
        try:
            with sync_playwright() as p:
                # 启动浏览器
                browser = p.chromium.launch(headless=True)
                
                # 创建浏览器上下文
                context = browser.new_context(
                    viewport={'width': width, 'height': height},
                    user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                )
                
                # 创建新页面
                page = context.new_page()
                
                # 访问网站
                logger.info(f"访问页面: {self.FARSIDE_URL}")
                page.goto(self.FARSIDE_URL, wait_until='load', timeout=90000)
                
                # 等待页面内容加载
                page.wait_for_timeout(5000)
                
                # 截图
                logger.info(f"开始截图，full_page={full_page}")
                page.screenshot(
                    path=str(output_file),
                    full_page=full_page
                )
                
                # 关闭浏览器
                browser.close()
            
            # 获取文件大小
            file_size = output_file.stat().st_size
            
            result = {
                'output_path': str(output_file),
                'url': self.FARSIDE_URL,
                'timestamp': datetime.now().isoformat(),
                'file_size': file_size,
                'full_page': full_page,
                'viewport': {'width': width, 'height': height}
            }
            
            logger.info(f"成功截取 Farside BTC 截图: {output_file} ({file_size} 字节)")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"截取 Farside BTC 截图失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={'url': self.FARSIDE_URL}
            )
