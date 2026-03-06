/**
 * 导出服务模块
 * 提供留言数据导出功能，支持 Excel 和 CSV 格式
 * 
 * 需求: 4.4.1 - 提供导出为 Excel/CSV 功能
 * 需求: 4.4.2 - 支持按时间范围选择导出数据
 */

import ExcelJS from 'exceljs'
import { getDatabase } from '../database/init'
import { Message, MessageRow, parseMessageRow } from '../models/message'

// ========== 类型定义 ==========

/**
 * 导出格式类型
 */
export type ExportFormat = 'excel' | 'csv'

/**
 * 导出参数接口
 * 
 * 需求: 4.4.2 - 支持按时间范围选择导出数据
 */
export interface ExportParams {
  /** 导出格式 */
  format: ExportFormat
  /** 开始日期（可选，格式：YYYY-MM-DD） */
  startDate?: string
  /** 结束日期（可选，格式：YYYY-MM-DD） */
  endDate?: string
}

/**
 * 导出结果接口
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean
  /** 文件数据（Buffer） */
  data?: Buffer
  /** 文件名 */
  filename?: string
  /** MIME 类型 */
  mimeType?: string
  /** 错误信息 */
  error?: string
}

/**
 * 导出字段配置
 * 
 * 导出字段应包含：
 * - 称呼 (nickname)
 * - 联系方式 (contact)
 * - 留言内容 (content)
 * - 状态 (status)
 * - 创建时间 (created_at)
 * - 阅读时间 (read_at)
 */
interface ExportColumn {
  /** 字段键名 */
  key: keyof Message
  /** 列标题（中文） */
  header: string
  /** 列宽度 */
  width: number
}

// ========== 常量配置 ==========

/**
 * 导出列配置
 */
const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'nickname', header: '称呼', width: 15 },
  { key: 'contact', header: '联系方式', width: 25 },
  { key: 'content', header: '留言内容', width: 50 },
  { key: 'status', header: '状态', width: 10 },
  { key: 'created_at', header: '创建时间', width: 20 },
  { key: 'read_at', header: '阅读时间', width: 20 }
]

/**
 * 状态显示文本映射
 */
const STATUS_TEXT: Record<string, string> = {
  'unread': '未读',
  'read': '已读'
}

// ========== 辅助函数 ==========

/**
 * 验证日期格式是否有效（YYYY-MM-DD）
 * 
 * @param date - 日期字符串
 * @returns 是否有效
 */
function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return false
  }
  
  // 验证日期是否有效
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * 生成导出文件名
 * 
 * @param format - 导出格式
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 文件名
 */
function generateExportFilename(
  format: ExportFormat,
  startDate?: string,
  endDate?: string
): string {
  const now = new Date()
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  
  let filename = `留言导出_${timestamp}`
  
  // 如果有时间范围，添加到文件名
  if (startDate && endDate) {
    filename = `留言导出_${startDate}_至_${endDate}`
  } else if (startDate) {
    filename = `留言导出_${startDate}_起`
  } else if (endDate) {
    filename = `留言导出_至_${endDate}`
  }
  
  const extension = format === 'excel' ? 'xlsx' : 'csv'
  return `${filename}.${extension}`
}

/**
 * 格式化留言数据用于导出
 * 
 * @param message - 留言数据
 * @returns 格式化后的数据对象
 */
function formatMessageForExport(message: Message): Record<string, string> {
  return {
    nickname: message.nickname,
    contact: message.contact,
    content: message.content,
    status: STATUS_TEXT[message.status] || message.status,
    created_at: message.created_at,
    read_at: message.read_at || ''
  }
}

// ========== 数据查询 ==========

/**
 * 获取导出数据
 * 
 * 需求: 4.4.2 - 支持按时间范围选择导出数据
 * 
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 留言列表
 */
export function getMessagesForExport(startDate?: string, endDate?: string): Message[] {
  const db = getDatabase()
  
  // 构建查询条件
  const conditions: string[] = []
  const queryParams: string[] = []
  
  // 时间范围筛选
  if (startDate) {
    conditions.push('date(created_at) >= ?')
    queryParams.push(startDate)
  }
  if (endDate) {
    conditions.push('date(created_at) <= ?')
    queryParams.push(endDate)
  }
  
  // 构建 WHERE 子句
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  
  // 查询数据（按创建时间降序）
  const sql = `
    SELECT id, nickname, contact, content, status, file_path, created_at, read_at
    FROM messages
    ${whereClause}
    ORDER BY created_at DESC
  `
  
  const result = db.exec(sql, queryParams)
  
  if (result.length === 0 || !result[0]?.values) {
    return []
  }
  
  // 解析结果
  return result[0].values.map(row => {
    const messageRow: MessageRow = {
      id: row[0] as number,
      nickname: row[1] as string,
      contact: row[2] as string,
      content: row[3] as string,
      status: row[4] as string,
      file_path: row[5] as string | null,
      created_at: row[6] as string,
      read_at: row[7] as string | null
    }
    return parseMessageRow(messageRow)
  })
}

// ========== 导出功能 ==========

/**
 * 导出留言为 Excel 格式
 * 
 * 需求: 4.4.1 - 提供导出为 Excel/CSV 功能
 * 
 * @param messages - 留言列表
 * @returns Excel 文件 Buffer
 */
async function exportToExcel(messages: Message[]): Promise<Buffer> {
  // 创建工作簿
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '后台管理系统'
  workbook.created = new Date()
  
  // 创建工作表
  const worksheet = workbook.addWorksheet('留言列表', {
    properties: { defaultColWidth: 15 }
  })
  
  // 设置列配置
  worksheet.columns = EXPORT_COLUMNS.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width
  }))
  
  // 设置表头样式
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 25
  
  // 添加数据行
  for (const message of messages) {
    const formattedData = formatMessageForExport(message)
    const row = worksheet.addRow(formattedData)
    
    // 设置数据行样式
    row.alignment = { vertical: 'top', wrapText: true }
    
    // 根据状态设置背景色
    if (message.status === 'unread') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' } // 浅黄色表示未读
      }
    }
  }
  
  // 添加边框
  worksheet.eachRow((row, _rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      }
    })
  })
  
  // 冻结首行
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  
  // 生成 Buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * 导出留言为 CSV 格式
 * 
 * 需求: 4.4.1 - 提供导出为 Excel/CSV 功能
 * 
 * @param messages - 留言列表
 * @returns CSV 文件 Buffer
 */
function exportToCsv(messages: Message[]): Buffer {
  const lines: string[] = []
  
  // 添加 BOM（用于 Excel 正确识别 UTF-8 编码）
  const BOM = '\uFEFF'
  
  // 添加表头
  const headers = EXPORT_COLUMNS.map(col => col.header)
  lines.push(headers.join(','))
  
  // 添加数据行
  for (const message of messages) {
    const formattedData = formatMessageForExport(message)
    const values = EXPORT_COLUMNS.map(col => {
      const value = formattedData[col.key] || ''
      // CSV 转义：如果包含逗号、引号或换行符，需要用引号包裹并转义内部引号
      if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    lines.push(values.join(','))
  }
  
  // 生成 Buffer（带 BOM）
  const csvContent = BOM + lines.join('\r\n')
  return Buffer.from(csvContent, 'utf-8')
}

/**
 * 导出留言数据
 * 
 * 需求: 4.4.1 - 提供导出为 Excel/CSV 功能
 * 需求: 4.4.2 - 支持按时间范围选择导出数据
 * 
 * @param params - 导出参数
 * @returns 导出结果
 */
export async function exportMessages(params: ExportParams): Promise<ExportResult> {
  try {
    // 验证格式参数
    if (!params.format || !['excel', 'csv'].includes(params.format)) {
      return {
        success: false,
        error: '无效的导出格式，请选择 excel 或 csv'
      }
    }
    
    // 验证日期格式
    if (params.startDate && !isValidDateFormat(params.startDate)) {
      return {
        success: false,
        error: '开始日期格式无效，请使用 YYYY-MM-DD 格式'
      }
    }
    
    if (params.endDate && !isValidDateFormat(params.endDate)) {
      return {
        success: false,
        error: '结束日期格式无效，请使用 YYYY-MM-DD 格式'
      }
    }
    
    // 验证日期范围逻辑
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate)
      const end = new Date(params.endDate)
      if (start > end) {
        return {
          success: false,
          error: '开始日期不能晚于结束日期'
        }
      }
    }
    
    // 获取数据
    const messages = getMessagesForExport(params.startDate, params.endDate)
    
    // 生成文件名
    const filename = generateExportFilename(params.format, params.startDate, params.endDate)
    
    // 根据格式导出
    let data: Buffer
    let mimeType: string
    
    if (params.format === 'excel') {
      data = await exportToExcel(messages)
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else {
      data = exportToCsv(messages)
      mimeType = 'text/csv; charset=utf-8'
    }
    
    return {
      success: true,
      data,
      filename,
      mimeType
    }
  } catch (error) {
    console.error('导出留言失败:', error)
    return {
      success: false,
      error: '导出失败，请稍后重试'
    }
  }
}

/**
 * 获取导出数据统计
 * 
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 统计信息
 */
export function getExportStats(startDate?: string, endDate?: string): {
  total: number
  unread: number
  read: number
} {
  const messages = getMessagesForExport(startDate, endDate)
  
  const unread = messages.filter(m => m.status === 'unread').length
  const read = messages.filter(m => m.status === 'read').length
  
  return {
    total: messages.length,
    unread,
    read
  }
}

/**
 * 验证导出参数
 * 
 * @param params - 导出参数
 * @returns 验证结果
 */
export function validateExportParams(params: Partial<ExportParams>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // 验证格式
  if (!params.format) {
    errors.push('导出格式不能为空')
  } else if (!['excel', 'csv'].includes(params.format)) {
    errors.push('无效的导出格式，请选择 excel 或 csv')
  }
  
  // 验证日期格式
  if (params.startDate && !isValidDateFormat(params.startDate)) {
    errors.push('开始日期格式无效，请使用 YYYY-MM-DD 格式')
  }
  
  if (params.endDate && !isValidDateFormat(params.endDate)) {
    errors.push('结束日期格式无效，请使用 YYYY-MM-DD 格式')
  }
  
  // 验证日期范围
  if (params.startDate && params.endDate) {
    const start = new Date(params.startDate)
    const end = new Date(params.endDate)
    if (start > end) {
      errors.push('开始日期不能晚于结束日期')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
