/**
 * 数据看板路由模块
 * 注册所有数据看板相关路由
 * 
 * 路由列表:
 * - GET /stats - 获取统计数据概览
 * - GET /visits/trend - 获取访问趋势
 * - GET /visits/pages - 获取页面访问分布
 * - GET /visits/sources - 获取来源分析
 * - GET /visits/recent - 获取最近访问记录
 * - POST /visits - 记录访问（公开接口）
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  getStatsHandler,
  getVisitTrendHandler,
  getPageDistributionHandler,
  getSourceAnalysisHandler,
  getRecentVisitsHandler,
  recordVisitHandler
} from '../controllers/dashboard'

const router = Router()

/**
 * GET /stats
 * 获取统计数据概览
 * 需要认证: 是
 */
router.get('/stats', authMiddleware, getStatsHandler)

/**
 * GET /visits/trend
 * 获取访问趋势
 * 需要认证: 是
 */
router.get('/visits/trend', authMiddleware, getVisitTrendHandler)

/**
 * GET /visits/pages
 * 获取页面访问分布
 * 需要认证: 是
 */
router.get('/visits/pages', authMiddleware, getPageDistributionHandler)

/**
 * GET /visits/sources
 * 获取来源分析
 * 需要认证: 是
 */
router.get('/visits/sources', authMiddleware, getSourceAnalysisHandler)

/**
 * GET /visits/recent
 * 获取最近访问记录
 * 需要认证: 是
 */
router.get('/visits/recent', authMiddleware, getRecentVisitsHandler)

/**
 * POST /visits
 * 记录访问（公开接口，供前端网站调用）
 * 需要认证: 否
 */
router.post('/visits', recordVisitHandler)

export default router
