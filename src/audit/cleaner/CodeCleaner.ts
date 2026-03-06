/**
 * 代码清理器
 * 负责扫描和清理调试代码（console.debug）
 */

import * as fs from 'fs-extra'
import * as path from 'path'
import { glob } from 'glob'
import type {
  DebugCodeLocation,
  CleanOptions,
  CleanResult
} from './types'

/**
 * 代码清理器类
 */
export class CodeCleaner {
  private readonly rootDir: string
  private readonly filePatterns: string[]

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir
    this.filePatterns = ['**/*.ts', '**/*.js', '**/*.vue']
  }

  /**
   * 扫描调试代码
   * @param files 要扫描的文件列表（可选，默认扫描所有匹配文件）
   * @returns 调试代码位置列表
   */
  async scanDebugCode(files?: string[]): Promise<DebugCodeLocation[]> {
    const filesToScan = files || await this.getFiles()
    const locations: DebugCodeLocation[] = []

    for (const file of filesToScan) {
      const fileLocations = await this.scanFileForDebugCode(file)
      locations.push(...fileLocations)
    }

    return locations
  }

  /**
   * 扫描单个文件中的调试代码
   * @param file 文件路径
   * @returns 调试代码位置列表
   */
  private async scanFileForDebugCode(file: string): Promise<DebugCodeLocation[]> {
    const locations: DebugCodeLocation[] = []
    
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // 匹配 console.debug 调用
        const regex = /console\.debug\s*\(/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(line)) !== null) {
          locations.push({
            file,
            line: i + 1,
            column: match.index,
            code: line.trim()
          })
        }
      }
    } catch (error) {
      // 忽略无法读取的文件
      console.warn(`无法读取文件 ${file}:`, error)
    }

    return locations
  }

  /**
   * 清理调试代码
   * @param options 清理选项
   * @returns 清理结果
   */
  async cleanDebugCode(options: CleanOptions): Promise<CleanResult> {
    const locations = await this.scanDebugCode()

    if (options.dryRun) {
      return {
        success: true,
        removedCount: locations.length,
        locations
      }
    }

    let removedCount = 0
    const removedLocations: DebugCodeLocation[] = []

    // 按文件分组
    const locationsByFile = this.groupLocationsByFile(locations)

    for (const [file, fileLocations] of locationsByFile.entries()) {
      try {
        // 创建备份
        if (options.backup) {
          await this.createBackup(file)
        }

        // 根据模式处理
        if (options.mode === 'batch') {
          // 批量模式：删除所有 console.debug
          const removed = await this.removeDebugLines(file, fileLocations)
          removedCount += removed.length
          removedLocations.push(...removed)
        } else {
          // 交互式模式：逐个询问
          for (const location of fileLocations) {
            const shouldRemove = await this.promptUser(location)
            if (shouldRemove) {
              await this.removeDebugLine(location)
              removedCount++
              removedLocations.push(location)
            }
          }
        }
      } catch (error) {
        console.error(`清理文件 ${file} 时出错:`, error)
      }
    }

    return {
      success: true,
      removedCount,
      locations: removedLocations
    }
  }

  /**
   * 删除文件中的多个调试代码行
   * @param file 文件路径
   * @param locations 要删除的位置列表
   * @returns 实际删除的位置列表
   */
  private async removeDebugLines(
    file: string,
    locations: DebugCodeLocation[]
  ): Promise<DebugCodeLocation[]> {
    const content = await fs.readFile(file, 'utf-8')
    const lines = content.split('\n')
    const removed: DebugCodeLocation[] = []

    // 按行号降序排序，从后往前删除，避免行号变化
    const sortedLocations = [...locations].sort((a, b) => b.line - a.line)

    for (const location of sortedLocations) {
      const lineIndex = location.line - 1
      if (lineIndex >= 0 && lineIndex < lines.length) {
        // 检查该行是否包含 console.debug
        if (lines[lineIndex].includes('console.debug')) {
          lines.splice(lineIndex, 1)
          removed.push(location)
        }
      }
    }

    // 写回文件
    await fs.writeFile(file, lines.join('\n'), 'utf-8')

    return removed
  }

  /**
   * 删除单个调试代码行
   * @param location 调试代码位置
   */
  private async removeDebugLine(location: DebugCodeLocation): Promise<void> {
    const content = await fs.readFile(location.file, 'utf-8')
    const lines = content.split('\n')

    const lineIndex = location.line - 1
    if (lineIndex >= 0 && lineIndex < lines.length) {
      // 检查该行是否包含 console.debug
      if (lines[lineIndex].includes('console.debug')) {
        lines.splice(lineIndex, 1)
        await fs.writeFile(location.file, lines.join('\n'), 'utf-8')
      }
    }
  }

  /**
   * 按文件分组位置
   * @param locations 位置列表
   * @returns 按文件分组的位置映射
   */
  private groupLocationsByFile(
    locations: DebugCodeLocation[]
  ): Map<string, DebugCodeLocation[]> {
    const grouped = new Map<string, DebugCodeLocation[]>()

    for (const location of locations) {
      const existing = grouped.get(location.file) || []
      existing.push(location)
      grouped.set(location.file, existing)
    }

    return grouped
  }

  /**
   * 创建文件备份
   * @param file 文件路径
   */
  private async createBackup(file: string): Promise<void> {
    const backupPath = `${file}.backup.${Date.now()}`
    await fs.copy(file, backupPath)
  }

  /**
   * 提示用户是否删除调试代码（交互式模式）
   * @param location 调试代码位置
   * @returns 是否删除
   */
  private async promptUser(location: DebugCodeLocation): Promise<boolean> {
    // 在实际实现中，这里应该使用 readline 或其他交互式输入库
    // 为了简化，这里默认返回 true
    console.log(`发现调试代码: ${location.file}:${location.line}`)
    console.log(`  ${location.code}`)
    // TODO: 实现真正的用户交互
    return true
  }

  /**
   * 获取要扫描的文件列表
   * @returns 文件路径列表
   */
  private async getFiles(): Promise<string[]> {
    const files: string[] = []

    for (const pattern of this.filePatterns) {
      const matches = await glob(pattern, {
        cwd: this.rootDir,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          '**/coverage/**',
          '**/*.test.ts',
          '**/*.spec.ts'
        ],
        absolute: true
      })
      files.push(...matches)
    }

    return files
  }
}
