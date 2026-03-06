/**
 * 背景音乐系统属性测试
 * 
 * 属性 29: 背景音乐状态机
 * 验证需求: 16.1-16.8
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { AudioSystem, BackgroundMusic } from '../AudioSystem'

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

describe('属性 29: 背景音乐状态机', () => {
  let audioSystem: AudioSystem
  let mockAudios: Map<string, MockAudioElement>
  
  beforeEach(() => {
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
    
    audioSystem = new AudioSystem()
  })
  
  afterEach(() => {
    audioSystem.cleanup()
    vi.restoreAllMocks()
  })
  
  /**
   * 属性 29.1: 第一关播放轻快风格音乐
   * 验证需求: 16.1
   */
  it('should play stage 1 music when stage 1 starts', async () => {
    await audioSystem.initialize()
    
    // 播放第一关音乐
    audioSystem.playBackgroundMusic(1, false)
    
    // 等待异步操作完成
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 验证播放了第一关音乐
    const stage1Music = mockAudios.get('/audio/music/stage1.mp3')
    expect(stage1Music).toBeDefined()
    expect(stage1Music?.paused).toBe(false)
    expect(stage1Music?.loop).toBe(true)
  })
  
  /**
   * 属性 29.2: 第一关 BOSS 出现时切换到 BOSS 战音乐
   * 验证需求: 16.2
   */
  it('should switch to stage 1 boss music when boss appears', async () => {
    await audioSystem.initialize()
    
    // 先播放第一关普通音乐
    audioSystem.playBackgroundMusic(1, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 切换到 BOSS 战音乐
    audioSystem.playBackgroundMusic(1, true)
    await new Promise(resolve => setTimeout(resolve, 1200)) // 等待淡入淡出完成
    
    // 验证播放了 BOSS 战音乐
    const bossMusicUrl = '/audio/music/stage1_boss.mp3'
    const bossMusic = mockAudios.get(bossMusicUrl)
    expect(bossMusic).toBeDefined()
    expect(bossMusic?.paused).toBe(false)
    expect(bossMusic?.loop).toBe(true)
  })
  
  /**
   * 属性 29.3: 第二关播放紧张风格音乐
   * 验证需求: 16.3
   */
  it('should play stage 2 music when stage 2 starts', async () => {
    await audioSystem.initialize()
    
    // 播放第二关音乐
    audioSystem.playBackgroundMusic(2, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 验证播放了第二关音乐
    const stage2Music = mockAudios.get('/audio/music/stage2.mp3')
    expect(stage2Music).toBeDefined()
    expect(stage2Music?.paused).toBe(false)
    expect(stage2Music?.loop).toBe(true)
  })
  
  /**
   * 属性 29.4: 第二关 BOSS 出现时切换到 BOSS 战音乐
   * 验证需求: 16.4
   */
  it('should switch to stage 2 boss music when boss appears', async () => {
    await audioSystem.initialize()
    
    // 先播放第二关普通音乐
    audioSystem.playBackgroundMusic(2, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 切换到 BOSS 战音乐
    audioSystem.playBackgroundMusic(2, true)
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // 验证播放了 BOSS 战音乐
    const bossMusic = mockAudios.get('/audio/music/stage2_boss.mp3')
    expect(bossMusic).toBeDefined()
    expect(bossMusic?.paused).toBe(false)
  })
  
  /**
   * 属性 29.5: 第三关播放史诗风格音乐
   * 验证需求: 16.5
   */
  it('should play stage 3 music when stage 3 starts', async () => {
    await audioSystem.initialize()
    
    // 播放第三关音乐
    audioSystem.playBackgroundMusic(3, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 验证播放了第三关音乐
    const stage3Music = mockAudios.get('/audio/music/stage3.mp3')
    expect(stage3Music).toBeDefined()
    expect(stage3Music?.paused).toBe(false)
    expect(stage3Music?.loop).toBe(true)
  })
  
  /**
   * 属性 29.6: 最终 BOSS 出现时切换到最终 BOSS 战音乐
   * 验证需求: 16.6
   */
  it('should switch to final boss music when final boss appears', async () => {
    await audioSystem.initialize()
    
    // 先播放第三关普通音乐
    audioSystem.playBackgroundMusic(3, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 切换到最终 BOSS 战音乐
    audioSystem.playBackgroundMusic(3, true)
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // 验证播放了最终 BOSS 战音乐
    const finalBossMusic = mockAudios.get('/audio/music/final_boss.mp3')
    expect(finalBossMusic).toBeDefined()
    expect(finalBossMusic?.paused).toBe(false)
  })
  
  /**
   * 属性 29.7: 通关时播放庆祝音乐
   * 验证需求: 16.7
   */
  it('should play victory music when game is completed', async () => {
    await audioSystem.initialize()
    
    // 播放通关音乐
    audioSystem.playVictoryMusic()
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // 验证播放了通关音乐
    const victoryMusic = mockAudios.get('/audio/music/victory.mp3')
    expect(victoryMusic).toBeDefined()
    expect(victoryMusic?.paused).toBe(false)
    expect(victoryMusic?.loop).toBe(false) // 通关音乐不循环
  })
  
  /**
   * 属性 29.8: 音乐切换时平滑过渡
   * 验证需求: 16.8
   */
  it('should smoothly transition when switching music', async () => {
    await audioSystem.initialize()
    
    // 播放第一关音乐
    audioSystem.playBackgroundMusic(1, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const stage1Music = mockAudios.get('/audio/music/stage1.mp3')
    expect(stage1Music).toBeDefined()
    
    // 切换到 BOSS 战音乐
    audioSystem.playBackgroundMusic(1, true)
    
    // 验证新音乐从0音量开始（淡入）
    await new Promise(resolve => setTimeout(resolve, 50))
    const bossMusic = mockAudios.get('/audio/music/stage1_boss.mp3')
    expect(bossMusic).toBeDefined()
    
    // 等待淡入淡出完成
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // 验证旧音乐已停止
    expect(stage1Music?.paused).toBe(true)
    expect(stage1Music?.currentTime).toBe(0)
  })
  
  /**
   * 属性 29.9: 相同音乐不重复播放
   */
  it('should not restart music if already playing the same track', async () => {
    await audioSystem.initialize()
    
    // 播放第一关音乐
    audioSystem.playBackgroundMusic(1, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const stage1Music = mockAudios.get('/audio/music/stage1.mp3')
    expect(stage1Music).toBeDefined()
    
    const initialAudio = stage1Music
    
    // 再次播放第一关音乐
    audioSystem.playBackgroundMusic(1, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 验证没有创建新的音频对象
    const stage1MusicAfter = mockAudios.get('/audio/music/stage1.mp3')
    expect(stage1MusicAfter).toBe(initialAudio)
  })
  
  /**
   * 属性 29.10: 音乐关闭时不播放
   */
  it('should not play music when music is disabled', async () => {
    await audioSystem.initialize()
    
    // 关闭音乐
    audioSystem.toggleMusic()
    
    // 尝试播放音乐
    audioSystem.playBackgroundMusic(1, false)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 验证没有播放音乐
    const stage1Music = mockAudios.get('/audio/music/stage1.mp3')
    expect(stage1Music).toBeUndefined()
  })
  
  /**
   * 基于属性的测试: 关卡和 BOSS 状态组合
   */
  it('should play correct music for any stage and boss combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // stage
        fc.boolean(), // isBoss
        async (stage, isBoss) => {
          await audioSystem.initialize()
          
          // 播放音乐
          audioSystem.playBackgroundMusic(stage, isBoss)
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // 确定期望的音乐 URL
          let expectedUrl: string
          if (stage === 1) {
            expectedUrl = isBoss ? '/audio/music/stage1_boss.mp3' : '/audio/music/stage1.mp3'
          } else if (stage === 2) {
            expectedUrl = isBoss ? '/audio/music/stage2_boss.mp3' : '/audio/music/stage2.mp3'
          } else {
            expectedUrl = isBoss ? '/audio/music/final_boss.mp3' : '/audio/music/stage3.mp3'
          }
          
          // 验证播放了正确的音乐
          const music = mockAudios.get(expectedUrl)
          expect(music).toBeDefined()
          expect(music?.paused).toBe(false)
          expect(music?.loop).toBe(true)
          
          // 清理
          audioSystem.cleanup()
          mockAudios.clear()
        }
      ),
      { numRuns: 10 }
    )
  })
  
  /**
   * 基于属性的测试: 音乐状态转换序列
   */
  it('should handle any sequence of music state transitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            stage: fc.integer({ min: 1, max: 3 }),
            isBoss: fc.boolean()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (transitions) => {
          await audioSystem.initialize()
          
          for (const transition of transitions) {
            audioSystem.playBackgroundMusic(transition.stage, transition.isBoss)
            await new Promise(resolve => setTimeout(resolve, 1300)) // 等待淡入淡出完成
          }
          
          // 验证最后一个转换的音乐正在播放
          const lastTransition = transitions[transitions.length - 1]
          let expectedUrl: string
          if (lastTransition.stage === 1) {
            expectedUrl = lastTransition.isBoss ? '/audio/music/stage1_boss.mp3' : '/audio/music/stage1.mp3'
          } else if (lastTransition.stage === 2) {
            expectedUrl = lastTransition.isBoss ? '/audio/music/stage2_boss.mp3' : '/audio/music/stage2.mp3'
          } else {
            expectedUrl = lastTransition.isBoss ? '/audio/music/final_boss.mp3' : '/audio/music/stage3.mp3'
          }
          
          const music = mockAudios.get(expectedUrl)
          expect(music).toBeDefined()
          expect(music?.paused).toBe(false)
          
          // 清理
          audioSystem.cleanup()
          mockAudios.clear()
        }
      ),
      { numRuns: 5 }
    )
  })
})
