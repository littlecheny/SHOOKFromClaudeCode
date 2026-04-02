"""
监控层基类

定义事件记录和指标收集的接口
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class EventType(Enum):
    """事件类型"""
    # 图执行事件
    GRAPH_START = "graph_start"
    GRAPH_END = "graph_end"
    NODE_START = "node_start"
    NODE_END = "node_end"
    
    # 工具事件
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    TOOL_ERROR = "tool_error"
    
    # 模型事件
    MODEL_CALL = "model_call"
    MODEL_RESPONSE = "model_response"
    MODEL_ERROR = "model_error"
    
    # 记忆事件
    MEMORY_READ = "memory_read"
    MEMORY_WRITE = "memory_write"
    
    # 自定义事件
    CUSTOM = "custom"


@dataclass
class Event:
    """事件对象"""
    type: EventType
    name: str
    timestamp: datetime = field(default_factory=datetime.now)
    data: Dict[str, Any] = field(default_factory=dict)
    duration_ms: Optional[float] = None  # 耗时（毫秒）
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # 成本相关
    tokens_input: int = 0
    tokens_output: int = 0
    estimated_cost: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "type": self.type.value,
            "name": self.name,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
            "duration_ms": self.duration_ms,
            "tokens_input": self.tokens_input,
            "tokens_output": self.tokens_output,
            "estimated_cost": self.estimated_cost,
            "metadata": self.metadata,
        }


@dataclass
class Metrics:
    """聚合指标"""
    total_events: int = 0
    total_duration_ms: float = 0.0
    total_tokens_input: int = 0
    total_tokens_output: int = 0
    total_estimated_cost: float = 0.0
    tool_calls: int = 0
    tool_errors: int = 0
    model_calls: int = 0
    model_errors: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "total_events": self.total_events,
            "total_duration_ms": self.total_duration_ms,
            "total_tokens_input": self.total_tokens_input,
            "total_tokens_output": self.total_tokens_output,
            "total_estimated_cost": self.total_estimated_cost,
            "tool_calls": self.tool_calls,
            "tool_errors": self.tool_errors,
            "model_calls": self.model_calls,
            "model_errors": self.model_errors,
        }


class BaseObserver(ABC):
    """
    监控观察者基类
    
    定义事件记录和指标收集的接口
    """
    
    @abstractmethod
    def record(self, event: Event) -> None:
        """
        记录事件
        
        Args:
            event: 事件对象
        """
        pass
    
    @abstractmethod
    def get_events(
        self,
        event_type: Optional[EventType] = None,
        since: Optional[datetime] = None,
        limit: Optional[int] = None
    ) -> List[Event]:
        """
        获取事件列表
        
        Args:
            event_type: 事件类型过滤
            since: 起始时间
            limit: 数量限制
        
        Returns:
            事件列表
        """
        pass
    
    @abstractmethod
    def get_metrics(self) -> Metrics:
        """
        获取聚合指标
        
        Returns:
            指标对象
        """
        pass
    
    @abstractmethod
    def clear(self) -> int:
        """
        清空事件记录
        
        Returns:
            清除的事件数量
        """
        pass
    
    # 便捷方法
    def record_tool_call(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        **kwargs
    ) -> None:
        """记录工具调用"""
        self.record(Event(
            type=EventType.TOOL_CALL,
            name=tool_name,
            data={"arguments": arguments},
            **kwargs
        ))
    
    def record_tool_result(
        self,
        tool_name: str,
        result: Any,
        duration_ms: Optional[float] = None,
        **kwargs
    ) -> None:
        """记录工具结果"""
        self.record(Event(
            type=EventType.TOOL_RESULT,
            name=tool_name,
            data={"result": result},
            duration_ms=duration_ms,
            **kwargs
        ))
    
    def record_tool_error(
        self,
        tool_name: str,
        error: str,
        **kwargs
    ) -> None:
        """记录工具错误"""
        self.record(Event(
            type=EventType.TOOL_ERROR,
            name=tool_name,
            data={"error": error},
            **kwargs
        ))
    
    def record_model_call(
        self,
        model_name: str,
        messages: List[Dict],
        **kwargs
    ) -> None:
        """记录模型调用"""
        self.record(Event(
            type=EventType.MODEL_CALL,
            name=model_name,
            data={"messages_count": len(messages)},
            **kwargs
        ))
    
    def record_model_response(
        self,
        model_name: str,
        response: str,
        tokens_input: int = 0,
        tokens_output: int = 0,
        duration_ms: Optional[float] = None,
        **kwargs
    ) -> None:
        """记录模型响应"""
        self.record(Event(
            type=EventType.MODEL_RESPONSE,
            name=model_name,
            data={"response_length": len(response)},
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            duration_ms=duration_ms,
            **kwargs
        ))
