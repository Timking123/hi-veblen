/**
 * 项目展示模块类型定义
 * Project showcase module type definitions
 */

/**
 * 项目接口
 * 定义项目的完整数据结构，包含截图、演示链接等
 */
export interface Project {
  /** 项目唯一标识 */
  id: string
  /** 项目名称 */
  name: string
  /** 项目描述 */
  description: string
  /** 项目时间段 */
  period: string
  /** 担任角色 */
  role: string
  /** 使用的技术栈 */
  technologies: string[]
  /** 项目亮点 */
  highlights: string[]
  /** 项目截图 URL 列表 */
  screenshots: string[]
  /** 演示链接（可选） */
  demoUrl?: string
  /** 源代码链接（可选） */
  sourceUrl?: string
  /** 项目分类 */
  category: 'work' | 'personal' | 'open-source'
}

/**
 * 项目筛选条件接口
 * 用于按技术栈或分类筛选项目
 */
export interface ProjectFilter {
  /** 按技术栈筛选 */
  technology?: string
  /** 按项目分类筛选 */
  category?: Project['category']
}

/**
 * 项目分类标签映射
 * 用于显示友好的分类名称
 */
export const PROJECT_CATEGORY_LABELS: Record<Project['category'], string> = {
  work: '工作项目',
  personal: '个人项目',
  'open-source': '开源项目',
}
