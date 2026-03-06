/**
 * 内容数据模型
 * 定义所有内容管理相关的 TypeScript 接口
 * 
 * 这些接口与数据库表结构对应，用于类型安全的数据操作
 * 
 * 需求: 3.1.1, 3.2.1, 3.3.1, 3.4.1, 3.5.1, 3.6.1
 */

// ========== 个人信息 (Profile) ==========

/**
 * 个人信息接口
 * 对应数据库表: profile
 * 
 * 需求: 3.1.1 - 提供基本信息编辑（姓名、职位、电话、邮箱）
 */
export interface Profile {
  /** 姓名 */
  name: string
  /** 职位/头衔 */
  title: string
  /** 电话号码 */
  phone: string | null
  /** 电子邮箱 */
  email: string | null
  /** 头像路径 */
  avatar: string | null
  /** 个人简介 */
  summary: string | null
  /** 求职意向列表 */
  job_intentions: string[]
}

/**
 * 数据库中的个人信息记录
 * 包含数据库自动生成的字段
 */
export interface ProfileRecord extends Profile {
  /** 记录 ID（固定为 1，单行表） */
  id: 1
  /** 更新时间 */
  updated_at: string
}

/**
 * 数据库原始行数据（JSON 字段为字符串）
 */
export interface ProfileRow {
  id: number
  name: string
  title: string
  phone: string | null
  email: string | null
  avatar: string | null
  summary: string | null
  /** JSON 字符串格式的求职意向 */
  job_intentions: string | null
  updated_at: string
}

// ========== 教育经历 (Education) ==========

/**
 * 课程成绩接口
 */
export interface CourseScore {
  /** 课程名称 */
  name: string
  /** 课程成绩 */
  score: number
}

/**
 * 教育经历接口
 * 对应数据库表: education
 * 
 * 需求: 3.2.1 - 提供学校信息 CRUD 操作
 */
export interface Education {
  /** 唯一标识符 */
  id: string
  /** 学校名称 */
  school: string
  /** 学院名称 */
  college: string | null
  /** 专业名称 */
  major: string
  /** 就读时间段（如 "2018.09 - 2022.06"） */
  period: string
  /** 排名（如 "前 10%"） */
  rank: string | null
  /** 荣誉奖项列表 */
  honors: string[]
  /** 课程成绩列表 */
  courses: CourseScore[]
  /** 排序顺序（数值越小越靠前） */
  sort_order: number
}

/**
 * 数据库中的教育经历记录
 * 包含数据库自动生成的字段
 */
export interface EducationRecord extends Education {
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 数据库原始行数据（JSON 字段为字符串）
 */
export interface EducationRow {
  id: string
  school: string
  college: string | null
  major: string
  period: string
  rank: string | null
  /** JSON 字符串格式的荣誉列表 */
  honors: string | null
  /** JSON 字符串格式的课程列表 */
  courses: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ========== 工作经历 (Experience) ==========

/**
 * 工作成果接口
 */
export interface Achievement {
  /** 指标名称 */
  metric: string
  /** 指标值 */
  value: string
}

/**
 * 工作经历接口
 * 对应数据库表: experience
 * 
 * 需求: 3.3.1 - 提供公司/职位信息 CRUD 操作
 */
export interface Experience {
  /** 唯一标识符 */
  id: string
  /** 公司名称 */
  company: string
  /** 职位名称 */
  position: string
  /** 工作时间段（如 "2022.07 - 至今"） */
  period: string
  /** 工作职责列表 */
  responsibilities: string[]
  /** 工作成果列表 */
  achievements: Achievement[]
  /** 排序顺序（数值越小越靠前） */
  sort_order: number
}

/**
 * 数据库中的工作经历记录
 * 包含数据库自动生成的字段
 */
export interface ExperienceRecord extends Experience {
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 数据库原始行数据（JSON 字段为字符串）
 */
export interface ExperienceRow {
  id: string
  company: string
  position: string
  period: string
  /** JSON 字符串格式的职责列表 */
  responsibilities: string | null
  /** JSON 字符串格式的成果列表 */
  achievements: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ========== 技能 (Skill) ==========

/**
 * 技能分类类型
 */
export type SkillCategory = 'frontend' | 'backend' | 'tools' | 'other'

/**
 * 技能接口
 * 对应数据库表: skills
 * 
 * 需求: 3.4.1 - 提供技能列表 CRUD（名称、等级、分类、经验描述）
 */
export interface Skill {
  /** 唯一标识符（自增） */
  id: number
  /** 技能名称 */
  name: string
  /** 技能等级（0-100） */
  level: number
  /** 技能分类 */
  category: SkillCategory
  /** 经验描述 */
  experience: string | null
  /** 相关项目列表 */
  projects: string[]
  /** 排序顺序（数值越小越靠前） */
  sort_order: number
}

/**
 * 创建技能时的输入数据（不包含 id）
 */
export interface SkillInput {
  name: string
  level: number
  category: SkillCategory
  experience?: string | null
  projects?: string[]
  sort_order?: number
}

/**
 * 数据库中的技能记录
 * 包含数据库自动生成的字段
 */
export interface SkillRecord extends Skill {
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 数据库原始行数据（JSON 字段为字符串）
 */
export interface SkillRow {
  id: number
  name: string
  level: number
  category: string
  experience: string | null
  /** JSON 字符串格式的项目列表 */
  projects: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ========== 技能树节点 (SkillTreeNode) ==========

/**
 * 技能树节点接口
 * 对应数据库表: skill_tree
 * 
 * 需求: 3.4.2 - 提供技能树结构可视化编辑
 */
export interface SkillTreeNode {
  /** 唯一标识符 */
  id: string
  /** 父节点 ID（根节点为 null） */
  parent_id: string | null
  /** 节点名称 */
  name: string
  /** 技能等级（0-100） */
  level: number
  /** 经验描述 */
  experience: string | null
  /** 排序顺序（数值越小越靠前） */
  sort_order: number
}

/**
 * 带子节点的技能树节点（用于树形结构展示）
 */
export interface SkillTreeNodeWithChildren extends SkillTreeNode {
  /** 子节点列表 */
  children: SkillTreeNodeWithChildren[]
}

/**
 * 数据库原始行数据
 */
export interface SkillTreeNodeRow {
  id: string
  parent_id: string | null
  name: string
  level: number
  experience: string | null
  sort_order: number
}

// ========== 项目 (Project) ==========

/**
 * 项目分类类型
 */
export type ProjectCategory = 'work' | 'personal' | 'opensource'

/**
 * 项目接口
 * 对应数据库表: projects
 * 
 * 需求: 3.5.1 - 提供项目信息 CRUD 操作
 */
export interface Project {
  /** 唯一标识符 */
  id: string
  /** 项目名称 */
  name: string
  /** 项目描述 */
  description: string | null
  /** 项目时间段（如 "2023.01 - 2023.06"） */
  period: string | null
  /** 担任角色 */
  role: string | null
  /** 使用技术列表 */
  technologies: string[]
  /** 项目亮点列表 */
  highlights: string[]
  /** 项目截图路径列表 */
  screenshots: string[]
  /** 演示链接 */
  demo_url: string | null
  /** 源码链接 */
  source_url: string | null
  /** 项目分类 */
  category: ProjectCategory
  /** 排序顺序（数值越小越靠前） */
  sort_order: number
}

/**
 * 数据库中的项目记录
 * 包含数据库自动生成的字段
 */
export interface ProjectRecord extends Project {
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 数据库原始行数据（JSON 字段为字符串）
 */
export interface ProjectRow {
  id: string
  name: string
  description: string | null
  period: string | null
  role: string | null
  /** JSON 字符串格式的技术列表 */
  technologies: string | null
  /** JSON 字符串格式的亮点列表 */
  highlights: string | null
  /** JSON 字符串格式的截图列表 */
  screenshots: string | null
  demo_url: string | null
  source_url: string | null
  category: string
  sort_order: number
  created_at: string
  updated_at: string
}

// ========== 校园经历 (Campus) ==========

/**
 * 校园经历接口
 * 对应数据库表: campus_experience
 * 
 * 需求: 3.6.1 - 提供组织/职位信息 CRUD 操作
 */
export interface Campus {
  /** 唯一标识符（自增） */
  id: number
  /** 组织名称 */
  organization: string
  /** 职位名称 */
  position: string
  /** 任职时间段（如 "2019.09 - 2020.06"） */
  period: string
  /** 排序顺序（数值越小越靠前） */
  sort_order: number
}

/**
 * 创建校园经历时的输入数据（不包含 id）
 */
export interface CampusInput {
  organization: string
  position: string
  period: string
  sort_order?: number
}

/**
 * 数据库中的校园经历记录
 * 包含数据库自动生成的字段
 */
export interface CampusRecord extends Campus {
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 数据库原始行数据
 */
export interface CampusRow {
  id: number
  organization: string
  position: string
  period: string
  sort_order: number
  created_at: string
  updated_at: string
}

// ========== 工具函数类型 ==========

/**
 * 将数据库行数据转换为 Profile 接口
 */
export function parseProfileRow(row: ProfileRow): Profile {
  return {
    name: row.name,
    title: row.title,
    phone: row.phone,
    email: row.email,
    avatar: row.avatar,
    summary: row.summary,
    job_intentions: row.job_intentions ? JSON.parse(row.job_intentions) : []
  }
}

/**
 * 将数据库行数据转换为 Education 接口
 */
export function parseEducationRow(row: EducationRow): Education {
  return {
    id: row.id,
    school: row.school,
    college: row.college,
    major: row.major,
    period: row.period,
    rank: row.rank,
    honors: row.honors ? JSON.parse(row.honors) : [],
    courses: row.courses ? JSON.parse(row.courses) : [],
    sort_order: row.sort_order
  }
}

/**
 * 将数据库行数据转换为 Experience 接口
 */
export function parseExperienceRow(row: ExperienceRow): Experience {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    period: row.period,
    responsibilities: row.responsibilities ? JSON.parse(row.responsibilities) : [],
    achievements: row.achievements ? JSON.parse(row.achievements) : [],
    sort_order: row.sort_order
  }
}

/**
 * 将数据库行数据转换为 Skill 接口
 */
export function parseSkillRow(row: SkillRow): Skill {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    category: row.category as SkillCategory,
    experience: row.experience,
    projects: row.projects ? JSON.parse(row.projects) : [],
    sort_order: row.sort_order
  }
}

/**
 * 将数据库行数据转换为 Project 接口
 */
export function parseProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    period: row.period,
    role: row.role,
    technologies: row.technologies ? JSON.parse(row.technologies) : [],
    highlights: row.highlights ? JSON.parse(row.highlights) : [],
    screenshots: row.screenshots ? JSON.parse(row.screenshots) : [],
    demo_url: row.demo_url,
    source_url: row.source_url,
    category: row.category as ProjectCategory,
    sort_order: row.sort_order
  }
}

/**
 * 将数据库行数据转换为 Campus 接口
 */
export function parseCampusRow(row: CampusRow): Campus {
  return {
    id: row.id,
    organization: row.organization,
    position: row.position,
    period: row.period,
    sort_order: row.sort_order
  }
}

/**
 * 将数据库行数据转换为 SkillTreeNode 接口
 */
export function parseSkillTreeNodeRow(row: SkillTreeNodeRow): SkillTreeNode {
  return {
    id: row.id,
    parent_id: row.parent_id,
    name: row.name,
    level: row.level,
    experience: row.experience,
    sort_order: row.sort_order
  }
}

/**
 * 将扁平的技能树节点列表构建为树形结构
 */
export function buildSkillTree(nodes: SkillTreeNode[]): SkillTreeNodeWithChildren[] {
  // 创建节点映射
  const nodeMap = new Map<string, SkillTreeNodeWithChildren>()
  
  // 初始化所有节点
  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] })
  }
  
  // 构建树形结构
  const roots: SkillTreeNodeWithChildren[] = []
  
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!
    
    if (node.parent_id === null) {
      // 根节点
      roots.push(treeNode)
    } else {
      // 子节点，添加到父节点的 children 中
      const parent = nodeMap.get(node.parent_id)
      if (parent) {
        parent.children.push(treeNode)
      }
    }
  }
  
  // 对每个层级的节点按 sort_order 排序
  const sortChildren = (nodes: SkillTreeNodeWithChildren[]): void => {
    nodes.sort((a, b) => a.sort_order - b.sort_order)
    for (const node of nodes) {
      sortChildren(node.children)
    }
  }
  
  sortChildren(roots)
  
  return roots
}

// ========== 验证函数 ==========

/**
 * 验证技能等级是否有效（0-100）
 */
export function isValidSkillLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 0 && level <= 100
}

/**
 * 验证技能分类是否有效
 */
export function isValidSkillCategory(category: string): category is SkillCategory {
  return ['frontend', 'backend', 'tools', 'other'].includes(category)
}

/**
 * 验证项目分类是否有效
 */
export function isValidProjectCategory(category: string): category is ProjectCategory {
  return ['work', 'personal', 'opensource'].includes(category)
}

/**
 * 验证时间段格式是否有效（如 "2018.09 - 2022.06" 或 "2022.07 - 至今"）
 */
export function isValidPeriod(period: string): boolean {
  // 支持格式：YYYY.MM - YYYY.MM 或 YYYY.MM - 至今
  const periodRegex = /^\d{4}\.\d{2}\s*-\s*(\d{4}\.\d{2}|至今|present|Present)$/
  return periodRegex.test(period.trim())
}

/**
 * 验证邮箱格式是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证电话号码格式是否有效（中国大陆手机号）
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}
