/**
 * 数据看板控制器模块
 * 处理 /api/dashboard/* 路由的请求
 * 
 * 需求: 2.1.1 - 显示今日/本周/本月访问量（PV/UV）
 * 需求: 2.1.2 - 显示留言总数和未读留言数
 * 需求: 2.1.3 - 显示简历下载次数
 * 需求: 2.1.4 - 显示彩蛋游戏触发次数和通关次数
 * 需求: 2.2.1 - 使用折线图展示访问趋势
 * 需求: 2.2.2 - 使用饼图展示页面访问分布
 * 需求: 2.2.3 - 使用柱状图展示访客来源分析
 * 需求: 2.3.1 - 显示最近 10 条访问记录列表
 */

import { Request, Response } from 'express'
import {
  getOverviewStats,
  getVisitTrend,
  getPageDistribution,
  getSourceAnalysis,
  getRecentVisits,
  recordVisit,
  VisitData
} from '../services/statistics'

/**
 * 获取统计数据概览
 * GET /api/dashboard/stats
 * 
 * 响应: { pv, uv, messages, downloads, game }
 */
export async function getStatsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const stats = getOverviewStats()
    res.json(stats)
  } catch (error) {
    console.error('获取统计数据错误:', error)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
}

/**
 * 获取访问趋势
 * GET /api/dashboard/visits/trend
 * 
 * 查询参数: period (day|week|month), days (number)
 * 响应: { data: [{date, pv, uv}] }
 */
export async function getVisitTrendHandler(req: Request, res: Response): Promise<void> {
  try {
    const period = (req.query.period as 'day' | 'week' | 'month') || 'day'
    const days = parseInt(req.query.days as string) || 30

    // 验证参数
    if (!['day', 'week', 'month'].includes(period)) {
      res.status(400).json({ code: 400, message: '无效的时间段参数' })
      return
    }

    const data = getVisitTrend(period, days)
    res.json({ data })
  } catch (error) {
    console.error('获取访问趋势错误:', error)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
}

/**
 * 获取页面访问分布
 * GET /api/dashboard/visits/pages
 * 
 * 查询参数: days (number)
 * 响应: { data: [{page, count}] }
 */
export async function getPageDistributionHandler(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30
    const data = getPageDistribution(days)
    res.json({ data })
  } catch (error) {
    console.error('获取页面分布错误:', error)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
}

/**
 * 获取来源分析
 * GET /api/dashboard/visits/sources
 * 
 * 查询参数: days (number)
 * 响应: { devices, browsers }
 */
export async function getSourceAnalysisHandler(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30
    const data = getSourceAnalysis(days)
    res.json(data)
  } catch (error) {
    console.error('获取来源分析错误:', error)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
}

/**
 * 获取最近访问记录
 * GET /api/dashboard/visits/recent
 * 
 * 查询参数: limit (number)
 * 响应: { data: [Visit] }
 */
export async function getRecentVisitsHandler(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const data = getRecentVisits(limit)
    res.json({ data })
  } catch (error) {
    console.error('获取最近访问错误:', error)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
}

/**
 * 记录访问（供前端调用）
 * POST /api/dashboard/visits
 * 
 * 请求体: { page, ip, userAgent, deviceType, browser, referrer, sessionId }
 * 响应: { success: true, id }
 */
export async function recordVisitHandler(req: Request, res: Response): Promise<void> {
  try {
    const visitData: VisitData = {
      page: req.body.page,
      ip: req.body.ip || req.ip,
      userAgent: req.body.userAgent || req.headers['user-agent'],
      deviceType: req.body.deviceType,
      browser: req.body.browser,
      referrer: req.body.referrer || req.headers.referer,
      sessionId: req.body.sessionId
    }

    // 验证必填字段
    if (!visitData.page) {
      res.status(400).json({ code: 400, message: '缺少页面参数' })
      return
    }

    const id = recordVisit(visitData)
    res.json({ success: true, id })
  } catch (error) {
    console.error('记录访问错误:', error)
    res.status(500).json({ code: 500, message: '服务器内部错误' })
  }
}
