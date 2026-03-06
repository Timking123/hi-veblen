/**
 * 代码审计工具核心类型定义
 */

/**
 * 问题严重程度
 */
export type IssueSeverity = 'error' | 'warning' | 'info'

/**
 * 问题详情
 */
export interface Issue {
  /** 文件路径 */
  file: string
  /** 行号 */
  line: number
  /** 列号（可选） */
  column?: number
  /** 严重程度 */
  severity: IssueSeverity
  /** 问题描述 */
  message: string
  /** 规则名称（可选） */
  rule?: string
}

/**
 * 检查结果
 */
export interface CheckResult {
  /** 检查名称 */
  name: string
  /** 是否通过 */
  passed: boolean
  /** 发现的问题列表 */
  issues: Issue[]
  /** 指标数据（可选） */
  metrics?: Record<string, number>
}

/**
 * 审计摘要
 */
export interface AuditSummary {
  /** 检查的文件总数 */
  totalFiles: number
  /** 问题总数 */
  totalIssues: number
  /** 错误数量 */
  errorCount: number
  /** 警告数量 */
  warningCount: number
  /** 信息数量 */
  infoCount: number
}

/**
 * 审计结果
 */
export interface AuditResult {
  /** 是否成功（无错误） */
  success: boolean
  /** 时间戳 */
  timestamp: string
  /** 运行环境 */
  environment: string
  /** 所有检查结果 */
  checks: CheckResult[]
  /** 审计摘要 */
  summary: AuditSummary
}

/**
 * 审计配置
 */
export interface AuditConfig {
  /** 要执行的检查 */
  checks: {
    /** 是否执行 ESLint 检查 */
    eslint: boolean
    /** 是否执行注释检查 */
    comments: boolean
    /** 是否检查调试代码 */
    debug: boolean
    /** 是否检查待办标记 */
    todos: boolean
  }
  /** 质量阈值 */
  thresholds: {
    /** 注释覆盖率阈值（0-1） */
    commentCoverage: number
    /** 注释质量评分阈值（0-100） */
    commentQuality: number
  }
  /** 输出配置 */
  output: {
    /** 报告格式 */
    format: 'json' | 'html' | 'junit'
    /** 输出路径 */
    path: string
  }
  /** 是否为 CI 模式 */
  ci: boolean
  /** 是否自动修复 */
  fix: boolean
}
