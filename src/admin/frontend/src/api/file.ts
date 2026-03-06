/**
 * 文件管理 API 接口
 * 提供文件管理相关的 API 调用
 * 
 * 需求: 5.1.1-5.4.4
 */
import request from './request'
import type { FileInfo, ResumeVersion } from '@/types'

// ========== 文件浏览器接口 ==========

/**
 * 获取目录树
 * 
 * @param path - 相对路径（可选）
 * @returns 目录树结构
 * 
 * 需求: 5.4.1, 5.4.4
 */
export function getDirectoryTree(path?: string) {
  return request.get<{ tree: FileInfo[] }>('/files/tree', {
    params: { path }
  })
}

/**
 * 上传文件
 * 
 * @param file - 文件对象
 * @param targetPath - 目标目录路径
 * @returns 上传结果
 * 
 * 需求: 5.4.2
 */
export function uploadFile(file: File, targetPath: string = '') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', targetPath)
  
  return request.post<{ path: string; filename: string }>('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 下载文件
 * 
 * @param filePath - 文件相对路径
 * @returns 文件 Blob
 * 
 * 需求: 5.4.2
 */
export function downloadFile(filePath: string) {
  return request.get(`/files/download/${filePath}`, {
    responseType: 'blob'
  })
}

/**
 * 删除文件
 * 
 * @param filePath - 文件相对路径
 * @returns 操作结果
 * 
 * 需求: 5.4.2
 */
export function deleteFile(filePath: string) {
  return request.delete<{ success: boolean }>(`/files/${filePath}`)
}

/**
 * 重命名文件
 * 
 * @param oldPath - 原路径
 * @param newPath - 新路径
 * @returns 操作结果
 * 
 * 需求: 5.4.3
 */
export function renameFile(oldPath: string, newPath: string) {
  return request.put<{ success: boolean }>('/files/rename', {
    oldPath,
    newPath
  })
}

// ========== 简历管理接口 ==========

/**
 * 获取简历列表
 * 
 * @returns 简历版本列表
 * 
 * 需求: 5.1.2, 5.1.4
 */
export function getResumeList() {
  return request.get<{ data: ResumeVersion[] }>('/files/resume/list')
}

/**
 * 上传简历
 * 
 * @param file - PDF 文件
 * @returns 上传结果
 * 
 * 需求: 5.1.1, 5.1.2
 */
export function uploadResume(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  
  return request.post<{ version: number }>('/files/resume/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 设置当前简历
 * 
 * @param version - 简历版本号
 * @returns 操作结果
 * 
 * 需求: 5.1.3
 */
export function setActiveResume(version: number) {
  return request.put<{ success: boolean }>(`/files/resume/active/${version}`)
}

/**
 * 下载简历
 * 
 * @param version - 简历版本号
 * @returns 文件 Blob
 * 
 * 需求: 5.1.1, 13.1 - 添加时间戳防止缓存
 */
export function downloadResume(version: number) {
  // 添加时间戳参数防止浏览器缓存，确保下载最新版本
  const timestamp = Date.now()
  return request.get(`/files/resume/download/${version}`, {
    params: { t: timestamp },
    responseType: 'blob'
  })
}

// ========== 图片管理接口 ==========

/** 图片分类类型 */
export type ImageCategory = 'avatar' | 'screenshot' | 'other'

/**
 * 上传图片
 * 
 * @param file - 图片文件
 * @param category - 图片分类
 * @returns 上传结果
 * 
 * 需求: 5.2.1, 5.2.3, 5.2.4
 */
export function uploadImage(file: File, category: ImageCategory = 'other') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', category)
  
  return request.post<{ path: string; thumbnail: string }>('/files/image/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 上传头像（带裁剪）
 * 
 * @param file - 图片文件
 * @param cropOptions - 裁剪参数（可选）
 * @returns 上传结果
 * 
 * 需求: 5.2.2
 */
export function uploadAvatar(
  file: File,
  cropOptions?: { x: number; y: number; width: number; height: number }
) {
  const formData = new FormData()
  formData.append('file', file)
  
  if (cropOptions) {
    formData.append('x', String(cropOptions.x))
    formData.append('y', String(cropOptions.y))
    formData.append('width', String(cropOptions.width))
    formData.append('height', String(cropOptions.height))
  }
  
  return request.post<{ path: string; thumbnail: string }>('/files/avatar/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// ========== 音频管理接口 ==========

/** 音频类型 */
export type AudioType = 'bgm' | 'sfx'

/**
 * 上传音频
 * 
 * @param file - 音频文件
 * @param type - 音频类型
 * @returns 上传结果
 * 
 * 需求: 5.3.1, 5.3.2
 */
export function uploadAudio(file: File, type: AudioType = 'sfx') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  
  return request.post<{ path: string }>('/files/audio/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
