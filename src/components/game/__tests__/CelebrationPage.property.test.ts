/**
 * 庆祝页面音效属性测试
 * 
 * 测试庆祝页面交互元素的音效播放
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CelebrationPage from '../CelebrationPage.vue'
import { useEasterEggStore } from '@/stores/easterEgg'
import { GamePhase } from '@/game/types'
import { SoundEffect } from '@/game/AudioSystem'

// 创建 mock 音频系统实例
const mockPlaySoundEffect = vi.fn()
const mockInitialize = vi.fn().mockResolvedValue(undefined)
const mockResumeAudioContext = vi.fn().mockResolvedValue(undefined)
const mockCleanup = vi.fn()

// Mock AudioSystem 类
vi.mock('@/game/AudioSystem', () => {
  return {
    AudioSystem: vi.fn().mockImplementation(function() {
      return {
        initialize: mockInitialize,
        resumeAudioContext: mockResumeAudioContext,
        playSoundEffect: mockPlaySoundEffect,
        cleanup: mockCleanup
      }
    }),
    SoundEffect: {
      BALLOON_POP: 'BALLOON_POP',
      BANNER_SHAKE: 'BANNER_SHAKE',
      CAKE_LIGHT: 'CAKE_LIGHT',
      CARPET_ROLL: 'CARPET_ROLL',
      FIREWORK_LAUNCH: 'FIREWORK_LAUNCH'
    }
  }
})

describe('属性 32: 庆祝页面交互音效', () => {
  let wrapper: any
  let easterEggStore: any

  beforeEach(async () => {
    // 清除所有 mock 调用记录
    vi.clearAllMocks()

    // 创建 Pinia 实例
    const pinia = createPinia()
    setActivePinia(pinia)

    // 获取 store
    easterEggStore = useEasterEggStore()
    
    // 设置为庆祝阶段
    easterEggStore.phase = GamePhase.CELEBRATION

    // 挂载组件
    wrapper = mount(CelebrationPage, {
      global: {
        plugins: [pinia]
      }
    })

    // 等待组件挂载和音频系统初始化
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  /**
   * 验证需求 18.1: 气球点击时播放音效
   */
  it('应该在气球点击时播放气球爆炸音效', async () => {
    // 获取第一个气球
    const balloons = wrapper.findAll('.balloon')
    expect(balloons.length).toBeGreaterThan(0)

    // 点击气球
    await balloons[0].trigger('click')
    await wrapper.vm.$nextTick()

    // 验证音效播放
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.BALLOON_POP)
  })

  /**
   * 验证需求 18.2: 横幅点击时播放音效
   */
  it('应该在横幅点击时播放横幅晃动音效', async () => {
    // 获取横幅
    const banner = wrapper.find('.banner')
    expect(banner.exists()).toBe(true)

    // 点击横幅
    await banner.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证音效播放
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.BANNER_SHAKE)
  })

  /**
   * 验证需求 18.3: 蛋糕点击时播放音效
   */
  it('应该在蛋糕点击时播放蜡烛点燃音效', async () => {
    // 获取蛋糕
    const cake = wrapper.find('.cake')
    expect(cake.exists()).toBe(true)

    // 点击蛋糕
    await cake.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证音效播放
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.CAKE_LIGHT)
  })

  /**
   * 验证需求 18.4: 红毯点击时播放音效
   */
  it('应该在红毯点击时播放红毯铺开音效', async () => {
    // 获取红毯
    const carpet = wrapper.find('.carpet')
    expect(carpet.exists()).toBe(true)

    // 点击红毯
    await carpet.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证音效播放
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.CARPET_ROLL)
  })

  /**
   * 验证需求 18.5: 礼花点击时播放音效
   */
  it('应该在礼花点击时播放礼花发射音效', async () => {
    // 获取第一个礼花
    const fireworks = wrapper.findAll('.firework')
    expect(fireworks.length).toBeGreaterThan(0)

    // 点击礼花
    await fireworks[0].trigger('click')
    await wrapper.vm.$nextTick()

    // 验证音效播放
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.FIREWORK_LAUNCH)
  })

  /**
   * 综合测试：验证所有交互元素都能正确播放音效
   */
  it('应该为所有交互元素播放对应的音效', async () => {
    // 点击气球
    const balloon = wrapper.find('.balloon')
    await balloon.trigger('click')
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.BALLOON_POP)

    // 点击横幅
    const banner = wrapper.find('.banner')
    await banner.trigger('click')
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.BANNER_SHAKE)

    // 点击蛋糕
    const cake = wrapper.find('.cake')
    await cake.trigger('click')
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.CAKE_LIGHT)

    // 点击红毯
    const carpet = wrapper.find('.carpet')
    await carpet.trigger('click')
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.CARPET_ROLL)

    // 点击礼花
    const firework = wrapper.find('.firework')
    await firework.trigger('click')
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.FIREWORK_LAUNCH)

    // 验证所有音效都被调用
    expect(mockPlaySoundEffect).toHaveBeenCalledTimes(5)
  })

  /**
   * 测试音效只在首次交互时播放（防止重复播放）
   */
  it('应该防止重复点击时重复播放音效', async () => {
    // 点击气球两次
    const balloon = wrapper.find('.balloon')
    await balloon.trigger('click')
    await balloon.trigger('click')
    
    // 气球爆炸后不应该再次播放音效
    expect(mockPlaySoundEffect).toHaveBeenCalledTimes(1)
    expect(mockPlaySoundEffect).toHaveBeenCalledWith(SoundEffect.BALLOON_POP)
  })
})

