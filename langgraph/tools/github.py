"""
GitHub 工具封装

封装 mcp_servers/github_server 的 commit_and_push 功能
"""
import logging
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base import BaseTool, ToolCategory, ToolResult

logger = logging.getLogger(__name__)


class CommitAndPushTool(BaseTool):
    """
    Git 提交并推送工具
    
    封装 git add + commit + push 流程
    """
    
    def __init__(self, default_repo_path: Optional[str] = None):
        super().__init__()
        self.default_repo_path = default_repo_path or os.getenv('GIT_REPO_PATH')
    
    @property
    def name(self) -> str:
        return "commit_and_push"
    
    @property
    def description(self) -> str:
        return "提交并推送代码到 GitHub（使用 git CLI）"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "repo_path": {
                    "type": "string",
                    "description": "仓库路径（默认使用 GIT_REPO_PATH 环境变量）"
                },
                "paths": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "要提交的文件路径列表（相对于仓库根目录），不指定则添加所有变更"
                },
                "message": {
                    "type": "string",
                    "description": "提交信息（中文）"
                }
            },
            "required": ["message"]
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.SIDE_EFFECT
    
    @property
    def cost_estimate(self) -> float:
        return 1.0  # git 操作相对耗时
    
    def execute(
        self,
        message: str,
        repo_path: Optional[str] = None,
        paths: Optional[List[str]] = None,
    ) -> ToolResult:
        """
        执行提交并推送
        
        Args:
            message: 提交信息
            repo_path: 仓库路径
            paths: 要提交的文件列表
        
        Returns:
            ToolResult
        """
        # 确定仓库路径
        repo = repo_path or self.default_repo_path
        if not repo:
            return ToolResult(
                success=False,
                error="未指定仓库路径，且未设置 GIT_REPO_PATH 环境变量"
            )
        
        repo = Path(repo).resolve()
        if not repo.exists():
            return ToolResult(
                success=False,
                error=f"仓库路径不存在: {repo}"
            )
        
        logger.info(f"提交并推送: repo={repo}, message={message}")
        
        try:
            # 1. 添加文件到暂存区
            if paths:
                for path in paths:
                    result = self._run_git(['add', path], cwd=str(repo))
                    if not result['success']:
                        return ToolResult(
                            success=False,
                            error=f"git add 失败: {result.get('stderr', '')}"
                        )
            else:
                result = self._run_git(['add', '-A'], cwd=str(repo))
                if not result['success']:
                    return ToolResult(
                        success=False,
                        error=f"git add 失败: {result.get('stderr', '')}"
                    )
            
            # 2. 检查是否有变更需要提交
            status_result = self._run_git(['status', '--porcelain'], cwd=str(repo))
            if not status_result['stdout'].strip():
                logger.info("没有变更需要提交")
                return ToolResult(
                    success=True,
                    data={"message": "No changes to commit", "pushed": False}
                )
            
            # 3. 提交
            commit_result = self._run_git(['commit', '-m', message], cwd=str(repo))
            if not commit_result['success']:
                if 'nothing to commit' in commit_result.get('stdout', ''):
                    return ToolResult(
                        success=True,
                        data={"message": "No changes to commit", "pushed": False}
                    )
                return ToolResult(
                    success=False,
                    error=f"git commit 失败: {commit_result.get('stderr', '')}"
                )
            
            # 4. 获取 commit SHA
            sha_result = self._run_git(['rev-parse', 'HEAD'], cwd=str(repo))
            commit_sha = sha_result['stdout'].strip() if sha_result['success'] else None
            
            # 5. 推送
            push_result = self._run_git(['push'], cwd=str(repo))
            if not push_result['success']:
                return ToolResult(
                    success=False,
                    data={"commit_sha": commit_sha, "pushed": False},
                    error=f"git push 失败: {push_result.get('stderr', '')}"
                )
            
            logger.info(f"提交并推送成功: commit_sha={commit_sha}")
            return ToolResult(
                success=True,
                data={
                    "commit_sha": commit_sha,
                    "pushed": True,
                    "message": message
                }
            )
        
        except Exception as e:
            logger.error(f"提交推送失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e)
            )
    
    def _run_git(self, args: List[str], cwd: str) -> Dict[str, Any]:
        """执行 git 命令"""
        cmd = ['git'] + args
        logger.debug(f"执行命令: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'returncode': result.returncode
            }
        
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': 'Command timeout',
                'returncode': -1
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'returncode': -1
            }
