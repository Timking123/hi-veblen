/**
 * 文件管理控制器模块
 * 处理 /api/files/* 路由的请求
 * 
 * 需求: 5.1.1 - 提供简历上传功能（仅支持 PDF 格式）
 * 需求: 5.1.2 - 保留简历版本历史（最多 5 个版本）
 * 需求: 5.1.3 - 提供设置当前使用简历的功能
 * 需求: 5.1.4 - 显示简历下载统计
 * 需求: 5.2.1 - 提供图片上传功能（支持 JPG/PNG/WebP）
 * 需求: 5.2.2 - 提供头像裁剪功能（1:1 比例）
 * 需求: 5.2.3 - 自动压缩上传的图片（质量 80%，最大宽度 1920px）
 * 需求: 5.2.4 - 按分类组织图片（头像、项目截图、其他）
 * 需求: 5.3.1 - 提供音频文件上传功能（支持 MP3/OGG）
 * 需求: 5.3.2 - 按类型分类音频（背景音乐、音效）
 * 需求: 5.4.1 - 以树形结构展示文件目录
 * 需求: 5.4.2 - 提供文件上传/下载/删除功能
 * 需求: 5.4.3 - 提供文件重命名功能
 * 需求: 5.4.4 - 显示文件大小和修改时间
 */

import { Request, Response } from 'express'
import {
  // 文件操作
  getDirectoryTree,
  saveUploadedFile,
  getFileForDownload,
  deleteFile,
  renameFile,
  // 简历管理
  getResumeVersions,
  uploadResume,
  setActiveResume,
  getResumeForDownload,
  incrementResumeDownloadCount,
  // 图片处理
  uploadImage,
  uploadAvatar,
  ImageCategory,
  CropOptions,
  // 音频处理
  uploadAudio,
  AudioType
} from '../services/file'

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
 * 
 * @param res - Express Response 对象
 * @param code - HTTP 状态码
 * @param message - 错误消息
 * @param details - 错误详情（可选）
 */
function sendError(
  res: Response,
  code: number,
  message: string,
  details?: ErrorResponse['details']
): void {
  const errorResponse: ErrorResponse = {
    code,
    message
  }
  
  if (details) {
    errorResponse.details = details
  }
  
  res.status(code).json(errorResponse)
}

// ========== 文件浏览器操作 ==========

/**
 * 获取目录树
 * GET /api/files/tree
 * 
 * 需要认证: 是
 * 查询参数: path - 相对路径（可选，默认为根目录）
 * 响应: { tree: FileTreeNode[] }
 * 
 * 需求: 5.4.1, 5.4.4
 */
export function getDirectoryTreeHandler(req: Request, res: Response): void {
  try {
    const { path: relativePath } = req.query
    
    const pathStr = typeof relativePath === 'string' ? relativePath : ''
    const tree = getDirectoryTree(pathStr)
    
    res.json({ tree })
  } catch (error) {
    console.error('获取目录树错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 上传文件
 * POST /api/files/upload
 * 
 * 需要认证: 是
 * 请求体: FormData（file: 文件, path: 目标目录）
 * 响应: { path: string, filename: string }
 * 
 * 需求: 5.4.2
 */
export function uploadFileHandler(req: Request, res: Response): void {
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      sendError(res, 400, '请选择要上传的文件', {
        field: 'file',
        reason: 'required'
      })
      return
    }
    
    const { path: targetPath } = req.body
    const targetDir = typeof targetPath === 'string' ? targetPath : ''
    
    // 保存文件
    const result = saveUploadedFile(
      req.file.buffer,
      req.file.originalname,
      targetDir
    )
    
    if (!result.success) {
      sendError(res, 400, result.error || '上传文件失败')
      return
    }
    
    res.json({
      path: result.path,
      filename: result.filename
    })
  } catch (error) {
    console.error('上传文件错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 下载文件
 * GET /api/files/download/:path(*)
 * 
 * 需要认证: 是
 * 路径参数: path - 文件相对路径
 * 响应: 文件流
 * 
 * 需求: 5.4.2
 */
export function downloadFileHandler(req: Request, res: Response): void {
  try {
    const { path: filePath } = req.params
    
    if (!filePath) {
      sendError(res, 400, '请提供文件路径', {
        field: 'path',
        reason: 'required'
      })
      return
    }
    
    // 获取文件
    const fileData = getFileForDownload(filePath)
    
    if (!fileData) {
      sendError(res, 404, '文件不存在')
      return
    }
    
    // 设置响应头
    res.setHeader('Content-Type', fileData.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.filename)}"`)
    res.setHeader('Content-Length', fileData.size)
    
    // 发送文件流
    fileData.stream.pipe(res)
  } catch (error) {
    console.error('下载文件错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 删除文件
 * DELETE /api/files/:path(*)
 * 
 * 需要认证: 是
 * 路径参数: path - 文件相对路径
 * 响应: { success: boolean }
 * 
 * 需求: 5.4.2
 */
export function deleteFileHandler(req: Request, res: Response): void {
  try {
    const { path: filePath } = req.params
    
    if (!filePath) {
      sendError(res, 400, '请提供文件路径', {
        field: 'path',
        reason: 'required'
      })
      return
    }
    
    // 删除文件
    const result = deleteFile(filePath)
    
    if (!result.success) {
      sendError(res, 400, result.error || '删除文件失败')
      return
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('删除文件错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 重命名文件
 * PUT /api/files/rename
 * 
 * 需要认证: 是
 * 请求体: { oldPath: string, newPath: string }
 * 响应: { success: boolean }
 * 
 * 需求: 5.4.3
 */
export function renameFileHandler(req: Request, res: Response): void {
  try {
    const { oldPath, newPath } = req.body
    
    // 验证参数
    if (!oldPath || typeof oldPath !== 'string') {
      sendError(res, 400, '请提供原文件路径', {
        field: 'oldPath',
        reason: 'required'
      })
      return
    }
    
    if (!newPath || typeof newPath !== 'string') {
      sendError(res, 400, '请提供新文件路径', {
        field: 'newPath',
        reason: 'required'
      })
      return
    }
    
    // 重命名文件
    const result = renameFile(oldPath, newPath)
    
    if (!result.success) {
      sendError(res, 400, result.error || '重命名文件失败')
      return
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('重命名文件错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== 简历管理 ==========

/**
 * 获取简历列表
 * GET /api/files/resume/list
 * 
 * 需要认证: 是
 * 响应: { data: ResumeVersion[] }
 * 
 * 需求: 5.1.2, 5.1.4
 */
export function getResumeListHandler(_req: Request, res: Response): void {
  try {
    const versions = getResumeVersions()
    res.json({ data: versions })
  } catch (error) {
    console.error('获取简历列表错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 上传简历
 * POST /api/files/resume/upload
 * 
 * 需要认证: 是
 * 请求体: FormData（file: PDF 文件）
 * 响应: { version: number }
 * 
 * 需求: 5.1.1, 5.1.2
 */
export async function uploadResumeHandler(req: Request, res: Response): Promise<void> {
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      sendError(res, 400, '请选择要上传的简历文件', {
        field: 'file',
        reason: 'required'
      })
      return
    }
    
    // 上传简历（现在是异步函数）
    const result = await uploadResume(req.file.buffer, req.file.originalname)
    
    if (!result.success) {
      // 根据错误类型返回不同的状态码
      if (result.error?.includes('仅支持 PDF')) {
        sendError(res, 415, result.error, {
          field: 'file',
          reason: 'unsupported_type'
        })
      } else {
        sendError(res, 400, result.error || '上传简历失败')
      }
      return
    }
    
    res.json({ version: result.version })
  } catch (error) {
    console.error('上传简历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 设置当前简历
 * PUT /api/files/resume/active/:version
 * 
 * 需要认证: 是
 * 路径参数: version - 简历版本号
 * 响应: { success: boolean }
 * 
 * 需求: 5.1.3
 */
export async function setActiveResumeHandler(req: Request, res: Response): Promise<void> {
  try {
    const { version } = req.params
    
    // 验证版本号
    if (!version) {
      sendError(res, 400, '请提供简历版本号', {
        field: 'version',
        reason: 'required'
      })
      return
    }
    
    const versionNum = parseInt(version, 10)
    if (isNaN(versionNum) || versionNum < 1) {
      sendError(res, 400, '无效的版本号', {
        field: 'version',
        reason: 'invalid_value'
      })
      return
    }
    
    // 设置当前简历（现在是异步函数）
    const result = await setActiveResume(versionNum)
    
    if (!result.success) {
      if (result.error?.includes('不存在')) {
        sendError(res, 404, result.error)
      } else {
        sendError(res, 400, result.error || '设置当前简历失败')
      }
      return
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('设置当前简历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 下载简历
 * GET /api/files/resume/download/:version
 * 
 * 需要认证: 否（公开下载）
 * 路径参数: version - 简历版本号
 * 响应: 文件流
 * 
 * 需求: 5.1.1, 5.1.4, 2.1, 2.2, 3.2, 4.3, 10.1, 13.3, 13.4
 */
export async function downloadResumeHandler(req: Request, res: Response): Promise<void> {
  try {
    const { version } = req.params
    
    // 验证版本号
    if (!version) {
      sendError(res, 400, '请提供简历版本号', {
        field: 'version',
        reason: 'required'
      })
      return
    }
    
    const versionNum = parseInt(version, 10)
    if (isNaN(versionNum) || versionNum < 1) {
      sendError(res, 400, '无效的版本号', {
        field: 'version',
        reason: 'invalid_value'
      })
      return
    }
    
    // 获取简历文件
    const fileData = getResumeForDownload(versionNum)
    
    if (!fileData) {
      sendError(res, 404, '简历不存在')
      return
    }
    
    // 导入下载统计服务、文件编码处理器和缓存控制管理器
    const { recordResumeDownload } = await import('../services/downloadStats')
    const { encodeContentDisposition } = await import('../utils/fileEncoding')
    const { getCacheHeaders } = await import('../utils/cacheControl')
    
    // 记录下载统计
    try {
      await recordResumeDownload(versionNum, 'frontend')
    } catch (error) {
      // 统计记录失败不应该影响下载
      console.error('记录下载统计失败:', error)
    }
    
    // 获取缓存控制头（历史版本使用长期缓存）
    const cacheHeaders = getCacheHeaders('resume', true)
    
    // 设置响应头
    res.setHeader('Content-Type', fileData.mimeType)
    res.setHeader('Content-Disposition', encodeContentDisposition(fileData.filename))
    res.setHeader('Content-Length', fileData.size)
    
    // 设置缓存控制头
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      if (value) {
        res.setHeader(key, value)
      }
    })
    
    // 支持 Range 请求（断点续传）
    const range = req.headers.range
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileData.size - 1
      const chunkSize = (end - start) + 1
      
      // 验证 Range 是否有效
      if (start >= 0 && start < fileData.size && end < fileData.size && start <= end) {
        res.status(206) // Partial Content
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileData.size}`)
        res.setHeader('Content-Length', chunkSize)
        res.setHeader('Accept-Ranges', 'bytes')
        
        // 创建带范围的流
        const fs = await import('fs')
        const rangeStream = fs.createReadStream(fileData.stream.path as string, { start, end })
        rangeStream.pipe(res)
        return
      }
    }
    
    // 设置支持 Range 请求
    res.setHeader('Accept-Ranges', 'bytes')
    
    // 发送文件流
    fileData.stream.pipe(res)
  } catch (error) {
    console.error('下载简历错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== 图片管理 ==========

/**
 * 上传图片
 * POST /api/files/image/upload
 * 
 * 需要认证: 是
 * 请求体: FormData（file: 图片文件, category: 分类）
 * 响应: { path: string, thumbnail: string }
 * 
 * 需求: 5.2.1, 5.2.3, 5.2.4
 */
export async function uploadImageHandler(req: Request, res: Response): Promise<void> {
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      sendError(res, 400, '请选择要上传的图片', {
        field: 'file',
        reason: 'required'
      })
      return
    }
    
    const { category } = req.body
    
    // 验证分类
    const validCategories: ImageCategory[] = ['avatar', 'screenshot', 'other']
    const imageCategory: ImageCategory = validCategories.includes(category) 
      ? category 
      : 'other'
    
    // 上传图片
    const result = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      imageCategory
    )
    
    if (!result.success) {
      if (result.error?.includes('不支持')) {
        sendError(res, 415, result.error, {
          field: 'file',
          reason: 'unsupported_type'
        })
      } else {
        sendError(res, 400, result.error || '上传图片失败')
      }
      return
    }
    
    res.json({
      path: result.path,
      thumbnail: result.thumbnail
    })
  } catch (error) {
    console.error('上传图片错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 上传头像（带裁剪）
 * POST /api/files/avatar/upload
 * 
 * 需要认证: 是
 * 请求体: FormData（file: 图片文件, x, y, width, height: 裁剪参数）
 * 响应: { path: string, thumbnail: string }
 * 
 * 需求: 5.2.2
 */
export async function uploadAvatarHandler(req: Request, res: Response): Promise<void> {
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      sendError(res, 400, '请选择要上传的头像', {
        field: 'file',
        reason: 'required'
      })
      return
    }
    
    const { x, y, width, height } = req.body
    
    // 解析裁剪参数（可选）
    let cropOptions: CropOptions | undefined
    if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
      const cropX = parseFloat(x)
      const cropY = parseFloat(y)
      const cropWidth = parseFloat(width)
      const cropHeight = parseFloat(height)
      
      if (!isNaN(cropX) && !isNaN(cropY) && !isNaN(cropWidth) && !isNaN(cropHeight)) {
        if (cropWidth <= 0 || cropHeight <= 0) {
          sendError(res, 400, '裁剪尺寸必须大于 0', {
            field: 'width',
            reason: 'invalid_value'
          })
          return
        }
        
        cropOptions = {
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight
        }
      }
    }
    
    // 上传头像
    const result = await uploadAvatar(
      req.file.buffer,
      req.file.originalname,
      cropOptions
    )
    
    if (!result.success) {
      if (result.error?.includes('不支持')) {
        sendError(res, 415, result.error, {
          field: 'file',
          reason: 'unsupported_type'
        })
      } else {
        sendError(res, 400, result.error || '上传头像失败')
      }
      return
    }
    
    res.json({
      path: result.path,
      thumbnail: result.thumbnail
    })
  } catch (error) {
    console.error('上传头像错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== 音频管理 ==========

/**
 * 上传音频
 * POST /api/files/audio/upload
 * 
 * 需要认证: 是
 * 请求体: FormData（file: 音频文件, type: 类型）
 * 响应: { path: string }
 * 
 * 需求: 5.3.1, 5.3.2
 */
export function uploadAudioHandler(req: Request, res: Response): void {
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      sendError(res, 400, '请选择要上传的音频', {
        field: 'file',
        reason: 'required'
      })
      return
    }
    
    const { type } = req.body
    
    // 验证类型
    const validTypes: AudioType[] = ['bgm', 'sfx']
    const audioType: AudioType = validTypes.includes(type) ? type : 'sfx'
    
    // 上传音频（异步）
    const result = await uploadAudio(
      req.file.buffer,
      req.file.originalname,
      audioType
    )
    
    if (!result.success) {
      if (result.error?.includes('不支持')) {
        sendError(res, 415, result.error, {
          field: 'file',
          reason: 'unsupported_type'
        })
      } else {
        sendError(res, 400, result.error || '上传音频失败')
      }
      return
    }
    
    res.json({ path: result.path })
  } catch (error) {
    console.error('上传音频错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}
