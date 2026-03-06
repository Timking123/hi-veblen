/**
 * 文档整理器类型定义
 */

/**
 * 文档类别
 */
export type DocumentCategory = 'deployment' | 'development' | 'features' | 'planning' | 'testing' | 'other'

/**
 * 文档文件信息
 */
export interface DocumentFile {
  /** 文件路径 */
  path: string
  /** 文档类别 */
  category: DocumentCategory
  /** 文档标题 */
  title: string
}

/**
 * 分类后的文档
 */
export interface ClassifiedDocs {
  /** 部署相关文档 */
  deployment: DocumentFile[]
  /** 开发相关文档 */
  development: DocumentFile[]
  /** 功能相关文档 */
  features: DocumentFile[]
  /** 规划相关文档 */
  planning: DocumentFile[]
  /** 测试相关文档 */
  testing: DocumentFile[]
  /** 其他文档 */
  other: DocumentFile[]
}

/**
 * 文件移动记录
 */
export interface FileMove {
  /** 源路径 */
  from: string
  /** 目标路径 */
  to: string
}

/**
 * 链接更新记录
 */
export interface LinkUpdate {
  /** 文档路径 */
  file: string
  /** 旧链接 */
  oldLink: string
  /** 新链接 */
  newLink: string
}

/**
 * 整理选项
 */
export interface OrganizeOptions {
  /** 是否为预览模式（不实际执行） */
  dryRun: boolean
  /** 是否创建备份 */
  backup: boolean
  /** 是否更新文档链接 */
  updateLinks: boolean
}

/**
 * 整理结果
 */
export interface OrganizeResult {
  /** 是否成功 */
  success: boolean
  /** 移动的文件列表 */
  movedFiles: FileMove[]
  /** 更新的链接列表 */
  updatedLinks: LinkUpdate[]
  /** 索引文件路径 */
  indexPath: string
}
