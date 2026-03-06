/**
 * 音频系统
 * 负责管理背景音乐和音效播放
 */

import { AUDIO_CONFIG } from './constants'
import { AudioPool } from './AudioPool'

/**
 * 音效类型枚举
 */
export enum SoundEffect {
  // 武器音效
  PLAYER_GUN_FIRE = 'PLAYER_GUN_FIRE',
  PLAYER_MISSILE_FIRE = 'PLAYER_MISSILE_FIRE',
  BULLET_FLY = 'BULLET_FLY',
  MISSILE_FLY = 'MISSILE_FLY',
  BULLET_HIT = 'BULLET_HIT',
  MISSILE_EXPLODE = 'MISSILE_EXPLODE',
  
  // 爆炸音效
  ENEMY_EXPLODE = 'ENEMY_EXPLODE',
  ELITE_EXPLODE = 'ELITE_EXPLODE',
  STAGE_BOSS_EXPLODE = 'STAGE_BOSS_EXPLODE',
  FINAL_BOSS_EXPLODE = 'FINAL_BOSS_EXPLODE',
  PLAYER_EXPLODE = 'PLAYER_EXPLODE',
  
  // 庆祝页面音效
  BALLOON_POP = 'BALLOON_POP',
  BANNER_SHAKE = 'BANNER_SHAKE',
  CAKE_LIGHT = 'CAKE_LIGHT',
  CARPET_ROLL = 'CARPET_ROLL',
  FIREWORK_LAUNCH = 'FIREWORK_LAUNCH'
}

/**
 * 背景音乐类型
 */
export enum BackgroundMusic {
  STAGE_1 = 'STAGE_1',
  STAGE_1_BOSS = 'STAGE_1_BOSS',
  STAGE_2 = 'STAGE_2',
  STAGE_2_BOSS = 'STAGE_2_BOSS',
  STAGE_3 = 'STAGE_3',
  FINAL_BOSS = 'FINAL_BOSS',
  VICTORY = 'VICTORY'
}

/**
 * 音频加载错误
 */
export class AudioLoadError extends Error {
  constructor(public url: string, public reason: string) {
    super(`Failed to load audio: ${url}, reason: ${reason}`)
    this.name = 'AudioLoadError'
  }
}

/**
 * 音频系统类
 */
export class AudioSystem {
  private audioContext: AudioContext | null = null
  private musicVolume: number = AUDIO_CONFIG.MUSIC_VOLUME
  private effectVolume: number = AUDIO_CONFIG.EFFECT_VOLUME
  private isMusicEnabled: boolean = true
  private isEffectEnabled: boolean = true
  private currentMusic: HTMLAudioElement | null = null
  private currentMusicType: BackgroundMusic | null = null
  private lastMusicStage: number = 1 // 记录最后的关卡
  private lastMusicIsBoss: boolean = false // 记录最后是否为 BOSS 战
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private loadedAudio: Map<string, HTMLAudioElement> = new Map()
  private isInitialized: boolean = false
  private audioPool: AudioPool = new AudioPool()
  private loadingPromises: Map<string, Promise<void>> = new Map()
  private loadedUrls: Set<string> = new Set()

  /**
   * 初始化音频系统
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[音频系统] 已经初始化')
      return
    }

    try {
      // 创建 AudioContext（需要用户交互才能启动）
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // 预加载关键音频资源
      await this.preloadCriticalAudio()
      
      console.log('[音频系统] 初始化成功')
      this.isInitialized = true
    } catch (error) {
      console.error('[音频系统] 初始化失败:', error)
      throw new AudioLoadError('AudioContext', String(error))
    }
  }

  /**
   * 恢复音频上下文（处理浏览器自动播放策略）
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume()
        console.log('[音频系统] AudioContext 已恢复')
      } catch (error) {
        console.error('[音频系统] 恢复 AudioContext 失败:', error)
      }
    }
  }

  /**
   * 播放背景音乐
   */
  playBackgroundMusic(stage: number, isBoss: boolean): void {
    if (!this.isMusicEnabled) {
      // 即使音乐关闭，也记录当前应该播放的音乐
      this.lastMusicStage = stage
      this.lastMusicIsBoss = isBoss
      return
    }

    // 记录当前音乐信息
    this.lastMusicStage = stage
    this.lastMusicIsBoss = isBoss

    // 确定要播放的音乐类型
    let musicType: BackgroundMusic
    
    if (stage === 1) {
      musicType = isBoss ? BackgroundMusic.STAGE_1_BOSS : BackgroundMusic.STAGE_1
    } else if (stage === 2) {
      musicType = isBoss ? BackgroundMusic.STAGE_2_BOSS : BackgroundMusic.STAGE_2
    } else if (stage === 3) {
      if (isBoss) {
        musicType = BackgroundMusic.FINAL_BOSS
      } else {
        musicType = BackgroundMusic.STAGE_3
      }
    } else {
      console.warn(`[音频系统] 未知的关卡: ${stage}`)
      return
    }

    // 如果已经在播放相同的音乐，不需要切换
    if (this.currentMusicType === musicType && this.currentMusic && !this.currentMusic.paused) {
      return
    }

    // 淡出当前音乐并切换到新音乐
    this.fadeOutAndSwitchMusic(musicType)
  }

  /**
   * 淡出当前音乐并切换到新音乐
   */
  private fadeOutAndSwitchMusic(newMusicType: BackgroundMusic): void {
    const oldMusic = this.currentMusic
    
    if (oldMusic) {
      // 淡出旧音乐
      this.fadeOut(oldMusic, 1000).then(() => {
        oldMusic.pause()
        oldMusic.currentTime = 0
      })
    }
    
    // 加载并淡入新音乐
    const musicUrl = this.getMusicUrl(newMusicType)
    
    try {
      const audio = new Audio(musicUrl)
      audio.volume = 0 // 从0开始
      audio.loop = true
      
      audio.play().then(() => {
        this.currentMusic = audio
        this.currentMusicType = newMusicType
        
        // 淡入新音乐
        this.fadeIn(audio, 1000, this.musicVolume)
        
        console.log(`[音频系统] 播放背景音乐: ${newMusicType}`)
      }).catch(error => {
        console.error('[音频系统] 播放背景音乐失败:', error)
      })
    } catch (error) {
      console.error('[音频系统] 加载背景音乐失败:', error)
    }
  }

  /**
   * 淡入音频
   */
  private fadeIn(audio: HTMLAudioElement, duration: number, targetVolume: number): void {
    const steps = 20
    const stepDuration = duration / steps
    const volumeStep = targetVolume / steps
    let currentStep = 0
    
    const fadeInterval = setInterval(() => {
      currentStep++
      audio.volume = Math.min(volumeStep * currentStep, targetVolume)
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval)
      }
    }, stepDuration)
  }

  /**
   * 淡出音频
   */
  private fadeOut(audio: HTMLAudioElement, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const steps = 20
      const stepDuration = duration / steps
      const initialVolume = audio.volume
      const volumeStep = initialVolume / steps
      let currentStep = 0
      
      const fadeInterval = setInterval(() => {
        currentStep++
        audio.volume = Math.max(initialVolume - volumeStep * currentStep, 0)
        
        if (currentStep >= steps) {
          clearInterval(fadeInterval)
          resolve()
        }
      }, stepDuration)
    })
  }

  /**
   * 播放通关音乐
   */
  playVictoryMusic(): void {
    if (!this.isMusicEnabled) {
      return
    }

    // 淡出当前音乐
    const oldMusic = this.currentMusic
    if (oldMusic) {
      this.fadeOut(oldMusic, 1000).then(() => {
        oldMusic.pause()
        oldMusic.currentTime = 0
      })
    }

    const musicUrl = this.getMusicUrl(BackgroundMusic.VICTORY)
    
    try {
      const audio = new Audio(musicUrl)
      audio.volume = 0 // 从0开始
      audio.loop = false // 通关音乐不循环
      
      audio.play().then(() => {
        this.currentMusic = audio
        this.currentMusicType = BackgroundMusic.VICTORY
        
        // 淡入通关音乐
        this.fadeIn(audio, 1000, this.musicVolume)
        
        console.log('[音频系统] 播放通关音乐')
      }).catch(error => {
        console.error('[音频系统] 播放通关音乐失败:', error)
      })
    } catch (error) {
      console.error('[音频系统] 加载通关音乐失败:', error)
    }
  }

  /**
   * 停止背景音乐
   */
  stopBackgroundMusic(): void {
    if (this.currentMusic) {
      // 淡出并停止
      this.fadeOut(this.currentMusic, 500).then(() => {
        if (this.currentMusic) {
          this.currentMusic.pause()
          this.currentMusic.currentTime = 0
          this.currentMusic = null
          this.currentMusicType = null
          console.log('[音频系统] 停止背景音乐')
        }
      })
    }
  }

  /**
   * 播放音效
   * 优化：提前退出和懒加载减少不必要的操作
   */
  playSoundEffect(effect: SoundEffect): void {
    // 提前退出：如果音效关闭，直接返回
    if (!this.isEffectEnabled) {
      return
    }

    const effectUrl = this.getSoundEffectUrl(effect)
    
    // 懒加载音效并播放
    this.loadOnDemand(effectUrl)
      .then(() => {
        // 从对象池获取音频对象
        const audio = this.audioPool.acquire(effectUrl)
        
        if (audio) {
          audio.volume = this.effectVolume
          audio.play().catch(error => {
            console.error(`[音频系统] 播放音效失败 (${effect}):`, error)
          })
        }
      })
      .catch(error => {
        console.error(`[音频系统] 加载音效失败 (${effect}):`, error)
      })
  }

  /**
   * 切换音乐开关
   */
  toggleMusic(): void {
    this.isMusicEnabled = !this.isMusicEnabled
    
    if (!this.isMusicEnabled) {
      // 关闭音乐：停止背景音乐
      this.stopBackgroundMusic()
    } else {
      // 开启音乐：恢复上次的音乐
      if (this.lastMusicStage > 0) {
        this.playBackgroundMusic(this.lastMusicStage, this.lastMusicIsBoss)
      }
    }
    
    console.log(`[音频系统] 音乐${this.isMusicEnabled ? '开启' : '关闭'}`)
  }

  /**
   * 设置音乐音量
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume
    }
  }

  /**
   * 设置音效音量
   */
  setEffectVolume(volume: number): void {
    this.effectVolume = Math.max(0, Math.min(1, volume))
  }

  /**
   * 获取音乐状态
   */
  isMusicPlaying(): boolean {
    return this.isMusicEnabled
  }

  /**
   * 获取音效状态
   */
  isEffectPlaying(): boolean {
    return this.isEffectEnabled
  }

  /**
   * 预加载音频资源
   */
  async preloadAudio(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.loadAudio(url))
    
    try {
      await Promise.all(promises)
      console.log(`[音频系统] 预加载 ${urls.length} 个音频资源完成`)
    } catch (error) {
      console.error('[音频系统] 预加载音频资源失败:', error)
    }
  }

  /**
   * 加载单个音频
   */
  private async loadAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      
      audio.addEventListener('canplaythrough', () => {
        this.loadedAudio.set(url, audio)
        resolve()
      }, { once: true })
      
      audio.addEventListener('error', (error) => {
        reject(new AudioLoadError(url, String(error)))
      }, { once: true })
      
      // 开始加载
      audio.load()
    })
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopBackgroundMusic()
    this.loadedAudio.clear()
    this.audioBuffers.clear()
    this.loadingPromises.clear()
    this.loadedUrls.clear()
    
    if (this.audioPool) {
      this.audioPool.cleanup()
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.isInitialized = false
    console.log('[音频系统] 清理完成')
  }

  /**
   * 懒加载音频（按需加载）
   */
  private async loadOnDemand(url: string): Promise<void> {
    // 如果已经加载，直接返回
    if (this.loadedUrls.has(url)) {
      return
    }

    // 如果正在加载，返回现有的 Promise
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!
    }

    // 开始加载
    const promise = this.loadAudio(url)
    this.loadingPromises.set(url, promise)

    try {
      await promise
      this.loadedUrls.add(url)
      this.loadingPromises.delete(url)
    } catch (error) {
      this.loadingPromises.delete(url)
      throw error
    }
  }

  /**
   * 预加载关键音频资源
   * 音频文件不存在时静默失败，不影响游戏运行
   */
  private async preloadCriticalAudio(): Promise<void> {
    const criticalUrls = [
      AUDIO_CONFIG.SOUND_EFFECTS.PLAYER_GUN_FIRE,
      AUDIO_CONFIG.SOUND_EFFECTS.PLAYER_EXPLODE,
      AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_1
    ]

    // 逐个尝试预加载，失败时静默处理
    for (const url of criticalUrls) {
      try {
        await this.audioPool.preload([url])
        this.loadedUrls.add(url)
      } catch (error) {
        // 音频文件不存在时静默失败
        console.debug(`[音频系统] 音频文件不存在或加载失败: ${url}`)
      }
    }
    
    console.log('[音频系统] 关键音频预加载完成')
  }

  /**
   * 获取加载进度
   */
  getLoadingProgress(): { loaded: number; total: number } {
    const total = Object.keys(AUDIO_CONFIG.SOUND_EFFECTS).length + 
                  Object.keys(AUDIO_CONFIG.BACKGROUND_MUSIC).length
    const loaded = this.loadedUrls.size

    return { loaded, total }
  }

  /**
   * 释放未使用的音频资源
   */
  releaseUnusedAudio(): void {
    if (this.audioPool) {
      this.audioPool.shrink()
    }
    console.log('[音频系统] 释放未使用的音频资源')
  }

  /**
   * 获取音频池统计信息
   */
  getPoolStats(): { totalPools: number; totalAudioObjects: number; activeSounds: number } {
    if (this.audioPool) {
      return this.audioPool.getStats()
    }
    return { totalPools: 0, totalAudioObjects: 0, activeSounds: 0 }
  }

  /**
   * 获取背景音乐 URL
   */
  private getMusicUrl(musicType: BackgroundMusic): string {
    switch (musicType) {
      case BackgroundMusic.STAGE_1:
        return AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_1
      case BackgroundMusic.STAGE_1_BOSS:
        return AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_1_BOSS
      case BackgroundMusic.STAGE_2:
        return AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_2
      case BackgroundMusic.STAGE_2_BOSS:
        return AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_2_BOSS
      case BackgroundMusic.STAGE_3:
        return AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_3
      case BackgroundMusic.FINAL_BOSS:
        return AUDIO_CONFIG.BACKGROUND_MUSIC.FINAL_BOSS
      case BackgroundMusic.VICTORY:
        return AUDIO_CONFIG.BACKGROUND_MUSIC.VICTORY
      default:
        throw new Error(`Unknown music type: ${musicType}`)
    }
  }

  /**
   * 获取音效 URL
   */
  private getSoundEffectUrl(effect: SoundEffect): string {
    switch (effect) {
      case SoundEffect.PLAYER_GUN_FIRE:
        return AUDIO_CONFIG.SOUND_EFFECTS.PLAYER_GUN_FIRE
      case SoundEffect.PLAYER_MISSILE_FIRE:
        return AUDIO_CONFIG.SOUND_EFFECTS.PLAYER_MISSILE_FIRE
      case SoundEffect.BULLET_FLY:
        return AUDIO_CONFIG.SOUND_EFFECTS.BULLET_FLY
      case SoundEffect.MISSILE_FLY:
        return AUDIO_CONFIG.SOUND_EFFECTS.MISSILE_FLY
      case SoundEffect.BULLET_HIT:
        return AUDIO_CONFIG.SOUND_EFFECTS.BULLET_HIT
      case SoundEffect.MISSILE_EXPLODE:
        return AUDIO_CONFIG.SOUND_EFFECTS.MISSILE_EXPLODE
      case SoundEffect.ENEMY_EXPLODE:
        return AUDIO_CONFIG.SOUND_EFFECTS.ENEMY_EXPLODE
      case SoundEffect.ELITE_EXPLODE:
        return AUDIO_CONFIG.SOUND_EFFECTS.ELITE_EXPLODE
      case SoundEffect.STAGE_BOSS_EXPLODE:
        return AUDIO_CONFIG.SOUND_EFFECTS.STAGE_BOSS_EXPLODE
      case SoundEffect.FINAL_BOSS_EXPLODE:
        return AUDIO_CONFIG.SOUND_EFFECTS.FINAL_BOSS_EXPLODE
      case SoundEffect.PLAYER_EXPLODE:
        return AUDIO_CONFIG.SOUND_EFFECTS.PLAYER_EXPLODE
      case SoundEffect.BALLOON_POP:
        return AUDIO_CONFIG.SOUND_EFFECTS.BALLOON_POP
      case SoundEffect.BANNER_SHAKE:
        return AUDIO_CONFIG.SOUND_EFFECTS.BANNER_SHAKE
      case SoundEffect.CAKE_LIGHT:
        return AUDIO_CONFIG.SOUND_EFFECTS.CAKE_LIGHT
      case SoundEffect.CARPET_ROLL:
        return AUDIO_CONFIG.SOUND_EFFECTS.CARPET_ROLL
      case SoundEffect.FIREWORK_LAUNCH:
        return AUDIO_CONFIG.SOUND_EFFECTS.FIREWORK_LAUNCH
      default:
        throw new Error(`Unknown sound effect: ${effect}`)
    }
  }
}
