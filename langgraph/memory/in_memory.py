"""
内存存储实现

简单的内存记忆存储，适合开发和测试
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import BaseMemory, ConversationMemory, MemoryEntry

logger = logging.getLogger(__name__)


class InMemoryStore(BaseMemory):
    """
    内存记忆存储
    
    数据存储在内存中，进程退出后丢失
    """
    
    def __init__(self):
        self._store: Dict[str, MemoryEntry] = {}
    
    def get(self, key: str) -> Optional[MemoryEntry]:
        """获取记忆条目"""
        entry = self._store.get(key)
        
        if entry is None:
            return None
        
        # 检查是否过期
        if entry.is_expired():
            del self._store[key]
            return None
        
        return entry
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> MemoryEntry:
        """设置记忆条目"""
        now = datetime.now()
        
        # 检查是否已存在
        existing = self._store.get(key)
        
        if existing:
            # 更新现有条目
            existing.value = value
            existing.updated_at = now
            if ttl is not None:
                existing.ttl = ttl
            if metadata:
                existing.metadata.update(metadata)
            return existing
        
        # 创建新条目
        entry = MemoryEntry(
            key=key,
            value=value,
            created_at=now,
            updated_at=now,
            metadata=metadata or {},
            ttl=ttl,
        )
        self._store[key] = entry
        return entry
    
    def delete(self, key: str) -> bool:
        """删除记忆条目"""
        if key in self._store:
            del self._store[key]
            return True
        return False
    
    def list_keys(self, prefix: Optional[str] = None) -> List[str]:
        """列出所有键"""
        # 先清理过期条目
        self._cleanup_expired()
        
        if prefix:
            return [k for k in self._store.keys() if k.startswith(prefix)]
        return list(self._store.keys())
    
    def clear(self) -> int:
        """清空所有记忆"""
        count = len(self._store)
        self._store.clear()
        return count
    
    def _cleanup_expired(self) -> int:
        """清理过期条目"""
        expired = [k for k, v in self._store.items() if v.is_expired()]
        for key in expired:
            del self._store[key]
        return len(expired)
    
    def __len__(self) -> int:
        return len(self._store)


class InMemoryConversationStore(ConversationMemory):
    """
    内存对话存储
    
    专门用于管理对话历史
    """
    
    def __init__(self, max_messages_per_conversation: int = 100):
        self._conversations: Dict[str, List[Dict[str, Any]]] = {}
        self._store: Dict[str, MemoryEntry] = {}
        self.max_messages = max_messages_per_conversation
    
    # 实现 BaseMemory 接口
    def get(self, key: str) -> Optional[MemoryEntry]:
        return self._store.get(key)
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> MemoryEntry:
        now = datetime.now()
        entry = MemoryEntry(
            key=key,
            value=value,
            created_at=now,
            updated_at=now,
            metadata=metadata or {},
            ttl=ttl,
        )
        self._store[key] = entry
        return entry
    
    def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            return True
        return False
    
    def list_keys(self, prefix: Optional[str] = None) -> List[str]:
        if prefix:
            return [k for k in self._store.keys() if k.startswith(prefix)]
        return list(self._store.keys())
    
    def clear(self) -> int:
        count = len(self._store) + len(self._conversations)
        self._store.clear()
        self._conversations.clear()
        return count
    
    # 实现 ConversationMemory 接口
    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        **kwargs
    ) -> None:
        """添加消息到对话"""
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = []
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            **kwargs
        }
        
        self._conversations[conversation_id].append(message)
        
        # 限制消息数量
        if len(self._conversations[conversation_id]) > self.max_messages:
            self._conversations[conversation_id] = \
                self._conversations[conversation_id][-self.max_messages:]
    
    def get_messages(
        self,
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """获取对话消息"""
        messages = self._conversations.get(conversation_id, [])
        
        if limit:
            return messages[-limit:]
        return messages
    
    def clear_conversation(self, conversation_id: str) -> int:
        """清空对话"""
        if conversation_id in self._conversations:
            count = len(self._conversations[conversation_id])
            del self._conversations[conversation_id]
            return count
        return 0
    
    def list_conversations(self) -> List[str]:
        """列出所有对话 ID"""
        return list(self._conversations.keys())
