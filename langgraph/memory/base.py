"""
记忆层基类

定义记忆存储的统一接口
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class MemoryEntry:
    """记忆条目"""
    key: str
    value: Any
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    ttl: Optional[int] = None  # 过期时间（秒），None 表示永不过期
    
    def is_expired(self) -> bool:
        """检查是否过期"""
        if self.ttl is None:
            return False
        elapsed = (datetime.now() - self.created_at).total_seconds()
        return elapsed > self.ttl
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "key": self.key,
            "value": self.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "metadata": self.metadata,
            "ttl": self.ttl,
        }


class BaseMemory(ABC):
    """
    记忆存储基类
    
    定义记忆存储的统一接口
    """
    
    @abstractmethod
    def get(self, key: str) -> Optional[MemoryEntry]:
        """
        获取记忆条目
        
        Args:
            key: 键
        
        Returns:
            记忆条目，不存在或已过期返回 None
        """
        pass
    
    @abstractmethod
    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> MemoryEntry:
        """
        设置记忆条目
        
        Args:
            key: 键
            value: 值
            ttl: 过期时间（秒）
            metadata: 元数据
        
        Returns:
            创建/更新的记忆条目
        """
        pass
    
    @abstractmethod
    def delete(self, key: str) -> bool:
        """
        删除记忆条目
        
        Args:
            key: 键
        
        Returns:
            是否成功删除
        """
        pass
    
    @abstractmethod
    def list_keys(self, prefix: Optional[str] = None) -> List[str]:
        """
        列出所有键
        
        Args:
            prefix: 键前缀（可选）
        
        Returns:
            键列表
        """
        pass
    
    @abstractmethod
    def clear(self) -> int:
        """
        清空所有记忆
        
        Returns:
            删除的条目数量
        """
        pass
    
    def exists(self, key: str) -> bool:
        """检查键是否存在"""
        return self.get(key) is not None
    
    def get_value(self, key: str, default: Any = None) -> Any:
        """获取值（便捷方法）"""
        entry = self.get(key)
        return entry.value if entry else default


class ConversationMemory(BaseMemory):
    """
    对话记忆（扩展接口）
    
    专门用于管理对话历史
    """
    
    @abstractmethod
    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        **kwargs
    ) -> None:
        """添加消息到对话"""
        pass
    
    @abstractmethod
    def get_messages(
        self,
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """获取对话消息"""
        pass
    
    @abstractmethod
    def clear_conversation(self, conversation_id: str) -> int:
        """清空对话"""
        pass


class VectorMemory(BaseMemory):
    """
    向量记忆（扩展接口）
    
    预留向量检索能力
    """
    
    @abstractmethod
    def search(
        self,
        query: str,
        top_k: int = 5,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[MemoryEntry]:
        """
        向量检索
        
        Args:
            query: 查询文本
            top_k: 返回数量
            filter: 过滤条件
        
        Returns:
            相关记忆条目列表
        """
        pass
    
    @abstractmethod
    def add_embedding(
        self,
        key: str,
        text: str,
        embedding: Optional[List[float]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> MemoryEntry:
        """
        添加带向量的记忆
        
        Args:
            key: 键
            text: 文本内容
            embedding: 向量（可选，不提供则自动生成）
            metadata: 元数据
        
        Returns:
            记忆条目
        """
        pass
