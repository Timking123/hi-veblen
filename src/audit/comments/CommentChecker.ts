/**
 * 注释检查器
 * 负责扫描代码文件中的注释，识别缺少注释的代码结构
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as tsParser from '@typescript-eslint/parser'
import * as vueParser from 'vue-eslint-parser'
import type { TSESTree } from '@typescript-eslint/types'
import type {
  CommentCheckResult,
  FileCommentInfo,
  MissingComment,
  OverallCommentInfo,
  Suggestion
} from './types'
import { QualityScorer } from './QualityScorer'
import { CommentAnalyzer } from './CommentAnalyzer'

/**
 * 注释节点
 */
interface Comment {
  type: 'Line' | 'Block'
  value: string
  range: [number, number]
  loc: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
}

/**
 * 注释检查器类
 */
export class CommentChecker {
  private qualityThreshold: number
  private qualityScorer: QualityScorer
  private commentAnalyzer: CommentAnalyzer

  constructor(qualityThreshold: number = 60) {
    this.qualityThreshold = qualityThreshold
    this.qualityScorer = new QualityScorer()
    this.commentAnalyzer = new CommentAnalyzer()
  }

  /**
   * 检查文件的注释质量
   * @param files 要检查的文件列表
   * @returns 检查结果
   */
  async check(files: string[]): Promise<CommentCheckResult> {
    const fileInfos: FileCommentInfo[] = []

    for (const file of files) {
      try {
        const info = await this.checkFile(file)
        fileInfos.push(info)
      } catch (error) {
        console.error(`检查文件 ${file} 时出错:`, error)
        // 跳过无法解析的文件，继续处理其他文件
      }
    }

    return this.aggregateResults(fileInfos)
  }

  /**
   * 检查单个文件
   * @param file 文件路径
   * @returns 文件注释信息
   */
  private async checkFile(file: string): Promise<FileCommentInfo> {
    const content = await fs.readFile(file, 'utf-8')
    const ast = this.parseFile(file, content)
    const comments = this.extractComments(ast)
    const missingComments = this.findMissingComments(ast, comments)
    
    // 使用 QualityScorer 计算指标
    const coverage = this.qualityScorer.calculateCoverage(file, content, ast)
    const qualityScore = this.qualityScorer.calculateQualityScore(file, content, ast, missingComments)
    
    // 创建临时的 FileCommentInfo 用于生成建议
    const tempInfo: FileCommentInfo = {
      path: file,
      coverage,
      qualityScore,
      missingComments,
      suggestions: []
    }
    
    // 使用 CommentAnalyzer 生成建议
    const suggestions = this.commentAnalyzer.generateSuggestions(tempInfo)

    return {
      path: file,
      coverage,
      qualityScore,
      missingComments,
      suggestions
    }
  }

  /**
   * 解析文件为 AST
   * @param file 文件路径
   * @param content 文件内容
   * @returns AST 根节点
   */
  parseFile(file: string, content: string): TSESTree.Program {
    const ext = path.extname(file)

    if (ext === '.vue') {
      // 解析 Vue 文件
      const result = vueParser.parseForESLint(content, {
        parser: tsParser as any,
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      })
      return result.ast as unknown as TSESTree.Program
    } else if (ext === '.ts' || ext === '.tsx') {
      // 解析 TypeScript 文件
      return tsParser.parse(content, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        comment: true,
        loc: true,
        range: true
      })
    } else {
      // 解析 JavaScript 文件
      return tsParser.parse(content, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        comment: true,
        loc: true,
        range: true
      })
    }
  }

  /**
   * 从 AST 中提取注释
   * @param ast AST 根节点
   * @returns 注释列表
   */
  extractComments(ast: TSESTree.Program): Comment[] {
    const comments: Comment[] = []

    // TypeScript ESLint parser 会将注释附加到 AST 的 comments 属性
    if (ast.comments) {
      for (const comment of ast.comments) {
        comments.push({
          type: comment.type === 'Line' ? 'Line' : 'Block',
          value: comment.value,
          range: comment.range,
          loc: comment.loc
        })
      }
    }

    return comments
  }

  /**
   * 查找缺少注释的代码结构
   * @param ast AST 根节点
   * @param comments 注释列表
   * @returns 缺少注释的代码列表
   */
  findMissingComments(
    ast: TSESTree.Program,
    comments: Comment[]
  ): MissingComment[] {
    const missing: MissingComment[] = []

    // 遍历 AST 查找需要注释的节点
    this.traverseAST(ast, (node, parent) => {
      // 检查函数声明
      if (node.type === 'FunctionDeclaration' && node.id) {
        if (!this.hasComment(node, comments)) {
          missing.push({
            type: 'function',
            name: node.id.name,
            line: node.loc!.start.line,
            isPublicAPI: this.isExported(node, parent)
          })
        }
      }

      // 检查类声明
      if (node.type === 'ClassDeclaration' && node.id) {
        if (!this.hasComment(node, comments)) {
          missing.push({
            type: 'class',
            name: node.id.name,
            line: node.loc!.start.line,
            isPublicAPI: this.isExported(node, parent)
          })
        }
      }

      // 检查方法定义
      if (node.type === 'MethodDefinition' && node.key.type === 'Identifier') {
        if (!this.hasComment(node, comments)) {
          missing.push({
            type: 'method',
            name: node.key.name,
            line: node.loc!.start.line,
            isPublicAPI: node.accessibility === 'public' || !node.accessibility
          })
        }
      }

      // 检查接口声明
      if (node.type === 'TSInterfaceDeclaration') {
        if (!this.hasComment(node, comments)) {
          missing.push({
            type: 'interface',
            name: node.id.name,
            line: node.loc!.start.line,
            isPublicAPI: this.isExported(node, parent)
          })
        }
      }

      // 检查导出的变量声明（箭头函数等）
      if (node.type === 'VariableDeclaration') {
        for (const declarator of node.declarations) {
          if (
            declarator.id.type === 'Identifier' &&
            declarator.init &&
            (declarator.init.type === 'ArrowFunctionExpression' ||
              declarator.init.type === 'FunctionExpression')
          ) {
            if (!this.hasComment(node, comments)) {
              missing.push({
                type: 'function',
                name: declarator.id.name,
                line: node.loc!.start.line,
                isPublicAPI: this.isExported(node, parent)
              })
            }
          }
        }
      }
    })

    return missing
  }

  /**
   * 遍历 AST
   * @param node 当前节点
   * @param callback 回调函数
   * @param parent 父节点
   * @param visited 已访问的节点集合（防止循环引用）
   */
  private traverseAST(
    node: TSESTree.Node,
    callback: (node: TSESTree.Node, parent?: TSESTree.Node) => void,
    parent?: TSESTree.Node,
    visited: Set<any> = new Set()
  ): void {
    // 防止循环引用导致栈溢出
    if (visited.has(node)) {
      return
    }
    visited.add(node)

    callback(node, parent)

    // 遍历子节点 - 只遍历特定的 AST 属性，避免遍历 parent 等循环引用
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

  /**
   * 检查节点是否有注释
   * @param node AST 节点
   * @param comments 注释列表
   * @returns 是否有注释
   */
  private hasComment(node: TSESTree.Node, comments: Comment[]): boolean {
    if (!node.loc) return false

    const nodeLine = node.loc.start.line

    // 检查节点前面的几行是否有注释
    for (const comment of comments) {
      const commentLine = comment.loc.end.line
      // 注释应该在节点前面 1-3 行内
      if (commentLine >= nodeLine - 3 && commentLine < nodeLine) {
        return true
      }
    }

    return false
  }

  /**
   * 检查节点是否被导出
   * @param node AST 节点
   * @param parent 父节点
   * @returns 是否被导出
   */
  private isExported(node: TSESTree.Node, parent?: TSESTree.Node): boolean {
    // 检查是否有 export 关键字
    if (parent && parent.type === 'ExportNamedDeclaration') {
      return true
    }
    if (parent && parent.type === 'ExportDefaultDeclaration') {
      return true
    }

    return false
  }

  /**
   * 聚合检查结果
   * @param fileInfos 所有文件的注释信息
   * @returns 整体检查结果
   */
  private aggregateResults(fileInfos: FileCommentInfo[]): CommentCheckResult {
    const totalFiles = fileInfos.length
    const totalCoverage = fileInfos.reduce((sum, info) => sum + info.coverage, 0)
    const totalQuality = fileInfos.reduce((sum, info) => sum + info.qualityScore, 0)
    const lowQualityFiles = fileInfos.filter(
      info => info.qualityScore < this.qualityThreshold
    )

    const overall: OverallCommentInfo = {
      totalFiles,
      averageCoverage: totalFiles > 0 ? totalCoverage / totalFiles : 0,
      averageQuality: totalFiles > 0 ? totalQuality / totalFiles : 0,
      filesWithLowQuality: lowQualityFiles.length
    }

    return {
      files: fileInfos,
      overall,
      lowQualityFiles: lowQualityFiles.map(info => info.path)
    }
  }
}
