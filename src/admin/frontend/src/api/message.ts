/**
 * 留言管理 API 接口
 * 提供留言管理相关的 API 调用
 * 
 * 需求: 4.1.1-4.4.2
 */
import request from './request'
import type { Message, PaginatedResponse } from '@/types'

/**
 * 留言列表响应
 */
export interface MessageListResponse extends PaginatedResponse<Message> {
  totalPages: number
}

/**
 * 获取留言列表
 * 
 * @param params - 筛选参数
 * @returns 留言列表和分页信息
 * 
 * 需求: 4.1.1, 4.1.2, 4.1.3, 4.1.4
 */
export function getMessageList(params: {
  status?: string
  startDate?: string
  endDate?: string
  keyword?: string
  page?: number
  pageSize?: number
}) {
  return request.get<MessageListResponse>('/messages', { params })
}

/**
 * 获取留言详情
 * 
 * @param id - 留言 ID
 * @returns 留言详情
 * 
 * 需求: 4.2.1
 */
export function getMessageDetail(id: number) {
  return request.get<{ message: Message }>(`/messages/${id}`)
}

/**
 * 标记留言为已读
 * 
 * @param id - 留言 ID
 * @returns 操作结果
 * 
 * 需求: 4.2.2
 */
export function markAsRead(id: number) {
  return request.put<{ success: boolean }>(`/messages/${id}/read`)
}

/**
 * 标记留言为未读
 * 
 * @param id - 留言 ID
 * @returns 操作结果
 * 
 * 需求: 4.2.2
 */
export function markAsUnread(id: number) {
  return request.put<{ success: boolean }>(`/messages/${id}/unread`)
}

/**
 * 删除留言
 * 
 * @param id - 留言 ID
 * @returns 操作结果
 * 
 * 需求: 4.2.3
 */
export function deleteMessage(id: number) {
  return request.delete<{ success: boolean }>(`/messages/${id}`)
}

/**
 * 批量删除留言
 * 
 * @param ids - 留言 ID 列表
 * @returns 操作结果和删除数量
 * 
 * 需求: 4.2.3
 */
export function batchDeleteMessages(ids: number[]) {
  return request.post<{ success: boolean; count: number }>('/messages/batch-delete', { ids })
}

/**
 * 导出留言
 * 
 * @param params - 导出参数
 * @returns 文件下载
 * 
 * 需求: 4.4.1, 4.4.2
 */
export function exportMessages(params: {
  format: 'excel' | 'csv'
  startDate?: string
  endDate?: string
}) {
  return request.get('/messages/export', {
    params,
    responseType: 'blob'
  })
}
