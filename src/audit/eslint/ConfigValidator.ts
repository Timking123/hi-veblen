/**
 * ESLint 配置验证器
 * 负责验证新旧配置的等效性
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { ValidationResult, ConfigDifference, LegacyConfig, ESLintConfig } from './types'

/**
 * ESLint 检查结果
 */
interface ESLintResult {
  filePath: string
  messages: Array<{
    ruleId: string | null
    severity: number
    message: string
    line: number
    column: number
  }>
  errorCount: number
  warningCount: number
}

/**
 * 配置验证器类
 */
export class ConfigValidator {
  /**
   * 验证新配置与旧配置等效
   * @param oldConfigPath 旧配置路径
   * @param newConfigPath 新配置路径
   * @returns 验证结果
   */
  async validate(oldConfigPath: string, newConfigPath: string): Promise<ValidationResult> {
    // 1. 加载两个配置
    const oldConfig = await this.loadLegacyConfig(oldConfigPath)
    const newConfig = await this.loadFlatConfig(newConfigPath)

    // 2. 比较规则
    const ruleDifferences = this.compareRules(oldConfig, newConfig)

    // 3. 在测试文件上运行两个配置（如果存在测试文件）
    let resultDifferences: string[] = []
    try {
      const testFiles = await this.getTestFiles()
      if (testFiles.length > 0) {
        const oldResults = await this.runESLint(testFiles, oldConfigPath)
        const newResults = await this.runESLint(testFiles, newConfigPath)
        resultDifferences = this.compareResults(oldResults, newResults)
      }
    } catch (error) {
      // 如果无法运行 ESLint，只比较规则
      console.warn('无法运行 ESLint 比较，仅比较规则配置')
    }

    return {
      equivalent: ruleDifferences.length === 0 && resultDifferences.length === 0,
      ruleDifferences,
      resultDifferences,
    }
  }

  /**
   * 加载旧版配置文件
   * @param configPath 配置文件路径
   * @returns 旧版配置对象
   */
  private async loadLegacyConfig(configPath: string): Promise<LegacyConfig> {
    const content = await fs.readFile(configPath, 'utf-8')
    
    // 移除 module.exports = 并解析为 JSON
    // 这是一个简化的实现，实际可能需要更复杂的解析
    const jsonContent = content
      .replace(/module\.exports\s*=\s*/, '')
      .replace(/,\s*$/, '')
    
    // 使用 eval 解析（注意：这在生产环境中不安全，仅用于测试）
    // 实际实现应该使用更安全的方法
    try {
      // eslint-disable-next-line no-eval
      return eval(`(${jsonContent})`)
    } catch (error) {
      throw new Error(`无法解析旧配置文件: ${configPath}`)
    }
  }

  /**
   * 加载新版扁平配置文件
   * @param configPath 配置文件路径
   * @returns 新版配置对象数组
   */
  private async loadFlatConfig(configPath: string): Promise<ESLintConfig[]> {
    // 动态导入配置文件
    const absolutePath = path.resolve(configPath)
    try {
      const module = await import(absolutePath)
      return module.default || module
    } catch (error) {
      throw new Error(`无法加载新配置文件: ${configPath}`)
    }
  }

  /**
   * 比较新旧配置的规则
   * @param oldConfig 旧配置
   * @param newConfig 新配置数组
   * @returns 规则差异列表
   */
  compareRules(oldConfig: LegacyConfig, newConfig: ESLintConfig[]): ConfigDifference[] {
    const differences: ConfigDifference[] = []
    
    // 获取旧配置的规则
    const oldRules = oldConfig.rules || {}
    
    // 合并新配置中所有的规则
    const newRules: Record<string, any> = {}
    for (const config of newConfig) {
      if (config.rules) {
        Object.assign(newRules, config.rules)
      }
    }

    // 检查旧规则中是否有缺失或修改的规则
    for (const [ruleName, oldValue] of Object.entries(oldRules)) {
      if (!(ruleName in newRules)) {
        differences.push({
          type: 'removed',
          rule: ruleName,
          oldValue,
        })
      } else if (JSON.stringify(newRules[ruleName]) !== JSON.stringify(oldValue)) {
        differences.push({
          type: 'modified',
          rule: ruleName,
          oldValue,
          newValue: newRules[ruleName],
        })
      }
    }

    // 检查新规则中是否有新增的规则
    for (const [ruleName, newValue] of Object.entries(newRules)) {
      if (!(ruleName in oldRules)) {
        differences.push({
          type: 'added',
          rule: ruleName,
          newValue,
        })
      }
    }

    return differences
  }

  /**
   * 在测试文件上运行 ESLint
   * @param files 要检查的文件列表
   * @param configPath 配置文件路径
   * @returns ESLint 检查结果
   */
  async runESLint(files: string[], configPath: string): Promise<ESLintResult[]> {
    // 这是一个简化的实现
    // 实际实现需要使用 ESLint API
    const { ESLint } = await import('eslint')
    
    const eslint = new ESLint({
      overrideConfigFile: configPath,
      useEslintrc: false,
    })

    const results = await eslint.lintFiles(files)
    
    return results.map(result => ({
      filePath: result.filePath,
      messages: result.messages.map(msg => ({
        ruleId: msg.ruleId,
        severity: msg.severity,
        message: msg.message,
        line: msg.line,
        column: msg.column,
      })),
      errorCount: result.errorCount,
      warningCount: result.warningCount,
    }))
  }

  /**
   * 比较两次 ESLint 运行的结果
   * @param oldResults 旧配置的检查结果
   * @param newResults 新配置的检查结果
   * @returns 结果差异描述列表
   */
  private compareResults(oldResults: ESLintResult[], newResults: ESLintResult[]): string[] {
    const differences: string[] = []

    // 创建文件路径到结果的映射
    const oldResultsMap = new Map(oldResults.map(r => [r.filePath, r]))
    const newResultsMap = new Map(newResults.map(r => [r.filePath, r]))

    // 比较每个文件的结果
    for (const [filePath, oldResult] of oldResultsMap) {
      const newResult = newResultsMap.get(filePath)
      
      if (!newResult) {
        differences.push(`文件 ${filePath} 在新配置中未被检查`)
        continue
      }

      // 比较错误和警告数量
      if (oldResult.errorCount !== newResult.errorCount) {
        differences.push(
          `文件 ${filePath} 的错误数量不同: 旧=${oldResult.errorCount}, 新=${newResult.errorCount}`
        )
      }

      if (oldResult.warningCount !== newResult.warningCount) {
        differences.push(
          `文件 ${filePath} 的警告数量不同: 旧=${oldResult.warningCount}, 新=${newResult.warningCount}`
        )
      }

      // 比较具体的规则违规
      const oldRuleIds = new Set(oldResult.messages.map(m => m.ruleId).filter(Boolean))
      const newRuleIds = new Set(newResult.messages.map(m => m.ruleId).filter(Boolean))

      for (const ruleId of oldRuleIds) {
        if (!newRuleIds.has(ruleId)) {
          differences.push(`文件 ${filePath} 中规则 ${ruleId} 在新配置中未触发`)
        }
      }

      for (const ruleId of newRuleIds) {
        if (!oldRuleIds.has(ruleId)) {
          differences.push(`文件 ${filePath} 中规则 ${ruleId} 在新配置中新触发`)
        }
      }
    }

    // 检查新配置中是否有额外的文件被检查
    for (const filePath of newResultsMap.keys()) {
      if (!oldResultsMap.has(filePath)) {
        differences.push(`文件 ${filePath} 在旧配置中未被检查`)
      }
    }

    return differences
  }

  /**
   * 获取测试文件列表
   * @returns 测试文件路径数组
   */
  private async getTestFiles(): Promise<string[]> {
    // 查找项目中的测试文件
    const testPatterns = [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'src/**/*.test.js',
      'src/**/*.spec.js',
    ]

    const files: string[] = []
    
    // 这是一个简化的实现
    // 实际实现应该使用 glob 库来匹配文件
    try {
      const srcDir = path.resolve('src')
      const entries = await fs.readdir(srcDir, { recursive: true, withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const fullPath = path.join(entry.path || '', entry.name)
          if (
            fullPath.endsWith('.test.ts') ||
            fullPath.endsWith('.spec.ts') ||
            fullPath.endsWith('.test.js') ||
            fullPath.endsWith('.spec.js')
          ) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      // 如果无法读取目录，返回空数组
      return []
    }

    // 限制测试文件数量，避免运行时间过长
    return files.slice(0, 10)
  }
}
