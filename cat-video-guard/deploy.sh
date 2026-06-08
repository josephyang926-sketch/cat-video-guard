#!/bin/bash

# ===================================
# 🐱 喵视频守护者 - GitHub 上传助手
# Cat Video Guard - GitHub Upload Helper
# ===================================

echo "============================================"
echo "🐱 喵视频守护者 - GitHub 一键部署工具"
echo "============================================"
echo ""

# 检查是否安装了git
if ! command -v git &> /dev/null; then
    echo "❌ 未检测到 Git"
    echo ""
    echo "正在尝试安装 Xcode 命令行工具..."
    echo "请在弹出的对话框中点击「安装」"
    echo ""
    xcode-select --install
    
    echo ""
    echo "⏳ 安装完成后，请重新运行此脚本"
    exit 1
fi

# 进入项目目录
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)

echo "📂 项目目录: $PROJECT_DIR"
echo ""
echo "✅ Git 已就绪"
echo ""

# 初始化Git（如果需要）
if [ ! -d ".git" ]; then
    echo "📦 正在初始化 Git 仓库..."
    git init
    git add .
    git commit -m "🐱 初始提交：喵视频守护者 v1.0

- 完整的防误触视频浏览器
- 双重解锁机制（四角手势 + PIN密码）
- 支持任意视频链接（B站、抖音、YouTube等）
- 猫爪检测模式
- PWA支持"
    
    if [ $? -eq 0 ]; then
        echo "✅ 代码已提交"
    else
        echo "❌ 提交失败"
        exit 1
    fi
else
    echo "ℹ️  Git 仓库已存在"
fi

echo ""
echo "============================================"
echo "🚀 准备推送到 GitHub..."
echo "============================================"
echo ""

# 配置远程仓库
REMOTE_URL="https://github.com/josephyang926-sketch/cat-video-guard.git"

# 检查是否已有远程仓库
if git remote get-url origin &> /dev/null; then
    CURRENT_REMOTE=$(git remote get-url origin)
    if [ "$CURRENT_REMOTE" != "$REMOTE_URL" ]; then
        echo "📝 更新远程仓库地址..."
        git remote set-url origin "$REMOTE_URL"
    else
        echo "✅ 远程仓库已配置"
    fi
else
    echo "📝 添加远程仓库..."
    git remote add origin "$REMOTE_URL"
fi

echo ""
echo "📍 远程仓库: $REMOTE_URL"
echo ""
echo "⚠️  重要提示:"
echo "   推送时需要输入 GitHub 账号信息"
echo ""
echo "   Username: josephyang926-sketch"
echo "   Password: ⚠️ 不是GitHub密码！"
echo "            需要使用 Personal Access Token"
echo ""
echo "   如果还没有Token，请先去这里生成:"
echo "   https://github.com/settings/tokens"
echo "   → Generate new token (classic)"
echo "   → 勾选 repo 权限"
echo "   → 复制生成的 token (ghp_开头)"
echo ""
echo "============================================"
echo ""

# 询问是否继续
read -p "是否现在推送？(y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔄 正在推送代码到 GitHub..."
    echo "   （如果失败，请检查上面的账号信息）"
    echo ""
    
    # 尝试推送
    git push -u origin main 2>&1
    
    PUSH_STATUS=$?
    
    echo ""
    
    if [ $PUSH_STATUS -eq 0 ]; then
        echo ""
        echo "============================================"
        echo "🎉 推送成功！"
        echo "============================================"
        echo ""
        echo "接下来请执行以下操作启用 Pages："
        echo ""
        echo "1️⃣  打开浏览器访问:"
        echo "    https://github.com/josephyang926-sketch/cat-video-guard"
        echo ""
        echo "2️⃣  点击 Settings 标签"
        echo ""
        echo "3️⃣  左侧菜单找到 Pages"
        echo ""
        echo "4️⃣  Source 设置为:"
        echo "    • Branch: main"
        echo "    • Folder: / (root)"
        echo ""
        echo "5️⃣  点击 Save 按钮"
        echo ""
        echo "6️⃣  等待几秒后，你会看到:"
        echo ""
        echo "    🌐 https://josephyang926-sketch.github.io/cat-video-guard/"
        echo ""
        echo "7️⃣  在iPad Safari打开上述地址"
        echo ""
        echo "8️⃣  添加到主屏幕即可！"
        echo ""
        echo "============================================"
        
        # 尝试自动打开设置页面
        if command -v open &> /dev/null; then
            echo ""
            read -p "是否自动打开 GitHub 设置页面？(y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                open "https://github.com/josephyang926-sketch/cat-video-guard/settings/pages"
            fi
        fi
        
    else
        echo ""
        echo "❌ 推送失败"
        echo ""
        echo "可能的原因:"
        echo "1. 网络问题 - 请检查网络连接"
        echo "2. 认证失败 - 请确认使用了正确的 Personal Access Token"
        echo "3. 权限不足 - 确认你有该仓库的写入权限"
        echo ""
        echo "解决方案:"
        echo "• 访问 https://github.com/settings/tokens 生成新Token"
        echo "• 或使用 GitHub Desktop 图形界面工具"
        echo "• 或直接在GitHub网页手动上传文件"
        echo ""
    fi
    
else
    echo ""
    echo "❌ 已取消推送"
    echo "你可以稍后手动运行: git push -u origin main"
fi

echo ""
echo "感谢使用喵视频守护者！🐱"
echo "============================================"
