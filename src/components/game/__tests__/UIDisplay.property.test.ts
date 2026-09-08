import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import * as fc from 'fast-check'
import GameContainer from '../GameContainer.vue'

/**
 * Property-Based Tests for UI Display
 *
 * Tests Property 9: UI 信息实时更新
 * Validates Requirements: 6.1, 6.2, 6.4
 */

describe('GameContainer UI Display - Property Tests', () => {
  // 每个样本独占 Pinia，只注入 HUD 状态，不启动与展示断言无关的游戏循环。
  const mountGameUI = () => {
    const wrapper = mount(GameContainer, { global: { plugins: [createPinia()] } })
    wrapper.vm.isGameActive = true
    wrapper.vm.isPaused = false
    wrapper.vm.isGameOver = false
    return wrapper
  }

  beforeEach(() => {
    // Mock canvas context
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          getImageData: vi.fn(),
          putImageData: vi.fn(),
          createImageData: vi.fn(),
          setTransform: vi.fn(),
          drawImage: vi.fn(),
          save: vi.fn(),
          fillText: vi.fn(),
          restore: vi.fn(),
          beginPath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          closePath: vi.fn(),
          stroke: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          measureText: vi.fn(() => ({ width: 0 })),
          transform: vi.fn(),
          rect: vi.fn(),
          clip: vi.fn(),
        }) as any
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Property 9: UI 信息实时更新
   *
   * For any player health or missile count change,
   * the UI display should update immediately in the next frame.
   *
   * **Validates: Requirements 6.1, 6.2, 6.4**
   */
  it('should update UI information in real-time when player health or missile count changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }), // playerHealth
        fc.integer({ min: 1, max: 20 }), // 最大生命值必须为正数
        fc.integer({ min: 0, max: 50 }), // missileCount
        async (health, maxHealth, missiles) => {
          const wrapper = mountGameUI()
          try {
            // 先显示初始 HUD，再验证下一次响应式更新。
            await wrapper.vm.$nextTick()
            expect(wrapper.find('.game-hud').exists()).toBe(true)
            // Act - Update player health and missile count
            wrapper.vm.playerHealth = health
            wrapper.vm.playerMaxHealth = Math.max(maxHealth, health) // Ensure maxHealth >= health
            wrapper.vm.missileCount = missiles

            // Wait for next frame (UI update)
            await wrapper.vm.$nextTick()

            // Assert - Check that UI displays the updated values
            const healthText = wrapper.find('.health-text')
            const missileText = wrapper.find('.missile-text')

            expect(healthText.exists()).toBe(true)
            const expectedHealthText = `${health}/${Math.max(maxHealth, health)}`
            expect(healthText.text()).toBe(expectedHealthText)
            expect(missileText.exists()).toBe(true)
            expect(missileText.text()).toBe(missiles.toString())
            // Verify health bar width percentage
            const healthFill = wrapper.find('.health-fill')
            expect(healthFill.exists()).toBe(true)
            const expectedPercentage = (health / Math.max(maxHealth, health)) * 100
            const style = healthFill.attributes('style')
            expect(style).toContain(`width: ${expectedPercentage}%`)
          } finally {
            wrapper.unmount()
          }
        }
      )
    )
  })

  /**
   * Additional test: UI elements should be visible when game is active
   */
  it('should display health and missile UI when game is active', async () => {
    const wrapper = mountGameUI()
    try {
      await wrapper.vm.$nextTick()

      // Check that HUD elements exist
      expect(wrapper.find('.game-hud').exists()).toBe(true)
      expect(wrapper.find('.health-display').exists()).toBe(true)
      expect(wrapper.find('.missile-display').exists()).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })

  /**
   * Additional test: UI should hide when game is paused or over
   */
  it('should hide UI when game is paused or over', async () => {
    const wrapper = mountGameUI()
    try {
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.game-hud').exists()).toBe(true)
      // Test paused state
      wrapper.vm.isPaused = true
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.game-hud').exists()).toBe(false)
      // Test game over state
      wrapper.vm.isPaused = false
      wrapper.vm.isGameOver = true
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.game-hud').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  /**
   * Additional test: Health bar should reflect health percentage correctly
   */
  it('should display health bar width proportional to health percentage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }), // maxHealth (must be > 0)
        fc.double({ min: 0, max: 1, noNaN: true }), // 有限且有效的生命比例
        async (maxHealth, healthPercentage) => {
          const wrapper = mountGameUI()
          try {
            const health = Math.floor(maxHealth * healthPercentage)

            wrapper.vm.playerHealth = health
            wrapper.vm.playerMaxHealth = maxHealth

            await wrapper.vm.$nextTick()

            const healthFill = wrapper.find('.health-fill')
            expect(healthFill.exists()).toBe(true)
            const expectedPercentage = (health / maxHealth) * 100
            const style = healthFill.attributes('style')
            expect(style).toContain(`width: ${expectedPercentage}%`)
          } finally {
            wrapper.unmount()
          }
        }
      )
    )
  })

  /**
   * Additional test: Missile count should always be non-negative
   */
  it('should display non-negative missile count', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 100 }), async missiles => {
        const wrapper = mountGameUI()
        try {
          wrapper.vm.missileCount = missiles

          await wrapper.vm.$nextTick()

          const missileText = wrapper.find('.missile-text')
          expect(missileText.exists()).toBe(true)
          const displayedCount = parseInt(missileText.text())
          expect(displayedCount).toBeGreaterThanOrEqual(0)
          expect(displayedCount).toBe(missiles)
        } finally {
          wrapper.unmount()
        }
      })
    )
  })
})
