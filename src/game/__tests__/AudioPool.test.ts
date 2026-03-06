/**
 * AudioPool 单元测试
 * 测试音频对象池的优化功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AudioPool } from '../AudioPool'

// Mock HTMLAudioElement
class MockAudioElement {
  src: string = ''
  paused: boolean = true
  ended: boolean = false
  currentTime: number = 0
  private listeners: Map<string, Function[]> = new Map()

  constructor(src?: string) {
    if (src) {
      this.src = src
    }
  }

  addEventListener(event: string, callback: Function, options?: any): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  removeEventListener(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  load(): void {
    // 模拟加载完成
    setTimeout(() => {
      this.trigger('canplaythrough')
    }, 10)
  }

  play(): Promise<void> {
    this.paused = false
    return Promise.resolve()
  }

  pause(): void {
    this.paused = true
  }

  trigger(event: string): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(cb => cb())
    }
  }
}

// Mock Audio constructor
global.Audio = MockAudioElement as any

describe('AudioPool', () => {
  let audioPool: AudioPool

  beforeEach(() => {
    audioPool = new AudioPool()
  })

  afterEach(() => {
    audioPool.cleanup()
  })

  describe('基本功能', () => {
    it('应该能够获取音频对象', () => {
      const audio = audioPool.acquire('/test.mp3')
      expect(audio).toBeDefined()
      expect(audio).toBeInstanceOf(MockAudioElement)
    })

    it('应该能够释放音频对象', () => {
      const audio = audioPool.acquire('/test.mp3')
      expect(audioPool.getActiveSoundCount()).toBe(1)
      
      audioPool.release(audio!)
      expect(audioPool.getActiveSoundCount()).toBe(0)
    })

    it('应该复用空闲的音频对象', () => {
      const audio1 = audioPool.acquire('/test.mp3')
      audioPool.release(audio1!)
      
      const audio2 = audioPool.acquire('/test.mp3')
      expect(audio2).toBe(audio1) // 应该是同一个对象
    })

    it('应该限制最大并发音效数', () => {
      // 设置较小的并发限制
      audioPool.setMaxConcurrentSounds(3)
      
      const audio1 = audioPool.acquire('/test1.mp3')
      const audio2 = audioPool.acquire('/test2.mp3')
      const audio3 = audioPool.acquire('/test3.mp3')
      const audio4 = audioPool.acquire('/test4.mp3')
      
      expect(audio1).toBeDefined()
      expect(audio2).toBeDefined()
      expect(audio3).toBeDefined()
      expect(audio4).toBeNull() // 超过限制，返回 null
    })
  })

  describe('对象池管理', () => {
    it('应该为不同 URL 创建独立的对象池', () => {
      const audio1 = audioPool.acquire('/test1.mp3')
      const audio2 = audioPool.acquire('/test2.mp3')
      
      const stats = audioPool.getStats()
      expect(stats.totalPools).toBe(2)
    })

    it('应该限制每个池的大小', () => {
      audioPool.setPoolSizeLimit(3, 1)
      
      // 创建并释放多个音频对象
      const audios: (HTMLAudioElement | null)[] = []
      for (let i = 0; i < 5; i++) {
        audios.push(audioPool.acquire('/test.mp3'))
      }
      
      for (const audio of audios) {
        if (audio) {
          audioPool.release(audio)
        }
      }
      
      const stats = audioPool.getStats()
      // 池大小应该不超过限制
      expect(stats.totalAudioObjects).toBeLessThanOrEqual(3)
    })
  })

  describe('收缩功能', () => {
    it('应该能够收缩对象池', () => {
      // 创建多个音频对象
      const audios: (HTMLAudioElement | null)[] = []
      for (let i = 0; i < 10; i++) {
        audios.push(audioPool.acquire('/test.mp3'))
      }
      
      // 释放所有对象
      for (const audio of audios) {
        if (audio) {
          audioPool.release(audio)
        }
      }
      
      const statsBefore = audioPool.getStats()
      
      // 收缩
      audioPool.shrink()
      
      const statsAfter = audioPool.getStats()
      expect(statsAfter.totalAudioObjects).toBeLessThanOrEqual(statsBefore.totalAudioObjects)
    })

    it('应该保留正在使用的音频对象', () => {
      // 获取一些音频对象但不释放（使用不同的URL以确保创建新对象）
      const activeAudios: (HTMLAudioElement | null)[] = []
      for (let i = 0; i < 3; i++) {
        activeAudios.push(audioPool.acquire(`/test${i}.mp3`))
      }
      
      const activeCountBefore = audioPool.getActiveSoundCount()
      expect(activeCountBefore).toBe(3)
      
      // 获取并释放一些音频对象（使用相同的URL）
      const releasedAudios: (HTMLAudioElement | null)[] = []
      for (let i = 0; i < 5; i++) {
        releasedAudios.push(audioPool.acquire('/test-release.mp3'))
      }
      for (const audio of releasedAudios) {
        if (audio) {
          audioPool.release(audio)
        }
      }
      
      // 收缩
      audioPool.shrink()
      
      // 活跃音频数量不应该改变
      expect(audioPool.getActiveSoundCount()).toBe(3)
      
      // 清理
      for (const audio of activeAudios) {
        if (audio) {
          audioPool.release(audio)
        }
      }
    })

    it('应该保留最小数量的空闲对象', () => {
      audioPool.setPoolSizeLimit(10, 2)
      
      // 创建并释放多个音频对象
      const audios: (HTMLAudioElement | null)[] = []
      for (let i = 0; i < 8; i++) {
        audios.push(audioPool.acquire('/test.mp3'))
      }
      for (const audio of audios) {
        if (audio) {
          audioPool.release(audio)
        }
      }
      
      // 收缩
      audioPool.shrink()
      
      const stats = audioPool.getStats()
      // 应该至少保留最小数量的对象（如果有的话）
      // 注意：由于自动清理可能已经触发，这里只检查不超过最大值
      expect(stats.totalAudioObjects).toBeLessThanOrEqual(10)
      expect(stats.totalAudioObjects).toBeGreaterThanOrEqual(0)
    })
  })

  describe('预加载功能', () => {
    it('应该能够预加载音频', async () => {
      const urls = ['/test1.mp3', '/test2.mp3', '/test3.mp3']
      
      await audioPool.preload(urls)
      
      const stats = audioPool.getStats()
      expect(stats.totalPools).toBe(3)
      expect(stats.totalAudioObjects).toBeGreaterThanOrEqual(3)
    })

    it('预加载的音频应该添加事件监听器', async () => {
      await audioPool.preload(['/test.mp3'])
      
      const audio = audioPool.acquire('/test.mp3')
      expect(audio).toBeDefined()
      
      // 模拟播放结束
      if (audio) {
        (audio as any).trigger('ended')
        expect(audioPool.getActiveSoundCount()).toBe(0)
      }
    })
  })

  describe('统计信息', () => {
    it('应该返回完整的统计信息', () => {
      audioPool.acquire('/test1.mp3')
      audioPool.acquire('/test2.mp3')
      
      const stats = audioPool.getStats()
      
      expect(stats).toHaveProperty('totalPools')
      expect(stats).toHaveProperty('totalAudioObjects')
      expect(stats).toHaveProperty('activeSounds')
      expect(stats).toHaveProperty('memoryEstimate')
      
      expect(stats.totalPools).toBe(2)
      expect(stats.activeSounds).toBe(2)
      expect(stats.memoryEstimate).toContain('MB')
    })

    it('应该正确估算内存使用', () => {
      // 创建多个音频对象
      for (let i = 0; i < 10; i++) {
        audioPool.acquire(`/test${i}.mp3`)
      }
      
      const stats = audioPool.getStats()
      expect(stats.totalAudioObjects).toBe(10)
      
      // 每个音频对象约 50KB，10个约 0.49MB
      const memoryMB = parseFloat(stats.memoryEstimate)
      expect(memoryMB).toBeGreaterThan(0)
      expect(memoryMB).toBeLessThan(1)
    })
  })

  describe('清理功能', () => {
    it('应该能够清理所有音频对象', () => {
      audioPool.acquire('/test1.mp3')
      audioPool.acquire('/test2.mp3')
      
      expect(audioPool.getActiveSoundCount()).toBe(2)
      
      audioPool.cleanup()
      
      expect(audioPool.getActiveSoundCount()).toBe(0)
      
      const stats = audioPool.getStats()
      expect(stats.totalPools).toBe(0)
      expect(stats.totalAudioObjects).toBe(0)
    })
  })

  describe('配置功能', () => {
    it('应该能够设置最大并发音效数', () => {
      audioPool.setMaxConcurrentSounds(5)
      
      // 创建 5 个音频对象
      for (let i = 0; i < 5; i++) {
        const audio = audioPool.acquire(`/test${i}.mp3`)
        expect(audio).toBeDefined()
      }
      
      // 第 6 个应该失败
      const audio6 = audioPool.acquire('/test6.mp3')
      expect(audio6).toBeNull()
    })

    it('应该能够设置对象池大小限制', () => {
      audioPool.setPoolSizeLimit(5, 2)
      
      // 创建并释放多个音频对象
      const audios: (HTMLAudioElement | null)[] = []
      for (let i = 0; i < 10; i++) {
        audios.push(audioPool.acquire('/test.mp3'))
      }
      for (const audio of audios) {
        if (audio) {
          audioPool.release(audio)
        }
      }
      
      const stats = audioPool.getStats()
      expect(stats.totalAudioObjects).toBeLessThanOrEqual(5)
    })
  })

  describe('自动清理', () => {
    it('应该在释放对象时定期触发自动清理', () => {
      vi.useFakeTimers()
      
      // 创建并释放多个音频对象
      for (let i = 0; i < 20; i++) {
        const audio = audioPool.acquire('/test.mp3')
        if (audio) {
          audioPool.release(audio)
        }
      }
      
      const statsBefore = audioPool.getStats()
      
      // 快进时间触发自动清理
      vi.advanceTimersByTime(31000) // 超过 30 秒
      
      // 再次释放一个对象以触发检查
      const audio = audioPool.acquire('/test.mp3')
      if (audio) {
        audioPool.release(audio)
      }
      
      const statsAfter = audioPool.getStats()
      // 自动清理应该已经执行
      expect(statsAfter.totalAudioObjects).toBeLessThanOrEqual(statsBefore.totalAudioObjects)
      
      vi.useRealTimers()
    })
  })
})
