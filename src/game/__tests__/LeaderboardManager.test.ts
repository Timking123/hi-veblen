/**
 * LeaderboardManager 单元测试
 * 
 * 验证排行榜管理器的核心功能：
 * - 分数存储（最多 10 条）
 * - 分数排序（降序）
 * - 高分判断
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LeaderboardManager, type ScoreEntry } from '../LeaderboardManager'

// 模拟 localStorage
const localStorageMock = (() => {
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
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('LeaderboardManager（排行榜管理器）', () => {
  let manager: LeaderboardManager

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    manager = new LeaderboardManager()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('构造函数', () => {
    it('应该使用默认配置', () => {
      const config = manager.getConfig()
      expect(config.maxEntries).toBe(10)
      expect(config.storageKey).toBe('game_leaderboard')
    })

    it('应该允许自定义配置', () => {
      const customManager = new LeaderboardManager({
        maxEntries: 5,
        storageKey: 'custom_leaderboard',
      })
      const config = customManager.getConfig()
      expect(config.maxEntries).toBe(5)
      expect(config.storageKey).toBe('custom_leaderboard')
    })
  })

  describe('getScores（获取分数）', () => {
    it('应该在没有数据时返回空数组', () => {
      const scores = manager.getScores()
      expect(scores).toEqual([])
    })

    it('应该返回存储的分数记录', () => {
      const mockScores: ScoreEntry[] = [
        {
          id: '1',
          playerName: '玩家1',
          score: 1000,
          stage: 3,
          timestamp: Date.now(),
          achievements: [],
        },
      ]
      localStorageMock.setItem('game_leaderboard', JSON.stringify(mockScores))

      const scores = manager.getScores()
      expect(scores).toHaveLength(1)
      expect(scores[0].playerName).toBe('玩家1')
      expect(scores[0].score).toBe(1000)
    })

    it('应该在 JSON 解析失败时返回空数组', () => {
      localStorageMock.setItem('game_leaderboard', 'invalid json')

      const scores = manager.getScores()
      expect(scores).toEqual([])
    })
  })

  describe('addScore（添加分数）', () => {
    it('应该添加新的分数记录', () => {
      const result = manager.addScore({
        playerName: '玩家1',
        score: 1000,
        stage: 3,
        timestamp: Date.now(),
        achievements: [],
      })

      expect(result.isHighScore).toBe(true)
      expect(result.rank).toBe(1)

      const scores = manager.getScores()
      expect(scores).toHaveLength(1)
      expect(scores[0].playerName).toBe('玩家1')
    })

    it('应该按分数降序排序', () => {
      manager.addScore({
        playerName: '玩家1',
        score: 500,
        stage: 2,
        timestamp: Date.now(),
        achievements: [],
      })

      manager.addScore({
        playerName: '玩家2',
        score: 1000,
        stage: 3,
        timestamp: Date.now(),
        achievements: [],
      })

      manager.addScore({
        playerName: '玩家3',
        score: 750,
        stage: 2,
        timestamp: Date.now(),
        achievements: [],
      })

      const scores = manager.getScores()
      expect(scores[0].score).toBe(1000)
      expect(scores[1].score).toBe(750)
      expect(scores[2].score).toBe(500)
    })

    it('应该限制最多 10 条记录', () => {
      // 添加 12 条记录
      for (let i = 0; i < 12; i++) {
        manager.addScore({
          playerName: `玩家${i}`,
          score: i * 100,
          stage: 1,
          timestamp: Date.now(),
          achievements: [],
        })
      }

      const scores = manager.getScores()
      expect(scores).toHaveLength(10)
      // 最高分应该是 1100（第 12 条记录）
      expect(scores[0].score).toBe(1100)
      // 最低分应该是 200（第 3 条记录）
      expect(scores[9].score).toBe(200)
    })

    it('应该返回正确的排名', () => {
      // 先添加一些分数
      manager.addScore({
        playerName: '玩家1',
        score: 1000,
        stage: 3,
        timestamp: Date.now(),
        achievements: [],
      })

      manager.addScore({
        playerName: '玩家2',
        score: 500,
        stage: 2,
        timestamp: Date.now(),
        achievements: [],
      })

      // 添加一个中间分数
      const result = manager.addScore({
        playerName: '玩家3',
        score: 750,
        stage: 2,
        timestamp: Date.now(),
        achievements: [],
      })

      expect(result.rank).toBe(2)
      expect(result.isHighScore).toBe(true)
    })

    it('应该为每条记录生成唯一 ID', () => {
      manager.addScore({
        playerName: '玩家1',
        score: 1000,
        stage: 3,
        timestamp: Date.now(),
        achievements: [],
      })

      manager.addScore({
        playerName: '玩家2',
        score: 500,
        stage: 2,
        timestamp: Date.now(),
        achievements: [],
      })

      const scores = manager.getScores()
      expect(scores[0].id).toBeDefined()
      expect(scores[1].id).toBeDefined()
      expect(scores[0].id).not.toBe(scores[1].id)
    })
  })

  describe('isHighScore（高分判断）', () => {
    it('应该在排行榜为空时返回 true', () => {
      expect(manager.isHighScore(100)).toBe(true)
    })

    it('应该在排行榜未满时返回 true', () => {
      for (let i = 0; i < 5; i++) {
        manager.addScore({
          playerName: `玩家${i}`,
          score: i * 100,
          stage: 1,
          timestamp: Date.now(),
          achievements: [],
        })
      }

      // 即使分数很低，排行榜未满时也是高分
      expect(manager.isHighScore(1)).toBe(true)
    })

    it('应该在分数高于最低分时返回 true', () => {
      // 填满排行榜
      for (let i = 0; i < 10; i++) {
        manager.addScore({
          playerName: `玩家${i}`,
          score: (i + 1) * 100, // 100, 200, ..., 1000
          stage: 1,
          timestamp: Date.now(),
          achievements: [],
        })
      }

      // 最低分是 100，高于 100 的分数应该是高分
      expect(manager.isHighScore(150)).toBe(true)
    })

    it('应该在分数低于或等于最低分时返回 false', () => {
      // 填满排行榜
      for (let i = 0; i < 10; i++) {
        manager.addScore({
          playerName: `玩家${i}`,
          score: (i + 1) * 100, // 100, 200, ..., 1000
          stage: 1,
          timestamp: Date.now(),
          achievements: [],
        })
      }

      // 最低分是 100
      expect(manager.isHighScore(100)).toBe(false)
      expect(manager.isHighScore(50)).toBe(false)
    })
  })

  describe('clearScores（清空分数）', () => {
    it('应该清空所有分数记录', () => {
      manager.addScore({
        playerName: '玩家1',
        score: 1000,
        stage: 3,
        timestamp: Date.now(),
        achievements: [],
      })

      expect(manager.getScores()).toHaveLength(1)

      manager.clearScores()

      expect(manager.getScores()).toHaveLength(0)
    })
  })

  describe('自定义配置', () => {
    it('应该支持自定义最大记录数', () => {
      const customManager = new LeaderboardManager({ maxEntries: 3 })

      for (let i = 0; i < 5; i++) {
        customManager.addScore({
          playerName: `玩家${i}`,
          score: i * 100,
          stage: 1,
          timestamp: Date.now(),
          achievements: [],
        })
      }

      const scores = customManager.getScores()
      expect(scores).toHaveLength(3)
    })

    it('应该支持自定义存储键', () => {
      const customManager = new LeaderboardManager({ storageKey: 'my_scores' })

      customManager.addScore({
        playerName: '玩家1',
        score: 1000,
        stage: 3,
        timestamp: Date.now(),
        achievements: [],
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'my_scores',
        expect.any(String)
      )
    })
  })
})
