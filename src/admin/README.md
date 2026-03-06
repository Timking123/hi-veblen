# 后台管理系统 (Admin System)

个人作品集网站的后台管理系统，包含数据看板、内容管理、留言管理、文件管理、游戏数据管理和 SEO 管理六大核心板块。

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [安装指南](#安装指南)
- [开发指南](#开发指南)
- [API 文档](#api-文档)
- [部署指南](#部署指南)
- [测试](#测试)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 功能特性

### 📊 数据看板 (Dashboard)
- 实时访问统计（PV/UV）
- 留言和简历下载统计
- 游戏数据统计
- 访问趋势图表（折线图、饼图、柱状图）
- 访客来源分析
- 最近访问记录

### 📝 内容管理 (Content Management)
- 个人信息管理（基本信息、头像、简介）
- 教育经历管理（学校、课程、荣誉）
- 工作经历管理（公司、职位、成果）
- 技能管理（技能列表、技能树可视化）
- 项目管理（项目信息、截图、技术标签）
- 校园经历管理
- 数据预览和发布功能

### 💬 留言管理 (Message Management)
- 留言列表展示和筛选
- 按时间范围、状态、关键词搜索
- 标记已读/未读
- 批量删除
- 导出为 Excel/CSV

### 📁 文件管理 (File Management)
- 简历管理（PDF 上传、版本控制、下载统计）
- 图片管理（上传、裁剪、压缩）
- 音频管理（游戏音效、背景音乐）
- 文件浏览器（树形结构、上传/下载/删除/重命名）

### 🎮 游戏管理 (Game Management)
- 排行榜管理（查看、删除、重置）
- 成就系统管理（CRUD 操作）
- 游戏开关和调试模式
- 基础参数配置（生命值、速度、敌人生成等）
- 高级参数配置（玩家、场景、移动、射击、效果、音频、性能、敌人、关卡）
- 配置导出/导入（JSON 格式）
- 恢复默认值功能

### 🔍 SEO 管理 (SEO Management)
- 页面 Meta 配置（title、description、keywords）
- Open Graph 标签配置
- 结构化数据配置（Person、WebSite、BreadcrumbList Schema）
- Sitemap 自动生成和配置
- robots.txt 编辑

## 技术栈

### 后端
- **运行时**：Node.js 20 LTS
- **框架**：Express.js
- **数据库**：SQLite + sql.js
- **认证**：JWT (jsonwebtoken)
- **密码加密**：bcryptjs
- **文件处理**：multer, sharp
- **数据导出**：exceljs
- **安全**：helmet, cors
- **压缩**：compression
- **测试**：Jest, fast-check

### 前端
- **框架**：Vue 3 + TypeScript
- **UI 组件库**：Element Plus
- **图表**：ECharts
- **状态管理**：Pinia
- **路由**：Vue Router
- **HTTP 客户端**：Axios
- **拖拽**：vuedraggable
- **构建工具**：Vite
- **类型检查**：vue-tsc

### 部署
- **Web 服务器**：Nginx
- **进程管理**：PM2
- **SSL 证书**：Let's Encrypt (Certbot)
- **服务器**：阿里云 ECS（2核2GB，Ubuntu 24.04）

## 项目结构

```
admin/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   │   ├── database.ts    # 数据库配置
│   │   │   ├── jwt.ts         # JWT 配置
│   │   │   └── index.ts       # 统一导出
│   │   ├── controllers/       # 控制器层
│   │   │   ├── auth.ts        # 认证控制器
│   │   │   ├── dashboard.ts   # 数据看板控制器
│   │   │   ├── content.ts     # 内容管理控制器
│   │   │   ├── message.ts     # 留言管理控制器
│   │   │   ├── file.ts        # 文件管理控制器
│   │   │   ├── game.ts        # 游戏管理控制器
│   │   │   └── seo.ts         # SEO 管理控制器
│   │   ├── middleware/        # 中间件
│   │   │   ├── auth.ts        # 认证中间件
│   │   │   ├── validator.ts   # 参数验证中间件
│   │   │   └── errorHandler.ts # 错误处理中间件
│   │   ├── models/            # 数据模型
│   │   │   ├── user.ts        # 用户模型
│   │   │   ├── visit.ts       # 访问记录模型
│   │   │   ├── message.ts     # 留言模型
│   │   │   ├── content.ts     # 内容模型
│   │   │   ├── game.ts        # 游戏数据模型
│   │   │   └── seo.ts         # SEO 配置模型
│   │   ├── routes/            # 路由定义
│   │   │   ├── auth.ts        # 认证路由
│   │   │   ├── dashboard.ts   # 数据看板路由
│   │   │   ├── content.ts     # 内容管理路由
│   │   │   ├── message.ts     # 留言管理路由
│   │   │   ├── file.ts        # 文件管理路由
│   │   │   ├── game.ts        # 游戏管理路由
│   │   │   ├── seo.ts         # SEO 管理路由
│   │   │   └── index.ts       # 路由汇总
│   │   ├── services/          # 业务逻辑层
│   │   │   ├── auth.ts        # 认证服务
│   │   │   ├── statistics.ts  # 统计服务
│   │   │   ├── content.ts     # 内容服务
│   │   │   ├── message.ts     # 留言服务
│   │   │   ├── file.ts        # 文件服务
│   │   │   ├── game.ts        # 游戏服务
│   │   │   ├── seo.ts         # SEO 服务
│   │   │   └── export.ts      # 导出服务
│   │   ├── utils/             # 工具函数
│   │   │   ├── crypto.ts      # 加密工具
│   │   │   ├── file.ts        # 文件工具
│   │   │   └── validator.ts   # 验证工具
│   │   ├── database/          # 数据库
│   │   │   ├── init.ts        # 初始化脚本
│   │   │   └── migrations/    # 迁移脚本
│   │   ├── __tests__/         # 测试文件
│   │   └── app.ts             # 应用入口
│   ├── data/                  # 数据目录
│   │   └── admin.db           # SQLite 数据库
│   ├── logs/                  # 日志目录
│   ├── package.json
│   ├── tsconfig.json
│   └── ecosystem.config.js    # PM2 配置
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── api/               # API 接口层
│   │   │   ├── request.ts     # Axios 封装
│   │   │   ├── auth.ts        # 认证接口
│   │   │   ├── dashboard.ts   # 数据看板接口
│   │   │   ├── content.ts     # 内容管理接口
│   │   │   ├── message.ts     # 留言管理接口
│   │   │   ├── file.ts        # 文件管理接口
│   │   │   ├── game.ts        # 游戏管理接口
│   │   │   └── seo.ts         # SEO 管理接口
│   │   ├── components/        # 组件
│   │   │   ├── layout/        # 布局组件
│   │   │   ├── dashboard/     # 数据看板组件
│   │   │   ├── content/       # 内容管理组件
│   │   │   ├── message/       # 留言管理组件
│   │   │   ├── file/          # 文件管理组件
│   │   │   ├── game/          # 游戏管理组件
│   │   │   └── seo/           # SEO 管理组件
│   │   ├── views/             # 页面视图
│   │   │   ├── Login.vue      # 登录页
│   │   │   ├── Dashboard.vue  # 数据看板
│   │   │   ├── Content.vue    # 内容管理
│   │   │   ├── Message.vue    # 留言管理
│   │   │   ├── File.vue       # 文件管理
│   │   │   ├── Game.vue       # 游戏管理
│   │   │   └── SEO.vue        # SEO 管理
│   │   ├── stores/            # Pinia 状态管理
│   │   │   ├── auth.ts        # 认证状态
│   │   │   └── app.ts         # 应用状态
│   │   ├── router/            # 路由配置
│   │   │   └── index.ts
│   │   ├── utils/             # 工具函数
│   │   ├── types/             # TypeScript 类型定义
│   │   ├── __tests__/         # 测试文件
│   │   ├── App.vue            # 根组件
│   │   └── main.ts            # 应用入口
│   ├── public/                # 静态资源
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── nginx.conf                  # Nginx 配置文件
├── deploy.sh                   # 一键部署脚本
├── setup-ssl.sh                # SSL 证书申请脚本
├── DEPLOYMENT.md               # 详细部署文档
├── README.nginx.md             # Nginx 配置说明
└── README.md                   # 项目说明（本文件）
```

## 快速开始

### 前置要求

- Node.js >= 20.0.0
- npm 或 yarn
- Git

### 克隆项目

```bash
git clone <repository-url>
cd portfolio/src/admin
```

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
# 环境
NODE_ENV=development

# 服务器配置
PORT=3001
HOST=127.0.0.1

# JWT 配置
JWT_SECRET=your-secret-key-change-this
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

### 初始化数据库

```bash
cd backend
npm run db:init
```

这将创建数据库表结构并插入默认管理员账户：
- 用户名：`admin`
- 密码：`admin123`（首次登录后请立即修改）

### 启动开发服务器

```bash
# 启动后端（在 backend 目录）
npm run dev

# 启动前端（在 frontend 目录，新开一个终端）
npm run dev
```

访问 http://localhost:5173 即可看到登录页面。

## 安装指南

### 后端安装

1. **进入后端目录**
   ```bash
   cd backend
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   复制示例配置文件：
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env` 文件，根据实际情况修改配置。

4. **初始化数据库**
   ```bash
   npm run db:init
   ```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```
   
   后端服务将在 http://127.0.0.1:3001 启动。

### 前端安装

1. **进入前端目录**
   ```bash
   cd frontend
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置 API 地址**
   
   编辑 `src/api/request.ts`，确保 `baseURL` 指向后端服务：
   ```typescript
   const request = axios.create({
     baseURL: 'http://127.0.0.1:3001/api',
     timeout: 10000
   })
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```
   
   前端应用将在 http://localhost:5173 启动。

5. **访问应用**
   
   打开浏览器访问 http://localhost:5173，使用默认账户登录：
   - 用户名：`admin`
   - 密码：`admin123`

## 开发指南

### 开发环境要求

- Node.js 20 LTS 或更高版本
- npm 或 yarn 包管理器
- 代码编辑器（推荐 VS Code）
- Git 版本控制

### 开发工作流

1. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **开发和测试**
   ```bash
   # 后端开发
   cd backend
   npm run dev        # 启动开发服务器
   npm run test       # 运行测试
   npm run lint       # 代码检查
   
   # 前端开发
   cd frontend
   npm run dev        # 启动开发服务器
   npm run type-check # 类型检查
   npm run lint       # 代码检查
   ```

3. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   git push origin feature/your-feature-name
   ```

### 代码规范

#### 后端代码规范

- 使用 TypeScript 编写所有代码
- 遵循 ESLint 配置规则
- 使用 async/await 处理异步操作
- 所有 API 接口必须有错误处理
- 关键业务逻辑需要编写单元测试

**示例代码：**

```typescript
// 控制器示例
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { status, startDate, endDate, keyword, page = 1, pageSize = 10 } = req.query
    
    const result = await messageService.getMessages({
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
      keyword: keyword as string,
      page: Number(page),
      pageSize: Number(pageSize)
    })
    
    res.json({
      code: 0,
      data: result.data,
      total: result.total
    })
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '获取留言列表失败',
      error: error.message
    })
  }
}
```

#### 前端代码规范

- 使用 Vue 3 Composition API
- 使用 TypeScript 进行类型定义
- 组件命名使用 PascalCase
- 使用 Pinia 管理全局状态
- 使用 Element Plus 组件库

**示例代码：**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMessages } from '@/api/message'
import type { Message } from '@/types/message'

// 响应式数据
const messages = ref<Message[]>([])
const loading = ref(false)

// 获取留言列表
const fetchMessages = async () => {
  loading.value = true
  try {
    const { data } = await getMessages({ page: 1, pageSize: 10 })
    messages.value = data
  } catch (error) {
    console.error('获取留言失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMessages()
})
</script>
```

### 目录结构约定

- `controllers/` - 处理 HTTP 请求和响应
- `services/` - 业务逻辑实现
- `models/` - 数据模型和数据库操作
- `middleware/` - 中间件（认证、验证等）
- `utils/` - 工具函数
- `types/` - TypeScript 类型定义

### 环境变量说明

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| NODE_ENV | 运行环境 | development | 否 |
| PORT | 后端服务端口 | 3001 | 否 |
| HOST | 后端服务主机 | 127.0.0.1 | 否 |
| JWT_SECRET | JWT 密钥 | - | 是 |
| JWT_EXPIRES_IN | JWT 过期时间 | 24h | 否 |
| DB_PATH | 数据库文件路径 | ./data/admin.db | 否 |
| UPLOAD_DIR | 文件上传目录 | ../../../public/files | 否 |
| MAX_FILE_SIZE | 最大文件大小（字节） | 10485760 | 否 |
| LOG_DIR | 日志目录 | ./logs | 否 |
| LOG_LEVEL | 日志级别 | info | 否 |

## API 文档

### 基础信息

- **Base URL**: `http://127.0.0.1:3001/api`（开发环境）
- **认证方式**: JWT Token（Bearer Token）
- **请求格式**: JSON
- **响应格式**: JSON

### 通用响应格式

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

**错误响应：**
```json
{
  "code": 400,
  "message": "错误信息",
  "details": {
    "field": "字段名",
    "reason": "错误原因"
  }
}
```

### 认证模块 `/api/auth`

#### 1. 用户登录

**接口**: `POST /api/auth/login`

**请求参数：**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin"
    }
  }
}
```

#### 2. 获取当前用户

**接口**: `GET /api/auth/profile`

**请求头：**
```
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "username": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 3. 修改密码

**接口**: `PUT /api/auth/password`

**请求参数：**
```json
{
  "oldPassword": "admin123",
  "newPassword": "newPassword123"
}
```

### 数据看板模块 `/api/dashboard`

#### 1. 获取统计数据

**接口**: `GET /api/dashboard/stats`

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "pv": 1234,
    "uv": 567,
    "messages": {
      "total": 89,
      "unread": 12
    },
    "downloads": 45,
    "game": {
      "triggers": 234,
      "completions": 56
    }
  }
}
```

#### 2. 获取访问趋势

**接口**: `GET /api/dashboard/visits/trend`

**查询参数：**
- `period`: 时间周期（day/week/month）

**响应示例：**
```json
{
  "code": 0,
  "data": [
    {
      "date": "2024-01-01",
      "pv": 123,
      "uv": 45
    }
  ]
}
```

#### 3. 获取页面分布

**接口**: `GET /api/dashboard/visits/pages`

**响应示例：**
```json
{
  "code": 0,
  "data": [
    {
      "page": "/",
      "count": 456
    },
    {
      "page": "/about",
      "count": 234
    }
  ]
}
```

### 内容管理模块 `/api/content`

#### 1. 获取个人信息

**接口**: `GET /api/content/profile`

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "name": "张三",
    "title": "全栈工程师",
    "phone": "13800138000",
    "email": "zhangsan@example.com",
    "avatar": "/files/avatar.jpg",
    "summary": "个人简介...",
    "jobIntentions": ["前端开发", "全栈开发"]
  }
}
```

#### 2. 更新个人信息

**接口**: `PUT /api/content/profile`

**请求参数：**
```json
{
  "name": "张三",
  "title": "全栈工程师",
  "phone": "13800138000",
  "email": "zhangsan@example.com",
  "summary": "个人简介...",
  "jobIntentions": ["前端开发", "全栈开发"]
}
```

#### 3. 获取教育经历列表

**接口**: `GET /api/content/education`

**响应示例：**
```json
{
  "code": 0,
  "data": [
    {
      "id": "edu_001",
      "school": "某某大学",
      "college": "计算机学院",
      "major": "软件工程",
      "period": "2016-2020",
      "rank": "专业前10%",
      "honors": ["国家奖学金", "优秀毕业生"],
      "courses": [
        { "name": "数据结构", "score": 95 }
      ]
    }
  ]
}
```

#### 4. 添加教育经历

**接口**: `POST /api/content/education`

**请求参数：**
```json
{
  "school": "某某大学",
  "college": "计算机学院",
  "major": "软件工程",
  "period": "2016-2020",
  "rank": "专业前10%",
  "honors": ["国家奖学金"],
  "courses": [
    { "name": "数据结构", "score": 95 }
  ]
}
```

#### 5. 获取技能列表

**接口**: `GET /api/content/skills`

**响应示例：**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "name": "Vue.js",
      "level": 90,
      "category": "frontend",
      "experience": "3年开发经验",
      "projects": ["项目A", "项目B"]
    }
  ]
}
```

#### 6. 获取项目列表

**接口**: `GET /api/content/projects`

**查询参数：**
- `category`: 项目分类（work/personal/opensource）

**响应示例：**
```json
{
  "code": 0,
  "data": [
    {
      "id": "proj_001",
      "name": "后台管理系统",
      "description": "项目描述...",
      "period": "2023-2024",
      "role": "全栈开发",
      "technologies": ["Vue 3", "Node.js", "TypeScript"],
      "highlights": ["实现了XX功能", "优化了XX性能"],
      "screenshots": ["/files/project1.jpg"],
      "demoUrl": "https://demo.example.com",
      "sourceUrl": "https://github.com/user/repo",
      "category": "work"
    }
  ]
}
```

### 留言管理模块 `/api/messages`

#### 1. 获取留言列表

**接口**: `GET /api/messages`

**查询参数：**
- `status`: 状态（unread/read）
- `startDate`: 开始日期（YYYY-MM-DD）
- `endDate`: 结束日期（YYYY-MM-DD）
- `keyword`: 关键词搜索
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 10）

**响应示例：**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "nickname": "访客",
      "contact": "visitor@example.com",
      "content": "留言内容...",
      "status": "unread",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "total": 100
}
```

#### 2. 标记已读

**接口**: `PUT /api/messages/:id/read`

#### 3. 批量删除

**接口**: `POST /api/messages/batch-delete`

**请求参数：**
```json
{
  "ids": [1, 2, 3]
}
```

#### 4. 导出留言

**接口**: `GET /api/messages/export`

**查询参数：**
- `format`: 导出格式（excel/csv）
- `startDate`: 开始日期
- `endDate`: 结束日期

**响应**: 文件下载流

### 文件管理模块 `/api/files`

#### 1. 获取目录树

**接口**: `GET /api/files/tree`

**查询参数：**
- `path`: 目录路径（可选）

#### 2. 上传文件

**接口**: `POST /api/files/upload`

**请求格式**: `multipart/form-data`

**表单字段：**
- `file`: 文件
- `category`: 分类（可选）

#### 3. 上传简历

**接口**: `POST /api/files/resume/upload`

**请求格式**: `multipart/form-data`

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "version": 1,
    "filename": "resume_v1.pdf",
    "path": "/files/resume/resume_v1.pdf"
  }
}
```

#### 4. 上传图片

**接口**: `POST /api/files/image/upload`

**请求格式**: `multipart/form-data`

**表单字段：**
- `file`: 图片文件
- `category`: 分类（avatar/project/other）

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "path": "/files/images/image.jpg",
    "thumbnail": "/files/images/image_thumb.jpg"
  }
}
```

### 游戏管理模块 `/api/game`

#### 1. 获取排行榜

**接口**: `GET /api/game/leaderboard`

**查询参数：**
- `limit`: 返回数量（默认 10）

**响应示例：**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "playerName": "玩家A",
      "score": 12345,
      "stage": 3,
      "playTime": 1800,
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

#### 2. 获取游戏配置

**接口**: `GET /api/game/config`

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "enabled": true,
    "debugMode": false,
    "basic": {
      "playerInitialHealth": 10,
      "playerInitialSpeed": 5,
      "nukeMaxProgress": 100,
      "enemySpawnRate": 3000,
      "stageTotalEnemies": 50
    },
    "advanced": {
      "scene": { ... },
      "player": { ... },
      "movement": { ... }
    }
  }
}
```

#### 3. 更新游戏配置

**接口**: `PUT /api/game/config`

**请求参数**: 完整的游戏配置对象

#### 4. 恢复默认配置

**接口**: `POST /api/game/config/reset`

### SEO 管理模块 `/api/seo`

#### 1. 获取 Meta 配置

**接口**: `GET /api/seo/meta`

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "pages": [
      {
        "page": "home",
        "title": "首页标题",
        "description": "首页描述",
        "keywords": "关键词1,关键词2",
        "ogTitle": "OG标题",
        "ogDescription": "OG描述",
        "ogImage": "/images/og-image.jpg"
      }
    ]
  }
}
```

#### 2. 更新页面 Meta

**接口**: `PUT /api/seo/meta/:page`

**请求参数：**
```json
{
  "title": "页面标题",
  "description": "页面描述",
  "keywords": "关键词1,关键词2",
  "ogTitle": "OG标题",
  "ogDescription": "OG描述",
  "ogImage": "/images/og-image.jpg"
}
```

#### 3. 生成 Sitemap

**接口**: `POST /api/seo/sitemap/generate`

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "success": true,
    "path": "/public/sitemap.xml"
  }
}
```

#### 4. 获取 robots.txt

**接口**: `GET /api/seo/robots`

**响应示例：**
```json
{
  "code": 0,
  "data": {
    "content": "User-agent: *\nDisallow: /admin\n..."
  }
}
```

### 错误码说明

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 0 | 成功 | - |
| 400 | 请求参数错误 | 检查请求参数 |
| 401 | 未认证 | 重新登录 |
| 403 | 权限不足 | 联系管理员 |
| 404 | 资源不存在 | 检查请求路径 |
| 409 | 资源冲突 | 检查数据唯一性 |
| 413 | 文件过大 | 减小文件大小 |
| 415 | 文件类型不支持 | 使用支持的文件类型 |
| 423 | 账户锁定 | 等待锁定时间结束 |
| 500 | 服务器内部错误 | 联系技术支持 |
| 503 | 服务不可用 | 稍后重试 |

## 部署指南

### 快速部署

本项目提供了一键部署脚本，可以快速完成部署：

```bash
# 赋予执行权限
chmod +x deploy.sh setup-ssl.sh

# 执行部署（使用默认域名）
sudo ./deploy.sh

# 或指定自定义域名
sudo ./deploy.sh --domain admin.example.com

# 申请 SSL 证书
sudo ./setup-ssl.sh --domain admin.example.com --email your@email.com
```

### 详细部署步骤

详细的部署文档请参考：[DEPLOYMENT.md](./DEPLOYMENT.md)

主要步骤包括：

1. **准备服务器环境**
   - 安装 Node.js 20 LTS
   - 安装 Nginx
   - 安装 PM2
   - 安装 Certbot

2. **构建项目**
   ```bash
   # 构建前端
   cd frontend
   npm install
   npm run build
   
   # 构建后端
   cd ../backend
   npm install
   npm run build
   ```

3. **部署前端**
   ```bash
   sudo mkdir -p /var/www/admin
   sudo cp -r frontend/dist/* /var/www/admin/
   sudo chown -R www-data:www-data /var/www/admin
   ```

4. **部署后端**
   ```bash
   sudo mkdir -p /var/www/admin-backend
   sudo cp -r backend/dist/ /var/www/admin-backend/
   sudo cp -r backend/node_modules/ /var/www/admin-backend/
   sudo cp backend/package.json /var/www/admin-backend/
   sudo cp backend/ecosystem.config.js /var/www/admin-backend/
   ```

5. **配置环境变量**
   ```bash
   sudo nano /var/www/admin-backend/.env
   ```

6. **初始化数据库**
   ```bash
   cd /var/www/admin-backend
   node dist/database/init.js
   ```

7. **启动后端服务**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

8. **配置 Nginx**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/admin
   sudo ln -s /etc/nginx/sites-available/admin /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

9. **申请 SSL 证书**
   ```bash
   sudo certbot certonly --webroot \
     -w /var/www/certbot \
     -d admin.example.com \
     --email your@email.com \
     --agree-tos
   ```

### 部署架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx (反向代理)                          │
│                    端口: 80/443 (SSL)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │   前端静态文件        │    │      后端 API 服务               │ │
│  │   /var/www/admin    │    │      端口: 3001                  │ │
│  │                     │    │                                 │ │
│  │  Vue 3 + TS         │───▶│  Express.js + SQLite            │ │
│  │  Element Plus       │    │  JWT 认证                        │ │
│  │  ECharts            │    │  文件处理                        │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                                       │                         │
│                                       ▼                         │
│                          ┌─────────────────────────┐            │
│                          │      数据存储层          │            │
│                          │                         │            │
│                          │  SQLite: admin.db      │            │
│                          │  文件: /var/www/files  │            │
│                          └─────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 服务器要求

- **最低配置**：1核 1GB 内存
- **推荐配置**：2核 2GB 内存
- **操作系统**：Ubuntu 20.04+ / CentOS 7+
- **磁盘空间**：至少 10GB 可用空间
- **网络**：公网 IP 和域名

### 性能优化

针对 2GB 内存服务器的优化措施：

1. **Node.js 内存限制**
   - 设置 `--max-old-space-size=512`
   - PM2 自动重启：`max_memory_restart: '500M'`

2. **SQLite 优化**
   - 使用 WAL 模式
   - 定期执行 VACUUM

3. **Nginx 优化**
   - 启用 Gzip 压缩
   - 配置静态资源缓存
   - 启用 HTTP/2

4. **文件处理优化**
   - 图片自动压缩
   - 使用流式处理大文件

### 维护操作

#### 更新前端

```bash
# 构建新版本
cd frontend
npm run build

# 备份旧版本
sudo mv /var/www/admin /var/www/admin.backup.$(date +%Y%m%d%H%M%S)

# 部署新版本
sudo mkdir -p /var/www/admin
sudo cp -r dist/* /var/www/admin/
sudo chown -R www-data:www-data /var/www/admin
```

#### 更新后端

```bash
# 构建新版本
cd backend
npm run build

# 备份旧版本
sudo cp -r /var/www/admin-backend /var/www/admin-backend.backup.$(date +%Y%m%d%H%M%S)

# 部署新版本
sudo cp -r dist/* /var/www/admin-backend/dist/

# 重启服务
pm2 restart admin-api
```

#### 查看日志

```bash
# PM2 日志
pm2 logs admin-api

# Nginx 访问日志
sudo tail -f /var/log/nginx/admin_access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/admin_error.log

# 应用日志
tail -f /var/www/admin-backend/logs/app.log
```

#### 数据库备份

```bash
# 手动备份
sudo cp /var/www/admin-backend/data/admin.db \
  /var/backups/admin/admin.db.$(date +%Y%m%d%H%M%S)

# 设置定时备份（每天凌晨 2 点）
sudo crontab -e
# 添加：0 2 * * * cp /var/www/admin-backend/data/admin.db /var/backups/admin/admin.db.$(date +\%Y\%m\%d\%H\%M\%S)
```

### 监控和告警

#### 服务监控

```bash
# 查看 PM2 进程状态
pm2 status

# 查看内存使用
pm2 monit

# 查看详细信息
pm2 show admin-api
```

#### 系统监控

```bash
# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看 Nginx 连接数
sudo netstat -an | grep :443 | wc -l
```

### 故障排查

详细的故障排查指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 中的"故障排查"章节。

常见问题：

1. **后端服务无法启动** - 检查端口占用、环境变量、数据库文件权限
2. **前端无法访问** - 检查 Nginx 状态、配置文件、文件权限
3. **API 请求失败** - 检查后端服务状态、Nginx 代理配置、防火墙规则
4. **SSL 证书问题** - 检查证书有效期、域名解析、Nginx 配置

### 安全建议

1. **修改默认密码** - 首次登录后立即修改管理员密码
2. **使用强密码** - 至少 12 位，包含大小写字母、数字、特殊字符
3. **定期更新** - 定期更新系统和依赖包
4. **配置防火墙** - 只开放必要的端口（80、443、SSH）
5. **定期备份** - 定期备份数据库和重要文件
6. **监控日志** - 定期检查访问日志，关注异常登录
7. **限制 SSH** - 禁用密码登录，只允许密钥登录

## 测试

### 运行测试

#### 后端测试

```bash
cd backend

# 运行所有测试
npm test

# 运行测试并监听文件变化
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

#### 前端测试

```bash
cd frontend

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### 测试策略

本项目采用**双重测试方法**：

1. **单元测试** - 验证具体示例、边界情况和错误条件
2. **属性测试** - 验证所有输入的通用属性

### 测试框架

- **后端**：Jest + fast-check（属性测试）
- **前端**：Vitest（计划中）

### 测试覆盖范围

| 模块 | 单元测试 | 属性测试 |
|------|----------|----------|
| 认证服务 | ✅ 登录流程、密码验证 | ✅ JWT 往返、账户锁定 |
| 统计服务 | ✅ 数据聚合、时间范围 | ✅ PV/UV 计算 |
| 内容服务 | ✅ CRUD 操作 | ✅ 数据往返一致性 |
| 留言服务 | ✅ 筛选、导出 | ✅ 序列化往返、筛选正确性 |
| 文件服务 | ✅ 上传、压缩 | ✅ 文件类型验证、版本管理 |
| 游戏服务 | ✅ 配置读写 | ✅ 配置往返、默认值恢复 |
| SEO 服务 | ✅ 配置读写 | ✅ Sitemap 生成、配置往返 |

### 编写测试

**单元测试示例：**

```typescript
// backend/src/services/__tests__/message.test.ts
import { messageService } from '../message'

describe('MessageService', () => {
  test('应该正确筛选未读留言', async () => {
    const result = await messageService.getMessages({
      status: 'unread',
      page: 1,
      pageSize: 10
    })
    
    expect(result.data.every(msg => msg.status === 'unread')).toBe(true)
  })
})
```

**属性测试示例：**

```typescript
// backend/src/services/__tests__/message.property.test.ts
import * as fc from 'fast-check'
import { messageService } from '../message'

describe('MessageService Properties', () => {
  test('留言序列化往返一致性', () => {
    fc.assert(
      fc.property(
        fc.record({
          nickname: fc.string({ minLength: 1, maxLength: 50 }),
          contact: fc.emailAddress(),
          content: fc.string({ minLength: 1, maxLength: 500 })
        }),
        async (message) => {
          // 保存留言
          const saved = await messageService.saveMessage(message)
          
          // 读取留言
          const loaded = await messageService.getMessage(saved.id)
          
          // 验证数据一致性
          expect(loaded.nickname).toBe(message.nickname)
          expect(loaded.contact).toBe(message.contact)
          expect(loaded.content).toBe(message.content)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### 测试命令

```bash
# 运行特定测试文件
npm test -- message.test.ts

# 运行特定测试套件
npm test -- --testNamePattern="MessageService"

# 更新快照
npm test -- -u

# 调试模式
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 常见问题

### 安装和配置

#### Q1: 如何修改后端端口？

**A:** 编辑 `backend/.env` 文件，修改 `PORT` 变量：

```env
PORT=3002  # 改为你想要的端口
```

同时需要修改前端 API 配置 `frontend/src/api/request.ts`：

```typescript
const request = axios.create({
  baseURL: 'http://127.0.0.1:3002/api',  // 修改端口
  timeout: 10000
})
```

#### Q2: 数据库初始化失败怎么办？

**A:** 检查以下几点：

1. 确保 `data` 目录存在且有写入权限
2. 检查是否有其他进程占用数据库文件
3. 删除旧的数据库文件重新初始化：
   ```bash
   rm backend/data/admin.db
   npm run db:init
   ```

#### Q3: 如何重置管理员密码？

**A:** 运行数据库初始化脚本会重置为默认密码：

```bash
cd backend
npm run db:init
```

默认账户：
- 用户名：`admin`
- 密码：`admin123`

#### Q4: 前端启动后无法连接后端？

**A:** 检查以下几点：

1. 确保后端服务已启动：`cd backend && npm run dev`
2. 检查后端端口是否正确（默认 3001）
3. 检查前端 API 配置中的 `baseURL` 是否正确
4. 检查浏览器控制台是否有 CORS 错误

### 开发问题

#### Q5: 如何添加新的 API 接口？

**A:** 按照以下步骤：

1. 在 `backend/src/models/` 创建数据模型
2. 在 `backend/src/services/` 创建业务逻辑
3. 在 `backend/src/controllers/` 创建控制器
4. 在 `backend/src/routes/` 添加路由
5. 在 `frontend/src/api/` 添加前端接口调用

#### Q6: 如何添加新的页面？

**A:** 按照以下步骤：

1. 在 `frontend/src/views/` 创建页面组件
2. 在 `frontend/src/router/index.ts` 添加路由
3. 在侧边栏导航中添加菜单项
4. 创建相关的子组件（如果需要）

#### Q7: 如何调试后端代码？

**A:** 使用 VS Code 调试：

1. 在 `.vscode/launch.json` 添加配置：
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Debug Backend",
     "runtimeExecutable": "npm",
     "runtimeArgs": ["run", "dev"],
     "cwd": "${workspaceFolder}/backend",
     "skipFiles": ["<node_internals>/**"]
   }
   ```

2. 在代码中设置断点
3. 按 F5 启动调试

### 部署问题

#### Q8: Nginx 配置测试失败？

**A:** 常见原因：

1. **语法错误** - 检查配置文件语法
   ```bash
   sudo nginx -t
   ```

2. **端口冲突** - 检查 80/443 端口是否被占用
   ```bash
   sudo netstat -tlnp | grep :80
   sudo netstat -tlnp | grep :443
   ```

3. **SSL 证书路径错误** - 检查证书文件是否存在
   ```bash
   ls -la /etc/letsencrypt/live/your-domain.com/
   ```

#### Q9: PM2 启动后端失败？

**A:** 检查以下几点：

1. 查看 PM2 日志：
   ```bash
   pm2 logs admin-api
   ```

2. 检查环境变量配置：
   ```bash
   cat /var/www/admin-backend/.env
   ```

3. 检查文件权限：
   ```bash
   ls -la /var/www/admin-backend/
   ```

4. 手动启动测试：
   ```bash
   cd /var/www/admin-backend
   node dist/app.js
   ```

#### Q10: SSL 证书申请失败？

**A:** 常见原因：

1. **域名解析未生效** - 检查域名是否正确解析到服务器 IP
   ```bash
   dig +short your-domain.com
   ```

2. **80 端口未开放** - 检查防火墙设置
   ```bash
   sudo ufw status
   sudo ufw allow 80
   ```

3. **Nginx 配置错误** - 确保 `.well-known/acme-challenge/` 路径可访问

4. **速率限制** - Let's Encrypt 有速率限制，使用 `--test` 参数测试

#### Q11: 前端页面空白或 404？

**A:** 检查以下几点：

1. 确保前端已正确构建：
   ```bash
   cd frontend
   npm run build
   ls -la dist/
   ```

2. 检查 Nginx 配置中的 `root` 路径是否正确

3. 检查文件权限：
   ```bash
   ls -la /var/www/admin/
   ```

4. 查看 Nginx 错误日志：
   ```bash
   sudo tail -f /var/log/nginx/admin_error.log
   ```

### 功能问题

#### Q12: 文件上传失败？

**A:** 检查以下几点：

1. 文件大小是否超过限制（默认 10MB）
2. 文件类型是否支持
3. 上传目录是否有写入权限
4. Nginx 配置中的 `client_max_body_size` 是否足够大

#### Q13: 图片显示不出来？

**A:** 检查以下几点：

1. 图片路径是否正确
2. Nginx 是否正确配置了静态文件服务
3. 图片文件是否存在
4. 浏览器控制台是否有 404 错误

#### Q14: 留言导出功能不工作？

**A:** 检查以下几点：

1. 查看后端日志是否有错误
2. 检查是否有留言数据
3. 检查浏览器是否阻止了文件下载
4. 尝试使用不同的导出格式（Excel/CSV）

#### Q15: 游戏配置保存后不生效？

**A:** 检查以下几点：

1. 确保点击了"保存"按钮
2. 检查浏览器控制台是否有错误
3. 刷新前端页面重新加载配置
4. 检查后端日志确认配置已保存

### 性能问题

#### Q16: 后端内存占用过高？

**A:** 优化措施：

1. 检查是否有内存泄漏
2. 调整 Node.js 内存限制
3. 定期重启服务（PM2 自动重启）
4. 优化数据库查询
5. 使用流式处理大文件

#### Q17: 页面加载慢？

**A:** 优化措施：

1. 启用 Nginx Gzip 压缩
2. 配置静态资源缓存
3. 优化图片大小
4. 使用 CDN 加速
5. 减少不必要的 API 请求

#### Q18: 数据库查询慢？

**A:** 优化措施：

1. 添加索引
2. 优化查询语句
3. 定期执行 VACUUM
4. 使用分页查询
5. 缓存常用数据

### 安全问题

#### Q19: 如何防止暴力破解？

**A:** 系统已实现以下安全措施：

1. 登录失败 5 次后锁定账户 15 分钟
2. 使用 bcrypt 加密密码
3. JWT Token 有效期 24 小时
4. 建议配置 fail2ban 进一步防护

#### Q20: 如何备份数据？

**A:** 备份以下内容：

1. **数据库文件**：
   ```bash
   cp /var/www/admin-backend/data/admin.db /backup/
   ```

2. **上传的文件**：
   ```bash
   cp -r /var/www/files /backup/
   ```

3. **配置文件**：
   ```bash
   cp /var/www/admin-backend/.env /backup/
   cp /etc/nginx/sites-available/admin /backup/
   ```

4. **设置定时备份**（参考部署指南）

### 其他问题

#### Q21: 如何查看系统版本信息？

**A:** 运行以下命令：

```bash
# Node.js 版本
node -v

# npm 版本
npm -v

# 后端版本
cd backend && npm run version

# 前端版本
cd frontend && npm run version
```

#### Q22: 如何贡献代码？

**A:** 请参考下面的"贡献指南"章节。

#### Q23: 在哪里报告 Bug？

**A:** 请通过以下方式报告：

1. 在项目仓库创建 Issue
2. 提供详细的错误信息和复现步骤
3. 附上相关日志和截图

#### Q24: 如何获取技术支持？

**A:** 可以通过以下方式：

1. 查看本文档的常见问题
2. 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 故障排查章节
3. 在项目仓库提交 Issue
4. 联系项目维护者

### 更多帮助

如果以上内容无法解决你的问题，请：

1. 查看详细的部署文档：[DEPLOYMENT.md](./DEPLOYMENT.md)
2. 查看 Nginx 配置说明：[README.nginx.md](./README.nginx.md)
3. 查看项目规范文档：`.kiro/specs/admin-system/`
4. 在项目仓库提交 Issue

## 贡献指南

感谢你对本项目的关注！我们欢迎任何形式的贡献。

### 贡献方式

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- ✨ 开发新功能

### 开发流程

1. **Fork 项目**
   
   点击项目页面右上角的 "Fork" 按钮

2. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/portfolio.git
   cd portfolio/src/admin
   ```

3. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

4. **安装依赖**
   ```bash
   # 后端
   cd backend && npm install
   
   # 前端
   cd ../frontend && npm install
   ```

5. **开发和测试**
   ```bash
   # 启动开发服务器
   npm run dev
   
   # 运行测试
   npm test
   
   # 代码检查
   npm run lint
   ```

6. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```
   
   提交信息格式：
   - `feat:` 新功能
   - `fix:` Bug 修复
   - `docs:` 文档更新
   - `style:` 代码格式调整
   - `refactor:` 代码重构
   - `test:` 测试相关
   - `chore:` 构建/工具相关

7. **推送到远程**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **创建 Pull Request**
   
   在 GitHub 上创建 Pull Request，描述你的改动

### 代码规范

#### 通用规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 配置规则
- 保持代码简洁易读
- 添加必要的注释
- 编写单元测试

#### 命名规范

- **文件名**：使用 kebab-case（如 `user-service.ts`）
- **类名**：使用 PascalCase（如 `UserService`）
- **函数名**：使用 camelCase（如 `getUserById`）
- **常量**：使用 UPPER_SNAKE_CASE（如 `MAX_FILE_SIZE`）
- **组件名**：使用 PascalCase（如 `UserProfile.vue`）

#### 注释规范

```typescript
/**
 * 获取用户信息
 * @param userId 用户 ID
 * @returns 用户信息对象
 * @throws {NotFoundError} 用户不存在时抛出
 */
async function getUserById(userId: number): Promise<User> {
  // 实现代码...
}
```

### 测试要求

- 新功能必须包含单元测试
- 测试覆盖率不低于 80%
- 所有测试必须通过
- 关键功能需要属性测试

### Pull Request 检查清单

提交 PR 前请确认：

- [ ] 代码遵循项目规范
- [ ] 通过所有测试
- [ ] 通过 ESLint 检查
- [ ] 更新了相关文档
- [ ] 添加了必要的测试
- [ ] 提交信息清晰明确
- [ ] 没有合并冲突

### 报告 Bug

报告 Bug 时请提供：

1. **Bug 描述** - 清晰描述问题
2. **复现步骤** - 详细的复现步骤
3. **预期行为** - 你期望的正确行为
4. **实际行为** - 实际发生的情况
5. **环境信息** - 操作系统、Node.js 版本等
6. **截图/日志** - 相关的截图或错误日志

### 功能建议

提出新功能时请说明：

1. **功能描述** - 详细描述功能
2. **使用场景** - 为什么需要这个功能
3. **实现思路** - 你的实现想法（可选）
4. **相关资料** - 参考资料或示例（可选）

### 文档贡献

文档改进包括：

- 修正错别字和语法错误
- 补充缺失的说明
- 改进示例代码
- 添加常见问题解答
- 翻译文档（如果需要）

### 行为准则

- 尊重所有贡献者
- 保持友好和专业
- 接受建设性批评
- 关注项目目标
- 帮助新手贡献者

### 许可协议

贡献代码即表示你同意将代码以项目相同的许可证发布。

### 联系方式

如有任何问题，欢迎通过以下方式联系：

- 提交 Issue
- 发送邮件
- 项目讨论区

感谢你的贡献！🎉

## 许可证

本项目采用 ISC 许可证。

### ISC License

```
Copyright (c) 2024

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### 第三方依赖

本项目使用了以下开源项目：

#### 后端依赖

- [Express.js](https://expressjs.com/) - MIT License
- [SQLite](https://www.sqlite.org/) - Public Domain
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - MIT License
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) - MIT License
- [multer](https://github.com/expressjs/multer) - MIT License
- [sharp](https://github.com/lovell/sharp) - Apache-2.0 License
- [helmet](https://github.com/helmetjs/helmet) - MIT License
- [cors](https://github.com/expressjs/cors) - MIT License
- [exceljs](https://github.com/exceljs/exceljs) - MIT License

#### 前端依赖

- [Vue 3](https://vuejs.org/) - MIT License
- [Element Plus](https://element-plus.org/) - MIT License
- [ECharts](https://echarts.apache.org/) - Apache-2.0 License
- [Pinia](https://pinia.vuejs.org/) - MIT License
- [Vue Router](https://router.vuejs.org/) - MIT License
- [Axios](https://axios-http.com/) - MIT License
- [Vite](https://vitejs.dev/) - MIT License

感谢所有开源项目的贡献者！

---

## 相关文档

- [部署指南 (DEPLOYMENT.md)](./DEPLOYMENT.md) - 详细的部署步骤和维护操作
- [Nginx 配置说明 (README.nginx.md)](./README.nginx.md) - Nginx 配置详解和脚本使用
- [需求文档 (requirements.md)](./.kiro/specs/admin-system/requirements.md) - 完整的功能需求
- [设计文档 (design.md)](./.kiro/specs/admin-system/design.md) - 技术架构和接口设计
- [任务列表 (tasks.md)](./.kiro/specs/admin-system/tasks.md) - 开发任务和进度

## 更新日志

### v1.0.0 (2024-01-01)

**初始版本发布**

- ✨ 实现数据看板功能
- ✨ 实现内容管理功能
- ✨ 实现留言管理功能
- ✨ 实现文件管理功能
- ✨ 实现游戏管理功能
- ✨ 实现 SEO 管理功能
- 📝 完善项目文档
- 🚀 提供一键部署脚本
- 🔒 实现 JWT 认证和权限控制
- ⚡ 针对 2GB 内存服务器优化性能

## 致谢

感谢以下项目和工具：

- [Node.js](https://nodejs.org/) - JavaScript 运行时
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Express.js](https://expressjs.com/) - Node.js Web 框架
- [Element Plus](https://element-plus.org/) - Vue 3 组件库
- [ECharts](https://echarts.apache.org/) - 数据可视化库
- [Nginx](https://nginx.org/) - 高性能 Web 服务器
- [PM2](https://pm2.keymetrics.io/) - Node.js 进程管理器
- [Let's Encrypt](https://letsencrypt.org/) - 免费 SSL 证书

## 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 📧 邮箱：your-email@example.com
- 🐛 Issue：[GitHub Issues](https://github.com/your-username/portfolio/issues)
- 💬 讨论：[GitHub Discussions](https://github.com/your-username/portfolio/discussions)

---

**Made with ❤️ by [Your Name]**

**最后更新：2024-01-01**
