# 设计文档：后台管理系统

## 概述

本设计文档描述了个人作品集网站后台管理系统的技术架构和实现方案。系统采用前后端分离架构，后端使用 Node.js + Express.js + SQLite，前端使用 Vue 3 + TypeScript + Element Plus。

### 设计目标

1. **轻量高效**：针对 2GB 内存服务器优化，后端内存占用 < 500MB
2. **安全可靠**：JWT 认证、密码加密、防注入攻击
3. **易于维护**：清晰的代码结构、完善的 API 文档
4. **功能完整**：覆盖数据看板、内容管理、留言管理、文件管理、游戏管理、SEO 管理六大模块

## 系统架构

### 整体架构图

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

### 目录结构

```
admin/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   │   ├── database.ts    # 数据库配置
│   │   │   ├── jwt.ts         # JWT 配置
│   │   │   └── index.ts       # 统一导出
│   │   ├── controllers/       # 控制器
│   │   │   ├── auth.ts        # 认证控制器
│   │   │   ├── dashboard.ts   # 数据看板
│   │   │   ├── content.ts     # 内容管理
│   │   │   ├── message.ts     # 留言管理
│   │   │   ├── file.ts        # 文件管理
│   │   │   ├── game.ts        # 游戏管理
│   │   │   └── seo.ts         # SEO 管理
│   │   ├── middleware/        # 中间件
│   │   │   ├── auth.ts        # 认证中间件
│   │   │   ├── validator.ts   # 参数验证
│   │   │   └── errorHandler.ts # 错误处理
│   │   ├── models/            # 数据模型
│   │   │   ├── user.ts        # 用户模型
│   │   │   ├── visit.ts       # 访问记录
│   │   │   ├── message.ts     # 留言模型
│   │   │   ├── content.ts     # 内容模型
│   │   │   ├── game.ts        # 游戏数据
│   │   │   └── seo.ts         # SEO 配置
│   │   ├── routes/            # 路由定义
│   │   │   └── index.ts       # 路由汇总
│   │   ├── services/          # 业务逻辑
│   │   │   ├── auth.ts        # 认证服务
│   │   │   ├── statistics.ts  # 统计服务
│   │   │   ├── content.ts     # 内容服务
│   │   │   ├── file.ts        # 文件服务
│   │   │   └── export.ts      # 导出服务
│   │   ├── utils/             # 工具函数
│   │   │   ├── crypto.ts      # 加密工具
│   │   │   ├── file.ts        # 文件工具
│   │   │   └── validator.ts   # 验证工具
│   │   ├── database/          # 数据库
│   │   │   ├── init.ts        # 初始化脚本
│   │   │   └── migrations/    # 迁移脚本
│   │   └── app.ts             # 应用入口
│   ├── data/                  # 数据目录
│   │   └── admin.db           # SQLite 数据库
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── api/               # API 接口
│   │   │   ├── auth.ts        # 认证接口
│   │   │   ├── dashboard.ts   # 数据看板
│   │   │   ├── content.ts     # 内容管理
│   │   │   ├── message.ts     # 留言管理
│   │   │   ├── file.ts        # 文件管理
│   │   │   ├── game.ts        # 游戏管理
│   │   │   └── seo.ts         # SEO 管理
│   │   ├── components/        # 组件
│   │   │   ├── layout/        # 布局组件
│   │   │   │   ├── Sidebar.vue
│   │   │   │   ├── Header.vue
│   │   │   │   └── Layout.vue
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
│   │   ├── stores/            # Pinia 状态
│   │   │   ├── auth.ts        # 认证状态
│   │   │   └── app.ts         # 应用状态
│   │   ├── router/            # 路由配置
│   │   │   └── index.ts
│   │   ├── utils/             # 工具函数
│   │   ├── types/             # 类型定义
│   │   ├── App.vue
│   │   └── main.ts
│   ├── package.json
│   └── vite.config.ts
│
└── README.md                   # 项目说明
```


## 组件和接口

### 后端 API 接口设计

#### 认证模块 `/api/auth`

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | /login | 用户登录 | `{ username, password }` | `{ token, user }` |
| POST | /logout | 用户登出 | - | `{ success }` |
| GET | /profile | 获取当前用户 | - | `{ user }` |
| PUT | /password | 修改密码 | `{ oldPassword, newPassword }` | `{ success }` |

#### 数据看板模块 `/api/dashboard`

| 方法 | 路径 | 描述 | 参数 | 响应 |
|------|------|------|------|------|
| GET | /stats | 获取统计数据 | - | `{ pv, uv, messages, downloads, game }` |
| GET | /visits/trend | 访问趋势 | `period: day|week|month` | `{ data: [{date, pv, uv}] }` |
| GET | /visits/pages | 页面分布 | - | `{ data: [{page, count}] }` |
| GET | /visits/sources | 来源分析 | - | `{ devices, browsers }` |
| GET | /visits/recent | 最近访问 | `limit: number` | `{ data: [Visit] }` |

#### 内容管理模块 `/api/content`

| 方法 | 路径 | 描述 | 请求体/参数 | 响应 |
|------|------|------|-------------|------|
| GET | /profile | 获取个人信息 | - | `{ profile }` |
| PUT | /profile | 更新个人信息 | `Profile` | `{ success }` |
| GET | /education | 获取教育经历 | - | `{ data: [Education] }` |
| POST | /education | 添加教育经历 | `Education` | `{ id }` |
| PUT | /education/:id | 更新教育经历 | `Education` | `{ success }` |
| DELETE | /education/:id | 删除教育经历 | - | `{ success }` |
| GET | /experience | 获取工作经历 | - | `{ data: [Experience] }` |
| POST | /experience | 添加工作经历 | `Experience` | `{ id }` |
| PUT | /experience/:id | 更新工作经历 | `Experience` | `{ success }` |
| DELETE | /experience/:id | 删除工作经历 | - | `{ success }` |
| GET | /skills | 获取技能列表 | - | `{ data: [Skill] }` |
| POST | /skills | 添加技能 | `Skill` | `{ id }` |
| PUT | /skills/:id | 更新技能 | `Skill` | `{ success }` |
| DELETE | /skills/:id | 删除技能 | - | `{ success }` |
| GET | /projects | 获取项目列表 | `category?: string` | `{ data: [Project] }` |
| POST | /projects | 添加项目 | `Project` | `{ id }` |
| PUT | /projects/:id | 更新项目 | `Project` | `{ success }` |
| DELETE | /projects/:id | 删除项目 | - | `{ success }` |
| GET | /campus | 获取校园经历 | - | `{ data: [Campus] }` |
| POST | /campus | 添加校园经历 | `Campus` | `{ id }` |
| PUT | /campus/:id | 更新校园经历 | `Campus` | `{ success }` |
| DELETE | /campus/:id | 删除校园经历 | - | `{ success }` |
| POST | /publish | 发布到前端 | - | `{ success, path }` |
| GET | /preview | 预览数据 | - | `{ profile }` |

#### 留言管理模块 `/api/messages`

| 方法 | 路径 | 描述 | 参数 | 响应 |
|------|------|------|------|------|
| GET | / | 获取留言列表 | `status, startDate, endDate, keyword, page, pageSize` | `{ data, total }` |
| GET | /:id | 获取留言详情 | - | `{ message }` |
| PUT | /:id/read | 标记已读 | - | `{ success }` |
| PUT | /:id/unread | 标记未读 | - | `{ success }` |
| DELETE | /:id | 删除留言 | - | `{ success }` |
| POST | /batch-delete | 批量删除 | `{ ids: string[] }` | `{ success, count }` |
| GET | /export | 导出留言 | `format: excel|csv, startDate, endDate` | 文件下载 |

#### 文件管理模块 `/api/files`

| 方法 | 路径 | 描述 | 参数 | 响应 |
|------|------|------|------|------|
| GET | /tree | 获取目录树 | `path?: string` | `{ tree }` |
| POST | /upload | 上传文件 | `FormData` | `{ path, filename }` |
| GET | /download/:path | 下载文件 | - | 文件流 |
| DELETE | /:path | 删除文件 | - | `{ success }` |
| PUT | /rename | 重命名 | `{ oldPath, newPath }` | `{ success }` |
| GET | /resume/list | 简历列表 | - | `{ data: [Resume] }` |
| POST | /resume/upload | 上传简历 | `FormData` | `{ version }` |
| PUT | /resume/active/:version | 设置当前简历 | - | `{ success }` |
| POST | /image/upload | 上传图片 | `FormData, category` | `{ path, thumbnail }` |
| POST | /audio/upload | 上传音频 | `FormData, type` | `{ path }` |

#### 游戏管理模块 `/api/game`

| 方法 | 路径 | 描述 | 参数 | 响应 |
|------|------|------|------|------|
| GET | /leaderboard | 获取排行榜 | `limit?: number` | `{ data: [Score] }` |
| DELETE | /leaderboard/:id | 删除记录 | - | `{ success }` |
| DELETE | /leaderboard | 重置排行榜 | - | `{ success }` |
| GET | /achievements | 获取成就列表 | - | `{ data: [Achievement] }` |
| POST | /achievements | 添加成就 | `Achievement` | `{ id }` |
| PUT | /achievements/:id | 更新成就 | `Achievement` | `{ success }` |
| DELETE | /achievements/:id | 删除成就 | - | `{ success }` |
| GET | /config | 获取游戏配置 | - | `{ config }` |
| PUT | /config | 更新游戏配置 | `GameConfig` | `{ success }` |
| POST | /config/reset | 恢复默认配置 | - | `{ config }` |
| GET | /config/export | 导出配置 | - | JSON 文件 |
| POST | /config/import | 导入配置 | `FormData` | `{ success }` |

#### SEO 管理模块 `/api/seo`

| 方法 | 路径 | 描述 | 参数 | 响应 |
|------|------|------|------|------|
| GET | /meta | 获取 Meta 配置 | - | `{ pages: [PageMeta] }` |
| PUT | /meta/:page | 更新页面 Meta | `PageMeta` | `{ success }` |
| GET | /schema | 获取结构化数据 | - | `{ schemas }` |
| PUT | /schema | 更新结构化数据 | `Schemas` | `{ success }` |
| GET | /sitemap | 获取 Sitemap 配置 | - | `{ config }` |
| PUT | /sitemap | 更新 Sitemap 配置 | `SitemapConfig` | `{ success }` |
| POST | /sitemap/generate | 生成 Sitemap | - | `{ success, path }` |
| GET | /robots | 获取 robots.txt | - | `{ content }` |
| PUT | /robots | 更新 robots.txt | `{ content }` | `{ success }` |


## 数据模型

### SQLite 数据库表结构

#### 用户表 `users`

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME
);
```

#### 访问记录表 `visits`

```sql
CREATE TABLE visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  device_type TEXT,        -- desktop, tablet, mobile
  browser TEXT,
  referrer TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visits_page ON visits(page);
CREATE INDEX idx_visits_session_id ON visits(session_id);
```

#### 留言表 `messages`

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  contact TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'unread',  -- unread, read
  file_path TEXT,                -- 对应的文件路径
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME
);

CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

#### 个人信息表 `profile`

```sql
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- 单行表
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar TEXT,
  summary TEXT,
  job_intentions TEXT,  -- JSON 数组
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 教育经历表 `education`

```sql
CREATE TABLE education (
  id TEXT PRIMARY KEY,
  school TEXT NOT NULL,
  college TEXT,
  major TEXT NOT NULL,
  period TEXT NOT NULL,
  rank TEXT,
  honors TEXT,           -- JSON 数组
  courses TEXT,          -- JSON 数组 [{name, score}]
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 工作经历表 `experience`

```sql
CREATE TABLE experience (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  period TEXT NOT NULL,
  responsibilities TEXT,  -- JSON 数组
  achievements TEXT,      -- JSON 数组 [{metric, value}]
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 技能表 `skills`

```sql
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 100),
  category TEXT NOT NULL,  -- frontend, backend, tools, other
  experience TEXT,
  projects TEXT,           -- JSON 数组
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_category ON skills(category);
```

#### 技能树表 `skill_tree`

```sql
CREATE TABLE skill_tree (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 0,
  experience TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES skill_tree(id) ON DELETE CASCADE
);
```

#### 项目表 `projects`

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  period TEXT,
  role TEXT,
  technologies TEXT,      -- JSON 数组
  highlights TEXT,        -- JSON 数组
  screenshots TEXT,       -- JSON 数组
  demo_url TEXT,
  source_url TEXT,
  category TEXT NOT NULL, -- work, personal, opensource
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_category ON projects(category);
```

#### 校园经历表 `campus_experience`

```sql
CREATE TABLE campus_experience (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization TEXT NOT NULL,
  position TEXT NOT NULL,
  period TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 简历版本表 `resume_versions`

```sql
CREATE TABLE resume_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  is_active INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 游戏排行榜表 `game_leaderboard`

```sql
CREATE TABLE game_leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  stage INTEGER,
  play_time INTEGER,      -- 游戏时长（秒）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_score ON game_leaderboard(score DESC);
```

#### 游戏成就表 `game_achievements`

```sql
CREATE TABLE game_achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  condition_type TEXT NOT NULL,  -- score, stage, time, kills, etc.
  condition_value INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 游戏配置表 `game_config`

```sql
CREATE TABLE game_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- 单行表
  enabled INTEGER DEFAULT 1,
  debug_mode INTEGER DEFAULT 0,
  config_json TEXT NOT NULL,  -- 完整的游戏配置 JSON
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### SEO 配置表 `seo_config`

```sql
CREATE TABLE seo_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- 单行表
  page_meta TEXT,         -- JSON: 各页面 Meta 配置
  schemas TEXT,           -- JSON: 结构化数据配置
  sitemap_config TEXT,    -- JSON: Sitemap 配置
  robots_txt TEXT,        -- robots.txt 内容
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 统计数据表 `statistics`

```sql
CREATE TABLE statistics (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- 单行表
  resume_downloads INTEGER DEFAULT 0,
  game_triggers INTEGER DEFAULT 0,
  game_completions INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```


### 游戏参数配置数据模型

游戏配置存储在 `game_config` 表的 `config_json` 字段中，完整结构如下：

```typescript
/**
 * 游戏完整配置接口
 * 包含所有可配置的游戏参数
 */
interface GameConfig {
  // ========== 基础参数（默认显示）==========
  basic: {
    /** 玩家初始生命值 */
    playerInitialHealth: number      // 默认: 10
    /** 玩家初始速度 */
    playerInitialSpeed: number       // 默认: 5
    /** 核弹进度条最大值 */
    nukeMaxProgress: number          // 默认: 100
    /** 敌人生成速率（毫秒） */
    enemySpawnRate: number           // 默认: 3000
    /** 关卡敌人总数 */
    stageTotalEnemies: number        // 默认: 50
  }

  // ========== 高级参数（需开启高级模式）==========
  advanced: {
    // ----- 场景配置 -----
    scene: {
      /** 画布宽度 */
      canvasWidth: number            // 默认: 800
      /** 画布高度 */
      canvasHeight: number           // 默认: 600
      /** 场景缩放倍率 */
      scaleMultiplier: number        // 默认: 1.5
      /** 像素块大小 */
      pixelBlockSize: number         // 默认: 8
    }

    // ----- 玩家配置 -----
    player: {
      /** 移动距离（像素块） */
      moveDistance: number           // 默认: 8 (1个像素块)
      /** 移动间隔（长按时，毫秒） */
      moveInterval: number           // 默认: 100
      /** 碰撞体积宽度 */
      collisionWidth: number         // 默认: 96 (12像素块)
      /** 碰撞体积高度 */
      collisionHeight: number        // 默认: 64 (8像素块)
      /** 初始机炮配置 */
      initialMachineGun: {
        /** 每次发射子弹数 */
        bulletsPerShot: number       // 默认: 1
        /** 弹道数 */
        trajectories: number         // 默认: 1
        /** 射速（毫秒） */
        fireRate: number             // 默认: 3000
        /** 伤害 */
        bulletDamage: number         // 默认: 2
        /** 子弹速度 */
        bulletSpeed: number          // 默认: 20
      }
      /** 初始导弹配置 */
      initialMissileLauncher: {
        /** 导弹数量 */
        missileCount: number         // 默认: 10
        /** 伤害 */
        missileDamage: number        // 默认: 5
        /** 速度 */
        missileSpeed: number         // 默认: 12
        /** 爆炸半径 */
        explosionRadius: number      // 默认: 3
      }
    }

    // ----- 移动配置 -----
    movement: {
      /** 敌人移动间隔（毫秒） */
      enemyMoveInterval: number      // 默认: 500
      /** 敌人下降间隔（毫秒） */
      enemyDownInterval: number      // 默认: 500
      /** 掉落物移动速度 */
      pickupMoveSpeed: number        // 默认: 2
    }

    // ----- 射击配置 -----
    shooting: {
      /** 玩家机炮冷却时间（毫秒） */
      playerGunCooldown: number      // 默认: 200
      /** 敌人机炮冷却时间（毫秒） */
      enemyGunCooldown: number       // 默认: 1000
      /** 子弹速度 */
      bulletSpeed: number            // 默认: 0.08 (像素块/毫秒)
      /** 子弹移动间隔（毫秒） */
      bulletMoveInterval: number     // 默认: 50
      /** 导弹速度 */
      missileSpeed: number           // 默认: 0.053 (像素块/毫秒)
      /** 导弹移动间隔（毫秒） */
      missileMoveInterval: number    // 默认: 80
    }

    // ----- 效果配置 -----
    effects: {
      /** 爆炸持续时间（毫秒） */
      explosionDuration: number      // 默认: 500
      /** 爆炸动画帧数 */
      explosionFrames: number        // 默认: 8
      /** 屏幕震动持续时间（毫秒） */
      screenShakeDuration: number    // 默认: 300
      /** 屏幕震动最小强度（像素） */
      screenShakeIntensityMin: number // 默认: 2
      /** 屏幕震动最大强度（像素） */
      screenShakeIntensityMax: number // 默认: 4
    }

    // ----- 音频配置 -----
    audio: {
      /** 背景音乐音量 (0.0-1.0) */
      musicVolume: number            // 默认: 0.5
      /** 音效音量 (0.0-1.0) */
      effectVolume: number           // 默认: 0.7
      /** 最大同时播放音效数 */
      maxConcurrentSounds: number    // 默认: 10
      /** 音频对象池大小 */
      audioPoolSize: number          // 默认: 5
    }

    // ----- 性能配置 -----
    performance: {
      /** 目标帧率 */
      targetFPS: number              // 默认: 60
      /** 最大内存限制（MB） */
      maxMemoryMB: number            // 默认: 100
      /** 内存检查间隔（毫秒） */
      memoryCheckInterval: number    // 默认: 5000
      /** 缓存清理阈值 (0.0-1.0) */
      cacheCleanupThreshold: number  // 默认: 0.9
    }

    // ----- 敌人配置 -----
    enemies: {
      /** 各类型敌人配置 */
      types: {
        [key in EnemyType]: {
          /** 血量 */
          health: number
          /** 速度 */
          speed: number
          /** 攻击力 */
          attackPower: number
          /** 机炮配置 */
          machineGun?: {
            bulletsPerShot: number
            bulletDamage: number
            bulletSpeed: number
            fireRate: number
            trajectories: number
          }
          /** 导弹配置 */
          missileLauncher?: {
            missileCount: number
            missileDamage: number
            missileSpeed: number
            explosionRadius: number
          }
          /** 掉落概率 */
          dropRates: {
            machineGun: number       // 机炮升级
            missile: number          // 导弹补给
            repair: number           // 维修包
            engine: number           // 引擎升级
          }
        }
      }
      /** 精英怪倍率 */
      eliteMultiplier: number        // 默认: 1.5
      /** Boss 倍率 */
      bossMultiplier: number         // 默认: 2
      /** 最终 Boss 倍率 */
      finalBossMultiplier: number    // 默认: 5
      /** 精英怪体积倍率 */
      eliteSizeMultiplier: number    // 默认: 1.2
      /** Boss 体积倍率 */
      bossSizeMultiplier: number     // 默认: 1.5
      /** 最终 Boss 体积倍率 */
      finalBossSizeMultiplier: number // 默认: 2
    }

    // ----- 关卡配置 -----
    stages: Array<{
      /** 关卡 ID */
      id: number
      /** 关卡名称 */
      name: string
      /** 背景场景 */
      background: string
      /** 敌人类型 */
      enemyTypes: EnemyType[]
      /** 敌人总数 */
      totalEnemies: number
      /** 生成速率（毫秒） */
      spawnRate: number
      /** Boss 类型 */
      bossType: EnemyType
    }>
  }
}

/** 敌人类型枚举 */
enum EnemyType {
  WHITE = 'white',
  GREEN = 'green',
  BLUE = 'blue',
  PURPLE = 'purple',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red'
}
```

### 默认游戏配置

```typescript
const DEFAULT_GAME_CONFIG: GameConfig = {
  basic: {
    playerInitialHealth: 10,
    playerInitialSpeed: 5,
    nukeMaxProgress: 100,
    enemySpawnRate: 3000,
    stageTotalEnemies: 50
  },
  advanced: {
    scene: {
      canvasWidth: 800,
      canvasHeight: 600,
      scaleMultiplier: 1.5,
      pixelBlockSize: 8
    },
    player: {
      moveDistance: 8,
      moveInterval: 100,
      collisionWidth: 96,
      collisionHeight: 64,
      initialMachineGun: {
        bulletsPerShot: 1,
        trajectories: 1,
        fireRate: 3000,
        bulletDamage: 2,
        bulletSpeed: 20
      },
      initialMissileLauncher: {
        missileCount: 10,
        missileDamage: 5,
        missileSpeed: 12,
        explosionRadius: 3
      }
    },
    movement: {
      enemyMoveInterval: 500,
      enemyDownInterval: 500,
      pickupMoveSpeed: 2
    },
    shooting: {
      playerGunCooldown: 200,
      enemyGunCooldown: 1000,
      bulletSpeed: 0.08,
      bulletMoveInterval: 50,
      missileSpeed: 0.053,
      missileMoveInterval: 80
    },
    effects: {
      explosionDuration: 500,
      explosionFrames: 8,
      screenShakeDuration: 300,
      screenShakeIntensityMin: 2,
      screenShakeIntensityMax: 4
    },
    audio: {
      musicVolume: 0.5,
      effectVolume: 0.7,
      maxConcurrentSounds: 10,
      audioPoolSize: 5
    },
    performance: {
      targetFPS: 60,
      maxMemoryMB: 100,
      memoryCheckInterval: 5000,
      cacheCleanupThreshold: 0.9
    },
    enemies: {
      types: {
        // ... 各类型敌人配置（参考 src/game/constants.ts）
      },
      eliteMultiplier: 1.5,
      bossMultiplier: 2,
      finalBossMultiplier: 5,
      eliteSizeMultiplier: 1.2,
      bossSizeMultiplier: 1.5,
      finalBossSizeMultiplier: 2
    },
    stages: [
      {
        id: 1,
        name: '家里',
        background: 'home-scene',
        enemyTypes: ['white', 'green', 'blue'],
        totalEnemies: 50,
        spawnRate: 3000,
        bossType: 'purple'
      },
      {
        id: 2,
        name: '学校',
        background: 'school-scene',
        enemyTypes: ['white', 'green', 'blue', 'purple', 'yellow'],
        totalEnemies: 70,
        spawnRate: 2000,
        bossType: 'orange'
      },
      {
        id: 3,
        name: '公司',
        background: 'company-scene',
        enemyTypes: ['purple', 'yellow', 'orange', 'red'],
        totalEnemies: 80,
        spawnRate: 1500,
        bossType: 'red'
      }
    ]
  }
}
```


## 正确性属性

*正确性属性是指在系统所有有效执行中都应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: JWT Token 往返一致性

*对于任意*有效的用户信息，生成 JWT Token 后再验证解析，应该得到相同的用户信息。

**验证需求: 1.3**

### Property 2: 账户锁定逻辑正确性

*对于任意*账户，连续 5 次登录失败后，该账户应该被锁定，在锁定期间内的登录尝试应该被拒绝。

**验证需求: 1.2**

### Property 3: 访问统计计算正确性

*对于任意*访问记录集合和时间范围，计算的 PV（页面浏览量）应该等于该范围内的记录总数，UV（独立访客数）应该等于该范围内唯一 session_id 的数量。

**验证需求: 2.1.1, 2.2.1, 2.2.2, 2.2.3**

### Property 4: 内容数据往返一致性

*对于任意*有效的内容数据（个人信息、教育经历、工作经历、技能、项目、校园经历），保存到数据库后再读取，应该得到等价的数据。

**验证需求: 3.1.1, 3.2.1, 3.3.1, 3.4.1, 3.5.1, 3.6.1**

### Property 5: 留言序列化往返一致性

*对于任意*有效的留言数据，序列化为文件格式后再反序列化，应该得到等价的留言数据。

**验证需求: 4.3.3**

### Property 6: 文件名生成格式正确性

*对于任意*日期和称呼，生成的文件名应该符合 "YYYY-MM-DD_称呼.txt" 格式，且同一天同一称呼的多条留言应该有正确的序号后缀。

**验证需求: 4.3.2, 4.3.4**

### Property 7: 留言筛选结果正确性

*对于任意*留言集合和筛选条件（时间范围、状态、关键词），筛选结果应该只包含满足所有条件的留言。

**验证需求: 4.1.2, 4.1.3, 4.1.4**

### Property 8: 文件类型验证正确性

*对于任意*上传的文件，系统应该正确验证文件类型：简历只接受 PDF，图片只接受 JPG/PNG/WebP，音频只接受 MP3/OGG。

**验证需求: 5.1.1, 5.2.1, 5.3.1**

### Property 9: 简历版本管理正确性

*对于任意*简历上传序列，系统应该保留最多 5 个版本，超过时删除最旧的版本。

**验证需求: 5.1.2**

### Property 10: 游戏参数配置往返一致性

*对于任意*有效的游戏配置，保存后再读取应该得到等价的配置；导出为 JSON 后再导入应该得到等价的配置。

**验证需求: 6.4.1-6.4.5, 6.5.2, 6.6.1, 6.6.4**

### Property 11: 游戏配置恢复默认值正确性

*对于任意*已修改的游戏配置，执行恢复默认值操作后，配置应该等于预定义的默认配置。

**验证需求: 6.6.2**

### Property 12: 排行榜排序正确性

*对于任意*排行榜数据集合，返回的排行榜应该按分数降序排列。

**验证需求: 6.1.1**

### Property 13: Sitemap XML 生成有效性

*对于任意*有效的 Sitemap 配置，生成的 sitemap.xml 应该是符合 Sitemap 协议的有效 XML 文档。

**验证需求: 7.3.1**

### Property 14: SEO 配置往返一致性

*对于任意*有效的 SEO 配置（Meta、Schema、Sitemap），保存后再读取应该得到等价的配置。

**验证需求: 7.1.1-7.1.4, 7.2.1-7.2.3, 7.3.2, 7.3.3, 7.4.1**

## 错误处理

### 认证错误

| 错误码 | 描述 | 处理方式 |
|--------|------|----------|
| 401 | 未认证 | 重定向到登录页 |
| 403 | 权限不足 | 显示错误提示 |
| 423 | 账户锁定 | 显示锁定时间和原因 |

### 业务错误

| 错误码 | 描述 | 处理方式 |
|--------|------|----------|
| 400 | 参数错误 | 显示具体错误字段 |
| 404 | 资源不存在 | 显示友好提示 |
| 409 | 资源冲突 | 提示用户处理冲突 |
| 413 | 文件过大 | 提示文件大小限制 |
| 415 | 文件类型不支持 | 提示支持的文件类型 |

### 系统错误

| 错误码 | 描述 | 处理方式 |
|--------|------|----------|
| 500 | 服务器内部错误 | 记录日志，显示通用错误 |
| 503 | 服务不可用 | 显示维护提示 |

### 错误响应格式

```typescript
interface ErrorResponse {
  code: number
  message: string
  details?: {
    field?: string
    reason?: string
  }
}
```


## 测试策略

### 双重测试方法

本项目采用单元测试和属性测试相结合的测试策略：

- **单元测试**：验证具体示例、边界情况和错误条件
- **属性测试**：验证所有输入的通用属性

### 测试框架选择

- **后端**：Jest + fast-check（属性测试）
- **前端**：Vitest + @fast-check/vitest

### 属性测试配置

- 每个属性测试最少运行 100 次迭代
- 每个属性测试必须引用设计文档中的属性
- 标签格式：**Feature: admin-system, Property {number}: {property_text}**

### 测试覆盖范围

#### 后端测试

| 模块 | 单元测试 | 属性测试 |
|------|----------|----------|
| 认证服务 | 登录流程、密码验证 | JWT 往返、账户锁定 |
| 统计服务 | 数据聚合、时间范围 | PV/UV 计算 |
| 内容服务 | CRUD 操作 | 数据往返一致性 |
| 留言服务 | 筛选、导出 | 序列化往返、筛选正确性 |
| 文件服务 | 上传、压缩 | 文件类型验证、版本管理 |
| 游戏服务 | 配置读写 | 配置往返、默认值恢复 |
| SEO 服务 | 配置读写 | Sitemap 生成、配置往返 |

#### 前端测试

| 模块 | 单元测试 | 属性测试 |
|------|----------|----------|
| API 层 | 请求/响应处理 | - |
| 状态管理 | 状态更新 | - |
| 工具函数 | 格式化、验证 | 数据转换 |

### 测试文件结构

```
admin/
├── backend/
│   └── src/
│       └── __tests__/
│           ├── auth.test.ts
│           ├── auth.property.test.ts
│           ├── statistics.test.ts
│           ├── statistics.property.test.ts
│           ├── content.test.ts
│           ├── content.property.test.ts
│           ├── message.test.ts
│           ├── message.property.test.ts
│           ├── file.test.ts
│           ├── file.property.test.ts
│           ├── game.test.ts
│           ├── game.property.test.ts
│           ├── seo.test.ts
│           └── seo.property.test.ts
│
└── frontend/
    └── src/
        └── __tests__/
            ├── api.test.ts
            └── utils.test.ts
```

## 前端组件设计

### 布局组件

```
┌─────────────────────────────────────────────────────────────┐
│  Header（顶部栏）                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Logo    面包屑导航                    用户信息 | 退出    ││
│  └─────────────────────────────────────────────────────────┘│
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │  Main Content（主内容区）                         │
│ (侧边栏)  │                                                  │
│          │  ┌──────────────────────────────────────────────┐│
│ 数据看板  │  │                                              ││
│ 内容管理  │  │                                              ││
│ 留言管理  │  │         页面内容                              ││
│ 文件管理  │  │                                              ││
│ 游戏管理  │  │                                              ││
│ SEO管理   │  │                                              ││
│          │  └──────────────────────────────────────────────┘│
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

### 核心组件列表

#### 布局组件

- `Layout.vue` - 整体布局容器
- `Sidebar.vue` - 侧边栏导航
- `Header.vue` - 顶部栏

#### 数据看板组件

- `StatCard.vue` - 统计卡片
- `TrendChart.vue` - 趋势图表
- `PieChart.vue` - 饼图
- `BarChart.vue` - 柱状图
- `RecentVisits.vue` - 最近访问列表

#### 内容管理组件

- `ProfileForm.vue` - 个人信息表单
- `EducationList.vue` - 教育经历列表
- `ExperienceList.vue` - 工作经历列表
- `SkillList.vue` - 技能列表
- `SkillTreeEditor.vue` - 技能树编辑器
- `ProjectList.vue` - 项目列表
- `CampusList.vue` - 校园经历列表
- `RichTextEditor.vue` - 富文本编辑器

#### 留言管理组件

- `MessageTable.vue` - 留言表格
- `MessageDetail.vue` - 留言详情
- `MessageFilter.vue` - 筛选器
- `ExportDialog.vue` - 导出对话框

#### 文件管理组件

- `FileTree.vue` - 文件树
- `FileUploader.vue` - 文件上传器
- `ImageCropper.vue` - 图片裁剪器
- `AudioPlayer.vue` - 音频播放器
- `ResumeManager.vue` - 简历管理器

#### 游戏管理组件

- `LeaderboardTable.vue` - 排行榜表格
- `AchievementList.vue` - 成就列表
- `GameConfigForm.vue` - 游戏配置表单
- `BasicConfigPanel.vue` - 基础参数面板
- `AdvancedConfigPanel.vue` - 高级参数面板
- `ConfigDiff.vue` - 配置差异显示

#### SEO 管理组件

- `MetaConfigForm.vue` - Meta 配置表单
- `SchemaEditor.vue` - 结构化数据编辑器
- `SitemapConfig.vue` - Sitemap 配置
- `RobotsEditor.vue` - robots.txt 编辑器

## 部署架构

### Nginx 配置

```nginx
# 后台管理系统
server {
    listen 80;
    server_name admin.huangyanjie.com;

    # 前端静态文件
    location / {
        root /var/www/admin;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 7d;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 文件上传大小限制
        client_max_body_size 10M;
    }
}
```

### PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'admin-api',
    script: './dist/app.js',
    cwd: '/var/www/admin-backend',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    node_args: '--max-old-space-size=512'
  }]
}
```

### 内存优化策略

1. **Node.js 内存限制**：`--max-old-space-size=512`
2. **SQLite 配置**：使用 WAL 模式，减少锁竞争
3. **文件处理**：使用流式处理，避免大文件加载到内存
4. **图片压缩**：上传时压缩，减少存储和传输
5. **定期清理**：日志轮转、临时文件清理
