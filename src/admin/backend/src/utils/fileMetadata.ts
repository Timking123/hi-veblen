/**
 * 文件元数据管理模块
 * 提供文件元数据的记录、查询和验证功能
 * 
 * 需求: 12.1 - 上传文件时记录完整元数据
 * 需求: 12.2 - 修改文件时更新元数据
 * 需求: 12.3 - 记录简历版本历史
 * 需求: 12.4 - 记录文件 MIME 类型和原始文件名
 * 需求: 12.5 - 支持查询文件完整历史记录
 */

import { createLogger } from './logger'

const logger = createLogger('file-metadata')

// ========== 文件元数据接口 ==========

/**
 * 文件元数据接口
 * 需求: 12.1, 12.4 - 记录完整的文件元数据
 */
export interface FileMetadata {
  /** 文件 ID */
  id?: number
  /** 文件名 */
  filename: string
  /** 原始文件名 */
  originalFilename: string
  /** 文件路径 */
  filePath: string
  /** 文件大小（字节） */
  fileSize: number
  /** MIME 类型 */
  mimeType: string
  /** 文件扩展名 */
  extension: string
  /** 上传者 ID */
  uploaderId?: number
  /** 上传者名称 */
  uploaderName?: string
  /** 上传时间 */
  uploadedAt: string
  /** 修改时间 */
  modifiedAt?: string
  /** 修改者 ID */
  modifierId?: number
  /** 修改者名称 */
  modifierName?: string
  /** 文件类型（resume/image/audio/other） */
  fileType: string
  /** 文件分类（用于图片和音频） */
  category?: string
  /** 是否激活（用于简历） */
  isActive?: boolean
  /** 下载次数 */
  downloadCount?: number
  /** 文件哈希值（用于去重） */
  fileHash?: string
  /** 额外的元数据（JSON 格式） */
  extraMetadata?: Record<string, any>
}

/**
 * 文件历史记录接口
 * 需求: 12.3, 12.5 - 记录文件历史
 */
export interface FileHistoryEntry {
  /** 历史记录 ID */
  id: number
  /** 文件 ID */
  fileId: number
  /** 操作类型 */
  operation: 'upload' | 'modify' | 'delete' | 'activate' | 'deactivate'
  /** 操作描述 */
  description: string
  /** 操作者 ID */
  operatorId?: number
  /** 操作者名称 */
  operatorName?: string
  /** 操作时间 */
  operatedAt: string
  /** 变更前的元数据 */
  beforeMetadata?: Record<string, any>
  /** 变更后的元数据 */
  afterMetadata?: Record<string, any>
}

/**
 * 元数据查询参数接口
 */
export interface MetadataQuery {
  /** 文件类型 */
  fileType?: string
  /** 文件分类 */
  category?: string
  /** 上传者 ID */
  uploaderId?: number
  /** 开始时间 */
  startTime?: Date
  /** 结束时间 */
  endTime?: Date
  /** 是否激活 */
  isActive?: boolean
  /** 排序字段 */
  sortBy?: 'uploadedAt' | 'modifiedAt' | 'fileSize' | 'downloadCount'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
  /** 限制返回数量 */
  limit?: number
  /** 偏移量 */
  offset?: number
}

/**
 * 元数据验证结果接口
 */
export interface MetadataValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误信息列表 */
  errors: string[]
}

// ========== 元数据验证 ==========

/**
 * 验证文件元数据的完整性和正确性
 * 需求: 12.4 - 验证元数据
 * 
 * @param metadata 文件元数据
 * @returns 验证结果
 */
export function validateFileMetadata(metadata: Partial<FileMetadata>): MetadataValidationResult {
  const errors: string[] = []

  // 验证必需字段
  if (!metadata.filename) {
    errors.push('文件名不能为空')
  }

  if (!metadata.originalFilename) {
    errors.push('原始文件名不能为空')
  }

  if (!metadata.filePath) {
    errors.push('文件路径不能为空')
  }

  if (metadata.fileSize === undefined || metadata.fileSize === null) {
    errors.push('文件大小不能为空')
  } else if (metadata.fileSize < 0) {
    errors.push('文件大小不能为负数')
  } else if (metadata.fileSize === 0) {
    errors.push('文件大小不能为零')
  }

  if (!metadata.mimeType) {
    errors.push('MIME 类型不能为空')
  }

  if (!metadata.fileType) {
    errors.push('文件类型不能为空')
  }

  // 验证文件类型的有效性
  const validFileTypes = ['resume', 'image', 'audio', 'other']
  if (metadata.fileType && !validFileTypes.includes(metadata.fileType)) {
    errors.push(`无效的文件类型：${metadata.fileType}`)
  }

  // 验证 MIME 类型格式
  if (metadata.mimeType && !metadata.mimeType.includes('/')) {
    errors.push(`无效的 MIME 类型格式：${metadata.mimeType}`)
  }

  // 验证时间戳格式
  if (metadata.uploadedAt) {
    const date = new Date(metadata.uploadedAt)
    if (isNaN(date.getTime())) {
      errors.push(`无效的上传时间格式：${metadata.uploadedAt}`)
    }
  }

  if (metadata.modifiedAt) {
    const date = new Date(metadata.modifiedAt)
    if (isNaN(date.getTime())) {
      errors.push(`无效的修改时间格式：${metadata.modifiedAt}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 验证元数据查询参数
 * 
 * @param query 查询参数
 * @returns 验证结果
 */
export function validateMetadataQuery(query: MetadataQuery): MetadataValidationResult {
  const errors: string[] = []

  // 验证排序字段
  if (query.sortBy) {
    const validSortFields = ['uploadedAt', 'modifiedAt', 'fileSize', 'downloadCount']
    if (!validSortFields.includes(query.sortBy)) {
      errors.push(`无效的排序字段：${query.sortBy}`)
    }
  }

  // 验证排序方向
  if (query.sortOrder) {
    const validSortOrders = ['asc', 'desc']
    if (!validSortOrders.includes(query.sortOrder)) {
      errors.push(`无效的排序方向：${query.sortOrder}`)
    }
  }

  // 验证时间范围
  if (query.startTime && query.endTime) {
    if (query.startTime > query.endTime) {
      errors.push('开始时间不能晚于结束时间')
    }
  }

  // 验证分页参数
  if (query.limit !== undefined && query.limit < 0) {
    errors.push('限制数量不能为负数')
  }

  if (query.offset !== undefined && query.offset < 0) {
    errors.push('偏移量不能为负数')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// ========== 元数据工具函数 ==========

/**
 * 从文件路径提取元数据
 * 
 * @param filePath 文件路径
 * @param fileSize 文件大小
 * @param mimeType MIME 类型
 * @returns 部分元数据
 */
export function extractMetadataFromFile(
  filePath: string,
  fileSize: number,
  mimeType: string
): Partial<FileMetadata> {
  const path = require('path')
  const filename = path.basename(filePath)
  const extension = path.extname(filename).toLowerCase()

  // 根据 MIME 类型推断文件类型
  let fileType = 'other'
  if (mimeType.startsWith('image/')) {
    fileType = 'image'
  } else if (mimeType.startsWith('audio/')) {
    fileType = 'audio'
  } else if (mimeType === 'application/pdf') {
    fileType = 'resume'
  }

  return {
    filename,
    originalFilename: filename,
    filePath,
    fileSize,
    mimeType,
    extension,
    fileType,
    uploadedAt: new Date().toISOString()
  }
}

/**
 * 计算文件哈希值（用于去重）
 * 
 * @param fileBuffer 文件内容
 * @returns 哈希值
 */
export function calculateFileHash(fileBuffer: Buffer): string {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha256')
  hash.update(fileBuffer)
  return hash.digest('hex')
}

/**
 * 比较两个元数据对象的差异
 * 
 * @param before 变更前的元数据
 * @param after 变更后的元数据
 * @returns 差异对象
 */
export function compareMetadata(
  before: Partial<FileMetadata>,
  after: Partial<FileMetadata>
): Record<string, { before: any; after: any }> {
  const changes: Record<string, { before: any; after: any }> = {}

  // 比较所有字段
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    const beforeValue = (before as any)[key]
    const afterValue = (after as any)[key]

    if (beforeValue !== afterValue) {
      changes[key] = {
        before: beforeValue,
        after: afterValue
      }
    }
  }

  return changes
}

/**
 * 格式化文件大小为人类可读格式
 * 
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

/**
 * 格式化时间戳为相对时间
 * 
 * @param timestamp 时间戳
 * @returns 相对时间字符串
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return '刚刚'
  } else if (diffMin < 60) {
    return `${diffMin} 分钟前`
  } else if (diffHour < 24) {
    return `${diffHour} 小时前`
  } else if (diffDay < 7) {
    return `${diffDay} 天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

/**
 * 创建文件历史记录条目
 * 需求: 12.3 - 记录文件历史
 * 
 * @param fileId 文件 ID
 * @param operation 操作类型
 * @param description 操作描述
 * @param operatorId 操作者 ID
 * @param operatorName 操作者名称
 * @param beforeMetadata 变更前的元数据
 * @param afterMetadata 变更后的元数据
 * @returns 历史记录条目
 */
export function createHistoryEntry(
  fileId: number,
  operation: FileHistoryEntry['operation'],
  description: string,
  operatorId?: number,
  operatorName?: string,
  beforeMetadata?: Record<string, any>,
  afterMetadata?: Record<string, any>
): Omit<FileHistoryEntry, 'id'> {
  return {
    fileId,
    operation,
    description,
    operatorId,
    operatorName,
    operatedAt: new Date().toISOString(),
    beforeMetadata,
    afterMetadata
  }
}

/**
 * 记录文件元数据变更
 * 需求: 12.2 - 修改文件时更新元数据
 * 
 * @param fileId 文件 ID
 * @param changes 变更内容
 * @param operatorId 操作者 ID
 * @param operatorName 操作者名称
 */
export function logMetadataChange(
  fileId: number,
  changes: Record<string, { before: any; after: any }>,
  operatorId?: number,
  operatorName?: string
): void {
  const changeDescription = Object.keys(changes)
    .map(key => `${key}: ${changes[key].before} → ${changes[key].after}`)
    .join(', ')

  logger.info('文件元数据变更', {
    fileId,
    changes,
    operatorId,
    operatorName,
    description: changeDescription
  })
}

/**
 * 获取文件元数据摘要
 * 
 * @param metadata 完整元数据
 * @returns 元数据摘要
 */
export function getMetadataSummary(metadata: FileMetadata): string {
  const parts: string[] = []

  parts.push(`文件名: ${metadata.filename}`)
  parts.push(`大小: ${formatFileSize(metadata.fileSize)}`)
  parts.push(`类型: ${metadata.mimeType}`)

  if (metadata.uploaderName) {
    parts.push(`上传者: ${metadata.uploaderName}`)
  }

  parts.push(`上传时间: ${formatRelativeTime(metadata.uploadedAt)}`)

  if (metadata.downloadCount !== undefined && metadata.downloadCount > 0) {
    parts.push(`下载次数: ${metadata.downloadCount}`)
  }

  return parts.join(' | ')
}

// ========== 元数据存储接口（占位符）==========

/**
 * 注意：以下函数是接口定义，实际实现应该在数据库层
 * 这里提供函数签名作为参考
 */

/**
 * 保存文件元数据到数据库
 * 需求: 12.1 - 记录完整元数据
 * 
 * @param metadata 文件元数据
 * @returns 保存后的元数据（包含 ID）
 */
export async function saveFileMetadata(metadata: Omit<FileMetadata, 'id'>): Promise<FileMetadata> {
  // TODO: 实现数据库保存逻辑
  logger.info('保存文件元数据', { metadata })
  throw new Error('未实现：saveFileMetadata')
}

/**
 * 更新文件元数据
 * 需求: 12.2 - 修改文件时更新元数据
 * 
 * @param fileId 文件 ID
 * @param updates 更新的字段
 * @returns 更新后的元数据
 */
export async function updateFileMetadata(
  fileId: number,
  updates: Partial<FileMetadata>
): Promise<FileMetadata> {
  // TODO: 实现数据库更新逻辑
  logger.info('更新文件元数据', { fileId, updates })
  throw new Error('未实现：updateFileMetadata')
}

/**
 * 查询文件元数据
 * 需求: 12.5 - 支持查询文件历史
 * 
 * @param query 查询参数
 * @returns 元数据列表
 */
export async function queryFileMetadata(query: MetadataQuery): Promise<FileMetadata[]> {
  // TODO: 实现数据库查询逻辑
  logger.info('查询文件元数据', { query })
  throw new Error('未实现：queryFileMetadata')
}

/**
 * 获取文件历史记录
 * 需求: 12.3, 12.5 - 查询文件完整历史
 * 
 * @param fileId 文件 ID
 * @returns 历史记录列表
 */
export async function getFileHistory(fileId: number): Promise<FileHistoryEntry[]> {
  // TODO: 实现数据库查询逻辑
  logger.info('获取文件历史记录', { fileId })
  throw new Error('未实现：getFileHistory')
}

/**
 * 保存文件历史记录
 * 需求: 12.3 - 记录文件历史
 * 
 * @param entry 历史记录条目
 * @returns 保存后的记录（包含 ID）
 */
export async function saveFileHistory(
  entry: Omit<FileHistoryEntry, 'id'>
): Promise<FileHistoryEntry> {
  // TODO: 实现数据库保存逻辑
  logger.info('保存文件历史记录', { entry })
  throw new Error('未实现：saveFileHistory')
}

