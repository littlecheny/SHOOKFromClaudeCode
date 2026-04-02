"""
日志监控实现

基于 logging 的事件记录实现
"""
import json
import logging
from datetime import datetime
from typing import List, Optional

from .base import BaseObserver, Event, EventType, Metrics

logger = logging.getLogger(__name__)


class LoggingObserver(BaseObserver):
    """
    日志监控观察者
    
    将事件记录到日志，并在内存中保存用于查询
    """
    
    def __init__(
        self,
        name: str = "langgraph",
        log_level: int = logging.INFO,
        max_events: int = 1000
    ):
        self.name = name
        self.log_level = log_level
        self.max_events = max_events
        
        self._events: List[Event] = []
        self._metrics = Metrics()
        
        # 配置日志
        self._logger = logging.getLogger(f"langgraph.{name}")
    
    def record(self, event: Event) -> None:
        """记录事件"""
        # 保存事件
        self._events.append(event)
        
        # 限制事件数量
        if len(self._events) > self.max_events:
            self._events = self._events[-self.max_events:]
        
        # 更新指标
        self._update_metrics(event)
        
        # 输出日志
        self._log_event(event)
    
    def get_events(
        self,
        event_type: Optional[EventType] = None,
        since: Optional[datetime] = None,
        limit: Optional[int] = None
    ) -> List[Event]:
        """获取事件列表"""
        events = self._events
        
        # 按类型过滤
        if event_type:
            events = [e for e in events if e.type == event_type]
        
        # 按时间过滤
        if since:
            events = [e for e in events if e.timestamp >= since]
        
        # 限制数量
        if limit:
            events = events[-limit:]
        
        return events
    
    def get_metrics(self) -> Metrics:
        """获取聚合指标"""
        return self._metrics
    
    def clear(self) -> int:
        """清空事件记录"""
        count = len(self._events)
        self._events.clear()
        self._metrics = Metrics()
        return count
    
    def _update_metrics(self, event: Event) -> None:
        """更新聚合指标"""
        self._metrics.total_events += 1
        
        if event.duration_ms:
            self._metrics.total_duration_ms += event.duration_ms
        
        self._metrics.total_tokens_input += event.tokens_input
        self._metrics.total_tokens_output += event.tokens_output
        self._metrics.total_estimated_cost += event.estimated_cost
        
        # 分类统计
        if event.type == EventType.TOOL_CALL:
            self._metrics.tool_calls += 1
        elif event.type == EventType.TOOL_ERROR:
            self._metrics.tool_errors += 1
        elif event.type == EventType.MODEL_CALL:
            self._metrics.model_calls += 1
        elif event.type == EventType.MODEL_ERROR:
            self._metrics.model_errors += 1
    
    def _log_event(self, event: Event) -> None:
        """输出事件日志"""
        # 构建日志消息
        msg_parts = [
            f"[{event.type.value}]",
            event.name,
        ]
        
        if event.duration_ms:
            msg_parts.append(f"({event.duration_ms:.1f}ms)")
        
        if event.tokens_input or event.tokens_output:
            msg_parts.append(f"tokens:{event.tokens_input}→{event.tokens_output}")
        
        msg = " ".join(msg_parts)
        
        # 根据事件类型选择日志级别
        if event.type in (EventType.TOOL_ERROR, EventType.MODEL_ERROR):
            self._logger.error(msg)
        elif event.type in (EventType.GRAPH_START, EventType.GRAPH_END):
            self._logger.info(msg)
        else:
            self._logger.debug(msg)
    
    def summary(self) -> str:
        """生成摘要报告"""
        m = self._metrics
        return (
            f"=== LangGraph 执行摘要 ({self.name}) ===\n"
            f"总事件数: {m.total_events}\n"
            f"总耗时: {m.total_duration_ms:.1f}ms\n"
            f"工具调用: {m.tool_calls} (错误: {m.tool_errors})\n"
            f"模型调用: {m.model_calls} (错误: {m.model_errors})\n"
            f"Token 消耗: {m.total_tokens_input} → {m.total_tokens_output}\n"
            f"估计成本: ${m.total_estimated_cost:.4f}\n"
        )
    
    def export_events(self, filepath: str) -> int:
        """导出事件到文件"""
        events_data = [e.to_dict() for e in self._events]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(events_data, f, ensure_ascii=False, indent=2)
        
        return len(events_data)


# 全局默认观察者
_default_observer: Optional[LoggingObserver] = None


def get_default_observer() -> LoggingObserver:
    """获取默认观察者"""
    global _default_observer
    
    if _default_observer is None:
        _default_observer = LoggingObserver()
    
    return _default_observer
