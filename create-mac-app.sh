#!/bin/bash
# 创建Mac应用程序

echo "🎯 创建 AI PM Bot Mac应用..."

# 应用名称
APP_NAME="AI PM Bot"
APP_DIR="$APP_NAME.app"

# 创建应用结构
echo "📁 创建应用结构..."
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# 创建启动脚本
cat > "$APP_DIR/Contents/MacOS/AI-PM-Bot" << 'EOF'
#!/bin/bash
# Mac App启动器

# 获取应用所在目录
APP_PATH="$(cd "$(dirname "$0")/../../../" && pwd)"
cd "$APP_PATH"

# 检查Terminal权限
osascript -e 'tell application "Terminal"' 2>/dev/null || {
    osascript -e 'display dialog "请在系统偏好设置中授予Terminal权限" buttons {"确定"} default button 1'
    exit 1
}

# 在Terminal中运行
osascript << EOA
tell application "Terminal"
    activate
    do script "cd '$APP_PATH' && ./AI-PM-Bot.command"
end tell
EOA
EOF

chmod +x "$APP_DIR/Contents/MacOS/AI-PM-Bot"

# 创建Info.plist
cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AI-PM-Bot</string>
    <key>CFBundleIdentifier</key>
    <string>com.lapure.ai-pm-bot</string>
    <key>CFBundleName</key>
    <string>AI PM Bot</string>
    <key>CFBundleDisplayName</key>
    <string>AI项目管理机器人</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.productivity</string>
</dict>
</plist>
EOF

# 创建图标（使用emoji作为临时图标）
echo "🎨 创建应用图标..."
cat > "$APP_DIR/Contents/Resources/AppIcon.iconset/icon_512x512.png" << 'EOF'
# 这里应该是PNG图标数据，暂时用占位符
EOF

# 创建一个简单的图标生成脚本
cat > create-icon.py << 'EOF'
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
EOF

# 尝试生成图标
if command -v python3 &> /dev/null && python3 -c "import PIL" 2>/dev/null; then
    echo "生成应用图标..."
    python3 create-icon.py
else
    echo "⚠️ 需要安装Pillow来生成图标: pip3 install Pillow"
fi

# 创建DMG安装包（可选）
create_dmg() {
    echo "📦 创建DMG安装包..."
    
    # 创建临时目录
    mkdir -p dmg-temp
    cp -r "$APP_DIR" dmg-temp/
    
    # 创建Applications链接
    ln -s /Applications dmg-temp/Applications
    
    # 创建DMG
    hdiutil create -volname "$APP_NAME" -srcfolder dmg-temp -ov -format UDZO "$APP_NAME.dmg"
    
    # 清理
    rm -rf dmg-temp
    
    echo "✅ DMG创建成功: $APP_NAME.dmg"
}

echo ""
echo "✅ Mac应用创建成功！"
echo ""
echo "📱 应用位置: $APP_DIR"
echo ""
echo "🚀 使用方法:"
echo "  1. 双击 '$APP_DIR' 启动应用"
echo "  2. 或拖动到 Applications 文件夹"
echo ""
echo -n "是否创建DMG安装包? [y/N]: "
read create_dmg_choice

if [[ "$create_dmg_choice" == "y" ]] || [[ "$create_dmg_choice" == "Y" ]]; then
    create_dmg
fi

echo ""
echo "✨ 完成！"