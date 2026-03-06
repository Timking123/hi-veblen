// Data Models

export interface Profile {
  // 基本信息
  name: string
  title: string
  phone: string
  email: string
  avatar: string

  // 个人简介
  summary: string

  // 求职意向
  jobIntentions: string[]

  // 教育经历
  education: Education[]

  // 工作经历
  experience: Experience[]

  // 技能
  skills: Skill[]

  // 校园经历
  campusExperience: CampusExperience[]
}

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

export interface Course {
  name: string
  score: number
}

export interface Experience {
  id: string
  company: string
  position: string
  period: string
  responsibilities: string[]
  achievements?: Achievement[]
}

export interface Achievement {
  metric: string
  value: number | string
}

export interface Skill {
  name: string
  level: number
  category: 'frontend' | 'backend' | 'tools' | 'other'
  experience: string
  projects: string[]
}

export interface CampusExperience {
  organization: string
  position: string
  period: string
}

// Component Props

export interface NavigationProps {
  fixed?: boolean
  transparent?: boolean
}

export interface MenuItem {
  name: string
  path: string
  icon?: string
}

export interface TransitionProps {
  mode?: 'fade' | 'slide' | 'zoom'
  duration?: number
}

export interface SkillChartProps {
  skills: Skill[]
  type: 'bar' | 'radar'
}

export interface TimelineItem {
  id: string
  title: string
  subtitle: string
  period: string
  description: string
  details?: string[]
  expanded?: boolean
}

export interface TimelineProps {
  items: TimelineItem[]
  layout: 'vertical' | 'horizontal'
}

export interface ContactFormData {
  name: string
  email: string
  message: string
}

/**
 * 留言表单数据接口
 * 用于新的留言功能（替换 ContactFormData）
 * 
 * @description
 * - nickname: 留言者称呼（原"姓名"字段）
 * - contact: 联系方式，支持电话/邮箱/微信等（原"邮箱"字段）
 * - message: 留言内容
 * 
 * @see Requirements 2.1, 2.2
 */
export interface MessageFormData {
  /** 留言者称呼 */
  nickname: string
  /** 联系方式（电话/邮箱/微信等） */
  contact: string
  /** 留言内容 */
  message: string
}

/**
 * 存储的留言数据接口
 * 包含留言的所有必要信息，用于本地存储
 * 
 * @description
 * 存储格式为最小空间的纯文本格式，每行一个字段：
 * - 第1行：称呼
 * - 第2行：联系方式
 * - 第3行：留言内容
 * - 第4行：时间戳
 * 
 * @see Requirements 3.3
 */
export interface StoredMessage {
  /** 留言者称呼 */
  nickname: string
  /** 联系方式（电话/邮箱/微信等） */
  contact: string
  /** 留言内容 */
  message: string
  /** 提交时间戳（ISO 格式） */
  timestamp: string
}

/**
 * 留言保存结果接口
 * 表示留言保存操作的结果
 * 
 * @description
 * - success: 操作是否成功
 * - filename: 成功时返回生成的文件名（格式：YYYY-MM-DD_称呼.txt）
 * - error: 失败时返回错误信息
 * 
 * @see Requirements 3.3
 */
export interface SaveResult {
  /** 是否保存成功 */
  success: boolean
  /** 保存成功时的文件名（格式：YYYY-MM-DD_称呼.txt） */
  filename?: string
  /** 保存失败时的错误信息 */
  error?: string
}

export interface ValidationRule {
  required?: boolean
  pattern?: RegExp
  message: string
}

export interface ParticleConfig {
  count: number
  color: string
  speed: number
  size: number
}
