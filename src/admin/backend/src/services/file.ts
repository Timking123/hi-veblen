/**
 * 文件服务模块
 * 提供文件管理相关的操作功能
 * 
 * 需求: 5.4.1 - 以树形结构展示文件目录
 * 需求: 5.4.2 - 提供文件上传/下载/删除功能
 * 需求: 5.4.3 - 提供文件重命名功能
 * 需求: 5.4.4 - 显示文件大小和修改时间
 * 需求: 5.1.1 - 提供简历上传功能（仅支持 PDF 格式）
 * 需求: 5.1.2 - 保留简历版本历史（最多 5 个版本）
 * 需求: 5.1.3 - 提供设置当前使用简历的功能
 * 需求: 5.1.4 - 显示简历下载统计
 */

import path from 'path'
import fs from 'fs'
import { getDatabase, isDatabaseInitialized } from '../database/init'
import { createLogger } from '../utils/logger'

// 创建文件服务日志记录器
const logger = createLogger('file')

// ========== 类型定义 ==========

/**
 * 文件节点类型
 */
export type FileNodeType = 'file' | 'directory'

/**
 * 文件树节点接口
 * 需求: 5.4.1 - 以树形结构展示文件目录
 * 需求: 5.4.4 - 显示文件大小和修改时间
 */
export interface FileTreeNode {
  /** 文件/目录名称 */
  name: string
  /** 相对路径 */
  path: string
  /** 节点类型 */
  type: FileNodeType
  /** 文件大小（字节），仅文件有效 */
  size?: number
  /** 修改时间（ISO 格式） */
  modifiedAt?: string
  /** 子节点，仅目录有效 */
  children?: FileTreeNode[]
  /** 文件扩展名，仅文件有效 */
  extension?: string
}

/**
 * 文件上传结果接口
 */
export interface FileUploadResult {
  success: boolean
  path?: string
  filename?: string
  error?: string
}

/**
 * 文件操作结果接口
 */
export interface FileOperationResult {
  success: boolean
  error?: string
}

/**
 * 文件信息接口
 */
export interface FileInfo {
  name: string
  path: string
  type: FileNodeType
  size: number
  modifiedAt: string
  createdAt: string
  extension?: string
}

// ========== 文件安全验证常量 ==========

/**
 * Magic Bytes 签名表
 * 用于验证文件内容的真实类型
 * 需求: 6.1 - 同时验证文件扩展名和文件内容的 Magic Bytes
 */
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])],
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  'audio/mpeg': [
    Buffer.from([0xFF, 0xFB]), // MPEG-1 Layer 3
    Buffer.from([0xFF, 0xF3]), // MPEG-1 Layer 3
    Buffer.from([0xFF, 0xF2]), // MPEG-2 Layer 3
    Buffer.from([0x49, 0x44, 0x33])  // ID3v2
  ],
  'audio/ogg': [Buffer.from([0x4F, 0x67, 0x67, 0x53])],
  'audio/wav': [Buffer.from([0x52, 0x49, 0x46, 0x46])]
}

/**
 * 文件大小限制（字节）
 * 需求: 6.2 - 限制单个文件上传大小
 */
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,   // 10MB
  audio: 50 * 1024 * 1024,   // 50MB
  resume: 20 * 1024 * 1024   // 20MB
}

/**
 * 验证文件内容的 Magic Bytes
 * 需求: 6.1 - 验证文件内容的 Magic Bytes 以确认文件类型
 * 需求: 6.4 - 文件内容的 Magic Bytes 与声明的文件类型不匹配时拒绝上传
 * 
 * @param buffer - 文件内容
 * @param expectedType - 期望的 MIME 类型
 * @returns 是否匹配
 */
export function validateMagicBytes(buffer: Buffer, expectedType: string): boolean {
  const signatures = MAGIC_BYTES[expectedType]
  if (!signatures || signatures.length === 0) {
    return false
  }
  
  // 检查是否匹配任一签名
  return signatures.some(sig => {
    if (buffer.length < sig.length) {
      return false
    }
    return buffer.subarray(0, sig.length).equals(sig)
  })
}

/**
 * 验证文件大小是否在限制范围内
 * 需求: 6.2 - 限制单个文件上传大小
 * 
 * @param fileSize - 文件大小（字节）
 * @param fileType - 文件类型（'image' | 'audio' | 'resume'）
 * @returns 是否在限制范围内
 */
export function validateFileSize(fileSize: number, fileType: 'image' | 'audio' | 'resume'): boolean {
  // 拒绝零字节文件
  if (fileSize <= 0) {
    return false
  }
  
  const limit = FILE_SIZE_LIMITS[fileType]
  return fileSize <= limit
}

// ========== 简历版本管理类型定义 ==========

/**
 * 简历版本接口
 * 需求: 5.1.2 - 保留简历版本历史（最多 5 个版本）
 * 需求: 5.1.4 - 显示简历下载统计
 */
export interface ResumeVersion {
  /** 版本 ID */
  id: number
  /** 版本号 */
  version: number
  /** 文件名 */
  filename: string
  /** 文件路径 */
  filePath: string
  /** 文件大小（字节） */
  fileSize: number | null
  /** 是否为当前使用的简历 */
  isActive: boolean
  /** 下载次数 */
  downloadCount: number
  /** 创建时间 */
  createdAt: string
}

/**
 * 简历上传结果接口
 */
export interface ResumeUploadResult {
  success: boolean
  version?: number
  error?: string
}

/**
 * 简历操作结果接口
 */
export interface ResumeOperationResult {
  success: boolean
  error?: string
}

// ========== 常量配置 ==========

/**
 * 文件存储根目录
 */
const FILE_ROOT = path.resolve(__dirname, '../../../file')

/**
 * 允许的文件扩展名（用于安全检查）
 */
const ALLOWED_EXTENSIONS = new Set([
  // 文档
  '.txt', '.md', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.json',
  // 图片
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
  // 音频
  '.mp3', '.ogg', '.wav', '.m4a',
  // 视频
  '.mp4', '.webm',
  // 代码
  '.ts', '.js', '.html', '.css', '.vue'
])

/**
 * 禁止访问的目录/文件名
 */
const FORBIDDEN_NAMES = new Set([
  '..',
  '.git',
  '.env',
  'node_modules'
])

/**
 * 简历存储目录（相对于 FILE_ROOT）
 */
const RESUME_DIR = 'resume'

/**
 * 最大简历版本数
 * 需求: 5.1.2 - 保留简历版本历史（最多 5 个版本）
 */
export const MAX_RESUME_VERSIONS = 5

// ========== 辅助函数 ==========

/**
 * 确保文件根目录存在
 */
function ensureFileRoot(): void {
  if (!fs.existsSync(FILE_ROOT)) {
    fs.mkdirSync(FILE_ROOT, { recursive: true })
  }
}

/**
 * 验证路径安全性
 * 防止路径遍历攻击
 * 
 * @param relativePath - 相对路径
 * @returns 是否安全
 */
export function isPathSafe(relativePath: string): boolean {
  // 空路径视为根目录，是安全的
  if (!relativePath || relativePath === '' || relativePath === '/') {
    return true
  }
  
  // 检查是否包含禁止的名称
  const parts = relativePath.split(/[/\\]/)
  for (const part of parts) {
    if (FORBIDDEN_NAMES.has(part)) {
      return false
    }
  }
  
  // 规范化路径并检查是否在根目录内
  const normalizedPath = path.normalize(relativePath)
  
  // 检查是否尝试访问上级目录
  if (normalizedPath.startsWith('..') || normalizedPath.includes('..')) {
    return false
  }
  
  // 构建完整路径并验证
  const fullPath = path.resolve(FILE_ROOT, normalizedPath)
  
  // 确保完整路径在文件根目录内
  return fullPath.startsWith(FILE_ROOT)
}

/**
 * 获取完整的文件路径
 * 
 * @param relativePath - 相对路径
 * @returns 完整路径或 null（如果路径不安全）
 */
export function getFullPath(relativePath: string): string | null {
  if (!isPathSafe(relativePath)) {
    return null
  }
  
  if (!relativePath || relativePath === '' || relativePath === '/') {
    return FILE_ROOT
  }
  
  return path.resolve(FILE_ROOT, relativePath)
}

/**
 * 获取相对路径
 * 
 * @param fullPath - 完整路径
 * @returns 相对路径
 */
export function getRelativePath(fullPath: string): string {
  return path.relative(FILE_ROOT, fullPath).replace(/\\/g, '/')
}

/**
 * 格式化文件大小
 * 
 * @param bytes - 字节数
 * @returns 格式化后的大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

/**
 * 获取文件扩展名
 * 
 * @param filename - 文件名
 * @returns 扩展名（小写，包含点号）
 */
function getExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  return ext
}

/**
 * 检查文件扩展名是否允许
 * 
 * @param filename - 文件名
 * @returns 是否允许
 */
export function isExtensionAllowed(filename: string): boolean {
  const ext = getExtension(filename)
  // 如果没有扩展名，默认允许（可能是目录或特殊文件）
  if (!ext) return true
  return ALLOWED_EXTENSIONS.has(ext)
}

// ========== 目录树生成 ==========

/**
 * 生成目录树
 * 需求: 5.4.1 - 以树形结构展示文件目录
 * 需求: 5.4.4 - 显示文件大小和修改时间
 * 
 * @param relativePath - 相对路径，默认为根目录
 * @param maxDepth - 最大深度，默认为 10
 * @returns 目录树节点数组
 */
export function getDirectoryTree(relativePath: string = '', maxDepth: number = 10): FileTreeNode[] {
  ensureFileRoot()
  
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return []
  }
  
  if (!fs.existsSync(fullPath)) {
    return []
  }
  
  const stats = fs.statSync(fullPath)
  if (!stats.isDirectory()) {
    return []
  }
  
  return buildTreeRecursive(fullPath, relativePath, 0, maxDepth)
}

/**
 * 递归构建目录树
 * 
 * @param dirPath - 目录完整路径
 * @param relativePath - 相对路径
 * @param currentDepth - 当前深度
 * @param maxDepth - 最大深度
 * @returns 目录树节点数组
 */
function buildTreeRecursive(
  dirPath: string,
  relativePath: string,
  currentDepth: number,
  maxDepth: number
): FileTreeNode[] {
  if (currentDepth >= maxDepth) {
    return []
  }
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const nodes: FileTreeNode[] = []
    
    // 先处理目录，再处理文件
    const directories = entries.filter(e => e.isDirectory())
    const files = entries.filter(e => e.isFile())
    
    // 处理目录
    for (const entry of directories) {
      // 跳过禁止的目录
      if (FORBIDDEN_NAMES.has(entry.name)) {
        continue
      }
      
      const entryPath = path.join(dirPath, entry.name)
      const entryRelativePath = relativePath 
        ? `${relativePath}/${entry.name}` 
        : entry.name
      
      const stats = fs.statSync(entryPath)
      
      const node: FileTreeNode = {
        name: entry.name,
        path: entryRelativePath,
        type: 'directory',
        modifiedAt: stats.mtime.toISOString(),
        children: buildTreeRecursive(entryPath, entryRelativePath, currentDepth + 1, maxDepth)
      }
      
      nodes.push(node)
    }
    
    // 处理文件
    for (const entry of files) {
      const entryPath = path.join(dirPath, entry.name)
      const entryRelativePath = relativePath 
        ? `${relativePath}/${entry.name}` 
        : entry.name
      
      const stats = fs.statSync(entryPath)
      const ext = getExtension(entry.name)
      
      const node: FileTreeNode = {
        name: entry.name,
        path: entryRelativePath,
        type: 'file',
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        extension: ext || undefined
      }
      
      nodes.push(node)
    }
    
    // 按名称排序（目录在前，文件在后，各自按名称排序）
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    
    return nodes
  } catch (error) {
    logger.error('构建目录树失败', { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

// ========== 文件信息 ==========

/**
 * 获取文件/目录信息
 * 需求: 5.4.4 - 显示文件大小和修改时间
 * 
 * @param relativePath - 相对路径
 * @returns 文件信息或 null
 */
export function getFileInfo(relativePath: string): FileInfo | null {
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return null
  }
  
  if (!fs.existsSync(fullPath)) {
    return null
  }
  
  try {
    const stats = fs.statSync(fullPath)
    const name = path.basename(fullPath)
    
    return {
      name,
      path: relativePath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      createdAt: stats.birthtime.toISOString(),
      extension: stats.isFile() ? getExtension(name) || undefined : undefined
    }
  } catch (error) {
    logger.error('获取文件信息失败', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

// ========== 文件上传 ==========

/**
 * 保存上传的文件
 * 需求: 5.4.2 - 提供文件上传功能
 * 
 * @param fileBuffer - 文件内容
 * @param filename - 文件名
 * @param targetDir - 目标目录（相对路径）
 * @returns 上传结果
 */
export function saveUploadedFile(
  fileBuffer: Buffer,
  filename: string,
  targetDir: string = ''
): FileUploadResult {
  ensureFileRoot()
  
  // 验证目标目录路径
  const targetFullPath = getFullPath(targetDir)
  if (!targetFullPath) {
    return {
      success: false,
      error: '目标目录路径无效'
    }
  }
  
  // 验证文件名
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return {
      success: false,
      error: '文件名无效'
    }
  }
  
  // 检查文件扩展名
  if (!isExtensionAllowed(filename)) {
    return {
      success: false,
      error: '不支持的文件类型'
    }
  }
  
  try {
    // 确保目标目录存在
    if (!fs.existsSync(targetFullPath)) {
      fs.mkdirSync(targetFullPath, { recursive: true })
    }
    
    // 处理文件名冲突
    let finalFilename = filename
    let filePath = path.join(targetFullPath, finalFilename)
    let counter = 1
    
    while (fs.existsSync(filePath)) {
      const ext = path.extname(filename)
      const nameWithoutExt = path.basename(filename, ext)
      finalFilename = `${nameWithoutExt}_${counter}${ext}`
      filePath = path.join(targetFullPath, finalFilename)
      counter++
    }
    
    // 写入文件
    fs.writeFileSync(filePath, fileBuffer)
    
    // 计算相对路径
    const relativePath = targetDir 
      ? `${targetDir}/${finalFilename}` 
      : finalFilename
    
    return {
      success: true,
      path: relativePath,
      filename: finalFilename
    }
  } catch (error) {
    logger.error('保存文件失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '保存文件失败'
    }
  }
}

// ========== 文件下载 ==========

/**
 * 获取文件用于下载
 * 需求: 5.4.2 - 提供文件下载功能
 * 
 * @param relativePath - 相对路径
 * @returns 文件信息和读取流，或 null
 */
export function getFileForDownload(relativePath: string): {
  stream: fs.ReadStream
  filename: string
  size: number
  mimeType: string
} | null {
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return null
  }
  
  if (!fs.existsSync(fullPath)) {
    return null
  }
  
  const stats = fs.statSync(fullPath)
  if (!stats.isFile()) {
    return null
  }
  
  const filename = path.basename(fullPath)
  const ext = getExtension(filename)
  const mimeType = getMimeType(ext)
  
  return {
    stream: fs.createReadStream(fullPath),
    filename,
    size: stats.size,
    mimeType
  }
}

/**
 * 读取文件内容
 * 
 * @param relativePath - 相对路径
 * @returns 文件内容或 null
 */
export function readFileContent(relativePath: string): Buffer | null {
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return null
  }
  
  if (!fs.existsSync(fullPath)) {
    return null
  }
  
  const stats = fs.statSync(fullPath)
  if (!stats.isFile()) {
    return null
  }
  
  try {
    return fs.readFileSync(fullPath)
  } catch (error) {
    logger.error('读取文件失败', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * 根据扩展名获取 MIME 类型
 * 
 * @param ext - 扩展名
 * @returns MIME 类型
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    // 文档
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.json': 'application/json',
    // 图片
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    // 音频
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    // 视频
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    // 代码
    '.ts': 'text/typescript',
    '.js': 'application/javascript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.vue': 'text/plain'
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

// ========== 文件删除 ==========

/**
 * 删除文件或目录
 * 需求: 5.4.2 - 提供文件删除功能
 * 
 * @param relativePath - 相对路径
 * @returns 操作结果
 */
export function deleteFile(relativePath: string): FileOperationResult {
  // 不允许删除根目录
  if (!relativePath || relativePath === '' || relativePath === '/') {
    return {
      success: false,
      error: '不能删除根目录'
    }
  }
  
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return {
      success: false,
      error: '路径无效'
    }
  }
  
  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      error: '文件或目录不存在'
    }
  }
  
  try {
    const stats = fs.statSync(fullPath)
    
    if (stats.isDirectory()) {
      // 递归删除目录
      fs.rmSync(fullPath, { recursive: true, force: true })
    } else {
      // 删除文件
      fs.unlinkSync(fullPath)
    }
    
    return { success: true }
  } catch (error) {
    logger.error('删除文件失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '删除文件失败'
    }
  }
}

// ========== 文件重命名 ==========

/**
 * 重命名文件或目录
 * 需求: 5.4.3 - 提供文件重命名功能
 * 
 * @param oldPath - 原路径（相对路径）
 * @param newPath - 新路径（相对路径）
 * @returns 操作结果
 */
export function renameFile(oldPath: string, newPath: string): FileOperationResult {
  // 验证原路径
  if (!oldPath || oldPath === '' || oldPath === '/') {
    return {
      success: false,
      error: '原路径无效'
    }
  }
  
  // 验证新路径
  if (!newPath || newPath === '' || newPath === '/') {
    return {
      success: false,
      error: '新路径无效'
    }
  }
  
  const oldFullPath = getFullPath(oldPath)
  const newFullPath = getFullPath(newPath)
  
  if (!oldFullPath) {
    return {
      success: false,
      error: '原路径无效'
    }
  }
  
  if (!newFullPath) {
    return {
      success: false,
      error: '新路径无效'
    }
  }
  
  if (!fs.existsSync(oldFullPath)) {
    return {
      success: false,
      error: '原文件或目录不存在'
    }
  }
  
  if (fs.existsSync(newFullPath)) {
    return {
      success: false,
      error: '目标路径已存在'
    }
  }
  
  try {
    // 确保目标目录存在
    const newDir = path.dirname(newFullPath)
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true })
    }
    
    // 重命名/移动
    fs.renameSync(oldFullPath, newFullPath)
    
    return { success: true }
  } catch (error) {
    logger.error('重命名文件失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '重命名文件失败'
    }
  }
}

// ========== 目录操作 ==========

/**
 * 创建目录
 * 
 * @param relativePath - 相对路径
 * @returns 操作结果
 */
export function createDirectory(relativePath: string): FileOperationResult {
  if (!relativePath || relativePath === '' || relativePath === '/') {
    return {
      success: false,
      error: '目录路径无效'
    }
  }
  
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return {
      success: false,
      error: '目录路径无效'
    }
  }
  
  if (fs.existsSync(fullPath)) {
    return {
      success: false,
      error: '目录已存在'
    }
  }
  
  try {
    fs.mkdirSync(fullPath, { recursive: true })
    return { success: true }
  } catch (error) {
    logger.error('创建目录失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '创建目录失败'
    }
  }
}

/**
 * 检查路径是否存在
 * 
 * @param relativePath - 相对路径
 * @returns 是否存在
 */
export function pathExists(relativePath: string): boolean {
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return false
  }
  return fs.existsSync(fullPath)
}

/**
 * 检查是否为目录
 * 
 * @param relativePath - 相对路径
 * @returns 是否为目录
 */
export function isDirectory(relativePath: string): boolean {
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return false
  }
  
  if (!fs.existsSync(fullPath)) {
    return false
  }
  
  return fs.statSync(fullPath).isDirectory()
}

/**
 * 检查是否为文件
 * 
 * @param relativePath - 相对路径
 * @returns 是否为文件
 */
export function isFile(relativePath: string): boolean {
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return false
  }
  
  if (!fs.existsSync(fullPath)) {
    return false
  }
  
  return fs.statSync(fullPath).isFile()
}

// ========== 导出文件根目录（用于测试） ==========

/**
 * 获取文件根目录路径
 * 
 * @returns 文件根目录路径
 */
export function getFileRoot(): string {
  return FILE_ROOT
}


// ========== 简历版本管理 ==========

/**
 * 确保简历目录存在
 */
function ensureResumeDir(): string {
  ensureFileRoot()
  const resumeDir = path.join(FILE_ROOT, RESUME_DIR)
  if (!fs.existsSync(resumeDir)) {
    fs.mkdirSync(resumeDir, { recursive: true })
  }
  return resumeDir
}

/**
 * 验证文件是否为 PDF 格式
 * 需求: 5.1.1 - 提供简历上传功能（仅支持 PDF 格式）
 * 需求: 6.1 - 同时验证文件扩展名和文件内容的 Magic Bytes
 * 需求: 6.4 - 文件内容的 Magic Bytes 与声明的文件类型不匹配时记录安全警告日志
 * 
 * @param filename - 文件名
 * @param fileBuffer - 文件内容（可选，用于验证文件头）
 * @returns 是否为有效的 PDF 文件
 */
export function isPdfFile(filename: string, fileBuffer?: Buffer): boolean {
  // 检查文件扩展名
  const ext = path.extname(filename).toLowerCase()
  if (ext !== '.pdf') {
    return false
  }
  
  // 如果提供了文件内容，检查 Magic Bytes
  if (fileBuffer) {
    const isValid = validateMagicBytes(fileBuffer, 'application/pdf')
    if (!isValid) {
      logger.warn('PDF 文件验证失败', { filename, reason: 'Magic Bytes 与 PDF 格式不匹配' })
      return false
    }
  }
  
  return true
}

/**
 * 获取下一个简历版本号
 * 
 * @returns 下一个版本号
 */
function getNextResumeVersion(): number {
  if (!isDatabaseInitialized()) {
    return 1
  }
  
  const db = getDatabase()
  const result = db.exec('SELECT MAX(version) as max_version FROM resume_versions')
  
  if (result.length > 0 && result[0] && result[0].values && result[0].values[0]) {
    const maxVersion = result[0].values[0][0]
    if (maxVersion !== null && typeof maxVersion === 'number') {
      return maxVersion + 1
    }
  }
  
  return 1
}

/**
 * 清理旧版本简历
 * 需求: 5.1.2 - 保留简历版本历史（最多 5 个版本）
 * 
 * 当版本数超过 MAX_RESUME_VERSIONS 时，删除最旧的版本
 */
function cleanupOldResumeVersions(): void {
  if (!isDatabaseInitialized()) {
    return
  }

  const db = getDatabase()

  // 获取所有版本，按版本号降序排列
  const result = db.exec(`
    SELECT id, file_path, download_count FROM resume_versions
    ORDER BY version DESC
  `)

  if (result.length === 0 || !result[0] || !result[0].values) {
    return
  }

  const versions = result[0].values

  // 如果版本数超过最大限制，删除多余的旧版本
  if (versions.length > MAX_RESUME_VERSIONS) {
    const versionsToDelete = versions.slice(MAX_RESUME_VERSIONS)

    // 计算要删除的版本的总下载次数
    let totalDownloadsToRemove = 0
    for (const version of versionsToDelete) {
      const downloadCount = version[2] as number
      totalDownloadsToRemove += downloadCount || 0
    }

    // 开始事务
    db.run('BEGIN TRANSACTION')

    try {
      for (const version of versionsToDelete) {
        const id = version[0] as number
        const filePath = version[1] as string

        // 删除文件
        const fullPath = path.join(FILE_ROOT, filePath)
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath)
          } catch (error) {
            logger.error('删除旧版本简历文件失败', {
              filePath,
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }

        // 从数据库删除记录
        db.run('DELETE FROM resume_versions WHERE id = ?', [id])
      }

      // 同步减少 statistics 表的总下载计数
      if (totalDownloadsToRemove > 0) {
        db.run(
          'UPDATE statistics SET resume_downloads = MAX(0, resume_downloads - ?), updated_at = CURRENT_TIMESTAMP WHERE id = 1',
          [totalDownloadsToRemove]
        )
        logger.info('清理旧版本简历，同步更新统计', {
          versionsDeleted: versionsToDelete.length,
          downloadsRemoved: totalDownloadsToRemove
        })
      }

      // 提交事务
      db.run('COMMIT')
    } catch (error) {
      // 回滚事务
      db.run('ROLLBACK')
      logger.error('清理旧版本简历失败', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}


/**
 * 上传简历
 * 需求: 5.1.1 - 提供简历上传功能（仅支持 PDF 格式）
 * 需求: 5.1.2 - 保留简历版本历史（最多 5 个版本）
 * 需求: 6.2 - 限制单个文件上传大小为 20MB（简历 PDF）
 * 需求: 1.1 - 简历文件使用统一的存储路径
 * 需求: 3.1 - 正确保存文件名的 UTF-8 编码
 * 需求: 9.1, 9.2, 9.3 - 文件上传验证增强
 * 
 * @param fileBuffer - 文件内容
 * @param filename - 原始文件名
 * @returns 上传结果
 */
export async function uploadResume(fileBuffer: Buffer, filename: string): Promise<ResumeUploadResult> {
  // 导入文件编码处理器和文件同步服务
  const { validateFilename, normalizeFilename } = await import('../utils/fileEncoding')
  const { fileSyncService } = await import('./fileSync')
  
  // 验证文件名编码
  const filenameValidation = validateFilename(filename)
  if (!filenameValidation.valid) {
    logger.warn('文件名验证失败', { 
      filename, 
      errors: filenameValidation.errors 
    })
    return {
      success: false,
      error: `文件名无效: ${filenameValidation.errors.join(', ')}`
    }
  }
  
  // 验证文件大小
  if (!validateFileSize(fileBuffer.length, 'resume')) {
    logger.warn('文件大小超过限制', { 
      filename, 
      size: fileBuffer.length,
      limit: FILE_SIZE_LIMITS.resume
    })
    return {
      success: false,
      error: `文件大小超过限制（最大 ${formatFileSize(FILE_SIZE_LIMITS.resume)}）`
    }
  }
  
  // 验证文件格式（扩展名 + Magic Bytes）
  if (!isPdfFile(filename, fileBuffer)) {
    logger.warn('文件格式验证失败', { 
      filename,
      reason: 'PDF 格式验证失败（扩展名或 Magic Bytes 不匹配）'
    })
    return {
      success: false,
      error: '仅支持 PDF 格式的简历文件'
    }
  }
  
  if (!isDatabaseInitialized()) {
    logger.error('数据库未初始化')
    return {
      success: false,
      error: '数据库未初始化'
    }
  }
  
  try {
    // 确保简历目录存在
    const resumeDir = ensureResumeDir()
    
    // 获取下一个版本号
    const version = getNextResumeVersion()
    
    // 生成新文件名（使用版本号）
    const ext = path.extname(filename)
    const newFilename = `resume_v${version}${ext}`
    const filePath = path.join(RESUME_DIR, newFilename)
    const fullPath = path.join(resumeDir, newFilename)
    
    // 保存文件
    fs.writeFileSync(fullPath, fileBuffer)
    logger.info('简历文件保存成功', { 
      version, 
      filename, 
      filePath: fullPath,
      size: fileBuffer.length
    })
    
    // 获取文件大小
    const stats = fs.statSync(fullPath)
    const fileSize = stats.size
    
    // 插入数据库记录
    const db = getDatabase()
    
    // 如果是第一个版本，设置为当前使用的简历
    const isFirstVersion = version === 1
    
    db.run(`
      INSERT INTO resume_versions (version, filename, file_path, file_size, is_active, download_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `, [version, filename, filePath, fileSize, isFirstVersion ? 1 : 0])
    
    logger.info('简历版本记录创建成功', { 
      version, 
      filename, 
      isActive: isFirstVersion 
    })
    
    // 如果是第一个版本，同步到公共目录
    if (isFirstVersion) {
      const syncResult = await fileSyncService.syncActiveResumeToPublic()
      if (!syncResult.success) {
        logger.error('同步简历到公共目录失败', { 
          version, 
          error: syncResult.error 
        })
        // 注意：即使同步失败，上传仍然成功，只是前端可能无法立即访问
      } else {
        logger.info('简历已同步到公共目录', { version })
      }
    }
    
    // 清理旧版本
    cleanupOldResumeVersions()
    
    return {
      success: true,
      version
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('上传简历失败', { 
      filename,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })
    return {
      success: false,
      error: '上传简历失败'
    }
  }
}

/**
 * 获取简历版本列表
 * 需求: 5.1.2 - 保留简历版本历史（最多 5 个版本）
 * 需求: 5.1.4 - 显示简历下载统计
 * 
 * @returns 简历版本列表
 */
export function getResumeVersions(): ResumeVersion[] {
  if (!isDatabaseInitialized()) {
    return []
  }
  
  try {
    const db = getDatabase()
    const result = db.exec(`
      SELECT id, version, filename, file_path, file_size, is_active, download_count, created_at
      FROM resume_versions
      ORDER BY version DESC
    `)
    
    if (result.length === 0 || !result[0] || !result[0].values) {
      return []
    }
    
    return result[0].values.map(row => ({
      id: row[0] as number,
      version: row[1] as number,
      filename: row[2] as string,
      filePath: row[3] as string,
      fileSize: row[4] as number | null,
      isActive: (row[5] as number) === 1,
      downloadCount: row[6] as number,
      createdAt: row[7] as string
    }))
  } catch (error) {
    logger.error('获取简历版本列表失败', { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

/**
 * 设置当前使用的简历
 * 需求: 5.1.3 - 提供设置当前使用简历的功能
 * 需求: 1.3 - 后台设置当前简历时更新前端可访问的位置
 * 需求: 4.1, 4.2 - 切换当前简历版本时更新前端公共目录中的简历文件
 * 需求: 4.5 - 确保文件复制操作的原子性
 * 
 * @param version - 要设置为当前的版本号
 * @returns 操作结果
 */
export async function setActiveResume(version: number): Promise<ResumeOperationResult> {
  if (!isDatabaseInitialized()) {
    logger.error('数据库未初始化')
    return {
      success: false,
      error: '数据库未初始化'
    }
  }
  
  // 导入文件同步服务
  const { fileSyncService } = await import('./fileSync')
  const { saveDatabase } = await import('../database/init')
  
  try {
    const db = getDatabase()
    
    // 检查版本是否存在
    const checkResult = db.exec(
      'SELECT id, filename FROM resume_versions WHERE version = ?',
      [version]
    )
    
    if (checkResult.length === 0 || !checkResult[0] || !checkResult[0].values || checkResult[0].values.length === 0) {
      logger.warn('尝试激活不存在的简历版本', { version })
      return {
        success: false,
        error: `版本 ${version} 不存在`
      }
    }
    
    const filename = checkResult[0].values[0][1] as string
    
    // 开始事务
    db.run('BEGIN TRANSACTION')
    
    try {
      // 1. 先将所有版本设置为非当前
      db.run('UPDATE resume_versions SET is_active = 0')
      
      // 2. 设置指定版本为当前
      db.run('UPDATE resume_versions SET is_active = 1 WHERE version = ?', [version])
      
      logger.info('数据库更新成功，准备同步文件', { version, filename })
      
      // 3. 同步文件到公共目录
      const syncResult = await fileSyncService.syncActiveResumeToPublic()
      
      if (!syncResult.success) {
        // 文件同步失败，回滚数据库操作
        logger.error('文件同步失败，回滚事务', { 
          version, 
          error: syncResult.error 
        })
        db.run('ROLLBACK')
        return {
          success: false,
          error: `文件同步失败: ${syncResult.error}`
        }
      }
      
      // 4. 提交事务
      db.run('COMMIT')
      
      // 5. 保存数据库
      saveDatabase()
      
      logger.info('设置当前简历成功', { 
        version, 
        filename,
        syncedTo: syncResult.targetPath
      })
      
      return { success: true }
    } catch (error) {
      // 回滚事务
      try {
        db.run('ROLLBACK')
        logger.info('事务已回滚', { version })
      } catch (rollbackError) {
        logger.error('回滚事务失败', { 
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) 
        })
      }
      throw error
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('设置当前简历失败', { 
      version,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })
    return {
      success: false,
      error: '设置当前简历失败'
    }
  }
}

/**
 * 获取当前使用的简历
 * 需求: 5.1.3 - 提供设置当前使用简历的功能
 * 
 * @returns 当前简历版本或 null
 */
export function getActiveResume(): ResumeVersion | null {
  if (!isDatabaseInitialized()) {
    return null
  }
  
  try {
    const db = getDatabase()
    const result = db.exec(`
      SELECT id, version, filename, file_path, file_size, is_active, download_count, created_at
      FROM resume_versions
      WHERE is_active = 1
      LIMIT 1
    `)
    
    if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
      return null
    }
    
    const row = result[0].values[0]
    if (!row) {
      return null
    }
    return {
      id: row[0] as number,
      version: row[1] as number,
      filename: row[2] as string,
      filePath: row[3] as string,
      fileSize: row[4] as number | null,
      isActive: (row[5] as number) === 1,
      downloadCount: row[6] as number,
      createdAt: row[7] as string
    }
  } catch (error) {
    logger.error('获取当前简历失败', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * 增加简历下载次数
 * 需求: 5.1.4 - 显示简历下载统计
 * 
 * @param version - 简历版本号
 * @returns 操作结果
 */
export function incrementResumeDownloadCount(version: number): ResumeOperationResult {
  if (!isDatabaseInitialized()) {
    return {
      success: false,
      error: '数据库未初始化'
    }
  }
  
  try {
    const db = getDatabase()
    
    // 检查版本是否存在
    const checkResult = db.exec(
      'SELECT id FROM resume_versions WHERE version = ?',
      [version]
    )
    
    if (checkResult.length === 0 || !checkResult[0] || !checkResult[0].values || checkResult[0].values.length === 0) {
      return {
        success: false,
        error: `版本 ${version} 不存在`
      }
    }
    
    // 增加下载次数
    db.run(
      'UPDATE resume_versions SET download_count = download_count + 1 WHERE version = ?',
      [version]
    )
    
    return { success: true }
  } catch (error) {
    logger.error('增加下载次数失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '增加下载次数失败'
    }
  }
}

/**
 * 获取简历文件用于下载
 * 需求: 5.1.1 - 提供简历上传功能（仅支持 PDF 格式）
 * 
 * @param version - 简历版本号
 * @returns 文件信息和读取流，或 null
 */
export function getResumeForDownload(version: number): {
  stream: fs.ReadStream
  filename: string
  size: number
  mimeType: string
} | null {
  if (!isDatabaseInitialized()) {
    return null
  }
  
  try {
    const db = getDatabase()
    const result = db.exec(
      'SELECT filename, file_path, file_size FROM resume_versions WHERE version = ?',
      [version]
    )
    
    if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
      return null
    }
    
    const row = result[0].values[0]
    if (!row) {
      return null
    }
    const filename = row[0] as string
    const filePath = row[1] as string
    const fileSize = row[2] as number
    
    const fullPath = path.join(FILE_ROOT, filePath)
    
    if (!fs.existsSync(fullPath)) {
      return null
    }
    
    return {
      stream: fs.createReadStream(fullPath),
      filename,
      size: fileSize,
      mimeType: 'application/pdf'
    }
  } catch (error) {
    logger.error('获取简历文件失败', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * 删除简历版本
 * 
 * @param version - 要删除的版本号
 * @returns 操作结果
 */
export function deleteResumeVersion(version: number): ResumeOperationResult {
  if (!isDatabaseInitialized()) {
    return {
      success: false,
      error: '数据库未初始化'
    }
  }
  
  try {
    const db = getDatabase()
    
    // 获取版本信息
    const result = db.exec(
      'SELECT file_path, is_active FROM resume_versions WHERE version = ?',
      [version]
    )
    
    if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
      return {
        success: false,
        error: `版本 ${version} 不存在`
      }
    }
    
    const row = result[0].values[0]
    if (!row) {
      return {
        success: false,
        error: `版本 ${version} 不存在`
      }
    }
    const filePath = row[0] as string
    const isActive = (row[1] as number) === 1
    
    // 删除文件
    const fullPath = path.join(FILE_ROOT, filePath)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
    
    // 从数据库删除记录
    db.run('DELETE FROM resume_versions WHERE version = ?', [version])
    
    // 如果删除的是当前使用的简历，将最新版本设置为当前
    if (isActive) {
      const latestResult = db.exec(`
        SELECT version FROM resume_versions 
        ORDER BY version DESC 
        LIMIT 1
      `)
      
      if (latestResult.length > 0 && latestResult[0] && latestResult[0].values && latestResult[0].values.length > 0) {
        const latestRow = latestResult[0].values[0]
        if (latestRow) {
          const latestVersion = latestRow[0] as number
          db.run('UPDATE resume_versions SET is_active = 1 WHERE version = ?', [latestVersion])
        }
      }
    }
    
    return { success: true }
  } catch (error) {
    logger.error('删除简历版本失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '删除简历版本失败'
    }
  }
}

/**
 * 获取简历总下载次数
 * 需求: 5.1.4 - 显示简历下载统计
 * 
 * @returns 总下载次数
 */
export function getTotalResumeDownloads(): number {
  if (!isDatabaseInitialized()) {
    return 0
  }
  
  try {
    const db = getDatabase()
    const result = db.exec('SELECT SUM(download_count) as total FROM resume_versions')
    
    if (result.length > 0 && result[0] && result[0].values && result[0].values[0]) {
      const total = result[0].values[0][0]
      if (total !== null && typeof total === 'number') {
        return total
      }
    }
    
    return 0
  } catch (error) {
    logger.error('获取简历总下载次数失败', { error: error instanceof Error ? error.message : String(error) })
    return 0
  }
}


// ========== 图片处理 ==========

/**
 * 图片分类枚举
 * 需求: 5.2.4 - 按分类组织图片（头像、项目截图、其他）
 */
export type ImageCategory = 'avatar' | 'screenshot' | 'other'

/**
 * 音频类型枚举
 * 需求: 5.3.2 - 按类型分类音频（背景音乐、音效）
 */
export type AudioType = 'bgm' | 'sfx'

/**
 * 图片上传结果接口
 */
export interface ImageUploadResult {
  success: boolean
  /** 图片路径 */
  path?: string
  /** 缩略图路径 */
  thumbnail?: string
  /** 错误信息 */
  error?: string
}

/**
 * 音频上传结果接口
 */
export interface AudioUploadResult {
  success: boolean
  /** 音频路径 */
  path?: string
  /** 错误信息 */
  error?: string
}

/**
 * 裁剪参数接口
 */
export interface CropOptions {
  /** 裁剪起始 X 坐标 */
  x: number
  /** 裁剪起始 Y 坐标 */
  y: number
  /** 裁剪宽度 */
  width: number
  /** 裁剪高度 */
  height: number
}

// ========== 图片处理常量 ==========

/**
 * 图片存储目录（相对于 FILE_ROOT）
 */
const IMAGE_DIR = 'images'

/**
 * 图片分类子目录
 */
const IMAGE_CATEGORY_DIRS: Record<ImageCategory, string> = {
  avatar: 'avatar',
  screenshot: 'screenshot',
  other: 'other'
}

/**
 * 缩略图目录
 */
const THUMBNAIL_DIR = 'thumbnails'

/**
 * 允许的图片扩展名
 * 需求: 5.2.1 - 提供图片上传功能（支持 JPG/PNG/WebP）
 */
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

/**
 * 图片压缩质量
 * 需求: 5.2.3 - 自动压缩上传的图片（质量 80%）
 */
const IMAGE_QUALITY = 80

/**
 * 图片最大宽度
 * 需求: 5.2.3 - 自动压缩上传的图片（最大宽度 1920px）
 */
const IMAGE_MAX_WIDTH = 1920

/**
 * 缩略图宽度
 */
const THUMBNAIL_WIDTH = 200

/**
 * 头像尺寸（1:1 比例）
 * 需求: 5.2.2 - 提供头像裁剪功能（1:1 比例）
 */
const AVATAR_SIZE = 256

// ========== 音频处理常量 ==========

/**
 * 音频存储目录（相对于 FILE_ROOT）
 */
const AUDIO_DIR = 'audio'

/**
 * 音频类型子目录
 */
const AUDIO_TYPE_DIRS: Record<AudioType, string> = {
  bgm: 'bgm',
  sfx: 'sfx'
}

/**
 * 允许的音频扩展名
 * 需求: 5.3.1 - 提供音频文件上传功能（支持 MP3/OGG）
 */
const ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg'])

// ========== 图片处理辅助函数 ==========

/**
 * 确保图片目录存在
 * 
 * @param category - 图片分类
 * @returns 目录完整路径
 */
function ensureImageDir(category: ImageCategory): string {
  ensureFileRoot()
  const categoryDir = path.join(FILE_ROOT, IMAGE_DIR, IMAGE_CATEGORY_DIRS[category])
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true })
  }
  return categoryDir
}

/**
 * 确保缩略图目录存在
 * 
 * @param category - 图片分类
 * @returns 目录完整路径
 */
function ensureThumbnailDir(category: ImageCategory): string {
  ensureFileRoot()
  const thumbnailDir = path.join(FILE_ROOT, IMAGE_DIR, IMAGE_CATEGORY_DIRS[category], THUMBNAIL_DIR)
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true })
  }
  return thumbnailDir
}

/**
 * 验证文件是否为有效的图片格式
 * 需求: 5.2.1 - 提供图片上传功能（支持 JPG/PNG/WebP）
 * 需求: 6.1 - 同时验证文件扩展名和文件内容的 Magic Bytes
 * 需求: 6.4 - 文件内容的 Magic Bytes 与声明的文件类型不匹配时记录安全警告日志
 * 
 * @param filename - 文件名
 * @param fileBuffer - 文件内容（可选，用于验证文件头）
 * @returns 是否为有效的图片文件
 */
export function isValidImageFile(filename: string, fileBuffer?: Buffer): boolean {
  // 检查文件扩展名
  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return false
  }
  
  // 如果提供了文件内容，检查 Magic Bytes
  if (fileBuffer) {
    let mimeType: string
    
    if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg'
    } else if (ext === '.png') {
      mimeType = 'image/png'
    } else if (ext === '.gif') {
      mimeType = 'image/gif'
    } else if (ext === '.webp') {
      mimeType = 'image/webp'
    } else {
      return false
    }
    
    const isValid = validateMagicBytes(fileBuffer, mimeType)
    if (!isValid) {
      logger.warn('图片文件验证失败', { filename, mimeType, reason: 'Magic Bytes 不匹配' })
      return false
    }
  }
  
  return true
}

/**
 * 生成唯一的图片文件名
 * 
 * @param originalFilename - 原始文件名
 * @returns 唯一文件名
 */
function generateUniqueImageFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `img_${timestamp}_${random}${ext}`
}

// ========== 图片上传和处理 ==========

/**
 * 上传并处理图片
 * 需求: 5.2.1 - 提供图片上传功能（支持 JPG/PNG/WebP）
 * 需求: 5.2.3 - 自动压缩上传的图片（质量 80%，最大宽度 1920px）
 * 需求: 5.2.4 - 按分类组织图片（头像、项目截图、其他）
 * 需求: 6.2 - 限制单个文件上传大小为 10MB（图片）
 * 
 * @param fileBuffer - 文件内容
 * @param filename - 原始文件名
 * @param category - 图片分类
 * @returns 上传结果
 */
export async function uploadImage(
  fileBuffer: Buffer,
  filename: string,
  category: ImageCategory = 'other'
): Promise<ImageUploadResult> {
  // 验证文件大小
  if (!validateFileSize(fileBuffer.length, 'image')) {
    return {
      success: false,
      error: `文件大小超过限制（最大 ${formatFileSize(FILE_SIZE_LIMITS.image)}）`
    }
  }
  
  // 验证文件格式
  if (!isValidImageFile(filename, fileBuffer)) {
    return {
      success: false,
      error: '不支持的图片格式，仅支持 JPG/PNG/WebP'
    }
  }
  
  try {
    // 动态导入 sharp
    const sharp = (await import('sharp')).default
    
    // 确保目录存在
    const imageDir = ensureImageDir(category)
    const thumbnailDir = ensureThumbnailDir(category)
    
    // 生成唯一文件名
    const newFilename = generateUniqueImageFilename(filename)
    const imagePath = path.join(imageDir, newFilename)
    const thumbnailPath = path.join(thumbnailDir, newFilename)
    
    // 获取图片元数据
    const metadata = await sharp(fileBuffer).metadata()
    const originalWidth = metadata.width || 0
    
    // 处理图片：调整大小和压缩
    let imageProcessor = sharp(fileBuffer)
    
    // 如果宽度超过最大宽度，进行缩放
    if (originalWidth > IMAGE_MAX_WIDTH) {
      imageProcessor = imageProcessor.resize(IMAGE_MAX_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
    }
    
    // 根据格式进行压缩
    const ext = path.extname(filename).toLowerCase()
    if (ext === '.jpg' || ext === '.jpeg') {
      imageProcessor = imageProcessor.jpeg({ quality: IMAGE_QUALITY })
    } else if (ext === '.png') {
      imageProcessor = imageProcessor.png({ quality: IMAGE_QUALITY })
    } else if (ext === '.webp') {
      imageProcessor = imageProcessor.webp({ quality: IMAGE_QUALITY })
    }
    
    // 保存处理后的图片
    await imageProcessor.toFile(imagePath)
    
    // 生成缩略图
    await sharp(fileBuffer)
      .resize(THUMBNAIL_WIDTH, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath.replace(ext, '.jpg'))
    
    // 计算相对路径
    const relativeImagePath = `${IMAGE_DIR}/${IMAGE_CATEGORY_DIRS[category]}/${newFilename}`
    const relativeThumbnailPath = `${IMAGE_DIR}/${IMAGE_CATEGORY_DIRS[category]}/${THUMBNAIL_DIR}/${newFilename.replace(ext, '.jpg')}`
    
    return {
      success: true,
      path: relativeImagePath,
      thumbnail: relativeThumbnailPath
    }
  } catch (error) {
    logger.error('上传图片失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '上传图片失败'
    }
  }
}

/**
 * 上传并裁剪头像
 * 需求: 5.2.2 - 提供头像裁剪功能（1:1 比例）
 * 需求: 5.2.4 - 按分类组织图片（头像）
 * 需求: 6.2 - 限制单个文件上传大小为 10MB（图片）
 * 
 * @param fileBuffer - 文件内容
 * @param filename - 原始文件名
 * @param cropOptions - 裁剪参数（可选）
 * @returns 上传结果
 */
export async function uploadAvatar(
  fileBuffer: Buffer,
  filename: string,
  cropOptions?: CropOptions
): Promise<ImageUploadResult> {
  // 验证文件大小
  if (!validateFileSize(fileBuffer.length, 'image')) {
    return {
      success: false,
      error: `文件大小超过限制（最大 ${formatFileSize(FILE_SIZE_LIMITS.image)}）`
    }
  }
  
  // 验证文件格式
  if (!isValidImageFile(filename, fileBuffer)) {
    return {
      success: false,
      error: '不支持的图片格式，仅支持 JPG/PNG/WebP'
    }
  }
  
  try {
    // 动态导入 sharp
    const sharp = (await import('sharp')).default
    
    // 确保目录存在
    const avatarDir = ensureImageDir('avatar')
    const thumbnailDir = ensureThumbnailDir('avatar')
    
    // 生成唯一文件名
    const newFilename = generateUniqueImageFilename(filename)
    const avatarPath = path.join(avatarDir, newFilename)
    const thumbnailPath = path.join(thumbnailDir, newFilename)
    
    // 处理图片
    let imageProcessor = sharp(fileBuffer)
    
    // 如果提供了裁剪参数，先进行裁剪
    if (cropOptions) {
      imageProcessor = imageProcessor.extract({
        left: Math.round(cropOptions.x),
        top: Math.round(cropOptions.y),
        width: Math.round(cropOptions.width),
        height: Math.round(cropOptions.height)
      })
    }
    
    // 调整为正方形（1:1 比例）并设置固定尺寸
    imageProcessor = imageProcessor.resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: 'cover',
      position: 'center'
    })
    
    // 根据格式进行压缩
    const ext = path.extname(filename).toLowerCase()
    if (ext === '.jpg' || ext === '.jpeg') {
      imageProcessor = imageProcessor.jpeg({ quality: IMAGE_QUALITY })
    } else if (ext === '.png') {
      imageProcessor = imageProcessor.png({ quality: IMAGE_QUALITY })
    } else if (ext === '.webp') {
      imageProcessor = imageProcessor.webp({ quality: IMAGE_QUALITY })
    }
    
    // 保存处理后的头像
    await imageProcessor.toFile(avatarPath)
    
    // 生成缩略图
    await sharp(fileBuffer)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_WIDTH, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath.replace(ext, '.jpg'))
    
    // 计算相对路径
    const relativeAvatarPath = `${IMAGE_DIR}/${IMAGE_CATEGORY_DIRS['avatar']}/${newFilename}`
    const relativeThumbnailPath = `${IMAGE_DIR}/${IMAGE_CATEGORY_DIRS['avatar']}/${THUMBNAIL_DIR}/${newFilename.replace(ext, '.jpg')}`
    
    return {
      success: true,
      path: relativeAvatarPath,
      thumbnail: relativeThumbnailPath
    }
  } catch (error) {
    logger.error('上传头像失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '上传头像失败'
    }
  }
}

/**
 * 获取指定分类的图片列表
 * 需求: 5.2.4 - 按分类组织图片（头像、项目截图、其他）
 * 
 * @param category - 图片分类
 * @returns 图片列表
 */
export function getImagesByCategory(category: ImageCategory): FileTreeNode[] {
  ensureFileRoot()
  
  const categoryDir = path.join(FILE_ROOT, IMAGE_DIR, IMAGE_CATEGORY_DIRS[category])
  
  if (!fs.existsSync(categoryDir)) {
    return []
  }
  
  try {
    const entries = fs.readdirSync(categoryDir, { withFileTypes: true })
    const images: FileTreeNode[] = []
    
    for (const entry of entries) {
      // 跳过缩略图目录
      if (entry.isDirectory() && entry.name === THUMBNAIL_DIR) {
        continue
      }
      
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
          const entryPath = path.join(categoryDir, entry.name)
          const stats = fs.statSync(entryPath)
          
          images.push({
            name: entry.name,
            path: `${IMAGE_DIR}/${IMAGE_CATEGORY_DIRS[category]}/${entry.name}`,
            type: 'file',
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            extension: ext
          })
        }
      }
    }
    
    // 按修改时间降序排序
    images.sort((a, b) => {
      const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0
      const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0
      return timeB - timeA
    })
    
    return images
  } catch (error) {
    logger.error('获取图片列表失败', { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

/**
 * 删除图片及其缩略图
 * 
 * @param relativePath - 图片相对路径
 * @returns 操作结果
 */
export function deleteImage(relativePath: string): FileOperationResult {
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return {
      success: false,
      error: '路径无效'
    }
  }
  
  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      error: '图片不存在'
    }
  }
  
  try {
    // 删除原图
    fs.unlinkSync(fullPath)
    
    // 尝试删除缩略图
    const dir = path.dirname(fullPath)
    const filename = path.basename(fullPath)
    const ext = path.extname(filename)
    const thumbnailFilename = filename.replace(ext, '.jpg')
    const thumbnailPath = path.join(dir, THUMBNAIL_DIR, thumbnailFilename)
    
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath)
    }
    
    return { success: true }
  } catch (error) {
    logger.error('删除图片失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '删除图片失败'
    }
  }
}

// ========== 音频处理辅助函数 ==========

/**
 * 确保音频目录存在
 * 
 * @param audioType - 音频类型
 * @returns 目录完整路径
 */
function ensureAudioDir(audioType: AudioType): string {
  ensureFileRoot()
  const typeDir = path.join(FILE_ROOT, AUDIO_DIR, AUDIO_TYPE_DIRS[audioType])
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true })
  }
  return typeDir
}

/**
 * 验证文件是否为有效的音频格式
 * 需求: 5.3.1 - 提供音频文件上传功能（支持 MP3/OGG）
 * 需求: 6.1 - 同时验证文件扩展名和文件内容的 Magic Bytes
 * 需求: 6.4 - 文件内容的 Magic Bytes 与声明的文件类型不匹配时记录安全警告日志
 * 
 * @param filename - 文件名
 * @param fileBuffer - 文件内容（可选，用于验证文件头）
 * @returns 是否为有效的音频文件
 */
export function isValidAudioFile(filename: string, fileBuffer?: Buffer): boolean {
  // 检查文件扩展名
  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
    return false
  }
  
  // 如果提供了文件内容，检查 Magic Bytes
  if (fileBuffer) {
    let mimeType: string
    
    if (ext === '.mp3') {
      mimeType = 'audio/mpeg'
    } else if (ext === '.ogg') {
      mimeType = 'audio/ogg'
    } else {
      return false
    }
    
    const isValid = validateMagicBytes(fileBuffer, mimeType)
    if (!isValid) {
      logger.warn('音频文件验证失败', { filename, mimeType, reason: 'Magic Bytes 不匹配' })
      return false
    }
  }
  
  return true
}

/**
 * 生成唯一的音频文件名
 * 
 * @param originalFilename - 原始文件名
 * @returns 唯一文件名
 */
function generateUniqueAudioFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `audio_${timestamp}_${random}${ext}`
}

// ========== 音频上传和处理 ==========

/**
 * 上传音频文件
 * 需求: 5.3.1 - 提供音频文件上传功能（支持 MP3/OGG）
 * 需求: 5.3.2 - 按类型分类音频（背景音乐、音效）
 * 需求: 6.2 - 限制单个文件上传大小为 50MB（音频）
 * 
 * @param fileBuffer - 文件内容
 * @param filename - 原始文件名
 * @param audioType - 音频类型
 * @returns 上传结果
 */
export async function uploadAudio(
  fileBuffer: Buffer,
  filename: string,
  audioType: AudioType = 'sfx'
): Promise<AudioUploadResult> {
  // 验证文件大小
  if (!validateFileSize(fileBuffer.length, 'audio')) {
    return {
      success: false,
      error: `文件大小超过限制（最大 ${formatFileSize(FILE_SIZE_LIMITS.audio)}）`
    }
  }
  
  // 验证文件格式（包含 Magic Bytes 验证）
  if (!isValidAudioFile(filename, fileBuffer)) {
    return {
      success: false,
      error: '不支持的音频格式，仅支持 MP3/OGG'
    }
  }
  
  // 验证 Magic Bytes
  const ext = path.extname(filename).toLowerCase()
  const mimeType = ext === '.mp3' ? 'audio/mpeg' : 'audio/ogg'
  if (!validateMagicBytes(fileBuffer, mimeType)) {
    logger.warn('音频文件 Magic Bytes 验证失败', { filename, mimeType })
    return {
      success: false,
      error: '文件内容与扩展名不匹配'
    }
  }
  
  try {
    // 确保目录存在
    const audioDir = ensureAudioDir(audioType)
    
    // 生成唯一文件名
    const newFilename = generateUniqueAudioFilename(filename)
    const audioPath = path.join(audioDir, newFilename)
    
    // 保存音频文件
    fs.writeFileSync(audioPath, fileBuffer)
    
    // 计算相对路径
    const relativeAudioPath = `${AUDIO_DIR}/${AUDIO_TYPE_DIRS[audioType]}/${newFilename}`
    
    // 同步到公共目录
    const { fileSyncService } = await import('./fileSync')
    const syncResult = await fileSyncService.syncAudioToPublic(relativeAudioPath)
    
    if (!syncResult.success) {
      logger.warn('音频文件同步到公共目录失败', { 
        path: relativeAudioPath, 
        error: syncResult.error 
      })
      // 同步失败不影响上传成功
    }
    
    return {
      success: true,
      path: relativeAudioPath
    }
  } catch (error) {
    logger.error('上传音频失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '上传音频失败'
    }
  }
}

/**
 * 获取指定类型的音频列表
 * 需求: 5.3.2 - 按类型分类音频（背景音乐、音效）
 * 
 * @param audioType - 音频类型
 * @returns 音频列表
 */
export function getAudioByType(audioType: AudioType): FileTreeNode[] {
  ensureFileRoot()
  
  const typeDir = path.join(FILE_ROOT, AUDIO_DIR, AUDIO_TYPE_DIRS[audioType])
  
  if (!fs.existsSync(typeDir)) {
    return []
  }
  
  try {
    const entries = fs.readdirSync(typeDir, { withFileTypes: true })
    const audioFiles: FileTreeNode[] = []
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
          const entryPath = path.join(typeDir, entry.name)
          const stats = fs.statSync(entryPath)
          
          audioFiles.push({
            name: entry.name,
            path: `${AUDIO_DIR}/${AUDIO_TYPE_DIRS[audioType]}/${entry.name}`,
            type: 'file',
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
            extension: ext
          })
        }
      }
    }
    
    // 按修改时间降序排序
    audioFiles.sort((a, b) => {
      const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0
      const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0
      return timeB - timeA
    })
    
    return audioFiles
  } catch (error) {
    logger.error('获取音频列表失败', { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

/**
 * 删除音频文件
 * 
 * @param relativePath - 音频相对路径
 * @returns 操作结果
 */
export function deleteAudio(relativePath: string): FileOperationResult {
  const fullPath = getFullPath(relativePath)
  if (!fullPath) {
    return {
      success: false,
      error: '路径无效'
    }
  }
  
  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      error: '音频不存在'
    }
  }
  
  try {
    fs.unlinkSync(fullPath)
    return { success: true }
  } catch (error) {
    logger.error('删除音频失败', { error: error instanceof Error ? error.message : String(error) })
    return {
      success: false,
      error: '删除音频失败'
    }
  }
}

/**
 * 获取所有图片分类
 * 
 * @returns 图片分类列表
 */
export function getImageCategories(): { value: ImageCategory; label: string }[] {
  return [
    { value: 'avatar', label: '头像' },
    { value: 'screenshot', label: '项目截图' },
    { value: 'other', label: '其他' }
  ]
}

/**
 * 获取所有音频类型
 * 
 * @returns 音频类型列表
 */
export function getAudioTypes(): { value: AudioType; label: string }[] {
  return [
    { value: 'bgm', label: '背景音乐' },
    { value: 'sfx', label: '音效' }
  ]
}

// ========== 统一文件上传验证 ==========

/**
 * 文件验证结果接口
 */
export interface FileValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误信息列表 */
  errors: string[]
  /** 警告信息列表 */
  warnings?: string[]
}

/**
 * 统一的文件上传验证函数
 * 需求: 9.1 - 同时验证文件扩展名和 Magic Bytes
 * 需求: 9.2 - 文件扩展名与内容不匹配时拒绝上传
 * 需求: 9.3 - 限制文件大小
 * 需求: 9.4 - 拒绝零字节文件
 * 需求: 9.5 - 扫描文件名中的特殊字符和路径遍历尝试
 * 
 * @param fileBuffer 文件内容
 * @param filename 文件名
 * @param expectedType 期望的文件类型（'resume' | 'image' | 'audio'）
 * @returns 验证结果
 */
export async function validateUploadedFile(
  fileBuffer: Buffer,
  filename: string,
  expectedType: 'resume' | 'image' | 'audio'
): Promise<FileValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 导入文件编码处理器
  const { validateFilename } = await import('../utils/fileEncoding')
  
  // 1. 验证文件名安全性
  // 需求: 9.5 - 扫描文件名中的特殊字符和路径遍历尝试
  const filenameValidation = validateFilename(filename)
  if (!filenameValidation.valid) {
    errors.push(...filenameValidation.errors)
  }
  
  // 2. 验证文件大小
  // 需求: 9.3 - 限制文件大小
  // 需求: 9.4 - 拒绝零字节文件
  if (fileBuffer.length === 0) {
    errors.push('文件大小为零，无法上传')
  } else if (!validateFileSize(fileBuffer.length, expectedType)) {
    const limit = FILE_SIZE_LIMITS[expectedType]
    errors.push(`文件大小超过限制（最大 ${formatFileSize(limit)}）`)
  }
  
  // 3. 验证文件扩展名
  const ext = path.extname(filename).toLowerCase()
  let allowedExtensions: string[] = []
  let mimeType: string | null = null
  
  switch (expectedType) {
    case 'resume':
      allowedExtensions = ['.pdf']
      if (ext === '.pdf') {
        mimeType = 'application/pdf'
      }
      break
    case 'image':
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
      if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg'
      } else if (ext === '.png') {
        mimeType = 'image/png'
      } else if (ext === '.webp') {
        mimeType = 'image/webp'
      } else if (ext === '.gif') {
        mimeType = 'image/gif'
      }
      break
    case 'audio':
      allowedExtensions = ['.mp3', '.ogg', '.wav']
      if (ext === '.mp3') {
        mimeType = 'audio/mpeg'
      } else if (ext === '.ogg') {
        mimeType = 'audio/ogg'
      } else if (ext === '.wav') {
        mimeType = 'audio/wav'
      }
      break
  }
  
  if (!allowedExtensions.includes(ext)) {
    errors.push(`不支持的文件扩展名：${ext}，允许的扩展名：${allowedExtensions.join(', ')}`)
  }
  
  // 4. 验证 Magic Bytes（文件内容）
  // 需求: 9.1 - 同时验证文件扩展名和 Magic Bytes
  // 需求: 9.2 - 文件扩展名与内容不匹配时拒绝上传
  if (mimeType && fileBuffer.length > 0) {
    const magicBytesValid = validateMagicBytes(fileBuffer, mimeType)
    if (!magicBytesValid) {
      errors.push(`文件内容与扩展名不匹配（期望 ${mimeType}）`)
      // 记录安全警告日志
      logger.warn('检测到文件类型不匹配，可能的安全威胁', {
        filename,
        extension: ext,
        expectedMimeType: mimeType,
        fileSize: fileBuffer.length
      })
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * 获取文件的 MIME 类型（基于扩展名）
 * 
 * @param filename 文件名
 * @returns MIME 类型或 null
 */
export function getMimeTypeFromExtension(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase()
  
  const mimeTypes: Record<string, string> = {
    // 文档
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // 图片
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    // 音频
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4'
  }
  
  return mimeTypes[ext] || null
}

/**
 * 检查扩展名是否允许用于特定文件类型
 * 
 * @param extension 文件扩展名（包含点号）
 * @param fileType 文件类型
 * @returns 是否允许
 */
export function isExtensionAllowedForType(
  extension: string,
  fileType: 'resume' | 'image' | 'audio'
): boolean {
  const ext = extension.toLowerCase()
  
  switch (fileType) {
    case 'resume':
      return ext === '.pdf'
    case 'image':
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
    case 'audio':
      return ['.mp3', '.ogg', '.wav'].includes(ext)
    default:
      return false
  }
}
