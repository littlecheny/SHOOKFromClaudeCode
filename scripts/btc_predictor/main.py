#!/usr/bin/env python3
"""
BTC 预测看板生成器
生成包含 DXY、NASDAQ、稳定币总市值、贪婪恐慌指数、OKX 资金费率的综合看板
"""
import argparse
import logging
import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent

# 将项目根目录加入 sys.path
sys.path.insert(0, str(PROJECT_ROOT))

from langgraph.tools.registry import get_default_registry

# 加载环境变量
load_dotenv(PROJECT_ROOT / ".env")

# 创建日志目录
logs_dir = PROJECT_ROOT / "logs"
logs_dir.mkdir(exist_ok=True)

# 配置日志
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(logs_dir / 'btc_predictor.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


class BTCPredictorOrchestrator:
    """BTC 预测看板编排器"""
    
    def __init__(self, output_dir: str = None):
        """
        Args:
            output_dir: 看板输出目录（如果为 None，自动生成带时间戳的目录）
        """
        # 如果未指定输出目录，自动生成带时间戳的目录
        if output_dir is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_dir = f"reports/btc_predictor_{timestamp}"
        
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.tool_registry = get_default_registry()
        
        logger.info(f"初始化完成：输出目录={self.output_dir}")
        logger.info(f"已加载 {len(self.tool_registry)} 个工具")
    
    def generate_dashboards(self) -> dict[str, str]:
        """
        生成所有看板
        
        Returns:
            字典，包含各个看板的文件路径
        """
        logger.info("开始生成所有看板...")
        
        dashboards = {}
        
        # 1. DXY 美元指数看板
        logger.info("生成 DXY 美元指数看板...")
        dxy_tool = self.tool_registry.get('generate_dxy_dashboard')
        if dxy_tool:
            dxy_result = dxy_tool.execute(
                output_path=str(self.output_dir / 'dxy_dashboard.html')
            )
            if dxy_result.success:
                dashboards['dxy'] = dxy_result.data['output_path']
                logger.info(f"DXY 看板生成成功: {dashboards['dxy']}")
            else:
                logger.error(f"DXY 看板生成失败: {dxy_result.error}")
        else:
            logger.error("未找到 generate_dxy_dashboard 工具")
        
        # 2. NASDAQ 纳斯达克指数看板
        logger.info("生成 NASDAQ 纳斯达克指数看板...")
        nasdaq_tool = self.tool_registry.get('generate_nasdaq_dashboard')
        if nasdaq_tool:
            nasdaq_result = nasdaq_tool.execute(
                output_path=str(self.output_dir / 'nasdaq_dashboard.html')
            )
            if nasdaq_result.success:
                dashboards['nasdaq'] = nasdaq_result.data['output_path']
                logger.info(f"NASDAQ 看板生成成功: {dashboards['nasdaq']}")
            else:
                logger.error(f"NASDAQ 看板生成失败: {nasdaq_result.error}")
        else:
            logger.error("未找到 generate_nasdaq_dashboard 工具")
        
        # 3. 稳定币总市值看板
        logger.info("生成稳定币总市值看板...")
        stablecoin_tool = self.tool_registry.get('generate_stablecoin_dashboard')
        if stablecoin_tool:
            stablecoin_result = stablecoin_tool.execute(
                output_path=str(self.output_dir / 'stablecoin_dashboard.html')
            )
            if stablecoin_result.success:
                dashboards['stablecoin'] = stablecoin_result.data['output_path']
                logger.info(f"稳定币看板生成成功: {dashboards['stablecoin']}")
            else:
                logger.error(f"稳定币看板生成失败: {stablecoin_result.error}")
        else:
            logger.error("未找到 generate_stablecoin_dashboard 工具")
        
        # 4. 贪婪恐慌指数看板
        logger.info("生成贪婪恐慌指数看板...")
        fear_greed_tool = self.tool_registry.get('generate_fear_greed_dashboard')
        if fear_greed_tool:
            fear_greed_result = fear_greed_tool.execute(
                output_path=str(self.output_dir / 'fear_greed_dashboard.html')
            )
            if fear_greed_result.success:
                dashboards['fear_greed'] = fear_greed_result.data['output_path']
                logger.info(f"贪婪恐慌指数看板生成成功: {dashboards['fear_greed']}")
            else:
                logger.error(f"贪婪恐慌指数看板生成失败: {fear_greed_result.error}")
        else:
            logger.error("未找到 generate_fear_greed_dashboard 工具")
        
        # 5. OKX 资金费率看板
        logger.info("生成 OKX 资金费率看板...")
        okx_tool = self.tool_registry.get('generate_okx_funding_rate_dashboard')
        if okx_tool:
            okx_result = okx_tool.execute(
                output_path=str(self.output_dir / 'okx_funding_dashboard.html')
            )
            if okx_result.success:
                dashboards['okx_funding'] = okx_result.data['output_path']
                logger.info(f"OKX 资金费率看板生成成功: {dashboards['okx_funding']}")
            else:
                logger.error(f"OKX 资金费率看板生成失败: {okx_result.error}")
        else:
            logger.error("未找到 generate_okx_funding_rate_dashboard 工具")
        
        # 6. Bitcoin 现货价格看板
        logger.info("生成 Bitcoin 现货价格看板...")
        spot_tool = self.tool_registry.get('generate_okx_spot_dashboard')
        if spot_tool:
            spot_result = spot_tool.execute(
                output_path=str(self.output_dir / 'btc_spot_dashboard.html')
            )
            if spot_result.success:
                dashboards['btc_spot'] = spot_result.data['output_path']
                logger.info(f"Bitcoin 现货价格看板生成成功: {dashboards['btc_spot']}")
            else:
                logger.error(f"Bitcoin 现货价格看板生成失败: {spot_result.error}")
        else:
            logger.error("未找到 generate_okx_spot_dashboard 工具")
        
        # 7. Bitcoin 合约价格看板
        logger.info("生成 Bitcoin 合约价格看板...")
        futures_tool = self.tool_registry.get('generate_okx_futures_dashboard')
        if futures_tool:
            futures_result = futures_tool.execute(
                output_path=str(self.output_dir / 'btc_futures_dashboard.html')
            )
            if futures_result.success:
                dashboards['btc_futures'] = futures_result.data['output_path']
                logger.info(f"Bitcoin 合约价格看板生成成功: {dashboards['btc_futures']}")
            else:
                logger.error(f"Bitcoin 合约价格看板生成失败: {futures_result.error}")
        else:
            logger.error("未找到 generate_okx_futures_dashboard 工具")
        
        # 8. Farside BTC 截图
        logger.info("生成 Farside BTC 截图...")
        farside_tool = self.tool_registry.get('farside_btc_screenshot')
        if farside_tool:
            farside_result = farside_tool.execute(
                output_path=str(self.output_dir / 'farside_btc.png')
            )
            if farside_result.success:
                dashboards['farside_btc'] = farside_result.data['output_path']
                logger.info(f"Farside BTC 截图生成成功: {dashboards['farside_btc']}")
            else:
                logger.error(f"Farside BTC 截图生成失败: {farside_result.error}")
        else:
            logger.error("未找到 farside_btc_screenshot 工具")
        
        return dashboards
    
    def open_in_browser(self, dashboards: dict[str, str]):
        """
        用 Chrome 浏览器打开所有看板
        
        Args:
            dashboards: 看板文件路径字典
        """
        if not dashboards:
            logger.warning("没有生成的看板可以打开")
            return
        
        logger.info("在 Chrome 浏览器中打开看板...")
        
        # 检测操作系统并使用对应的 Chrome 路径
        if sys.platform == 'darwin':  # macOS
            chrome_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        elif sys.platform == 'linux':
            chrome_path = 'google-chrome'
        elif sys.platform == 'win32':
            chrome_path = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        else:
            logger.error(f"不支持的操作系统: {sys.platform}")
            return
        
        # 在 Chrome 中打开所有看板（每个文件都作为新标签页）
        for name, path in dashboards.items():
            try:
                # 转换为绝对路径的 file:// URL
                file_url = f"file://{Path(path).resolve()}"
                subprocess.run([chrome_path, file_url], check=False)
                logger.info(f"已在 Chrome 中打开 {name} 看板: {file_url}")
            except Exception as e:
                logger.error(f"无法打开 {name} 看板: {e}")
    
    def run(self):
        """主流程"""
        try:
            logger.info(f"========== 开始生成 BTC 预测看板 ==========")
            
            # 1. 生成所有看板
            dashboards = self.generate_dashboards()
            
            # 2. 在 Chrome 中打开看板
            self.open_in_browser(dashboards)
            
            logger.info(f"========== 完成，共生成 {len(dashboards)} 个文件 ==========")
            
            # 输出看板路径列表
            print(f"\n生成的看板文件夹：{self.output_dir}")
            print("\n文件列表：")
            for name, path in dashboards.items():
                file_name = Path(path).name
                print(f"  - {name}: {file_name}")
            
        except Exception as e:
            logger.error(f"执行失败: {e}", exc_info=True)
            raise


def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(description='BTC 预测看板生成器')
    parser.add_argument(
        '--output-dir',
        type=str,
        default=None,
        help='看板输出目录（默认：自动生成带时间戳的目录 reports/btc_predictor_<timestamp>）'
    )
    
    args = parser.parse_args()
    
    # 运行
    orchestrator = BTCPredictorOrchestrator(output_dir=args.output_dir)
    orchestrator.run()


if __name__ == '__main__':
    main()
