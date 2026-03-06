/**
 * 文档索引生成器
 * 负责生成文档索引和目录结构图
 */

import * as path from 'path'
import { ClassifiedDocs, DocumentFile } from './types'
import { safeWriteFile } from '../utils/fileUtils'

/**
 * 文档索引生成器类
 */
export class IndexGenerator {
  private readonly projectRoot: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * 生成文档索引文件
   * @param docs 分类后的文档
   * @param outputPath 输出路径（默认为 docs/README.md）
   * @returns 索引文件路径
   */
  async generateIndex(docs: ClassifiedDocs, outputPath?: string): Promise<string> {
    const indexPath = outputPath || path.join(this.projectRoot, 'docs', 'README.md')
    
    let content = '# 文档索引\n\n'
    content += '本文档提供项目所有文档的索引和导航。\n\n'
    content += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`
    content += '---\n\n'

    // 生成各类别的文档列表
    const categories = [
      { key: 'deployment' as const, title: '## 部署文档', description: '服务器部署、配置和运维相关文档' },
      { key: 'development' as const, title: '## 开发文档', description: '开发规范、迁移指南和维护文档' },
      { key: 'features' as const, title: '## 功能文档', description: '功能说明和系统文档' },
      { key: 'planning' as const, title: '## 规划文档', description: '项目规划和改进计划' },
      { key: 'testing' as const, title: '## 测试文档', description: '测试指南和测试报告' },
      { key: 'other' as const, title: '## 其他文档', description: '未分类的文档' }
    ]

    for (const category of categories) {
      const categoryDocs = docs[category.key]
      
      if (categoryDocs.length === 0) {
        continue
      }

      content += `${category.title}\n\n`
      content += `${category.description}\n\n`

      for (const doc of categoryDocs) {
        const relativePath = path.relative(path.dirname(indexPath), doc.path).replace(/\\/g, '/')
        content += `- [${doc.title}](${relativePath})\n`
      }

      content += '\n'
    }

    // 生成目录结构图
    content += '## 文档目录结构\n\n'
    content += '```\n'
    content += this.generateStructureDiagram(docs)
    content += '```\n\n'

    // 写入文件
    await safeWriteFile(indexPath, content)

    return indexPath
  }

  /**
   * 生成目录结构图
   * @param docs 分类后的文档
   * @returns 目录结构的文本表示
   */
  generateStructureDiagram(docs: ClassifiedDocs): string {
    const tree: Record<string, string[]> = {}

    // 收集所有文档路径
    const allDocs = [
      ...docs.deployment,
      ...docs.development,
      ...docs.features,
      ...docs.planning,
      ...docs.testing,
      ...docs.other
    ]

    // 按目录组织文档
    for (const doc of allDocs) {
      const dir = path.dirname(doc.path)
      if (!tree[dir]) {
        tree[dir] = []
      }
      tree[dir].push(path.basename(doc.path))
    }

    // 生成树形结构
    let diagram = 'docs/\n'
    
    // 按目录排序
    const sortedDirs = Object.keys(tree).sort()
    
    for (const dir of sortedDirs) {
      const files = tree[dir].sort()
      const relativePath = path.relative(this.projectRoot, dir)
      
      // 跳过根目录
      if (relativePath === '' || relativePath === '.') {
        for (const file of files) {
          diagram += `├── ${file}\n`
        }
        continue
      }

      // 计算缩进级别
      const depth = relativePath.split(path.sep).length
      const indent = '│   '.repeat(depth - 1)
      
      // 添加目录
      const dirName = path.basename(dir)
      diagram += `${indent}├── ${dirName}/\n`
      
      // 添加文件
      for (let i = 0; i < files.length; i++) {
        const isLast = i === files.length - 1
        const filePrefix = isLast ? '└──' : '├──'
        diagram += `${indent}│   ${filePrefix} ${files[i]}\n`
      }
    }

    return diagram
  }

  /**
   * 生成简化的目录结构图（仅显示目录层级）
   * @param docs 分类后的文档
   * @returns 简化的目录结构
   */
  generateSimpleDiagram(docs: ClassifiedDocs): string {
    const categories = [
      { key: 'deployment' as const, name: 'deployment' },
      { key: 'development' as const, name: 'development' },
      { key: 'features' as const, name: 'features' },
      { key: 'planning' as const, name: 'planning' },
      { key: 'testing' as const, name: 'testing' }
    ]

    let diagram = 'docs/\n'
    diagram += '├── README.md (本文件)\n'

    for (const category of categories) {
      const categoryDocs = docs[category.key]
      if (categoryDocs.length > 0) {
        diagram += `├── ${category.name}/ (${categoryDocs.length} 个文档)\n`
      }
    }

    return diagram
  }

  /**
   * 生成文档统计信息
   * @param docs 分类后的文档
   * @returns 统计信息的 Markdown 文本
   */
  generateStatistics(docs: ClassifiedDocs): string {
    const total =
      docs.deployment.length +
      docs.development.length +
      docs.features.length +
      docs.planning.length +
      docs.testing.length +
      docs.other.length

    let stats = '## 文档统计\n\n'
    stats += `- 文档总数：${total}\n`
    stats += `- 部署文档：${docs.deployment.length}\n`
    stats += `- 开发文档：${docs.development.length}\n`
    stats += `- 功能文档：${docs.features.length}\n`
    stats += `- 规划文档：${docs.planning.length}\n`
    stats += `- 测试文档：${docs.testing.length}\n`
    stats += `- 其他文档：${docs.other.length}\n\n`

    return stats
  }
}
