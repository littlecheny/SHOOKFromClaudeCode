"""
工具注册中心

统一管理所有可用工具，支持动态注册和查询
"""
import logging
from typing import Dict, List, Optional, Type

from .base import BaseTool, ToolCategory, ToolSchema

logger = logging.getLogger(__name__)


class ToolRegistry:
    """
    工具注册中心
    
    用法:
        registry = ToolRegistry()
        registry.register(MyTool())
        tool = registry.get("my_tool")
        result = tool.execute(...)
    """
    
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
    
    def register(self, tool: BaseTool) -> None:
        """
        注册工具
        
        Args:
            tool: 工具实例
        """
        if tool.name in self._tools:
            logger.warning(f"工具 {tool.name} 已存在，将被覆盖")
        
        self._tools[tool.name] = tool
        logger.info(f"注册工具: {tool.name}")
    
    def unregister(self, name: str) -> bool:
        """
        注销工具
        
        Args:
            name: 工具名称
        
        Returns:
            是否成功注销
        """
        if name in self._tools:
            del self._tools[name]
            logger.info(f"注销工具: {name}")
            return True
        return False
    
    def get(self, name: str) -> Optional[BaseTool]:
        """
        获取工具
        
        Args:
            name: 工具名称
        
        Returns:
            工具实例，不存在则返回 None
        """
        return self._tools.get(name)
    
    def list_tools(self) -> List[str]:
        """获取所有工具名称"""
        return list(self._tools.keys())
    
    def list_schemas(self) -> List[ToolSchema]:
        """获取所有工具的 schema"""
        return [tool.get_schema() for tool in self._tools.values()]
    
    def filter_by_category(self, category: ToolCategory) -> List[BaseTool]:
        """
        按分类过滤工具
        
        Args:
            category: 工具分类
        
        Returns:
            符合分类的工具列表
        """
        return [
            tool for tool in self._tools.values()
            if tool.category == category
        ]
    
    def get_readonly_tools(self) -> List[BaseTool]:
        """获取只读工具"""
        return self.filter_by_category(ToolCategory.READONLY)
    
    def get_side_effect_tools(self) -> List[BaseTool]:
        """获取有副作用的工具"""
        return self.filter_by_category(ToolCategory.SIDE_EFFECT)
    
    def __len__(self) -> int:
        return len(self._tools)
    
    def __contains__(self, name: str) -> bool:
        return name in self._tools
    
    def __iter__(self):
        return iter(self._tools.values())


# 全局默认注册中心
_default_registry: Optional[ToolRegistry] = None


def get_default_registry() -> ToolRegistry:
    """
    获取默认工具注册中心
    
    首次调用时会自动注册所有内置工具
    """
    global _default_registry
    
    if _default_registry is None:
        _default_registry = ToolRegistry()
        _register_builtin_tools(_default_registry)
    
    return _default_registry


def _register_builtin_tools(registry: ToolRegistry) -> None:
    """注册内置工具"""
    # 延迟导入避免循环依赖
    from .github import CommitAndPushTool
    from .news import FetchFeedTool, FetchFeedsTool
    from .store import GetSeenTool, MarkSeenTool, MarkReportUseTool
    from .reminders import CreateReminderTool, ListReminderListsTool
    from .dxy import GetDXYTool, GetDXYInfoTool, GenerateDXYDashboardTool
    from .nasdaq import GetNasdaqTool, GetNasdaqInfoTool, GenerateNasdaqDashboardTool
    from .stablecoin import GetStablecoinTool, GetStablecoinInfoTool, GenerateStablecoinDashboardTool
    from .fear_greed import GetFearGreedTool, GetFearGreedInfoTool, GenerateFearGreedDashboardTool
    from .okx_funding import GetOKXFundingRateTool, GetOKXFundingRateInfoTool, GenerateOKXFundingRateDashboardTool
    from .okx_spot import GetOKXSpotPriceTool, GenerateOKXSpotDashboardTool
    from .okx_futures import GetOKXFuturesPriceTool, GenerateOKXFuturesDashboardTool
    from .farside_btc import FarsideBTCScreenshotTool
    
    # 注册所有内置工具
    registry.register(CommitAndPushTool())
    registry.register(FetchFeedTool())
    registry.register(FetchFeedsTool())
    registry.register(GetSeenTool())
    registry.register(MarkSeenTool())
    registry.register(MarkReportUseTool())
    
    # DXY 工具
    registry.register(GetDXYTool())
    registry.register(GetDXYInfoTool())
    registry.register(GenerateDXYDashboardTool())
    
    # NASDAQ 工具
    registry.register(GetNasdaqTool())
    registry.register(GetNasdaqInfoTool())
    registry.register(GenerateNasdaqDashboardTool())
    
    # 稳定币工具
    registry.register(GetStablecoinTool())
    registry.register(GetStablecoinInfoTool())
    registry.register(GenerateStablecoinDashboardTool())
    
    # 贪婪恐慌指数工具
    registry.register(GetFearGreedTool())
    registry.register(GetFearGreedInfoTool())
    registry.register(GenerateFearGreedDashboardTool())
    
    # OKX 资金费率工具
    registry.register(GetOKXFundingRateTool())
    registry.register(GetOKXFundingRateInfoTool())
    registry.register(GenerateOKXFundingRateDashboardTool())
    
    # OKX 现货价格工具
    registry.register(GetOKXSpotPriceTool())
    registry.register(GenerateOKXSpotDashboardTool())
    
    # OKX 合约价格工具
    registry.register(GetOKXFuturesPriceTool())
    registry.register(GenerateOKXFuturesDashboardTool())
    
    # Farside BTC 截图工具
    registry.register(FarsideBTCScreenshotTool())
    
    # 提醒事项工具
    registry.register(CreateReminderTool())         # 创建提醒（iCloud 同步到手机）
    registry.register(ListReminderListsTool())      # 列出提醒列表（只读，排查用）
    
    logger.info(f"已注册 {len(registry)} 个内置工具")
