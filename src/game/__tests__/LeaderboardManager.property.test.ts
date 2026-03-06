/**
 * LeaderboardManager 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证排行榜管理器的核心属性：
 * - 属性 15: 排行榜存储限制
 * - 属性 16: 排行榜排序
 * - 属性 17: 高分判断
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property N: {property_text}
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { LeaderboardManager, type ScoreEntry } from '../LeaderboardManager'

// ========== localStorage 模拟 ==========

/**
 * 创建 localStorage 模拟对象
 * 用于在测试环境中模拟浏览器的 localStorage
 */
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
}

const localStorageMock = createLocalStorageMock()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// ========== 自定义生成器 ==========

/**
 * 生成有效的玩家名称
 * 约束：非空字符串，长度 1-20
 */
const playerNameArb = fc.string({ minLength: 1, maxLength: 20 })

/**
 * 生成有效的分数
 * 约束：非负整数，范围 0 - 1,000,000
 */
const scoreArb = fc.integer({ min: 0, max: 1_000_000 })

/**
 * 生成有效的关卡数
 * 约束：正整数，范围 1 - 100
 */
const stageArb = fc.integer({ min: 1, max: 100 })

/**
 * 生成有效的时间戳
 * 约束：正整数
 */
const timestampArb = fc.integer({ min: 1, max: Date.now() + 1_000_000 })

/**
 * 生成有效的成就列表
 * 约束：字符串数组，长度 0-5
 */
const achievementsArb = fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 })

/**
 * 生成有效的分数记录（不含 id）
 */
const scoreEntryArb = fc.record({
  playerName: playerNameArb,
  score: scoreArb,
  stage: stageArb,
  timestamp: timestampArb,
  achievements: achievementsArb,
})

/**
 * 生成分数记录数组
 * 约束：长度 1-30，用于测试存储限制
 */
const scoreEntriesArb = fc.array(scoreEntryArb, { minLength: 1, maxLength: 30 })

/**
 * 生成自定义的最大记录数配置
 * 约束：正整数，范围 1-20
 */
const maxEntriesArb = fc.integer({ min: 1, max: 20 })

// ========== 测试套件 ==========

describe('LeaderboardManager 属性测试', () => {
  let manager: LeaderboardManager

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    manager = new LeaderboardManager()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  /**
   * 属性 15：排行榜存储限制
   * 
   * *对于任意* 分数记录序列，排行榜最多只保留 10 条记录，且保留的是分数最高的 10 条。
   * 
   * **Validates: Requirements 7.1**
   */
  describe('Feature: website-enhancement-v2, Property 15: 排行榜存储限制', () => {
    it('排行榜最多只保留 maxEntries 条记录（默认 10 条）', () => {
      fc.assert(
        fc.property(
          scoreEntriesArb,
          (entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 验证：记录数不超过 10
            const scores = testManager.getScores()
            expect(scores.length).toBeLessThanOrEqual(10)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('排行榜最多只保留自定义 maxEntries 条记录', () => {
      fc.assert(
        fc.property(
          maxEntriesArb,
          scoreEntriesArb,
          (maxEntries, entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager({ maxEntries })

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 验证：记录数不超过 maxEntries
            const scores = testManager.getScores()
            expect(scores.length).toBeLessThanOrEqual(maxEntries)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('保留的是分数最高的 maxEntries 条记录', () => {
      fc.assert(
        fc.property(
          maxEntriesArb,
          scoreEntriesArb.filter(entries => entries.length > 0),
          (maxEntries, entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager({ maxEntries })

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 获取排行榜中的分数
            const scores = testManager.getScores()
            const leaderboardScores = scores.map(s => s.score)

            // 计算所有输入分数中最高的 maxEntries 个
            const allScores = entries.map(e => e.score)
            const sortedAllScores = [...allScores].sort((a, b) => b - a)
            const topScores = sortedAllScores.slice(0, maxEntries)

            // 验证：排行榜中的分数应该是最高的那些
            // 注意：由于可能有相同分数，我们验证排行榜中的每个分数都在 topScores 中
            for (const score of leaderboardScores) {
              expect(topScores).toContain(score)
            }

            // 验证：如果输入记录数 >= maxEntries，排行榜应该满
            if (entries.length >= maxEntries) {
              expect(scores.length).toBe(maxEntries)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('当记录数少于 maxEntries 时，保留所有记录', () => {
      fc.assert(
        fc.property(
          maxEntriesArb,
          fc.array(scoreEntryArb, { minLength: 1, maxLength: 5 }),
          (maxEntries, entries) => {
            // 确保 entries 数量小于 maxEntries
            const limitedEntries = entries.slice(0, Math.min(entries.length, maxEntries - 1))
            if (limitedEntries.length === 0) return // 跳过空数组

            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager({ maxEntries })

            // 添加所有分数记录
            for (const entry of limitedEntries) {
              testManager.addScore(entry)
            }

            // 验证：记录数等于输入数量
            const scores = testManager.getScores()
            expect(scores.length).toBe(limitedEntries.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 属性 16：排行榜排序
   * 
   * *对于任意* 排行榜中的分数记录，记录应该按分数降序排列。
   * 
   * **Validates: Requirements 7.2**
   */
  describe('Feature: website-enhancement-v2, Property 16: 排行榜排序', () => {
    it('排行榜中的记录应该按分数降序排列', () => {
      fc.assert(
        fc.property(
          scoreEntriesArb.filter(entries => entries.length >= 2),
          (entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 获取排行榜
            const scores = testManager.getScores()

            // 验证：每个分数都大于或等于下一个分数
            for (let i = 0; i < scores.length - 1; i++) {
              expect(scores[i].score).toBeGreaterThanOrEqual(scores[i + 1].score)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('添加新记录后排序仍然保持降序', () => {
      fc.assert(
        fc.property(
          scoreEntriesArb,
          scoreEntryArb,
          (initialEntries, newEntry) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加初始记录
            for (const entry of initialEntries) {
              testManager.addScore(entry)
            }

            // 添加新记录
            testManager.addScore(newEntry)

            // 获取排行榜
            const scores = testManager.getScores()

            // 验证：排序仍然是降序
            for (let i = 0; i < scores.length - 1; i++) {
              expect(scores[i].score).toBeGreaterThanOrEqual(scores[i + 1].score)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('第一条记录的分数应该是最高分', () => {
      fc.assert(
        fc.property(
          scoreEntriesArb.filter(entries => entries.length >= 1),
          (entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 获取排行榜
            const scores = testManager.getScores()
            if (scores.length === 0) return

            // 验证：第一条记录的分数是最高的
            const maxScore = Math.max(...scores.map(s => s.score))
            expect(scores[0].score).toBe(maxScore)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('最后一条记录的分数应该是排行榜中的最低分', () => {
      fc.assert(
        fc.property(
          scoreEntriesArb.filter(entries => entries.length >= 1),
          (entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 获取排行榜
            const scores = testManager.getScores()
            if (scores.length === 0) return

            // 验证：最后一条记录的分数是排行榜中最低的
            const minScore = Math.min(...scores.map(s => s.score))
            expect(scores[scores.length - 1].score).toBe(minScore)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 属性 17：高分判断
   * 
   * *对于任意* 当前排行榜和新分数，如果排行榜未满（< 10 条）或新分数高于最低分，则应判断为高分。
   * 
   * **Validates: Requirements 7.3**
   */
  describe('Feature: website-enhancement-v2, Property 17: 高分判断', () => {
    it('排行榜未满时，任何分数都是高分', () => {
      fc.assert(
        fc.property(
          maxEntriesArb,
          fc.array(scoreEntryArb, { minLength: 0, maxLength: 5 }),
          scoreArb,
          (maxEntries, entries, newScore) => {
            // 确保 entries 数量小于 maxEntries
            const limitedEntries = entries.slice(0, Math.min(entries.length, maxEntries - 1))

            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager({ maxEntries })

            // 添加初始记录
            for (const entry of limitedEntries) {
              testManager.addScore(entry)
            }

            // 验证：排行榜未满时，任何分数都是高分
            const scores = testManager.getScores()
            if (scores.length < maxEntries) {
              expect(testManager.isHighScore(newScore)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('排行榜已满时，高于最低分的分数是高分', () => {
      fc.assert(
        fc.property(
          maxEntriesArb,
          fc.array(scoreEntryArb, { minLength: 10, maxLength: 20 }),
          (maxEntries, entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager({ maxEntries })

            // 添加足够多的记录以填满排行榜
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 获取排行榜
            const scores = testManager.getScores()
            if (scores.length < maxEntries) return // 跳过未满的情况

            // 获取最低分
            const lowestScore = scores[scores.length - 1].score

            // 验证：高于最低分的分数是高分
            const higherScore = lowestScore + 1
            expect(testManager.isHighScore(higherScore)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('排行榜已满时，低于或等于最低分的分数不是高分', () => {
      fc.assert(
        fc.property(
          maxEntriesArb,
          fc.array(scoreEntryArb, { minLength: 10, maxLength: 20 }),
          (maxEntries, entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager({ maxEntries })

            // 添加足够多的记录以填满排行榜
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 获取排行榜
            const scores = testManager.getScores()
            if (scores.length < maxEntries) return // 跳过未满的情况

            // 获取最低分
            const lowestScore = scores[scores.length - 1].score

            // 验证：等于最低分的分数不是高分
            expect(testManager.isHighScore(lowestScore)).toBe(false)

            // 验证：低于最低分的分数不是高分
            if (lowestScore > 0) {
              expect(testManager.isHighScore(lowestScore - 1)).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('isHighScore 与 addScore 的 isHighScore 结果一致', () => {
      fc.assert(
        fc.property(
          maxEntriesArb,
          scoreEntriesArb,
          scoreEntryArb,
          (maxEntries, initialEntries, newEntry) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager({ maxEntries })

            // 添加初始记录
            for (const entry of initialEntries) {
              testManager.addScore(entry)
            }

            // 先检查 isHighScore
            const predictedIsHighScore = testManager.isHighScore(newEntry.score)

            // 然后添加记录
            const result = testManager.addScore(newEntry)

            // 验证：两者结果一致
            expect(result.isHighScore).toBe(predictedIsHighScore)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空排行榜时任何分数都是高分', () => {
      fc.assert(
        fc.property(
          scoreArb,
          (score) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 验证：空排行榜时任何分数都是高分
            expect(testManager.isHighScore(score)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ========== 综合属性测试 ==========

  describe('综合属性测试', () => {
    it('addScore 返回的排名应该在有效范围内', () => {
      fc.assert(
        fc.property(
          maxEntriesArb,
          scoreEntriesArb,
          scoreEntryArb,
          (maxEntries, initialEntries, newEntry) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager({ maxEntries })

            // 添加初始记录
            for (const entry of initialEntries) {
              testManager.addScore(entry)
            }

            // 添加新记录
            const result = testManager.addScore(newEntry)

            // 验证：排名在有效范围内
            if (result.isHighScore) {
              expect(result.rank).toBeGreaterThanOrEqual(1)
              expect(result.rank).toBeLessThanOrEqual(maxEntries)
            } else {
              expect(result.rank).toBe(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('每条记录都应该有唯一的 ID', () => {
      fc.assert(
        fc.property(
          scoreEntriesArb.filter(entries => entries.length >= 2),
          (entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 获取排行榜
            const scores = testManager.getScores()

            // 验证：所有 ID 都是唯一的
            const ids = scores.map(s => s.id)
            const uniqueIds = new Set(ids)
            expect(uniqueIds.size).toBe(ids.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('clearScores 后排行榜应该为空', () => {
      fc.assert(
        fc.property(
          scoreEntriesArb,
          (entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 清空排行榜
            testManager.clearScores()

            // 验证：排行榜为空
            expect(testManager.getScores()).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('clearScores 后任何分数都是高分', () => {
      fc.assert(
        fc.property(
          scoreEntriesArb,
          scoreArb,
          (entries, newScore) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 清空排行榜
            testManager.clearScores()

            // 验证：任何分数都是高分
            expect(testManager.isHighScore(newScore)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ========== 边界情况测试 ==========

  describe('边界情况', () => {
    it('分数为 0 时的处理', () => {
      fc.assert(
        fc.property(
          playerNameArb,
          stageArb,
          timestampArb,
          achievementsArb,
          (playerName, stage, timestamp, achievements) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加分数为 0 的记录
            const result = testManager.addScore({
              playerName,
              score: 0,
              stage,
              timestamp,
              achievements,
            })

            // 验证：分数为 0 也能正常添加
            expect(result.isHighScore).toBe(true)
            expect(result.rank).toBe(1)

            const scores = testManager.getScores()
            expect(scores).toHaveLength(1)
            expect(scores[0].score).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('所有分数相同时的处理', () => {
      fc.assert(
        fc.property(
          scoreArb,
          fc.integer({ min: 2, max: 15 }),
          (score, count) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager()

            // 添加多条相同分数的记录
            for (let i = 0; i < count; i++) {
              testManager.addScore({
                playerName: `玩家${i}`,
                score,
                stage: 1,
                timestamp: Date.now() + i,
                achievements: [],
              })
            }

            // 获取排行榜
            const scores = testManager.getScores()

            // 验证：记录数不超过 10
            expect(scores.length).toBeLessThanOrEqual(10)

            // 验证：所有分数都相同
            for (const s of scores) {
              expect(s.score).toBe(score)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('maxEntries 为 1 时的处理', () => {
      fc.assert(
        fc.property(
          scoreEntriesArb.filter(entries => entries.length >= 2),
          (entries) => {
            // 重置管理器
            localStorageMock.clear()
            const testManager = new LeaderboardManager({ maxEntries: 1 })

            // 添加所有分数记录
            for (const entry of entries) {
              testManager.addScore(entry)
            }

            // 获取排行榜
            const scores = testManager.getScores()

            // 验证：只有 1 条记录
            expect(scores.length).toBe(1)

            // 验证：是最高分
            const maxScore = Math.max(...entries.map(e => e.score))
            expect(scores[0].score).toBe(maxScore)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
