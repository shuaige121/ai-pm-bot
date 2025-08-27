#!/bin/bash
# GitHub 推送脚本

echo "🚀 GitHub 推送助手"
echo "=================="
echo ""

# 检查是否已有 remote
if git remote | grep -q "origin"; then
    echo "⚠️  已存在 origin remote"
    echo "当前 remote URL:"
    git remote -v | grep origin | head -1
    echo ""
    echo -n "是否要更新 remote URL? [y/N]: "
    read update_remote
    if [[ "$update_remote" == "y" ]] || [[ "$update_remote" == "Y" ]]; then
        git remote remove origin
    else
        echo "使用现有 remote"
        git push -u origin main
        exit 0
    fi
fi

# 获取 GitHub 用户名
echo -n "请输入你的 GitHub 用户名: "
read GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ 用户名不能为空"
    exit 1
fi

# 选择认证方式
echo ""
echo "选择认证方式:"
echo "1) HTTPS + Token (推荐)"
echo "2) SSH"
echo -n "选择 [1-2]: "
read AUTH_METHOD

if [ "$AUTH_METHOD" == "1" ]; then
    # HTTPS 方式
    echo ""
    echo "📝 获取 GitHub Token 的方法:"
    echo "1. 从 1Password 获取:"
    echo "   op item get 'GitHub' --fields token"
    echo ""
    echo "2. 或创建新 Token:"
    echo "   https://github.com/settings/tokens/new"
    echo "   权限: repo (全部)"
    echo ""
    echo -n "请输入你的 GitHub Token: "
    read -s GITHUB_TOKEN
    echo ""
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo "❌ Token 不能为空"
        exit 1
    fi
    
    # 添加带 token 的 remote
    git remote add origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/ai-pm-bot.git
    echo "✅ 已添加 HTTPS remote (带 token)"
    
elif [ "$AUTH_METHOD" == "2" ]; then
    # SSH 方式
    git remote add origin git@github.com:${GITHUB_USERNAME}/ai-pm-bot.git
    echo "✅ 已添加 SSH remote"
else
    echo "❌ 无效选择"
    exit 1
fi

# 推送代码
echo ""
echo "正在推送到 GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "🎉 你的项目现在在:"
    echo "   https://github.com/${GITHUB_USERNAME}/ai-pm-bot"
    echo ""
    echo "下一步:"
    echo "1. 添加项目描述和 topics"
    echo "2. 创建首个 Release"
    echo "3. 分享给朋友获取 ⭐"
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "可能的原因:"
    echo "1. 仓库不存在 - 先在 GitHub 创建 'ai-pm-bot' 仓库"
    echo "2. Token 权限不足 - 需要 repo 权限"
    echo "3. 网络问题 - 检查网络连接"
fi