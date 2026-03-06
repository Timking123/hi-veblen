/**
 * 路由汇总模块
 * 注册所有模块路由到统一的路由器
 * 
 * 路由前缀:
 * - /api/auth - 认证模块
 * - /api/dashboard - 数据看板模块
 * - /api/content - 内容管理模块
 * - /api/messages - 留言管理模块
 * - /api/files - 文件管理模块
 * - /api/game - 游戏管理模块
 * - /api/seo - SEO 管理模块
 * 
 * 需求: 1.7 - 提供侧边栏导航，包含六大功能板块入口
 */

import { Router } from 'express'

// 导入各模块路由
import authRouter from './auth'
import dashboardRouter from './dashboard'
import contentRouter from './content'
import messageRouter from './message'
import fileRouter from './file'
import gameRouter from './game'
import seoRouter from './seo'
import backupRouter from './backup'

/**
 * 创建并配置主路由器
 * 将所有模块路由注册到对应的路径前缀
 */
const router = Router()

/**
 * 认证模块路由
 * 处理用户登录、登出、密码修改等
 * 需求: 1.1, 1.2, 1.3
 */
router.use('/auth', authRouter)

/**
 * 数据看板模块路由
 * 处理访问统计、趋势分析等
 * 需求: 2.1.1-2.3.2
 */
router.use('/dashboard', dashboardRouter)

/**
 * 内容管理模块路由
 * 处理个人信息、教育经历、工作经历、技能、项目、校园经历等
 * 需求: 3.1.1-3.7.3
 */
router.use('/content', contentRouter)

/**
 * 留言管理模块路由
 * 处理留言列表、筛选、导出等
 * 需求: 4.1.1-4.4.2
 */
router.use('/messages', messageRouter)

/**
 * 文件管理模块路由
 * 处理文件上传、下载、简历管理、图片处理等
 * 需求: 5.1.1-5.4.4
 */
router.use('/files', fileRouter)

/**
 * 游戏管理模块路由
 * 处理排行榜、成就、游戏配置等
 * 需求: 6.1.1-6.6.4
 */
router.use('/game', gameRouter)

/**
 * SEO 管理模块路由
 * 处理 Meta 配置、结构化数据、Sitemap、robots.txt 等
 * 需求: 7.1.1-7.4.2
 */
router.use('/seo', seoRouter)

/**
 * 备份管理模块路由
 * 处理数据库备份的手动触发和列表查询
 * 需求: 7.5
 */
router.use('/backup', backupRouter)

/**
 * API 健康检查端点
 * 用于监控服务状态
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

export default router
