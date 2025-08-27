# 📤 发布到 GitHub

## 步骤 1: 创建 GitHub 仓库

1. 打开 [GitHub](https://github.com)
2. 点击右上角 "+" → "New repository"
3. 设置仓库信息：
   - **Repository name**: `ai-pm-bot`
   - **Description**: `AI-powered project management bot for Telegram with Notion integration and voice support`
   - **Public/Private**: 选择 Public（开源）
   - **不要** 勾选 "Add a README file"（我们已有）
   - **不要** 勾选 "Add .gitignore"（我们已有）
   - **License**: 不选（我们已有 MIT License）

4. 点击 "Create repository"

## 步骤 2: 推送代码

GitHub 会显示推送命令，复制并执行：

```bash
# 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/ai-pm-bot.git

# 推送到 main 分支
git branch -M main
git push -u origin main
```

如果使用 SSH：
```bash
git remote add origin git@github.com:YOUR_USERNAME/ai-pm-bot.git
git branch -M main
git push -u origin main
```

## 步骤 3: 完善仓库设置

### 添加 Topics
在仓库页面点击齿轮图标，添加 topics：
- `telegram-bot`
- `notion-api`
- `claude-ai`
- `project-management`
- `voice-recognition`
- `nodejs`
- `macos-app`

### 设置 GitHub Pages（可选）
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main / docs（如果有文档）

### 添加保护规则（可选）
1. Settings → Branches
2. Add rule
3. Branch name pattern: `main`
4. 勾选：
   - Require pull request reviews
   - Dismiss stale pull request approvals

## 步骤 4: 创建首次 Release

```bash
# 创建标签
git tag -a v1.0.0 -m "First release: Full featured AI PM Bot"

# 推送标签
git push origin v1.0.0
```

在 GitHub 上：
1. 点击 "Releases"
2. 点击 "Draft a new release"
3. 选择 tag: v1.0.0
4. Release title: `v1.0.0 - Initial Release`
5. 描述主要功能
6. 附加 Mac 应用（可选）
7. 点击 "Publish release"

## 步骤 5: 更新 README 中的链接

编辑 README.md，替换：
- `https://github.com/yourusername/ai-pm-bot` 
- 为你的实际仓库地址

```bash
# 更新后提交
git add README.md
git commit -m "docs: Update repository URLs"
git push
```

## 🎉 完成！

你的项目现在已经开源在 GitHub 上了。

### 后续建议：

1. **添加 CI/CD**
   创建 `.github/workflows/test.yml` 用于自动测试

2. **创建 Issue 模板**
   - Bug report
   - Feature request
   - Question

3. **添加贡献指南**
   创建 `CONTRIBUTING.md`

4. **设置 Discord/Slack**
   为社区讨论创建频道

5. **申请 GitHub Star**
   分享给朋友和社区

## 📊 项目统计徽章

添加到 README.md：

```markdown
![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/ai-pm-bot?style=social)
![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/ai-pm-bot?style=social)
![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/ai-pm-bot)
![GitHub license](https://img.shields.io/github/license/YOUR_USERNAME/ai-pm-bot)
```

## 🔐 安全注意事项

**推送前请确认：**
- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 没有提交任何 API 密钥
- [ ] 没有提交任何私密信息
- [ ] 测试数据已清理

**如果不小心提交了敏感信息：**
```bash
# 从历史中删除文件
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送
git push origin --force --all
```