/**
 * 统计服务属性测试
 * 
 * 使用属性测试验证统计服务的通用正确性属性
 * 
 * **Feature: admin-system, Property 3: 访问统计计算正确性**
 * 
 * 验证需求: 2.1.1, 2.2.1, 2.2.2, 2.2.3
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import * as fc from 'fast-check'
import { getDatabase, initDatabase, closeDatabase } from '../database/init'
import { getPVUV, recordVisit, type VisitData, type TimePeriod } from '../services/statistics'

describe('统计服务属性测试', () => {
  beforeEach(() => {
    initDatabase(':memory:')
  })

  afterEach(() => {
    closeDatabase()
  })

  /**
   * Property 3: 访问统计计算正确性
   * 
   * 对于任意访问记录集合和时间范围，计算的 PV（页面浏览量）应该等于该范围内的记录总数，
   * UV（独立访客数）应该等于该范围内唯一 session_id 的数量。
   * 
   * **Validates: Requirements 2.1.1, 2.2.1, 2.2.2, 2.2.3**
   */
  describe('Property 3: 访问统计计算正确性', () => {
    it('PV 应该等于访问记录总数', () => {
      fc.assert(
        fc.property(
          // 生成访问记录数组（1-100 条）
          fc.array(
            fc.record({
              page: fc.constantFrom('/', '/about', '/projects', '/contact', '/skills'),
              sessionId: fc.uuid(),
              ip: fc.ipV4(),
              deviceType: fc.constantFrom('desktop', 'mobile', 'tablet'),
              browser: fc.constantFrom('Chrome', 'Firefox', 'Safari', 'Edge')
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (visits) => {
            // 记录所有访问
            for (const visit of visits) {
              recordVisit({
                page: visit.page,
                sessionId: visit.sessionId,
                ip: visit.ip,
                deviceType: visit.deviceType,
                browser: visit.browser
              })
            }

            // 获取今日统计（所有记录都是今天的）
            const stats = getPVUV('today')

            // PV 应该等于记录总数
            expect(stats.pv).toBe(visits.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('UV 应该等于唯一 session_id 的数量', () => {
      fc.assert(
        fc.property(
          // 生成访问记录数组
          fc.array(
            fc.record({
              page: fc.constantFrom('/', '/about', '/projects', '/contact'),
              sessionId: fc.uuid(),
              ip: fc.ipV4()
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (visits) => {
            // 记录所有访问
            for (const visit of visits) {
              recordVisit({
                page: visit.page,
                sessionId: visit.sessionId,
                ip: visit.ip
              })
            }

            // 计算唯一 session_id 数量
            const uniqueSessions = new Set(visits.map(v => v.sessionId))
            const expectedUV = uniqueSessions.size

            // 获取今日统计
            const stats = getPVUV('today')

            // UV 应该等于唯一 session_id 数量
            expect(stats.uv).toBe(expectedUV)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('相同 session_id 的多次访问应该只计为 1 个 UV', () => {
      fc.assert(
        fc.property(
          // 生成一个 session_id 和访问次数
          fc.uuid(),
          fc.integer({ min: 2, max: 20 }),
          (sessionId, visitCount) => {
            // 使用相同 session_id 记录多次访问
            for (let i = 0; i < visitCount; i++) {
              recordVisit({
                page: '/',
                sessionId: sessionId
              })
            }

            // 获取统计
            const stats = getPVUV('today')

            // PV 应该等于访问次数
            expect(stats.pv).toBe(visitCount)
            // UV 应该等于 1（只有一个唯一 session）
            expect(stats.uv).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('没有 session_id 的访问不应该计入 UV', () => {
      fc.assert(
        fc.property(
          // 生成有 session_id 和无 session_id 的访问记录
          fc.array(
            fc.record({
              page: fc.constantFrom('/', '/about'),
              hasSession: fc.boolean(),
              sessionId: fc.uuid()
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (visits) => {
            // 记录访问
            for (const visit of visits) {
              recordVisit({
                page: visit.page,
                sessionId: visit.hasSession ? visit.sessionId : undefined
              })
            }

            // 计算有 session_id 的唯一数量
            const visitsWithSession = visits.filter(v => v.hasSession)
            const uniqueSessions = new Set(visitsWithSession.map(v => v.sessionId))
            const expectedUV = uniqueSessions.size

            // 获取统计
            const stats = getPVUV('today')

            // PV 应该等于总访问数
            expect(stats.pv).toBe(visits.length)
            // UV 应该只计算有 session_id 的
            expect(stats.uv).toBe(expectedUV)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('PV 应该总是大于或等于 UV', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              page: fc.constantFrom('/', '/about', '/projects'),
              sessionId: fc.uuid()
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (visits) => {
            // 记录访问
            for (const visit of visits) {
              recordVisit({
                page: visit.page,
                sessionId: visit.sessionId
              })
            }

            // 获取统计
            const stats = getPVUV('today')

            // PV 应该总是 >= UV（因为一个用户可以访问多次）
            expect(stats.pv).toBeGreaterThanOrEqual(stats.uv)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空数据集应该返回 PV=0, UV=0', () => {
      // 不记录任何访问
      const stats = getPVUV('today')

      expect(stats.pv).toBe(0)
      expect(stats.uv).toBe(0)
    })

    it('不同时间段的统计应该独立计算', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              page: fc.constantFrom('/', '/about'),
              sessionId: fc.uuid()
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (visits) => {
            const db = getDatabase()

            // 记录今天的访问
            for (const visit of visits) {
              recordVisit({
                page: visit.page,
                sessionId: visit.sessionId
              })
            }

            // 手动插入一些昨天的访问记录
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString()

            db.run(`
              INSERT INTO visits (page, session_id, created_at)
              VALUES (?, ?, ?)
            `, ['/', 'old-session-1', yesterdayStr])

            db.run(`
              INSERT INTO visits (page, session_id, created_at)
              VALUES (?, ?, ?)
            `, ['/', 'old-session-2', yesterdayStr])

            // 获取今日统计
            const todayStats = getPVUV('today')

            // 今日统计应该只包含今天的记录
            expect(todayStats.pv).toBe(visits.length)
            
            const uniqueSessions = new Set(visits.map(v => v.sessionId))
            expect(todayStats.uv).toBe(uniqueSessions.size)

            // 本周统计应该包含今天和昨天的记录
            const weekStats = getPVUV('week')
            expect(weekStats.pv).toBe(visits.length + 2)
            expect(weekStats.uv).toBe(uniqueSessions.size + 2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
