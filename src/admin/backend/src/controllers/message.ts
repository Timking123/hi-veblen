/**
 * 留言管理控制器模块
 * 处理 /api/messages/* 路由的请求
 * 
 * 需求: 4.1.1 - 以表格形式展示留言
 * 需求: 4.1.2 - 支持按时间范围筛选留言
 * 需求: 4.1.3 - 支持按状态筛选（全部/未读/已读）
 * 需求: 4.1.4 - 支持关键词搜索留言内容
 * 需求: 4.2.1 - 提供查看留言详情功能
 * 需求: 4.2.2 - 提供标记已读/未读功能
 * 需求: 4.2.3 - 提供删除留言功能（支持批量删除）
 * 需求: 4.3.1 - 将留言保存到 file/message/ 文件夹
 * 需求: 4.4.1 - 提供导出为 Excel/CSV 功能
 * 需求: 4.4.2 - 支持按时间范围选择导出数据
 */

import { Request, Response } from 'express'
import {
  getMessageList,
  getMessage,
  createMessage,
  markMessageAsRead,
  markMessageAsUnread,
  deleteMessage,
  batchDeleteMessages
} from '../services/message'
import { exportMessages, ExportFormat } from '../services/export'
import { MessageStatus, isValidMessageStatus, isValidDateFormat } from '../models/message'

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


/**
 * 提交留言（公开接口，供前端网站调用）
 * POST /api/messages/submit
 * 
 * 需要认证: 否
 * 请求体: { nickname, contact, message }
 * 响应: { success: boolean, id?: number, errors?: string[] }
 * 
 * 需求: 4.3.1 - 将留言保存到 file/message/ 文件夹
 */
export function submitMessageHandler(req: Request, res: Response): void {
  try {
    const { nickname, contact, message } = req.body
    
    // 验证必填字段
    if (!nickname || typeof nickname !== 'string' || !nickname.trim()) {
      sendError(res, 400, '请输入您的称呼', {
        field: 'nickname',
        reason: 'required'
      })
      return
    }
    
    if (!contact || typeof contact !== 'string' || !contact.trim()) {
      sendError(res, 400, '请输入您的联系方式', {
        field: 'contact',
        reason: 'required'
      })
      return
    }
    
    if (!message || typeof message !== 'string' || !message.trim()) {
      sendError(res, 400, '请输入留言内容', {
        field: 'message',
        reason: 'required'
      })
      return
    }
    
    // 调用服务创建留言
    const result = createMessage({
      nickname: nickname.trim(),
      contact: contact.trim(),
      content: message.trim()
    })
    
    if (result.success) {
      res.json({
        success: true,
        id: result.id
      })
    } else {
      sendError(res, 400, result.errors?.[0] || '留言提交失败', {
        reason: 'validation_failed'
      })
    }
  } catch (error) {
    console.error('提交留言错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}


/**
 * 获取留言列表
 * GET /api/messages
 * 
 * 需要认证: 是
 * 查询参数:
 * - status: 状态筛选（unread/read，可选）
 * - startDate: 开始日期（YYYY-MM-DD，可选）
 * - endDate: 结束日期（YYYY-MM-DD，可选）
 * - keyword: 关键词搜索（可选）
 * - page: 页码（默认 1）
 * - pageSize: 每页数量（默认 20，最大 100）
 * 
 * 响应: { data: Message[], total: number, page: number, pageSize: number, totalPages: number }
 * 
 * 需求: 4.1.1, 4.1.2, 4.1.3, 4.1.4
 */
export function getMessageListHandler(req: Request, res: Response): void {
  try {
    const { status, startDate, endDate, keyword, page, pageSize } = req.query
    
    // 验证状态参数
    let validStatus: MessageStatus | undefined
    if (status && typeof status === 'string') {
      if (!isValidMessageStatus(status)) {
        sendError(res, 400, '无效的状态参数，请使用 unread 或 read', {
          field: 'status',
          reason: 'invalid_value'
        })
        return
      }
      validStatus = status as MessageStatus
    }
    
    // 验证日期格式
    if (startDate && typeof startDate === 'string' && !isValidDateFormat(startDate)) {
      sendError(res, 400, '开始日期格式无效，请使用 YYYY-MM-DD 格式', {
        field: 'startDate',
        reason: 'invalid_format'
      })
      return
    }
    
    if (endDate && typeof endDate === 'string' && !isValidDateFormat(endDate)) {
      sendError(res, 400, '结束日期格式无效，请使用 YYYY-MM-DD 格式', {
        field: 'endDate',
        reason: 'invalid_format'
      })
      return
    }
    
    // 验证日期范围逻辑
    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (start > end) {
        sendError(res, 400, '开始日期不能晚于结束日期', {
          field: 'startDate',
          reason: 'invalid_range'
        })
        return
      }
    }
    
    // 解析分页参数
    const pageNum = page ? parseInt(page as string, 10) : 1
    const pageSizeNum = pageSize ? parseInt(pageSize as string, 10) : 20
    
    if (isNaN(pageNum) || pageNum < 1) {
      sendError(res, 400, '页码必须是大于 0 的整数', {
        field: 'page',
        reason: 'invalid_value'
      })
      return
    }
    
    if (isNaN(pageSizeNum) || pageSizeNum < 1) {
      sendError(res, 400, '每页数量必须是大于 0 的整数', {
        field: 'pageSize',
        reason: 'invalid_value'
      })
      return
    }
    
    // 调用服务获取留言列表
    const result = getMessageList({
      status: validStatus,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      keyword: keyword as string | undefined,
      page: pageNum,
      pageSize: pageSizeNum
    })
    
    res.json(result)
  } catch (error) {
    console.error('获取留言列表错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 获取留言详情
 * GET /api/messages/:id
 * 
 * 需要认证: 是
 * 路径参数: id - 留言 ID
 * 响应: { message: Message }
 * 
 * 需求: 4.2.1
 */
export function getMessageDetailHandler(req: Request, res: Response): void {
  try {
    const { id } = req.params
    
    // 验证 ID 参数
    if (!id) {
      sendError(res, 400, '请提供留言 ID', {
        field: 'id',
        reason: 'required'
      })
      return
    }
    
    const messageId = parseInt(id, 10)
    if (isNaN(messageId) || messageId < 1) {
      sendError(res, 400, '无效的留言 ID', {
        field: 'id',
        reason: 'invalid_value'
      })
      return
    }
    
    // 获取留言详情
    const message = getMessage(messageId)
    
    if (!message) {
      sendError(res, 404, '留言不存在')
      return
    }
    
    res.json({ message })
  } catch (error) {
    console.error('获取留言详情错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 标记留言为已读
 * PUT /api/messages/:id/read
 * 
 * 需要认证: 是
 * 路径参数: id - 留言 ID
 * 响应: { success: boolean }
 * 
 * 需求: 4.2.2
 */
export function markAsReadHandler(req: Request, res: Response): void {
  try {
    const { id } = req.params
    
    // 验证 ID 参数
    if (!id) {
      sendError(res, 400, '请提供留言 ID', {
        field: 'id',
        reason: 'required'
      })
      return
    }
    
    const messageId = parseInt(id, 10)
    if (isNaN(messageId) || messageId < 1) {
      sendError(res, 400, '无效的留言 ID', {
        field: 'id',
        reason: 'invalid_value'
      })
      return
    }
    
    // 检查留言是否存在
    const message = getMessage(messageId)
    if (!message) {
      sendError(res, 404, '留言不存在')
      return
    }
    
    // 标记为已读
    const success = markMessageAsRead(messageId)
    
    if (!success) {
      sendError(res, 500, '标记已读失败')
      return
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('标记已读错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 标记留言为未读
 * PUT /api/messages/:id/unread
 * 
 * 需要认证: 是
 * 路径参数: id - 留言 ID
 * 响应: { success: boolean }
 * 
 * 需求: 4.2.2
 */
export function markAsUnreadHandler(req: Request, res: Response): void {
  try {
    const { id } = req.params
    
    // 验证 ID 参数
    if (!id) {
      sendError(res, 400, '请提供留言 ID', {
        field: 'id',
        reason: 'required'
      })
      return
    }
    
    const messageId = parseInt(id, 10)
    if (isNaN(messageId) || messageId < 1) {
      sendError(res, 400, '无效的留言 ID', {
        field: 'id',
        reason: 'invalid_value'
      })
      return
    }
    
    // 检查留言是否存在
    const message = getMessage(messageId)
    if (!message) {
      sendError(res, 404, '留言不存在')
      return
    }
    
    // 标记为未读
    const success = markMessageAsUnread(messageId)
    
    if (!success) {
      sendError(res, 500, '标记未读失败')
      return
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('标记未读错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}


/**
 * 删除留言
 * DELETE /api/messages/:id
 * 
 * 需要认证: 是
 * 路径参数: id - 留言 ID
 * 响应: { success: boolean }
 * 
 * 需求: 4.2.3
 */
export function deleteMessageHandler(req: Request, res: Response): void {
  try {
    const { id } = req.params
    
    // 验证 ID 参数
    if (!id) {
      sendError(res, 400, '请提供留言 ID', {
        field: 'id',
        reason: 'required'
      })
      return
    }
    
    const messageId = parseInt(id, 10)
    if (isNaN(messageId) || messageId < 1) {
      sendError(res, 400, '无效的留言 ID', {
        field: 'id',
        reason: 'invalid_value'
      })
      return
    }
    
    // 检查留言是否存在
    const message = getMessage(messageId)
    if (!message) {
      sendError(res, 404, '留言不存在')
      return
    }
    
    // 删除留言
    const success = deleteMessage(messageId)
    
    if (!success) {
      sendError(res, 500, '删除留言失败')
      return
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('删除留言错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 批量删除留言
 * POST /api/messages/batch-delete
 * 
 * 需要认证: 是
 * 请求体: { ids: number[] }
 * 响应: { success: boolean, count: number }
 * 
 * 需求: 4.2.3
 */
export function batchDeleteHandler(req: Request, res: Response): void {
  try {
    const { ids } = req.body
    
    // 验证 ids 参数
    if (!ids || !Array.isArray(ids)) {
      sendError(res, 400, '请提供要删除的留言 ID 列表', {
        field: 'ids',
        reason: 'required'
      })
      return
    }
    
    if (ids.length === 0) {
      sendError(res, 400, '留言 ID 列表不能为空', {
        field: 'ids',
        reason: 'empty'
      })
      return
    }
    
    // 验证每个 ID 是否为有效数字
    const validIds: number[] = []
    for (const id of ids) {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id
      if (typeof numId !== 'number' || isNaN(numId) || numId < 1) {
        sendError(res, 400, '留言 ID 列表包含无效的 ID', {
          field: 'ids',
          reason: 'invalid_value'
        })
        return
      }
      validIds.push(numId)
    }
    
    // 批量删除
    const result = batchDeleteMessages(validIds)
    
    res.json({
      success: result.success,
      count: result.count
    })
  } catch (error) {
    console.error('批量删除留言错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 导出留言
 * GET /api/messages/export
 * 
 * 需要认证: 是
 * 查询参数:
 * - format: 导出格式（excel/csv，必填）
 * - startDate: 开始日期（YYYY-MM-DD，可选）
 * - endDate: 结束日期（YYYY-MM-DD，可选）
 * 
 * 响应: 文件下载
 * 
 * 需求: 4.4.1, 4.4.2
 */
export async function exportMessagesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { format, startDate, endDate } = req.query
    
    // 验证格式参数
    if (!format || typeof format !== 'string') {
      sendError(res, 400, '请指定导出格式（excel 或 csv）', {
        field: 'format',
        reason: 'required'
      })
      return
    }
    
    if (!['excel', 'csv'].includes(format)) {
      sendError(res, 400, '无效的导出格式，请使用 excel 或 csv', {
        field: 'format',
        reason: 'invalid_value'
      })
      return
    }
    
    // 验证日期格式
    if (startDate && typeof startDate === 'string' && !isValidDateFormat(startDate)) {
      sendError(res, 400, '开始日期格式无效，请使用 YYYY-MM-DD 格式', {
        field: 'startDate',
        reason: 'invalid_format'
      })
      return
    }
    
    if (endDate && typeof endDate === 'string' && !isValidDateFormat(endDate)) {
      sendError(res, 400, '结束日期格式无效，请使用 YYYY-MM-DD 格式', {
        field: 'endDate',
        reason: 'invalid_format'
      })
      return
    }
    
    // 验证日期范围逻辑
    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (start > end) {
        sendError(res, 400, '开始日期不能晚于结束日期', {
          field: 'startDate',
          reason: 'invalid_range'
        })
        return
      }
    }
    
    // 调用导出服务
    const result = await exportMessages({
      format: format as ExportFormat,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined
    })
    
    if (!result.success || !result.data) {
      sendError(res, 500, result.error || '导出失败')
      return
    }
    
    // 设置响应头
    res.setHeader('Content-Type', result.mimeType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename || 'export')}"`)
    res.setHeader('Content-Length', result.data.length)
    
    // 发送文件数据
    res.send(result.data)
  } catch (error) {
    console.error('导出留言错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}
