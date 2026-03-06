/**
 * 技能树类型定义
 * Skill Tree Type Definitions
 * 
 * 用于以径向树状图形式展示技能的层级关系
 * Used to display skill hierarchy in radial tree format
 */

/**
 * 技能树节点接口
 * Skill Tree Node Interface
 */
export interface SkillTreeNode {
  /** 节点唯一标识 */
  id: string
  /** 技能名称 */
  name: string
  /** 熟练度等级 (0-100) */
  level: number
  /** 使用年限（可选） */
  experience?: string
  /** 子节点（可选） */
  children?: SkillTreeNode[]
}

/**
 * 技能树配置接口
 * Skill Tree Configuration Interface
 */
export interface SkillTreeConfig {
  /** 布局类型：径向布局或正交布局 */
  layout: 'radial' | 'orthogonal'
  /** 默认展开层级 */
  expandLevel: number
  /** 根据熟练度计算节点大小的函数 */
  nodeSize: (level: number) => number
}

/**
 * 默认技能树配置
 * Default Skill Tree Configuration
 */
export const defaultSkillTreeConfig: SkillTreeConfig = {
  layout: 'radial',
  expandLevel: 2,
  nodeSize: (level: number) => {
    // 根据熟练度计算节点大小
    // 最小 10px，最大 30px，线性映射
    const minSize = 10
    const maxSize = 30
    return minSize + (level / 100) * (maxSize - minSize)
  },
}

/**
 * 技能树展开状态接口
 * Skill Tree Expand State Interface
 */
export interface SkillTreeExpandState {
  /** 已展开的节点 ID 集合 */
  expandedNodes: Set<string>
}

/**
 * 技能树节点详情接口（用于悬停显示）
 * Skill Tree Node Detail Interface (for hover display)
 */
export interface SkillTreeNodeDetail {
  /** 节点 ID */
  id: string
  /** 技能名称 */
  name: string
  /** 熟练度等级 */
  level: number
  /** 使用年限 */
  experience?: string
  /** 子技能数量 */
  childCount: number
}
