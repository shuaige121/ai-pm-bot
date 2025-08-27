#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw, ImageFont
import subprocess

# 创建图标目录
iconset_dir = "AI PM Bot.app/Contents/Resources/AppIcon.iconset"
os.makedirs(iconset_dir, exist_ok=True)

# 创建基础图标（使用渐变背景和文字）
def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 渐变背景
    for i in range(size):
        color = int(100 + (155 * i / size))
        draw.rectangle([0, i, size, i+1], fill=(0, color, 255, 255))
    
    # 圆角
    corner_radius = size // 8
    draw.pieslice([0, 0, corner_radius*2, corner_radius*2], 180, 270, fill=(0, 0, 0, 0))
    draw.pieslice([size-corner_radius*2, 0, size, corner_radius*2], 270, 360, fill=(0, 0, 0, 0))
    draw.pieslice([0, size-corner_radius*2, corner_radius*2, size], 90, 180, fill=(0, 0, 0, 0))
    draw.pieslice([size-corner_radius*2, size-corner_radius*2, size, size], 0, 90, fill=(0, 0, 0, 0))
    
    # 添加文字
    text = "AI\nPM"
    try:
        font_size = size // 4
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        font = ImageFont.load_default()
    
    # 获取文字边界框
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # 居中绘制文字
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    return img

# 生成所需尺寸
sizes = [16, 32, 64, 128, 256, 512, 1024]
for size in sizes:
    img = create_icon(size)
    if size == 1024:
        img.save(f"{iconset_dir}/icon_512x512@2x.png")
    else:
        img.save(f"{iconset_dir}/icon_{size}x{size}.png")
        if size <= 512:
            img.save(f"{iconset_dir}/icon_{size//2}x{size//2}@2x.png")

print("✅ 图标创建成功")

# 转换为icns格式
try:
    subprocess.run([
        "iconutil", "-c", "icns", 
        "-o", "AI PM Bot.app/Contents/Resources/AppIcon.icns",
        iconset_dir
    ], check=True)
    print("✅ ICNS图标生成成功")
except:
    print("⚠️ ICNS转换失败，使用PNG图标")
