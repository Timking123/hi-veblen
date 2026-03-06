# 需求文档：项目审计与升级

## 简介

本文档定义了对 Vue 3 + TypeScript 个人求职网站项目进行全面审计后发现的问题修复和升级需求。项目包含前端主站（Vue 3 Portfolio）、后端管理系统（Express.js + SQLite）和彩蛋游戏系统（Canvas 像素风格飞机大战）。审计覆盖功能完整性、安全性、性能、代码质量和用户体验五个维度。

## 术语表

- **Portfolio_Frontend**（前端主站）：基于 Vue 3 + TypeScript 的个人求职展示网站
- **Admin_Backend**（管理后端）：基于 Express.js + SQLite 的后台管理系统服务端
- **Admin_Frontend**（管理前端）：基于 Vue 3 + Element Plus 的后台管理系统前端
- **Game_Engine**（游戏引擎）：基于 Canvas 的像素风格飞机大战游戏核心引擎
- **Collision_Detector**（碰撞检测器）：负责游戏中实体间碰撞检测的模块
- **Dashboard**（数据看板）：管理后台的数据统计和可视化面板
- **Rate_Limiter**（请求限流器）：限制 API 请求频率的中间件
- **Backup_System**（备份系统）：SQLite 数据库自动备份机制
- **CORS**（跨域资源共享）：控制浏览器跨域请求的安全机制
- **Quadtree**（四叉树）：一种空间分区数据结构，用于优化碰撞检测

## 需求

### 需求 1：游戏结束触发机制

**用户故事：** 作为玩家，我希望当飞机血量归零时游戏正确结束，以便获得完整的游戏体验。

#### 验收标准

1. WHEN 玩家飞机血量降至零, THE Game_Engine SHALL 触发游戏结束流程并显示结算界面
2. WHEN 游戏结束流程触发, THE Game_Engine SHALL 停止游戏循环、保存分数并展示最终得分
3. IF 游戏结束流程中发生异常, THEN THE Game_Engine SHALL 记录错误日志并安全地停止游戏循环

### 需求 2：碰撞检测性能优化

**用户故事：** 作为玩家，我希望游戏在大量实体同时存在时仍保持流畅，以便获得良好的游戏体验。

#### 验收标准

1. THE Collision_Detector SHALL 使用空间分区算法（四叉树）替代当前的 O(n²) 遍历算法
2. WHEN 屏幕上存在超过 50 个活跃实体时, THE Collision_Detector SHALL 在单帧内完成碰撞检测且耗时低于 2 毫秒
3. WHEN 实体位置更新后, THE Collision_Detector SHALL 重新构建四叉树以反映最新的实体分布
4. THE Collision_Detector 的四叉树实现 SHALL 产生与原 O(n²) 算法完全一致的碰撞检测结果

### 需求 3：Dashboard 图表组件

**用户故事：** 作为管理员，我希望在数据看板中查看趋势图表和统计分析，以便更好地了解网站运营状况。

#### 验收标准

1. THE Dashboard SHALL 展示访问趋势折线图（TrendChart），包含最近 7 天和 30 天的访问数据
2. THE Dashboard SHALL 展示内容分类饼图（PieChart），显示各类内容的占比
3. THE Dashboard SHALL 展示最近访问记录列表（RecentVisits），包含访问时间、页面路径和来源信息
4. WHEN 数据加载中, THE Dashboard SHALL 显示骨架屏占位符
5. IF 图表数据获取失败, THEN THE Dashboard SHALL 显示错误提示并提供重试按钮

### 需求 4：API 请求限流

**用户故事：** 作为系统管理员，我希望后端 API 具备请求频率限制，以防止恶意请求和滥用。

#### 验收标准

1. THE Rate_Limiter SHALL 对每个 IP 地址在 15 分钟窗口内限制最多 100 次通用 API 请求
2. THE Rate_Limiter SHALL 对登录接口在 15 分钟窗口内限制每个 IP 最多 5 次请求
3. WHEN 请求超过频率限制, THE Rate_Limiter SHALL 返回 HTTP 429 状态码和剩余等待时间
4. THE Rate_Limiter SHALL 在响应头中包含 X-RateLimit-Limit、X-RateLimit-Remaining 和 X-RateLimit-Reset 字段

### 需求 5：生产环境 CORS 安全加固

**用户故事：** 作为系统管理员，我希望生产环境的 CORS 配置使用具体域名白名单，以防止未授权的跨域访问。

#### 验收标准

1. WHILE 运行在生产环境, THE Admin_Backend SHALL 仅允许环境变量 CORS_ORIGIN 中配置的域名进行跨域访问
2. WHEN CORS_ORIGIN 环境变量未设置, THE Admin_Backend SHALL 拒绝所有跨域请求并记录警告日志
3. WHEN 收到来自未授权域名的跨域请求, THE Admin_Backend SHALL 返回 HTTP 403 状态码

### 需求 6：文件上传安全加固

**用户故事：** 作为系统管理员，我希望文件上传具备更严格的验证，以防止恶意文件上传。

#### 验收标准

1. THE Admin_Backend SHALL 同时验证文件扩展名和文件内容的 Magic Bytes 以确认文件类型
2. THE Admin_Backend SHALL 限制单个文件上传大小为 10MB（图片）、50MB（音频）和 20MB（简历 PDF）
3. WHEN 上传文件类型不在允许列表中, THE Admin_Backend SHALL 拒绝上传并返回明确的错误信息
4. WHEN 文件内容的 Magic Bytes 与声明的文件类型不匹配, THE Admin_Backend SHALL 拒绝上传并记录安全警告日志

### 需求 7：SQLite 数据库自动备份

**用户故事：** 作为系统管理员，我希望数据库能自动定期备份，以防止数据丢失。

#### 验收标准

1. THE Backup_System SHALL 每 24 小时自动创建一次数据库备份文件
2. THE Backup_System SHALL 保留最近 7 个备份文件，自动删除更早的备份
3. WHEN 备份操作完成, THE Backup_System SHALL 记录备份文件路径和大小到日志
4. IF 备份操作失败, THEN THE Backup_System SHALL 记录错误日志并在下一个备份周期重试
5. THE Backup_System SHALL 提供手动触发备份的 API 接口

### 需求 8：后端日志系统完善

**用户故事：** 作为系统管理员，我希望后端具备结构化的日志系统，以便排查问题和监控系统状态。

#### 验收标准

1. THE Admin_Backend SHALL 使用结构化日志格式（JSON），包含时间戳、日志级别、模块名和消息内容
2. THE Admin_Backend SHALL 支持按日志级别（debug、info、warn、error）过滤输出
3. THE Admin_Backend SHALL 将日志写入按日期轮转的文件中，每个文件最大 10MB
4. WHEN 日志文件超过 30 天, THE Admin_Backend SHALL 自动清理过期的日志文件

### 需求 9：游戏组件 prefers-reduced-motion 支持

**用户故事：** 作为前庭系统敏感的用户，我希望游戏相关的动画在我启用"减少动画"设置时被简化或禁用，以避免不适。

#### 验收标准

1. WHEN 用户启用系统级 prefers-reduced-motion 设置, THE Game_Engine SHALL 禁用屏幕震动效果
2. WHEN 用户启用系统级 prefers-reduced-motion 设置, THE Portfolio_Frontend 的页面崩塌动画（PageCollapseAnimation）SHALL 使用简单的淡出替代
3. WHEN 用户启用系统级 prefers-reduced-motion 设置, THE Portfolio_Frontend 的庆祝页面（CelebrationPage）SHALL 减少粒子效果数量

### 需求 10：Spec 任务状态同步修复

**用户故事：** 作为开发者，我希望所有 spec 的任务状态与实际代码实现保持一致，以便准确追踪项目进度。

#### 验收标准

1. WHEN game-v2-upgrade spec 中任务 27 和 28 的所有子任务已完成, THE 任务管理系统 SHALL 将对应父任务标记为已完成
2. WHEN contact-page-update spec 中任务 1、2、4、5 的所有子任务已完成, THE 任务管理系统 SHALL 将对应父任务标记为已完成
3. WHEN easter-egg-game spec 中的功能已在代码中实现, THE 任务管理系统 SHALL 将对应任务标记为已完成
