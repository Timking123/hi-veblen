/**
 * 注释检查器类型定义
 */

/**
 * 缺少注释的代码类型
 */
export type MissingCommentType = 'function' | 'class' | 'method' | 'interface' | 'export'

/**
 * 缺少注释的代码信息
 */
export interface MissingComment {
  /** 代码类型 */
  type: MissingCommentType
  /** 代码名称 */
  name: string
  /** 行号 */
  line: number
  /** 是否为公共 API */
  isPublicAPI: boolean
}

/**
 * 改进建议
 */
export interface Suggestion {
  /** 文件路径 */
  file: string
  /** 行号 */
  line: number
  /** 建议内容 */
  message: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
}

/**
 * 文件注释信息
 */
export interface FileCommentInfo {
  /** 文件路径 */
  path: string
  /** 注释覆盖率（0-1） */
  coverage: number
  /** 质量评分（0-100） */
  qualityScore: number
  /** 缺少注释的代码列表 */
  missingComments: MissingComment[]
  /** 改进建议 */
  suggestions: Suggestion[]
}

/**
 * 整体注释信息
 */
export interface OverallCommentInfo {
  /** 检查的文件总数 */
  totalFiles: number
  /** 平均覆盖率 */
  averageCoverage: number
  /** 平均质量评分 */
  averageQuality: number
  /** 低质量文件数量 */
  filesWithLowQuality: number
}

/**
 * 注释检查结果
 */
export interface CommentCheckResult {
  /** 所有文件的注释信息 */
  files: FileCommentInfo[]
  /** 整体注释信息 */
  overall: OverallCommentInfo
  /** 低质量文件列表 */
  lowQualityFiles: string[]
}
