"""
OKX Bitcoin 现货价格获取工具封装

通过 OKX V5 API 获取 BTC 现货价格和历史数据
"""
import logging
from typing import Any, Dict, Optional, List
from pathlib import Path
from datetime import datetime, timedelta
import requests

from .base import BaseTool, ToolCategory, ToolResult

logger = logging.getLogger(__name__)

# 延迟导入
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


class GetOKXSpotPriceTool(BaseTool):
    """获取 OKX Bitcoin 现货价格工具"""
    
    API_BASE = "https://www.okx.com"
    
    @property
    def name(self) -> str:
        return "get_okx_spot_price"
    
    @property
    def description(self) -> str:
        return "获取 OKX Bitcoin 现货价格和历史数据"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "inst_id": {
                    "type": "string",
                    "description": "现货交易对，例如 BTC-USDT",
                    "default": "BTC-USDT"
                },
                "bar": {
                    "type": "string",
                    "description": "K线周期：1m/5m/15m/30m/1H/4H/1D",
                    "default": "1H"
                },
                "limit": {
                    "type": "integer",
                    "description": "获取K线条数（默认100，最大300）",
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
        inst_id: str = "BTC-USDT",
        bar: str = "1H",
        limit: int = 100
    ) -> ToolResult:
        """获取 OKX Bitcoin 现货价格数据"""
        _ensure_deps()
        
        logger.info(f"获取 OKX 现货价格，inst_id={inst_id}, bar={bar}, limit={limit}")
        
        try:
            response = requests.get(
                f"{self.API_BASE}/api/v5/market/candles",
                params={
                    "instId": inst_id,
                    "bar": bar,
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
            
            candles = data['data']
            history = []
            for candle in candles:
                history.append({
                    'timestamp': int(candle[0]),
                    'time': datetime.fromtimestamp(int(candle[0])/1000).strftime('%Y-%m-%d %H:%M:%S'),
                    'open': float(candle[1]),
                    'high': float(candle[2]),
                    'low': float(candle[3]),
                    'close': float(candle[4]),
                    'volume': float(candle[5])
                })
            
            history.sort(key=lambda x: x['timestamp'])
            
            latest = history[-1]
            closes = [h['close'] for h in history]
            
            result = {
                'inst_id': inst_id,
                'current_price': latest['close'],
                'open': latest['open'],
                'high': latest['high'],
                'low': latest['low'],
                'volume': latest['volume'],
                'change': latest['close'] - latest['open'],
                'change_percent': ((latest['close'] - latest['open']) / latest['open'] * 100) if latest['open'] > 0 else 0,
                'ma24': float(np.mean(closes[-24:])) if len(closes) >= 24 else latest['close'],
                'history': history,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"成功获取现货价格: ${latest['close']:.2f}")
            
            return ToolResult(success=True, data=result)
        
        except Exception as e:
            logger.error(f"获取现货价格失败: {e}", exc_info=True)
            return ToolResult(success=False, error=str(e), data={'inst_id': inst_id})


class GenerateOKXSpotDashboardTool(BaseTool):
    """生成 OKX Bitcoin 现货技术分析看板工具"""
    
    API_BASE = "https://www.okx.com"
    
    @property
    def name(self) -> str:
        return "generate_okx_spot_dashboard"
    
    @property
    def description(self) -> str:
        return "生成 OKX Bitcoin 现货技术分析看板"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "inst_id": {
                    "type": "string",
                    "default": "BTC-USDT"
                },
                "output_path": {
                    "type": "string",
                    "default": "reports/okx_spot_dashboard.html"
                },
                "bar": {
                    "type": "string",
                    "default": "1H"
                },
                "limit": {
                    "type": "integer",
                    "default": 168
                }
            }
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.SIDE_EFFECT
    
    @property
    def cost_estimate(self) -> float:
        return 2.0
    
    def _calculate_rsi(self, data: 'pd.Series', period: int = 14) -> 'pd.Series':
        """计算 RSI"""
        delta = data.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def execute(
        self,
        inst_id: str = "BTC-USDT",
        output_path: str = "reports/okx_spot_dashboard.html",
        bar: str = "1H",
        limit: int = 168
    ) -> ToolResult:
        """生成现货技术分析看板"""
        _ensure_deps()
        
        logger.info(f"生成 OKX 现货看板: {inst_id}")
        
        try:
            response = requests.get(
                f"{self.API_BASE}/api/v5/market/candles",
                params={"instId": inst_id, "bar": bar, "limit": limit}
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('code') != '0':
                return ToolResult(
                    success=False,
                    error=f"API 错误: {data.get('msg')}",
                    data={'inst_id': inst_id}
                )
            
            df_data = []
            for candle in data['data']:
                df_data.append({
                    'time': datetime.fromtimestamp(int(candle[0])/1000),
                    'open': float(candle[1]),
                    'high': float(candle[2]),
                    'low': float(candle[3]),
                    'close': float(candle[4]),
                    'volume': float(candle[5])
                })
            
            df = pd.DataFrame(df_data).sort_values('time').set_index('time')
            
            df['MA24'] = df['close'].rolling(window=24).mean()
            df['RSI'] = self._calculate_rsi(df['close'], period=14)
            df['Deviation'] = ((df['close'] - df['MA24']) / df['MA24']) * 100
            
            latest = df.iloc[-1]
            
            fig = make_subplots(
                rows=3, cols=1,
                row_heights=[0.5, 0.25, 0.25],
                subplot_titles=(
                    f'{inst_id} 现货价格 & MA24',
                    'RSI 指标',
                    '偏离度'
                ),
                vertical_spacing=0.08
            )
            
            fig.add_trace(
                go.Candlestick(
                    x=df.index,
                    open=df['open'],
                    high=df['high'],
                    low=df['low'],
                    close=df['close'],
                    name='价格',
                    increasing_line_color='#26a69a',
                    decreasing_line_color='#ef5350'
                ),
                row=1, col=1
            )
            
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['MA24'],
                    mode='lines',
                    name='MA24',
                    line=dict(color='#ff9800', width=2)
                ),
                row=1, col=1
            )
            
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['RSI'],
                    mode='lines',
                    name='RSI',
                    line=dict(color='#2196f3', width=2)
                ),
                row=2, col=1
            )
            
            fig.add_hline(y=70, line_dash="dash", line_color="red", opacity=0.5, row=2, col=1)
            fig.add_hline(y=30, line_dash="dash", line_color="green", opacity=0.5, row=2, col=1)
            
            colors = ['#ffcdd2' if val > 0 else '#c8e6c9' for val in df['Deviation']]
            fig.add_trace(
                go.Bar(
                    x=df.index,
                    y=df['Deviation'],
                    name='偏离度',
                    marker_color=colors,
                    showlegend=False
                ),
                row=3, col=1
            )
            
            fig.update_layout(
                title=f'{inst_id} 现货技术分析看板<br><sub>OKX | {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</sub>',
                height=1200,
                xaxis_rangeslider_visible=False,
                hovermode='x unified'
            )
            
            fig.update_yaxes(title_text="价格 (USDT)", row=1, col=1)
            fig.update_yaxes(title_text="RSI", row=2, col=1)
            fig.update_yaxes(title_text="偏离度 (%)", row=3, col=1)
            
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            fig.write_html(str(output_file))
            
            result = {
                'output_path': str(output_file),
                'inst_id': inst_id,
                'current_price': float(latest['close']),
                'ma24': float(latest['MA24']) if not pd.isna(latest['MA24']) else float(latest['close']),
                'rsi': float(latest['RSI']) if not pd.isna(latest['RSI']) else 50.0,
                'deviation': float(latest['Deviation']) if not pd.isna(latest['Deviation']) else 0.0,
                'data_points': len(df),
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"生成现货看板成功: {output_file}")
            return ToolResult(success=True, data=result)
        
        except Exception as e:
            logger.error(f"生成现货看板失败: {e}", exc_info=True)
            return ToolResult(success=False, error=str(e), data={'inst_id': inst_id})
