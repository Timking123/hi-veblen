/**
 * AchievementSystem 属性测试
 * 
 * Feature: website-enhancement-v2
 * 
 * 使用 fast-check 进行属性测试，验证成就系统的核心属性：
 * - 属性 18: 成就系统状态管理
 * 
 * 测试配置：
 * - 测试框架：Vitest + fast-check
 * - 最小迭代次数：每个属性测试至少运行 100 次
 * - 标签格式：Feature: website-enhancement-v2, Property N: {property_text}
 * 
 * **Validates: Requirements 7.5, 7.6, 7.7**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import {
  AchievementSystem,
  type Achievement,
  type GameStats,
} from '../AchievementSystem'

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
 * 生成有效的游戏统计数据
 * 约束：所有字段为非负整数
 */
const gameStatsArb = fc.record({
  totalScore: fc.integer({ min: 0, max: 1_000_000 }),
  highestStage: fc.integer({ min: 0, max: 100 }),
  totalKills: fc.integer({ min: 0, max: 10_000 }),
  totalPlayTime: fc.integer({ min: 0, max: 24 * 60 * 60 * 1000 }), // 最多 24 小时
  perfectStages: fc.integer({ min: 0, max: 100 }),
})

/**
 * 生成有效的成就 ID
 * 约束：非空字符串，只包含字母、数字和下划线
 */
const achievementIdArb = fc.stringMatching(/^[a-z][a-z0-9_]{2,19}$/)

/**
 * 生成有效的成就名称
 * 约束：非空字符串，长度 1-30
 */
const achievementNameArb = fc.string({ minLength: 1, maxLength: 30 })

/**
 * 生成有效的成就描述
 * 约束：非空字符串，长度 1-100
 */
const achievementDescArb = fc.string({ minLength: 1, maxLength: 100 })

/**
 * 生成有效的成就图标
 * 约束：emoji 或短字符串
 */
const achievementIconArb = fc.constantFrom('🎮', '🏆', '⭐', '💀', '⏱️', '💎', '👑', '🎯', '💥', '✅')

/**
 * 生成成就条件阈值
 * 用于创建基于阈值的成就条件
 */
interface ThresholdCondition {
  field: keyof GameStats
  threshold: number
}

const thresholdConditionArb: fc.Arbitrary<ThresholdCondition> = fc.oneof(
  fc.record({
    field: fc.constant('totalScore' as keyof GameStats),
    threshold: fc.integer({ min: 100, max: 100_000 }),
  }),
  fc.record({
    field: fc.constant('highestStage' as keyof GameStats),
    threshold: fc.integer({ min: 1, max: 50 }),
  }),
  fc.record({
    field: fc.constant('totalKills' as keyof GameStats),
    threshold: fc.integer({ min: 10, max: 1000 }),
  }),
  fc.record({
    field: fc.constant('totalPlayTime' as keyof GameStats),
    threshold: fc.integer({ min: 60_000, max: 30 * 60 * 1000 }), // 1-30 分钟
  }),
  fc.record({
    field: fc.constant('perfectStages' as keyof GameStats),
    threshold: fc.integer({ min: 1, max: 10 }),
  })
)


/**
 * 生成完整的成就定义（带阈值条件）
 */
const achievementWithThresholdArb = fc.tuple(
  achievementIdArb,
  achievementNameArb,
  achievementDescArb,
  achievementIconArb,
  thresholdConditionArb
).map(([id, name, description, icon, condition]): Omit<Achievement, 'unlockedAt'> => ({
  id,
  name,
  description,
  icon,
  condition: (stats: GameStats) => stats[condition.field] >= condition.threshold,
}))

/**
 * 生成成就定义数组
 * 约束：长度 1-10，ID 唯一
 */
const achievementsArrayArb = fc.array(achievementWithThresholdArb, { minLength: 1, maxLength: 10 })
  .map(achievements => {
    // 确保 ID 唯一
    const seen = new Set<string>()
    return achievements.filter(a => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })
  })
  .filter(achievements => achievements.length > 0)

/**
 * 生成满足特定成就条件的游戏统计数据
 */
const createStatsForCondition = (condition: ThresholdCondition): GameStats => ({
  totalScore: condition.field === 'totalScore' ? condition.threshold : 0,
  highestStage: condition.field === 'highestStage' ? condition.threshold : 0,
  totalKills: condition.field === 'totalKills' ? condition.threshold : 0,
  totalPlayTime: condition.field === 'totalPlayTime' ? condition.threshold : 0,
  perfectStages: condition.field === 'perfectStages' ? condition.threshold : 0,
})

/**
 * 生成不满足特定成就条件的游戏统计数据
 */
const createStatsNotMeetingCondition = (condition: ThresholdCondition): GameStats => ({
  totalScore: condition.field === 'totalScore' ? Math.max(0, condition.threshold - 1) : 0,
  highestStage: condition.field === 'highestStage' ? Math.max(0, condition.threshold - 1) : 0,
  totalKills: condition.field === 'totalKills' ? Math.max(0, condition.threshold - 1) : 0,
  totalPlayTime: condition.field === 'totalPlayTime' ? Math.max(0, condition.threshold - 1) : 0,
  perfectStages: condition.field === 'perfectStages' ? Math.max(0, condition.threshold - 1) : 0,
})

// ========== 辅助函数 ==========

let testCounter = 0

/**
 * 生成唯一的存储键
 */
const generateStorageKey = () => `test_achievements_${testCounter++}_${Date.now()}`


// ========== 测试套件 ==========

describe('AchievementSystem 属性测试', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  /**
   * 属性 18：成就系统状态管理
   * 
   * *对于任意* 游戏统计数据和成就定义，满足条件的成就应该被解锁，
   * 解锁状态应该持久化存储，且成就列表应该正确反映解锁状态。
   * 
   * **Validates: Requirements 7.5, 7.6, 7.7**
   */
  describe('Feature: website-enhancement-v2, Property 18: 成就系统状态管理', () => {
    /**
     * 子属性 18.1：满足条件的成就应该被解锁
     * 
     * **Validates: Requirements 7.5**
     */
    it('满足条件的成就应该被解锁', () => {
      fc.assert(
        fc.property(
          thresholdConditionArb,
          achievementIdArb,
          (condition, id) => {
            // 创建一个基于阈值的成就
            const achievement: Omit<Achievement, 'unlockedAt'> = {
              id,
              name: '测试成就',
              description: '测试描述',
              icon: '🎯',
              condition: (stats: GameStats) => stats[condition.field] >= condition.threshold,
            }

            // 创建满足条件的统计数据
            const stats = createStatsForCondition(condition)

            // 创建成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem([achievement], { storageKey })

            // 检查成就
            const unlocked = system.checkAchievements(stats)

            // 验证：成就应该被解锁
            expect(unlocked.length).toBe(1)
            expect(unlocked[0].id).toBe(id)
            expect(system.isAchievementUnlocked(id)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 子属性 18.2：不满足条件的成就不应被解锁
     * 
     * **Validates: Requirements 7.5**
     */
    it('不满足条件的成就不应被解锁', () => {
      fc.assert(
        fc.property(
          thresholdConditionArb,
          achievementIdArb,
          (condition, id) => {
            // 创建一个基于阈值的成就
            const achievement: Omit<Achievement, 'unlockedAt'> = {
              id,
              name: '测试成就',
              description: '测试描述',
              icon: '🎯',
              condition: (stats: GameStats) => stats[condition.field] >= condition.threshold,
            }

            // 创建不满足条件的统计数据
            const stats = createStatsNotMeetingCondition(condition)

            // 创建成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem([achievement], { storageKey })

            // 检查成就
            const unlocked = system.checkAchievements(stats)

            // 验证：成就不应该被解锁
            expect(unlocked.length).toBe(0)
            expect(system.isAchievementUnlocked(id)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })


    /**
     * 子属性 18.3：解锁状态应该持久化存储
     * 
     * **Validates: Requirements 7.6**
     */
    it('解锁状态应该持久化存储到 localStorage', () => {
      fc.assert(
        fc.property(
          thresholdConditionArb,
          achievementIdArb,
          (condition, id) => {
            // 创建一个基于阈值的成就
            const achievement: Omit<Achievement, 'unlockedAt'> = {
              id,
              name: '测试成就',
              description: '测试描述',
              icon: '🎯',
              condition: (stats: GameStats) => stats[condition.field] >= condition.threshold,
            }

            // 创建满足条件的统计数据
            const stats = createStatsForCondition(condition)

            // 创建成就系统并解锁成就
            const storageKey = generateStorageKey()
            const system = new AchievementSystem([achievement], { storageKey })
            system.checkAchievements(stats)

            // 验证：localStorage 中应该存储了解锁的成就
            const stored = localStorage.getItem(storageKey)
            expect(stored).not.toBeNull()
            
            const parsed = JSON.parse(stored!)
            expect(parsed).toContain(id)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 子属性 18.4：解锁状态应该在新实例中恢复
     * 
     * **Validates: Requirements 7.6**
     */
    it('解锁状态应该在新实例中恢复（往返属性）', () => {
      fc.assert(
        fc.property(
          thresholdConditionArb,
          achievementIdArb,
          (condition, id) => {
            // 创建一个基于阈值的成就
            const achievement: Omit<Achievement, 'unlockedAt'> = {
              id,
              name: '测试成就',
              description: '测试描述',
              icon: '🎯',
              condition: (stats: GameStats) => stats[condition.field] >= condition.threshold,
            }

            // 创建满足条件的统计数据
            const stats = createStatsForCondition(condition)

            // 创建成就系统并解锁成就
            const storageKey = generateStorageKey()
            const system1 = new AchievementSystem([achievement], { storageKey })
            system1.checkAchievements(stats)

            // 创建新实例
            const system2 = new AchievementSystem([achievement], { storageKey })

            // 验证：新实例应该恢复解锁状态
            expect(system2.isAchievementUnlocked(id)).toBe(true)
            expect(system2.getUnlockedAchievements()).toContain(id)
          }
        ),
        { numRuns: 100 }
      )
    })


    /**
     * 子属性 18.5：成就列表应该正确反映解锁状态
     * 
     * **Validates: Requirements 7.7**
     */
    it('成就列表应该正确反映解锁状态', () => {
      fc.assert(
        fc.property(
          thresholdConditionArb,
          achievementIdArb,
          (condition, id) => {
            // 创建一个基于阈值的成就
            const achievement: Omit<Achievement, 'unlockedAt'> = {
              id,
              name: '测试成就',
              description: '测试描述',
              icon: '🎯',
              condition: (stats: GameStats) => stats[condition.field] >= condition.threshold,
            }

            // 创建满足条件的统计数据
            const stats = createStatsForCondition(condition)

            // 创建成就系统并解锁成就
            const storageKey = generateStorageKey()
            const system = new AchievementSystem([achievement], { storageKey })
            system.checkAchievements(stats)

            // 获取所有成就
            const allAchievements = system.getAllAchievements()
            const targetAchievement = allAchievements.find(a => a.id === id)

            // 验证：成就列表应该反映解锁状态
            expect(targetAchievement).toBeDefined()
            expect(targetAchievement?.unlockedAt).toBeDefined()
            expect(typeof targetAchievement?.unlockedAt).toBe('number')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 子属性 18.6：已解锁的成就不应重复解锁
     * 
     * **Validates: Requirements 7.5**
     */
    it('已解锁的成就不应重复解锁', () => {
      fc.assert(
        fc.property(
          thresholdConditionArb,
          achievementIdArb,
          fc.integer({ min: 2, max: 10 }),
          (condition, id, checkCount) => {
            // 创建一个基于阈值的成就
            const achievement: Omit<Achievement, 'unlockedAt'> = {
              id,
              name: '测试成就',
              description: '测试描述',
              icon: '🎯',
              condition: (stats: GameStats) => stats[condition.field] >= condition.threshold,
            }

            // 创建满足条件的统计数据
            const stats = createStatsForCondition(condition)

            // 创建成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem([achievement], { storageKey })

            // 第一次检查
            const firstUnlock = system.checkAchievements(stats)
            expect(firstUnlock.length).toBe(1)

            // 多次重复检查
            for (let i = 0; i < checkCount; i++) {
              const repeatUnlock = system.checkAchievements(stats)
              // 验证：不应该重复解锁
              expect(repeatUnlock.length).toBe(0)
            }

            // 验证：解锁列表中只有一个成就
            const unlocked = system.getUnlockedAchievements()
            expect(unlocked.length).toBe(1)
            expect(unlocked[0]).toBe(id)
          }
        ),
        { numRuns: 100 }
      )
    })


    /**
     * 子属性 18.7：多个成就同时满足条件时应该全部解锁
     * 
     * **Validates: Requirements 7.5**
     */
    it('多个成就同时满足条件时应该全部解锁', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          (achievementCount) => {
            // 创建多个基于不同阈值的成就
            const achievements: Omit<Achievement, 'unlockedAt'>[] = []
            for (let i = 0; i < achievementCount; i++) {
              achievements.push({
                id: `achievement_${i}`,
                name: `成就 ${i}`,
                description: `描述 ${i}`,
                icon: '🎯',
                // 所有成就都基于 totalScore，阈值递增
                condition: (stats: GameStats) => stats.totalScore >= (i + 1) * 100,
              })
            }

            // 创建满足所有条件的统计数据
            const stats: GameStats = {
              totalScore: achievementCount * 100, // 满足所有阈值
              highestStage: 0,
              totalKills: 0,
              totalPlayTime: 0,
              perfectStages: 0,
            }

            // 创建成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem(achievements, { storageKey })

            // 检查成就
            const unlocked = system.checkAchievements(stats)

            // 验证：所有成就都应该被解锁
            expect(unlocked.length).toBe(achievementCount)
            
            // 验证：解锁列表包含所有成就
            const unlockedIds = system.getUnlockedAchievements()
            expect(unlockedIds.length).toBe(achievementCount)
            for (let i = 0; i < achievementCount; i++) {
              expect(unlockedIds).toContain(`achievement_${i}`)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 子属性 18.8：成就统计信息应该正确反映解锁数量
     * 
     * **Validates: Requirements 7.7**
     */
    it('成就统计信息应该正确反映解锁数量', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 0, max: 10 }),
          (totalCount, unlockCount) => {
            // 确保解锁数量不超过总数
            const actualUnlockCount = Math.min(unlockCount, totalCount)

            // 创建成就列表
            const achievements: Omit<Achievement, 'unlockedAt'>[] = []
            for (let i = 0; i < totalCount; i++) {
              achievements.push({
                id: `achievement_${i}`,
                name: `成就 ${i}`,
                description: `描述 ${i}`,
                icon: '🎯',
                // 前 actualUnlockCount 个成就的阈值设为 100，其余设为很高
                condition: (stats: GameStats) => 
                  i < actualUnlockCount ? stats.totalScore >= 100 : stats.totalScore >= 1_000_000,
              })
            }

            // 创建满足部分条件的统计数据
            const stats: GameStats = {
              totalScore: 100, // 只满足阈值为 100 的成就
              highestStage: 0,
              totalKills: 0,
              totalPlayTime: 0,
              perfectStages: 0,
            }

            // 创建成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem(achievements, { storageKey })
            system.checkAchievements(stats)

            // 获取统计信息
            const achievementStats = system.getAchievementStats()

            // 验证：统计信息正确
            expect(achievementStats.total).toBe(totalCount)
            expect(achievementStats.unlocked).toBe(actualUnlockCount)
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // ========== 综合属性测试 ==========

  describe('综合属性测试', () => {
    /**
     * 重置成就后应该清除所有解锁状态
     */
    it('重置成就后应该清除所有解锁状态', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (achievementCount) => {
            // 创建多个成就
            const achievements: Omit<Achievement, 'unlockedAt'>[] = []
            for (let i = 0; i < achievementCount; i++) {
              achievements.push({
                id: `achievement_${i}`,
                name: `成就 ${i}`,
                description: `描述 ${i}`,
                icon: '🎯',
                condition: (stats: GameStats) => stats.totalScore >= 100,
              })
            }

            // 创建满足条件的统计数据
            const stats: GameStats = {
              totalScore: 100,
              highestStage: 0,
              totalKills: 0,
              totalPlayTime: 0,
              perfectStages: 0,
            }

            // 创建成就系统并解锁成就
            const storageKey = generateStorageKey()
            const system = new AchievementSystem(achievements, { storageKey })
            system.checkAchievements(stats)

            // 验证：成就已解锁
            expect(system.getUnlockedAchievements().length).toBe(achievementCount)

            // 重置成就
            system.resetAchievements()

            // 验证：所有解锁状态已清除
            expect(system.getUnlockedAchievements().length).toBe(0)
            expect(localStorage.getItem(storageKey)).toBeNull()

            // 验证：成就列表中的解锁时间已清除
            const allAchievements = system.getAllAchievements()
            for (const achievement of allAchievements) {
              expect(achievement.unlockedAt).toBeUndefined()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 获取单个成就应该返回正确的数据
     */
    it('获取单个成就应该返回正确的数据', () => {
      fc.assert(
        fc.property(
          achievementIdArb,
          achievementNameArb,
          achievementDescArb,
          achievementIconArb,
          (id, name, description, icon) => {
            // 创建成就
            const achievement: Omit<Achievement, 'unlockedAt'> = {
              id,
              name,
              description,
              icon,
              condition: () => true,
            }

            // 创建成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem([achievement], { storageKey })

            // 获取成就
            const retrieved = system.getAchievementById(id)

            // 验证：返回的数据正确
            expect(retrieved).toBeDefined()
            expect(retrieved?.id).toBe(id)
            expect(retrieved?.name).toBe(name)
            expect(retrieved?.description).toBe(description)
            expect(retrieved?.icon).toBe(icon)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 获取不存在的成就应该返回 undefined
     */
    it('获取不存在的成就应该返回 undefined', () => {
      fc.assert(
        fc.property(
          achievementIdArb,
          achievementIdArb.filter(id => id !== 'existing_achievement'),
          (existingId, nonExistingId) => {
            // 确保两个 ID 不同
            if (existingId === nonExistingId) return

            // 创建成就
            const achievement: Omit<Achievement, 'unlockedAt'> = {
              id: existingId,
              name: '测试成就',
              description: '测试描述',
              icon: '🎯',
              condition: () => true,
            }

            // 创建成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem([achievement], { storageKey })

            // 获取不存在的成就
            const retrieved = system.getAchievementById(nonExistingId)

            // 验证：返回 undefined
            expect(retrieved).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  // ========== 边界情况测试 ==========

  describe('边界情况', () => {
    /**
     * 空成就列表的处理
     */
    it('空成就列表应该正常工作', () => {
      fc.assert(
        fc.property(
          gameStatsArb,
          (stats) => {
            // 创建空成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem([], { storageKey })

            // 检查成就
            const unlocked = system.checkAchievements(stats)

            // 验证：没有成就被解锁
            expect(unlocked.length).toBe(0)
            expect(system.getAllAchievements().length).toBe(0)
            expect(system.getAchievementStats()).toEqual({ total: 0, unlocked: 0 })
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 所有统计数据为 0 时的处理
     */
    it('所有统计数据为 0 时不应解锁任何成就', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (achievementCount) => {
            // 创建多个成就，阈值都大于 0
            const achievements: Omit<Achievement, 'unlockedAt'>[] = []
            for (let i = 0; i < achievementCount; i++) {
              achievements.push({
                id: `achievement_${i}`,
                name: `成就 ${i}`,
                description: `描述 ${i}`,
                icon: '🎯',
                condition: (stats: GameStats) => stats.totalScore >= 100,
              })
            }

            // 创建所有数据为 0 的统计
            const stats: GameStats = {
              totalScore: 0,
              highestStage: 0,
              totalKills: 0,
              totalPlayTime: 0,
              perfectStages: 0,
            }

            // 创建成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem(achievements, { storageKey })

            // 检查成就
            const unlocked = system.checkAchievements(stats)

            // 验证：没有成就被解锁
            expect(unlocked.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 成就条件函数抛出异常时应该跳过该成就
     */
    it('成就条件函数抛出异常时应该跳过该成就', () => {
      fc.assert(
        fc.property(
          gameStatsArb,
          (stats) => {
            // 创建一个会抛出异常的成就和一个正常的成就
            const achievements: Omit<Achievement, 'unlockedAt'>[] = [
              {
                id: 'error_achievement',
                name: '错误成就',
                description: '会抛出异常',
                icon: '❌',
                condition: () => {
                  throw new Error('测试异常')
                },
              },
              {
                id: 'normal_achievement',
                name: '正常成就',
                description: '正常检查',
                icon: '✅',
                condition: () => true, // 总是满足条件
              },
            ]

            // 创建成就系统
            const storageKey = generateStorageKey()
            const system = new AchievementSystem(achievements, { storageKey })

            // 检查成就（不应抛出异常）
            const unlocked = system.checkAchievements(stats)

            // 验证：正常成就应该被解锁，错误成就被跳过
            expect(unlocked.length).toBe(1)
            expect(unlocked[0].id).toBe('normal_achievement')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * localStorage 数据损坏时应该正常处理
     */
    it('localStorage 数据损坏时应该返回空数组', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (invalidData) => {
            // 跳过有效的 JSON 数组
            try {
              const parsed = JSON.parse(invalidData)
              if (Array.isArray(parsed)) return
            } catch {
              // 继续测试
            }

            // 创建成就
            const achievement: Omit<Achievement, 'unlockedAt'> = {
              id: 'test_achievement',
              name: '测试成就',
              description: '测试描述',
              icon: '🎯',
              condition: () => true,
            }

            // 预先存储无效数据
            const storageKey = generateStorageKey()
            localStorage.setItem(storageKey, invalidData)

            // 创建成就系统
            const system = new AchievementSystem([achievement], { storageKey })

            // 验证：应该返回空数组而不是抛出异常
            const unlocked = system.getUnlockedAchievements()
            expect(Array.isArray(unlocked)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
