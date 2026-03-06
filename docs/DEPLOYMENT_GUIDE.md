# 部署指南

> 本文档整合了项目的完整部署流程，包括构建、部署平台选择和配置。

## 目录

- [一、部署前准备](#一部署前准备)
- [二、构建项目](#二构建项目)
- [三、部署平台选择](#三部署平台选择)
- [四、Vercel 部署（推荐）](#四vercel-部署推荐)
- [五、Netlify 部署](#五netlify-部署)
- [六、阿里云 OSS + CDN 部署](#六阿里云-oss--cdn-部署)
- [七、阿里云 ECS 服务器部署](#七阿里云-ecs-服务器部署)
- [八、Docker 部署](#八docker-部署)
- [九、域名与 HTTPS 配置](#九域名与-https-配置)
- [十、部署后检查](#十部署后检查)

---

## 一、部署前准备

### 1.1 环境要求

| 要求 | 版本 |
|-----|------|
| Node.js | >= 18.0.0 |
| npm | >= 9.0.0 |
| Git | 最新版本 |

### 1.2 部署检查清单

```bash
# 运行以下命令确保一切正常
npm run type-check    # TypeScript 类型检查
npm run lint          # 代码检查
npm run test          # 单元测试
npm run build         # 构建测试
npm run preview       # 本地预览
```

### 1.3 内容准备

| 文件 | 路径 | 说明 |
|-----|------|------|
| 头像图片 | `public/images/avatar.jpg` | 个人头像 |
| 简历文件 | `public/resume.pdf` | PDF 格式简历 |
| 个人信息 | `src/data/profile.ts` | 个人资料数据 |

### 1.4 环境变量配置

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local 填入实际值
VITE_APP_TITLE=黄彦杰 - 前端开发工程师
VITE_SITE_URL=https://your-domain.com
VITE_CONTACT_EMAIL=your-email@example.com
```

---

## 二、构建项目

### 2.1 构建命令

```bash
# 安装依赖
npm install

# 生产构建
npm run build

# 构建产物在 dist/ 目录
```

### 2.2 构建产物结构

```
dist/
├── index.html              # 入口文件
├── assets/
│   ├── js/                 # JavaScript 文件
│   ├── css/                # CSS 文件
│   └── images/             # 图片资源
├── images/                 # 静态图片
├── audio/                  # 音频资源
├── resume.pdf              # 简历文件
├── sitemap.xml             # 站点地图
└── robots.txt              # 爬虫配置
```

### 2.3 本地预览

```bash
# 预览生产构建
npm run preview

# 访问 http://localhost:4173
```

---

## 三、部署平台选择

### 3.1 平台对比

| 平台 | 费用 | 难度 | 性能 | 推荐场景 |
|-----|------|------|------|---------|
| Vercel | 免费 | ⭐ | ⭐⭐⭐⭐⭐ | 个人项目首选 |
| Netlify | 免费 | ⭐ | ⭐⭐⭐⭐⭐ | 个人项目 |
| 阿里云 OSS+CDN | ~7元/月 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 国内访问优先 |
| 阿里云 ECS | ~60元/月 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 需要后端服务 |
| Docker | 取决于服务器 | ⭐⭐⭐ | ⭐⭐⭐⭐ | 自托管 |

### 3.2 推荐方案

- **海外访问为主**: Vercel / Netlify（免费、快速）
- **国内访问为主**: 阿里云 OSS + CDN（性价比高）
- **需要完全控制**: 阿里云 ECS / Docker

---

## 四、Vercel 部署（推荐）

### 4.1 快速部署（5分钟）

```bash
# 1. 推送代码到 GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. 访问 vercel.com
# 3. 点击 "Import Project"
# 4. 选择 GitHub 仓库
# 5. 点击 "Deploy"
# ✅ 完成！
```

### 4.2 配置文件

项目已包含 `vercel.json` 配置：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 4.3 环境变量配置

1. 进入 Vercel 项目设置
2. 点击 "Environment Variables"
3. 添加需要的环境变量
4. 重新部署

### 4.4 自定义域名

1. 进入项目设置 → Domains
2. 添加自定义域名
3. 按提示配置 DNS 记录
4. 等待 SSL 证书自动签发

---

## 五、Netlify 部署

### 5.1 快速部署

```bash
# 1. 推送代码到 GitHub
git push origin main

# 2. 访问 netlify.com
# 3. 点击 "Add new site" → "Import an existing project"
# 4. 选择 GitHub 仓库
# 5. 构建设置自动检测
# 6. 点击 "Deploy"
```

### 5.2 配置文件

项目已包含 `netlify.toml` 配置：

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 六、阿里云 OSS + CDN 部署

### 6.1 费用估算

| 项目 | 费用 |
|-----|------|
| OSS 存储 | ~0.1 元/月 |
| OSS 流量 | ~5 元/月（10GB） |
| CDN 流量 | ~2.5 元/月（10GB） |
| **总计** | **~7.5 元/月** |

### 6.2 创建 OSS 存储桶

1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com)
2. 点击「创建 Bucket」
3. 配置：
   - **Bucket 名称**: `your-portfolio`（全局唯一）
   - **地域**: 选择离用户最近的地域
   - **存储类型**: 标准存储
   - **读写权限**: 公共读
4. 点击「确定」

### 6.3 配置静态网站托管

1. 进入 Bucket → 基础设置 → 静态页面
2. 开启「静态网站托管」
3. 配置：
   - **默认首页**: `index.html`
   - **默认 404 页**: `index.html`（重要！SPA 路由需要）
4. 保存

### 6.4 上传文件

**方法一：控制台上传**
1. 进入 Bucket → 文件管理
2. 点击「上传文件」
3. 选择 `dist` 目录下所有文件
4. 上传

**方法二：ossutil 工具**
```bash
# 下载 ossutil
# https://help.aliyun.com/document_detail/120075.html

# 配置
ossutil64.exe config
# 输入 endpoint, accessKeyId, accessKeySecret

# 上传
ossutil64.exe cp -r dist/ oss://your-bucket/ --update
```

### 6.5 配置 CDN

1. 访问 [阿里云 CDN 控制台](https://cdn.console.aliyun.com)
2. 点击「域名管理」→「添加域名」
3. 配置：
   - **加速域名**: `www.your-domain.com`
   - **业务类型**: 图片小文件
   - **源站类型**: OSS 域名
   - **源站域名**: 选择你的 Bucket
4. 获取 CNAME 地址

### 6.6 配置域名解析

1. 进入域名控制台
2. 添加 CNAME 记录：
   - **主机记录**: www
   - **记录类型**: CNAME
   - **记录值**: CDN 分配的 CNAME 地址
3. 等待生效（约 10 分钟）

### 6.7 配置 HTTPS

1. 申请免费 SSL 证书：
   - 访问 [阿里云 SSL 证书控制台](https://yundun.console.aliyun.com/?p=cas)
   - 购买「DV 单域名证书（免费试用）」
   - 申请证书
2. 配置 CDN HTTPS：
   - 进入 CDN 控制台 → 域名管理
   - 选择域名 → HTTPS 配置
   - 开启 HTTPS，选择证书
   - 开启「HTTP → HTTPS」强制跳转

---

## 七、阿里云 ECS 服务器部署

### 7.1 购买 ECS 实例

1. 访问 [ECS 控制台](https://ecs.console.aliyun.com)
2. 创建实例：
   - **规格**: 1核2G（入门）或 2核4G（推荐）
   - **镜像**: Ubuntu 22.04 64位
   - **存储**: 40GB 系统盘
   - **网络**: 分配公网 IP，1-5 Mbps 带宽
   - **安全组**: 开放 22、80、443 端口

### 7.2 安装环境

```bash
# 连接服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 安装 Nginx
apt install nginx -y

# 启动 Nginx
systemctl start nginx
systemctl enable nginx
```

### 7.3 上传网站文件

```bash
# 从本地上传（在本地执行）
scp -r dist/* root@your-server-ip:/var/www/html/
```

### 7.4 配置 Nginx

```bash
# 编辑配置
nano /etc/nginx/sites-available/default
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/html;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

### 7.5 配置 HTTPS（Let's Encrypt）

```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx -y

# 申请证书
certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期测试
certbot renew --dry-run
```

---

## 八、Docker 部署

### 8.1 构建镜像

```bash
# 构建 Docker 镜像
docker build -t portfolio-website .

# 查看镜像
docker images
```

### 8.2 运行容器

```bash
# 运行容器
docker run -d -p 8080:80 --name portfolio portfolio-website

# 查看运行状态
docker ps

# 查看日志
docker logs portfolio
```

### 8.3 使用 Docker Compose

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 重建
docker-compose up -d --build
```

### 8.4 Dockerfile 说明

项目已包含多阶段构建的 Dockerfile：
- 第一阶段：Node.js 环境构建
- 第二阶段：Nginx 环境运行
- 最终镜像体积小，安全性高

---

## 九、域名与 HTTPS 配置

### 9.1 域名购买

| 平台 | 价格参考 |
|-----|---------|
| 阿里云 | .com ~55元/年，.cn ~29元/年 |
| 腾讯云 | .com ~55元/年 |
| Namesilo | .com ~$9/年 |

### 9.2 域名备案（中国内地服务器）

如果使用中国内地服务器，需要进行 ICP 备案：
1. 访问 [阿里云备案系统](https://beian.aliyun.com)
2. 填写备案信息
3. 上传资料
4. 等待审核（7-20 天）

**注意**: 使用海外服务器或 Vercel/Netlify 无需备案

### 9.3 SSL 证书

| 方案 | 费用 | 有效期 |
|-----|------|-------|
| 阿里云免费证书 | 免费 | 1 年 |
| Let's Encrypt | 免费 | 90 天（自动续期） |
| 付费证书 | 几百~几千元 | 1-2 年 |

---

## 十、部署后检查

### 10.1 功能检查

- [ ] 网站可以正常访问
- [ ] 所有页面都能打开
- [ ] 图片正常显示
- [ ] 简历可以下载
- [ ] 联系表单正常
- [ ] 彩蛋游戏可以触发

### 10.2 性能检查

```bash
# 使用 Lighthouse 检查
lighthouse https://your-site.com --view

# 目标指标
# Performance: > 90
# Accessibility: > 90
# Best Practices: > 90
# SEO: > 90
```

### 10.3 SEO 检查

- [ ] 更新 `public/sitemap.xml` 中的域名
- [ ] 更新 `public/robots.txt` 中的域名
- [ ] 提交 sitemap 到 Google Search Console
- [ ] 提交 sitemap 到百度站长平台

### 10.4 安全检查

- [ ] HTTPS 正常工作（绿色锁图标）
- [ ] 安全响应头已配置
- [ ] 无敏感信息泄露

---

## 附录

### A. 常见问题

**Q: 页面刷新 404？**
A: 配置服务器将所有请求重定向到 index.html

**Q: 图片不显示？**
A: 检查文件路径和权限

**Q: HTTPS 不工作？**
A: 检查证书配置和域名解析

### B. 更新部署

```bash
# 1. 修改代码
# 2. 重新构建
npm run build

# 3. 部署
# Vercel/Netlify: git push 自动部署
# OSS: 重新上传 dist 目录
# ECS: scp 上传文件
```

### C. 联系支持

- 邮箱: 1243222867@QQ.com
- 电话: +86 14775378984

---

**文档版本**: 1.0.0  
**最后更新**: 2026-01-30
