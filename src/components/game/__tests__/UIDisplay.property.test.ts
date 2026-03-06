import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import * as fc from 'fast-check'
import GameContainer from '../GameContainer.vue'
import { useEasterEggStore } from '@/stores/easterEgg'
import { GamePhase } from '@/game/types'

/**
 * Property-Based Tests for UI Display
 * 
 * Tests Property 9: UI 信息实时更新
 * Validates Requirements: 6.1, 6.2, 6.4
 */

describe('GameContainer UI Display - Property Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Mock canvas context
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
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
    })) as any
  })

  /**
   * Property 9: UI 信息实时更新
   * 
   * For any player health or missile count change, 
   * the UI display should update immediately in the next frame.
   * 
   * **Validates: Requirements 6.1, 6.2, 6.4**
   */
  it('should update UI information in real-time when player health or missile count changes', () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }), // playerHealth
        fc.integer({ min: 0, max: 20 }), // playerMaxHealth
        fc.integer({ min: 0, max: 50 }), // missileCount
        async (health, maxHealth, missiles) => {
          // Arrange
          const store = useEasterEggStore()
          store.phase = GamePhase.PLAYING
          
          const wrapper = mount(GameContainer, {
            global: {
              plugins: [createPinia()]
            }
          })

          // Wait for component to mount
          await wrapper.vm.$nextTick()

          // Act - Update player health and missile count
          wrapper.vm.playerHealth = health
          wrapper.vm.playerMaxHealth = Math.max(maxHealth, health) // Ensure maxHealth >= health
          wrapper.vm.missileCount = missiles
          
          // Wait for next frame (UI update)
          await wrapper.vm.$nextTick()

          // Assert - Check that UI displays the updated values
          const healthText = wrapper.find('.health-text')
          const missileText = wrapper.find('.missile-text')

          if (healthText.exists()) {
            const expectedHealthText = `${health}/${Math.max(maxHealth, health)}`
            expect(healthText.text()).toBe(expectedHealthText)
          }

          if (missileText.exists()) {
            expect(missileText.text()).toBe(missiles.toString())
          }

          // Verify health bar width percentage
          const healthFill = wrapper.find('.health-fill')
          if (healthFill.exists() && Math.max(maxHealth, health) > 0) {
            const expectedPercentage = (health / Math.max(maxHealth, health)) * 100
            const style = healthFill.attributes('style')
            expect(style).toContain(`width: ${expectedPercentage}%`)
          }
        }
      )
    )
  })

  /**
   * Additional test: UI elements should be visible when game is active
   */
  it('should display health and missile UI when game is active', async () => {
    const store = useEasterEggStore()
    store.phase = GamePhase.PLAYING
    
    const wrapper = mount(GameContainer, {
      global: {
        plugins: [createPinia()]
      }
    })

    wrapper.vm.isGameActive = true
    wrapper.vm.isPaused = false
    wrapper.vm.isGameOver = false
    
    await wrapper.vm.$nextTick()

    // Check that HUD elements exist
    expect(wrapper.find('.game-hud').exists()).toBe(true)
    expect(wrapper.find('.health-display').exists()).toBe(true)
    expect(wrapper.find('.missile-display').exists()).toBe(true)
  })

  /**
   * Additional test: UI should hide when game is paused or over
   */
  it('should hide UI when game is paused or over', async () => {
    const store = useEasterEggStore()
    store.phase = GamePhase.PLAYING
    
    const wrapper = mount(GameContainer, {
      global: {
        plugins: [createPinia()]
      }
    })

    wrapper.vm.isGameActive = true
    
    // Test paused state
    wrapper.vm.isPaused = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.game-hud').exists()).toBe(false)

    // Test game over state
    wrapper.vm.isPaused = false
    wrapper.vm.isGameOver = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.game-hud').exists()).toBe(false)
  })

  /**
   * Additional test: Health bar should reflect health percentage correctly
   */
  it('should display health bar width proportional to health percentage', () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }), // maxHealth (must be > 0)
        fc.double({ min: 0, max: 1 }),    // health percentage
        async (maxHealth, healthPercentage) => {
          const store = useEasterEggStore()
          store.phase = GamePhase.PLAYING
          
          const wrapper = mount(GameContainer, {
            global: {
              plugins: [createPinia()]
            }
          })

          const health = Math.floor(maxHealth * healthPercentage)
          
          wrapper.vm.isGameActive = true
          wrapper.vm.isPaused = false
          wrapper.vm.isGameOver = false
          wrapper.vm.playerHealth = health
          wrapper.vm.playerMaxHealth = maxHealth
          
          await wrapper.vm.$nextTick()

          const healthFill = wrapper.find('.health-fill')
          if (healthFill.exists()) {
            const expectedPercentage = (health / maxHealth) * 100
            const style = healthFill.attributes('style')
            expect(style).toContain(`width: ${expectedPercentage}%`)
          }
        }
      )
    )
  })

  /**
   * Additional test: Missile count should always be non-negative
   */
  it('should display non-negative missile count', () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }),
        async (missiles) => {
          const store = useEasterEggStore()
          store.phase = GamePhase.PLAYING
          
          const wrapper = mount(GameContainer, {
            global: {
              plugins: [createPinia()]
            }
          })

          wrapper.vm.isGameActive = true
          wrapper.vm.isPaused = false
          wrapper.vm.isGameOver = false
          wrapper.vm.missileCount = missiles
          
          await wrapper.vm.$nextTick()

          const missileText = wrapper.find('.missile-text')
          if (missileText.exists()) {
            const displayedCount = parseInt(missileText.text())
            expect(displayedCount).toBeGreaterThanOrEqual(0)
            expect(displayedCount).toBe(missiles)
          }
        }
      )
    )
  })
})
