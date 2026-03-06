/**
 * 类型定义文件
 * 定义所有数据模型和 API 响应类型
 */

// ========== 通用类型 ==========

/** API 响应基础结构 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

/** 分页参数 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// ========== 认证相关 ==========

/** 用户信息 */
export interface User {
  id: number
  username: string
  lastLogin?: string
}

/** 登录请求 */
export interface LoginRequest {
  username: string
  password: string
}

/** 登录响应 */
export interface LoginResponse {
  token: string
  user: User
}

// ========== 数据看板 ==========

/** 统计数据 */
export interface DashboardStats {
  pv: {
    today: number
    week: number
    month: number
  }
  uv: {
    today: number
    week: number
    month: number
  }
  messages: {
    total: number
    unread: number
  }
  downloads: number
  game: {
    triggers: number
    completions: number
  }
  /** 游戏统计数据（需求 2.2.4） */
  gameStats?: {
    totalPlayers: number
    averageScore: number
    highestScore: number
    todayPlayers: number
  }
}

/** 访问趋势数据 */
export interface VisitTrend {
  date: string
  pv: number
  uv: number
}

/** 页面分布数据 */
export interface PageDistribution {
  page: string
  count: number
}

/** 来源分析数据 */
export interface SourceAnalysis {
  devices: Array<{ type: string; count: number }>
  browsers: Array<{ name: string; count: number }>
}

/** 最近访问记录 */
export interface RecentVisit {
  id: number
  page: string
  ip: string
  deviceType: string
  browser: string
  createdAt: string
}

// ========== 内容管理 ==========

/** 个人信息 */
export interface Profile {
  name: string
  title: string
  phone: string
  email: string
  avatar: string
  summary: string
  jobIntentions: string[]
}

/** 教育经历 */
export interface Education {
  id: string
  school: string
  college: string
  major: string
  period: string
  rank?: string
  honors: string[]
  courses: Array<{ name: string; score: number }>
  sortOrder: number
}

/** 工作经历 */
export interface Experience {
  id: string
  company: string
  position: string
  period: string
  responsibilities: string[]
  achievements: Array<{ metric: string; value: string }>
  sortOrder: number
}

/** 技能 */
export interface Skill {
  id: number
  name: string
  level: number
  category: 'frontend' | 'backend' | 'tools' | 'other'
  experience: string
  projects: string[]
  sortOrder: number
}

/** 技能树节点 */
export interface SkillTreeNode {
  id: string
  parentId: string | null
  name: string
  level: number
  experience: string
  sortOrder: number
  children?: SkillTreeNode[]
}

/** 项目 */
export interface Project {
  id: string
  name: string
  description: string
  period: string
  role: string
  technologies: string[]
  highlights: string[]
  screenshots: string[]
  demoUrl: string
  sourceUrl: string
  category: 'work' | 'personal' | 'opensource'
  sortOrder: number
}

/** 校园经历 */
export interface CampusExperience {
  id: number
  organization: string
  position: string
  period: string
  sortOrder: number
}

// ========== 留言管理 ==========

/** 留言状态 */
export type MessageStatus = 'unread' | 'read'

/** 留言 */
export interface Message {
  id: number
  nickname: string
  contact: string
  content: string
  status: MessageStatus
  filePath: string
  createdAt: string
  readAt?: string
}

/** 留言筛选参数 */
export interface MessageFilter {
  status?: MessageStatus | 'all'
  startDate?: string
  endDate?: string
  keyword?: string
}

// ========== 文件管理 ==========

/** 文件信息 */
export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: string
  children?: FileInfo[]
}

/** 简历版本 */
export interface ResumeVersion {
  id: number
  version: number
  filename: string
  filePath: string
  fileSize: number
  isActive: boolean
  downloadCount: number
  createdAt: string
}

// ========== 游戏管理 ==========

/** 排行榜记录 */
export interface LeaderboardEntry {
  id: number
  playerName: string
  score: number
  stage: number
  playTime: number
  createdAt: string
}

/** 成就 */
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  conditionType: string
  conditionValue: number
  sortOrder: number
}

/** 游戏配置 */
export interface GameConfig {
  enabled: boolean
  debugMode: boolean
  basic: {
    playerInitialHealth: number
    playerInitialSpeed: number
    nukeMaxProgress: number
    enemySpawnRate: number
    stageTotalEnemies: number
  }
  advanced?: Record<string, any>
}

// ========== SEO 管理 ==========

/** 页面 Meta 配置 */
export interface PageMeta {
  page: string
  title: string
  description: string
  keywords: string
  ogTitle: string
  ogDescription: string
  ogImage: string
}

/** Sitemap 配置 */
export interface SitemapConfig {
  pages: Array<{
    url: string
    priority: number
    changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  }>
}

/** Schema 配置 */
export interface SchemaConfig {
  person: Record<string, any>
  website: Record<string, any>
  breadcrumb: Record<string, any>
}
