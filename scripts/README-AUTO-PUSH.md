# 自动上传脚本使用说明

## 概述

`auto-push` 脚本用于自动提交并推送代码到 GitHub，适用于阶段性更新或需要快速上传代码的场景。

## 文件说明

- `auto-push.ps1` - Windows PowerShell 版本（推荐在 Windows 上使用）
- `auto-push.sh` - Linux/Mac Bash 版本（用于服务器）

## 使用方法

### Windows (PowerShell)

```powershell
# 方法 1：使用默认提交信息（包含时间戳）
.\scripts\auto-push.ps1

# 方法 2：使用自定义提交信息
.\scripts\auto-push.ps1 "修复数据库初始化问题"

# 方法 3：如果遇到执行策略限制，先运行：
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\auto-push.ps1
```

### Linux/Mac/服务器 (Bash)

```bash
# 赋予执行权限（首次使用）
chmod +x scripts/auto-push.sh

# 方法 1：使用默认提交信息
bash scripts/auto-push.sh

# 方法 2：使用自定义提交信息
bash scripts/auto-push.sh "修复数据库初始化问题"
```

## 脚本功能

1. **检查工作区状态** - 检测是否有未提交的更改
2. **显示更改文件** - 列出所有修改的文件
3. **添加到暂存区** - 自动执行 `git add .`
4. **生成提交信息** - 使用自定义信息或默认时间戳
5. **提交更改** - 执行 `git commit`
6. **推送到 GitHub** - 执行 `git push origin main`

## 提交信息格式

### 默认格式
```
阶段性更新 - 2026-03-16 12:30:45
```

### 自定义格式
你可以传入任何自定义信息：
```powershell
.\scripts\auto-push.ps1 "添加部署诊断脚本"
.\scripts\auto-push.ps1 "修复后端 API 错误"
.\scripts\auto-push.ps1 "更新 Nginx 配置"
```

## 常见问题

### Q1: 提示 "没有需要提交的更改"
**原因**：工作区没有修改的文件  
**解决**：确认你已经修改了文件并保存

### Q2: PowerShell 提示无法执行脚本
**原因**：执行策略限制  
**解决**：运行以下命令临时允许执行
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Q3: 推送失败，提示认证错误
**原因**：Git token 过期或配置错误  
**解决**：重新配置 Git remote URL
```bash
git remote set-url origin https://YOUR_TOKEN@github.com/Timking123/hi-veblen.git
```

### Q4: 推送失败，提示有冲突
**原因**：远程仓库有新的提交  
**解决**：先拉取远程更改
```bash
git pull origin main --rebase
.\scripts\auto-push.ps1
```

## 安全提示

⚠️ **重要**：此脚本会自动推送所有更改，使用前请确认：

1. 没有包含敏感信息（密码、token、密钥等）
2. `.gitignore` 已正确配置
3. 不要提交 `.env` 文件
4. 不要提交 `node_modules/` 目录

## 推荐工作流

### 开发阶段
```powershell
# 1. 修改代码
# 2. 测试功能
# 3. 快速上传
.\scripts\auto-push.ps1 "实现用户登录功能"
```

### 阶段性更新
```powershell
# 完成一个功能模块后
.\scripts\auto-push.ps1 "完成数据库初始化模块"
```

### 紧急修复
```powershell
# 修复 bug 后立即上传
.\scripts\auto-push.ps1 "修复：后端 API 返回 500 错误"
```

## 与部署流程集成

在服务器上拉取最新代码：
```bash
cd /var/www/portfolio
git pull origin main
bash scripts/fix-deployment.sh
```

## 查看提交历史

```bash
# 查看最近 5 次提交
git log --oneline -5

# 查看详细提交信息
git log -3

# 查看某个文件的修改历史
git log --follow scripts/auto-push.ps1
```

## 高级用法

### 仅提交特定文件
如果你只想提交某些文件，不要使用此脚本，手动执行：
```bash
git add scripts/diagnose.sh scripts/fix-deployment.sh
git commit -m "添加诊断和修复脚本"
git push origin main
```

### 撤销最后一次提交（未推送）
```bash
git reset --soft HEAD~1
```

### 撤销最后一次提交（已推送）
```bash
git revert HEAD
git push origin main
```

## 相关脚本

- `diagnose.sh` - 诊断部署问题
- `fix-deployment.sh` - 修复部署问题
- `deploy.sh` - 一键部署脚本

## 技术支持

如有问题，请检查：
1. Git 是否正确安装：`git --version`
2. 是否在项目根目录：`pwd` 或 `Get-Location`
3. 远程仓库配置：`git remote -v`
4. 当前分支：`git branch`
