/**
 * 文档整理器
 * 负责扫描、分类和整理项目文档
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import {
  DocumentFile,
  ClassifiedDocs,
  OrganizeOptions,
  OrganizeResult,
  FileMove,
  LinkUpdate,
  DocumentCategory
} from './types'
import { scanFiles, fileExists, ensureDir, readFile, safeWriteFile } from '../utils/fileUtils'

/**
 * 文档整理器类
 */
export class DocOrganizer {
  private readonly projectRoot: string
  private readonly excludePatterns: string[] = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.kiro/specs' // 保留功能规范文档
  ]

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * 扫描项目中的文档文件
   * @returns 文档文件列表
   */
  async scanDocuments(): Promise<DocumentFile[]> {
    const docExtensions = ['.md', '.txt']
    const allFiles = await scanFiles(this.projectRoot, docExtensions, this.excludePatterns)
    
    const documents: DocumentFile[] = []
    
    for (const filePath of allFiles) {
      const content = await readFile(filePath)
      const title = this.extractTitle(content, filePath)
      const category = this.determineCategory(filePath, content)
      
      documents.push({
        path: filePath,
        category,
        title
      })
    }
    
    return documents
  }

  /**
   * 按类型分类文档
   * @param docs 文档列表
   * @returns 分类后的文档
   */
  classifyDocuments(docs: DocumentFile[]): ClassifiedDocs {
    const classified: ClassifiedDocs = {
      deployment: [],
      development: [],
      features: [],
      planning: [],
      testing: [],
      other: []
    }
    
    for (const doc of docs) {
      classified[doc.category].push(doc)
    }
    
    return classified
  }

  /**
   * 基于路径和内容判断文档类别
   * @param filePath 文件路径
   * @param content 文件内容
   * @returns 文档类别
   */
  determineCategory(filePath: string, content: string): DocumentCategory {
    const pathLower = filePath.toLowerCase()
    const contentLower = content.toLowerCase()
    
    // 基于路径的分类（优先级更高）
    if (pathLower.includes('deploy') || pathLower.includes('server') || pathLower.includes('nginx')) {
      return 'deployment'
    }
    if (pathLower.includes('test') || pathLower.includes('e2e')) {
      return 'testing'
    }
    if (pathLower.includes('roadmap') || pathLower.includes('plan') || pathLower.includes('improvement')) {
      return 'planning'
    }
    if (pathLower.includes('game') || pathLower.includes('admin') || pathLower.includes('feature')) {
      return 'features'
    }
    if (pathLower.includes('develop') || pathLower.includes('standard') || pathLower.includes('migration') || pathLower.includes('maintenance')) {
      return 'development'
    }
    
    // 基于内容的分类（次要）
    const deploymentKeywords = ['部署', '服务器', 'deployment', 'server', 'nginx', 'docker']
    const testingKeywords = ['测试', 'test', 'e2e', 'integration', 'unit test']
    const planningKeywords = ['规划', '路线图', 'roadmap', 'plan', '改进', 'improvement']
    const featuresKeywords = ['功能', '游戏', 'feature', 'game', '管理系统', 'admin']
    const developmentKeywords = ['开发', '标准', 'development', 'standard', '迁移', 'migration', '维护', 'maintenance']
    
    if (this.containsKeywords(contentLower, deploymentKeywords)) {
      return 'deployment'
    }
    if (this.containsKeywords(contentLower, testingKeywords)) {
      return 'testing'
    }
    if (this.containsKeywords(contentLower, planningKeywords)) {
      return 'planning'
    }
    if (this.containsKeywords(contentLower, featuresKeywords)) {
      return 'features'
    }
    if (this.containsKeywords(contentLower, developmentKeywords)) {
      return 'development'
    }
    
    return 'other'
  }

  /**
   * 检查内容是否包含关键词
   */
  private containsKeywords(content: string, keywords: string[]): boolean {
    return keywords.some(keyword => content.includes(keyword))
  }

  /**
   * 从文档内容中提取标题
   * @param content 文档内容
   * @param filePath 文件路径（作为后备）
   * @returns 文档标题
   */
  private extractTitle(content: string, filePath: string): string {
    // 尝试从 Markdown 标题提取
    const lines = content.split('\n')
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/)
      if (match) {
        return match[1].trim()
      }
    }
    
    // 如果没有找到标题，使用文件名
    return path.basename(filePath, path.extname(filePath))
  }

  /**
   * 整理文档结构（主流程）
   * @param options 整理选项
   * @returns 整理结果
   */
  async organize(options: OrganizeOptions): Promise<OrganizeResult> {
    const { dryRun, backup, updateLinks } = options
    const movedFiles: FileMove[] = []
    const updatedLinks: LinkUpdate[] = []

    try {
      // 1. 扫描文档
      const documents = await this.scanDocuments()
      
      // 2. 分类文档
      const classified = this.classifyDocuments(documents)

      // 3. 创建目标目录结构
      const targetDirs = [
        'docs/deployment',
        'docs/development',
        'docs/features',
        'docs/planning',
        'docs/testing'
      ]

      if (!dryRun) {
        for (const dir of targetDirs) {
          const fullPath = path.join(this.projectRoot, dir)
          await ensureDir(fullPath)
        }
      }

      // 4. 准备文件移动计划
      const movePlan: FileMove[] = []
      const categoryDirMap: Record<string, string> = {
        deployment: 'docs/deployment',
        development: 'docs/development',
        features: 'docs/features',
        planning: 'docs/planning',
        testing: 'docs/testing',
        other: 'docs'
      }

      for (const [category, docs] of Object.entries(classified)) {
        const targetDir = categoryDirMap[category]
        
        for (const doc of docs) {
          // 跳过已经在目标位置的文档
          const relativePath = path.relative(this.projectRoot, doc.path)
          if (relativePath.startsWith(targetDir)) {
            continue
          }

          const fileName = path.basename(doc.path)
          const targetPath = path.join(this.projectRoot, targetDir, fileName)

          movePlan.push({
            from: doc.path,
            to: targetPath
          })
        }
      }

      // 5. 创建备份（如果需要）
      if (backup && !dryRun) {
        const backupDir = path.join(this.projectRoot, '.backup', `docs-${Date.now()}`)
        await ensureDir(backupDir)

        for (const move of movePlan) {
          if (await fileExists(move.from)) {
            const backupPath = path.join(backupDir, path.basename(move.from))
            await fs.copyFile(move.from, backupPath)
          }
        }
      }

      // 6. 执行文件移动（如果不是 dry-run）
      if (!dryRun) {
        const pathResolver = new (await import('./PathResolver')).PathResolver(this.projectRoot)
        
        for (const move of movePlan) {
          try {
            await pathResolver.moveFile(move.from, move.to, true)
            movedFiles.push(move)
          } catch (error) {
            console.error(`移动文件失败: ${move.from} -> ${move.to}`, error)
          }
        }
      } else {
        // dry-run 模式：只记录计划，不实际移动
        movedFiles.push(...movePlan)
      }

      // 7. 更新文档链接（如果需要）
      if (updateLinks && !dryRun && movedFiles.length > 0) {
        const pathResolver = new (await import('./PathResolver')).PathResolver(this.projectRoot)
        
        // 构建移动映射
        const moveMap = new Map<string, string>()
        for (const move of movedFiles) {
          moveMap.set(move.from, move.to)
        }

        // 获取所有需要更新的文档
        const allDocPaths = documents.map(doc => doc.path)
        const linksUpdates = await pathResolver.updateAllLinks(allDocPaths, moveMap)
        updatedLinks.push(...linksUpdates)
      }

      // 8. 生成文档索引（dry-run 模式下跳过）
      let indexPath = ''
      if (!dryRun) {
        const indexGenerator = new (await import('./IndexGenerator')).IndexGenerator(this.projectRoot)
        indexPath = await indexGenerator.generateIndex(classified)
      }

      return {
        success: true,
        movedFiles,
        updatedLinks,
        indexPath
      }
    } catch (error) {
      console.error('文档整理失败:', error)
      return {
        success: false,
        movedFiles,
        updatedLinks,
        indexPath: ''
      }
    }
  }
}
