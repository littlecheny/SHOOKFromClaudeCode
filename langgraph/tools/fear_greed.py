"""
贪婪恐慌指数获取工具封装

通过 Alternative.me API 获取加密货币贪婪恐慌指数（Fear & Greed Index）
包含情绪动量、情绪斜率、情绪位阶等高级指标
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


class GetFearGreedTool(BaseTool):
    """
    获取贪婪恐慌指数工具
    
    通过 Alternative.me API 获取加密货币市场的贪婪恐慌指数
    """
    
    API_BASE = "https://api.alternative.me/fng/"
    
    @property
    def name(self) -> str:
        return "get_fear_greed"
    
    @property
    def description(self) -> str:
        return "获取加密货币贪婪恐慌指数（Fear & Greed Index）和历史数据"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "获取最近 N 天的历史数据（默认 30 天，最大 0=全部）",
                    "default": 30
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
    
    def execute(self, limit: int = 30) -> ToolResult:
        """
        获取贪婪恐慌指数数据
        
        Args:
            limit: 获取最近 N 天的历史数据，0 表示全部
        
        Returns:
            ToolResult，包含：
            - current_value: 当前指数值（0-100）
            - current_classification: 当前分类（Extreme Fear/Fear/Neutral/Greed/Extreme Greed）
            - momentum: 情绪动量（今日 - 昨日）
            - slope: 情绪斜率（过去3天线性回归）
            - percentile: 情绪位阶（过去一年的百分位）
            - history: 历史数据列表
        """
        _ensure_deps()  # 确保导入依赖
        
        logger.info(f"获取贪婪恐慌指数数据，limit={limit}")
        
        try:
            # 1. 获取历史数据
            params = {}
            if limit > 0:
                params['limit'] = limit
            
            response = requests.get(self.API_BASE, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data.get('data'):
                return ToolResult(
                    success=False,
                    error='未能获取贪婪恐慌指数数据',
                    data={}
                )
            
            history_data = data['data']
            
            # 2. 解析当前数据
            latest = history_data[0]
            current_value = int(latest['value'])
            current_classification = latest['value_classification']
            
            # 3. 构建历史数据列表
            history = []
            for entry in history_data:
                history.append({
                    'date': datetime.fromtimestamp(int(entry['timestamp'])).strftime('%Y-%m-%d'),
                    'timestamp': int(entry['timestamp']),
                    'value': int(entry['value']),
                    'classification': entry['value_classification']
                })
            
            # 按时间排序（从旧到新）
            history.sort(key=lambda x: x['timestamp'])
            
            # 4. 计算情绪动量（Momentum）：今日 - 昨日
            momentum = 0
            if len(history) >= 2:
                today = history[-1]['value']
                yesterday = history[-2]['value']
                momentum = today - yesterday
            
            # 5. 计算情绪斜率（Slope）：过去3天线性回归斜率
            slope = 0.0
            if len(history) >= 3:
                recent_3days = history[-3:]
                values = [item['value'] for item in recent_3days]
                x = np.array([0, 1, 2])
                y = np.array(values)
                # 计算线性回归斜率
                slope = float(np.polyfit(x, y, 1)[0])
            
            # 6. 计算情绪位阶（Percentile）：当前情绪在过去一年的百分位
            percentile = 0.0
            # 获取过去一年的数据（最多365天）
            if limit == 0 or limit >= 365:
                year_data = [item['value'] for item in history[-365:]] if len(history) >= 365 else [item['value'] for item in history]
            else:
                # 需要额外请求一年的数据
                response_year = requests.get(self.API_BASE, params={'limit': 365})
                response_year.raise_for_status()
                year_raw = response_year.json()
                year_data = [int(item['value']) for item in year_raw.get('data', [])]
            
            if year_data:
                # 计算百分位：有多少数据点小于等于当前值
                percentile = float((sum(1 for v in year_data if v <= current_value) / len(year_data)) * 100)
            
            result = {
                'current_value': current_value,
                'current_classification': current_classification,
                'momentum': momentum,
                'slope': round(slope, 2),
                'percentile': round(percentile, 1),
                'history': history,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"成功获取贪婪恐慌指数: 当前值 {current_value} ({current_classification}), "
                       f"动量 {momentum:+d}, 斜率 {slope:.2f}, 位阶 {percentile:.1f}%")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"获取贪婪恐慌指数失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={}
            )


class GetFearGreedInfoTool(BaseTool):
    """
    获取贪婪恐慌指数基本信息工具
    
    获取贪婪恐慌指数的说明和分类标准
    """
    
    @property
    def name(self) -> str:
        return "get_fear_greed_info"
    
    @property
    def description(self) -> str:
        return "获取贪婪恐慌指数基本信息和分类标准"
    
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
        获取贪婪恐慌指数基本信息
        
        Returns:
            ToolResult，包含：
            - name: 指数名称
            - description: 指数描述
            - classifications: 分类标准
            - data_source: 数据来源
        """
        logger.info("获取贪婪恐慌指数基本信息")
        
        result = {
            'name': 'Crypto Fear & Greed Index',
            'description': '加密货币市场情绪指数，范围 0-100，衡量市场的贪婪或恐慌程度',
            'classifications': {
                '0-24': 'Extreme Fear（极度恐慌）',
                '25-44': 'Fear（恐慌）',
                '45-55': 'Neutral（中性）',
                '56-75': 'Greed（贪婪）',
                '76-100': 'Extreme Greed（极度贪婪）'
            },
            'indicators': {
                'momentum': '情绪动量：今日情绪 - 昨日情绪',
                'slope': '情绪斜率：过去3天情绪的线性回归斜率（斜率为正且平稳=趋势安全；斜率突然变陡=风险临近）',
                'percentile': '情绪位阶：当前情绪在过去一年的百分位（告诉你是历史级疯狂还是历史级绝望）'
            },
            'data_source': 'Alternative.me API',
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info("成功获取贪婪恐慌指数基本信息")
        
        return ToolResult(
            success=True,
            data=result
        )


class GenerateFearGreedDashboardTool(BaseTool):
    """
    生成贪婪恐慌指数技术分析看板工具
    
    获取历史数据，计算情绪动量、斜率、位阶，
    使用 plotly 生成交互式技术分析看板
    """
    
    API_BASE = "https://api.alternative.me/fng/"
    
    @property
    def name(self) -> str:
        return "generate_fear_greed_dashboard"
    
    @property
    def description(self) -> str:
        return "生成贪婪恐慌指数技术分析看板，包含情绪动量、斜率和位阶分析"
    
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "output_path": {
                    "type": "string",
                    "description": "看板 HTML 输出路径（默认：reports/fear_greed_dashboard.html）",
                    "default": "reports/fear_greed_dashboard.html"
                },
                "days": {
                    "type": "integer",
                    "description": "分析天数（默认 90 天）",
                    "default": 90
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
        output_path: str = "reports/fear_greed_dashboard.html",
        days: int = 90
    ) -> ToolResult:
        """
        生成贪婪恐慌指数技术分析看板
        
        Args:
            output_path: 看板 HTML 输出路径
            days: 分析天数
        
        Returns:
            ToolResult，包含：
            - output_path: 生成的文件路径
            - current_value: 当前指数值
            - momentum: 情绪动量
            - slope: 情绪斜率
            - percentile: 情绪位阶
        """
        _ensure_deps()
        
        logger.info(f"开始生成贪婪恐慌指数技术分析看板（{days} 天）")
        
        try:
            # 1. 获取历史数据
            response = requests.get(self.API_BASE, params={'limit': days})
            response.raise_for_status()
            data = response.json()
            
            if not data.get('data'):
                return ToolResult(
                    success=False,
                    error='未能获取贪婪恐慌指数历史数据',
                    data={}
                )
            
            history_data = data['data']
            
            # 2. 转换为 DataFrame
            df_data = []
            for entry in history_data:
                df_data.append({
                    'date': datetime.fromtimestamp(int(entry['timestamp'])),
                    'value': int(entry['value']),
                    'classification': entry['value_classification']
                })
            
            df = pd.DataFrame(df_data)
            df = df.sort_values('date')
            df.set_index('date', inplace=True)
            
            # 3. 计算技术指标
            # 情绪动量：当日 - 前一日
            df['Momentum'] = df['value'].diff()
            
            # 情绪斜率：3天滚动线性回归斜率
            def calculate_slope(series):
                if len(series) < 3:
                    return 0
                x = np.arange(len(series))
                y = series.values
                return np.polyfit(x, y, 1)[0]
            
            df['Slope'] = df['value'].rolling(window=3).apply(calculate_slope, raw=False)
            
            # 情绪位阶：在整个数据集中的百分位
            df['Percentile'] = df['value'].rank(pct=True) * 100
            
            # 4. 获取最新指标值
            latest = df.iloc[-1]
            current_value = int(latest['value'])
            momentum = float(latest['Momentum']) if not pd.isna(latest['Momentum']) else 0.0
            slope = float(latest['Slope']) if not pd.isna(latest['Slope']) else 0.0
            percentile = float(latest['Percentile']) if not pd.isna(latest['Percentile']) else 50.0
            
            # 5. 创建 Plotly 看板
            fig = make_subplots(
                rows=4, cols=1,
                row_heights=[0.4, 0.2, 0.2, 0.2],
                subplot_titles=(
                    '贪婪恐慌指数走势',
                    '情绪动量 (Momentum)',
                    '情绪斜率 (Slope)',
                    '情绪位阶 (Percentile)'
                ),
                vertical_spacing=0.08,
                specs=[
                    [{"secondary_y": False}],
                    [{"secondary_y": False}],
                    [{"secondary_y": False}],
                    [{"secondary_y": False}]
                ]
            )
            
            # 子图 1: 指数走势（填充颜色区域）
            # 根据值设置颜色
            colors = []
            for val in df['value']:
                if val <= 24:
                    colors.append('#ef5350')  # Extreme Fear - 红色
                elif val <= 44:
                    colors.append('#ff9800')  # Fear - 橙色
                elif val <= 55:
                    colors.append('#ffc107')  # Neutral - 黄色
                elif val <= 75:
                    colors.append('#8bc34a')  # Greed - 浅绿
                else:
                    colors.append('#4caf50')  # Extreme Greed - 深绿
            
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['value'],
                    mode='lines',
                    name='Fear & Greed Index',
                    line=dict(color='#2196f3', width=2),
                    fill='tozeroy',
                    fillcolor='rgba(33, 150, 243, 0.1)'
                ),
                row=1, col=1
            )
            
            # 添加分类区域线
            fig.add_hline(y=25, line_dash="dash", line_color="red", opacity=0.3, row=1, col=1)
            fig.add_hline(y=45, line_dash="dash", line_color="orange", opacity=0.3, row=1, col=1)
            fig.add_hline(y=55, line_dash="dash", line_color="yellow", opacity=0.3, row=1, col=1)
            fig.add_hline(y=75, line_dash="dash", line_color="lightgreen", opacity=0.3, row=1, col=1)
            
            # 子图 2: 情绪动量
            momentum_colors = ['#ef5350' if val < 0 else '#4caf50' for val in df['Momentum']]
            fig.add_trace(
                go.Bar(
                    x=df.index,
                    y=df['Momentum'],
                    name='Momentum',
                    marker_color=momentum_colors,
                    showlegend=False
                ),
                row=2, col=1
            )
            fig.add_hline(y=0, line_color="gray", line_width=1, row=2, col=1)
            
            # 子图 3: 情绪斜率
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['Slope'],
                    mode='lines',
                    name='Slope',
                    line=dict(color='#9c27b0', width=2)
                ),
                row=3, col=1
            )
            fig.add_hline(y=0, line_color="gray", line_width=1, row=3, col=1)
            
            # 子图 4: 情绪位阶
            fig.add_trace(
                go.Scatter(
                    x=df.index,
                    y=df['Percentile'],
                    mode='lines',
                    name='Percentile',
                    line=dict(color='#ff5722', width=2),
                    fill='tozeroy',
                    fillcolor='rgba(255, 87, 34, 0.1)'
                ),
                row=4, col=1
            )
            fig.add_hline(y=50, line_dash="dash", line_color="gray", opacity=0.5, row=4, col=1)
            
            # 6. 更新布局
            fig.update_layout(
                title={
                    'text': f'加密货币贪婪恐慌指数技术分析看板<br><sub>数据来源: Alternative.me | 更新时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</sub>',
                    'x': 0.5,
                    'xanchor': 'center'
                },
                height=1400,
                showlegend=True,
                hovermode='x unified'
            )
            
            # 更新 Y 轴标签
            fig.update_yaxes(title_text="指数值 (0-100)", row=1, col=1)
            fig.update_yaxes(title_text="动量", row=2, col=1)
            fig.update_yaxes(title_text="斜率", row=3, col=1)
            fig.update_yaxes(title_text="位阶 (%)", row=4, col=1)
            
            # 更新 X 轴标签
            fig.update_xaxes(title_text="日期", row=4, col=1)
            
            # 7. 保存 HTML 文件
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            fig.write_html(str(output_file))
            
            result = {
                'output_path': str(output_file),
                'current_value': current_value,
                'current_classification': latest['classification'],
                'momentum': round(momentum, 2),
                'slope': round(slope, 2),
                'percentile': round(percentile, 1),
                'data_points': len(df),
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"成功生成贪婪恐慌指数看板: {output_file}")
            logger.info(f"当前值: {current_value}, 动量: {momentum:.2f}, 斜率: {slope:.2f}, 位阶: {percentile:.1f}%")
            
            return ToolResult(
                success=True,
                data=result
            )
        
        except Exception as e:
            logger.error(f"生成贪婪恐慌指数看板失败: {e}", exc_info=True)
            return ToolResult(
                success=False,
                error=str(e),
                data={}
            )
