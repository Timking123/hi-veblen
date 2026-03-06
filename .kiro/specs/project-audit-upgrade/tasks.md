# 实现计划：项目审计与升级

## 概述

本计划将项目审计中发现的问题修复和升级需求分解为可执行的编码任务。任务按优先级排序，P0 问题优先修复，然后是 P1 安全和性能优化，最后是 P2 基础设施完善。

## 任务

- [x] 1. 实现游戏结束触发机制
  - [x] 1.1 修改 PlayerAircraft 添加死亡回调
    - 在 `src/game/entities/PlayerAircraft.ts` 中添加 `onDeathCallback` 属性
    - 添加 `setOnDeath(callback)` 方法
    - 修改 `die()` 方法，移除 TODO 注释，调用回调
    - _Requirements: 1.1_

  - [x] 1.2 修改 GameEngine 添加游戏结束流程
    - 在 `src/game/GameEngine.ts` 中添加 `onGameOverCallback` 和 `triggerGameOver()` 方法
    - `triggerGameOver()` 中调用 `stop()` 停止游戏循环
    - 在玩家创建时注册死亡回调，连接到 `triggerGameOver()`
    - 使用 try-catch 包裹回调调用，异常时仍确保游戏停止
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.3 编写游戏结束属性测试
    - **Property 1: 玩家死亡触发游戏结束**
    - **Validates: Requirements 1.1**

- [x] 2. 实现四叉树碰撞检测
  - [x] 2.1 创建 Quadtree 类
    - 创建 `src/game/Quadtree.ts`
    - 实现 `clear()`、`insert(entity)`、`getPotentialCollisions()` 和 `query(bounds)` 方法
    - 配置 maxEntities=4、maxLevel=5
    - 实现节点分裂和实体分配逻辑
    - _Requirements: 2.1, 2.3_

  - [x] 2.2 集成四叉树到 GameEngine
    - 修改 `src/game/GameEngine.ts` 的 `checkCollisions()` 方法
    - 每帧构建四叉树，插入所有活跃实体
    - 使用 `getPotentialCollisions()` 获取候选碰撞对
    - 保留现有的碰撞处理逻辑（玩家受伤、导弹爆炸等）
    - _Requirements: 2.1, 2.3, 2.4_

  - [x] 2.3 编写四叉树碰撞检测属性测试
    - **Property 2: 四叉树与暴力算法碰撞结果一致**
    - **Validates: Requirements 2.1, 2.3, 2.4**

- [x] 3. 检查点 - 游戏引擎修复
  - 确保所有测试通过，如有问题请询问用户。

- [x] 4. 实现 API 请求限流
  - [x] 4.1 安装 express-rate-limit 依赖
    - 在 `src/admin/backend/` 下安装 `express-rate-limit` 包
    - _Requirements: 4.1_

  - [x] 4.2 创建限流中间件
    - 创建 `src/admin/backend/src/middleware/rateLimit.ts`
    - 实现 `generalLimiter`（15分钟/100次）和 `loginLimiter`（15分钟/5次）
    - 配置 `standardHeaders: true` 以输出 X-RateLimit-* 响应头
    - 配置自定义错误消息（中文）
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.3 集成限流中间件到 Express 应用
    - 在 `src/admin/backend/src/app.ts` 中注册 `generalLimiter` 到全局路由
    - 在登录路由上单独注册 `loginLimiter`
    - _Requirements: 4.1, 4.2_

  - [x] 4.4 编写限流属性测试
    - **Property 3: 请求限流正确性**
    - **Property 4: 限流响应头完整性**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 5. 加固生产环境 CORS 配置
  - [x] 5.1 修改 CORS 配置
    - 修改 `src/admin/backend/src/app.ts` 中的 `corsOptions`
    - 生产环境使用 `origin` 回调函数验证白名单
    - CORS_ORIGIN 未设置时拒绝所有跨域请求并记录警告
    - 未授权域名返回错误
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.2 编写 CORS 验证属性测试
    - **Property 5: CORS 域名白名单验证**
    - **Validates: Requirements 5.1, 5.3**

- [x] 6. 加固文件上传安全
  - [x] 6.1 增强文件类型验证
    - 在 `src/admin/backend/src/services/file.ts` 中添加 Magic Bytes 签名表
    - 实现 `validateMagicBytes(buffer, expectedType)` 函数
    - 在 `isValidImageFile`、`isValidAudioFile`、`isPdfFile` 中集成 Magic Bytes 验证
    - 添加文件大小限制常量（图片 10MB、音频 50MB、简历 20MB）
    - 不匹配时记录安全警告日志
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 编写文件验证属性测试
    - **Property 6: 文件类型双重验证**
    - **Property 7: 文件大小限制**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 7. 检查点 - 安全加固
  - 确保所有测试通过，如有问题请询问用户。

- [x] 8. 实现 SQLite 数据库自动备份
  - [x] 8.1 创建备份服务
    - 创建 `src/admin/backend/src/services/backup.ts`
    - 实现 `BackupSystem` 类，包含 `start()`、`stop()`、`createBackup()`、`listBackups()` 方法
    - 实现 `cleanOldBackups()` 保留最近 7 个备份
    - 备份文件命名格式：`admin_YYYY-MM-DD_HHmmss.db`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 8.2 添加备份 API 路由
    - 在 `src/admin/backend/src/routes/` 下添加备份路由
    - `POST /api/backup/create` - 手动触发备份
    - `GET /api/backup/list` - 获取备份列表
    - _Requirements: 7.5_

  - [x] 8.3 集成备份系统到应用启动
    - 在 `src/admin/backend/src/app.ts` 的 `startServer()` 中启动备份定时器
    - 在优雅关闭时停止备份定时器
    - _Requirements: 7.1_

  - [x] 8.4 编写备份系统属性测试
    - **Property 8: 备份文件数量上限**
    - **Validates: Requirements 7.2**

- [x] 9. 实现结构化日志系统
  - [x] 9.1 创建 Logger 工具类
    - 创建 `src/admin/backend/src/utils/logger.ts`
    - 实现 `Logger` 类，支持 debug/info/warn/error 四个级别
    - 输出 JSON 格式日志，包含 timestamp、level、module、message 字段
    - 实现日志级别过滤（通过环境变量 LOG_LEVEL 配置）
    - 实现日志文件写入（按日期轮转，单文件最大 10MB）
    - 实现过期日志清理（超过 30 天自动删除）
    - 导出 `createLogger(module)` 工厂函数
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 9.2 替换现有 console.log 调用
    - 在后端关键模块中使用 Logger 替换 console.log/warn/error
    - 至少覆盖：app.ts、认证模块、文件服务、备份服务
    - _Requirements: 8.1_

  - [x] 9.3 编写日志系统属性测试
    - **Property 9: 日志格式正确性**
    - **Property 10: 日志级别过滤**
    - **Validates: Requirements 8.1, 8.2**

- [x] 10. 检查点 - 后端基础设施
  - 确保所有测试通过，如有问题请询问用户。

- [x] 11. 实现 Dashboard 图表组件
  - [x] 11.1 添加后端 Dashboard API
    - 在 `src/admin/backend/src/routes/` 下添加或扩展 dashboard 路由
    - 实现 `GET /api/dashboard/trend?period=7d|30d` 返回访问趋势数据
    - 实现 `GET /api/dashboard/content-stats` 返回内容分类统计
    - 实现 `GET /api/dashboard/recent-visits?limit=10` 返回最近访问记录
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 11.2 创建 TrendChart 组件
    - 创建 `src/admin/frontend/src/components/dashboard/TrendChart.vue`
    - 使用 ECharts 渲染折线图
    - 支持 7 天和 30 天切换
    - 实现加载中骨架屏和错误重试
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 11.3 创建 PieChart 组件
    - 创建 `src/admin/frontend/src/components/dashboard/PieChart.vue`
    - 使用 ECharts 渲染饼图
    - 实现加载中骨架屏和错误重试
    - _Requirements: 3.2, 3.4, 3.5_

  - [x] 11.4 创建 RecentVisits 组件
    - 创建 `src/admin/frontend/src/components/dashboard/RecentVisits.vue`
    - 使用 Element Plus Table 渲染访问记录列表
    - 显示访问时间、页面路径和来源
    - 实现加载中骨架屏和错误重试
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 11.5 集成图表组件到 Dashboard 页面
    - 更新 `src/admin/frontend/src/components/dashboard/index.ts` 导出新组件
    - 在 Dashboard 页面中引入并布局三个新组件
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 12. 实现游戏组件 prefers-reduced-motion 支持
  - [x] 12.1 修改 EffectSystem 支持 reducedMotion
    - 在 `src/game/EffectSystem.ts` 中添加 `reducedMotion` 属性和 `setReducedMotion()` 方法
    - 在 `triggerScreenShake()` 中检查 `reducedMotion`，为 true 时直接返回
    - _Requirements: 9.1_

  - [x] 12.2 修改 PageCollapseAnimation 支持简化动画
    - 在 `src/components/game/PageCollapseAnimation.vue` 中检测 `prefers-reduced-motion`
    - 启用时使用简单淡出（opacity 过渡到黑屏）替代复杂的碎片化+融化+撕裂动画
    - _Requirements: 9.2_

  - [x] 12.3 修改 CelebrationPage 减少动画
    - 在 `src/components/game/CelebrationPage.vue` 的 `<style>` 中添加 `@media (prefers-reduced-motion: reduce)` 规则
    - 禁用气球浮动动画、背景色相变化、蜡烛闪烁等
    - _Requirements: 9.3_

  - [x] 12.4 编写 reducedMotion 属性测试
    - **Property 11: reducedMotion 禁用屏幕震动**
    - **Validates: Requirements 9.1**

- [x] 13. 检查点 - 前端功能完善
  - 确保所有测试通过，如有问题请询问用户。

- [x] 14. 修复 Spec 任务状态同步
  - [x] 14.1 修复 game-v2-upgrade 任务状态
    - 将 `.kiro/specs/game-v2-upgrade/tasks.md` 中任务 27 和 28 的父任务标记为 `[x]`
    - _Requirements: 10.1_

  - [x] 14.2 修复 contact-page-update 任务状态
    - 将 `.kiro/specs/contact-page-update/tasks.md` 中任务 1、2、4、5 的父任务标记为 `[x]`
    - _Requirements: 10.2_

  - [x] 14.3 修复 easter-egg-game 任务状态
    - 审查 `.kiro/specs/easter-egg-game/tasks.md` 中每个任务
    - 根据 `src/game/`、`src/components/game/`、`src/composables/` 中的实际代码实现情况
    - 将已实现功能对应的任务标记为 `[x]`
    - _Requirements: 10.3_

- [x] 15. 最终检查点 - 确保所有修改完成
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 所有任务均为必需任务，包括属性测试
- 每个任务都引用了具体的需求以便追溯
- 检查点确保增量验证
- 属性测试验证通用正确性属性（共 11 个）
- 单元测试验证具体示例和边界情况
