/**
 * ESLint 迁移器类型定义
 */

/**
 * 旧版 ESLint 配置（.eslintrc.cjs 格式）
 */
export interface LegacyConfig {
  /** 扩展的配置 */
  extends?: string[]
  /** 插件列表 */
  plugins?: string[]
  /** 规则配置 */
  rules?: Record<string, any>
  /** 解析器选项 */
  parserOptions?: Record<string, any>
  /** 环境配置 */
  env?: Record<string, boolean>
  /** 忽略模式 */
  ignorePatterns?: string[]
  /** 解析器 */
  parser?: string
}

/**
 * 新版 ESLint 扁平配置（eslint.config.js 格式）
 */
export interface ESLintConfig {
  /** 文件匹配模式 */
  files?: string[]
  /** 忽略模式 */
  ignores?: string[]
  /** 语言选项 */
  languageOptions?: {
    /** 解析器 */
    parser?: any
    /** 解析器选项 */
    parserOptions?: Record<string, any>
    /** 全局变量 */
    globals?: Record<string, boolean>
  }
  /** 插件 */
  plugins?: Record<string, any>
  /** 规则 */
  rules?: Record<string, any>
}

/**
 * 配置差异
 */
export interface ConfigDifference {
  /** 差异类型 */
  type: 'added' | 'removed' | 'modified'
  /** 规则名称 */
  rule: string
  /** 旧值 */
  oldValue?: any
  /** 新值 */
  newValue?: any
}

/**
 * 迁移选项
 */
export interface MigrateOptions {
  /** 是否为预览模式（不实际执行） */
  dryRun: boolean
  /** 是否创建备份 */
  backup: boolean
  /** 是否删除旧配置文件 */
  deleteOld: boolean
}

/**
 * 迁移结果
 */
export interface MigrateResult {
  /** 是否成功 */
  success: boolean
  /** 新配置文件路径 */
  configPath: string
  /** 备份文件路径（如果创建了备份） */
  backupPath?: string
  /** 配置差异列表 */
  differences: ConfigDifference[]
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否等效 */
  equivalent: boolean
  /** 规则差异 */
  ruleDifferences: ConfigDifference[]
  /** 检查结果差异 */
  resultDifferences: string[]
}
