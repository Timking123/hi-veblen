/**
 * 后端数据类型定义
 * 从前端类型复制，用于数据导入功能
 * 
 * 注意：这些类型与前端 src/types 中的定义保持一致
 */

// ==================== 基础类型 ====================

/**
 * 课程接口
 */
export interface Course {
  name: string
  score: number
}

/**
 * 成就接口
 */
export interface Achievement {
  metric: string
  value: number | string
}

/**
 * 教育经历接口
 */
export interface Education {
  id: string
  school: string
  college: string
  major: string
  period: string
  rank: string
  honors: string[]
  courses: Course[]
}

/**
 * 工作经历接口
 */
export interface Experience {
  id: string
  company: string
  position: string
  period: string
  responsibilities: string[]
  achievements?: Achievement[]
}

/**
 * 技能接口
 */
export interface Skill {
  name: string
  level: number
  category: 'frontend' | 'backend' | 'tools' | 'other'
  experience: string
  projects: string[]
}

/**
 * 校园经历接口
 */
export interface CampusExperience {
  organization: string
  position: string
  period: string
}

/**
 * 个人信息接口
 */
export interface Profile {
  name: string
  title: string
  phone: string
  email: string
  avatar: string
  summary: string
  jobIntentions: string[]
  education: Education[]
  experience: Experience[]
  skills: Skill[]
  campusExperience: CampusExperience[]
}

// ==================== 项目类型 ====================

/**
 * 项目接口
 */
export interface Project {
  id: string
  name: string
  description: string
  period: string
  role: string
  technologies: string[]
  highlights: string[]
  screenshots: string[]
  demoUrl?: string
  sourceUrl?: string
  category: 'work' | 'personal' | 'open-source'
}

// ==================== 技能树类型 ====================

/**
 * 技能树节点接口
 */
export interface SkillTreeNode {
  id: string
  name: string
  level: number
  experience?: string
  children?: SkillTreeNode[]
}
