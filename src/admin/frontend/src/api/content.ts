/**
 * 内容管理 API 接口
 * 提供内容管理相关的 API 调用
 * 
 * 需求: 3.1.1-3.7.3
 */
import request from './request'
import type {
  Profile,
  Education,
  Experience,
  Skill,
  SkillTreeNode,
  Project,
  CampusExperience
} from '@/types'

// ========== 个人信息 API ==========

/**
 * 获取个人信息
 */
export function getProfile() {
  return request.get<{ profile: Profile }>('/content/profile')
}

/**
 * 更新个人信息
 */
export function updateProfile(data: Partial<Profile>) {
  return request.put<{ success: boolean }>('/content/profile', data)
}

// ========== 教育经历 API ==========

/**
 * 获取教育经历列表
 */
export function getEducationList() {
  return request.get<{ data: Education[] }>('/content/education')
}

/**
 * 添加教育经历
 */
export function createEducation(data: Omit<Education, 'id'>) {
  return request.post<{ id: string }>('/content/education', data)
}

/**
 * 更新教育经历
 */
export function updateEducation(id: string, data: Partial<Education>) {
  return request.put<{ success: boolean }>(`/content/education/${id}`, data)
}

/**
 * 删除教育经历
 */
export function deleteEducation(id: string) {
  return request.delete<{ success: boolean }>(`/content/education/${id}`)
}

/**
 * 批量导入课程成绩
 * 支持 Excel (.xlsx, .xls) 和 CSV 文件格式
 * 需求: 3.2.2
 */
export function importCourses(educationId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<{
    success: boolean
    imported: number
    total: number
    courses: Array<{ name: string; score: number }>
    message: string
  }>(`/content/education/${educationId}/import-courses`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// ========== 工作经历 API ==========

/**
 * 获取工作经历列表
 */
export function getExperienceList() {
  return request.get<{ data: Experience[] }>('/content/experience')
}

/**
 * 添加工作经历
 */
export function createExperience(data: Omit<Experience, 'id'>) {
  return request.post<{ id: string }>('/content/experience', data)
}

/**
 * 更新工作经历
 */
export function updateExperience(id: string, data: Partial<Experience>) {
  return request.put<{ success: boolean }>(`/content/experience/${id}`, data)
}

/**
 * 删除工作经历
 */
export function deleteExperience(id: string) {
  return request.delete<{ success: boolean }>(`/content/experience/${id}`)
}

// ========== 技能 API ==========

/**
 * 获取技能列表
 */
export function getSkillList(category?: string) {
  return request.get<{ data: Skill[] }>('/content/skills', { params: { category } })
}

/**
 * 添加技能
 */
export function createSkill(data: Omit<Skill, 'id'>) {
  return request.post<{ id: number }>('/content/skills', data)
}

/**
 * 更新技能
 */
export function updateSkill(id: number, data: Partial<Skill>) {
  return request.put<{ success: boolean }>(`/content/skills/${id}`, data)
}

/**
 * 删除技能
 */
export function deleteSkill(id: number) {
  return request.delete<{ success: boolean }>(`/content/skills/${id}`)
}

// ========== 技能树 API ==========

/**
 * 获取技能树
 */
export function getSkillTree() {
  return request.get<{ data: SkillTreeNode[] }>('/content/skill-tree')
}

/**
 * 添加技能树节点
 */
export function createSkillTreeNode(data: Omit<SkillTreeNode, 'id'>) {
  return request.post<{ id: string }>('/content/skill-tree', data)
}

/**
 * 更新技能树节点
 */
export function updateSkillTreeNode(id: string, data: Partial<SkillTreeNode>) {
  return request.put<{ success: boolean }>(`/content/skill-tree/${id}`, data)
}

/**
 * 删除技能树节点
 */
export function deleteSkillTreeNode(id: string) {
  return request.delete<{ success: boolean }>(`/content/skill-tree/${id}`)
}

// ========== 项目 API ==========

/**
 * 获取项目列表
 */
export function getProjectList(category?: string) {
  return request.get<{ data: Project[] }>('/content/projects', { params: { category } })
}

/**
 * 添加项目
 */
export function createProject(data: Omit<Project, 'id'>) {
  return request.post<{ id: string }>('/content/projects', data)
}

/**
 * 更新项目
 */
export function updateProject(id: string, data: Partial<Project>) {
  return request.put<{ success: boolean }>(`/content/projects/${id}`, data)
}

/**
 * 删除项目
 */
export function deleteProject(id: string) {
  return request.delete<{ success: boolean }>(`/content/projects/${id}`)
}

// ========== 校园经历 API ==========

/**
 * 获取校园经历列表
 */
export function getCampusList() {
  return request.get<{ data: CampusExperience[] }>('/content/campus')
}

/**
 * 添加校园经历
 */
export function createCampus(data: Omit<CampusExperience, 'id'>) {
  return request.post<{ id: number }>('/content/campus', data)
}

/**
 * 更新校园经历
 */
export function updateCampus(id: number, data: Partial<CampusExperience>) {
  return request.put<{ success: boolean }>(`/content/campus/${id}`, data)
}

/**
 * 删除校园经历
 */
export function deleteCampus(id: number) {
  return request.delete<{ success: boolean }>(`/content/campus/${id}`)
}

// ========== 预览和发布 API ==========

/**
 * 预览数据
 */
export function getPreview() {
  return request.get<{ profile: any }>('/content/preview')
}

/**
 * 发布到前端
 */
export function publish() {
  return request.post<{ success: boolean; path: string; message: string }>('/content/publish')
}
