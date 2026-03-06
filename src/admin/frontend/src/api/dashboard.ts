/**
 * 数据看板 API 接口
 * 
 * 需求: 2.1.1-2.3.2
 */
import request from './request'
import type { 
  DashboardStats, 
  VisitTrend, 
  PageDistribution, 
  SourceAnalysis, 
  RecentVisit 
} from '@/types'

/**
 * 获取统计数据
 * 包含 PV/UV、留言数、下载数、游戏数据
 * 
 * 需求: 2.1.1-2.1.4
 */
export function getStats() {
  return request.get<DashboardStats>('/dashboard/stats')
}

/**
 * 获取访问趋势数据
 * 
 * @param period - 时间周期：day（按日）、week（按周）、month（按月）
 * 需求: 2.2.1
 */
export function getVisitTrend(period: 'day' | 'week' | 'month' = 'day') {
  return request.get<{ data: VisitTrend[] }>('/dashboard/visits/trend', {
    params: { period }
  })
}

/**
 * 获取页面访问分布数据
 * 
 * 需求: 2.2.2
 */
export function getPageDistribution() {
  return request.get<{ data: PageDistribution[] }>('/dashboard/visits/pages')
}

/**
 * 获取访客来源分析数据
 * 包含设备类型和浏览器分布
 * 
 * 需求: 2.2.3
 */
export function getSourceAnalysis() {
  return request.get<SourceAnalysis>('/dashboard/visits/sources')
}

/**
 * 获取最近访问记录
 * 
 * @param limit - 返回记录数量，默认 10 条
 * 需求: 2.3.1
 */
export function getRecentVisits(limit: number = 10) {
  return request.get<{ data: RecentVisit[] }>('/dashboard/visits/recent', {
    params: { limit }
  })
}

export default {
  getStats,
  getVisitTrend,
  getPageDistribution,
  getSourceAnalysis,
  getRecentVisits
}
