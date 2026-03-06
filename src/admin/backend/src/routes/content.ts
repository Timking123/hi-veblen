/**
 * 内容管理路由模块
 * 注册所有内容管理相关路由
 * 
 * 路由列表:
 * 
 * Profile（个人信息）:
 * - GET /profile - 获取个人信息
 * - PUT /profile - 更新个人信息
 * 
 * Education（教育经历）:
 * - GET /education - 获取教育经历列表
 * - POST /education - 添加教育经历
 * - PUT /education/:id - 更新教育经历
 * - DELETE /education/:id - 删除教育经历
 * 
 * Experience（工作经历）:
 * - GET /experience - 获取工作经历列表
 * - POST /experience - 添加工作经历
 * - PUT /experience/:id - 更新工作经历
 * - DELETE /experience/:id - 删除工作经历
 * 
 * Skills（技能）:
 * - GET /skills - 获取技能列表（支持 category 查询参数）
 * - POST /skills - 添加技能
 * - PUT /skills/:id - 更新技能
 * - DELETE /skills/:id - 删除技能
 * 
 * SkillTree（技能树）:
 * - GET /skill-tree - 获取技能树
 * - POST /skill-tree - 添加技能树节点
 * - PUT /skill-tree/:id - 更新技能树节点
 * - DELETE /skill-tree/:id - 删除技能树节点
 * 
 * Projects（项目）:
 * - GET /projects - 获取项目列表（支持 category 查询参数）
 * - POST /projects - 添加项目
 * - PUT /projects/:id - 更新项目
 * - DELETE /projects/:id - 删除项目
 * 
 * Campus（校园经历）:
 * - GET /campus - 获取校园经历列表
 * - POST /campus - 添加校园经历
 * - PUT /campus/:id - 更新校园经历
 * - DELETE /campus/:id - 删除校园经历
 * 
 * 发布和预览:
 * - POST /publish - 发布到前端（导出 profile.ts）
 * - GET /preview - 预览数据
 * 
 * 需求: 3.1.1-3.7.3
 */

import { Router } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/auth'
import {
  // Profile
  getProfileHandler,
  updateProfileHandler,
  // Education
  getEducationListHandler,
  createEducationHandler,
  updateEducationHandler,
  deleteEducationHandler,
  // Experience
  getExperienceListHandler,
  createExperienceHandler,
  updateExperienceHandler,
  deleteExperienceHandler,
  // Skills
  getSkillListHandler,
  createSkillHandler,
  updateSkillHandler,
  deleteSkillHandler,
  // SkillTree
  getSkillTreeHandler,
  createSkillTreeNodeHandler,
  updateSkillTreeNodeHandler,
  deleteSkillTreeNodeHandler,
  // Projects
  getProjectListHandler,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
  // Campus
  getCampusListHandler,
  createCampusHandler,
  updateCampusHandler,
  deleteCampusHandler,
  // Preview & Publish
  previewHandler,
  publishHandler,
  // 课程成绩导入
  importCoursesHandler
} from '../controllers/content'

const router = Router()

// 配置 multer 用于文件上传（课程成绩导入）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (_req, file, cb) => {
    // 只允许 Excel 和 CSV 文件
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ]
    const allowedExts = ['.xlsx', '.xls', '.csv']
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'))
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('只支持 Excel (.xlsx, .xls) 和 CSV 文件格式'))
    }
  }
})

// ========== Profile（个人信息）路由 ==========

/**
 * GET /profile
 * 获取个人信息
 * 需要认证: 是
 */
router.get('/profile', authMiddleware, getProfileHandler)

/**
 * PUT /profile
 * 更新个人信息
 * 需要认证: 是
 */
router.put('/profile', authMiddleware, updateProfileHandler)

// ========== Education（教育经历）路由 ==========

/**
 * GET /education
 * 获取教育经历列表
 * 需要认证: 是
 */
router.get('/education', authMiddleware, getEducationListHandler)

/**
 * POST /education
 * 添加教育经历
 * 需要认证: 是
 */
router.post('/education', authMiddleware, createEducationHandler)

/**
 * PUT /education/:id
 * 更新教育经历
 * 需要认证: 是
 */
router.put('/education/:id', authMiddleware, updateEducationHandler)

/**
 * DELETE /education/:id
 * 删除教育经历
 * 需要认证: 是
 */
router.delete('/education/:id', authMiddleware, deleteEducationHandler)

// ========== Experience（工作经历）路由 ==========

/**
 * GET /experience
 * 获取工作经历列表
 * 需要认证: 是
 */
router.get('/experience', authMiddleware, getExperienceListHandler)

/**
 * POST /experience
 * 添加工作经历
 * 需要认证: 是
 */
router.post('/experience', authMiddleware, createExperienceHandler)

/**
 * PUT /experience/:id
 * 更新工作经历
 * 需要认证: 是
 */
router.put('/experience/:id', authMiddleware, updateExperienceHandler)

/**
 * DELETE /experience/:id
 * 删除工作经历
 * 需要认证: 是
 */
router.delete('/experience/:id', authMiddleware, deleteExperienceHandler)

// ========== Skills（技能）路由 ==========

/**
 * GET /skills
 * 获取技能列表
 * 支持 category 查询参数筛选（frontend/backend/tools/other）
 * 需要认证: 是
 */
router.get('/skills', authMiddleware, getSkillListHandler)

/**
 * POST /skills
 * 添加技能
 * 需要认证: 是
 */
router.post('/skills', authMiddleware, createSkillHandler)

/**
 * PUT /skills/:id
 * 更新技能
 * 需要认证: 是
 */
router.put('/skills/:id', authMiddleware, updateSkillHandler)

/**
 * DELETE /skills/:id
 * 删除技能
 * 需要认证: 是
 */
router.delete('/skills/:id', authMiddleware, deleteSkillHandler)

// ========== SkillTree（技能树）路由 ==========

/**
 * GET /skill-tree
 * 获取技能树
 * 需要认证: 是
 */
router.get('/skill-tree', authMiddleware, getSkillTreeHandler)

/**
 * POST /skill-tree
 * 添加技能树节点
 * 需要认证: 是
 */
router.post('/skill-tree', authMiddleware, createSkillTreeNodeHandler)

/**
 * PUT /skill-tree/:id
 * 更新技能树节点
 * 需要认证: 是
 */
router.put('/skill-tree/:id', authMiddleware, updateSkillTreeNodeHandler)

/**
 * DELETE /skill-tree/:id
 * 删除技能树节点
 * 需要认证: 是
 */
router.delete('/skill-tree/:id', authMiddleware, deleteSkillTreeNodeHandler)

// ========== Projects（项目）路由 ==========

/**
 * GET /projects
 * 获取项目列表
 * 支持 category 查询参数筛选（work/personal/opensource）
 * 需要认证: 是
 */
router.get('/projects', authMiddleware, getProjectListHandler)

/**
 * POST /projects
 * 添加项目
 * 需要认证: 是
 */
router.post('/projects', authMiddleware, createProjectHandler)

/**
 * PUT /projects/:id
 * 更新项目
 * 需要认证: 是
 */
router.put('/projects/:id', authMiddleware, updateProjectHandler)

/**
 * DELETE /projects/:id
 * 删除项目
 * 需要认证: 是
 */
router.delete('/projects/:id', authMiddleware, deleteProjectHandler)

// ========== Campus（校园经历）路由 ==========

/**
 * GET /campus
 * 获取校园经历列表
 * 需要认证: 是
 */
router.get('/campus', authMiddleware, getCampusListHandler)

/**
 * POST /campus
 * 添加校园经历
 * 需要认证: 是
 */
router.post('/campus', authMiddleware, createCampusHandler)

/**
 * PUT /campus/:id
 * 更新校园经历
 * 需要认证: 是
 */
router.put('/campus/:id', authMiddleware, updateCampusHandler)

/**
 * DELETE /campus/:id
 * 删除校园经历
 * 需要认证: 是
 */
router.delete('/campus/:id', authMiddleware, deleteCampusHandler)

// ========== 发布和预览路由 ==========

/**
 * GET /preview
 * 预览数据
 * 需要认证: 是
 */
router.get('/preview', authMiddleware, previewHandler)

/**
 * POST /publish
 * 发布到前端（导出 profile.ts）
 * 需要认证: 是
 */
router.post('/publish', authMiddleware, publishHandler)

// ========== 课程成绩导入路由 ==========

/**
 * POST /education/:id/import-courses
 * 批量导入课程成绩
 * 支持 Excel (.xlsx, .xls) 和 CSV 文件格式
 * 需要认证: 是
 * 需求: 3.2.2
 */
router.post('/education/:id/import-courses', authMiddleware, upload.single('file'), importCoursesHandler)

export default router
