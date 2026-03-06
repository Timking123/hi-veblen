/**
 * 文件操作工具函数
 */

import { promises as fs } from 'fs'
import * as path from 'path'

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 确保目录存在，如果不存在则创建
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    // 忽略已存在的错误
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }
  }
}

/**
 * 递归扫描目录，返回所有匹配的文件
 */
export async function scanFiles(
  dir: string,
  extensions: string[],
  excludePatterns: string[] = []
): Promise<string[]> {
  const files: string[] = []
  
  async function scan(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      const relativePath = path.relative(dir, fullPath)
      
      // 检查是否应该排除
      const shouldExclude = excludePatterns.some(pattern => {
        return relativePath.includes(pattern) || entry.name === pattern
      })
      
      if (shouldExclude) {
        continue
      }
      
      if (entry.isDirectory()) {
        await scan(fullPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (extensions.includes(ext)) {
          files.push(fullPath)
        }
      }
    }
  }
  
  await scan(dir)
  return files
}

/**
 * 创建文件备份
 */
export async function createBackup(filePath: string): Promise<string> {
  const backupPath = `${filePath}.backup.${Date.now()}`
  await fs.copyFile(filePath, backupPath)
  return backupPath
}

/**
 * 安全地写入文件（使用临时文件）
 */
export async function safeWriteFile(
  filePath: string,
  content: string
): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`
  
  try {
    // 写入临时文件
    await fs.writeFile(tempPath, content, 'utf-8')
    
    // 重命名为目标文件
    await fs.rename(tempPath, filePath)
  } catch (error) {
    // 清理临时文件
    try {
      await fs.unlink(tempPath)
    } catch {
      // 忽略清理错误
    }
    throw error
  }
}

/**
 * 读取文件内容
 */
export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8')
}

/**
 * 获取文件的相对路径
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(path.dirname(from), to)
}

/**
 * 解析相对路径为绝对路径
 */
export function resolveRelativePath(from: string, relativePath: string): string {
  return path.resolve(path.dirname(from), relativePath)
}
