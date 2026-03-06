/**
 * 报告生成器类型定义
 */

/**
 * 报告格式
 */
export type ReportFormat = 'json' | 'html' | 'junit'

/**
 * 报告选项
 */
export interface ReportOptions {
  /** 报告格式 */
  format: ReportFormat
  /** 输出路径 */
  outputPath: string
  /** 是否为 CI 模式 */
  ci?: boolean
}

/**
 * HTML 报告配置
 */
export interface HTMLReportConfig {
  /** 报告标题 */
  title: string
  /** 项目名称 */
  projectName: string
  /** 是否包含详细信息 */
  includeDetails: boolean
}

/**
 * JUnit 测试套件
 */
export interface JUnitTestSuite {
  /** 套件名称 */
  name: string
  /** 测试数量 */
  tests: number
  /** 失败数量 */
  failures: number
  /** 错误数量 */
  errors: number
  /** 执行时间（秒） */
  time: number
  /** 测试用例列表 */
  testcases: JUnitTestCase[]
}

/**
 * JUnit 测试用例
 */
export interface JUnitTestCase {
  /** 用例名称 */
  name: string
  /** 类名 */
  classname: string
  /** 执行时间（秒） */
  time: number
  /** 失败信息（如果失败） */
  failure?: {
    /** 失败类型 */
    type: string
    /** 失败消息 */
    message: string
  }
}
