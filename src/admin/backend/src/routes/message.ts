/**
 * 留言管理路由模块
 * 注册所有留言管理相关路由
 * 
 * 路由列表:
 * - POST /submit - 提交留言（公开接口）
 * - GET / - 获取留言列表（需要认证）
 * - GET /export - 导出留言（需要认证）
 * - GET /:id - 获取留言详情（需要认证）
 * - PUT /:id/read - 标记已读（需要认证）
 * - PUT /:id/unread - 标记未读（需要认证）
 * - DELETE /:id - 删除留言（需要认证）
 * - POST /batch-delete - 批量删除（需要认证）
 * 
 * 需求: 4.1.1-4.4.2
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  submitMessageHandler,
  getMessageListHandler,
  getMessageDetailHandler,
  markAsReadHandler,
  markAsUnreadHandler,
  deleteMessageHandler,
  batchDeleteHandler,
  exportMessagesHandler
} from '../controllers/message'

const router = Router()

/**
 * POST /submit
 * 提交留言（公开接口，供前端网站调用）
 * 
 * 需要认证: 否
 * 请求体: { nickname, contact, message }
 * 响应: { success, id }
 * 
 * 注意: 此路由必须在 /:id 之前定义，否则会被 /:id 匹配
 * 
 * 需求: 4.3.1
 */
router.post('/submit', submitMessageHandler)

/**
 * GET /
 * 获取留言列表
 * 
 * 需要认证: 是
 * 查询参数: status, startDate, endDate, keyword, page, pageSize
 * 响应: { data, total, page, pageSize, totalPages }
 * 
 * 需求: 4.1.1, 4.1.2, 4.1.3, 4.1.4
 */
router.get('/', authMiddleware, getMessageListHandler)

/**
 * GET /export
 * 导出留言
 * 
 * 需要认证: 是
 * 查询参数: format (excel|csv), startDate, endDate
 * 响应: 文件下载
 * 
 * 注意: 此路由必须在 /:id 之前定义，否则会被 /:id 匹配
 * 
 * 需求: 4.4.1, 4.4.2
 */
router.get('/export', authMiddleware, exportMessagesHandler)

/**
 * POST /batch-delete
 * 批量删除留言
 * 
 * 需要认证: 是
 * 请求体: { ids: number[] }
 * 响应: { success, count }
 * 
 * 注意: 此路由必须在 /:id 之前定义，否则会被 /:id 匹配
 * 
 * 需求: 4.2.3
 */
router.post('/batch-delete', authMiddleware, batchDeleteHandler)

/**
 * GET /:id
 * 获取留言详情
 * 
 * 需要认证: 是
 * 路径参数: id - 留言 ID
 * 响应: { message }
 * 
 * 需求: 4.2.1
 */
router.get('/:id', authMiddleware, getMessageDetailHandler)

/**
 * PUT /:id/read
 * 标记留言为已读
 * 
 * 需要认证: 是
 * 路径参数: id - 留言 ID
 * 响应: { success }
 * 
 * 需求: 4.2.2
 */
router.put('/:id/read', authMiddleware, markAsReadHandler)

/**
 * PUT /:id/unread
 * 标记留言为未读
 * 
 * 需要认证: 是
 * 路径参数: id - 留言 ID
 * 响应: { success }
 * 
 * 需求: 4.2.2
 */
router.put('/:id/unread', authMiddleware, markAsUnreadHandler)

/**
 * DELETE /:id
 * 删除留言
 * 
 * 需要认证: 是
 * 路径参数: id - 留言 ID
 * 响应: { success }
 * 
 * 需求: 4.2.3
 */
router.delete('/:id', authMiddleware, deleteMessageHandler)

export default router
