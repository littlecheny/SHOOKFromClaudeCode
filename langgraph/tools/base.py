"""
LangGraph Tool 基类

定义工具的统一接口和数据结构
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum


class ToolCategory(Enum):
    """工具分类"""
    READONLY = "readonly"      # 只读工具（安全、低成本）
    SIDE_EFFECT = "side_effect"  # 有副作用工具（写库、发消息）
    EXPENSIVE = "expensive"    # 昂贵工具（检索、长上下文）


@dataclass
class ToolResult:
    """工具执行结果"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "metadata": self.metadata,
        }


@dataclass
class ToolSchema:
    """工具的输入输出 schema"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Optional[Dict[str, Any]] = None
    category: ToolCategory = ToolCategory.READONLY
    cost_estimate: float = 0.0  # 估计成本（token 或时间）
    reliability: float = 1.0    # 稳定性 0-1


class BaseTool(ABC):
    """
    LangGraph Tool 基类
    
    所有工具都应继承此类并实现 execute 方法
    """
    
    def __init__(self):
        self._schema: Optional[ToolSchema] = None
    
    @property
    @abstractmethod
    def name(self) -> str:
        """工具名称"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """工具描述"""
        pass
    
    @property
    @abstractmethod
    def input_schema(self) -> Dict[str, Any]:
        """输入参数 schema (JSON Schema 格式)"""
        pass
    
    @property
    def output_schema(self) -> Optional[Dict[str, Any]]:
        """输出结果 schema (可选)"""
        return None
    
    @property
    def category(self) -> ToolCategory:
        """工具分类"""
        return ToolCategory.READONLY
    
    @property
    def cost_estimate(self) -> float:
        """估计成本"""
        return 0.0
    
    @property
    def reliability(self) -> float:
        """稳定性"""
        return 1.0
    
    def get_schema(self) -> ToolSchema:
        """获取工具 schema"""
        if self._schema is None:
            self._schema = ToolSchema(
                name=self.name,
                description=self.description,
                input_schema=self.input_schema,
                output_schema=self.output_schema,
                category=self.category,
                cost_estimate=self.cost_estimate,
                reliability=self.reliability,
            )
        return self._schema
    
    @abstractmethod
    def execute(self, **kwargs) -> ToolResult:
        """
        执行工具
        
        Args:
            **kwargs: 工具输入参数
        
        Returns:
            ToolResult: 执行结果
        """
        pass
    
    def __call__(self, **kwargs) -> ToolResult:
        """允许直接调用工具"""
        return self.execute(**kwargs)
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name!r})"
