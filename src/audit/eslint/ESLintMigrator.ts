/**
 * ESLint 配置迁移器
 * 负责将旧版 .eslintrc.cjs 格式转换为新版 eslint.config.js 扁平配置格式
 */

import type { LegacyConfig, ESLintConfig, MigrateOptions, MigrateResult } from './types'

/**
 * 浏览器全局变量
 */
const BROWSER_GLOBALS: Record<string, boolean> = {
  window: true,
  document: true,
  navigator: true,
  console: true,
  setTimeout: true,
  setInterval: true,
  clearTimeout: true,
  clearInterval: true,
  fetch: true,
  localStorage: true,
  sessionStorage: true,
}

/**
 * Node.js 全局变量
 */
const NODE_GLOBALS: Record<string, boolean> = {
  global: true,
  process: true,
  Buffer: true,
  __dirname: true,
  __filename: true,
  require: true,
  module: true,
  exports: true,
}

/**
 * ES2021 全局变量
 */
const ES2021_GLOBALS: Record<string, boolean> = {
  Promise: true,
  Symbol: true,
  Map: true,
  Set: true,
  WeakMap: true,
  WeakSet: true,
  Proxy: true,
  Reflect: true,
  BigInt: true,
}

/**
 * ESLint 配置迁移器类
 */
export class ESLintMigrator {
  private readonly rootDir: string

  /**
   * 构造函数
   * @param rootDir 项目根目录，默认为当前工作目录
   */
  constructor(rootDir?: string) {
    this.rootDir = rootDir || process.cwd()
  }

  /**
   * 生成新版配置文件
   * @param oldConfig 旧配置对象
   * @returns 新配置对象数组
   */
  generateNewConfig(oldConfig: LegacyConfig): ESLintConfig[] {
    const newConfig: ESLintConfig[] = []

    // 1. 添加全局忽略配置
    if (oldConfig.ignorePatterns && oldConfig.ignorePatterns.length > 0) {
      newConfig.push({
        ignores: this.convertIgnorePatterns(oldConfig.ignorePatterns),
      })
    }

    // 2. 转换环境变量为 globals
    const globals = this.convertEnv(oldConfig.env || {})

    // 3. 转换插件
    const plugins = this.convertPlugins(oldConfig.plugins || [])

    // 4. 创建基础配置（适用于所有文件）
    newConfig.push({
      files: ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.vue', '**/*.jsx'],
      languageOptions: {
        parserOptions: oldConfig.parserOptions || {},
        globals,
      },
      plugins,
      rules: oldConfig.rules || {},
    })

    return newConfig
  }

  /**
   * 转换环境变量为 globals
   * @param env 环境配置对象
   * @returns globals 对象
   */
  convertEnv(env: Record<string, boolean>): Record<string, boolean> {
    const globals: Record<string, boolean> = {}

    // 合并各个环境的全局变量
    if (env.browser) {
      Object.assign(globals, BROWSER_GLOBALS)
    }
    if (env.node) {
      Object.assign(globals, NODE_GLOBALS)
    }
    if (env.es2021 || env.es6) {
      Object.assign(globals, ES2021_GLOBALS)
    }

    return globals
  }

  /**
   * 转换插件格式
   * @param plugins 插件名称数组
   * @returns 插件对象映射
   */
  convertPlugins(plugins: string[]): Record<string, any> {
    const pluginMap: Record<string, any> = {}

    for (const plugin of plugins) {
      // 移除 'eslint-plugin-' 前缀（如果存在）
      const pluginName = plugin.replace(/^eslint-plugin-/, '')
      
      // 注意：这里返回插件名称字符串，实际使用时需要动态导入
      // 在实际的配置文件中，这些会被替换为实际的插件导入
      pluginMap[pluginName] = plugin
    }

    return pluginMap
  }

  /**
   * 转换忽略模式
   * @param patterns 忽略模式数组
   * @returns 转换后的忽略模式数组
   */
  convertIgnorePatterns(patterns: string[]): string[] {
    // 确保模式以正确的格式返回
    return patterns.map(pattern => {
      // 如果模式不以 / 开头且不包含 **，添加 **/
      if (!pattern.startsWith('/') && !pattern.includes('**')) {
        return `**/${pattern}`
      }
      return pattern
    })
  }

  /**
   * 迁移 ESLint 配置
   * @param options 迁移选项
   * @returns 迁移结果
   */
  async migrate(options: MigrateOptions): Promise<MigrateResult> {
    const fs = await import('fs/promises')
    const path = await import('path')

    const oldConfigPath = path.join(this.rootDir, '.eslintrc.cjs')
    const newConfigPath = path.join(this.rootDir, 'eslint.config.js')
    let backupPath: string | undefined

    try {
      // 1. 检查旧配置文件是否存在
      try {
        await fs.access(oldConfigPath)
      } catch {
        throw new Error(`旧配置文件 ${oldConfigPath} 不存在`)
      }

      // 2. 读取旧配置
      const oldConfigContent = await fs.readFile(oldConfigPath, 'utf-8')
      const oldConfig = this.parseOldConfig(oldConfigContent)

      // 3. 生成新配置
      const newConfig = this.generateNewConfig(oldConfig)

      // 4. 如果是 dry-run 模式，只返回预览结果
      if (options.dryRun) {
        return {
          success: true,
          configPath: 'eslint.config.js',
          differences: [],
        }
      }

      // 5. 创建备份（如果需要）
      if (options.backup) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupFilename = `.eslintrc.cjs.backup.${timestamp}`
        backupPath = backupFilename
        await fs.copyFile(oldConfigPath, path.join(this.rootDir, backupFilename))
      }

      // 6. 生成新配置文件内容
      const newConfigContent = this.generateConfigFileContent(newConfig)

      // 7. 写入新配置文件
      await fs.writeFile(newConfigPath, newConfigContent, 'utf-8')

      // 8. 删除旧配置文件（如果需要）
      if (options.deleteOld) {
        await fs.unlink(oldConfigPath)
      }

      return {
        success: true,
        configPath: 'eslint.config.js',
        backupPath,
        differences: [],
      }
    } catch (error) {
      // 如果失败且创建了备份，尝试恢复
      if (backupPath) {
        try {
          await fs.copyFile(path.join(this.rootDir, backupPath), oldConfigPath)
          await fs.unlink(path.join(this.rootDir, backupPath))
        } catch {
          // 恢复失败，忽略
        }
      }

      throw error
    }
  }

  /**
   * 解析旧配置文件内容
   * @param content 配置文件内容
   * @returns 旧配置对象
   */
  private parseOldConfig(content: string): LegacyConfig {
    // 移除 module.exports = 并解析
    const jsonContent = content
      .replace(/module\.exports\s*=\s*/, '')
      .replace(/,\s*$/, '')

    try {
      // eslint-disable-next-line no-eval
      return eval(`(${jsonContent})`)
    } catch (error) {
      throw new Error('无法解析旧配置文件')
    }
  }

  /**
   * 生成新配置文件的内容
   * @param config 新配置对象数组
   * @returns 配置文件内容字符串
   */
  private generateConfigFileContent(config: ESLintConfig[]): string {
    const lines: string[] = []

    lines.push('/**')
    lines.push(' * ESLint 配置文件（扁平配置格式）')
    lines.push(' * 由 ESLintMigrator 自动生成')
    lines.push(' */')
    lines.push('')

    // 生成配置数组
    lines.push('export default [')

    for (let i = 0; i < config.length; i++) {
      const cfg = config[i]
      lines.push('  {')

      // ignores
      if (cfg.ignores) {
        lines.push(`    ignores: ${JSON.stringify(cfg.ignores, null, 2).replace(/\n/g, '\n    ')},`)
      }

      // files
      if (cfg.files) {
        lines.push(`    files: ${JSON.stringify(cfg.files, null, 2).replace(/\n/g, '\n    ')},`)
      }

      // languageOptions
      if (cfg.languageOptions) {
        lines.push('    languageOptions: {')
        if (cfg.languageOptions.parserOptions) {
          lines.push(
            `      parserOptions: ${JSON.stringify(cfg.languageOptions.parserOptions, null, 2).replace(/\n/g, '\n      ')},`
          )
        }
        if (cfg.languageOptions.globals) {
          lines.push(
            `      globals: ${JSON.stringify(cfg.languageOptions.globals, null, 2).replace(/\n/g, '\n      ')},`
          )
        }
        lines.push('    },')
      }

      // plugins
      if (cfg.plugins) {
        lines.push('    plugins: {')
        for (const [name, value] of Object.entries(cfg.plugins)) {
          lines.push(`      '${name}': '${value}', // 需要手动导入插件`)
        }
        lines.push('    },')
      }

      // rules
      if (cfg.rules) {
        lines.push(`    rules: ${JSON.stringify(cfg.rules, null, 2).replace(/\n/g, '\n    ')},`)
      }

      lines.push(`  }${i < config.length - 1 ? ',' : ''}`)
    }

    lines.push(']')
    lines.push('')

    return lines.join('\n')
  }
}
