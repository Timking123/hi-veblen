/**
 * 审计工具核心
 * 负责协调各个检查器的执行，聚合结果，生成报告
 */

import { glob } from 'glob'
import { CommentChecker } from './comments/CommentChecker'
import { CodeCleaner } from './cleaner/CodeCleaner'
import { TodoExtractor } from './cleaner/TodoExtractor'
import { Reporter } from './reporter/Reporter'
import type {
  AuditConfig,
  AuditResult,
  CheckResult,
  Issue,
  AuditSummary
} from './types'

/**
 * 审计工具选项
 */
export interface AuditToolOptions {
  /** 项目根目录 */
  rootDir?: string
  /** 审计配置 */
  config?: Partial<AuditConfig>
  /** 是否为增量检查模式 */
  incremental?: boolean
  /** 增量检查的文件列表 */
  changedFiles?: string[]
}

/**
 * 审计工具类
 */
export class AuditTool {
  private readonly rootDir: string
  private readonly config: AuditConfig
  private readonly reporter: Reporter
  private readonly incremental: boolean
  private readonly changedFiles?: string[]

  constructor(options: AuditToolOptions = {}) {
    this.rootDir = options.rootDir || process.cwd()
    this.config = this.mergeConfig(options.config)
    this.reporter = new Reporter()
    this.incremental = options.incremental || false
    this.changedFiles = options.changedFiles
  }

  /**
   * 合并配置
   * @param userConfig 用户配置
   * @returns 完整配置
   */
  private mergeConfig(userConfig?: Partial<AuditConfig>): AuditConfig {
    const defaultConfig: AuditConfig = {
      checks: {
        eslint: true,
        comments: true,
        debug: true,
        todos: true
      },
      thresholds: {
        commentCoverage: 0.6,
        commentQuality: 60
      },
      output: {
        format: 'json',
        path: './audit-report'
      },
      ci: false,
      fix: false
    }

    return {
      ...defaultConfig,
      ...userConfig,
      checks: {
        ...defaultConfig.checks,
        ...userConfig?.checks
      },
      thresholds: {
        ...defaultConfig.thresholds,
        ...userConfig?.thresholds
      },
      output: {
        ...defaultConfig.output,
        ...userConfig?.output
      }
    }
  }

  /**
   * 运行审计
   * @returns 审计结果
   */
  async run(): Promise<AuditResult> {
    const startTime = Date.now()
    const checks: CheckResult[] = []

    // 获取要检查的文件列表
    const files = await this.getFilesToCheck()

    // 执行各项检查
    if (this.config.checks.comments) {
      const commentCheck = await this.runCommentCheck(files)
      checks.push(commentCheck)
    }

    if (this.config.checks.debug) {
      const debugCheck = await this.runDebugCheck(files)
      checks.push(debugCheck)
    }

    if (this.config.checks.todos) {
      const todoCheck = await this.runTodoCheck(files)
      checks.push(todoCheck)
    }

    // 聚合结果
    const summary = this.aggregateSummary(checks, files.length)

    // 验证质量门槛
    const success = this.validateThresholds(checks, summary)

    const result: AuditResult = {
      success,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary
    }

    // 生成报告
    await this.generateReports(result)

    // CI 模式输出
    if (this.config.ci) {
      this.reporter.logCI(result)
    }

    const duration = Date.now() - startTime
    console.log(`\n审计完成，耗时 ${duration}ms`)

    return result
  }

  /**
   * 获取要检查的文件列表
   * @returns 文件路径列表
   */
  private async getFilesToCheck(): Promise<string[]> {
    // 增量模式：只检查变更的文件
    if (this.incremental && this.changedFiles && this.changedFiles.length > 0) {
      return this.changedFiles.filter(file => 
        file.match(/\.(ts|js|vue)$/) && 
        !file.includes('node_modules') &&
        !file.includes('dist')
      )
    }

    // 全量模式：扫描所有文件
    const patterns = ['**/*.ts', '**/*.js', '**/*.vue']
    const files: string[] = []

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.rootDir,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          '**/coverage/**',
          '**/*.test.ts',
          '**/*.spec.ts',
          '**/*.test.js',
          '**/*.spec.js'
        ],
        absolute: true
      })
      files.push(...matches)
    }

    return files
  }

  /**
   * 运行注释检查
   * @param files 文件列表
   * @returns 检查结果
   */
  private async runCommentCheck(files: string[]): Promise<CheckResult> {
    console.log('正在执行注释检查...')

    try {
      const checker = new CommentChecker(this.config.thresholds.commentQuality)
      const result = await checker.check(files)

      const issues: Issue[] = []

      // 将缺少注释的代码转换为问题
      for (const fileInfo of result.files) {
        for (const missing of fileInfo.missingComments) {
          issues.push({
            file: fileInfo.path,
            line: missing.line,
            severity: missing.isPublicAPI ? 'error' : 'warning',
            message: `${this.translateCommentType(missing.type)} "${missing.name}" 缺少中文注释`,
            rule: 'missing-chinese-comment'
          })
        }
      }

      const passed = result.overall.averageQuality >= this.config.thresholds.commentQuality &&
                     result.overall.averageCoverage >= this.config.thresholds.commentCoverage

      return {
        name: 'comments',
        passed,
        issues,
        metrics: {
          filesChecked: result.files.length,
          averageCoverage: Math.round(result.overall.averageCoverage * 100),
          averageQuality: Math.round(result.overall.averageQuality),
          lowQualityFiles: result.lowQualityFiles.length
        }
      }
    } catch (error) {
      console.error('注释检查失败:', error)
      return {
        name: 'comments',
        passed: false,
        issues: [{
          file: 'unknown',
          line: 0,
          severity: 'error',
          message: `注释检查失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      }
    }
  }

  /**
   * 运行调试代码检查
   * @param files 文件列表
   * @returns 检查结果
   */
  private async runDebugCheck(files: string[]): Promise<CheckResult> {
    console.log('正在检查调试代码...')

    try {
      const cleaner = new CodeCleaner(this.rootDir)
      const locations = await cleaner.scanDebugCode(files)

      const issues: Issue[] = locations.map(loc => ({
        file: loc.file,
        line: loc.line,
        column: loc.column,
        severity: 'warning',
        message: '发现调试代码 console.debug',
        rule: 'no-debug-code'
      }))

      // 如果启用自动修复
      if (this.config.fix && locations.length > 0) {
        console.log(`正在清理 ${locations.length} 个调试代码...`)
        await cleaner.cleanDebugCode({
          mode: 'batch',
          dryRun: false,
          backup: true
        })
      }

      return {
        name: 'debug',
        passed: locations.length === 0,
        issues,
        metrics: {
          debugCodeCount: locations.length
        }
      }
    } catch (error) {
      console.error('调试代码检查失败:', error)
      return {
        name: 'debug',
        passed: false,
        issues: [{
          file: 'unknown',
          line: 0,
          severity: 'error',
          message: `调试代码检查失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      }
    }
  }

  /**
   * 运行待办标记检查
   * @param files 文件列表
   * @returns 检查结果
   */
  private async runTodoCheck(files: string[]): Promise<CheckResult> {
    console.log('正在检查待办标记...')

    try {
      const extractor = new TodoExtractor(this.rootDir)
      const todos = await extractor.scanTodos(files)

      const issues: Issue[] = todos.map(todo => ({
        file: todo.file,
        line: todo.line,
        severity: todo.priority === 'high' ? 'error' : 'info',
        message: `[${todo.type}] ${todo.content}`,
        rule: 'todo-marker'
      }))

      return {
        name: 'todos',
        passed: true, // 待办标记不影响通过状态
        issues,
        metrics: {
          totalTodos: todos.length,
          highPriority: todos.filter(t => t.priority === 'high').length,
          mediumPriority: todos.filter(t => t.priority === 'medium').length,
          lowPriority: todos.filter(t => t.priority === 'low').length
        }
      }
    } catch (error) {
      console.error('待办标记检查失败:', error)
      return {
        name: 'todos',
        passed: false,
        issues: [{
          file: 'unknown',
          line: 0,
          severity: 'error',
          message: `待办标记检查失败: ${error instanceof Error ? error.message : String(error)}`
        }]
      }
    }
  }

  /**
   * 聚合摘要信息
   * @param checks 检查结果列表
   * @param totalFiles 文件总数
   * @returns 审计摘要
   */
  private aggregateSummary(checks: CheckResult[], totalFiles: number): AuditSummary {
    let totalIssues = 0
    let errorCount = 0
    let warningCount = 0
    let infoCount = 0

    for (const check of checks) {
      totalIssues += check.issues.length

      for (const issue of check.issues) {
        switch (issue.severity) {
          case 'error':
            errorCount++
            break
          case 'warning':
            warningCount++
            break
          case 'info':
            infoCount++
            break
        }
      }
    }

    return {
      totalFiles,
      totalIssues,
      errorCount,
      warningCount,
      infoCount
    }
  }

  /**
   * 验证质量门槛
   * @param checks 检查结果列表
   * @param summary 审计摘要
   * @returns 是否通过
   */
  private validateThresholds(checks: CheckResult[], summary: AuditSummary): boolean {
    // 如果有错误，则不通过
    if (summary.errorCount > 0) {
      return false
    }

    // 检查注释质量是否达标
    const commentCheck = checks.find(c => c.name === 'comments')
    if (commentCheck && commentCheck.metrics) {
      const avgQuality = commentCheck.metrics.averageQuality || 0
      const avgCoverage = (commentCheck.metrics.averageCoverage || 0) / 100

      if (avgQuality < this.config.thresholds.commentQuality) {
        return false
      }

      if (avgCoverage < this.config.thresholds.commentCoverage) {
        return false
      }
    }

    return true
  }

  /**
   * 生成报告
   * @param result 审计结果
   */
  private async generateReports(result: AuditResult): Promise<void> {
    const { format, path: outputPath } = this.config.output

    try {
      switch (format) {
        case 'json':
          await this.reporter.generateJSON(result, `${outputPath}.json`)
          console.log(`JSON 报告已生成: ${outputPath}.json`)
          break

        case 'html':
          await this.reporter.generateHTML(result, `${outputPath}.html`)
          console.log(`HTML 报告已生成: ${outputPath}.html`)
          break

        case 'junit':
          await this.reporter.generateJUnit(result, `${outputPath}.xml`)
          console.log(`JUnit XML 报告已生成: ${outputPath}.xml`)
          break
      }
    } catch (error) {
      console.error('生成报告失败:', error)
    }
  }

  /**
   * 翻译注释类型
   * @param type 注释类型
   * @returns 中文描述
   */
  private translateCommentType(type: string): string {
    const translations: Record<string, string> = {
      'function': '函数',
      'class': '类',
      'method': '方法',
      'interface': '接口',
      'export': '导出'
    }
    return translations[type] || type
  }
}
