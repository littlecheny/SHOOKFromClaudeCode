"""
美元指数 DXY 获取工具封装

封装 mcp_servers/dxy_server 的 get_dxy 和 get_dxy_info 功能
"""
import logging
from typing import Any, Dict, Optional
from pathlib import Path
from datetime import datetime

from .base import BaseTool, ToolCategory, ToolResult

logger = logging.getLogger(__name__)

# 延迟导入，避免依赖问题
yf = None
pd = None
np = None
go = None
make_subplots = None


def _ensure_deps():
    """确保依赖已导入"""
    global yf, pd, np, go, make_subplots
    if yf is None:
        import yfinance
        yf = yfinance
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


class GetDXYTool(BaseTool):
    """
    获取美元指数 DXY 工具
    
    获取美元指数实时数据和历史数据
    """
    
    DXY_SYMBOL = "DX-Y.NYB"
    
    @property
    def name(self) -> str:
        return "get_dxy"
    
    @property
    def description(self) -> str:
        return "获取美元指数 DXY 实时数据和历史数据"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "description": "数据周期：1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max",
                    "default": "1d"
                },
                "interval": {
                    "type": "string",
                    "description": "数据间隔：1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo",
                    "default": "1d"
                }
            },
            "required": []
        }
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.READONLY
    
    @property
    def cost_estimate(self) -> float:
        return 0.5  # 网络请求
    
    def execute(
        self,
        period: str = "1d",
        interval: str = "1d"
    ) -> ToolResult:
        """
        获取美元指数 DXY 数据
        
        Args:
            period: 数据周期
            interval: 数据间隔
        
        Returns:
            ToolResult，包含：
            - symbol: 代码
            - name: 名称
            - current_price: 当前价格
            - open: 开盘价
            - high: 最高价
            - low: 最低价
            - close: 收盘价
            - volume: 成交量
            - change: 涨跌
            - change_percent: 涨跌百分比
            - timestamp: 时间戳
            - currency: 货币
            - period: 周期
            - interval: 间隔
            - history: 历史数据列表
        """
        _ensure_deps()
        
        logger.info(f"获取 DXY 数据，period={period}, interval={interval}")
        
        try:
            # 获取美元指数数据
            ticker = yf.Ticker(self.DXY_SYMBOL)
            
            # 获取历史数据
            hist = ticker.history(period=period, interval=interval)
            
            if hist.empty:
                return ToolResult(
                    success=False,
                    error='未能获取 DXY 数据',
                    data={'symbol': self.DXY_SYMBOL}
                )
            
            # 获取最新数据
            latest = hist.iloc[-1]
            current_price = float(latest['Close'])
            open_price = float(latest['Open'])
            high = float(latest['High'])
            low = float(latest['Low'])
            volume = int(latest['Volume']) if 'Volume' in latest else 0
            
            # 计算涨跌
            change = current_price - open_price
            change_percent = (change / open_price) * 100 if open_price != 0 else 0
            
            # 获取时间戳
            timestamp = hist.index[-1]
            
            # 构建历史数据
            history = []
            for date, row in hist.iterrows():
                history.append({
                    'date': date.strftime('%Y-%m-%d %H:%M:%S'),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume']) if 'Volume' in row else 0
                })
            
            # 获取基本信息
            info = ticker.info
            currency = info.get('currency', 'USD')
            
            result = {
                'symbol': self.DXY_SYMBOL,
                'name': '美元指数',
                'current_price': round(current_price, 4),
                'open': round(open_price, 4),
                'high': round(high, 4),
                'low': round(low, 4),
                'close': round(current_price, 4),
                'volume': volume,
                'change': round(change, 4),
                'change_percent': round(change_percent, 2),
                'timestamp': timestamp.isoformat(),
                'currency': currency,
                'period': period,
                'interval': interval,
                'history': history
            }
            
            logger.info(f"成功获取 DXY 数据: 当前价格 {current_price}, 涨跌 {change_percent:.2f}%")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"获取 DXY 数据失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={'symbol': self.DXY_SYMBOL}
            )


class GetDXYInfoTool(BaseTool):
    """
    获取美元指数基本信息工具
    
    获取美元指数的基本信息（名称、交易所等）
    """
    
    DXY_SYMBOL = "DX-Y.NYB"
    
    @property
    def name(self) -> str:
        return "get_dxy_info"
    
    @property
    def description(self) -> str:
        return "获取美元指数 DXY 基本信息"
    
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
        return 0.3  # 轻量级网络请求
    
    def execute(self) -> ToolResult:
        """
        获取美元指数基本信息
        
        Returns:
            ToolResult，包含：
            - symbol: 代码
            - name: 名称
            - description: 描述
            - exchange: 交易所
            - currency: 货币
            - quote_type: 报价类型
        """
        _ensure_deps()
        
        logger.info("获取 DXY 基本信息")
        
        try:
            ticker = yf.Ticker(self.DXY_SYMBOL)
            info = ticker.info
            
            result = {
                'symbol': self.DXY_SYMBOL,
                'name': info.get('shortName', '美元指数'),
                'description': info.get('longName', 'U.S. Dollar Index'),
                'exchange': info.get('exchange', 'NYB'),
                'currency': info.get('currency', 'USD'),
                'quote_type': info.get('quoteType', 'INDEX')
            }
            
            logger.info("成功获取 DXY 基本信息")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"获取 DXY 基本信息失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={'symbol': self.DXY_SYMBOL}
            )


class GenerateDXYDashboardTool(BaseTool):
    """
    生成 DXY 技术分析看板工具
    
    获取过去 7 天 1 小时频率的 DXY 数据，计算 MA24、RSI 和偏离度，
    使用 plotly 生成交互式技术分析看板
    """
    
    DXY_SYMBOL = "DX-Y.NYB"
    
    @property
    def name(self) -> str:
        return "generate_dxy_dashboard"
    
    @property
    def description(self) -> str:
        return "生成 DXY 技术分析看板，包含 MA24、RSI 和偏离度分析"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "output_path": {
                    "type": "string",
                    "description": "看板 HTML 输出路径（默认：reports/dxy_dashboard.html）",
                    "default": "reports/dxy_dashboard.html"
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
    
    def _calculate_rsi(self, data: 'pd.Series', period: int = 14) -> 'pd.Series':
        """
        计算 RSI 指标
        
        Args:
            data: 价格数据序列
            period: RSI 周期（默认 14）
        
        Returns:
            RSI 值序列
        """
        delta = data.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def execute(
        self,
        output_path: str = "reports/dxy_dashboard.html"
    ) -> ToolResult:
        """
        生成 DXY 技术分析看板
        
        Args:
            output_path: 看板 HTML 输出路径
        
        Returns:
            ToolResult，包含：
            - output_path: 生成的文件路径
            - current_price: 当前价格
            - ma24: 24 小时移动平均值
            - rsi: RSI 指标值
            - deviation: 偏离度百分比
        """
        _ensure_deps()
        
        logger.info(f"开始生成 DXY 技术分析看板")
        
        try:
            # 1. 获取数据
            ticker = yf.Ticker(self.DXY_SYMBOL)
            hist = ticker.history(period='7d', interval='1h')
            
            if hist.empty:
                return ToolResult(
                    success=False,
                    error='未能获取 DXY 历史数据',
                    data={'symbol': self.DXY_SYMBOL}
                )
            
            # 2. 计算技术指标
            df = pd.DataFrame(hist)
            
            # MA24 - 24 小时移动平均
            df['MA24'] = df['Close'].rolling(window=24).mean()
            
            # RSI - 相对强弱指标
            df['RSI'] = self._calculate_rsi(df['Close'], period=14)
            
            # 偏离度 - 当前价格与 MA24 的偏离百分比
            df['Deviation'] = ((df['Close'] - df['MA24']) / df['MA24']) * 100
            
            # 3. 获取最新指标值
            latest = df.iloc[-1]
            current_price = float(latest['Close'])
            ma24 = float(latest['MA24']) if not pd.isna(latest['MA24']) else current_price
            rsi = float(latest['RSI']) if not pd.isna(latest['RSI']) else 50.0
            deviation = float(latest['Deviation']) if not pd.isna(latest['Deviation']) else 0.0
            
            # 4. 创建 Plotly 看板
            fig = make_subplots(
                rows=3, cols=1,
                row_heights=[0.5, 0.25, 0.25],
                subplot_titles=(
                    'DXY 价格走势 & MA24',
                    'RSI 相对强弱指标',
                    '偏离度分析'
                ),
                vertical_spacing=0.08,
                specs=[
                    [{"secondary_y": False}],
                    [{"secondary_y": False}],
                    [{"secondary_y": False}]
                ]
            )
            
            # 子图 1: 蜡烛图 + MA24
            fig.add_trace(
                go.Candlestick(
                    x=df.index,
                    open=df['Open'],
                    high=df['High'],
                    low=df['Low'],
                    close=df['Close'],
                    name='DXY',
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
            
            # 子图 2: RSI 指标
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
            
            # RSI 超买线 (70)
            fig.add_hline(
                y=70,
                line_dash="dash",
                line_color="red",
                opacity=0.5,
                row=2, col=1
            )
            
            # RSI 超卖线 (30)
            fig.add_hline(
                y=30,
                line_dash="dash",
                line_color="green",
                opacity=0.5,
                row=2, col=1
            )
            
            # 子图 3: 偏离度条形图
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
            
            # 偏离度零轴线
            fig.add_hline(
                y=0,
                line_color="gray",
                line_width=1,
                row=3, col=1
            )
            
            # 5. 更新布局
            fig.update_layout(
                title={
                    'text': f'DXY 美元指数技术分析看板<br><sub>更新时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</sub>',
                    'x': 0.5,
                    'xanchor': 'center'
                },
                height=1200,
                showlegend=True,
                xaxis_rangeslider_visible=False,
                hovermode='x unified'
            )
            
            # 更新 Y 轴标签
            fig.update_yaxes(title_text="价格", row=1, col=1)
            fig.update_yaxes(title_text="RSI", row=2, col=1)
            fig.update_yaxes(title_text="偏离度 (%)", row=3, col=1)
            
            # 更新 X 轴标签
            fig.update_xaxes(title_text="时间", row=3, col=1)
            
            # 6. 保存 HTML 文件
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            fig.write_html(str(output_file))
            
            result = {
                'output_path': str(output_file),
                'current_price': round(current_price, 4),
                'ma24': round(ma24, 4),
                'rsi': round(rsi, 2),
                'deviation': round(deviation, 2),
                'data_points': len(df),
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"成功生成 DXY 看板: {output_file}")
            logger.info(f"当前价格: {current_price:.4f}, MA24: {ma24:.4f}, RSI: {rsi:.2f}, 偏离度: {deviation:+.2f}%")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"生成 DXY 看板失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={'symbol': self.DXY_SYMBOL}
            )
