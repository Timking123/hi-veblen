/**
 * 文件管理配置模块
 * 集中管理所有文件相关的配置常量
 * 
 * 需求: 14.4 - 在配置文件中集中管理所有文件路径
 */

import * as path from 'path'

// ========== 路径配置 ==========

/**
 * 项目根目录（从 backend/src/config 向上三级）
 */
export const PROJECT_ROOT = path.resolve(__dirname, '../../..')

/**
 * 后台文件存储根目录
 */
export const ADMIN_FILE_ROOT = path.join(PROJECT_ROOT, 'file')

/**
 * 前端公共目录（相对于项目根目录）
 */
export const PUBLIC_ROOT = path.join(PROJECT_ROOT, '../../public')

/**
 * 文件目录配置
 */
export const FILE_DIRECTORIES = {
  // 简历目录
  RESUME_ADMIN: path.join(ADMIN_FILE_ROOT, 'resume'),
  RESUME_PUBLIC: path.join(PUBLIC_ROOT, 'resume.pdf'),
  
  // 音频目录
  AUDIO_ADMIN: path.join(ADMIN_FILE_ROOT, 'audio'),
  AUDIO_PUBLIC: path.join(PUBLIC_ROOT, 'audio'),
  AUDIO_BGM_ADMIN: path.join(ADMIN_FILE_ROOT, 'audio', 'bgm'),
  AUDIO_SFX_ADMIN: path.join(ADMIN_FILE_ROOT, 'audio', 'sfx'),
  AUDIO_BGM_PUBLIC: path.join(PUBLIC_ROOT, 'audio', 'bgm'),
  AUDIO_SFX_PUBLIC: path.join(PUBLIC_ROOT, 'audio', 'sfx'),
  
  // 留言附件目录（私有）
  MESSAGE_ADMIN: path.join(ADMIN_FILE_ROOT, 'message'),
  
  // 图片目录
  IMAGE_ADMIN: path.join(ADMIN_FILE_ROOT, 'images'),
  IMAGE_PUBLIC: path.join(PUBLIC_ROOT, 'images'),
  IMAGE_AVATAR_ADMIN: path.join(ADMIN_FILE_ROOT, 'images', 'avatar'),
  IMAGE_SCREENSHOT_ADMIN: path.join(ADMIN_FILE_ROOT, 'images', 'screenshot'),
  IMAGE_OTHER_ADMIN: path.join(ADMIN_FILE_ROOT, 'images', 'other')
} as const

// ========== 文件大小限制 ==========

/**
 * 文件大小限制（字节）
 */
export const FILE_SIZE_LIMITS = {
  /** 简历文件最大 20MB */
  RESUME: 20 * 1024 * 1024,
  
  /** 图片文件最大 10MB */
  IMAGE: 10 * 1024 * 1024,
  
  /** 音频文件最大 50MB */
  AUDIO: 50 * 1024 * 1024,
  
  /** 留言附件最大 5MB */
  MESSAGE_ATTACHMENT: 5 * 1024 * 1024
} as const

// ========== 缓存策略配置 ==========

/**
 * 缓存控制策略
 */
export const CACHE_CONTROL = {
  /** 当前简历：不缓存 */
  CURRENT_RESUME: 'no-cache, must-revalidate',
  
  /** 历史版本：永久缓存 */
  VERSIONED_RESUME: 'public, max-age=31536000, immutable',
  
  /** 音频文件：1天缓存 */
  AUDIO: 'public, max-age=86400',
  
  /** 图片文件：7天缓存 */
  IMAGE: 'public, max-age=604800',
  
  /** 静态资源：30天缓存 */
  STATIC: 'public, max-age=2592000'
} as const

// ========== 文件类型配置 ==========

/**
 * 允许的文件扩展名
 */
export const ALLOWED_EXTENSIONS = {
  /** 简历文件 */
  RESUME: new Set(['.pdf']),
  
  /** 图片文件 */
  IMAGE: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']),
  
  /** 音频文件 */
  AUDIO: new Set(['.mp3', '.ogg']),
  
  /** 留言附件 */
  MESSAGE_ATTACHMENT: new Set(['.jpg', '.jpeg', '.png', '.pdf', '.txt'])
} as const

/**
 * MIME 类型映射
 */
export const MIME_TYPES: Record<string, string> = {
  // 文档
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  
  // 图片
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  
  // 音频
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
}

/**
 * Magic Bytes 验证配置
 * 用于验证文件内容与扩展名是否匹配
 */
export const MAGIC_BYTES: Record<string, Buffer[]> = {
  'application/pdf': [
    Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
  ],
  'image/jpeg': [
    Buffer.from([0xFF, 0xD8, 0xFF]) // JPEG
  ],
  'image/png': [
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) // PNG
  ],
  'image/webp': [
    Buffer.from([0x52, 0x49, 0x46, 0x46]) // RIFF (WebP 容器)
  ],
  'image/gif': [
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])  // GIF89a
  ],
  'audio/mpeg': [
    Buffer.from([0x49, 0x44, 0x33]), // ID3 (MP3 with ID3 tag)
    Buffer.from([0xFF, 0xFB]),       // MP3 frame sync
    Buffer.from([0xFF, 0xF3]),       // MP3 frame sync
    Buffer.from([0xFF, 0xF2])        // MP3 frame sync
  ],
  'audio/ogg': [
    Buffer.from([0x4F, 0x67, 0x67, 0x53]) // OggS
  ]
}

// ========== 文件访问权限配置 ==========

/**
 * 文件访问权限类型
 */
export enum FileAccessType {
  /** 公开访问（无需认证） */
  PUBLIC = 'public',
  
  /** 需要认证 */
  AUTHENTICATED = 'authenticated',
  
  /** 私有（仅管理员） */
  PRIVATE = 'private'
}

/**
 * 文件类型的访问权限映射
 */
export const FILE_ACCESS_PERMISSIONS: Record<string, FileAccessType> = {
  // 公开访问
  'resume': FileAccessType.PUBLIC,
  'audio': FileAccessType.PUBLIC,
  'image': FileAccessType.PUBLIC,
  
  // 私有访问
  'message': FileAccessType.PRIVATE
}

// ========== 图片处理配置 ==========

/**
 * 图片压缩配置
 */
export const IMAGE_COMPRESSION = {
  /** 压缩质量（0-100） */
  QUALITY: 80,
  
  /** 最大宽度（像素） */
  MAX_WIDTH: 1920,
  
  /** 最大高度（像素） */
  MAX_HEIGHT: 1080,
  
  /** 缩略图宽度（像素） */
  THUMBNAIL_WIDTH: 200,
  
  /** 缩略图高度（像素） */
  THUMBNAIL_HEIGHT: 200
} as const

/**
 * 头像裁剪配置
 */
export const AVATAR_CONFIG = {
  /** 头像尺寸（像素） */
  SIZE: 200,
  
  /** 压缩质量（0-100） */
  QUALITY: 90
} as const

// ========== 备份配置 ==========

/**
 * 文件事务备份目录
 */
export const BACKUP_DIR = path.join(ADMIN_FILE_ROOT, '.file-transaction-backup')

/**
 * 简历版本保留数量
 */
export const RESUME_VERSION_KEEP_COUNT = 10

// ========== 导出辅助函数 ==========

/**
 * 获取文件类型的大小限制
 * @param fileType 文件类型
 * @returns 大小限制（字节）
 */
export function getFileSizeLimit(fileType: keyof typeof FILE_SIZE_LIMITS): number {
  return FILE_SIZE_LIMITS[fileType]
}

/**
 * 获取文件类型的缓存策略
 * @param fileType 文件类型
 * @param isVersioned 是否有版本标识
 * @returns 缓存控制头值
 */
export function getCacheControl(fileType: 'resume' | 'audio' | 'image' | 'static', isVersioned: boolean = false): string {
  if (fileType === 'resume') {
    return isVersioned ? CACHE_CONTROL.VERSIONED_RESUME : CACHE_CONTROL.CURRENT_RESUME
  }
  
  return CACHE_CONTROL[fileType.toUpperCase() as keyof typeof CACHE_CONTROL] || CACHE_CONTROL.STATIC
}

/**
 * 检查文件扩展名是否允许
 * @param extension 文件扩展名（包含点号）
 * @param fileType 文件类型
 * @returns 是否允许
 */
export function isExtensionAllowed(extension: string, fileType: keyof typeof ALLOWED_EXTENSIONS): boolean {
  const allowedSet = ALLOWED_EXTENSIONS[fileType]
  return allowedSet.has(extension.toLowerCase())
}

/**
 * 获取 MIME 类型
 * @param extension 文件扩展名（包含点号）
 * @returns MIME 类型
 */
export function getMimeType(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream'
}
