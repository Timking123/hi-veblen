/**
 * CMDWindow 移动端按钮测试
 * 验证需求: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, Pinia } from 'pinia'
import CMDWindow from '../CMDWindow.vue'
import { useEasterEggStore } from '@/stores/easterEgg'
import { GamePhase } from '@/game/types'
import { ResponsiveDetector } from '@/utils/responsiveDetector'

// Mock ResponsiveDetector
vi.mock('@/utils/responsiveDetector', () => {
  return {
    ResponsiveDetector: {
      getInstance: vi.fn()
    }
  }
})

describe('CMDWindow - 移动端开局选择按钮', () => {
  let wrapper: VueWrapper
  let pinia: Pinia
  let store: ReturnType<typeof useEasterEggStore>

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('移动设备显示按钮', () => {
    beforeEach(async () => {
      // Mock 移动设备
      vi.mocked(ResponsiveDetector.getInstance).mockReturnValue({
        getScreenInfo: vi.fn(() => ({
          deviceType: 'mobile',
          isTouchDevice: true,
          width: 375,
          height: 667,
          orientation: 'portrait',
          pixelRatio: 2
        }))
      } as any)

      // 创建 Pinia 实例
      pinia = createPinia()
      setActivePinia(pinia)
      store = useEasterEggStore()

      // 挂载组件
      wrapper = mount(CMDWindow, {
        global: {
          plugins: [pinia]
        }
      })

      // 设置游戏阶段
      store.phase = GamePhase.CMD_WINDOW
      await wrapper.vm.$nextTick()

      // 等待打字动画完成
      await new Promise(resolve => setTimeout(resolve, 1500))
      await wrapper.vm.$nextTick()
    })

    it('应该显示移动端按钮界面', () => {
      const mobileButtons = wrapper.find('.mobile-buttons')
      expect(mobileButtons.exists()).toBe(true)
    })

    it('应该显示红色 Y 按钮', () => {
      const yesButton = wrapper.find('.yes-button')
      expect(yesButton.exists()).toBe(true)
      expect(yesButton.text()).toBe('Y')
    })

    it('应该显示蓝色 N 按钮', () => {
      const noButton = wrapper.find('.no-button')
      expect(noButton.exists()).toBe(true)
      expect(noButton.text()).toBe('N')
    })

    it('Y 按钮按下时应该显示视觉反馈', async () => {
      const yesButton = wrapper.find('.yes-button')
      
      await yesButton.trigger('touchstart')
      await wrapper.vm.$nextTick()
      
      expect(yesButton.classes()).toContain('pressed')
    })

    it('点击 Y 按钮应该开始游戏', async () => {
      const yesButton = wrapper.find('.yes-button')
      const enterRulesSpy = vi.spyOn(store, 'enterRules')
      
      await yesButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(enterRulesSpy).toHaveBeenCalled()
    })

    it('点击 N 按钮应该返回网站', async () => {
      const noButton = wrapper.find('.no-button')
      const restoreNormalPageSpy = vi.spyOn(store, 'restoreNormalPage')
      
      await noButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      expect(restoreNormalPageSpy).toHaveBeenCalled()
    })
  })

  describe('桌面设备显示键盘输入', () => {
    beforeEach(async () => {
      // Mock 桌面设备
      vi.mocked(ResponsiveDetector.getInstance).mockReturnValue({
        getScreenInfo: vi.fn(() => ({
          deviceType: 'desktop',
          isTouchDevice: false,
          width: 1920,
          height: 1080,
          orientation: 'landscape',
          pixelRatio: 1
        }))
      } as any)

      // 创建 Pinia 实例
      pinia = createPinia()
      setActivePinia(pinia)
      store = useEasterEggStore()

      // 挂载组件
      wrapper = mount(CMDWindow, {
        global: {
          plugins: [pinia]
        }
      })

      // 设置游戏阶段
      store.phase = GamePhase.CMD_WINDOW
      await wrapper.vm.$nextTick()

      // 等待打字动画完成
      await new Promise(resolve => setTimeout(resolve, 1500))
      await wrapper.vm.$nextTick()
    })

    it('应该显示桌面端键盘输入界面', () => {
      const cmdInputLine = wrapper.find('.cmd-input-line')
      expect(cmdInputLine.exists()).toBe(true)
    })

    it('不应该显示移动端按钮', () => {
      const mobileButtons = wrapper.find('.mobile-buttons')
      expect(mobileButtons.exists()).toBe(false)
    })
  })
})
