/**
 * 文件管理路由模块
 * 注册所有文件管理相关路由
 * 
 * 路由列表:
 * - GET /tree - 获取目录树（需要认证）
 * - POST /upload - 上传文件（需要认证）
 * - GET /download/:path(*) - 下载文件（需要认证）
 * - DELETE /:path(*) - 删除文件（需要认证）
 * - PUT /rename - 重命名文件（需要认证）
 * - GET /resume/list - 获取简历列表（需要认证）
 * - POST /resume/upload - 上传简历（需要认证）
 * - PUT /resume/active/:version - 设置当前简历（需要认证）
 * - GET /resume/download/:version - 下载简历（公开）
 * - POST /image/upload - 上传图片（需要认证）
 * - POST /avatar/upload - 上传头像（需要认证）
 * - POST /audio/upload - 上传音频（需要认证）
 * 
 * 需求: 5.1.1-5.4.4
 */

import { Router } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/auth'
import { pathTraversalProtection, publicFileAccess, fileTypeValidation } from '../middleware/pathSecurity'
import {
  getDirectoryTreeHandler,
  uploadFileHandler,
  downloadFileHandler,
  deleteFileHandler,
  renameFileHandler,
  getResumeListHandler,
  uploadResumeHandler,
  setActiveResumeHandler,
  downloadResumeHandler,
  uploadImageHandler,
  uploadAvatarHandler,
  uploadAudioHandler
} from '../controllers/file'

const router = Router()

// 配置 multer 用于文件上传
// 使用内存存储，文件大小限制为 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

// ========== 文件浏览器路由 ==========

/**
 * GET /tree
 * 获取目录树
 * 
 * 需要认证: 是
 * 查询参数: path - 相对路径（可选）
 * 响应: { tree: FileTreeNode[] }
 * 
 * 需求: 5.4.1, 5.4.4
 */
router.get('/tree', authMiddleware, getDirectoryTreeHandler)

/**
 * POST /upload
 * 上传文件
 * 
 * 需要认证: 是
 * 请求体: FormData（file: 文件, path: 目标目录）
 * 响应: { path, filename }
 * 
 * 需求: 5.4.2
 */
router.post('/upload', authMiddleware, upload.single('file'), uploadFileHandler)

/**
 * PUT /rename
 * 重命名文件
 * 
 * 需要认证: 是
 * 请求体: { oldPath, newPath }
 * 响应: { success }
 * 
 * 注意: 此路由必须在通配符路由之前定义
 * 
 * 需求: 5.4.3
 */
router.put('/rename', authMiddleware, renameFileHandler)

// ========== 简历管理路由 ==========

/**
 * GET /resume/list
 * 获取简历列表
 * 
 * 需要认证: 是
 * 响应: { data: ResumeVersion[] }
 * 
 * 需求: 5.1.2, 5.1.4
 */
router.get('/resume/list', authMiddleware, getResumeListHandler)

/**
 * POST /resume/upload
 * 上传简历
 * 
 * 需要认证: 是
 * 请求体: FormData（file: PDF 文件）
 * 响应: { version }
 * 
 * 需求: 5.1.1, 5.1.2
 */
router.post('/resume/upload', authMiddleware, upload.single('file'), uploadResumeHandler)

/**
 * PUT /resume/active/:version
 * 设置当前简历
 * 
 * 需要认证: 是
 * 路径参数: version - 简历版本号
 * 响应: { success }
 * 
 * 需求: 5.1.3
 */
router.put('/resume/active/:version', authMiddleware, setActiveResumeHandler)

/**
 * GET /resume/download/:version
 * 下载简历
 * 
 * 需要认证: 否（公开下载）
 * 路径参数: version - 简历版本号
 * 响应: 文件流
 * 
 * 需求: 5.1.1, 5.1.4, 7.1 - 公共文件允许未认证访问
 */
router.get('/resume/download/:version', pathTraversalProtection, downloadResumeHandler)

// ========== 图片管理路由 ==========

/**
 * POST /image/upload
 * 上传图片
 * 
 * 需要认证: 是
 * 请求体: FormData（file: 图片文件, category: 分类）
 * 响应: { path, thumbnail }
 * 
 * 需求: 5.2.1, 5.2.3, 5.2.4
 */
router.post('/image/upload', authMiddleware, upload.single('file'), uploadImageHandler)

/**
 * POST /avatar/upload
 * 上传头像（带裁剪）
 * 
 * 需要认证: 是
 * 请求体: FormData（file: 图片文件, x, y, width, height: 裁剪参数）
 * 响应: { path, thumbnail }
 * 
 * 需求: 5.2.2
 */
router.post('/avatar/upload', authMiddleware, upload.single('file'), uploadAvatarHandler)

// ========== 音频管理路由 ==========

/**
 * POST /audio/upload
 * 上传音频
 * 
 * 需要认证: 是
 * 请求体: FormData（file: 音频文件, type: 类型）
 * 响应: { path }
 * 
 * 需求: 5.3.1, 5.3.2
 */
router.post('/audio/upload', authMiddleware, upload.single('file'), uploadAudioHandler)

// ========== 公开下载路由（无需认证）==========

/**
 * GET /public/audio/*
 * 公开下载音频文件
 * 
 * 需要认证: 否（公开访问，用于前端 <audio> 元素）
 * 路径参数: 音频文件相对路径（如 bgm/music.mp3）
 * 响应: 文件流
 * 
 * 注意: 仅允许访问 audio 目录下的文件
 * 需求: 7.1 - 公共文件允许未认证访问
 * 需求: 7.4 - 防止路径遍历攻击
 */
router.get('/public/audio/*', 
  pathTraversalProtection,
  publicFileAccess(['audio']),
  fileTypeValidation(['.mp3', '.ogg', '.wav', '.m4a']),
  (req, res) => {
    // 通配符路由的参数存储在 req.params['0'] 中
    const audioPath = (req.params as Record<string, string>)['0'] || ''
    // 确保路径以 audio/ 开头，通过类型断言设置 path 参数
    ;(req.params as Record<string, string>).path = `audio/${audioPath}`
    downloadFileHandler(req, res)
  }
)

/**
 * GET /public/image/*
 * 公开下载图片文件
 * 
 * 需要认证: 否（公开访问，用于前端 <img> 元素）
 * 路径参数: 图片文件相对路径（如 avatar/photo.jpg）
 * 响应: 文件流
 * 
 * 注意: 仅允许访问 image 目录下的文件
 * 需求: 7.1 - 公共文件允许未认证访问
 * 需求: 7.4 - 防止路径遍历攻击
 */
router.get('/public/image/*',
  pathTraversalProtection,
  publicFileAccess(['image']),
  fileTypeValidation(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']),
  (req, res) => {
    // 通配符路由的参数存储在 req.params['0'] 中
    const imagePath = (req.params as Record<string, string>)['0'] || ''
    // 确保路径以 image/ 开头，通过类型断言设置 path 参数
    ;(req.params as Record<string, string>).path = `image/${imagePath}`
    downloadFileHandler(req, res)
  }
)

// ========== 通配符路由（必须放在最后）==========

/**
 * GET /download/:path(*)
 * 下载文件
 * 
 * 需要认证: 是
 * 路径参数: path - 文件相对路径
 * 响应: 文件流
 * 
 * 注意: 使用通配符匹配路径中的斜杠
 * 
 * 需求: 5.4.2, 7.2 - 私有文件需要认证, 7.4 - 防止路径遍历
 */
router.get('/download/*', authMiddleware, pathTraversalProtection, (req, res) => {
  // 从 URL 中提取完整路径（去掉 /download/ 前缀）
  // 通配符路由的参数存储在 req.params['0'] 中
  const fullPath = (req.params as Record<string, string>)['0'] || ''
  ;(req.params as Record<string, string>).path = fullPath
  downloadFileHandler(req, res)
})

/**
 * DELETE /:path(*)
 * 删除文件
 * 
 * 需要认证: 是
 * 路径参数: path - 文件相对路径
 * 响应: { success }
 * 
 * 注意: 使用通配符匹配路径中的斜杠，必须放在最后
 * 
 * 需求: 5.4.2, 7.2 - 私有文件需要认证, 7.4 - 防止路径遍历
 */
router.delete('/*', authMiddleware, pathTraversalProtection, (req, res) => {
  // 从 URL 中提取完整路径
  // 通配符路由的参数存储在 req.params['0'] 中
  const fullPath = (req.params as Record<string, string>)['0'] || ''
  ;(req.params as Record<string, string>).path = fullPath
  deleteFileHandler(req, res)
})

export default router
