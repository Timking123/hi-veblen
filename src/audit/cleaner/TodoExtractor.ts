/**
 * 待办标记提取器
 * 负责扫描和管理代码中的 TODO 和 FIXME 标记
 */

import * as fs from 'fs-extra'
import { glob } from 'glob'
import type { TodoItem, TodoType, TodoPriority } from './types'

/**
 * 待办标记提取器类
 */
export class TodoExtractor {
  private readonly rootDir: string
  private readonly filePatterns: string[]

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir
    this.filePatterns = ['**/*.ts', '**/*.js', '**/*.vue']
  }

  /**
   * 扫描待办标记
   * @param files 要扫描的文件列表（可选）
   * @returns 待办事项列表
   */
  async scanTodos(files?: string[]): Promise<TodoItem[]> {
    const filesToScan = files || await this.getFiles()
    const todos: TodoItem[] = []

    for (const file of filesToScan) {
      const fileTodos = await this.scanFileForTodos(file)
      todos.push(...fileTodos)
    }

    return todos
  }

  /**
   * 扫描单个文件中的待办标记
   * @param file 文件路径
   * @returns 待办事项列表
   */
  private async scanFileForTodos(file: string): Promise<TodoItem[]> {
    const todos: TodoItem[] = []

    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // 匹配 TODO 或 FIXME 标记
        const todoMatch = /\/\/\s*(TODO|FIXME)\s*:?\s*(.+)/i.exec(line)
        const blockCommentMatch = /\/\*\s*(TODO|FIXME)\s*:?\s*(.+)\*\//i.exec(line)
        
        const match = todoMatch || blockCommentMatch

        if (match) {
          const type = match[1].toUpperCase() as TodoType
          const content = match[2].trim()
          const priority = this.determinePriority(type, content)
          const context = this.extractContext(lines, i)

          todos.push({
            file,
            line: i + 1,
            type,
            priority,
            content,
            context
          })
        }
      }
    } catch (error) {
      console.warn(`无法读取文件 ${file}:`, error)
    }

    return todos
  }

  /**
   * 确定待办事项的优先级
   * @param type 标记类型
   * @param content 待办内容
   * @returns 优先级
   */
  private determinePriority(type: TodoType, content: string): TodoPriority {
    const lowerContent = content.toLowerCase()

    // FIXME 通常表示需要修复的问题，优先级较高
    if (type === 'FIXME') {
      return 'high'
    }

    // 检查内容中的关键词
    if (
      lowerContent.includes('urgent') ||
      lowerContent.includes('critical') ||
      lowerContent.includes('important') ||
      lowerContent.includes('紧急') ||
      lowerContent.includes('重要')
    ) {
      return 'high'
    }

    if (
      lowerContent.includes('later') ||
      lowerContent.includes('maybe') ||
      lowerContent.includes('稍后') ||
      lowerContent.includes('可能')
    ) {
      return 'low'
    }

    return 'medium'
  }

  /**
   * 提取待办标记的上下文代码
   * @param lines 所有行
   * @param lineIndex 当前行索引
   * @returns 上下文代码
   */
  private extractContext(lines: string[], lineIndex: number): string {
    const contextLines: string[] = []
    
    // 获取前后各 2 行作为上下文
    const start = Math.max(0, lineIndex - 2)
    const end = Math.min(lines.length, lineIndex + 3)

    for (let i = start; i < end; i++) {
      contextLines.push(lines[i])
    }

    return contextLines.join('\n')
  }

  /**
   * 生成待办事项清单
   * @param todos 待办事项列表
   * @param format 输出格式
   * @returns 清单内容
   */
  generateTodoList(todos: TodoItem[], format: 'markdown' | 'json' = 'markdown'): string {
    if (format === 'json') {
      return JSON.stringify(todos, null, 2)
    }

    return this.generateMarkdownList(todos)
  }

  /**
   * 生成 Markdown 格式的待办清单
   * @param todos 待办事项列表
   * @returns Markdown 内容
   */
  private generateMarkdownList(todos: TodoItem[]): string {
    const lines: string[] = []

    lines.push('# 待办事项清单')
    lines.push('')
    lines.push(`生成时间: ${new Date().toISOString()}`)
    lines.push(`总计: ${todos.length} 个待办事项`)
    lines.push('')

    // 按文件分组
    const todosByFile = this.groupTodosByFile(todos)

    // 按优先级统计
    const stats = this.calculateStats(todos)
    lines.push('## 统计')
    lines.push('')
    lines.push(`- 高优先级: ${stats.high}`)
    lines.push(`- 中优先级: ${stats.medium}`)
    lines.push(`- 低优先级: ${stats.low}`)
    lines.push('')

    // 按优先级分组
    lines.push('## 按优先级分组')
    lines.push('')

    for (const priority of ['high', 'medium', 'low'] as TodoPriority[]) {
      const priorityTodos = todos.filter(t => t.priority === priority)
      if (priorityTodos.length === 0) continue

      const priorityLabel = {
        high: '高优先级',
        medium: '中优先级',
        low: '低优先级'
      }[priority]

      lines.push(`### ${priorityLabel}`)
      lines.push('')

      for (const todo of priorityTodos) {
        lines.push(`- **[${todo.type}]** ${todo.content}`)
        lines.push(`  - 文件: \`${todo.file}:${todo.line}\``)
        lines.push('')
      }
    }

    // 按文件分组
    lines.push('## 按文件分组')
    lines.push('')

    for (const [file, fileTodos] of todosByFile.entries()) {
      lines.push(`### ${file}`)
      lines.push('')

      for (const todo of fileTodos) {
        const priorityEmoji = {
          high: '🔴',
          medium: '🟡',
          low: '🟢'
        }[todo.priority]

        lines.push(`- ${priorityEmoji} **[${todo.type}]** (行 ${todo.line}): ${todo.content}`)
      }

      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 按文件分组待办事项
   * @param todos 待办事项列表
   * @returns 按文件分组的映射
   */
  private groupTodosByFile(todos: TodoItem[]): Map<string, TodoItem[]> {
    const grouped = new Map<string, TodoItem[]>()

    for (const todo of todos) {
      const existing = grouped.get(todo.file) || []
      existing.push(todo)
      grouped.set(todo.file, existing)
    }

    return grouped
  }

  /**
   * 计算待办事项统计
   * @param todos 待办事项列表
   * @returns 统计数据
   */
  private calculateStats(todos: TodoItem[]): Record<TodoPriority, number> {
    return {
      high: todos.filter(t => t.priority === 'high').length,
      medium: todos.filter(t => t.priority === 'medium').length,
      low: todos.filter(t => t.priority === 'low').length
    }
  }

  /**
   * 删除已完成的待办事项
   * @param todo 待办事项
   */
  async removeTodo(todo: TodoItem): Promise<void> {
    const content = await fs.readFile(todo.file, 'utf-8')
    const lines = content.split('\n')

    const lineIndex = todo.line - 1
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex]
      
      // 检查该行是否包含待办标记
      if (line.includes(todo.type) && line.includes(todo.content)) {
        lines.splice(lineIndex, 1)
        await fs.writeFile(todo.file, lines.join('\n'), 'utf-8')
      }
    }
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
          '**/coverage/**'
        ],
        absolute: true
      })
      files.push(...matches)
    }

    return files
  }
}
