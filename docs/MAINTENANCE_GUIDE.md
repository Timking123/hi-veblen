# 项目维护指南

> 本文档提供项目的日常维护、更新和故障排查指南。

## 目录

- [一、日常维护](#一日常维护)
- [二、依赖管理](#二依赖管理)
- [三、构建与部署](#三构建与部署)
- [四、监控与日志](#四监控与日志)
- [五、故障排查](#五故障排查)
- [六、备份与恢复](#六备份与恢复)
- [七、安全维护](#七安全维护)

---

## 一、日常维护

### 1.1 维护检查清单

#### 每日检查
- [ ] 网站可正常访问
- [ ] 所有页面加载正常
- [ ] 控制台无错误日志

#### 每周检查
- [ ] 检查依赖安全漏洞：`npm audit`
- [ ] 检查构建是否正常：`npm run build`
- [ ] 检查测试是否通过：`npm run test`

#### 每月检查
- [ ] 更新依赖版本：`npm update`
- [ ] 检查 SSL 证书有效期
- [ ] 检查域名续费状态
- [ ] 备份重要数据

### 1.2 内容更新流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 修改内容文件
# - 个人信息: src/data/profile.ts
# - 简历文件: public/resume.pdf
# - 头像图片: public/images/avatar.jpg

# 3. 本地测试
npm run dev
# 访问 http://localhost:5173 检查

# 4. 构建测试
npm run build
npm run preview

# 5. 提交更改
git add .
git commit -m "docs: 更新个人信息"
git push origin main

# 6. 部署（根据部署方式）
# Vercel/Netlify: 自动部署
# OSS: 手动上传 dist 目录
```

---

## 二、依赖管理

### 2.1 检查依赖更新

```bash
# 查看过时的依赖
npm outdated

# 输出示例:
# Package      Current  Wanted  Latest
# vue          3.4.0    3.4.5   3.4.5
# typescript   5.3.0    5.3.3   5.4.0
```

### 2.2 更新依赖

```bash
# 更新所有依赖到兼容版本
npm update

# 更新特定依赖
npm update vue

# 更新到最新版本（可能有破坏性变更）
npm install vue@latest

# 更新开发依赖
npm update --save-dev
```

### 2.3 安全审计

```bash
# 检查安全漏洞
npm audit

# 自动修复安全问题
npm audit fix

# 强制修复（可能有破坏性变更）
npm audit fix --force

# 生成详细报告
npm audit --json > audit-report.json
```

### 2.4 依赖锁定

```bash
# 使用 package-lock.json 确保一致性
npm ci  # 在 CI/CD 中使用，比 npm install 更快更可靠

# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

---

## 三、构建与部署

### 3.1 构建命令

```bash
# 开发构建（包含 sourcemap）
npm run build:dev

# 生产构建（优化压缩）
npm run build

# 构建并分析包大小
npm run build:analyze
```

### 3.2 构建产物检查

```bash
# 检查构建产物大小
# Windows PowerShell
Get-ChildItem -Path dist -Recurse | Measure-Object -Property Length -Sum

# 检查关键文件
# dist/index.html      - 入口文件
# dist/assets/         - 静态资源
# dist/assets/js/      - JavaScript 文件
# dist/assets/css/     - CSS 文件
```

### 3.3 部署方式

#### Vercel/Netlify（自动部署）
```bash
# 推送代码即自动部署
git push origin main

# 查看部署状态
# Vercel: https://vercel.com/dashboard
# Netlify: https://app.netlify.com
```

#### 阿里云 OSS（手动部署）
```bash
# 1. 构建
npm run build

# 2. 上传到 OSS
# 使用 ossutil 工具
ossutil64.exe cp -r dist/ oss://your-bucket/ --update

# 3. 刷新 CDN 缓存（可选）
# 在阿里云 CDN 控制台操作
```

#### Docker 部署
```bash
# 构建镜像
docker build -t portfolio-website .

# 运行容器
docker run -d -p 8080:80 portfolio-website

# 使用 docker-compose
docker-compose up -d
```

### 3.4 回滚操作

```bash
# Git 回滚到上一个版本
git revert HEAD
git push origin main

# 回滚到特定版本
git revert <commit-hash>
git push origin main

# Vercel 回滚
# 在 Vercel 控制台选择之前的部署版本

# OSS 回滚
# 上传之前备份的 dist 目录
```

---

## 四、监控与日志

### 4.1 性能监控

```bash
# 使用 Lighthouse 检查性能
npm install -g lighthouse
lighthouse https://your-site.com --view

# 目标指标
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 90
```

### 4.2 错误监控

```javascript
// 全局错误捕获（已在项目中配置）
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  // 可以发送到错误监控服务
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason)
})
```

### 4.3 游戏性能监控

```typescript
// 游戏内置性能监控
// 开发模式下显示 FPS
// 监控内存使用
// 监控对象池状态

// 获取性能统计
const stats = gameEngine.getPerformanceStats()
console.log('FPS:', stats.fps)
console.log('Memory:', stats.memoryUsage)
console.log('Entities:', stats.entityCount)
```

---

## 五、故障排查

### 5.1 常见问题及解决方案

#### 问题 1: 构建失败

**症状**: `npm run build` 报错

**排查步骤**:
```bash
# 1. 检查 TypeScript 错误
npm run type-check

# 2. 检查 ESLint 错误
npm run lint

# 3. 清理缓存重试
rm -rf node_modules dist
npm install
npm run build
```

#### 问题 2: 页面刷新 404

**症状**: 直接访问子路由返回 404

**解决方案**:
```nginx
# Nginx 配置
location / {
  try_files $uri $uri/ /index.html;
}
```

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### 问题 3: 图片不显示

**排查步骤**:
```bash
# 1. 检查文件是否存在
ls public/images/

# 2. 检查文件路径是否正确
# 正确: /images/avatar.jpg
# 错误: ./images/avatar.jpg

# 3. 检查文件权限
# OSS: 确保文件为公共读
```

#### 问题 4: 样式错乱

**排查步骤**:
```bash
# 1. 清理浏览器缓存
# Ctrl + Shift + R (强制刷新)

# 2. 检查 CSS 是否正确加载
# 打开开发者工具 -> Network -> CSS

# 3. 检查 TailwindCSS 配置
# tailwind.config.js content 配置是否正确
```

#### 问题 5: 游戏无法启动

**排查步骤**:
```bash
# 1. 检查控制台错误
# 打开开发者工具 -> Console

# 2. 检查 Canvas 支持
# 确保浏览器支持 Canvas 2D

# 3. 检查音频权限
# 某些浏览器需要用户交互才能播放音频
```

### 5.2 日志分析

```javascript
// 开发环境日志级别
// DEBUG: 详细调试信息
// INFO: 一般信息
// WARN: 警告信息
// ERROR: 错误信息

// 生产环境移除 console.log
// 在 vite.config.ts 中配置
build: {
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
  },
}
```

---

## 六、备份与恢复

### 6.1 备份策略

#### 代码备份
```bash
# Git 仓库即为代码备份
# 确保推送到远程仓库
git push origin main

# 创建版本标签
git tag -a v2.0.0 -m "Version 2.0.0"
git push origin v2.0.0
```

#### 构建产物备份
```bash
# 备份 dist 目录
# Windows
Compress-Archive -Path dist -DestinationPath backup-$(Get-Date -Format "yyyyMMdd").zip

# 保留最近 5 个备份
```

#### 配置备份
```bash
# 备份重要配置文件
# - .env.production
# - vercel.json
# - netlify.toml
# - nginx.conf
```

### 6.2 恢复流程

```bash
# 1. 从 Git 恢复代码
git clone https://github.com/your-repo.git
cd your-repo

# 2. 安装依赖
npm install

# 3. 恢复环境变量
cp .env.example .env.production
# 编辑 .env.production 填入正确的值

# 4. 构建
npm run build

# 5. 部署
# 根据部署方式操作
```

---

## 七、安全维护

### 7.1 定期安全检查

```bash
# 每周运行安全审计
npm audit

# 检查依赖许可证
npx license-checker --summary

# 检查敏感信息泄露
# 确保 .gitignore 包含:
# .env.local
# .env.*.local
# *.pem
# *.key
```

### 7.2 SSL 证书维护

```bash
# 检查证书有效期
# 阿里云: 在 SSL 证书控制台查看
# Let's Encrypt: 自动续期

# 手动续期 Let's Encrypt
certbot renew

# 测试续期
certbot renew --dry-run
```

### 7.3 安全更新

```bash
# 紧急安全更新流程
# 1. 评估影响
npm audit

# 2. 更新受影响的依赖
npm audit fix

# 3. 测试
npm run test
npm run build

# 4. 部署
git add .
git commit -m "security: 修复安全漏洞"
git push origin main
```

---

## 附录

### A. 维护联系人

| 角色 | 联系方式 |
|-----|---------|
| 项目负责人 | 1243222867@QQ.com |
| 技术支持 | +86 14775378984 |

### B. 相关文档

| 文档 | 说明 |
|-----|------|
| `docs/DEVELOPMENT_STANDARDS.md` | 开发标准规范 |
| `docs/DEPLOYMENT_GUIDE.md` | 部署指南 |
| `docs/GAME_DOCUMENTATION.md` | 游戏文档 |

### C. 有用的链接

- [阿里云控制台](https://console.aliyun.com)
- [Vercel 控制台](https://vercel.com/dashboard)
- [Netlify 控制台](https://app.netlify.com)
- [GitHub 仓库](https://github.com)

---

**文档版本**: 1.0.0  
**最后更新**: 2026-01-30  
**维护者**: 项目开发团队
