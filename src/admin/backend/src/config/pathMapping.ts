/**
 * 路径映射配置模块
 * 集中管理所有文件路径映射关系
 */

import * as path from 'path'

/**
 * 路径映射配置接口
 */
export interface PathMappingConfig {
  // 后台文件存储根目录
  adminFileRoot: string
  
  // 前端公共目录
  publicRoot: string
  
  // 路径映射
  mappings: {
    resume: {
      admin: string      // src/admin/file/resume/
      public: string     // public/resume.pdf
    }
    audio: {
      admin: string      // src/admin/file/audio/
      public: string     // public/audio/
    }
    message: {
      admin: string      // src/admin/file/message/
      public: null       // 不公开访问
    }
    image: {
      admin: string      // src/admin/file/images/
      public: string     // public/images/
    }
  }
  
  /**
   * 获取文件的公共访问 URL
   * @param adminPath 后台文件路径
   * @returns 公共访问 URL 或 null
   */
  getPublicUrl(adminPath: string): string | null
  
  /**
   * 获取文件的后台存储路径
   * @param publicUrl 公共 URL
   * @returns 后台存储路径或 null
   */
  getAdminPath(publicUrl: string): string | null
}

/**
 * 项目根目录（从 backend/src/config 向上三级）
 */
const PROJECT_ROOT = path.resolve(__dirname, '../../..')

/**
 * 后台文件存储根目录
 */
export const ADMIN_FILE_ROOT = path.join(PROJECT_ROOT, 'file')

/**
 * 前端公共目录（相对于项目根目录）
 */
export const PUBLIC_ROOT = path.join(PROJECT_ROOT, '../../public')

/**
 * 路径映射配置实现
 */
class PathMappingConfigImpl implements PathMappingConfig {
  adminFileRoot = ADMIN_FILE_ROOT
  publicRoot = PUBLIC_ROOT
  
  mappings = {
    resume: {
      admin: path.join(ADMIN_FILE_ROOT, 'resume'),
      public: path.join(PUBLIC_ROOT, 'resume.pdf')
    },
    audio: {
      admin: path.join(ADMIN_FILE_ROOT, 'audio'),
      public: path.join(PUBLIC_ROOT, 'audio')
    },
    message: {
      admin: path.join(ADMIN_FILE_ROOT, 'message'),
      public: null
    },
    image: {
      admin: path.join(ADMIN_FILE_ROOT, 'images'),
      public: path.join(PUBLIC_ROOT, 'images')
    }
  }
  
  /**
   * 获取文件的公共访问 URL
   * @param adminPath 后台文件路径（相对或绝对）
   * @returns 公共访问 URL 或 null
   */
  getPublicUrl(adminPath: string): string | null {
    // 规范化路径
    const normalizedPath = path.normalize(adminPath)
    
    // 检查是否在简历目录
    if (normalizedPath.includes('resume')) {
      // 简历文件统一映射到 public/resume.pdf（当前激活版本）
      return '/resume.pdf'
    }
    
    // 检查是否在音频目录
    if (normalizedPath.includes('audio')) {
      // 提取相对于 audio 目录的路径
      const relativePath = this.extractRelativePath(normalizedPath, 'audio')
      if (relativePath) {
        return `/audio/${relativePath}`
      }
    }
    
    // 检查是否在图片目录
    if (normalizedPath.includes('images')) {
      // 提取相对于 images 目录的路径
      const relativePath = this.extractRelativePath(normalizedPath, 'images')
      if (relativePath) {
        return `/images/${relativePath}`
      }
    }
    
    // 留言附件不公开访问
    if (normalizedPath.includes('message')) {
      return null
    }
    
    return null
  }
  
  /**
   * 获取文件的后台存储路径
   * @param publicUrl 公共 URL
   * @returns 后台存储路径或 null
   */
  getAdminPath(publicUrl: string): string | null {
    // 移除查询参数
    const urlParts = publicUrl.split('?')
    if (!urlParts[0]) {
      return null
    }
    const urlWithoutQuery = urlParts[0]
    
    // 简历文件
    if (urlWithoutQuery === '/resume.pdf') {
      // 返回简历目录，具体文件需要查询数据库
      return this.mappings.resume.admin
    }
    
    // 音频文件
    if (urlWithoutQuery.startsWith('/audio/')) {
      const relativePath = urlWithoutQuery.substring('/audio/'.length)
      return path.join(this.mappings.audio.admin, relativePath)
    }
    
    // 图片文件
    if (urlWithoutQuery.startsWith('/images/')) {
      const relativePath = urlWithoutQuery.substring('/images/'.length)
      return path.join(this.mappings.image.admin, relativePath)
    }
    
    return null
  }
  
  /**
   * 提取相对路径
   * @param fullPath 完整路径
   * @param baseDir 基础目录名
   * @returns 相对路径或 null
   */
  private extractRelativePath(fullPath: string, baseDir: string): string | null {
    const parts = fullPath.split(path.sep)
    const baseDirIndex = parts.findIndex(p => p === baseDir)
    
    if (baseDirIndex === -1 || baseDirIndex === parts.length - 1) {
      return null
    }
    
    return parts.slice(baseDirIndex + 1).join('/')
  }
}

/**
 * 导出路径映射配置实例
 */
export const pathMappingConfig: PathMappingConfig = new PathMappingConfigImpl()

/**
 * 路径常量
 */
export const PATH_CONSTANTS = {
  // 后台文件根目录
  ADMIN_FILE_ROOT,
  
  // 前端公共目录
  PUBLIC_ROOT,
  
  // 简历目录
  RESUME_ADMIN_DIR: path.join(ADMIN_FILE_ROOT, 'resume'),
  RESUME_PUBLIC_FILE: path.join(PUBLIC_ROOT, 'resume.pdf'),
  
  // 音频目录
  AUDIO_ADMIN_DIR: path.join(ADMIN_FILE_ROOT, 'audio'),
  AUDIO_PUBLIC_DIR: path.join(PUBLIC_ROOT, 'audio'),
  AUDIO_BGM_ADMIN_DIR: path.join(ADMIN_FILE_ROOT, 'audio', 'bgm'),
  AUDIO_SFX_ADMIN_DIR: path.join(ADMIN_FILE_ROOT, 'audio', 'sfx'),
  
  // 留言附件目录
  MESSAGE_ADMIN_DIR: path.join(ADMIN_FILE_ROOT, 'message'),
  
  // 图片目录
  IMAGE_ADMIN_DIR: path.join(ADMIN_FILE_ROOT, 'images'),
  IMAGE_PUBLIC_DIR: path.join(PUBLIC_ROOT, 'images')
} as const

/**
 * 文件类型枚举
 */
export enum FileCategory {
  RESUME = 'resume',
  AUDIO = 'audio',
  MESSAGE = 'message',
  IMAGE = 'image'
}

/**
 * 根据文件路径判断文件类型
 * @param filePath 文件路径
 * @returns 文件类型或 null
 */
export function getFileCategory(filePath: string): FileCategory | null {
  const normalizedPath = path.normalize(filePath)
  
  if (normalizedPath.includes('resume')) {
    return FileCategory.RESUME
  }
  
  if (normalizedPath.includes('audio')) {
    return FileCategory.AUDIO
  }
  
  if (normalizedPath.includes('message')) {
    return FileCategory.MESSAGE
  }
  
  if (normalizedPath.includes('images')) {
    return FileCategory.IMAGE
  }
  
  return null
}

/**
 * 检查文件是否可公开访问
 * @param filePath 文件路径
 * @returns 是否可公开访问
 */
export function isPublicAccessible(filePath: string): boolean {
  const category = getFileCategory(filePath)
  
  // 留言附件不可公开访问
  return category !== FileCategory.MESSAGE
}
