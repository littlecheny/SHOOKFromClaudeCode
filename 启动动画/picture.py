from PIL import Image

# 打开原图
img = Image.open('启动动画第1帧.png')

# 获取图像的原始宽度和高度
original_width, original_height = img.size

# 通过循环增加宽度，每次增加 100 像素，共 5 次
for i in range(6):
    new_width = original_width + 230 * (i + 1)  # 每次增加 230 像素
    new_img = Image.new('RGBA', (new_width, original_height), (0, 0, 0, 0))  # 创建透明背景

    # 将原图粘贴到新图的左侧
    new_img.paste(img, (230, 0))

    # 保存修改后的图像
    new_img.save(f'启动动画第{i+2}帧.png')

    # 更新原图为当前的修改图像，用于下一次循环
    img = new_img

