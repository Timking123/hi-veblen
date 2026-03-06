/**
 * 统计服务模块
 * 提供网站访问统计、留言统计、游戏数据统计等功能
 * 
 * 需求: 2.1.1 - 显示今日/本周/本月访问量（PV/UV）
 * 需求: 2.1.2 - 显示留言总数和未读留言数
 * 需求: 2.1.3 - 显示简历下载次数
 * 需求: 2.1.4 - 显示彩蛋游戏触发次数和通关次数
 */

import { getDatabase, saveDatabase } from '../database/init'

/**
 * 时间段类型
 */
export type TimePeriod = 'today' | 'week' | 'month'

/**
 * PV/UV 统计结果
 */
export interface PVUVStats {
  pv: number
  uv: number
}

/**
 * 概览统计数据
 */
export interface OverviewStats {
  visits: {
    today: PVUVStats
    week: PVUVStats
    month: PVUVStats
  }
  messages: {
    total: number
    unread: number
    read: number
  }
  resume: {
    downloads: number
  }
  game: {
    triggers: number
    completions: number
    players: number
    avgScore: number
    highScore: number
  }
}

/**
 * 留言统计
 */
export interface MessageStats {
  total: number
  unread: number
  read: number
}

/**
 * 游戏统计
 */
export interface GameStats {
  triggers: number
  completions: number
  players: number
  avgScore: number
  highScore: number
}

/**
 * 访问记录数据
 */
export interface VisitData {
  page: string
  ip?: string
  userAgent?: string
  deviceType?: string
  browser?: string
  referrer?: string
  sessionId?: string
}

/**
 * 获取时间段的起始日期
 */
function getPeriodStartDate(period: TimePeriod): string {
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周一为一周开始
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
  }

  return startDate.toISOString()
}

/**
 * 获取指定时间段的 PV/UV
 * PV = 该时间段内的访问记录总数
 * UV = 该时间段内唯一 session_id 的数量
 * 
 * @param period - 时间段
 * @returns PV/UV 统计
 */
export function getPVUV(period: TimePeriod): PVUVStats {
  const db = getDatabase()
  const startDate = getPeriodStartDate(period)

  // 获取 PV（总访问次数）
  const pvResult = db.exec(`
    SELECT COUNT(*) as pv FROM visits 
    WHERE created_at >= ?
  `, [startDate])

  let pv = 0
  if (pvResult.length > 0 && pvResult[0]?.values?.[0]) {
    pv = pvResult[0].values[0][0] as number
  }

  // 获取 UV（唯一访客数，基于 session_id）
  const uvResult = db.exec(`
    SELECT COUNT(DISTINCT session_id) as uv FROM visits 
    WHERE created_at >= ? AND session_id IS NOT NULL
  `, [startDate])

  let uv = 0
  if (uvResult.length > 0 && uvResult[0]?.values?.[0]) {
    uv = uvResult[0].values[0][0] as number
  }

  return { pv, uv }
}

/**
 * 获取留言统计
 * 
 * @returns 留言统计数据
 */
export function getMessageStats(): MessageStats {
  const db = getDatabase()

  // 获取总数
  const totalResult = db.exec('SELECT COUNT(*) as total FROM messages')
  let total = 0
  if (totalResult.length > 0 && totalResult[0]?.values?.[0]) {
    total = totalResult[0].values[0][0] as number
  }

  // 获取未读数
  const unreadResult = db.exec(`SELECT COUNT(*) as unread FROM messages WHERE status = 'unread'`)
  let unread = 0
  if (unreadResult.length > 0 && unreadResult[0]?.values?.[0]) {
    unread = unreadResult[0].values[0][0] as number
  }

  return {
    total,
    unread,
    read: total - unread
  }
}

/**
 * 获取游戏统计
 * 
 * @returns 游戏统计数据
 */
export function getGameStats(): GameStats {
  const db = getDatabase()

  // 从 statistics 表获取触发和通关次数
  const statsResult = db.exec(`
    SELECT game_triggers, game_completions FROM statistics WHERE id = 1
  `)

  let triggers = 0
  let completions = 0
  if (statsResult.length > 0 && statsResult[0]?.values?.[0]) {
    triggers = statsResult[0].values[0][0] as number
    completions = statsResult[0].values[0][1] as number
  }

  // 从排行榜获取玩家数、平均分、最高分
  const leaderboardResult = db.exec(`
    SELECT 
      COUNT(DISTINCT player_name) as players,
      AVG(score) as avg_score,
      MAX(score) as high_score
    FROM game_leaderboard
  `)

  let players = 0
  let avgScore = 0
  let highScore = 0
  if (leaderboardResult.length > 0 && leaderboardResult[0]?.values?.[0]) {
    const row = leaderboardResult[0].values[0]
    players = (row[0] as number) || 0
    avgScore = Math.round((row[1] as number) || 0)
    highScore = (row[2] as number) || 0
  }

  return {
    triggers,
    completions,
    players,
    avgScore,
    highScore
  }
}

/**
 * 获取简历下载次数
 * 
 * @returns 下载次数
 */
export function getResumeDownloads(): number {
  const db = getDatabase()

  const result = db.exec('SELECT resume_downloads FROM statistics WHERE id = 1')
  
  if (result.length > 0 && result[0]?.values?.[0]) {
    return result[0].values[0][0] as number
  }

  return 0
}

/**
 * 获取概览统计数据
 * 
 * @returns 概览统计
 */
export function getOverviewStats(): OverviewStats {
  return {
    visits: {
      today: getPVUV('today'),
      week: getPVUV('week'),
      month: getPVUV('month')
    },
    messages: getMessageStats(),
    resume: {
      downloads: getResumeDownloads()
    },
    game: getGameStats()
  }
}

/**
 * 记录访问
 * 
 * @param visitData - 访问数据
 * @returns 插入的记录 ID
 */
export function recordVisit(visitData: VisitData): number {
  const db = getDatabase()

  db.run(`
    INSERT INTO visits (page, ip, user_agent, device_type, browser, referrer, session_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    visitData.page,
    visitData.ip || null,
    visitData.userAgent || null,
    visitData.deviceType || null,
    visitData.browser || null,
    visitData.referrer || null,
    visitData.sessionId || null
  ])

  saveDatabase()

  // 获取插入的 ID
  const result = db.exec('SELECT last_insert_rowid() as id')
  if (result.length > 0 && result[0]?.values?.[0]) {
    return result[0].values[0][0] as number
  }

  return -1
}

/**
 * 增加简历下载次数
 */
export function incrementResumeDownloads(): void {
  const db = getDatabase()

  db.run(`
    UPDATE statistics 
    SET resume_downloads = resume_downloads + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `)

  saveDatabase()
}

/**
 * 增加游戏触发次数
 */
export function incrementGameTriggers(): void {
  const db = getDatabase()

  db.run(`
    UPDATE statistics 
    SET game_triggers = game_triggers + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `)

  saveDatabase()
}

/**
 * 增加游戏通关次数
 */
export function incrementGameCompletions(): void {
  const db = getDatabase()

  db.run(`
    UPDATE statistics 
    SET game_completions = game_completions + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `)

  saveDatabase()
}


/**
 * 访问趋势数据点
 */
export interface TrendDataPoint {
  date: string
  pv: number
  uv: number
}

/**
 * 页面访问分布
 */
export interface PageDistribution {
  page: string
  count: number
  percentage: number
}

/**
 * 设备类型分布
 */
export interface DeviceDistribution {
  deviceType: string
  count: number
  percentage: number
}

/**
 * 浏览器分布
 */
export interface BrowserDistribution {
  browser: string
  count: number
  percentage: number
}

/**
 * 来源分析结果
 */
export interface SourceAnalysis {
  devices: DeviceDistribution[]
  browsers: BrowserDistribution[]
}

/**
 * 获取访问趋势数据
 * 需求: 2.2.1 - 使用折线图展示访问趋势（支持按日/周/月切换）
 * 
 * @param period - 时间段类型
 * @param days - 返回的数据点数量（默认 30 天）
 * @returns 趋势数据数组
 */
export function getVisitTrend(period: 'day' | 'week' | 'month', days: number = 30): TrendDataPoint[] {
  const db = getDatabase()
  const result: TrendDataPoint[] = []

  if (period === 'day') {
    // 按天聚合
    const trendResult = db.exec(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as pv,
        COUNT(DISTINCT session_id) as uv
      FROM visits
      WHERE created_at >= DATE('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)

    if (trendResult.length > 0 && trendResult[0]?.values) {
      for (const row of trendResult[0].values) {
        result.push({
          date: row[0] as string,
          pv: row[1] as number,
          uv: row[2] as number
        })
      }
    }
  } else if (period === 'week') {
    // 按周聚合
    const trendResult = db.exec(`
      SELECT 
        strftime('%Y-W%W', created_at) as date,
        COUNT(*) as pv,
        COUNT(DISTINCT session_id) as uv
      FROM visits
      WHERE created_at >= DATE('now', '-${days * 7} days')
      GROUP BY strftime('%Y-W%W', created_at)
      ORDER BY date ASC
    `)

    if (trendResult.length > 0 && trendResult[0]?.values) {
      for (const row of trendResult[0].values) {
        result.push({
          date: row[0] as string,
          pv: row[1] as number,
          uv: row[2] as number
        })
      }
    }
  } else {
    // 按月聚合
    const trendResult = db.exec(`
      SELECT 
        strftime('%Y-%m', created_at) as date,
        COUNT(*) as pv,
        COUNT(DISTINCT session_id) as uv
      FROM visits
      WHERE created_at >= DATE('now', '-${days * 30} days')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY date ASC
    `)

    if (trendResult.length > 0 && trendResult[0]?.values) {
      for (const row of trendResult[0].values) {
        result.push({
          date: row[0] as string,
          pv: row[1] as number,
          uv: row[2] as number
        })
      }
    }
  }

  return result
}

/**
 * 获取页面访问分布
 * 需求: 2.2.2 - 使用饼图展示页面访问分布
 * 
 * @param days - 统计的天数（默认 30 天）
 * @returns 页面分布数组
 */
export function getPageDistribution(days: number = 30): PageDistribution[] {
  const db = getDatabase()
  const result: PageDistribution[] = []

  // 获取总访问数
  const totalResult = db.exec(`
    SELECT COUNT(*) as total FROM visits
    WHERE created_at >= DATE('now', '-${days} days')
  `)

  let total = 0
  if (totalResult.length > 0 && totalResult[0]?.values?.[0]) {
    total = totalResult[0].values[0][0] as number
  }

  if (total === 0) {
    return result
  }

  // 获取各页面访问数
  const pageResult = db.exec(`
    SELECT page, COUNT(*) as count
    FROM visits
    WHERE created_at >= DATE('now', '-${days} days')
    GROUP BY page
    ORDER BY count DESC
  `)

  if (pageResult.length > 0 && pageResult[0]?.values) {
    for (const row of pageResult[0].values) {
      const count = row[1] as number
      result.push({
        page: row[0] as string,
        count,
        percentage: Math.round((count / total) * 100 * 10) / 10
      })
    }
  }

  return result
}

/**
 * 获取来源分析（设备类型和浏览器）
 * 需求: 2.2.3 - 使用柱状图展示访客来源分析（设备类型、浏览器）
 * 
 * @param days - 统计的天数（默认 30 天）
 * @returns 来源分析结果
 */
export function getSourceAnalysis(days: number = 30): SourceAnalysis {
  const db = getDatabase()

  // 获取总访问数
  const totalResult = db.exec(`
    SELECT COUNT(*) as total FROM visits
    WHERE created_at >= DATE('now', '-${days} days')
  `)

  let total = 0
  if (totalResult.length > 0 && totalResult[0]?.values?.[0]) {
    total = totalResult[0].values[0][0] as number
  }

  // 设备类型分布
  const devices: DeviceDistribution[] = []
  const deviceResult = db.exec(`
    SELECT 
      COALESCE(device_type, 'unknown') as device_type, 
      COUNT(*) as count
    FROM visits
    WHERE created_at >= DATE('now', '-${days} days')
    GROUP BY device_type
    ORDER BY count DESC
  `)

  if (deviceResult.length > 0 && deviceResult[0]?.values) {
    for (const row of deviceResult[0].values) {
      const count = row[1] as number
      devices.push({
        deviceType: row[0] as string,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0
      })
    }
  }

  // 浏览器分布
  const browsers: BrowserDistribution[] = []
  const browserResult = db.exec(`
    SELECT 
      COALESCE(browser, 'unknown') as browser, 
      COUNT(*) as count
    FROM visits
    WHERE created_at >= DATE('now', '-${days} days')
    GROUP BY browser
    ORDER BY count DESC
  `)

  if (browserResult.length > 0 && browserResult[0]?.values) {
    for (const row of browserResult[0].values) {
      const count = row[1] as number
      browsers.push({
        browser: row[0] as string,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0
      })
    }
  }

  return { devices, browsers }
}

/**
 * 最近访问记录
 */
export interface RecentVisit {
  id: number
  page: string
  ip: string | null
  deviceType: string | null
  browser: string | null
  createdAt: string
}

/**
 * 将 SQLite CURRENT_TIMESTAMP 时间转换为北京时间（UTC+8）
 * 
 * SQLite 的 CURRENT_TIMESTAMP 返回的是 UTC 时间，格式为 'YYYY-MM-DD HH:MM:SS'
 * 需要将其转换为北京时间显示
 * 
 * @param utcTimeStr - SQLite 返回的 UTC 时间字符串
 * @returns 北京时间字符串
 */
function toBeijingTime(utcTimeStr: string): string {
  try {
    if (!utcTimeStr) {
      return '-'
    }
    
    // SQLite CURRENT_TIMESTAMP 返回格式: 'YYYY-MM-DD HH:MM:SS' (UTC 时间)
    // 需要明确告诉 JavaScript 这是 UTC 时间
    // 方法：在时间字符串后添加 'Z' 或 '+00:00' 表示 UTC
    const utcTimeWithZ = utcTimeStr.includes('Z') || utcTimeStr.includes('+') 
      ? utcTimeStr 
      : utcTimeStr.replace(' ', 'T') + 'Z'
    
    const utcDate = new Date(utcTimeWithZ)
    if (isNaN(utcDate.getTime())) {
      return utcTimeStr // 如果解析失败，返回原始字符串
    }
    
    // 添加 8 小时偏移量转换为北京时间
    const beijingDate = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000)
    
    // 格式化为 YYYY-MM-DD HH:mm:ss
    const year = beijingDate.getUTCFullYear()
    const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(beijingDate.getUTCDate()).padStart(2, '0')
    const hours = String(beijingDate.getUTCHours()).padStart(2, '0')
    const minutes = String(beijingDate.getUTCMinutes()).padStart(2, '0')
    const seconds = String(beijingDate.getUTCSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return utcTimeStr // 出错时返回原始字符串
  }
}

/**
 * 获取最近访问记录
 * 需求: 2.3.1 - 显示最近 10 条访问记录列表
 * 
 * @param limit - 返回的记录数（默认 10）
 * @returns 最近访问记录数组（时间已转换为北京时间）
 */
export function getRecentVisits(limit: number = 10): RecentVisit[] {
  const db = getDatabase()
  const result: RecentVisit[] = []

  const visitsResult = db.exec(`
    SELECT id, page, ip, device_type, browser, created_at
    FROM visits
    ORDER BY created_at DESC
    LIMIT ?
  `, [limit])

  if (visitsResult.length > 0 && visitsResult[0]?.values) {
    for (const row of visitsResult[0].values) {
      result.push({
        id: row[0] as number,
        page: row[1] as string,
        ip: row[2] as string | null,
        deviceType: row[3] as string | null,
        browser: row[4] as string | null,
        createdAt: toBeijingTime(row[5] as string) // 转换为北京时间
      })
    }
  }

  return result
}
