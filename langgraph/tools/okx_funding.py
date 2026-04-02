"""
OKX 资金费率获取工具封装

通过 OKX V5 API 获取永续合约资金费率数据
包含当前费率、预测费率、费率斜率、移动平均等指标
"""
import logging
from typing import Any, Dict, Optional, List
from pathlib import Path
from datetime import datetime, timedelta
import requests

from .base import BaseTool, ToolCategory, ToolResult

logger = logging.getLogger(__name__)

# 延迟导入，避免依赖问题
pd = None
np = None
go = None
make_subplots = None


def _ensure_deps():
    """确保依赖已导入"""
    global pd, np, go, make_subplots
    if pd is None:
        import pandas
        pd = pandas
    if np is None:
        import numpy
        np = numpy
    if go is None:
        import plotly.graph_objects as plotly_go
        go = plotly_go
    if make_subplots is None:
        from plotly.subplots import make_subplots as plotly_make_subplots
        make_subplots = plotly_make_subplots


class GetOKXFundingRateTool(BaseTool):
    """
    获取 OKX 资金费率工具
    
    通过 OKX V5 API 获取永续合约的资金费率和历史数据
    """
    
    API_BASE = "https://www.okx.com"
    
    @property
    def name(self) -> str:
        return "get_okx_funding_rate"
    
    @property
    def description(self) -> str:
        return "获取 OKX 永续合约资金费率和历史数据"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "inst_id": {
                    "type": "string",
                    "description": "产品 ID，例如 BTC-USDT-SWAP",
                    "default": "BTC-USDT-SWAP"
                },
                "limit": {
                    "type": "integer",
                    "description": "获取历史数据条数（默认 100，最大 100）",
                    "default": 100
                }
            },
            "required": []
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.READONLY
    
    @property
    def cost_estimate(self) -> float:
        return 0.5
    
    def execute(
        self,
        inst_id: str = "BTC-USDT-SWAP",
        limit: int = 100
    ) -> ToolResult:
        """
        获取 OKX 资金费率数据
        
        Args:
            inst_id: 产品 ID
            limit: 获取历史数据条数
        
        Returns:
            ToolResult，包含：
            - inst_id: 产品 ID
            - current_rate: 当前资金费率
            - next_rate: 预测费率（下一期）
            - rate_slope: 费率斜率（线性回归）
            - ma8: 8 期移动平均
            - ma24: 24 期移动平均
            - history: 历史数据列表
        """
        _ensure_deps()
        
        logger.info(f"获取 OKX 资金费率数据，inst_id={inst_id}, limit={limit}")
        
        try:
            # 1. 获取当前资金费率
            response_current = requests.get(
                f"{self.API_BASE}/api/v5/public/funding-rate",
                params={"instId": inst_id}
            )
            response_current.raise_for_status()
            current_data = response_current.json()
            
            if current_data.get('code') != '0':
                return ToolResult(
                    success=False,
                    error=f"API 错误: {current_data.get('msg', '未知错误')}",
                    data={'inst_id': inst_id}
                )
            
            current_info = current_data['data'][0]
            current_rate = float(current_info['fundingRate'])
            next_rate_str = current_info['nextFundingRate']
            next_rate = float(next_rate_str) if next_rate_str else current_rate
            funding_time = int(current_info['fundingTime'])
            next_funding_time = int(current_info['nextFundingTime'])
            
            # 2. 获取历史资金费率
            response_history = requests.get(
                f"{self.API_BASE}/api/v5/public/funding-rate-history",
                params={
                    "instId": inst_id,
                    "limit": limit
                }
            )
            response_history.raise_for_status()
            history_data = response_history.json()
            
            if history_data.get('code') != '0':
                return ToolResult(
                    success=False,
                    error=f"API 错误: {history_data.get('msg', '未知错误')}",
                    data={'inst_id': inst_id}
                )
            
            # 3. 构建历史数据
            history = []
            for entry in history_data['data']:
                history.append({
                    'funding_time': datetime.fromtimestamp(int(entry['fundingTime']) / 1000).strftime('%Y-%m-%d %H:%M:%S'),
                    'timestamp': int(entry['fundingTime']),
                    'rate': float(entry['fundingRate']) * 100,  # 转换为百分比
                    'realized_rate': float(entry.get('realizedRate', entry['fundingRate'])) * 100
                })
            
            # 按时间排序（从旧到新）
            history.sort(key=lambda x: x['timestamp'])
            
            # 4. 计算技术指标
            rates = [item['rate'] for item in history]
            
            # 费率斜率：线性回归斜率（最近 8 期）
            slope = 0.0
            if len(rates) >= 8:
                recent_rates = rates[-8:]
                x = np.arange(len(recent_rates))
                y = np.array(recent_rates)
                slope = float(np.polyfit(x, y, 1)[0])
            
            # MA8 和 MA24
            ma8 = 0.0
            ma24 = 0.0
            if len(rates) >= 8:
                ma8 = float(np.mean(rates[-8:]))
            if len(rates) >= 24:
                ma24 = float(np.mean(rates[-24:]))
            
            # 5. 构建结果
            result = {
                'inst_id': inst_id,
                'current_rate': round(current_rate * 100, 4),  # 转换为百分比
                'next_rate': round(next_rate * 100, 4),
                'funding_time': datetime.fromtimestamp(funding_time / 1000).strftime('%Y-%m-%d %H:%M:%S'),
                'next_funding_time': datetime.fromtimestamp(next_funding_time / 1000).strftime('%Y-%m-%d %H:%M:%S'),
                'rate_slope': round(slope, 6),
                'ma8': round(ma8, 4),
                'ma24': round(ma24, 4),
                'history': history,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"成功获取 OKX 资金费率: 当前 {current_rate*100:.4f}%, "
                       f"预测 {next_rate*100:.4f}%, 斜率 {slope:.6f}, MA8 {ma8:.4f}%")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"获取 OKX 资金费率失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={'inst_id': inst_id}
            )


class GetOKXFundingRateInfoTool(BaseTool):
    """
    获取 OKX 资金费率基本信息工具
    
    获取资金费率的说明和计算规则
    """
    
    @property
    def name(self) -> str:
        return "get_okx_funding_rate_info"
    
    @property
    def description(self) -> str:
        return "获取 OKX 资金费率基本信息和计算规则"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": []
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.READONLY
    
    @property
    def cost_estimate(self) -> float:
        return 0.1
    
    def execute(self) -> ToolResult:
        """
        获取资金费率基本信息
        
        Returns:
            ToolResult，包含：
            - name: 指标名称
            - description: 指标描述
            - funding_interval: 结算间隔
            - indicators: 计算的指标
        """
        logger.info("获取 OKX 资金费率基本信息")
        
        result = {
            'name': 'OKX Funding Rate',
            'description': '永续合约资金费率，多空双方定期交换的资金，用于锚定合约价格和现货价格',
            'funding_interval': '每 8 小时结算一次（00:00, 08:00, 16:00 UTC）',
            'rate_range': '一般在 -0.375% 到 +0.375% 之间',
            'interpretation': {
                '正费率': '多方支付空方，市场看多情绪强',
                '负费率': '空方支付多方，市场看空情绪强',
                '高正费率': '多头过热，可能回调',
                '高负费率': '空头过度，可能反弹'
            },
            'indicators': {
                'current_rate': '当前资金费率',
                'next_rate': '预测费率（下一期）',
                'rate_slope': '费率斜率（最近 8 期线性回归斜率）',
                'ma8': '8 期移动平均（约 3 天）',
                'ma24': '24 期移动平均（约 9 天）'
            },
            'data_source': 'OKX V5 API',
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info("成功获取 OKX 资金费率基本信息")
        
        return ToolResult(
            success=True,
            data=result
        )


class GenerateOKXFundingRateDashboardTool(BaseTool):
    """
    生成 OKX 资金费率技术分析看板工具
    
    获取历史数据，计算斜率和移动平均，
    使用 plotly 生成交互式技术分析看板
    """
    
    API_BASE = "https://www.okx.com"
    
    @property
    def name(self) -> str:
        return "generate_okx_funding_rate_dashboard"
    
    @property
    def description(self) -> str:
        return "生成 OKX 资金费率技术分析看板，包含费率、斜率和移动平均分析"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "inst_id": {
                    "type": "string",
                    "description": "产品 ID（默认：BTC-USDT-SWAP）",
                    "default": "BTC-USDT-SWAP"
                },
                "output_path": {
                    "type": "string",
                    "description": "看板 HTML 输出路径（默认：reports/okx_funding_rate_dashboard.html）",
                    "default": "reports/okx_funding_rate_dashboard.html"
                },
                "limit": {
                    "type": "integer",
                    "description": "分析数据点数（默认 100）",
                    "default": 100
                }
            },
            "required": []
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.SIDE_EFFECT
    
    @property
    def cost_estimate(self) -> float:
        return 2.0
    
    def execute(
        self,
        inst_id: str = "BTC-USDT-SWAP",
        output_path: str = "reports/okx_funding_rate_dashboard.html",
        limit: int = 100
    ) -> ToolResult:
        """
        生成 OKX 资金费率技术分析看板
        
        Args:
            inst_id: 产品 ID
            output_path: 看板 HTML 输出路径
            limit: 分析数据点数
        
        Returns:
            ToolResult，包含：
            - output_path: 生成的文件路径
            - inst_id: 产品 ID
            - current_rate: 当前资金费率
            - next_rate: 预测费率
            - rate_slope: 费率斜率
            - ma8: 8 期移动平均
        """
        _ensure_deps()
        
        logger.info(f"开始生成 OKX 资金费率技术分析看板（{inst_id}，{limit} 条数据）")
        
        try:
            # 1. 获取历史数据
            response = requests.get(
                f"{self.API_BASE}/api/v5/public/funding-rate-history",
                params={
                    "instId": inst_id,
                    "limit": limit
                }
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('code') != '0':
                return ToolResult(
                    success=False,
                    error=f"API 错误: {data.get('msg', '未知错误')}",
                    data={'inst_id': inst_id}
                )
            
            # 2. 转换为 DataFrame
            df_data = []
            for entry in data['data']:
                df_data.append({
                    'time': datetime.fromtimestamp(int(entry['fundingTime']) / 1000),
                    'rate': float(entry['fundingRate']) * 100  # 转换为百分比
                })
            
            df = pd.DataFrame(df_data)
            df = df.sort_values('time')
            df.set_index('time', inplace=True)
            
            # 3. 计算技术指标
            # MA8 和 MA24
            df['MA8'] = df['rate'].rolling(window=8).mean()
            df['MA24'] = df['rate'].rolling(window=24).mean()
            
            # 费率斜率：8 期滚动线性回归斜率
            def calculate_slope(series):
                if len(series) < 2:
                    return 0
                x = np.arange(len(series))
                y = series.values
                return np.polyfit(x, y, 1)[0]
            
            df['Slope'] = df['rate'].rolling(window=8).apply(calculate_slope, raw=False)
            
            # 4. 获取最新指标值
            latest = df.iloc[-1]
            current_rate = float(latest['rate'])
            ma8 = float(latest['MA8']) if not pd.isna(latest['MA8']) else current_rate
            ma24 = float(latest['MA24']) if not pd.isna(latest['MA24']) else current_rate
            slope = float(latest['Slope']) if not pd.isna(latest['Slope']) else 0.0
            
            # 获取预测费率
            response_current = requests.get(
                f"{self.API_BASE}/api/v5/public/funding-rate",
                params={"instId": inst_id}
            )
            response_current.raise_for_status()
            current_data = response_current.json()
            next_rate_str = current_data['data'][0]['nextFundingRate']
            next_rate = float(next_rate_str) * 100 if next_rate_str else current_rate
            
            # 5. 创建 Plotly 看板
            fig = make_subplots(
                rows=3, cols=1,
                row_heights=[0.5, 0.25, 0.25],
                subplot_titles=(
                    f'{inst_id} 资金费率走势 & 移动平均',
                    '费率斜率 (Slope)',
                    '费率偏离度'
                ),
                vertical_spacing=0.08,
                specs=[
                    [{"secondary_y": False}],
                    [{"secondary_y": False}],
                    [{"secondary_y": False}]
                ]
            )
            
            # 子图 1: 资金费率 + MA8 + MA24
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['rate'],
                    mode='lines+markers',
                    name='资金费率',
                    line=dict(color='#2196f3', width=2),
                    marker=dict(size=4)
                ),
                row=1, col=1
            )
            
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['MA8'],
                    mode='lines',
                    name='MA8',
                    line=dict(color='#ff9800', width=2)
                ),
                row=1, col=1
            )
            
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['MA24'],
                    mode='lines',
                    name='MA24',
                    line=dict(color='#4caf50', width=2)
                ),
                row=1, col=1
            )
            
            # 零轴线
            fig.add_hline(y=0, line_dash="dash", line_color="gray", opacity=0.5, row=1, col=1)
            
            # 子图 2: 费率斜率
            slope_colors = ['#ef5350' if val < 0 else '#4caf50' for val in df['Slope']]
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['Slope'],
                    mode='lines',
                    name='费率斜率',
                    line=dict(color='#9c27b0', width=2),
                    fill='tozeroy',
                    fillcolor='rgba(156, 39, 176, 0.1)'
                ),
                row=2, col=1
            )
            fig.add_hline(y=0, line_color="gray", line_width=1, row=2, col=1)
            
            # 子图 3: 费率偏离度（与 MA8 的偏离）
            df['Deviation'] = df['rate'] - df['MA8']
            deviation_colors = ['#ffcdd2' if val > 0 else '#c8e6c9' for val in df['Deviation']]
            fig.add_trace(
                go.Bar(
                    x=df.index,
                    y=df['Deviation'],
                    name='偏离度',
                    marker_color=deviation_colors,
                    showlegend=False
                ),
                row=3, col=1
            )
            fig.add_hline(y=0, line_color="gray", line_width=1, row=3, col=1)
            
            # 6. 更新布局
            fig.update_layout(
                title={
                    'text': f'{inst_id} 资金费率技术分析看板<br><sub>数据来源: OKX V5 API | 更新时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</sub>',
                    'x': 0.5,
                    'xanchor': 'center'
                },
                height=1200,
                showlegend=True,
                hovermode='x unified'
            )
            
            # 更新 Y 轴标签
            fig.update_yaxes(title_text="费率 (%)", row=1, col=1)
            fig.update_yaxes(title_text="斜率", row=2, col=1)
            fig.update_yaxes(title_text="偏离度 (%)", row=3, col=1)
            
            # 更新 X 轴标签
            fig.update_xaxes(title_text="时间", row=3, col=1)
            
            # 7. 保存 HTML 文件
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            fig.write_html(str(output_file))
            
            result = {
                'output_path': str(output_file),
                'inst_id': inst_id,
                'current_rate': round(current_rate, 4),
                'next_rate': round(next_rate, 4),
                'rate_slope': round(slope, 6),
                'ma8': round(ma8, 4),
                'ma24': round(ma24, 4),
                'data_points': len(df),
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"成功生成 OKX 资金费率看板: {output_file}")
            logger.info(f"当前费率: {current_rate:.4f}%, 预测: {next_rate:.4f}%, "
                       f"斜率: {slope:.6f}, MA8: {ma8:.4f}%")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"生成 OKX 资金费率看板失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={'inst_id': inst_id}
            )
