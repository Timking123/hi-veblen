/**
 * 音频对象池
 * 负责音频对象的复用，优化内存使用
 */

import { AUDIO_CONFIG } from './constants'

/**
 * 音频对象池类
 */
export class AudioPool {
  private pools: Map<string, HTMLAudioElement[]> = new Map()
  private maxPoolSize: number = AUDIO_CONFIG.AUDIO_POOL_SIZE
  private minPoolSize: number = 1 // 每个音频至少保留1个对象
  private maxConcurrentSounds: number = AUDIO_CONFIG.MAX_CONCURRENT_SOUNDS
  private activeSounds: Set<HTMLAudioElement> = new Set()
  private lastCleanupTime: number = Date.now()
  private cleanupInterval: number = 30000 // 30秒清理一次

  /**
   * 获取音频对象
   */
  acquire(url: string): HTMLAudioElement | null {
    // 检查是否超过最大并发数
    if (this.activeSounds.size >= this.maxConcurrentSounds) {
      console.warn('[音频池] 已达到最大并发音效数，跳过播放')
      return null
    }

    // 获取或创建对象池
    let pool = this.pools.get(url)
    if (!pool) {
      pool = []
      this.pools.set(url, pool)
    }

    // 查找空闲的音频对象
    for (const audio of pool) {
      if (audio.paused || audio.ended) {
        audio.currentTime = 0
        this.activeSounds.add(audio)
        return audio
      }
    }

    // 如果池未满，创建新的音频对象
    if (pool.length < this.maxPoolSize) {
      const audio = new Audio(url)
      pool.push(audio)
      
      // 监听播放结束事件，自动释放
      audio.addEventListener('ended', () => {
        this.release(audio)
      })
      
      // 监听错误事件
      audio.addEventListener('error', () => {
        this.release(audio)
      })
      
      this.activeSounds.add(audio)
      return audio
    }

    // 池已满，复用最早的音频对象
    const audio = pool[0]
    audio.pause()
    audio.currentTime = 0
    this.activeSounds.add(audio)
    return audio
  }

  /**
   * 释放音频对象
   */
  release(audio: HTMLAudioElement): void {
    this.activeSounds.delete(audio)
    
    // 定期清理
    this.autoCleanup()
  }

  /**
   * 自动清理（定期执行）
   */
  private autoCleanup(): void {
    const now = Date.now()
    if (now - this.lastCleanupTime > this.cleanupInterval) {
      this.shrink()
      this.lastCleanupTime = now
    }
  }

  /**
   * 预加载音频
   * 音频文件不存在时静默失败
   */
  async preload(urls: string[]): Promise<void> {
    const results = await Promise.allSettled(urls.map(url => this.preloadSingle(url)))
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    if (succeeded > 0) {
      console.log(`[音频池] 预加载完成: ${succeeded} 个成功, ${failed} 个失败`)
    }
  }

  /**
   * 预加载单个音频
   */
  private async preloadSingle(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      
      const onCanPlay = () => {
        // 将预加载的音频添加到池中
        let pool = this.pools.get(url)
        if (!pool) {
          pool = []
          this.pools.set(url, pool)
        }
        
        if (pool.length < this.maxPoolSize) {
          // 添加事件监听器
          audio.addEventListener('ended', () => {
            this.release(audio)
          })
          audio.addEventListener('error', () => {
            this.release(audio)
          })
          
          pool.push(audio)
        }
        
        cleanup()
        resolve()
      }
      
      const onError = () => {
        cleanup()
        reject(new Error(`Failed to preload audio: ${url}`))
      }
      
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onCanPlay)
        audio.removeEventListener('error', onError)
      }
      
      audio.addEventListener('canplaythrough', onCanPlay, { once: true })
      audio.addEventListener('error', onError, { once: true })
      
      // 开始加载
      audio.load()
    })
  }

  /**
   * 获取当前活跃音效数
   */
  getActiveSoundCount(): number {
    return this.activeSounds.size
  }

  /**
   * 获取池的统计信息
   */
  getStats(): { 
    totalPools: number
    totalAudioObjects: number
    activeSounds: number
    memoryEstimate: string
  } {
    let totalAudioObjects = 0
    
    Array.from(this.pools.values()).forEach(pool => {
      totalAudioObjects += pool.length
    })
    
    // 估算内存使用（每个音频对象约占用 50KB）
    const memoryEstimateMB = (totalAudioObjects * 50) / 1024
    
    return {
      totalPools: this.pools.size,
      totalAudioObjects,
      activeSounds: this.activeSounds.size,
      memoryEstimate: `${memoryEstimateMB.toFixed(2)} MB`
    }
  }

  /**
   * 清理对象池
   */
  cleanup(): void {
    // 停止所有活跃音频
    Array.from(this.activeSounds).forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
    
    this.activeSounds.clear()
    this.pools.clear()
    
    console.log('[音频池] 清理完成')
  }

  /**
   * 收缩对象池（释放未使用的对象）
   * 保留最小数量的对象以避免频繁创建
   */
  shrink(): void {
    let totalRemoved = 0
    
    Array.from(this.pools.entries()).forEach(([url, pool]) => {
      // 保留正在使用的音频对象
      const activeAudios = pool.filter(audio => this.activeSounds.has(audio))
      
      // 保留最小数量的空闲对象
      const idleAudios = pool.filter(audio => !this.activeSounds.has(audio))
      const keepIdleCount = Math.min(this.minPoolSize, idleAudios.length)
      
      const newPool = [...activeAudios, ...idleAudios.slice(0, keepIdleCount)]
      const removed = pool.length - newPool.length
      
      if (removed > 0) {
        totalRemoved += removed
        this.pools.set(url, newPool)
      }
    })
    
    if (totalRemoved > 0) {
      console.log(`[音频池] 收缩完成，释放 ${totalRemoved} 个音频对象`)
    }
  }

  /**
   * 移除未使用的音频池
   */
  removeUnusedPools(): void {
    const unusedUrls: string[] = []
    
    Array.from(this.pools.entries()).forEach(([url, pool]) => {
      // 如果池中所有对象都是空闲的，且没有活跃音频，则移除该池
      const hasActiveAudio = pool.some(audio => this.activeSounds.has(audio))
      if (!hasActiveAudio && pool.length === 0) {
        unusedUrls.push(url)
      }
    })
    
    unusedUrls.forEach(url => {
      this.pools.delete(url)
    })
    
    if (unusedUrls.length > 0) {
      console.log(`[音频池] 移除 ${unusedUrls.length} 个未使用的音频池`)
    }
  }

  /**
   * 设置最大并发音效数
   */
  setMaxConcurrentSounds(max: number): void {
    this.maxConcurrentSounds = Math.max(1, max)
    console.log(`[音频池] 设置最大并发音效数: ${this.maxConcurrentSounds}`)
  }

  /**
   * 设置对象池大小限制
   */
  setPoolSizeLimit(max: number, min: number = 1): void {
    this.maxPoolSize = Math.max(1, max)
    this.minPoolSize = Math.max(1, Math.min(min, this.maxPoolSize))
    console.log(`[音频池] 设置对象池大小限制: 最小=${this.minPoolSize}, 最大=${this.maxPoolSize}`)
  }
}
