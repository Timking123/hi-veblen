/**
 * 路径解析器
 * 负责处理文档移动和路径引用更新
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import { fileExists, ensureDir, readFile, safeWriteFile } from '../utils/fileUtils'
import { FileMove, LinkUpdate } from './types'

/**
 * 路径解析器类
 */
export class PathResolver {
  private readonly projectRoot: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * 移动文件到新位置
   * @param from 源路径
   * @param to 目标路径
   * @param checkConflict 是否检查冲突
   * @returns 是否成功移动
   */
  async moveFile(from: string, to: string, checkConflict: boolean = true): Promise<boolean> {
    // 检查源文件是否存在
    if (!(await fileExists(from))) {
      throw new Error(`源文件不存在: ${from}`)
    }

    // 检查目标文件是否已存在（冲突检测）
    if (checkConflict && (await fileExists(to))) {
      throw new Error(`目标文件已存在: ${to}`)
    }

    // 确保目标目录存在
    const targetDir = path.dirname(to)
    await ensureDir(targetDir)

    // 移动文件
    await fs.rename(from, to)

    return true
  }

  /**
   * 更新文档中的相对路径引用
   * @param docPath 文档路径
   * @param moves 文件移动映射（旧路径 -> 新路径）
   * @returns 更新的链接列表
   */
  async updateLinks(docPath: string, moves: Map<string, string>): Promise<LinkUpdate[]> {
    const content = await readFile(docPath)
    const updates: LinkUpdate[] = []
    
    // 匹配 Markdown 链接：[text](path)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const replacements: Array<{ oldText: string; newText: string }> = []
    let match: RegExpExecArray | null

    // 重置正则表达式的 lastIndex
    linkRegex.lastIndex = 0

    while ((match = linkRegex.exec(content)) !== null) {
      const [fullMatch, text, linkPath] = match

      // 跳过外部链接（http/https）
      if (linkPath.startsWith('http://') || linkPath.startsWith('https://')) {
        continue
      }

      // 跳过锚点链接
      if (linkPath.startsWith('#')) {
        continue
      }

      // 解析相对路径为绝对路径
      const absolutePath = this.resolveRelativePath(docPath, linkPath)

      // 检查是否有新路径
      if (moves.has(absolutePath)) {
        const newAbsolutePath = moves.get(absolutePath)!
        const newRelativePath = this.calculateRelativePath(docPath, newAbsolutePath)
        
        // 记录替换
        const newLink = `[${text}](${newRelativePath})`
        replacements.push({ oldText: fullMatch, newText: newLink })

        updates.push({
          file: docPath,
          oldLink: linkPath,
          newLink: newRelativePath
        })
      }
    }

    // 执行所有替换（从后往前替换，避免位置偏移）
    let newContent = content
    for (const { oldText, newText } of replacements) {
      // 使用字符串替换而不是正则替换，避免特殊字符问题
      newContent = newContent.replace(oldText, newText)
    }

    // 如果有更新，写入文件
    if (updates.length > 0) {
      await safeWriteFile(docPath, newContent)
    }

    return updates
  }

  /**
   * 解析相对路径为绝对路径
   * @param fromPath 当前文档路径
   * @param relativePath 相对路径
   * @returns 绝对路径
   */
  resolveRelativePath(fromPath: string, relativePath: string): string {
    const fromDir = path.dirname(fromPath)
    return path.resolve(fromDir, relativePath)
  }

  /**
   * 计算从一个文件到另一个文件的相对路径
   * @param fromPath 起始文件路径
   * @param toPath 目标文件路径
   * @returns 相对路径
   */
  calculateRelativePath(fromPath: string, toPath: string): string {
    const fromDir = path.dirname(fromPath)
    let relativePath = path.relative(fromDir, toPath)
    
    // 在 Windows 上，将反斜杠转换为正斜杠（Markdown 标准）
    relativePath = relativePath.replace(/\\/g, '/')
    
    return relativePath
  }

  /**
   * 批量移动文件
   * @param moves 文件移动列表
   * @param checkConflict 是否检查冲突
   * @returns 成功移动的文件列表
   */
  async moveFiles(moves: FileMove[], checkConflict: boolean = true): Promise<FileMove[]> {
    const successful: FileMove[] = []

    for (const move of moves) {
      try {
        await this.moveFile(move.from, move.to, checkConflict)
        successful.push(move)
      } catch (error) {
        // 记录错误但继续处理其他文件
        console.error(`移动文件失败: ${move.from} -> ${move.to}`, error)
      }
    }

    return successful
  }

  /**
   * 批量更新文档链接
   * @param docPaths 文档路径列表
   * @param moves 文件移动映射
   * @returns 所有更新的链接
   */
  async updateAllLinks(docPaths: string[], moves: Map<string, string>): Promise<LinkUpdate[]> {
    const allUpdates: LinkUpdate[] = []

    for (const docPath of docPaths) {
      try {
        const updates = await this.updateLinks(docPath, moves)
        allUpdates.push(...updates)
      } catch (error) {
        console.error(`更新链接失败: ${docPath}`, error)
      }
    }

    return allUpdates
  }
}
