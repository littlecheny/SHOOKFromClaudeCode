"""
稳定币总市值获取工具封装

通过 DefiLlama API 获取稳定币总市值数据和历史趋势
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


class GetStablecoinTool(BaseTool):
    """
    获取稳定币总市值工具
    
    通过 DefiLlama API 获取稳定币总市值和历史数据
    """
    
    API_BASE = "https://stablecoins.llama.fi"
    
    @property
    def name(self) -> str:
        return "get_stablecoin"
    
    @property
    def description(self) -> str:
        return "获取稳定币总市值和历史数据（通过 DefiLlama API）"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "获取最近 N 天的历史数据（默认 7 天）",
                    "default": 7
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
    
    def execute(self, days: int = 7) -> ToolResult:
        """
        获取稳定币市值数据
        
        Args:
            days: 获取最近 N 天的历史数据
        
        Returns:
            ToolResult，包含：
            - current_marketcap: 当前总市值（美元）
            - change_24h: 24小时变化（美元）
            - change_24h_percent: 24小时变化百分比
            - total_stablecoins: 稳定币总数
            - top_stablecoins: 前 10 大稳定币列表
            - history: 历史数据列表
        """
        logger.info(f"获取稳定币市值数据，days={days}")
        
        try:
            # 1. 获取当前市值和稳定币列表
            response = requests.get(f"{self.API_BASE}/stablecoins", params={"includePrices": "true"})
            response.raise_for_status()
            data = response.json()
            
            # 提取总市值
            peggedAssets = data.get('peggedAssets', [])
            if not peggedAssets:
                return ToolResult(
                    success=False,
                    error='未能获取稳定币数据',
                    data={}
                )
            
            # 计算总市值
            total_marketcap = sum(asset.get('circulating', {}).get('peggedUSD', 0) for asset in peggedAssets)
            
            # 获取前 10 大稳定币
            top_10 = sorted(peggedAssets, key=lambda x: x.get('circulating', {}).get('peggedUSD', 0), reverse=True)[:10]
            top_stablecoins = [
                {
                    'name': asset.get('name', ''),
                    'symbol': asset.get('symbol', ''),
                    'marketcap': asset.get('circulating', {}).get('peggedUSD', 0),
                    'change_24h': asset.get('change_1d', 0)
                }
                for asset in top_10
            ]
            
            # 2. 获取历史数据
            response_history = requests.get(f"{self.API_BASE}/stablecoincharts/all")
            response_history.raise_for_status()
            history_data = response_history.json()
            
            # 过滤最近 N 天的数据
            cutoff_date = datetime.now() - timedelta(days=days)
            cutoff_timestamp = int(cutoff_date.timestamp())
            
            history = []
            for entry in history_data:
                date_str = entry.get('date', '0')
                try:
                    timestamp = int(date_str)
                    if timestamp >= cutoff_timestamp:
                        history.append({
                            'date': datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d'),
                            'timestamp': timestamp,
                            'marketcap': entry.get('totalCirculatingUSD', {}).get('peggedUSD', 0)
                        })
                except (ValueError, TypeError):
                    continue
            
            # 按时间排序
            history.sort(key=lambda x: x['timestamp'])
            
            # 计算 24 小时变化
            change_24h = 0
            change_24h_percent = 0
            if len(history) >= 2:
                current = history[-1]['marketcap']
                yesterday = history[-2]['marketcap'] if len(history) > 1 else current
                change_24h = current - yesterday
                change_24h_percent = (change_24h / yesterday * 100) if yesterday != 0 else 0
            
            result = {
                'current_marketcap': round(total_marketcap, 2),
                'change_24h': round(change_24h, 2),
                'change_24h_percent': round(change_24h_percent, 2),
                'total_stablecoins': len(peggedAssets),
                'top_stablecoins': top_stablecoins,
                'history': history,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"成功获取稳定币数据: 总市值 ${total_marketcap:,.0f}, 24h 变化 {change_24h_percent:+.2f}%")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"获取稳定币数据失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={}
            )


class GetStablecoinInfoTool(BaseTool):
    """
    获取稳定币基本信息工具
    
    获取稳定币生态系统的基本信息
    """
    
    API_BASE = "https://stablecoins.llama.fi"
    
    @property
    def name(self) -> str:
        return "get_stablecoin_info"
    
    @property
    def description(self) -> str:
        return "获取稳定币生态系统基本信息"
    
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
        return 0.3
    
    def execute(self) -> ToolResult:
        """
        获取稳定币基本信息
        
        Returns:
            ToolResult，包含：
            - total_marketcap: 总市值
            - total_stablecoins: 稳定币总数
            - top_3: 前 3 大稳定币
            - data_source: 数据来源
        """
        logger.info("获取稳定币基本信息")
        
        try:
            response = requests.get(f"{self.API_BASE}/stablecoins")
            response.raise_for_status()
            data = response.json()
            
            peggedAssets = data.get('peggedAssets', [])
            total_marketcap = sum(asset.get('circulating', {}).get('peggedUSD', 0) for asset in peggedAssets)
            
            # 获取前 3 大稳定币
            top_3 = sorted(peggedAssets, key=lambda x: x.get('circulating', {}).get('peggedUSD', 0), reverse=True)[:3]
            top_stablecoins = [
                f"{asset.get('name', '')} (${asset.get('circulating', {}).get('peggedUSD', 0):,.0f})"
                for asset in top_3
            ]
            
            result = {
                'total_marketcap': total_marketcap,
                'total_stablecoins': len(peggedAssets),
                'top_3': top_stablecoins,
                'data_source': 'DefiLlama API',
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info("成功获取稳定币基本信息")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"获取稳定币基本信息失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={}
            )


class GenerateStablecoinDashboardTool(BaseTool):
    """
    生成稳定币市值技术分析看板工具
    
    获取稳定币历史数据，计算移动平均线、RSI 和偏离度，
    使用 plotly 生成交互式技术分析看板
    """
    
    API_BASE = "https://stablecoins.llama.fi"
    
    @property
    def name(self) -> str:
        return "generate_stablecoin_dashboard"
    
    @property
    def description(self) -> str:
        return "生成稳定币市值技术分析看板，包含 MA7、RSI 和偏离度分析"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "output_path": {
                    "type": "string",
                    "description": "看板 HTML 输出路径（默认：reports/stablecoin_dashboard.html）",
                    "default": "reports/stablecoin_dashboard.html"
                },
                "days": {
                    "type": "integer",
                    "description": "分析天数（默认 30 天）",
                    "default": 30
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
        output_path: str = "reports/stablecoin_dashboard.html",
        days: int = 30
    ) -> ToolResult:
        """
        生成稳定币市值技术分析看板
        
        Args:
            output_path: 看板 HTML 输出路径
            days: 分析天数
        
        Returns:
            ToolResult，包含：
            - output_path: 生成的文件路径
            - current_marketcap: 当前总市值
            - ma7: 7 日移动平均值
            - rsi: RSI 指标值
            - deviation: 偏离度百分比
        """
        _ensure_deps()
        
        logger.info(f"开始生成稳定币市值技术分析看板（{days} 天）")
        
        try:
            # 1. 获取历史数据
            response = requests.get(f"{self.API_BASE}/stablecoincharts/all")
            response.raise_for_status()
            history_data = response.json()
            
            if not history_data:
                return ToolResult(
                    success=False,
                    error='未能获取稳定币历史数据',
                    data={}
                )
            
            # 过滤最近 N 天的数据
            cutoff_date = datetime.now() - timedelta(days=days)
            cutoff_timestamp = int(cutoff_date.timestamp())
            
            filtered_data = []
            for entry in history_data:
                date_value = entry.get('date', '0')
                # date 是字符串格式的时间戳
                try:
                    timestamp = int(date_value)
                    if timestamp >= cutoff_timestamp:
                        filtered_data.append({
                            'timestamp': timestamp,
                            'data': entry
                        })
                except (ValueError, TypeError):
                    continue
            
            if len(filtered_data) < 7:
                return ToolResult(
                    success=False,
                    error=f'历史数据不足（仅 {len(filtered_data)} 天），至少需要 7 天',
                    data={}
                )
            
            # 2. 转换为 DataFrame
            df_data = []
            for item in filtered_data:
                entry = item['data']
                timestamp = item['timestamp']
                # 获取 totalCirculatingUSD.peggedUSD
                marketcap = entry.get('totalCirculatingUSD', {}).get('peggedUSD', 0)
                df_data.append({
                    'date': datetime.fromtimestamp(timestamp),
                    'marketcap': marketcap
                })
            
            df = pd.DataFrame(df_data)
            df = df.sort_values('date')
            df.set_index('date', inplace=True)
            
            # 3. 计算技术指标
            # MA7 - 7 日移动平均
            df['MA7'] = df['marketcap'].rolling(window=7).mean()
            
            # RSI - 相对强弱指标
            df['RSI'] = self._calculate_rsi(df['marketcap'], period=14)
            
            # 偏离度 - 当前市值与 MA7 的偏离百分比
            df['Deviation'] = ((df['marketcap'] - df['MA7']) / df['MA7']) * 100
            
            # 4. 获取最新指标值
            latest = df.iloc[-1]
            current_marketcap = float(latest['marketcap'])
            ma7 = float(latest['MA7']) if not pd.isna(latest['MA7']) else current_marketcap
            rsi = float(latest['RSI']) if not pd.isna(latest['RSI']) else 50.0
            deviation = float(latest['Deviation']) if not pd.isna(latest['Deviation']) else 0.0
            
            # 5. 创建 Plotly 看板
            fig = make_subplots(
                rows=3, cols=1,
                row_heights=[0.5, 0.25, 0.25],
                subplot_titles=(
                    '稳定币总市值走势 & MA7',
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
            
            # 子图 1: 折线图 + MA7
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['marketcap'],
                    mode='lines',
                    name='总市值',
                    line=dict(color='#2196f3', width=2),
                    fill='tozeroy',
                    fillcolor='rgba(33, 150, 243, 0.1)'
                ),
                row=1, col=1
            )
            
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['MA7'],
                    mode='lines',
                    name='MA7',
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
                    line=dict(color='#9c27b0', width=2)
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
            
            # 6. 更新布局
            fig.update_layout(
                title={
                    'text': f'稳定币总市值技术分析看板<br><sub>数据来源: DefiLlama | 更新时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</sub>',
                    'x': 0.5,
                    'xanchor': 'center'
                },
                height=1200,
                showlegend=True,
                hovermode='x unified'
            )
            
            # 更新 Y 轴标签
            fig.update_yaxes(title_text="市值 (USD)", row=1, col=1)
            fig.update_yaxes(title_text="RSI", row=2, col=1)
            fig.update_yaxes(title_text="偏离度 (%)", row=3, col=1)
            
            # 更新 X 轴标签
            fig.update_xaxes(title_text="日期", row=3, col=1)
            
            # 7. 保存 HTML 文件
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            fig.write_html(str(output_file))
            
            result = {
                'output_path': str(output_file),
                'current_marketcap': round(current_marketcap, 2),
                'ma7': round(ma7, 2),
                'rsi': round(rsi, 2),
                'deviation': round(deviation, 2),
                'data_points': len(df),
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"成功生成稳定币看板: {output_file}")
            logger.info(f"当前市值: ${current_marketcap:,.0f}, MA7: ${ma7:,.0f}, RSI: {rsi:.2f}, 偏离度: {deviation:+.2f}%")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"生成稳定币看板失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={}
            )
