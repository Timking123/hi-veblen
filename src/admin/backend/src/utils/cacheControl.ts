/**
 * 缓存控制管理器
 * 为不同类型的文件设置合适的缓存策略
 */

export type FileType = 'resume' | 'audio' | 'image' | 'static'

export interface CacheHeaders {
  'Cache-Control': string
  'Pragma'?: string
  'Expires'?: string
  'ETag'?: string
  'Last-Modified'?: string
}

/**
 * 缓存策略常量
 */
export const CACHE_STRATEGIES = {
  // 当前简历：不缓存，总是验证
  CURRENT_RESUME: {
    'Cache-Control': 'no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  
  // 历史版本：永久缓存（内容不会改变）
  VERSIONED_RESUME: {
    'Cache-Control': 'public, max-age=31536000, immutable'
  },
  
  // 音频文件：1天缓存
  AUDIO: {
    'Cache-Control': 'public, max-age=86400'
  },
  
  // 图片文件：7天缓存
  IMAGE: {
    'Cache-Control': 'public, max-age=604800'
  },
  
  // 静态资源：30天缓存
  STATIC: {
    'Cache-Control': 'public, max-age=2592000'
  }
} as const

/**
 * 缓存控制管理器类
 */
export class CacheControlManager {
  /**
   * 获取文件的缓存控制头
   * @param fileType 文件类型
   * @param isVersioned 是否有版本标识
   * @returns 缓存控制头对象
   */
  static getCacheHeaders(fileType: FileType, isVersioned: boolean = false): CacheHeaders {
    switch (fileType) {
      case 'resume':
        if (isVersioned) {
          // 历史版本：永久缓存
          return { ...CACHE_STRATEGIES.VERSIONED_RESUME }
        } else {
          // 当前简历：不缓存
          return { ...CACHE_STRATEGIES.CURRENT_RESUME }
        }
      
      case 'audio':
        // 音频：1天缓存
        return { ...CACHE_STRATEGIES.AUDIO }
      
      case 'image':
        // 图片：7天缓存
        return { ...CACHE_STRATEGIES.IMAGE }
      
      case 'static':
        // 静态资源：30天缓存
        return { ...CACHE_STRATEGIES.STATIC }
      
      default:
        // 默认：不缓存
        return {
          'Cache-Control': 'no-cache, must-revalidate'
        }
    }
  }

  /**
   * 生成带版本标识的 URL
   * @param basePath 基础路径
   * @param version 版本标识（时间戳或版本号）
   * @returns 带版本的 URL
   */
  static generateVersionedUrl(basePath: string, version: string | number): string {
    const timestamp = typeof version === 'number' ? version : Date.now()
    const separator = basePath.includes('?') ? '&' : '?'
    return `${basePath}${separator}v=${timestamp}`
  }

  /**
   * 生成 ETag
   * @param content 文件内容或标识符
   * @returns ETag 值
   */
  static generateETag(content: string | Buffer): string {
    const crypto = require('crypto')
    const hash = crypto.createHash('md5')
    hash.update(content)
    return `"${hash.digest('hex')}"`
  }

  /**
   * 格式化 Last-Modified 日期
   * @param date 日期对象或时间戳
   * @returns HTTP 日期格式字符串
   */
  static formatLastModified(date: Date | number): string {
    const dateObj = typeof date === 'number' ? new Date(date) : date
    return dateObj.toUTCString()
  }

  /**
   * 检查条件请求是否匹配
   * @param ifNoneMatch 客户端的 If-None-Match 头
   * @param etag 服务器的 ETag
   * @returns 是否匹配（匹配则返回 304）
   */
  static checkETagMatch(ifNoneMatch: string | undefined, etag: string): boolean {
    if (!ifNoneMatch) {
      return false
    }
    
    // 支持多个 ETag 或 * 通配符
    const tags = ifNoneMatch.split(',').map(tag => tag.trim())
    return tags.includes(etag) || tags.includes('*')
  }

  /**
   * 检查条件请求是否未修改
   * @param ifModifiedSince 客户端的 If-Modified-Since 头
   * @param lastModified 服务器的 Last-Modified 时间
   * @returns 是否未修改（未修改则返回 304）
   */
  static checkNotModified(
    ifModifiedSince: string | undefined,
    lastModified: Date | number
  ): boolean {
    if (!ifModifiedSince) {
      return false
    }
    
    try {
      const clientDate = new Date(ifModifiedSince)
      const serverDate = typeof lastModified === 'number' ? new Date(lastModified) : lastModified
      
      // 比较时间戳（忽略毫秒）
      return Math.floor(clientDate.getTime() / 1000) >= Math.floor(serverDate.getTime() / 1000)
    } catch {
      return false
    }
  }
}

/**
 * 导出便捷函数
 */
export const getCacheHeaders = CacheControlManager.getCacheHeaders
export const generateVersionedUrl = CacheControlManager.generateVersionedUrl
export const generateETag = CacheControlManager.generateETag
export const formatLastModified = CacheControlManager.formatLastModified
export const checkETagMatch = CacheControlManager.checkETagMatch
export const checkNotModified = CacheControlManager.checkNotModified
