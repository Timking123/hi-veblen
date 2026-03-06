/**
 * 代码清理器类型定义
 */

/**
 * 调试代码位置
 */
export interface DebugCodeLocation {
  /** 文件路径 */
  file: string
  /** 行号 */
  line: number
  /** 列号 */
  column: number
  /** 代码内容 */
  code: string
}

/**
 * 清理模式
 */
export type CleanMode = 'interactive' | 'batch'

/**
 * 清理选项
 */
export interface CleanOptions {
  /** 清理模式 */
  mode: CleanMode
  /** 是否为预览模式（不实际执行） */
  dryRun: boolean
  /** 是否创建备份 */
  backup: boolean
}

/**
 * 清理结果
 */
export interface CleanResult {
  /** 是否成功 */
  success: boolean
  /** 删除的代码数量 */
  removedCount: number
  /** 删除的代码位置列表 */
  locations: DebugCodeLocation[]
}

/**
 * 待办标记类型
 */
export type TodoType = 'TODO' | 'FIXME'

/**
 * 待办标记优先级
 */
export type TodoPriority = 'high' | 'medium' | 'low'

/**
 * 待办事项
 */
export interface TodoItem {
  /** 文件路径 */
  file: string
  /** 行号 */
  line: number
  /** 标记类型 */
  type: TodoType
  /** 优先级 */
  priority: TodoPriority
  /** 待办内容 */
  content: string
  /** 上下文代码 */
  context: string
}
