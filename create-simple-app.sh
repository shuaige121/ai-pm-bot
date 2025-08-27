#!/bin/bash
# 创建简化版Mac应用

APP_NAME="AI PM Bot"
APP_DIR="$APP_NAME.app"

echo "🎯 创建简化版Mac应用..."

# 清理旧版本
rm -rf "$APP_DIR"

# 创建应用结构
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# 创建主执行文件
cat > "$APP_DIR/Contents/MacOS/launcher" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "$0")/../../../" && pwd)"
cd "$DIR"

# 使用osascript创建一个简单的GUI
osascript << 'EOS'
set appPath to (POSIX path of (path to me)) & "../../../"

tell application "System Events"
    set frontApp to name of first application process whose frontmost is true
end tell

set choice to button returned of (display dialog "AI项目管理机器人" & return & return & "选择操作：" buttons {"启动服务", "管理面板", "退出"} default button 1 with icon note)

if choice is "启动服务" then
    do shell script "cd " & quoted form of appPath & " && ./start.sh > /tmp/ai-pm-start.log 2>&1"
    display notification "AI PM Bot 已启动" with title "启动成功" subtitle "服务运行中" sound name "Glass"
    
else if choice is "管理面板" then
    tell application "Terminal"
        activate
        do script "cd " & quoted form of appPath & " && ./AI-PM-Bot.command"
    end tell
    
end if
EOS
EOF

chmod +x "$APP_DIR/Contents/MacOS/launcher"

# 创建Info.plist
cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIdentifier</key>
    <string>com.lapure.aipmbot</string>
    <key>CFBundleName</key>
    <string>AI PM Bot</string>
    <key>CFBundleDisplayName</key>
    <string>AI项目管理机器人</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo "✅ 应用创建成功！"
echo ""
echo "📱 使用方法："
echo "  1. 双击 '$APP_DIR' 启动"
echo "  2. 选择'启动服务'快速启动Bot"
echo "  3. 选择'管理面板'打开完整控制台"
echo ""
echo "💡 提示：可以将应用拖到Applications文件夹"