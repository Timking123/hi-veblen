/**
 * 内容管理控制器模块
 * 处理 /api/content/* 路由的请求
 * 
 * 需求: 3.1.1-3.7.3 - 内容管理相关功能
 */

import { Request, Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import {
  // Profile
  getProfile,
  updateProfile,
  // Education
  getEducationList,
  getEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  // Experience
  getExperienceList,
  getExperience,
  createExperience,
  updateExperience,
  deleteExperience,
  // Skills
  getSkillList,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  // SkillTree
  getSkillTree,
  createSkillTreeNode,
  updateSkillTreeNode,
  deleteSkillTreeNode,
  // Projects
  getProjectList,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  // Campus
  getCampusList,
  getCampus,
  createCampus,
  updateCampus,
  deleteCampus,
  // Preview & Export
  getPreviewData,
  exportToProfileTs
} from '../services/content'
import {
  isValidSkillLevel,
  isValidSkillCategory,
  isValidProjectCategory,
  SkillCategory,
  ProjectCategory
} from '../models/content'

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: number
  message: string
  details?: {
    field?: string
    reason?: string
  }
}

/**
 * 发送错误响应
 */
function sendError(
  res: Response,
  code: number,
  message: string,
  details?: ErrorResponse['details']
): void {
  const errorResponse: ErrorResponse = { code, message }
  if (details) {
    errorResponse.details = details
  }
  res.status(code).json(errorResponse)
}

// ========== Profile（个人信息）路由处理 ==========

/**
 * 获取个人信息
 * GET /api/content/profile
 */
export async function getProfileHandler(_req: Request, res: Response): Promise<void> {
  try {
    const profile = getProfile()
    res.json({ profile })
  } catch (error) {
    console.error('获取个人信息错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新个人信息
 * PUT /api/content/profile
 */
export async function updateProfileHandler(req: Request, res: Response): Promise<void> {
  try {
    const profileData = req.body

    // 基本验证
    if (profileData.name !== undefined && typeof profileData.name !== 'string') {
      sendError(res, 400, '姓名格式无效', { field: 'name', reason: 'invalid_type' })
      return
    }

    if (profileData.title !== undefined && typeof profileData.title !== 'string') {
      sendError(res, 400, '职位格式无效', { field: 'title', reason: 'invalid_type' })
      return
    }

    const success = updateProfile(profileData)

    if (!success) {
      sendError(res, 500, '更新个人信息失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('更新个人信息错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== Education（教育经历）路由处理 ==========

/**
 * 获取教育经历列表
 * GET /api/content/education
 */
export async function getEducationListHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = getEducationList()
    res.json({ data })
  } catch (error) {
    console.error('获取教育经历列表错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 添加教育经历
 * POST /api/content/education
 */
export async function createEducationHandler(req: Request, res: Response): Promise<void> {
  try {
    const educationData = req.body

    // 必填字段验证
    if (!educationData.school || typeof educationData.school !== 'string') {
      sendError(res, 400, '请输入学校名称', { field: 'school', reason: 'required' })
      return
    }

    if (!educationData.major || typeof educationData.major !== 'string') {
      sendError(res, 400, '请输入专业名称', { field: 'major', reason: 'required' })
      return
    }

    if (!educationData.period || typeof educationData.period !== 'string') {
      sendError(res, 400, '请输入就读时间', { field: 'period', reason: 'required' })
      return
    }

    const id = createEducation(educationData)
    res.json({ id })
  } catch (error) {
    console.error('添加教育经历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新教育经历
 * PUT /api/content/education/:id
 */
export async function updateEducationHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const educationData = req.body

    if (!id) {
      sendError(res, 400, '缺少教育经历 ID')
      return
    }

    // 检查记录是否存在
    const existing = getEducation(id)
    if (!existing) {
      sendError(res, 404, '教育经历不存在')
      return
    }

    const success = updateEducation(id, educationData)

    if (!success) {
      sendError(res, 500, '更新教育经历失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('更新教育经历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 删除教育经历
 * DELETE /api/content/education/:id
 */
export async function deleteEducationHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id

    if (!id) {
      sendError(res, 400, '缺少教育经历 ID')
      return
    }

    // 检查记录是否存在
    const existing = getEducation(id)
    if (!existing) {
      sendError(res, 404, '教育经历不存在')
      return
    }

    const success = deleteEducation(id)

    if (!success) {
      sendError(res, 500, '删除教育经历失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('删除教育经历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== Experience（工作经历）路由处理 ==========

/**
 * 获取工作经历列表
 * GET /api/content/experience
 */
export async function getExperienceListHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = getExperienceList()
    res.json({ data })
  } catch (error) {
    console.error('获取工作经历列表错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 添加工作经历
 * POST /api/content/experience
 */
export async function createExperienceHandler(req: Request, res: Response): Promise<void> {
  try {
    const experienceData = req.body

    // 必填字段验证
    if (!experienceData.company || typeof experienceData.company !== 'string') {
      sendError(res, 400, '请输入公司名称', { field: 'company', reason: 'required' })
      return
    }

    if (!experienceData.position || typeof experienceData.position !== 'string') {
      sendError(res, 400, '请输入职位名称', { field: 'position', reason: 'required' })
      return
    }

    if (!experienceData.period || typeof experienceData.period !== 'string') {
      sendError(res, 400, '请输入工作时间', { field: 'period', reason: 'required' })
      return
    }

    const id = createExperience(experienceData)
    res.json({ id })
  } catch (error) {
    console.error('添加工作经历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新工作经历
 * PUT /api/content/experience/:id
 */
export async function updateExperienceHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const experienceData = req.body

    if (!id) {
      sendError(res, 400, '缺少工作经历 ID')
      return
    }

    // 检查记录是否存在
    const existing = getExperience(id)
    if (!existing) {
      sendError(res, 404, '工作经历不存在')
      return
    }

    const success = updateExperience(id, experienceData)

    if (!success) {
      sendError(res, 500, '更新工作经历失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('更新工作经历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 删除工作经历
 * DELETE /api/content/experience/:id
 */
export async function deleteExperienceHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id

    if (!id) {
      sendError(res, 400, '缺少工作经历 ID')
      return
    }

    // 检查记录是否存在
    const existing = getExperience(id)
    if (!existing) {
      sendError(res, 404, '工作经历不存在')
      return
    }

    const success = deleteExperience(id)

    if (!success) {
      sendError(res, 500, '删除工作经历失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('删除工作经历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== Skills（技能）路由处理 ==========

/**
 * 获取技能列表
 * GET /api/content/skills
 * 支持 category 查询参数筛选
 */
export async function getSkillListHandler(req: Request, res: Response): Promise<void> {
  try {
    const category = req.query.category as string | undefined

    // 验证分类参数
    if (category && !isValidSkillCategory(category)) {
      sendError(res, 400, '无效的技能分类', { field: 'category', reason: 'invalid_value' })
      return
    }

    const data = getSkillList(category as SkillCategory | undefined)
    res.json({ data })
  } catch (error) {
    console.error('获取技能列表错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 添加技能
 * POST /api/content/skills
 */
export async function createSkillHandler(req: Request, res: Response): Promise<void> {
  try {
    const skillData = req.body

    // 必填字段验证
    if (!skillData.name || typeof skillData.name !== 'string') {
      sendError(res, 400, '请输入技能名称', { field: 'name', reason: 'required' })
      return
    }

    if (skillData.level === undefined || typeof skillData.level !== 'number') {
      sendError(res, 400, '请输入技能等级', { field: 'level', reason: 'required' })
      return
    }

    if (!isValidSkillLevel(skillData.level)) {
      sendError(res, 400, '技能等级必须在 0-100 之间', { field: 'level', reason: 'invalid_range' })
      return
    }

    if (!skillData.category || !isValidSkillCategory(skillData.category)) {
      sendError(res, 400, '请选择有效的技能分类', { field: 'category', reason: 'invalid_value' })
      return
    }

    const id = createSkill(skillData)
    res.json({ id })
  } catch (error) {
    console.error('添加技能错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新技能
 * PUT /api/content/skills/:id
 */
export async function updateSkillHandler(req: Request, res: Response): Promise<void> {
  try {
    const idParam = req.params.id
    if (!idParam) {
      sendError(res, 400, '缺少技能 ID')
      return
    }

    const id = parseInt(idParam)
    const skillData = req.body

    if (isNaN(id)) {
      sendError(res, 400, '无效的技能 ID')
      return
    }

    // 检查记录是否存在
    const existing = getSkill(id)
    if (!existing) {
      sendError(res, 404, '技能不存在')
      return
    }

    // 验证等级
    if (skillData.level !== undefined && !isValidSkillLevel(skillData.level)) {
      sendError(res, 400, '技能等级必须在 0-100 之间', { field: 'level', reason: 'invalid_range' })
      return
    }

    // 验证分类
    if (skillData.category !== undefined && !isValidSkillCategory(skillData.category)) {
      sendError(res, 400, '无效的技能分类', { field: 'category', reason: 'invalid_value' })
      return
    }

    const success = updateSkill(id, skillData)

    if (!success) {
      sendError(res, 500, '更新技能失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('更新技能错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 删除技能
 * DELETE /api/content/skills/:id
 */
export async function deleteSkillHandler(req: Request, res: Response): Promise<void> {
  try {
    const idParam = req.params.id
    if (!idParam) {
      sendError(res, 400, '缺少技能 ID')
      return
    }

    const id = parseInt(idParam)

    if (isNaN(id)) {
      sendError(res, 400, '无效的技能 ID')
      return
    }

    // 检查记录是否存在
    const existing = getSkill(id)
    if (!existing) {
      sendError(res, 404, '技能不存在')
      return
    }

    const success = deleteSkill(id)

    if (!success) {
      sendError(res, 500, '删除技能失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('删除技能错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== SkillTree（技能树）路由处理 ==========

/**
 * 获取技能树
 * GET /api/content/skill-tree
 */
export async function getSkillTreeHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = getSkillTree()
    res.json({ data })
  } catch (error) {
    console.error('获取技能树错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 添加技能树节点
 * POST /api/content/skill-tree
 */
export async function createSkillTreeNodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const nodeData = req.body

    // 必填字段验证
    if (!nodeData.name || typeof nodeData.name !== 'string') {
      sendError(res, 400, '请输入节点名称', { field: 'name', reason: 'required' })
      return
    }

    // 验证等级
    if (nodeData.level !== undefined && !isValidSkillLevel(nodeData.level)) {
      sendError(res, 400, '技能等级必须在 0-100 之间', { field: 'level', reason: 'invalid_range' })
      return
    }

    const id = createSkillTreeNode(nodeData)
    res.json({ id })
  } catch (error) {
    console.error('添加技能树节点错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新技能树节点
 * PUT /api/content/skill-tree/:id
 */
export async function updateSkillTreeNodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const nodeData = req.body

    if (!id) {
      sendError(res, 400, '缺少技能树节点 ID')
      return
    }

    // 验证等级
    if (nodeData.level !== undefined && !isValidSkillLevel(nodeData.level)) {
      sendError(res, 400, '技能等级必须在 0-100 之间', { field: 'level', reason: 'invalid_range' })
      return
    }

    const success = updateSkillTreeNode(id, nodeData)

    if (!success) {
      sendError(res, 500, '更新技能树节点失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('更新技能树节点错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 删除技能树节点
 * DELETE /api/content/skill-tree/:id
 */
export async function deleteSkillTreeNodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id

    if (!id) {
      sendError(res, 400, '缺少技能树节点 ID')
      return
    }

    const success = deleteSkillTreeNode(id)

    if (!success) {
      sendError(res, 500, '删除技能树节点失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('删除技能树节点错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== Projects（项目）路由处理 ==========

/**
 * 获取项目列表
 * GET /api/content/projects
 * 支持 category 查询参数筛选
 */
export async function getProjectListHandler(req: Request, res: Response): Promise<void> {
  try {
    const category = req.query.category as string | undefined

    // 验证分类参数
    if (category && !isValidProjectCategory(category)) {
      sendError(res, 400, '无效的项目分类', { field: 'category', reason: 'invalid_value' })
      return
    }

    const data = getProjectList(category as ProjectCategory | undefined)
    res.json({ data })
  } catch (error) {
    console.error('获取项目列表错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 添加项目
 * POST /api/content/projects
 */
export async function createProjectHandler(req: Request, res: Response): Promise<void> {
  try {
    const projectData = req.body

    // 必填字段验证
    if (!projectData.name || typeof projectData.name !== 'string') {
      sendError(res, 400, '请输入项目名称', { field: 'name', reason: 'required' })
      return
    }

    if (!projectData.category || !isValidProjectCategory(projectData.category)) {
      sendError(res, 400, '请选择有效的项目分类', { field: 'category', reason: 'invalid_value' })
      return
    }

    const id = createProject(projectData)
    res.json({ id })
  } catch (error) {
    console.error('添加项目错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新项目
 * PUT /api/content/projects/:id
 */
export async function updateProjectHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id
    const projectData = req.body

    if (!id) {
      sendError(res, 400, '缺少项目 ID')
      return
    }

    // 检查记录是否存在
    const existing = getProject(id)
    if (!existing) {
      sendError(res, 404, '项目不存在')
      return
    }

    // 验证分类
    if (projectData.category !== undefined && !isValidProjectCategory(projectData.category)) {
      sendError(res, 400, '无效的项目分类', { field: 'category', reason: 'invalid_value' })
      return
    }

    const success = updateProject(id, projectData)

    if (!success) {
      sendError(res, 500, '更新项目失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('更新项目错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 删除项目
 * DELETE /api/content/projects/:id
 */
export async function deleteProjectHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id

    if (!id) {
      sendError(res, 400, '缺少项目 ID')
      return
    }

    // 检查记录是否存在
    const existing = getProject(id)
    if (!existing) {
      sendError(res, 404, '项目不存在')
      return
    }

    const success = deleteProject(id)

    if (!success) {
      sendError(res, 500, '删除项目失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('删除项目错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== Campus（校园经历）路由处理 ==========

/**
 * 获取校园经历列表
 * GET /api/content/campus
 */
export async function getCampusListHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = getCampusList()
    res.json({ data })
  } catch (error) {
    console.error('获取校园经历列表错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 添加校园经历
 * POST /api/content/campus
 */
export async function createCampusHandler(req: Request, res: Response): Promise<void> {
  try {
    const campusData = req.body

    // 必填字段验证
    if (!campusData.organization || typeof campusData.organization !== 'string') {
      sendError(res, 400, '请输入组织名称', { field: 'organization', reason: 'required' })
      return
    }

    if (!campusData.position || typeof campusData.position !== 'string') {
      sendError(res, 400, '请输入职位名称', { field: 'position', reason: 'required' })
      return
    }

    if (!campusData.period || typeof campusData.period !== 'string') {
      sendError(res, 400, '请输入任职时间', { field: 'period', reason: 'required' })
      return
    }

    const id = createCampus(campusData)
    res.json({ id })
  } catch (error) {
    console.error('添加校园经历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新校园经历
 * PUT /api/content/campus/:id
 */
export async function updateCampusHandler(req: Request, res: Response): Promise<void> {
  try {
    const idParam = req.params.id
    if (!idParam) {
      sendError(res, 400, '缺少校园经历 ID')
      return
    }

    const id = parseInt(idParam)
    const campusData = req.body

    if (isNaN(id)) {
      sendError(res, 400, '无效的校园经历 ID')
      return
    }

    // 检查记录是否存在
    const existing = getCampus(id)
    if (!existing) {
      sendError(res, 404, '校园经历不存在')
      return
    }

    const success = updateCampus(id, campusData)

    if (!success) {
      sendError(res, 500, '更新校园经历失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('更新校园经历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 删除校园经历
 * DELETE /api/content/campus/:id
 */
export async function deleteCampusHandler(req: Request, res: Response): Promise<void> {
  try {
    const idParam = req.params.id
    if (!idParam) {
      sendError(res, 400, '缺少校园经历 ID')
      return
    }

    const id = parseInt(idParam)

    if (isNaN(id)) {
      sendError(res, 400, '无效的校园经历 ID')
      return
    }

    // 检查记录是否存在
    const existing = getCampus(id)
    if (!existing) {
      sendError(res, 404, '校园经历不存在')
      return
    }

    const success = deleteCampus(id)

    if (!success) {
      sendError(res, 500, '删除校园经历失败')
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('删除校园经历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== 发布和预览路由处理 ==========

/**
 * 预览数据
 * GET /api/content/preview
 * 需求: 3.7.2 - 提供"预览"功能，在保存前查看修改效果
 */
export async function previewHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = getPreviewData()
    res.json({ profile: data })
  } catch (error) {
    console.error('预览数据错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 发布到前端
 * POST /api/content/publish
 * 需求: 3.7.1 - 内容修改后生成新的 profile.ts 数据文件
 * 需求: 3.7.3 - 提供"发布"功能，将修改同步到前端网站
 */
export async function publishHandler(_req: Request, res: Response): Promise<void> {
  try {
    // 生成 profile.ts 内容
    const content = exportToProfileTs()

    // 确定输出路径（前端 src/data/profile.ts）
    // 从 src/admin/backend/src/controllers 需要退 5 级到项目根目录
    const outputPath = path.resolve(__dirname, '../../../../../src/data/profile.ts')
    const outputDir = path.dirname(outputPath)

    // 确保目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 写入文件
    fs.writeFileSync(outputPath, content, 'utf-8')

    res.json({
      success: true,
      path: outputPath,
      message: '发布成功，数据已同步到前端网站'
    })
  } catch (error) {
    console.error('发布错误:', error)
    sendError(res, 500, '发布失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}

// ========== 课程成绩导入处理 ==========

/**
 * 课程成绩数据接口
 */
interface CourseData {
  name: string
  score: number
}

/**
 * 解析 CSV 文件内容
 * 支持逗号、分号、制表符分隔
 * 
 * @param content - CSV 文件内容
 * @returns 解析后的课程成绩数组
 */
function parseCSV(content: string): CourseData[] {
  const courses: CourseData[] = []
  const lines = content.split(/\r?\n/)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const trimmedLine = line.trim()
    if (!trimmedLine) continue
    
    // 跳过表头行
    const lowerLine = trimmedLine.toLowerCase()
    if (lowerLine.includes('课程') || lowerLine.includes('name') || lowerLine.includes('科目') || lowerLine.includes('course')) {
      continue
    }
    
    // 分割行（支持中英文逗号、制表符、分号）
    const parts = trimmedLine.split(/[,，\t;]/)
    
    if (parts.length >= 2) {
      const namePart = parts[0]
      const scorePart = parts[1]
      if (namePart && scorePart) {
        const name = namePart.trim().replace(/^["']|["']$/g, '') // 去除引号
        const scoreStr = scorePart.trim().replace(/^["']|["']$/g, '')
        const score = parseFloat(scoreStr)
        
        if (name && !isNaN(score) && score >= 0 && score <= 100) {
          courses.push({ name, score })
        }
      }
    }
  }
  
  return courses
}

/**
 * 解析 Excel 文件
 * 
 * @param buffer - Excel 文件 Buffer
 * @returns 解析后的课程成绩数组
 */
async function parseExcel(buffer: Buffer): Promise<CourseData[]> {
  // 动态导入 exceljs（延迟加载以节省内存）
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  
  // 使用 stream 方式读取 Buffer
  const { Readable } = await import('stream')
  const stream = Readable.from(buffer)
  await workbook.xlsx.read(stream)
  
  const courses: CourseData[] = []
  const worksheet = workbook.worksheets[0] // 读取第一个工作表
  
  if (!worksheet) {
    return courses
  }
  
  let headerRowIndex = 0
  
  // 遍历行
  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as (string | number | null | undefined)[]
    
    // 跳过空行
    if (!values || values.length < 2) return
    
    // 检测表头行
    const firstCell = String(values[1] || '').toLowerCase()
    if (firstCell.includes('课程') || firstCell.includes('name') || firstCell.includes('科目') || firstCell.includes('course')) {
      headerRowIndex = rowNumber
      return
    }
    
    // 跳过表头之前的行
    if (headerRowIndex > 0 && rowNumber <= headerRowIndex) return
    
    // 解析数据行
    // Excel 的 values 数组索引从 1 开始
    const name = String(values[1] || '').trim()
    const scoreValue = values[2]
    const score = typeof scoreValue === 'number' ? scoreValue : parseFloat(String(scoreValue || ''))
    
    if (name && !isNaN(score) && score >= 0 && score <= 100) {
      courses.push({ name, score })
    }
  })
  
  return courses
}

/**
 * 批量导入课程成绩
 * POST /api/content/education/:id/import-courses
 * 
 * 需求: 3.2.2 - 提供课程成绩管理（支持批量导入）
 * 
 * 支持的文件格式:
 * - Excel (.xlsx, .xls)
 * - CSV (.csv)
 * 
 * 文件格式要求:
 * - 第一列: 课程名称
 * - 第二列: 成绩（0-100）
 * - 可以有表头行（会自动跳过）
 */
export async function importCoursesHandler(req: Request, res: Response): Promise<void> {
  try {
    const educationId = req.params.id
    const file = req.file
    
    // 验证教育经历 ID
    if (!educationId) {
      sendError(res, 400, '缺少教育经历 ID')
      return
    }
    
    // 检查教育经历是否存在
    const education = getEducation(educationId)
    if (!education) {
      sendError(res, 404, '教育经历不存在')
      return
    }
    
    // 验证文件
    if (!file) {
      sendError(res, 400, '请上传文件')
      return
    }
    
    // 获取文件扩展名
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'))
    
    let courses: CourseData[] = []
    
    // 根据文件类型解析
    if (ext === '.csv') {
      // 解析 CSV 文件
      const content = file.buffer.toString('utf-8')
      courses = parseCSV(content)
    } else if (ext === '.xlsx' || ext === '.xls') {
      // 解析 Excel 文件
      courses = await parseExcel(file.buffer)
    } else {
      sendError(res, 415, '不支持的文件格式，请上传 Excel (.xlsx, .xls) 或 CSV 文件')
      return
    }
    
    // 验证解析结果
    if (courses.length === 0) {
      sendError(res, 400, '未能从文件中解析出有效的课程成绩数据', {
        reason: '请确保文件格式正确：第一列为课程名称，第二列为成绩（0-100）'
      })
      return
    }
    
    // 合并现有课程和导入的课程
    const existingCourses = education.courses || []
    const mergedCourses = [...existingCourses, ...courses]
    
    // 更新教育经历
    const success = updateEducation(educationId, { courses: mergedCourses })
    
    if (!success) {
      sendError(res, 500, '保存课程成绩失败')
      return
    }
    
    res.json({
      success: true,
      imported: courses.length,
      total: mergedCourses.length,
      courses: courses,
      message: `成功导入 ${courses.length} 条课程成绩`
    })
  } catch (error) {
    console.error('导入课程成绩错误:', error)
    sendError(res, 500, '导入失败: ' + (error instanceof Error ? error.message : '未知错误'))
  }
}
