/**
 * 注释分析器
 * 负责生成改进建议和聚合分析结果
 */

import type { FileCommentInfo, MissingComment, Suggestion } from './types'

/**
 * 技术术语白名单
 * 这些英文术语在注释中是允许的
 */
const TECHNICAL_TERMS = new Set([
  'TypeScript', 'JavaScript', 'Vue', 'React', 'Angular', 'Node.js',
  'API', 'HTTP', 'HTTPS', 'REST', 'GraphQL', 'JSON', 'XML',
  'HTML', 'CSS', 'DOM', 'BOM', 'Canvas', 'WebGL',
  'Promise', 'async', 'await', 'callback',
  'ESLint', 'Prettier', 'Webpack', 'Vite', 'Rollup',
  'Git', 'GitHub', 'GitLab', 'CI', 'CD',
  'npm', 'yarn', 'pnpm',
  'interface', 'type', 'class', 'function', 'const', 'let', 'var',
  'import', 'export', 'default',
  'true', 'false', 'null', 'undefined',
  'Array', 'Object', 'String', 'Number', 'Boolean',
  'Map', 'Set', 'WeakMap', 'WeakSet',
  'Proxy', 'Reflect', 'Symbol'
])

/**
 * 标识符模式
 * 用于识别代码中的标识符（变量名、函数名、类名等）
 */
const IDENTIFIER_PATTERN = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g

/**
 * 注释分析器类
 */
export class CommentAnalyzer {
  /**
   * 生成改进建议
   * @param fileInfo 文件注释信息
   * @returns 建议列表
   */
  generateSuggestions(fileInfo: FileCommentInfo): Suggestion[] {
    const suggestions: Suggestion[] = []

    // 为缺少注释的公共 API 生成高优先级建议
    const publicAPIMissing = fileInfo.missingComments.filter(m => m.isPublicAPI)
    for (const missing of publicAPIMissing) {
      suggestions.push({
        file: fileInfo.path,
        line: missing.line,
        message: `建议为公共 API "${missing.name}" 添加中文文档注释`,
        priority: 'high'
      })
    }

    // 为缺少注释的私有代码生成中优先级建议
    const privateAPIMissing = fileInfo.missingComments.filter(m => !m.isPublicAPI)
    for (const missing of privateAPIMissing) {
      suggestions.push({
        file: fileInfo.path,
        line: missing.line,
        message: `建议为 ${this.getTypeLabel(missing.type)} "${missing.name}" 添加注释`,
        priority: 'medium'
      })
    }

    // 如果注释覆盖率低，生成建议
    if (fileInfo.coverage < 0.3) {
      suggestions.push({
        file: fileInfo.path,
        line: 1,
        message: `文件的注释覆盖率较低（${(fileInfo.coverage * 100).toFixed(1)}%），建议增加注释`,
        priority: 'medium'
      })
    }

    // 如果质量评分低，生成建议
    if (fileInfo.qualityScore < 60) {
      suggestions.push({
        file: fileInfo.path,
        line: 1,
        message: `文件的注释质量评分较低（${fileInfo.qualityScore}分），建议改进注释质量`,
        priority: 'low'
      })
    }

    return suggestions
  }

  /**
   * 检查文本是否为标识符
   * @param text 文本内容
   * @returns 是否为标识符
   */
  isIdentifier(text: string): boolean {
    // 标识符应该只包含字母、数字、下划线和美元符号
    // 且不能以数字开头
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(text)
  }

  /**
   * 检查文本是否为技术术语
   * @param text 文本内容
   * @returns 是否为技术术语
   */
  isTechnicalTerm(text: string): boolean {
    return TECHNICAL_TERMS.has(text)
  }

  /**
   * 过滤注释中的标识符和技术术语
   * @param comment 注释内容
   * @returns 过滤后的注释内容
   */
  filterIdentifiersAndTerms(comment: string): string {
    // 移除标识符和技术术语，只保留描述性文本
    return comment.replace(IDENTIFIER_PATTERN, (match) => {
      if (this.isTechnicalTerm(match)) {
        return match // 保留技术术语
      }
      return '' // 移除标识符
    }).trim()
  }

  /**
   * 获取代码类型的中文标签
   * @param type 代码类型
   * @returns 中文标签
   */
  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      function: '函数',
      class: '类',
      method: '方法',
      interface: '接口',
      export: '导出项'
    }
    return labels[type] || type
  }
}
