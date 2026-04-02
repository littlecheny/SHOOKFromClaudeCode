from term_image.image import from_file
import time
import os
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent

# 动画帧列表（第1帧到第6帧）
frames = [
    "启动动画第1帧.png",
    "启动动画第2帧.png",
    "启动动画第3帧.png",
    "启动动画第4帧.png",
    "启动动画第5帧.png",
    "启动动画第6帧.png"
]

def clear_screen():
    """清除屏幕内容"""
    os.system('cls' if os.name == 'nt' else 'clear')

print("开始播放启动动画...")
time.sleep(1)

for i, frame_name in enumerate(frames, 1):
    if i > 1:
        # 从第二帧开始，先清除屏幕
        clear_screen()
    print(f"=== 第 {i} 帧 ===")
    image_path = str(PROJECT_ROOT / "启动动画" / frame_name)
    # 设置统一的高度（20行），保持所有图片高度一致
    image = from_file(image_path, height=10)
    print(image)
    time.sleep(0.5)

clear_screen()
print("\n动画播放完成！")