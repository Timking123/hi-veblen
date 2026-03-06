/**
 * 注释质量评分器
 * 负责计算注释覆盖率和质量评分
 */

import * as fs from 'fs/promises'
import type { TSESTree } from '@typescript-eslint/types'
import type { MissingComment } from './types'

/**
 * 注释质量评分器类
 */
export class QualityScorer {
  /**
   * 计算文件的注释覆盖率
   * @param filePath 文件路径
   * @param content 文件内容
   * @param ast AST 根节点
   * @returns 覆盖率（0-1）
   */
  calculateCoverage(filePath: string, content: string, ast: TSESTree.Program): number {
    const lines = content.split('\n')
    const totalLines = lines.filter(line => {
      const trimmed = line.trim()
      // 排除空行和只有括号的行
      return trimmed.length > 0 && 
             trimmed !== '{' && 
             trimmed !== '}' && 
             trimmed !== '};' &&
             !trimmed.startsWith('import ') &&
             !trimmed.startsWith('export {')
    }).length

    if (totalLines === 0) {
      return 1 // 空文件视为完全覆盖
    }

    // 计算注释行数
    let commentLines = 0
    if (ast.comments) {
      for (const comment of ast.comments) {
        const startLine = comment.loc.start.line
        const endLine = comment.loc.end.line
        commentLines += endLine - startLine + 1
      }
    }

    // 覆盖率 = 注释行数 / 代码行数
    const coverage = Math.min(commentLines / totalLines, 1)
    return coverage
  }

  /**
   * 计算文件的注释质量评分
   * @param filePath 文件路径
   * @param content 文件内容
   * @param ast AST 根节点
   * @param missingComments 缺少注释的代码列表
   * @returns 评分（0-100）
   */
  calculateQualityScore(
    filePath: string,
    content: string,
    ast: TSESTree.Program,
    missingComments: MissingComment[]
  ): number {
    // 计算各项指标
    const coverage = this.calculateCoverage(filePath, content, ast)
    const publicAPICoverage = this.calculatePublicAPICoverage(ast, missingComments)
    const chineseCommentRatio = this.calculateChineseCommentRatio(ast)

    // 加权评分
    // 覆盖率占 30%，公共 API 覆盖率占 50%，中文注释比例占 20%
    const score = Math.round(
      coverage * 30 +
      publicAPICoverage * 50 +
      chineseCommentRatio * 20
    )

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 计算公共 API 的注释覆盖率
   * @param ast AST 根节点
   * @param missingComments 缺少注释的代码列表
   * @returns 公共 API 覆盖率（0-1）
   */
  calculatePublicAPICoverage(
    ast: TSESTree.Program,
    missingComments: MissingComment[]
  ): number {
    // 统计所有公共 API
    const publicAPIs = this.countPublicAPIs(ast)
    
    if (publicAPIs === 0) {
      return 1 // 没有公共 API 时视为完全覆盖
    }

    // 统计缺少注释的公共 API
    const missingPublicAPIs = missingComments.filter(m => m.isPublicAPI).length

    // 公共 API 覆盖率 = (总数 - 缺失数) / 总数
    const coverage = (publicAPIs - missingPublicAPIs) / publicAPIs
    return Math.max(0, Math.min(1, coverage))
  }

  /**
   * 计算中文注释的比例
   * @param ast AST 根节点
   * @returns 中文注释比例（0-1）
   */
  calculateChineseCommentRatio(ast: TSESTree.Program): number {
    if (!ast.comments || ast.comments.length === 0) {
      return 0
    }

    let totalComments = 0
    let chineseComments = 0

    for (const comment of ast.comments) {
      totalComments++
      
      // 检查注释内容是否包含中文字符
      if (this.containsChinese(comment.value)) {
        chineseComments++
      }
    }

    return totalComments > 0 ? chineseComments / totalComments : 0
  }

  /**
   * 统计公共 API 的数量
   * @param ast AST 根节点
   * @returns 公共 API 数量
   */
  private countPublicAPIs(ast: TSESTree.Program): number {
    let count = 0

    this.traverseAST(ast, (node, parent) => {
      // 导出的函数声明
      if (node.type === 'FunctionDeclaration' && node.id && this.isExported(node, parent)) {
        count++
      }

      // 导出的类声明
      if (node.type === 'ClassDeclaration' && node.id && this.isExported(node, parent)) {
        count++
      }

      // 导出的接口声明
      if (node.type === 'TSInterfaceDeclaration' && this.isExported(node, parent)) {
        count++
      }

      // 导出的类型别名
      if (node.type === 'TSTypeAliasDeclaration' && this.isExported(node, parent)) {
        count++
      }

      // 导出的变量声明（包括箭头函数）
      if (node.type === 'VariableDeclaration' && this.isExported(node, parent)) {
        count += node.declarations.length
      }
    })

    return count
  }

  /**
   * 检查节点是否被导出
   * @param node AST 节点
   * @param parent 父节点
   * @returns 是否被导出
   */
  private isExported(node: TSESTree.Node, parent?: TSESTree.Node): boolean {
    if (parent && parent.type === 'ExportNamedDeclaration') {
      return true
    }
    if (parent && parent.type === 'ExportDefaultDeclaration') {
      return true
    }
    return false
  }

  /**
   * 检查字符串是否包含中文字符
   * @param text 文本内容
   * @returns 是否包含中文
   */
  private containsChinese(text: string): boolean {
    // 匹配中文字符（包括中文标点符号）
    const chineseRegex = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/
    return chineseRegex.test(text)
  }

  /**
   * 遍历 AST
   * @param node 当前节点
   * @param callback 回调函数
   * @param parent 父节点
   * @param visited 已访问的节点集合
   */
  private traverseAST(
    node: TSESTree.Node,
    callback: (node: TSESTree.Node, parent?: TSESTree.Node) => void,
    parent?: TSESTree.Node,
    visited: Set<any> = new Set()
  ): void {
    if (visited.has(node)) {
      return
    }
    visited.add(node)

    callback(node, parent)

    const keysToTraverse = [
      'body', 'declarations', 'declaration', 'expression', 'expressions',
      'callee', 'arguments', 'params', 'consequent', 'alternate',
      'left', 'right', 'test', 'init', 'update', 'object', 'property',
      'elements', 'properties', 'value', 'key', 'id', 'superClass',
      'members', 'extends', 'implements', 'typeParameters', 'returnType'
    ]

    for (const key of keysToTraverse) {
      const value = (node as any)[key]
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && item.type) {
              this.traverseAST(item, callback, node, visited)
            }
          }
        } else if (value.type) {
          this.traverseAST(value, callback, node, visited)
        }
      }
    }
  }
}
