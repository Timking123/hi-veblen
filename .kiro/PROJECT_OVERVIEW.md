# Vue3 个人作品集网站 - 项目说明文档

> 基于 Vue 3 全家桶构建的现代化个人求职网站，包含隐藏的像素艺术风格彩蛋游戏和完整的后台管理系统。

## 📋 目录

- [项目概述](#项目概述)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [项目架构](#项目架构)
- [功能模块](#功能模块)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [部署说明](#部署说明)
- [服务器配置](#服务器配置)

---

## 项目概述

### 基本信息

| 项目属性 | 说明 |
|---------|------|
| 项目名称 | Vue3 个人作品集网站 (Vue3 Portfolio Website) |
| 项目类型 | 单页应用 (SPA) + 后台管理系统 |
| 主要功能 | 个人简历展示、技能展示、彩蛋游戏、后台管理 |
| 目标用户 | 招聘方、HR、技术面试官 |
| 开发语言 | TypeScript |
| 开发框架 | Vue 3 + Express.js |

### 项目定位

这是一个功能完整的个人作品集网站，不仅展示个人信息和项目经验，还包含：
- 🎮 隐藏的像素艺术风格飞行射击游戏
- 📊 完整的后台管理系统
- 📈 访问统计和数据分析
- 💬 留言管理系统
- 📁 文件管理系统

---

## 核心特性

### 前端网站特性

#### 🎨 现代化设计
- 深色科技风主题，毛玻璃效果
- 响应式布局，完美适配桌面和移动设备
- 流畅的页面过渡动画
- 粒子背景特效

#### ⚡ 高性能优化
- 路由懒加载
- 图片懒加载
- 代码分割
- 资源压缩和缓存
- 首屏加载优化

#### 🎮 彩蛋游戏系统
- 像素艺术风格飞行射击游戏
- 7 首背景音乐 + 16 种音效
- 三个关卡（家里 → 学校 → 公司）
- 完整的武器系统和敌人系统
- 爆炸动画和屏幕震动效果
- 排行榜和成就系统

#### 🔍 SEO 优化
- 完整的 Meta 标签配置
- Open Graph 标签支持
- 结构化数据 (Schema.org)
- Sitemap 自动生成
- robots.txt 配置

#### ♿ 无障碍支持
- 符合 WCAG 标准
- 键盘导航支持
- 屏幕阅读器友好
- 语义化 HTML

### 后台管理系统特性

#### 📊 数据看板
- 实时访问统计（PV/UV）
- 留言和简历下载统计
- 游戏数据统计
- 访问趋势图表（ECharts）
- 访客来源分析

#### 📝 内容管理
- 个人信息管理
- 教育经历管理
- 工作经历管理
- 技能管理（技能树可视化）
- 项目管理
- 数据预览和发布

#### 💬 留言管理
- 留言列表展示和筛选
- 按时间、状态、关键词搜索
- 标记已读/未读
- 批量删除
- 导出为 Excel/CSV

#### 📁 文件管理
- 简历管理（PDF 上传、版本控制）
- 图片管理（上传、裁剪、压缩）
- 音频管理（游戏音效、背景音乐）
- 文件浏览器（树形结构）

#### 🎮 游戏管理
- 排行榜管理
- 成就系统管理
- 游戏参数配置
- 配置导出/导入

#### 🔍 SEO 管理
- 页面 Meta 配置
- Open Graph 标签配置
- 结构化数据配置
- Sitemap 生成
- robots.txt 编辑

---

## 技术栈

### 前端技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| Vue | 3.5.24 | 前端框架 |
| TypeScript | 5.9.3 | 类型系统 |
| Vite | 7.2.5 | 构建工具 |
| Pinia | 3.0.4 | 状态管理 |
| Vue Router | 4.6.4 | 路由管理 |
| TailwindCSS | 4.1.18 | CSS 框架 |
| Axios | 1.13.4 | HTTP 客户端 |
| ECharts | 6.0.0 | 数据可视化 |
| Vitest | 4.0.18 | 单元测试 |
| Playwright | 1.58.0 | E2E 测试 |
| fast-check | 4.5.3 | 属性测试 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| Node.js | 20 LTS | 运行时环境 |
| Express.js | 4.18.2 | Web 框架 |
| TypeScript | 5.3.3 | 类型系统 |
| SQLite | - | 数据库 |
| sql.js | 1.10.3 | SQLite 驱动 |
| JWT | 9.0.2 | 身份认证 |
| bcryptjs | 2.4.3 | 密码加密 |
| multer | 1.4.5 | 文件上传 |
| sharp | 0.33.2 | 图片处理 |
| exceljs | 4.4.0 | Excel 导出 |
| helmet | 7.1.0 | 安全头 |
| cors | 2.8.5 | 跨域处理 |
| compression | 1.7.4 | 响应压缩 |
| Jest | 29.7.0 | 单元测试 |
| fast-check | 3.15.1 | 属性测试 |

### 部署技术栈

| 技术 | 用途 |
|-----|------|
| Nginx | Web 服务器 / 反向代理 |
| PM2 | Node.js 进程管理 |
| Let's Encrypt | SSL 证书 |
| Certbot | 证书自动续期 |
| 阿里云 ECS | 服务器托管 |

### 开发工具

| 工具 | 用途 |
|-----|------|
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| vue-tsc | Vue 类型检查 |
| nodemon | 后端热重载 |
| ts-node | TypeScript 执行 |

---

## 项目架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户访问层                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────────┐   │
│  │   前端网站           │         │   后台管理系统           │   │
│  │   (Vue 3 SPA)       │         │   (Vue 3 + Element Plus)│   │
│  │                     │         │                         │   │
│  │  - 首页             │         │  - 数据看板              │   │
│  │  - 关于我           │         │  - 内容管理              │   │
│  │  - 技能展示         │         │  - 留言管理              │   │
│  │  - 项目展示         │         │  - 文件管理              │   │
│  │  - 联系方式         │         │  - 游戏管理              │   │
│  │  - 彩蛋游戏         │         │  - SEO 管理              │   │
│  └─────────────────────┘         └─────────────────────────┘   │
│           │                                   │                 │
│           └───────────────┬───────────────────┘                 │
│                           ▼                                     │
├─────────────────────────────────────────────────────────────────┤
│                      Nginx (反向代理)                            │
│                   端口: 80/443 (SSL)                            │
├─────────────────────────────────────────────────────────────────┤
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              后端 API 服务 (Express.js)                  │   │
│  │                    端口: 3001                            │   │
│  │                                                         │   │
│  │  - 认证服务 (JWT)                                        │   │
│  │  - 数据统计服务                                          │   │
│  │  - 内容管理服务                                          │   │
│  │  - 留言管理服务                                          │   │
│  │  - 文件管理服务                                          │   │
│  │  - 游戏数据服务                                          │   │
│  │  - SEO 配置服务                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    数据存储层                            │   │
│  │                                                         │   │
│  │  - SQLite 数据库 (admin.db)                             │   │
│  │  - 文件存储 (/var/www/files)                            │   │
│  │  - 日志存储 (/var/www/admin-backend/logs)              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 前端架构

```
前端应用 (Vue 3)
├── 路由层 (Vue Router)
│   ├── 页面路由
│   ├── 路由守卫
│   └── 懒加载配置
│
├── 状态管理层 (Pinia)
│   ├── 应用状态 (app)
│   ├── 彩蛋状态 (easterEgg)
│   └── 认证状态 (auth - 后台)
│
├── 组件层
│   ├── 布局组件 (layout)
│   ├── 通用组件 (common)
│   ├── 特效组件 (effects)
│   └── 游戏组件 (game)
│
├── 业务逻辑层
│   ├── 组合式函数 (composables)
│   ├── 工具函数 (utils)
│   └── 数据配置 (data)
│
└── 游戏引擎层
    ├── 核心引擎 (GameEngine)
    ├── 实体系统 (entities)
    ├── 武器系统 (weapons)
    ├── 音频系统 (AudioSystem)
    ├── 效果系统 (EffectSystem)
    └── 渲染系统 (PixelArtRenderer)
```

### 后端架构

```
后端服务 (Express.js)
├── 路由层 (routes)
│   ├── 认证路由 (/api/auth)
│   ├── 数据看板路由 (/api/dashboard)
│   ├── 内容管理路由 (/api/content)
│   ├── 留言管理路由 (/api/messages)
│   ├── 文件管理路由 (/api/files)
│   ├── 游戏管理路由 (/api/game)
│   └── SEO 管理路由 (/api/seo)
│
├── 控制器层 (controllers)
│   ├── 请求参数验证
│   ├── 业务逻辑调用
│   └── 响应格式化
│
├── 服务层 (services)
│   ├── 认证服务 (auth)
│   ├── 统计服务 (statistics)
│   ├── 内容服务 (content)
│   ├── 留言服务 (message)
│   ├── 文件服务 (file)
│   ├── 游戏服务 (game)
│   └── SEO 服务 (seo)
│
├── 数据访问层 (models)
│   ├── 用户模型 (user)
│   ├── 访问记录模型 (visit)
│   ├── 留言模型 (message)
│   ├── 内容模型 (content)
│   ├── 游戏数据模型 (game)
│   └── SEO 配置模型 (seo)
│
├── 中间件层 (middleware)
│   ├── 认证中间件 (auth)
│   ├── 参数验证中间件 (validator)
│   ├── 错误处理中间件 (errorHandler)
│   └── 日志中间件 (logger)
│
└── 工具层 (utils)
    ├── 加密工具 (crypto)
    ├── 文件工具 (file)
    ├── 验证工具 (validator)
    └── 日志工具 (logger)
```

---

## 功能模块

### 1. 前端网站模块

#### 1.1 首页 (Home)
- 个人头像和基本信息展示
- 动态问候语（根据时间变化）
- 粒子背景特效
- 彩蛋触发入口（5秒内点击头像3次）
- 快速导航链接

#### 1.2 关于我 (About)
- 个人简介
- 教育背景
- 工作经历
- 校园经历
- 时间线展示

#### 1.3 技能展示 (Skills)
- 技能列表（前端、后端、工具等）
- 技能熟练度可视化
- 技能树交互展示
- 项目经验关联

#### 1.4 项目展示 (Projects)
- 项目列表（工作项目、个人项目、开源项目）
- 项目分类筛选
- 项目详情页
- 技术标签
- 项目截图展示
- Demo 链接和源码链接

#### 1.5 联系方式 (Contact)
- 联系表单
- 邮箱、电话、社交媒体
- 简历下载
- 留言提交

#### 1.6 彩蛋游戏 (Easter Egg Game)
- 页面崩塌动画
- CMD 交互窗口
- 像素艺术飞行射击游戏
- 三个关卡系统
- 武器系统（机炮、导弹、核弹）
- 敌人系统（7种敌人类型）
- 掉落物系统
- 音频系统（背景音乐 + 音效）
- 效果系统（爆炸 + 屏幕震动）
- 排行榜系统
- 成就系统
- 庆祝页面

### 2. 后台管理系统模块

#### 2.1 认证模块
- 用户登录
- JWT Token 认证
- 密码加密存储
- 会话管理
- 密码修改

#### 2.2 数据看板模块
- 实时统计数据
  - PV（页面浏览量）
  - UV（独立访客数）
  - 留言数量（总数/未读）
  - 简历下载次数
  - 游戏触发次数
  - 游戏通关次数
- 访问趋势图表
  - 折线图（按天/周/月）
  - 饼图（页面分布）
  - 柱状图（访客来源）
- 最近访问记录

#### 2.3 内容管理模块
- 个人信息管理
  - 基本信息（姓名、职位、联系方式）
  - 头像上传
  - 个人简介
  - 求职意向
- 教育经历管理
  - 学校信息
  - 专业和学位
  - 在校时间
  - 成绩排名
  - 荣誉奖项
  - 主修课程
- 工作经历管理
  - 公司信息
  - 职位和部门
  - 工作时间
  - 工作内容
  - 项目成果
- 技能管理
  - 技能名称和分类
  - 熟练度评分
  - 使用经验
  - 相关项目
- 项目管理
  - 项目基本信息
  - 项目描述
  - 技术栈
  - 项目亮点
  - 项目截图
  - Demo 和源码链接
  - 项目分类

#### 2.4 留言管理模块
- 留言列表展示
- 多条件筛选
  - 按状态（已读/未读）
  - 按时间范围
  - 按关键词搜索
- 留言操作
  - 标记已读/未读
  - 单个删除
  - 批量删除
- 留言导出
  - Excel 格式
  - CSV 格式

#### 2.5 文件管理模块
- 简历管理
  - PDF 上传
  - 版本控制
  - 下载统计
- 图片管理
  - 图片上传
  - 自动压缩
  - 缩略图生成
  - 图片分类（头像/项目/其他）
- 音频管理
  - 音频上传
  - 音频分类（背景音乐/音效）
- 文件浏览器
  - 树形目录结构
  - 文件上传/下载
  - 文件删除/重命名
  - 文件预览

#### 2.6 游戏管理模块
- 排行榜管理
  - 查看排行榜
  - 删除记录
  - 重置排行榜
- 成就系统管理
  - 成就列表
  - 添加/编辑/删除成就
- 游戏配置管理
  - 游戏开关
  - 调试模式
  - 基础参数配置
    - 玩家初始生命值
    - 玩家初始速度
    - 核弹最大进度
    - 敌人生成速率
    - 关卡敌人总数
  - 高级参数配置
    - 场景配置
    - 玩家配置
    - 移动配置
    - 射击配置
    - 效果配置
    - 音频配置
    - 性能配置
    - 敌人配置
    - 关卡配置
  - 配置导出/导入（JSON）
  - 恢复默认配置

#### 2.7 SEO 管理模块
- 页面 Meta 配置
  - 页面标题 (title)
  - 页面描述 (description)
  - 关键词 (keywords)
- Open Graph 配置
  - OG 标题
  - OG 描述
  - OG 图片
- 结构化数据配置
  - Person Schema
  - WebSite Schema
  - BreadcrumbList Schema
- Sitemap 管理
  - 自动生成 sitemap.xml
  - 配置更新频率
  - 配置优先级
- robots.txt 管理
  - 在线编辑
  - 语法验证

### 3. 代码审计工具模块

#### 3.1 代码清理工具
- TODO 注释提取
- 未使用代码检测
- 代码复杂度分析

#### 3.2 注释质量检查
- 注释覆盖率统计
- 注释质量评分
- JSDoc 格式检查

#### 3.3 文档组织工具
- 文档自动分类
- 索引文件生成
- 路径解析优化

#### 3.4 ESLint 迁移工具
- 旧配置迁移到新格式
- 配置验证
- 规则冲突检测

---

## 项目结构

### 根目录结构

```
portfolio/
├── .github/                    # GitHub 配置
│   └── workflows/              # CI/CD 工作流
├── .kiro/                      # Kiro 配置
│   ├── specs/                  # 功能规格文档
│   └── steering/               # 开发指导文档
├── docs/                       # 项目文档
│   ├── DEVELOPMENT_STANDARDS.md    # 开发标准
│   ├── MAINTENANCE_GUIDE.md        # 维护指南
│   ├── DEPLOYMENT_GUIDE.md         # 部署指南
│   ├── GAME_DOCUMENTATION.md       # 游戏文档
│   ├── SERVER_OVERVIEW.md          # 服务器概况
│   └── README.md                   # 文档索引
├── e2e/                        # E2E 测试
├── public/                     # 静态资源
│   ├── audio/                  # 音频资源
│   ├── images/                 # 图片资源
│   └── resume.pdf              # 简历文件
├── scripts/                    # 构建脚本
├── src/                        # 源代码（详见下文）
├── .env.development            # 开发环境变量
├── .env.production             # 生产环境变量
├── .eslintrc.cjs               # ESLint 配置
├── .prettierrc.json            # Prettier 配置
├── index.html                  # 入口 HTML
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript 配置
├── vite.config.ts              # Vite 配置
├── tailwind.config.js          # TailwindCSS 配置
├── playwright.config.ts        # Playwright 配置
└── README.md                   # 项目说明
```

### 源代码目录结构

```
src/
├── admin/                      # 后台管理系统
│   ├── backend/                # 后端服务
│   │   ├── src/
│   │   │   ├── config/         # 配置文件
│   │   │   ├── controllers/    # 控制器
│   │   │   ├── middleware/     # 中间件
│   │   │   ├── models/         # 数据模型
│   │   │   ├── routes/         # 路由
│   │   │   ├── services/       # 业务逻辑
│   │   │   ├── utils/          # 工具函数
│   │   │   ├── database/       # 数据库
│   │   │   ├── __tests__/      # 测试文件
│   │   │   └── app.ts          # 应用入口
│   │   ├── data/               # 数据目录
│   │   ├── logs/               # 日志目录
│   │   ├── package.json
│   │   └── ecosystem.config.js # PM2 配置
│   ├── frontend/               # 前端应用
│   │   ├── src/
│   │   │   ├── api/            # API 接口
│   │   │   ├── components/     # 组件
│   │   │   ├── views/          # 页面
│   │   │   ├── stores/         # 状态管理
│   │   │   ├── router/         # 路由
│   │   │   ├── utils/          # 工具函数
│   │   │   ├── types/          # 类型定义
│   │   │   └── main.ts         # 应用入口
│   │   └── package.json
│   ├── nginx.conf              # Nginx 配置
│   ├── deploy.sh               # 部署脚本
│   └── DEPLOYMENT.md           # 部署文档
│
├── assets/                     # 静态资源
│   ├── icons/                  # 图标
│   └── images/                 # 图片
│
├── audit/                      # 代码审计工具
│   ├── cleaner/                # 代码清理
│   ├── comments/               # 注释检查
│   ├── docs/                   # 文档组织
│   ├── eslint/                 # ESLint 迁移
│   ├── reporter/               # 报告生成
│   └── AuditTool.ts            # 审计工具主类
│
├── components/                 # Vue 组件
│   ├── common/                 # 通用组件
│   ├── effects/                # 特效组件
│   ├── game/                   # 游戏组件
│   └── layout/                 # 布局组件
│
├── composables/                # 组合式函数
│   ├── useScroll.ts            # 滚动处理
│   ├── useTheme.ts             # 主题切换
│   ├── useSEO.ts               # SEO 优化
│   └── useEasterEggTrigger.ts  # 彩蛋触发
│
├── data/                       # 静态数据
│   └── profile.ts              # 个人信息
│
├── game/                       # 游戏引擎
│   ├── entities/               # 游戏实体
│   │   ├── PlayerAircraft.ts   # 玩家飞机
│   │   ├── Enemy.ts            # 敌人
│   │   ├── Bullet.ts           # 子弹
│   │   ├── Missile.ts          # 导弹
│   │   └── Pickup.ts           # 掉落物
│   ├── weapons/                # 武器系统
│   │   ├── MachineGun.ts       # 机炮
│   │   ├── MissileLauncher.ts  # 导弹发射器
│   │   └── NuclearBomb.ts      # 核弹
│   ├── stages/                 # 关卡系统
│   ├── ui/                     # 游戏 UI
│   ├── utils/                  # 游戏工具
│   ├── GameEngine.ts           # 游戏引擎
│   ├── AudioSystem.ts          # 音频系统
│   ├── EffectSystem.ts         # 效果系统
│   ├── PixelArtRenderer.ts     # 像素艺术渲染
│   └── constants.ts            # 游戏常量
│
├── router/                     # 路由配置
│   └── index.ts
│
├── stores/                     # Pinia 状态管理
│   ├── app.ts                  # 应用状态
│   └── easterEgg.ts            # 彩蛋状态
│
├── styles/                     # 全局样式
│   ├── variables.css           # CSS 变量
│   └── animations.css          # 动画样式
│
├── types/                      # TypeScript 类型
│   └── index.ts
│
├── utils/                      # 工具函数
│   ├── helpers.ts              # 辅助函数
│   ├── analytics.ts            # 统计分析
│   └── structuredData.ts       # 结构化数据
│
├── views/                      # 页面组件
│   ├── Home.vue                # 首页
│   ├── About.vue               # 关于我
│   ├── Skills.vue              # 技能展示
│   ├── Projects.vue            # 项目展示
│   └── Contact.vue             # 联系方式
│
├── App.vue                     # 根组件
├── main.ts                     # 应用入口
└── style.css                   # 全局样式
```

---

## 开发指南

### 环境要求

| 软件 | 最低版本 | 推荐版本 |
|-----|---------|---------|
| Node.js | 18.0.0 | 20.x LTS |
| npm | 9.0.0 | 10.x |
| Git | 2.0.0 | 最新版本 |

### 快速开始

#### 1. 克隆项目

```bash
git clone <repository-url>
cd portfolio
```

#### 2. 安装前端依赖

```bash
npm install
```

#### 3. 启动前端开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

#### 4. 安装后端依赖（可选）

```bash
cd src/admin/backend
npm install
```

#### 5. 配置后端环境变量

```bash
cd src/admin/backend
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

#### 6. 初始化数据库

```bash
npm run db:init
```

默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`

#### 7. 启动后端开发服务器

```bash
npm run dev
```

后端服务运行在 http://127.0.0.1:3001

### 可用命令

#### 前端命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run build:dev        # 构建开发版本
npm run build:prod       # 构建生产版本
npm run preview          # 预览生产构建

# 代码质量
npm run lint             # 代码检查
npm run format           # 代码格式化
npm run type-check       # 类型检查

# 测试
npm run test             # 运行单元测试
npm run test:watch       # 监听模式测试
npm run test:ui          # 测试 UI 界面
npm run test:e2e         # 运行 E2E 测试
npm run test:e2e:ui      # E2E 测试 UI

# 工具
npm run audio:placeholder # 生成占位音频
npm run pwa:icons        # 生成 PWA 图标

# 代码审计
npm run audit            # 运行代码审计
npm run audit:ci         # CI 模式审计
npm run audit:fix        # 自动修复问题
npm run migrate-eslint   # 迁移 ESLint 配置
npm run organize-docs    # 组织文档结构
```

#### 后端命令

```bash
# 开发
npm run dev              # 启动开发服务器（热重载）
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# PM2 部署
npm run start:prod       # 使用 PM2 启动
npm run stop             # 停止服务
npm run restart          # 重启服务
npm run reload           # 重载服务
npm run logs             # 查看日志
npm run monit            # 监控服务

# 代码质量
npm run lint             # 代码检查
npm run lint:fix         # 自动修复

# 测试
npm run test             # 运行测试
npm run test:watch       # 监听模式测试
npm run test:coverage    # 生成覆盖率报告

# 数据库
npm run db:init          # 初始化数据库

# 工具脚本
npm run check:consistency # 检查数据一致性
npm run sync:files       # 同步文件
npm run fix:encoding     # 修复文件编码
```

### 开发规范

#### 代码风格

- 使用 TypeScript 编写所有代码
- 遵循 ESLint 和 Prettier 配置
- 使用 2 空格缩进
- 使用单引号
- 不使用分号（除非必要）

#### 命名规范

| 类型 | 规则 | 示例 |
|-----|------|------|
| 文件名（组件） | PascalCase | `UserProfile.vue` |
| 文件名（工具） | camelCase | `helpers.ts` |
| 文件名（类） | PascalCase | `GameEngine.ts` |
| 变量名 | camelCase | `userName` |
| 常量名 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 函数名 | camelCase | `getUserInfo()` |
| 类名 | PascalCase | `AudioSystem` |
| 接口名 | PascalCase | `User` 或 `IUser` |
| 类型别名 | PascalCase | `UserId` |

#### Git 提交规范

使用 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型：**

| 类型 | 说明 |
|-----|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| style | 代码格式（不影响功能） |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具相关 |

**示例：**

```bash
git commit -m "feat(game): 添加音频系统"
git commit -m "fix(ui): 修复导航栏闪烁问题"
git commit -m "docs: 更新部署文档"
```

#### 测试规范

- 单元测试覆盖率目标：70%+
- 关键业务逻辑必须有测试
- 使用属性测试验证通用属性
- E2E 测试覆盖主要用户流程

### 项目配置

#### 环境变量

**前端环境变量（.env.development / .env.production）：**

```env
# API 地址
VITE_API_BASE_URL=http://127.0.0.1:3001/api

# 应用配置
VITE_APP_TITLE=个人作品集
VITE_APP_DESCRIPTION=Vue3 个人作品集网站
```

**后端环境变量（src/admin/backend/.env）：**

```env
# 环境
NODE_ENV=development

# 服务器配置
PORT=3001
HOST=127.0.0.1

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# 数据库配置
DB_PATH=./data/admin.db

# 文件上传配置
UPLOAD_DIR=../../../public/files
MAX_FILE_SIZE=10485760

# 日志配置
LOG_DIR=./logs
LOG_LEVEL=debug
```

---

## 部署说明

### 部署架构

```
阿里云 ECS 服务器
├── Nginx (端口 80/443)
│   ├── 前端静态文件 (/var/www/portfolio)
│   ├── 后台前端 (/var/www/admin)
│   └── 反向代理到后端 API
│
├── 后端服务 (PM2 管理)
│   └── Express.js (端口 3001)
│
└── 数据存储
    ├── SQLite 数据库
    └── 文件存储
```

### 快速部署

#### 使用一键部署脚本

```bash
# 进入后台目录
cd src/admin

# 赋予执行权限
chmod +x deploy.sh setup-ssl.sh

# 执行部署
sudo ./deploy.sh --domain admin.yourdomain.com

# 申请 SSL 证书
sudo ./setup-ssl.sh --domain admin.yourdomain.com --email your@email.com
```

### 手动部署步骤

详细的部署步骤请参考：
- [后台部署指南](src/admin/DEPLOYMENT.md)
- [部署指南](docs/DEPLOYMENT_GUIDE.md)

#### 1. 准备服务器环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Nginx
sudo apt install nginx -y

# 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# 安装 PM2
sudo npm install -g pm2

# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y
```

#### 2. 构建项目

```bash
# 构建前端
npm install
npm run build

# 构建后端
cd src/admin/backend
npm install
npm run build
```

#### 3. 部署前端

```bash
# 创建部署目录
sudo mkdir -p /var/www/portfolio

# 复制构建产物
sudo cp -r dist/* /var/www/portfolio/

# 设置权限
sudo chown -R www-data:www-data /var/www/portfolio
```

#### 4. 部署后端

```bash
# 创建部署目录
sudo mkdir -p /var/www/admin-backend

# 复制文件
sudo cp -r backend/dist/ /var/www/admin-backend/
sudo cp -r backend/node_modules/ /var/www/admin-backend/
sudo cp backend/package.json /var/www/admin-backend/
sudo cp backend/ecosystem.config.js /var/www/admin-backend/

# 配置环境变量
sudo nano /var/www/admin-backend/.env

# 初始化数据库
cd /var/www/admin-backend
node dist/database/init.js

# 启动服务
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. 配置 Nginx

```bash
# 复制配置文件
sudo cp src/admin/nginx.conf /etc/nginx/sites-available/admin

# 创建软链接
sudo ln -s /etc/nginx/sites-available/admin /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 6. 申请 SSL 证书

```bash
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com \
  --email your@email.com \
  --agree-tos
```

### 维护操作

#### 更新前端

```bash
# 构建新版本
npm run build

# 备份旧版本
sudo mv /var/www/portfolio /var/www/portfolio.backup.$(date +%Y%m%d)

# 部署新版本
sudo cp -r dist/* /var/www/portfolio/
```

#### 更新后端

```bash
# 构建新版本
cd src/admin/backend
npm run build

# 部署新版本
sudo cp -r dist/* /var/www/admin-backend/dist/

# 重启服务
pm2 restart admin-api
```

#### 查看日志

```bash
# PM2 日志
pm2 logs admin-api

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### 数据库备份

```bash
# 手动备份
sudo cp /var/www/admin-backend/data/admin.db \
  /var/backups/admin.db.$(date +%Y%m%d)

# 设置定时备份（每天凌晨 2 点）
sudo crontab -e
# 添加：0 2 * * * cp /var/www/admin-backend/data/admin.db /var/backups/admin.db.$(date +\%Y\%m\%d)
```

---

## 服务器配置

### 阿里云 ECS 服务器信息

| 配置项 | 值 |
|--------|-----|
| 实例规格 | ecs.e-c1m1.large |
| CPU | 2 核 vCPU |
| 内存 | 2 GB |
| 系统盘 | ESSD Entry 云盘 40 GB |
| 带宽 | 3 Mbps |
| 操作系统 | Ubuntu 24.04 64位 |
| 可用区 | 华南1（深圳）F |
| 公网 IP | 120.25.234.223 |
| 到期时间 | 2028年1月29日 |

### 性能优化建议

针对 2GB 内存服务器的优化：

#### 1. Node.js 内存限制

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'admin-api',
    script: './dist/app.js',
    node_args: '--max-old-space-size=512',
    max_memory_restart: '500M'
  }]
}
```

#### 2. Nginx 优化

```nginx
# 启用 Gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTTP/2 支持
listen 443 ssl http2;
```

#### 3. SQLite 优化

```typescript
// 使用 WAL 模式
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA synchronous = NORMAL;')
db.exec('PRAGMA cache_size = -64000;')  // 64MB 缓存
```

#### 4. 资源监控

```bash
# 查看内存使用
free -h

# 查看 PM2 进程
pm2 monit

# 查看磁盘使用
df -h
```

### 安全配置

#### 1. 防火墙配置

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### 2. SSH 安全

```bash
# 禁用密码登录
sudo nano /etc/ssh/sshd_config
# 设置：PasswordAuthentication no

# 重启 SSH 服务
sudo systemctl restart sshd
```

#### 3. 定期更新

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 更新 Node.js 依赖
npm audit fix
```

---

## 附录

### 相关文档

- [开发标准与规范](docs/DEVELOPMENT_STANDARDS.md)
- [项目维护指南](docs/MAINTENANCE_GUIDE.md)
- [部署指南](docs/DEPLOYMENT_GUIDE.md)
- [彩蛋游戏文档](docs/GAME_DOCUMENTATION.md)
- [服务器概况](docs/SERVER_OVERVIEW.md)
- [后台系统说明](src/admin/README.md)
- [后台部署指南](src/admin/DEPLOYMENT.md)

### 技术资源

- [Vue 3 官方文档](https://vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Express.js 官方文档](https://expressjs.com/)
- [TailwindCSS 官方文档](https://tailwindcss.com/)
- [Element Plus 官方文档](https://element-plus.org/)

### 联系方式

- 邮箱：1243222867@QQ.com
- 电话：+86 14775378984

---

**文档版本**：1.0.0  
**创建日期**：2026-03-05  
**最后更新**：2026-03-05  
**维护者**：项目开发团队
