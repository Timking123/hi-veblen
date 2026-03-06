/**
 * 统计服务单元测试
 * 测试 PV/UV 计算、留言统计、游戏统计等功能
 * 
 * 验证需求: 2.1.1, 2.1.2, 2.1.3, 2.1.4
 */

import { initDatabase, getDatabase, closeDatabase, resetDatabase } from '../../database/init'
import {
  getPVUV,
  getMessageStats,
  getResumeDownloads,
  getGameStats,
  getOverviewStats,
  recordVisit,
  getRecentVisits,
  incrementResumeDownloads,
  incrementGameTriggers,
  incrementGameCompletions,
  getPeriodStartDate,
  TimePeriod
} from '../statistics'

describe('统计服务 (Statistics Service)', () => {
  // 在所有测试前初始化数据库
  beforeAll(async () => {
    await initDatabase(':memory:')
  })

  // 在每个测试前重置数据库
  beforeEach(() => {
    resetDatabase()
  })

  // 在所有测试后关闭数据库
  afterAll(() => {
    closeDatabase()
  })

  describe('getPeriodStartDate - 获取时间段起始日期', () => {
    it('应该返回今天的起始时间', () => {
      const startDate = getPeriodStartDate('today')
      const parsed = new Date(startDate)
      const now = new Date()
      
      expect(parsed.getFullYear()).toBe(now.getFullYear())
      expect(parsed.getMonth()).toBe(now.getMonth())
      expect(parsed.getDate()).toBe(now.getDate())
      expect(parsed.getHours()).toBe(0)
      expect(parsed.getMinutes()).toBe(0)
      expect(parsed.getSeconds()).toBe(0)
    })

    it('应该返回本周一的起始时间', () => {
      const startDate = getPeriodStartDate('week')
      const parsed = new Date(startDate)
      
      // 周一的 getDay() 应该是 1（除非是周日，那就是上周一）
      const dayOfWeek = parsed.getDay()
      expect(dayOfWeek).toBe(1) // 周一
    })

    it('应该返回本月 1 日的起始时间', () => {
      const startDate = getPeriodStartDate('month')
      const parsed = new Date(startDate)
      const now = new Date()
      
      expect(parsed.getFullYear()).toBe(now.getFullYear())
      expect(parsed.getMonth()).toBe(now.getMonth())
      expect(parsed.getDate()).toBe(1)
    })
  })

  describe('getPVUV - 获取 PV/UV 统计', () => {
    it('空数据库应该返回 PV=0, UV=0', () => {
      const stats = getPVUV('today')
      
      expect(stats.pv).toBe(0)
      expect(stats.uv).toBe(0)
    })

    it('应该正确计算 PV（访问记录总数）', () => {
      // 插入 3 条访问记录
      recordVisit({ page: '/home', sessionId: 'session1' })
      recordVisit({ page: '/about', sessionId: 'session1' })
      recordVisit({ page: '/contact', sessionId: 'session2' })
      
      const stats = getPVUV('today')
      
      expect(stats.pv).toBe(3)
    })

    it('应该正确计算 UV（唯一 session_id 数量）', () => {
      // 插入访问记录，2 个不同的 session
      recordVisit({ page: '/home', sessionId: 'session1' })
      recordVisit({ page: '/about', sessionId: 'session1' })
      recordVisit({ page: '/contact', sessionId: 'session2' })
      
      const stats = getPVUV('today')
      
      expect(stats.uv).toBe(2)
    })

    it('没有 session_id 的记录应该各自计为独立访客', () => {
      // 插入没有 session_id 的记录
      recordVisit({ page: '/home' })
      recordVisit({ page: '/about' })
      
      const stats = getPVUV('today')
      
      expect(stats.pv).toBe(2)
      expect(stats.uv).toBe(2) // 每条记录视为独立访客
    })

    it('应该支持不同时间段的统计', () => {
      // 插入访问记录
      recordVisit({ page: '/home', sessionId: 'session1' })
      
      const todayStats = getPVUV('today')
      const weekStats = getPVUV('week')
      const monthStats = getPVUV('month')
      
      // 今天的记录应该在所有时间段都能统计到
      expect(todayStats.pv).toBe(1)
      expect(weekStats.pv).toBe(1)
      expect(monthStats.pv).toBe(1)
    })
  })

  describe('getMessageStats - 获取留言统计', () => {
    it('空数据库应该返回全部为 0', () => {
      const stats = getMessageStats()
      
      expect(stats.total).toBe(0)
      expect(stats.unread).toBe(0)
      expect(stats.read).toBe(0)
    })

    it('应该正确统计留言数量', () => {
      const db = getDatabase()
      
      // 插入留言
      db.run(`INSERT INTO messages (nickname, contact, content, status) VALUES (?, ?, ?, ?)`,
        ['张三', 'zhangsan@test.com', '测试留言1', 'unread'])
      db.run(`INSERT INTO messages (nickname, contact, content, status) VALUES (?, ?, ?, ?)`,
        ['李四', 'lisi@test.com', '测试留言2', 'unread'])
      db.run(`INSERT INTO messages (nickname, contact, content, status) VALUES (?, ?, ?, ?)`,
        ['王五', 'wangwu@test.com', '测试留言3', 'read'])
      
      const stats = getMessageStats()
      
      expect(stats.total).toBe(3)
      expect(stats.unread).toBe(2)
      expect(stats.read).toBe(1)
    })
  })

  describe('getResumeDownloads - 获取简历下载次数', () => {
    it('初始值应该为 0', () => {
      const downloads = getResumeDownloads()
      
      expect(downloads).toBe(0)
    })

    it('应该返回正确的下载次数', () => {
      const db = getDatabase()
      
      // 更新下载次数
      db.run('UPDATE statistics SET resume_downloads = 42 WHERE id = 1')
      
      const downloads = getResumeDownloads()
      
      expect(downloads).toBe(42)
    })
  })

  describe('getGameStats - 获取游戏统计', () => {
    it('初始值应该全部为 0', () => {
      const stats = getGameStats()
      
      expect(stats.triggers).toBe(0)
      expect(stats.completions).toBe(0)
      expect(stats.players).toBe(0)
      expect(stats.averageScore).toBe(0)
      expect(stats.highestScore).toBe(0)
    })

    it('应该正确统计游戏触发和通关次数', () => {
      const db = getDatabase()
      
      // 更新统计数据
      db.run('UPDATE statistics SET game_triggers = 100, game_completions = 25 WHERE id = 1')
      
      const stats = getGameStats()
      
      expect(stats.triggers).toBe(100)
      expect(stats.completions).toBe(25)
    })

    it('应该正确统计排行榜数据', () => {
      const db = getDatabase()
      
      // 插入排行榜记录
      db.run(`INSERT INTO game_leaderboard (player_name, score, stage, play_time) VALUES (?, ?, ?, ?)`,
        ['玩家1', 1000, 3, 300])
      db.run(`INSERT INTO game_leaderboard (player_name, score, stage, play_time) VALUES (?, ?, ?, ?)`,
        ['玩家2', 2000, 5, 500])
      db.run(`INSERT INTO game_leaderboard (player_name, score, stage, play_time) VALUES (?, ?, ?, ?)`,
        ['玩家3', 1500, 4, 400])
      
      const stats = getGameStats()
      
      expect(stats.players).toBe(3)
      expect(stats.highestScore).toBe(2000)
      expect(stats.averageScore).toBe(1500) // (1000 + 2000 + 1500) / 3 = 1500
    })
  })

  describe('getOverviewStats - 获取概览统计', () => {
    it('应该返回完整的统计数据结构', () => {
      const stats = getOverviewStats()
      
      // 验证数据结构
      expect(stats).toHaveProperty('today')
      expect(stats).toHaveProperty('week')
      expect(stats).toHaveProperty('month')
      expect(stats).toHaveProperty('messages')
      expect(stats).toHaveProperty('resumeDownloads')
      expect(stats).toHaveProperty('game')
      
      // 验证子结构
      expect(stats.today).toHaveProperty('pv')
      expect(stats.today).toHaveProperty('uv')
      expect(stats.messages).toHaveProperty('total')
      expect(stats.messages).toHaveProperty('unread')
      expect(stats.messages).toHaveProperty('read')
      expect(stats.game).toHaveProperty('triggers')
      expect(stats.game).toHaveProperty('completions')
      expect(stats.game).toHaveProperty('players')
      expect(stats.game).toHaveProperty('averageScore')
      expect(stats.game).toHaveProperty('highestScore')
    })

    it('应该聚合所有统计数据', () => {
      const db = getDatabase()
      
      // 添加访问记录
      recordVisit({ page: '/home', sessionId: 'session1' })
      recordVisit({ page: '/about', sessionId: 'session2' })
      
      // 添加留言
      db.run(`INSERT INTO messages (nickname, contact, content, status) VALUES (?, ?, ?, ?)`,
        ['测试', 'test@test.com', '测试内容', 'unread'])
      
      // 更新统计数据
      db.run('UPDATE statistics SET resume_downloads = 10, game_triggers = 50, game_completions = 5 WHERE id = 1')
      
      // 添加排行榜记录
      db.run(`INSERT INTO game_leaderboard (player_name, score) VALUES (?, ?)`, ['玩家', 1000])
      
      const stats = getOverviewStats()
      
      expect(stats.today.pv).toBe(2)
      expect(stats.today.uv).toBe(2)
      expect(stats.messages.total).toBe(1)
      expect(stats.messages.unread).toBe(1)
      expect(stats.resumeDownloads).toBe(10)
      expect(stats.game.triggers).toBe(50)
      expect(stats.game.completions).toBe(5)
      expect(stats.game.players).toBe(1)
      expect(stats.game.highestScore).toBe(1000)
    })
  })

  describe('recordVisit - 记录访问', () => {
    it('应该成功记录访问并返回 ID', () => {
      const id = recordVisit({
        page: '/home',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceType: 'desktop',
        browser: 'Chrome',
        referrer: 'https://google.com',
        sessionId: 'test-session'
      })
      
      expect(id).toBeGreaterThan(0)
    })

    it('应该正确保存所有字段', () => {
      const visitData = {
        page: '/contact',
        ip: '10.0.0.1',
        userAgent: 'Test Agent',
        deviceType: 'mobile',
        browser: 'Safari',
        referrer: 'https://example.com',
        sessionId: 'mobile-session'
      }
      
      const id = recordVisit(visitData)
      
      // 验证数据已保存
      const db = getDatabase()
      const result = db.exec('SELECT * FROM visits WHERE id = ?', [id])
      
      expect(result.length).toBe(1)
      expect(result[0]?.values?.length).toBe(1)
      
      const row = result[0]?.values?.[0]
      expect(row?.[1]).toBe('/contact') // page
      expect(row?.[2]).toBe('10.0.0.1') // ip
      expect(row?.[3]).toBe('Test Agent') // user_agent
      expect(row?.[4]).toBe('mobile') // device_type
      expect(row?.[5]).toBe('Safari') // browser
      expect(row?.[6]).toBe('https://example.com') // referrer
      expect(row?.[7]).toBe('mobile-session') // session_id
    })

    it('应该允许可选字段为空', () => {
      const id = recordVisit({ page: '/minimal' })
      
      expect(id).toBeGreaterThan(0)
      
      const db = getDatabase()
      const result = db.exec('SELECT * FROM visits WHERE id = ?', [id])
      
      expect(result.length).toBe(1)
      const row = result[0]?.values?.[0]
      expect(row?.[1]).toBe('/minimal')
      expect(row?.[2]).toBeNull() // ip
      expect(row?.[7]).toBeNull() // session_id
    })
  })

  describe('getRecentVisits - 获取最近访问记录', () => {
    it('空数据库应该返回空数组', () => {
      const visits = getRecentVisits()
      
      expect(visits).toEqual([])
    })

    it('应该返回最近的访问记录', () => {
      // 插入多条记录
      recordVisit({ page: '/page1', sessionId: 's1' })
      recordVisit({ page: '/page2', sessionId: 's2' })
      recordVisit({ page: '/page3', sessionId: 's3' })
      
      const visits = getRecentVisits(2)
      
      expect(visits.length).toBe(2)
      // 最新的记录应该在前面
      expect(visits[0]?.page).toBe('/page3')
      expect(visits[1]?.page).toBe('/page2')
    })

    it('默认应该返回 10 条记录', () => {
      // 插入 15 条记录
      for (let i = 1; i <= 15; i++) {
        recordVisit({ page: `/page${i}` })
      }
      
      const visits = getRecentVisits()
      
      expect(visits.length).toBe(10)
    })
  })

  describe('incrementResumeDownloads - 增加简历下载次数', () => {
    it('应该正确增加下载次数', () => {
      expect(getResumeDownloads()).toBe(0)
      
      const count1 = incrementResumeDownloads()
      expect(count1).toBe(1)
      
      const count2 = incrementResumeDownloads()
      expect(count2).toBe(2)
      
      const count3 = incrementResumeDownloads()
      expect(count3).toBe(3)
    })
  })

  describe('incrementGameTriggers - 增加游戏触发次数', () => {
    it('应该正确增加触发次数', () => {
      expect(getGameStats().triggers).toBe(0)
      
      const count1 = incrementGameTriggers()
      expect(count1).toBe(1)
      
      const count2 = incrementGameTriggers()
      expect(count2).toBe(2)
    })
  })

  describe('incrementGameCompletions - 增加游戏通关次数', () => {
    it('应该正确增加通关次数', () => {
      expect(getGameStats().completions).toBe(0)
      
      const count1 = incrementGameCompletions()
      expect(count1).toBe(1)
      
      const count2 = incrementGameCompletions()
      expect(count2).toBe(2)
    })
  })
})
