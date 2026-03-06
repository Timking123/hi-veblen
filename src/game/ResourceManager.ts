/**
 * 资源管理器
 * 负责资源加载、缓存、释放和内存监控
 * 优化资源使用，确保在服务器环境（2 CPU 2G 内存）中高效运行
 */

import { PERFORMANCE_CONFIG } from './constants'

/**
 * 资源类型枚举
 */
export enum ResourceType {
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
  SPRITE = 'SPRITE',
  DATA = 'DATA'
}

/**
 * 资源元数据
 */
interface ResourceMetadata {
  type: ResourceType
  url?: string
  size: number // 估算的内存大小（字节）
  lastAccessed: number // 最后访问时间戳
  accessCount: number // 访问次数
}

/**
 * 资源加载错误
 */
export class ResourceLoadError extends Error {
  constructor(public resourceType: ResourceType, public url: string, public reason: string) {
    super(`Failed to load ${resourceType}: ${url}, reason: ${reason}`)
    this.name = 'ResourceLoadError'
  }
}

/**
 * 资源超时错误
 */
export class ResourceTimeoutError extends Error {
  constructor(public resourceType: ResourceType, public url: string) {
    super(`Resource loading timeout: ${resourceType} - ${url}`)
    this.name = 'ResourceTimeoutError'
  }
}

/**
 * 内存使用信息
 */
export interface MemoryUsage {
  used: number // 已使用内存（MB）
  total: number // 总内存限制（MB）
  percentage: number // 使用百分比
  resourceCount: number // 资源数量
}

/**
 * 资源管理器类
 */
export class ResourceManager {
  private static instance: ResourceManager | null = null
  
  // 资源缓存
  private resources: Map<string, any> = new Map()
  private metadata: Map<string, ResourceMetadata> = new Map()
  
  // 加载中的资源
  private loadingPromises: Map<string, Promise<any>> = new Map()
  
  // 内存监控
  private memoryCheckInterval: number | null = null
  private estimatedMemoryUsage: number = 0 // 估算的内存使用（字节）
  private maxMemoryBytes: number = PERFORMANCE_CONFIG.MAX_MEMORY_MB * 1024 * 1024
  
  // 配置
  private readonly MEMORY_CHECK_INTERVAL = PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL
  private readonly CACHE_CLEANUP_THRESHOLD = PERFORMANCE_CONFIG.CACHE_CLEANUP_THRESHOLD
  private readonly LOAD_TIMEOUT = 10000 // 10秒超时
  
  private constructor() {
    console.log('[资源管理器] 初始化')
    this.startMemoryMonitoring()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager()
    }
    return ResourceManager.instance
  }

  /**
   * 预加载资源列表
   */
  async preloadResources(resources: Array<{ key: string; url: string; type: ResourceType }>): Promise<void> {
    console.log(`[资源管理器] 开始预加载 ${resources.length} 个资源`)
    
    const promises = resources.map(({ key, url, type }) => {
      switch (type) {
        case ResourceType.AUDIO:
          return this.loadAudio(url).then(audio => this.cacheResource(key, audio, type, url))
        case ResourceType.IMAGE:
          return this.loadImage(url).then(image => this.cacheResource(key, image, type, url))
        default:
          return Promise.resolve()
      }
    })

    try {
      await Promise.all(promises)
      console.log('[资源管理器] 预加载完成')
    } catch (error) {
      console.error('[资源管理器] 预加载失败:', error)
      throw error
    }
  }

  /**
   * 加载音频资源
   */
  async loadAudio(url: string): Promise<AudioBuffer | HTMLAudioElement> {
    // 检查是否已在加载中
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!
    }

    // 创建加载 Promise
    const loadPromise = this.loadAudioWithTimeout(url)
    this.loadingPromises.set(url, loadPromise)

    try {
      const audio = await loadPromise
      this.loadingPromises.delete(url)
      return audio
    } catch (error) {
      this.loadingPromises.delete(url)
      throw error
    }
  }

  /**
   * 带超时的音频加载
   */
  private async loadAudioWithTimeout(url: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      let timeoutId: number | null = null

      const cleanup = () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
      }

      // 设置超时
      timeoutId = window.setTimeout(() => {
        cleanup()
        reject(new ResourceTimeoutError(ResourceType.AUDIO, url))
      }, this.LOAD_TIMEOUT)

      // 加载成功
      audio.addEventListener('canplaythrough', () => {
        cleanup()
        resolve(audio)
      }, { once: true })

      // 加载失败
      audio.addEventListener('error', (error) => {
        cleanup()
        reject(new ResourceLoadError(ResourceType.AUDIO, url, String(error)))
      }, { once: true })

      // 开始加载
      audio.load()
    })
  }

  /**
   * 加载图片资源
   */
  async loadImage(url: string): Promise<HTMLImageElement> {
    // 检查是否已在加载中
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!
    }

    // 创建加载 Promise
    const loadPromise = this.loadImageWithTimeout(url)
    this.loadingPromises.set(url, loadPromise)

    try {
      const image = await loadPromise
      this.loadingPromises.delete(url)
      return image
    } catch (error) {
      this.loadingPromises.delete(url)
      throw error
    }
  }

  /**
   * 带超时的图片加载
   */
  private async loadImageWithTimeout(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      let timeoutId: number | null = null

      const cleanup = () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
      }

      // 设置超时
      timeoutId = window.setTimeout(() => {
        cleanup()
        reject(new ResourceTimeoutError(ResourceType.IMAGE, url))
      }, this.LOAD_TIMEOUT)

      // 加载成功
      image.onload = () => {
        cleanup()
        resolve(image)
      }

      // 加载失败
      image.onerror = (error) => {
        cleanup()
        reject(new ResourceLoadError(ResourceType.IMAGE, url, String(error)))
      }

      // 开始加载
      image.src = url
    })
  }

  /**
   * 缓存资源
   */
  private cacheResource(key: string, resource: any, type: ResourceType, url?: string): void {
    // 估算资源大小
    const size = this.estimateResourceSize(resource, type)
    
    // 检查内存是否足够
    if (this.estimatedMemoryUsage + size > this.maxMemoryBytes * this.CACHE_CLEANUP_THRESHOLD) {
      console.warn('[资源管理器] 内存不足，触发清理')
      this.cleanup()
    }

    // 缓存资源
    this.resources.set(key, resource)
    this.metadata.set(key, {
      type,
      url,
      size,
      lastAccessed: Date.now(),
      accessCount: 0
    })

    this.estimatedMemoryUsage += size
    console.log(`[资源管理器] 缓存资源: ${key}, 大小: ${(size / 1024).toFixed(2)} KB`)
  }

  /**
   * 估算资源大小
   */
  private estimateResourceSize(resource: any, type: ResourceType): number {
    switch (type) {
      case ResourceType.AUDIO:
        // 音频估算：假设平均 100KB
        return 100 * 1024
      case ResourceType.IMAGE:
        if (resource instanceof HTMLImageElement) {
          // 图片估算：width * height * 4 (RGBA)
          return resource.width * resource.height * 4
        }
        return 50 * 1024
      case ResourceType.SPRITE:
        // 检查是否为 ImageData 或类似对象
        if (resource && typeof resource.width === 'number' && typeof resource.height === 'number') {
          // 精灵图：width * height * 4 (RGBA)
          return resource.width * resource.height * 4
        }
        return 10 * 1024
      case ResourceType.DATA:
        // 数据估算：JSON 字符串长度
        try {
          return JSON.stringify(resource).length * 2 // UTF-16
        } catch {
          return 1024
        }
      default:
        return 1024
    }
  }

  /**
   * 获取资源
   */
  getResource<T>(key: string): T | null {
    const resource = this.resources.get(key)
    
    if (resource) {
      // 更新访问信息
      const meta = this.metadata.get(key)
      if (meta) {
        meta.lastAccessed = Date.now()
        meta.accessCount++
      }
      return resource as T
    }
    
    return null
  }

  /**
   * 检查资源是否存在
   */
  hasResource(key: string): boolean {
    return this.resources.has(key)
  }

  /**
   * 释放单个资源
   */
  releaseResource(key: string): void {
    const resource = this.resources.get(key)
    const meta = this.metadata.get(key)
    
    if (resource && meta) {
      this.estimatedMemoryUsage -= meta.size
      this.resources.delete(key)
      this.metadata.delete(key)
      console.log(`[资源管理器] 释放资源: ${key}`)
    }
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): MemoryUsage {
    const usedMB = this.estimatedMemoryUsage / (1024 * 1024)
    const totalMB = PERFORMANCE_CONFIG.MAX_MEMORY_MB
    
    return {
      used: usedMB,
      total: totalMB,
      percentage: (usedMB / totalMB) * 100,
      resourceCount: this.resources.size
    }
  }

  /**
   * 获取真实内存使用（如果可用）
   */
  getRealMemoryUsage(): number | null {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / (1024 * 1024)
    }
    return null
  }

  /**
   * 清理未使用的资源
   */
  cleanup(): void {
    console.log('[资源管理器] 开始清理未使用的资源')
    
    const now = Date.now()
    const UNUSED_THRESHOLD = 60000 // 60秒未使用
    const resourcesToRemove: string[] = []
    
    // 找出长时间未使用的资源
    for (const [key, meta] of this.metadata.entries()) {
      if (now - meta.lastAccessed > UNUSED_THRESHOLD && meta.accessCount < 5) {
        resourcesToRemove.push(key)
      }
    }
    
    // 如果内存使用仍然很高，按访问频率排序并移除
    if (resourcesToRemove.length === 0 && this.estimatedMemoryUsage > this.maxMemoryBytes * 0.8) {
      const sortedResources = Array.from(this.metadata.entries())
        .sort((a, b) => {
          // 按访问次数和最后访问时间排序
          const scoreA = a[1].accessCount / (now - a[1].lastAccessed + 1)
          const scoreB = b[1].accessCount / (now - b[1].lastAccessed + 1)
          return scoreA - scoreB
        })
      
      // 移除最不常用的 20% 资源
      const removeCount = Math.ceil(sortedResources.length * 0.2)
      for (let i = 0; i < removeCount; i++) {
        resourcesToRemove.push(sortedResources[i][0])
      }
    }
    
    // 执行清理
    for (const key of resourcesToRemove) {
      this.releaseResource(key)
    }
    
    console.log(`[资源管理器] 清理完成，释放了 ${resourcesToRemove.length} 个资源`)
    
    // 强制垃圾回收（如果可用）
    if (typeof (global as any).gc === 'function') {
      (global as any).gc()
    }
  }

  /**
   * 清空所有资源
   */
  clear(): void {
    console.log('[资源管理器] 清空所有资源')
    this.resources.clear()
    this.metadata.clear()
    this.loadingPromises.clear()
    this.estimatedMemoryUsage = 0
  }

  /**
   * 开始内存监控
   */
  private startMemoryMonitoring(): void {
    if (this.memoryCheckInterval !== null) {
      return
    }

    this.memoryCheckInterval = window.setInterval(() => {
      this.checkMemory()
    }, this.MEMORY_CHECK_INTERVAL)

    console.log('[资源管理器] 开始内存监控')
  }

  /**
   * 停止内存监控
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval !== null) {
      clearInterval(this.memoryCheckInterval)
      this.memoryCheckInterval = null
      console.log('[资源管理器] 停止内存监控')
    }
  }

  /**
   * 检查内存使用
   */
  private checkMemory(): void {
    const usage = this.getMemoryUsage()
    const realUsage = this.getRealMemoryUsage()
    
    // 记录内存使用情况
    if (realUsage !== null) {
      console.log(`[资源管理器] 内存使用: ${realUsage.toFixed(2)} MB (真实) / ${usage.used.toFixed(2)} MB (估算)`)
    } else {
      console.log(`[资源管理器] 内存使用: ${usage.used.toFixed(2)} MB (估算)`)
    }
    
    // 如果内存使用超过阈值，触发清理
    if (usage.percentage > this.CACHE_CLEANUP_THRESHOLD * 100) {
      console.warn(`[资源管理器] 内存使用过高 (${usage.percentage.toFixed(1)}%)，触发清理`)
      this.cleanup()
    }
  }

  /**
   * 获取资源统计信息
   */
  getStats(): {
    totalResources: number
    byType: Record<ResourceType, number>
    memoryUsage: MemoryUsage
    topResources: Array<{ key: string; size: number; accessCount: number }>
  } {
    const byType: Record<ResourceType, number> = {
      [ResourceType.AUDIO]: 0,
      [ResourceType.IMAGE]: 0,
      [ResourceType.SPRITE]: 0,
      [ResourceType.DATA]: 0
    }

    for (const meta of this.metadata.values()) {
      byType[meta.type]++
    }

    // 获取占用内存最多的资源
    const topResources = Array.from(this.metadata.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10)
      .map(([key, meta]) => ({
        key,
        size: meta.size,
        accessCount: meta.accessCount
      }))

    return {
      totalResources: this.resources.size,
      byType,
      memoryUsage: this.getMemoryUsage(),
      topResources
    }
  }

  /**
   * 销毁资源管理器
   */
  destroy(): void {
    this.stopMemoryMonitoring()
    this.clear()
    ResourceManager.instance = null
    console.log('[资源管理器] 销毁完成')
  }

  /**
   * 导出资源清单（用于调试）
   */
  exportManifest(): Array<{ key: string; type: ResourceType; size: number; url?: string }> {
    return Array.from(this.metadata.entries()).map(([key, meta]) => ({
      key,
      type: meta.type,
      size: meta.size,
      url: meta.url
    }))
  }
}
