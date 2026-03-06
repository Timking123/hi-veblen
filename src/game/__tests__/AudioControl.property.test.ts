/**
 * 音频控制系统属性测试
 * 
 * 测试音乐开关功能的正确性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AudioSystem, SoundEffect } from '../AudioSystem'

// Mock HTMLAudioElement
class MockAudioElement {
  public volume: number = 1
  public loop: boolean = false
  public paused: boolean = true
  public currentTime: number = 0
  public src: string = ''
  
  private playPromise: Promise<void> | null = null
  
  constructor(src?: string) {
    if (src) {
      this.src = src
    }
  }
  
  play(): Promise<void> {
    this.paused = false
    this.playPromise = Promise.resolve()
    return this.playPromise
  }
  
  pause(): void {
    this.paused = true
  }
  
  load(): void {
    // Mock load
  }
  
  addEventListener(event: string, handler: () => void): void {
    if (event === 'canplaythrough') {
      setTimeout(handler, 0)
    }
  }
  
  removeEventListener(): void {
    // Mock remove
  }
}

// Mock AudioContext
class MockAudioContext {
  public state: 'running' | 'suspended' = 'running'
  
  resume(): Promise<void> {
    this.state = 'running'
    return Promise.resolve()
  }
  
  close(): Promise<void> {
    return Promise.resolve()
  }
}

describe('音频控制系统属性测试', () => {
  let audioSystem: AudioSystem
  let mockAudios: Map<string, MockAudioElement>

  beforeEach(async () => {
    // Mock Audio constructor
    mockAudios = new Map()
    
    global.Audio = vi.fn((src: string) => {
      const audio = new MockAudioElement(src)
      mockAudios.set(src, audio)
      return audio as any
    }) as any

    // Mock AudioContext - use a proper constructor function
    global.AudioContext = MockAudioContext as any
    ;(global as any).webkitAudioContext = MockAudioContext

    // 创建音频系统实例
    audioSystem = new AudioSystem()
    
    // 初始化音频系统
    await audioSystem.initialize()
  })

  afterEach(() => {
    audioSystem.cleanup()
    vi.restoreAllMocks()
  })

  /**
   * 属性 33: 音乐开关功能
   * 
   * 验证需求: 19.3, 19.4
   * 
   * 对于任何音乐开关切换，背景音乐应该相应地开启或关闭，但音效不受影响。
   */
  describe('属性 33: 音乐开关功能', () => {
    it('应该在关闭音乐时停止背景音乐', () => {
      // 先播放音乐
      audioSystem.playBackgroundMusic(1, false)
      expect(audioSystem.isMusicPlaying()).toBe(true)

      // 关闭音乐
      audioSystem.toggleMusic()
      
      // 验证音乐已关闭
      expect(audioSystem.isMusicPlaying()).toBe(false)
    })

    it('应该在开启音乐时恢复背景音乐', () => {
      // 先播放音乐
      audioSystem.playBackgroundMusic(1, false)
      
      // 关闭音乐
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(false)

      // 重新开启音乐
      audioSystem.toggleMusic()
      
      // 验证音乐已开启
      expect(audioSystem.isMusicPlaying()).toBe(true)
    })

    it('应该在音乐关闭时不播放新的背景音乐', () => {
      // 关闭音乐
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(false)

      // 尝试播放音乐
      const audioConstructorCallsBefore = (global.Audio as any).mock.calls.length
      audioSystem.playBackgroundMusic(2, false)
      const audioConstructorCallsAfter = (global.Audio as any).mock.calls.length

      // 验证没有创建新的音频对象（音乐仍然关闭）
      expect(audioConstructorCallsAfter).toBe(audioConstructorCallsBefore)
      expect(audioSystem.isMusicPlaying()).toBe(false)
    })

    it('应该在音乐开启后能够播放背景音乐', () => {
      // 关闭音乐
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(false)

      // 重新开启音乐
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(true)

      // 播放音乐
      const audioConstructorCallsBefore = (global.Audio as any).mock.calls.length
      audioSystem.playBackgroundMusic(2, false)
      const audioConstructorCallsAfter = (global.Audio as any).mock.calls.length

      // 验证创建了新的音频对象
      expect(audioConstructorCallsAfter).toBeGreaterThan(audioConstructorCallsBefore)
    })

    it('应该在音乐关闭时仍然播放音效', () => {
      // 关闭音乐
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(false)

      // 播放音效（应该不受影响）
      expect(() => {
        audioSystem.playSoundEffect(SoundEffect.PLAYER_GUN_FIRE)
      }).not.toThrow()
      
      // 验证音效系统仍然启用
      expect(audioSystem.isEffectPlaying()).toBe(true)
    })

    it('应该在多次切换后保持正确的状态', () => {
      // 初始状态：音乐开启
      expect(audioSystem.isMusicPlaying()).toBe(true)

      // 第一次切换：关闭
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(false)

      // 第二次切换：开启
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(true)

      // 第三次切换：关闭
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(false)

      // 第四次切换：开启
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(true)
    })

    it('应该在关闭音乐后记住上次播放的音乐类型', () => {
      // 播放第一关音乐
      audioSystem.playBackgroundMusic(1, false)
      
      // 关闭音乐
      audioSystem.toggleMusic()
      
      // 重新开启音乐（应该恢复第一关音乐）
      audioSystem.toggleMusic()
      
      // 验证音乐已开启
      expect(audioSystem.isMusicPlaying()).toBe(true)
    })

    it('应该在关闭音乐期间记录音乐切换请求', () => {
      // 播放第一关音乐
      audioSystem.playBackgroundMusic(1, false)
      
      // 关闭音乐
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(false)
      
      // 在音乐关闭期间切换到第二关
      audioSystem.playBackgroundMusic(2, false)
      
      // 重新开启音乐（应该播放第二关音乐）
      audioSystem.toggleMusic()
      expect(audioSystem.isMusicPlaying()).toBe(true)
    })

    it('应该在音乐开关切换时不影响音效播放', () => {
      // 播放音效
      expect(() => {
        audioSystem.playSoundEffect(SoundEffect.PLAYER_GUN_FIRE)
      }).not.toThrow()

      // 关闭音乐
      audioSystem.toggleMusic()
      
      // 再次播放音效（应该仍然有效）
      expect(() => {
        audioSystem.playSoundEffect(SoundEffect.ENEMY_EXPLODE)
      }).not.toThrow()

      // 开启音乐
      audioSystem.toggleMusic()
      
      // 再次播放音效（应该仍然有效）
      expect(() => {
        audioSystem.playSoundEffect(SoundEffect.MISSILE_EXPLODE)
      }).not.toThrow()
      
      // 验证音效系统始终启用
      expect(audioSystem.isEffectPlaying()).toBe(true)
    })
  })
})
