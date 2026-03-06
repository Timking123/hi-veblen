# 需求文档：后台管理系统

## 简介

为个人作品集网站开发一套完整的后台管理系统，包含数据看板、内容管理、留言管理、文件管理、游戏数据管理和 SEO 管理六大核心板块。系统将部署在阿里云 ECS 服务器（2核2GB）上，需要针对资源限制进行优化。

## 术语表

- **Admin_System**（后台管理系统）：用于管理前端网站内容和数据的管理平台
- **Dashboard**（数据看板）：展示网站访问统计和关键指标的仪表盘
- **Content_Manager**（内容管理器）：管理前端页面数据的模块
- **Message_Manager**（留言管理器）：管理访客留言的模块
- **File_Manager**（文件管理器）：管理网站文件资源的模块
- **Game_Manager**（游戏管理器）：管理彩蛋游戏数据和配置的模块
- **SEO_Manager**（SEO管理器）：管理网站 SEO 配置的模块

## 部署环境

参考 `docs/SERVER_OVERVIEW.md` 服务器概况文档：
- 服务器：阿里云 ECS（华南1-深圳）
- 配置：2核 vCPU / 2GB 内存 / 40GB ESSD / 3Mbps 带宽
- 系统：Ubuntu 24.04 64位
- 有效期：至 2028年1月29日

---

## 需求 1：系统基础架构

**用户故事：** 作为网站管理员，我需要一个安全、稳定的后台管理系统，以便管理网站的所有内容和数据。

### 验收标准

1.1 THE Admin_System SHALL 提供用户登录认证功能，支持用户名密码登录
1.2 THE Admin_System SHALL 在登录失败 5 次后锁定账户 15 分钟
1.3 THE Admin_System SHALL 使用 JWT Token 进行会话管理，Token 有效期 24 小时
1.4 THE Admin_System SHALL 提供响应式布局，支持桌面端和平板端访问
1.5 THE Admin_System SHALL 在 2GB 内存限制下稳定运行，后端内存占用不超过 500MB
1.6 THE Admin_System SHALL 使用 SQLite 作为数据库，减少内存占用
1.7 THE Admin_System SHALL 提供侧边栏导航，包含六大功能板块入口

---

## 需求 2：数据看板（Dashboard）

**用户故事：** 作为网站管理员，我希望在首页看到网站的关键数据指标，以便快速了解网站运营状况。

### 验收标准

#### 2.1 核心指标卡片
2.1.1 THE Dashboard SHALL 显示今日/本周/本月访问量（PV/UV）
2.1.2 THE Dashboard SHALL 显示留言总数和未读留言数
2.1.3 THE Dashboard SHALL 显示简历下载次数
2.1.4 THE Dashboard SHALL 显示彩蛋游戏触发次数和通关次数

#### 2.2 图表展示
2.2.1 THE Dashboard SHALL 使用折线图展示访问趋势（支持按日/周/月切换）
2.2.2 THE Dashboard SHALL 使用饼图展示页面访问分布
2.2.3 THE Dashboard SHALL 使用柱状图展示访客来源分析（设备类型、浏览器）
2.2.4 THE Dashboard SHALL 使用统计卡片展示游戏数据（玩家数、平均分数、最高分）

#### 2.3 实时数据
2.3.1 THE Dashboard SHALL 显示最近 10 条访问记录列表
2.3.2 THE Dashboard SHALL 每 30 秒自动刷新数据

---

## 需求 3：内容管理（Content Management）

**用户故事：** 作为网站管理员，我希望能够在后台编辑前端网站的所有内容，以便无需修改代码即可更新网站信息。

### 验收标准

#### 3.1 个人信息管理
3.1.1 THE Content_Manager SHALL 提供基本信息编辑（姓名、职位、电话、邮箱）
3.1.2 THE Content_Manager SHALL 提供头像上传和裁剪功能
3.1.3 THE Content_Manager SHALL 提供个人简介富文本编辑
3.1.4 THE Content_Manager SHALL 提供求职意向列表管理（增删改排序）

#### 3.2 教育经历管理
3.2.1 THE Content_Manager SHALL 提供学校信息 CRUD 操作
3.2.2 THE Content_Manager SHALL 提供课程成绩管理（支持批量导入）
3.2.3 THE Content_Manager SHALL 提供荣誉奖项管理

#### 3.3 工作经历管理
3.3.1 THE Content_Manager SHALL 提供公司/职位信息 CRUD 操作
3.3.2 THE Content_Manager SHALL 提供工作职责富文本编辑
3.3.3 THE Content_Manager SHALL 提供工作成果数据管理

#### 3.4 技能管理
3.4.1 THE Content_Manager SHALL 提供技能列表 CRUD（名称、等级、分类、经验描述）
3.4.2 THE Content_Manager SHALL 提供技能树结构可视化编辑
3.4.3 THE Content_Manager SHALL 提供技能分类管理（前端/后端/工具/其他）

#### 3.5 项目管理
3.5.1 THE Content_Manager SHALL 提供项目信息 CRUD 操作
3.5.2 THE Content_Manager SHALL 提供项目截图上传和管理
3.5.3 THE Content_Manager SHALL 提供技术标签管理
3.5.4 THE Content_Manager SHALL 提供项目分类筛选（工作/个人/开源）

#### 3.6 校园经历管理
3.6.1 THE Content_Manager SHALL 提供组织/职位信息 CRUD 操作

#### 3.7 数据同步
3.7.1 WHEN 内容修改后 THEN Content_Manager SHALL 生成新的 profile.ts 数据文件
3.7.2 THE Content_Manager SHALL 提供"预览"功能，在保存前查看修改效果
3.7.3 THE Content_Manager SHALL 提供"发布"功能，将修改同步到前端网站

---

## 需求 4：留言管理（Message Management）

**用户故事：** 作为网站管理员，我希望能够查看和管理访客留言，以便及时回复和处理留言。

### 验收标准

#### 4.1 留言列表
4.1.1 THE Message_Manager SHALL 以表格形式展示留言（称呼、联系方式、内容摘要、时间、状态）
4.1.2 THE Message_Manager SHALL 支持按时间范围筛选留言
4.1.3 THE Message_Manager SHALL 支持按状态筛选（全部/未读/已读）
4.1.4 THE Message_Manager SHALL 支持关键词搜索留言内容

#### 4.2 留言操作
4.2.1 THE Message_Manager SHALL 提供查看留言详情功能
4.2.2 THE Message_Manager SHALL 提供标记已读/未读功能
4.2.3 THE Message_Manager SHALL 提供删除留言功能（支持批量删除）
4.2.4 THE Message_Manager SHALL 在删除前显示确认对话框

#### 4.3 留言存储
4.3.1 WHEN 前端提交留言 THEN Message_Manager SHALL 将留言保存到 file/message/ 文件夹
4.3.2 THE Message_Manager SHALL 使用"YYYY-MM-DD_称呼.txt"格式命名文件
4.3.3 THE Message_Manager SHALL 以最小空间格式存储（每行一个字段）
4.3.4 IF 同一天同一称呼有多条留言 THEN 文件名添加序号后缀

#### 4.4 导出功能
4.4.1 THE Message_Manager SHALL 提供导出为 Excel/CSV 功能
4.4.2 THE Message_Manager SHALL 支持按时间范围选择导出数据

---

## 需求 5：文件管理（File Management）

**用户故事：** 作为网站管理员，我希望能够管理网站的所有文件资源，以便方便地上传、更新和组织文件。

### 验收标准

#### 5.1 简历管理
5.1.1 THE File_Manager SHALL 提供简历上传功能（仅支持 PDF 格式）
5.1.2 THE File_Manager SHALL 保留简历版本历史（最多 5 个版本）
5.1.3 THE File_Manager SHALL 提供设置当前使用简历的功能
5.1.4 THE File_Manager SHALL 显示简历下载统计

#### 5.2 图片管理
5.2.1 THE File_Manager SHALL 提供图片上传功能（支持 JPG/PNG/WebP）
5.2.2 THE File_Manager SHALL 提供头像裁剪功能（1:1 比例）
5.2.3 THE File_Manager SHALL 自动压缩上传的图片（质量 80%，最大宽度 1920px）
5.2.4 THE File_Manager SHALL 按分类组织图片（头像、项目截图、其他）

#### 5.3 音频管理（游戏资源）
5.3.1 THE File_Manager SHALL 提供音频文件上传功能（支持 MP3/OGG）
5.3.2 THE File_Manager SHALL 按类型分类音频（背景音乐、音效）
5.3.3 THE File_Manager SHALL 提供音频预览播放功能

#### 5.4 文件浏览器
5.4.1 THE File_Manager SHALL 以树形结构展示文件目录
5.4.2 THE File_Manager SHALL 提供文件上传/下载/删除功能
5.4.3 THE File_Manager SHALL 提供文件重命名功能
5.4.4 THE File_Manager SHALL 显示文件大小和修改时间

---

## 需求 6：游戏数据管理（Game Management）

**用户故事：** 作为网站管理员，我希望能够管理彩蛋游戏的数据和配置，以便调整游戏难度和查看玩家数据。

### 验收标准

#### 6.1 排行榜管理
6.1.1 THE Game_Manager SHALL 显示游戏排行榜数据（排名、玩家名、分数、时间）
6.1.2 THE Game_Manager SHALL 提供删除异常记录功能
6.1.3 THE Game_Manager SHALL 提供重置排行榜功能（需二次确认）

#### 6.2 成就系统管理
6.2.1 THE Game_Manager SHALL 显示成就列表（名称、描述、条件、图标）
6.2.2 THE Game_Manager SHALL 提供成就 CRUD 操作
6.2.3 THE Game_Manager SHALL 提供成就条件配置（类型、目标值）

#### 6.3 游戏开关
6.3.1 THE Game_Manager SHALL 提供启用/禁用彩蛋游戏的开关
6.3.2 THE Game_Manager SHALL 提供调试模式开关（显示碰撞框、FPS等）

#### 6.4 基础参数配置（默认显示）
6.4.1 THE Game_Manager SHALL 提供玩家初始生命值配置
6.4.2 THE Game_Manager SHALL 提供玩家初始速度配置
6.4.3 THE Game_Manager SHALL 提供核弹进度条最大值配置
6.4.4 THE Game_Manager SHALL 提供敌人生成速率配置
6.4.5 THE Game_Manager SHALL 提供关卡敌人总数配置

#### 6.5 玩家完整参数配置（高级模式）
6.5.1 THE Game_Manager SHALL 提供"显示高级参数"开关，默认隐藏
6.5.2 WHEN 高级模式开启 THEN Game_Manager SHALL 显示以下玩家参数：
  - 玩家移动距离（像素块）
  - 玩家移动间隔（长按时）
  - 玩家初始机炮配置（每次发射子弹数、弹道数、射速、伤害、子弹速度）
  - 玩家初始导弹配置（导弹数量、伤害、速度、爆炸半径）
  - 玩家碰撞体积（宽度、高度）

#### 6.6 详细参数配置（高级模式）
6.6.1 WHEN 高级模式开启 THEN Game_Manager SHALL 显示以下详细参数：

**场景配置：**
- 画布宽度/高度
- 场景缩放倍率
- 像素块大小

**移动配置：**
- 敌人移动间隔
- 敌人下降间隔
- 掉落物移动速度

**射击配置：**
- 玩家机炮冷却时间
- 敌人机炮冷却时间
- 子弹速度
- 子弹移动间隔
- 导弹速度
- 导弹移动间隔

**效果配置：**
- 爆炸持续时间
- 爆炸动画帧数
- 屏幕震动持续时间
- 屏幕震动强度（最小/最大）

**音频配置：**
- 背景音乐音量
- 音效音量
- 最大同时播放音效数
- 音频对象池大小

**性能配置：**
- 目标帧率
- 最大内存限制
- 内存检查间隔
- 缓存清理阈值

**敌人配置（按类型）：**
- 各类型敌人的血量、速度、攻击力
- 各类型敌人的机炮配置
- 各类型敌人的掉落概率
- 精英怪/Boss/最终Boss 倍率

**关卡配置：**
- 各关卡敌人类型
- 各关卡敌人总数
- 各关卡生成速率
- 各关卡 Boss 类型

6.6.2 THE Game_Manager SHALL 提供"恢复默认值"按钮
6.6.3 THE Game_Manager SHALL 在修改参数时显示与默认值的差异
6.6.4 THE Game_Manager SHALL 提供参数导出/导入功能（JSON 格式）

---

## 需求 7：SEO 与元数据管理（SEO Management）

**用户故事：** 作为网站管理员，我希望能够配置网站的 SEO 信息，以便提升网站在搜索引擎中的排名。

### 验收标准

#### 7.1 页面 Meta 配置
7.1.1 THE SEO_Manager SHALL 提供各页面标题（title）配置
7.1.2 THE SEO_Manager SHALL 提供各页面描述（description）配置
7.1.3 THE SEO_Manager SHALL 提供关键词（keywords）配置
7.1.4 THE SEO_Manager SHALL 提供 Open Graph 标签配置（og:title, og:description, og:image）

#### 7.2 结构化数据
7.2.1 THE SEO_Manager SHALL 提供 Person Schema 配置
7.2.2 THE SEO_Manager SHALL 提供 WebSite Schema 配置
7.2.3 THE SEO_Manager SHALL 提供面包屑导航 Schema 配置

#### 7.3 Sitemap 管理
7.3.1 THE SEO_Manager SHALL 提供自动生成 sitemap.xml 功能
7.3.2 THE SEO_Manager SHALL 提供页面优先级配置
7.3.3 THE SEO_Manager SHALL 提供更新频率配置

#### 7.4 Robots.txt 配置
7.4.1 THE SEO_Manager SHALL 提供 robots.txt 编辑功能
7.4.2 THE SEO_Manager SHALL 提供常用规则模板

---

## 非功能性需求

### 性能要求
- 后端 API 响应时间 < 500ms
- 页面加载时间 < 3s
- 后端内存占用 < 500MB
- 数据库文件大小 < 100MB

### 安全要求
- 所有 API 接口需要认证
- 敏感操作需要二次确认
- 密码使用 bcrypt 加密存储
- 防止 SQL 注入和 XSS 攻击

### 兼容性要求
- 支持 Chrome、Firefox、Edge 最新版本
- 支持 1024px 以上屏幕宽度
- 后端兼容 Ubuntu 24.04 系统

### 可维护性要求
- 代码遵循 ESLint 规范
- 关键功能有单元测试覆盖
- 提供 API 文档

---

## 技术栈

### 后端
- 运行时：Node.js 20 LTS
- 框架：Express.js
- 数据库：SQLite + better-sqlite3
- 认证：JWT (jsonwebtoken)
- 文件处理：multer, sharp

### 前端（后台界面）
- 框架：Vue 3 + TypeScript
- UI 组件库：Element Plus
- 图表：ECharts
- 构建工具：Vite

### 部署
- Web 服务器：Nginx
- 进程管理：PM2
- SSL：Let's Encrypt

