/**
 * AchievementSystem 单元测试
 * 
 * 测试成就系统的核心功能：
 * - 成就定义和初始化
 * - 成就条件检查
 * - 成就持久化存储
 * - 成就查询接口
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AchievementSystem,
  Achievement,
  GameStats,
  DEFAULT_ACHIEVEMENTS,
} from '../AchievementSystem'

// 测试用的游戏统计数据
const createTestStats = (overrides: Partial<GameStats> = {}): GameStats => ({
  totalScore: 0,
  highestStage: 0,
  totalKills: 0,
  totalPlayTime: 0,
  perfectStages: 0,
  ...overrides,
})

// 测试用的成就定义
const createTestAchievements = (): Omit<Achievement, 'unlockedAt'>[] => [
  {
    id: 'test_score',
    name: '测试分数',
    description: '获得 100 分',
    icon: '🎯',
    condition: (stats) => stats.totalScore >= 100,
  },
  {
    id: 'test_kills',
    name: '测试击杀',
    description: '击杀 10 个敌人',
    icon: '💥',
    condition: (stats) => stats.totalKills >= 10,
  },
  {
    id: 'test_stage',
    name: '测试关卡',
    description: '通过第 3 关',
    icon: '⭐',
    condition: (stats) => stats.highestStage >= 3,
  },
]

describe('AchievementSystem（成就系统）', () => {
  const testStorageKey = 'test_achievements'
  let system: AchievementSystem

  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear()
    // 创建测试实例
    system = new AchievementSystem(createTestAchievements(), {
      storageKey: testStorageKey,
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('构造函数', () => {
    it('应该使用默认成就定义', () => {
      const defaultSystem = new AchievementSystem()
      const achievements = defaultSystem.getAllAchievements()
      expect(achievements.length).toBe(DEFAULT_ACHIEVEMENTS.length)
    })

    it('应该使用自定义成就定义', () => {
      const achievements = system.getAllAchievements()
      expect(achievements.length).toBe(3)
    })

    it('应该使用自定义存储键', () => {
      expect(system.getStorageKey()).toBe(testStorageKey)
    })

    it('应该加载已存储的解锁状态', () => {
      // 预先存储一个已解锁的成就
      localStorage.setItem(testStorageKey, JSON.stringify(['test_score']))
      
      // 创建新实例
      const newSystem = new AchievementSystem(createTestAchievements(), {
        storageKey: testStorageKey,
      })
      
      expect(newSystem.isAchievementUnlocked('test_score')).toBe(true)
      expect(newSystem.isAchievementUnlocked('test_kills')).toBe(false)
    })
  })

  describe('checkAchievements（检查成就）', () => {
    it('应该在满足条件时解锁成就', () => {
      const stats = createTestStats({ totalScore: 100 })
      const unlocked = system.checkAchievements(stats)
      
      expect(unlocked.length).toBe(1)
      expect(unlocked[0].id).toBe('test_score')
    })

    it('应该同时解锁多个满足条件的成就', () => {
      const stats = createTestStats({
        totalScore: 100,
        totalKills: 10,
        highestStage: 3,
      })
      const unlocked = system.checkAchievements(stats)
      
      expect(unlocked.length).toBe(3)
      expect(unlocked.map(a => a.id)).toContain('test_score')
      expect(unlocked.map(a => a.id)).toContain('test_kills')
      expect(unlocked.map(a => a.id)).toContain('test_stage')
    })

    it('应该不重复解锁已解锁的成就', () => {
      const stats = createTestStats({ totalScore: 100 })
      
      // 第一次检查
      const firstUnlock = system.checkAchievements(stats)
      expect(firstUnlock.length).toBe(1)
      
      // 第二次检查（相同条件）
      const secondUnlock = system.checkAchievements(stats)
      expect(secondUnlock.length).toBe(0)
    })

    it('应该在不满足条件时不解锁成就', () => {
      const stats = createTestStats({ totalScore: 50 }) // 不足 100 分
      const unlocked = system.checkAchievements(stats)
      
      expect(unlocked.length).toBe(0)
    })

    it('应该为解锁的成就设置解锁时间', () => {
      const beforeTime = Date.now()
      const stats = createTestStats({ totalScore: 100 })
      const unlocked = system.checkAchievements(stats)
      const afterTime = Date.now()
      
      expect(unlocked[0].unlockedAt).toBeDefined()
      expect(unlocked[0].unlockedAt).toBeGreaterThanOrEqual(beforeTime)
      expect(unlocked[0].unlockedAt).toBeLessThanOrEqual(afterTime)
    })

    it('应该在条件函数抛出异常时跳过该成就', () => {
      const errorAchievements: Omit<Achievement, 'unlockedAt'>[] = [
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
          condition: (stats) => stats.totalScore >= 100,
        },
      ]
      
      const errorSystem = new AchievementSystem(errorAchievements, {
        storageKey: 'error_test',
      })
      
      // 应该不抛出异常，并且正常成就应该被解锁
      const stats = createTestStats({ totalScore: 100 })
      const unlocked = errorSystem.checkAchievements(stats)
      
      expect(unlocked.length).toBe(1)
      expect(unlocked[0].id).toBe('normal_achievement')
    })
  })

  describe('getUnlockedAchievements（获取已解锁成就）', () => {
    it('应该在没有解锁时返回空数组', () => {
      const unlocked = system.getUnlockedAchievements()
      expect(unlocked).toEqual([])
    })

    it('应该返回已解锁的成就 ID 列表', () => {
      const stats = createTestStats({ totalScore: 100, totalKills: 10 })
      system.checkAchievements(stats)
      
      const unlocked = system.getUnlockedAchievements()
      expect(unlocked).toContain('test_score')
      expect(unlocked).toContain('test_kills')
      expect(unlocked.length).toBe(2)
    })

    it('应该在 JSON 解析失败时返回空数组', () => {
      localStorage.setItem(testStorageKey, 'invalid json')
      const unlocked = system.getUnlockedAchievements()
      expect(unlocked).toEqual([])
    })

    it('应该在存储数据不是数组时返回空数组', () => {
      localStorage.setItem(testStorageKey, JSON.stringify({ invalid: 'data' }))
      const unlocked = system.getUnlockedAchievements()
      expect(unlocked).toEqual([])
    })

    it('应该过滤无效的值', () => {
      localStorage.setItem(testStorageKey, JSON.stringify(['valid_id', 123, null, 'another_id']))
      const unlocked = system.getUnlockedAchievements()
      expect(unlocked).toEqual(['valid_id', 'another_id'])
    })
  })

  describe('getAllAchievements（获取所有成就）', () => {
    it('应该返回所有成就的副本', () => {
      const achievements = system.getAllAchievements()
      expect(achievements.length).toBe(3)
      
      // 修改返回的数组不应影响原始数据
      achievements[0].name = 'Modified'
      const originalAchievements = system.getAllAchievements()
      expect(originalAchievements[0].name).toBe('测试分数')
    })

    it('应该包含解锁状态信息', () => {
      const stats = createTestStats({ totalScore: 100 })
      system.checkAchievements(stats)
      
      const achievements = system.getAllAchievements()
      const scoreAchievement = achievements.find(a => a.id === 'test_score')
      const killsAchievement = achievements.find(a => a.id === 'test_kills')
      
      expect(scoreAchievement?.unlockedAt).toBeDefined()
      expect(killsAchievement?.unlockedAt).toBeUndefined()
    })
  })

  describe('getAchievementStats（获取成就统计）', () => {
    it('应该返回正确的统计信息', () => {
      const stats = system.getAchievementStats()
      expect(stats.total).toBe(3)
      expect(stats.unlocked).toBe(0)
    })

    it('应该在解锁后更新统计信息', () => {
      const gameStats = createTestStats({ totalScore: 100, totalKills: 10 })
      system.checkAchievements(gameStats)
      
      const stats = system.getAchievementStats()
      expect(stats.total).toBe(3)
      expect(stats.unlocked).toBe(2)
    })
  })

  describe('getAchievementById（根据 ID 获取成就）', () => {
    it('应该返回指定 ID 的成就', () => {
      const achievement = system.getAchievementById('test_score')
      expect(achievement).toBeDefined()
      expect(achievement?.name).toBe('测试分数')
    })

    it('应该在 ID 不存在时返回 undefined', () => {
      const achievement = system.getAchievementById('non_existent')
      expect(achievement).toBeUndefined()
    })

    it('应该返回成就的副本', () => {
      const achievement = system.getAchievementById('test_score')
      if (achievement) {
        achievement.name = 'Modified'
      }
      
      const original = system.getAchievementById('test_score')
      expect(original?.name).toBe('测试分数')
    })
  })

  describe('isAchievementUnlocked（检查成就是否已解锁）', () => {
    it('应该在未解锁时返回 false', () => {
      expect(system.isAchievementUnlocked('test_score')).toBe(false)
    })

    it('应该在已解锁时返回 true', () => {
      const stats = createTestStats({ totalScore: 100 })
      system.checkAchievements(stats)
      
      expect(system.isAchievementUnlocked('test_score')).toBe(true)
    })
  })

  describe('resetAchievements（重置成就）', () => {
    it('应该清除所有解锁状态', () => {
      const stats = createTestStats({ totalScore: 100, totalKills: 10 })
      system.checkAchievements(stats)
      
      expect(system.getUnlockedAchievements().length).toBe(2)
      
      system.resetAchievements()
      
      expect(system.getUnlockedAchievements().length).toBe(0)
    })

    it('应该清除 localStorage 中的数据', () => {
      const stats = createTestStats({ totalScore: 100 })
      system.checkAchievements(stats)
      
      expect(localStorage.getItem(testStorageKey)).not.toBeNull()
      
      system.resetAchievements()
      
      expect(localStorage.getItem(testStorageKey)).toBeNull()
    })

    it('应该清除内存中的解锁时间', () => {
      const stats = createTestStats({ totalScore: 100 })
      system.checkAchievements(stats)
      
      let achievement = system.getAchievementById('test_score')
      expect(achievement?.unlockedAt).toBeDefined()
      
      system.resetAchievements()
      
      achievement = system.getAchievementById('test_score')
      expect(achievement?.unlockedAt).toBeUndefined()
    })
  })

  describe('默认成就定义', () => {
    it('应该包含至少 5 种成就', () => {
      expect(DEFAULT_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(5)
    })

    it('每个成就应该有必需的字段', () => {
      for (const achievement of DEFAULT_ACHIEVEMENTS) {
        expect(achievement.id).toBeDefined()
        expect(achievement.name).toBeDefined()
        expect(achievement.description).toBeDefined()
        expect(achievement.icon).toBeDefined()
        expect(typeof achievement.condition).toBe('function')
      }
    })

    it('成就 ID 应该唯一', () => {
      const ids = DEFAULT_ACHIEVEMENTS.map(a => a.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('初次尝试成就应该在通过第 1 关时解锁', () => {
      const defaultSystem = new AchievementSystem()
      const stats = createTestStats({ highestStage: 1 })
      const unlocked = defaultSystem.checkAchievements(stats)
      
      expect(unlocked.some(a => a.id === 'first_try')).toBe(true)
    })

    it('高分玩家成就应该在获得 10000 分时解锁', () => {
      const defaultSystem = new AchievementSystem()
      const stats = createTestStats({ totalScore: 10000 })
      const unlocked = defaultSystem.checkAchievements(stats)
      
      expect(unlocked.some(a => a.id === 'high_scorer')).toBe(true)
    })

    it('关卡大师成就应该在通过第 5 关时解锁', () => {
      const defaultSystem = new AchievementSystem()
      const stats = createTestStats({ highestStage: 5 })
      const unlocked = defaultSystem.checkAchievements(stats)
      
      expect(unlocked.some(a => a.id === 'stage_master')).toBe(true)
    })

    it('杀敌达人成就应该在击杀 100 个敌人时解锁', () => {
      const defaultSystem = new AchievementSystem()
      const stats = createTestStats({ totalKills: 100 })
      const unlocked = defaultSystem.checkAchievements(stats)
      
      expect(unlocked.some(a => a.id === 'kill_expert')).toBe(true)
    })

    it('持久战士成就应该在游戏时间超过 5 分钟时解锁', () => {
      const defaultSystem = new AchievementSystem()
      const stats = createTestStats({ totalPlayTime: 5 * 60 * 1000 })
      const unlocked = defaultSystem.checkAchievements(stats)
      
      expect(unlocked.some(a => a.id === 'endurance_warrior')).toBe(true)
    })
  })

  describe('持久化存储', () => {
    it('应该将解锁的成就保存到 localStorage', () => {
      const stats = createTestStats({ totalScore: 100 })
      system.checkAchievements(stats)
      
      const stored = localStorage.getItem(testStorageKey)
      expect(stored).not.toBeNull()
      
      const parsed = JSON.parse(stored!)
      expect(parsed).toContain('test_score')
    })

    it('应该在新实例中恢复解锁状态', () => {
      const stats = createTestStats({ totalScore: 100 })
      system.checkAchievements(stats)
      
      // 创建新实例
      const newSystem = new AchievementSystem(createTestAchievements(), {
        storageKey: testStorageKey,
      })
      
      expect(newSystem.isAchievementUnlocked('test_score')).toBe(true)
    })
  })
})
