/**
 * useProjectFilter Composable
 * 
 * 项目筛选 Composable，提供按技术栈和分类筛选项目的功能。
 * 
 * 功能：
 * - 支持按技术栈筛选（检查 technologies 数组是否包含指定技术）
 * - 支持按分类筛选（work/personal/open-source）
 * - 支持组合筛选（同时按技术栈和分类筛选）
 * - 返回筛选后的项目列表
 * 
 * 验证需求：
 * - 需求 5.5: 点击技术栈标签时筛选显示使用该技术的所有项目
 */

import { computed, ref, type Ref, type ComputedRef } from 'vue'
import type { Project, ProjectFilter } from '@/types/project'

/**
 * 项目筛选结果接口
 */
export interface ProjectFilterResult {
  /** 筛选后的项目列表 */
  filteredProjects: ComputedRef<Project[]>
  /** 当前筛选条件 */
  filter: Ref<ProjectFilter>
  /** 设置筛选条件 */
  setFilter: (newFilter: ProjectFilter) => void
  /** 按技术栈筛选 */
  filterByTechnology: (technology: string) => void
  /** 按分类筛选 */
  filterByCategory: (category: Project['category']) => void
  /** 清除筛选条件 */
  clearFilter: () => void
  /** 获取所有可用的技术栈标签 */
  availableTechnologies: ComputedRef<string[]>
  /** 获取所有可用的分类 */
  availableCategories: ComputedRef<Project['category'][]>
  /** 是否有激活的筛选条件 */
  hasActiveFilter: ComputedRef<boolean>
}

/**
 * 项目筛选 Composable
 * 
 * @param projects - 项目数组（可以是响应式引用或普通数组）
 * @param initialFilter - 初始筛选条件（可选）
 * @returns 项目筛选相关的响应式状态和方法
 * 
 * @example
 * ```typescript
 * import { useProjectFilter } from '@/composables/useProjectFilter'
 * import { projectsData } from '@/data/profile'
 * 
 * // 基本用法
 * const { filteredProjects, filterByTechnology, clearFilter } = useProjectFilter(projectsData)
 * 
 * // 按技术栈筛选
 * filterByTechnology('Vue 3')
 * 
 * // 按分类筛选
 * filterByCategory('work')
 * 
 * // 组合筛选
 * setFilter({ technology: 'TypeScript', category: 'personal' })
 * 
 * // 清除筛选
 * clearFilter()
 * ```
 */
export function useProjectFilter(
  projects: Project[] | Ref<Project[]>,
  initialFilter: ProjectFilter = {}
): ProjectFilterResult {
  // 当前筛选条件
  const filter = ref<ProjectFilter>({ ...initialFilter })

  // 获取项目数组（支持响应式和非响应式输入）
  const projectList = computed<Project[]>(() => {
    if (Array.isArray(projects)) {
      return projects
    }
    return projects.value
  })

  /**
   * 筛选后的项目列表
   * 
   * 筛选逻辑：
   * 1. 如果指定了技术栈，检查项目的 technologies 数组是否包含该技术（不区分大小写）
   * 2. 如果指定了分类，检查项目的 category 是否匹配
   * 3. 如果同时指定了技术栈和分类，两个条件都必须满足
   * 
   * 验证: 需求 5.5 - 筛选显示使用该技术的所有项目
   */
  const filteredProjects = computed<Project[]>(() => {
    let result = projectList.value

    // 按技术栈筛选
    if (filter.value.technology) {
      const tech = filter.value.technology.toLowerCase()
      result = result.filter((project) =>
        project.technologies.some(
          (t) => t.toLowerCase() === tech
        )
      )
    }

    // 按分类筛选
    if (filter.value.category) {
      result = result.filter(
        (project) => project.category === filter.value.category
      )
    }

    return result
  })

  /**
   * 设置筛选条件
   * 
   * @param newFilter - 新的筛选条件
   */
  const setFilter = (newFilter: ProjectFilter): void => {
    filter.value = { ...newFilter }
  }

  /**
   * 按技术栈筛选
   * 
   * @param technology - 技术栈名称
   * 
   * 验证: 需求 5.5 - 点击技术栈标签时筛选
   */
  const filterByTechnology = (technology: string): void => {
    filter.value = {
      ...filter.value,
      technology,
    }
  }

  /**
   * 按分类筛选
   * 
   * @param category - 项目分类
   */
  const filterByCategory = (category: Project['category']): void => {
    filter.value = {
      ...filter.value,
      category,
    }
  }

  /**
   * 清除筛选条件
   */
  const clearFilter = (): void => {
    filter.value = {}
  }

  /**
   * 获取所有可用的技术栈标签
   * 从所有项目中提取并去重
   */
  const availableTechnologies = computed<string[]>(() => {
    const techSet = new Set<string>()
    projectList.value.forEach((project) => {
      project.technologies.forEach((tech) => {
        techSet.add(tech)
      })
    })
    return Array.from(techSet).sort()
  })

  /**
   * 获取所有可用的分类
   * 从所有项目中提取并去重
   */
  const availableCategories = computed<Project['category'][]>(() => {
    const categorySet = new Set<Project['category']>()
    projectList.value.forEach((project) => {
      categorySet.add(project.category)
    })
    return Array.from(categorySet)
  })

  /**
   * 是否有激活的筛选条件
   */
  const hasActiveFilter = computed<boolean>(() => {
    return !!(filter.value.technology || filter.value.category)
  })

  return {
    filteredProjects,
    filter,
    setFilter,
    filterByTechnology,
    filterByCategory,
    clearFilter,
    availableTechnologies,
    availableCategories,
    hasActiveFilter,
  }
}

/**
 * 纯函数版本的项目筛选
 * 用于属性测试和不需要响应式的场景
 * 
 * @param projects - 项目数组
 * @param filter - 筛选条件
 * @returns 筛选后的项目数组
 */
export function filterProjects(
  projects: Project[],
  filter: ProjectFilter
): Project[] {
  let result = projects

  // 按技术栈筛选
  if (filter.technology) {
    const tech = filter.technology.toLowerCase()
    result = result.filter((project) =>
      project.technologies.some(
        (t) => t.toLowerCase() === tech
      )
    )
  }

  // 按分类筛选
  if (filter.category) {
    result = result.filter(
      (project) => project.category === filter.category
    )
  }

  return result
}

export default useProjectFilter
