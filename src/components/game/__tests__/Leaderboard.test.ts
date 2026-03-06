/**
 * Leaderboard 组件单元测试
 * 
 * 测试排行榜组件的基本功能：
 * - 显示排行榜列表
 * - 高亮显示新记录
 * - 显示金银铜牌图标
 * 
 * 需求: 7.2, 7.3
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Leaderboard from '../Leaderboard.vue'
import { LeaderboardManager } from '@/game/LeaderboardManager'

// Mock localStorage
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
    })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Leaderboard 组件', () => {
  let manager: LeaderboardManager

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    manager = new LeaderboardManager({ storageKey: 'test_leaderboard' })
  })

  describe('空状态', () => {
    it('当没有记录时应显示空状态', async () => {
      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      expect(wrapper.find('.leaderboard-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('暂无记录')
    })

    it('空状态应显示提示文字', async () => {
      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      expect(wrapper.text()).toContain('完成游戏后将显示在这里')
    })
  })

  describe('排行榜列表', () => {
    it('应按分数降序显示记录', async () => {
      // 先添加数据
      manager.addScore({
        playerName: '玩家1',
        score: 1000,
        stage: 3,
        timestamp: Date.now(),
        achievements: []
      })
      manager.addScore({
        playerName: '玩家2',
        score: 800,
        stage: 2,
        timestamp: Date.now(),
        achievements: []
      })
      manager.addScore({
        playerName: '玩家3',
        score: 600,
        stage: 2,
        timestamp: Date.now(),
        achievements: []
      })

      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      const items = wrapper.findAll('.leaderboard-item')
      expect(items.length).toBe(3)

      // 验证排序（分数从高到低）
      const scores = items.map(item => {
        const scoreText = item.find('.score-value').text()
        return parseInt(scoreText.replace(/,/g, ''))
      })
      expect(scores).toEqual([1000, 800, 600])
    })

    it('应显示玩家名称', async () => {
      manager.addScore({
        playerName: '玩家1',
        score: 1000,
        stage: 3,
        timestamp: Date.now(),
        achievements: []
      })
      manager.addScore({
        playerName: '玩家2',
        score: 800,
        stage: 2,
        timestamp: Date.now(),
        achievements: []
      })

      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      expect(wrapper.text()).toContain('玩家1')
      expect(wrapper.text()).toContain('玩家2')
    })

    it('应显示关卡信息', async () => {
      manager.addScore({
        playerName: '玩家1',
        score: 1000,
        stage: 3,
        timestamp: Date.now(),
        achievements: []
      })
      manager.addScore({
        playerName: '玩家2',
        score: 800,
        stage: 2,
        timestamp: Date.now(),
        achievements: []
      })

      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      const stageTexts = wrapper.findAll('.player-stage')
      expect(stageTexts[0].text()).toContain('关卡 3')
      expect(stageTexts[1].text()).toContain('关卡 2')
    })
  })

  describe('排名图标', () => {
    beforeEach(() => {
      // 添加 4 条记录以测试前三名和第四名
      for (let i = 0; i < 4; i++) {
        manager.addScore({
          playerName: `玩家${i + 1}`,
          score: 1000 - i * 100,
          stage: 3,
          timestamp: Date.now(),
          achievements: []
        })
      }
    })

    it('第一名应显示金牌图标', async () => {
      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      const firstItem = wrapper.findAll('.leaderboard-item')[0]
      expect(firstItem.find('.rank-medal.gold').exists()).toBe(true)
      expect(firstItem.text()).toContain('🥇')
    })

    it('第二名应显示银牌图标', async () => {
      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      const secondItem = wrapper.findAll('.leaderboard-item')[1]
      expect(secondItem.find('.rank-medal.silver').exists()).toBe(true)
      expect(secondItem.text()).toContain('🥈')
    })

    it('第三名应显示铜牌图标', async () => {
      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      const thirdItem = wrapper.findAll('.leaderboard-item')[2]
      expect(thirdItem.find('.rank-medal.bronze').exists()).toBe(true)
      expect(thirdItem.text()).toContain('🥉')
    })

    it('第四名及以后应显示数字排名', async () => {
      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      const fourthItem = wrapper.findAll('.leaderboard-item')[3]
      expect(fourthItem.find('.rank-number').exists()).toBe(true)
      expect(fourthItem.find('.rank-number').text()).toBe('4')
    })

    it('前三名应有特殊样式类', async () => {
      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      const items = wrapper.findAll('.leaderboard-item')
      expect(items[0].classes()).toContain('is-top-three')
      expect(items[1].classes()).toContain('is-top-three')
      expect(items[2].classes()).toContain('is-top-three')
      expect(items[3].classes()).not.toContain('is-top-three')
    })
  })

  describe('高亮新记录', () => {
    it('应高亮显示指定 ID 的记录', async () => {
      manager.addScore({
        playerName: '新玩家',
        score: 500,
        stage: 1,
        timestamp: Date.now(),
        achievements: []
      })

      const scores = manager.getScores()
      const newEntryId = scores[0].id

      const wrapper = mount(Leaderboard, {
        props: {
          manager,
          highlightedId: newEntryId
        }
      })
      await flushPromises()

      const highlightedItem = wrapper.find('.leaderboard-item.is-highlighted')
      expect(highlightedItem.exists()).toBe(true)
    })

    it('高亮记录应显示 NEW! 标识', async () => {
      manager.addScore({
        playerName: '新玩家',
        score: 500,
        stage: 1,
        timestamp: Date.now(),
        achievements: []
      })

      const scores = manager.getScores()
      const newEntryId = scores[0].id

      const wrapper = mount(Leaderboard, {
        props: {
          manager,
          highlightedId: newEntryId
        }
      })
      await flushPromises()

      expect(wrapper.find('.new-record-badge').exists()).toBe(true)
      expect(wrapper.find('.new-record-badge').text()).toBe('NEW!')
    })

    it('非高亮记录不应显示 NEW! 标识', async () => {
      manager.addScore({
        playerName: '玩家1',
        score: 500,
        stage: 1,
        timestamp: Date.now(),
        achievements: []
      })
      manager.addScore({
        playerName: '玩家2',
        score: 400,
        stage: 1,
        timestamp: Date.now(),
        achievements: []
      })

      const scores = manager.getScores()
      const firstEntryId = scores[0].id

      const wrapper = mount(Leaderboard, {
        props: {
          manager,
          highlightedId: firstEntryId
        }
      })
      await flushPromises()

      // 只有一个 NEW! 标识
      expect(wrapper.findAll('.new-record-badge').length).toBe(1)
    })
  })

  describe('清空功能', () => {
    it('默认不显示清空按钮', async () => {
      manager.addScore({
        playerName: '玩家1',
        score: 500,
        stage: 1,
        timestamp: Date.now(),
        achievements: []
      })

      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      expect(wrapper.find('.clear-button').exists()).toBe(false)
    })

    it('设置 showClearButton 后应显示清空按钮', async () => {
      manager.addScore({
        playerName: '玩家1',
        score: 500,
        stage: 1,
        timestamp: Date.now(),
        achievements: []
      })

      const wrapper = mount(Leaderboard, {
        props: {
          manager,
          showClearButton: true
        }
      })
      await flushPromises()

      expect(wrapper.find('.clear-button').exists()).toBe(true)
    })

    it('点击清空按钮应清空记录并触发事件', async () => {
      manager.addScore({
        playerName: '玩家1',
        score: 500,
        stage: 1,
        timestamp: Date.now(),
        achievements: []
      })

      const wrapper = mount(Leaderboard, {
        props: {
          manager,
          showClearButton: true
        }
      })
      await flushPromises()

      await wrapper.find('.clear-button').trigger('click')
      await flushPromises()

      // 验证记录已清空
      expect(wrapper.find('.leaderboard-empty').exists()).toBe(true)

      // 验证事件已触发
      expect(wrapper.emitted('clear')).toBeTruthy()
    })
  })

  describe('分数格式化', () => {
    it('应正确格式化大数字', async () => {
      manager.addScore({
        playerName: '高分玩家',
        score: 1234567,
        stage: 3,
        timestamp: Date.now(),
        achievements: []
      })

      const wrapper = mount(Leaderboard, {
        props: { manager }
      })
      await flushPromises()

      // 验证分数已格式化（包含千位分隔符）
      const scoreText = wrapper.find('.score-value').text()
      expect(scoreText).toContain('1')
      expect(scoreText).toContain('234')
      expect(scoreText).toContain('567')
    })
  })
})
