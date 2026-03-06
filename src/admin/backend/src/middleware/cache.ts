/**
 * API 响应缓存中间件
 * 对频繁访问的数据进行内存缓存，减少数据库查询
 * 
 * 需求: 性能要求 - 实现 API 响应缓存
 * 
 * 特点:
 * - 内存缓存，适合小型应用
 * - 支持 TTL（生存时间）
 * - 支持手动清除缓存
 * - 内存占用控制（LRU 淘汰策略）
 */

import { Request, Response, NextFunction } from 'express'

/**
 * 缓存项接口
 */
interface CacheItem {
  data: unknown
  expiry: number
  size: number
}

/**
 * 缓存配置
 */
interface CacheConfig {
  /** 默认 TTL（毫秒） */
  defaultTTL: number
  /** 最大缓存大小（字节） */
  maxSize: number
  /** 最大缓存条目数 */
  maxItems: number
}

/**
 * 默认配置
 * 考虑到服务器内存限制（500MB），缓存大小设置为 50MB
 */
const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000,  // 5 分钟
  maxSize: 50 * 1024 * 1024,   // 50MB
  maxItems: 1000
}

/**
 * 简单的内存缓存类
 * 实现 LRU（最近最少使用）淘汰策略
 */
class MemoryCache {
  private cache: Map<string, CacheItem> = new Map()
  private config: CacheConfig
  private currentSize: number = 0
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }
  
  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据或 undefined
   */
  get(key: string): unknown | undefined {
    const item = this.cache.get(key)
    
    if (!item) {
      return undefined
    }
    
    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.delete(key)
      return undefined
    }
    
    // LRU: 将访问的项移到末尾
    this.cache.delete(key)
    this.cache.set(key, item)
    
    return item.data
  }
  
  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 生存时间（毫秒）
   */
  set(key: string, data: unknown, ttl?: number): void {
    // 计算数据大小（粗略估计）
    const size = this.estimateSize(data)
    
    // 如果单个项超过最大大小的 10%，不缓存
    if (size > this.config.maxSize * 0.1) {
      return
    }
    
    // 删除旧的缓存项（如果存在）
    if (this.cache.has(key)) {
      this.delete(key)
    }
    
    // 确保有足够空间
    this.ensureSpace(size)
    
    // 添加新缓存项
    const item: CacheItem = {
      data,
      expiry: Date.now() + (ttl || this.config.defaultTTL),
      size
    }
    
    this.cache.set(key, item)
    this.currentSize += size
  }
  
  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): boolean {
    const item = this.cache.get(key)
    if (item) {
      this.currentSize -= item.size
      return this.cache.delete(key)
    }
    return false
  }
  
  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }
  
  /**
   * 清除匹配模式的缓存
   * @param pattern 正则表达式模式
   */
  clearPattern(pattern: RegExp): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.delete(key)
        count++
      }
    }
    return count
  }
  
  /**
   * 获取缓存统计信息
   */
  getStats(): { items: number; size: number; maxSize: number } {
    return {
      items: this.cache.size,
      size: this.currentSize,
      maxSize: this.config.maxSize
    }
  }
  
  /**
   * 估算数据大小
   * @param data 数据
   * @returns 估算的字节数
   */
  private estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length * 2  // UTF-16 编码
    } catch {
      return 1024  // 默认 1KB
    }
  }
  
  /**
   * 确保有足够空间
   * @param requiredSize 需要的空间
   */
  private ensureSpace(requiredSize: number): void {
    // 检查条目数限制
    while (this.cache.size >= this.config.maxItems) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.delete(firstKey)
      } else {
        break
      }
    }
    
    // 检查大小限制
    while (this.currentSize + requiredSize > this.config.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.delete(firstKey)
      } else {
        break
      }
    }
  }
}

// 全局缓存实例
const cache = new MemoryCache()

/**
 * 需要缓存的路径配置
 * key: 路径前缀
 * value: TTL（毫秒）
 */
const CACHE_PATHS: Record<string, number> = {
  '/api/statistics': 30 * 1000,      // 统计数据 30 秒
  '/api/content': 60 * 1000,         // 内容数据 1 分钟
  '/api/game/config': 5 * 60 * 1000, // 游戏配置 5 分钟
  '/api/seo': 5 * 60 * 1000,         // SEO 配置 5 分钟
}

/**
 * 生成缓存键
 * @param req 请求对象
 * @returns 缓存键
 */
function generateCacheKey(req: Request): string {
  return `${req.method}:${req.originalUrl}`
}

/**
 * 检查是否应该缓存
 * @param req 请求对象
 * @returns TTL 或 0（不缓存）
 */
function shouldCache(req: Request): number {
  // 只缓存 GET 请求
  if (req.method !== 'GET') {
    return 0
  }
  
  // 检查路径是否在缓存列表中
  for (const [path, ttl] of Object.entries(CACHE_PATHS)) {
    if (req.path.startsWith(path)) {
      return ttl
    }
  }
  
  return 0
}

/**
 * API 响应缓存中间件
 */
export function apiCache(req: Request, res: Response, next: NextFunction): void {
  const ttl = shouldCache(req)
  
  // 不需要缓存
  if (ttl === 0) {
    return next()
  }
  
  const cacheKey = generateCacheKey(req)
  
  // 尝试从缓存获取
  const cachedData = cache.get(cacheKey)
  if (cachedData) {
    res.setHeader('X-Cache', 'HIT')
    res.json(cachedData)
    return
  }
  
  // 缓存未命中，拦截响应
  res.setHeader('X-Cache', 'MISS')
  
  const originalJson = res.json.bind(res)
  res.json = (data: unknown) => {
    // 只缓存成功的响应
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(cacheKey, data, ttl)
    }
    return originalJson(data)
  }
  
  next()
}

/**
 * 清除缓存的辅助函数
 * 在数据更新时调用
 */
export function clearCache(pattern?: string | RegExp): void {
  if (!pattern) {
    cache.clear()
  } else if (typeof pattern === 'string') {
    cache.clearPattern(new RegExp(pattern))
  } else {
    cache.clearPattern(pattern)
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): { items: number; size: number; maxSize: number } {
  return cache.getStats()
}

export default apiCache
