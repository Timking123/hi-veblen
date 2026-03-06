/**
 * 留言数据模型
 * 定义留言管理相关的 TypeScript 接口
 * 
 * 对应数据库表: messages
 * 
 * 需求: 4.1.1-4.3.4
 */

// ========== 留言状态类型 ==========

/**
 * 留言状态类型
 * - unread: 未读
 * - read: 已读
 */
export type MessageStatus = 'unread' | 'read'

// ========== 留言接口 ==========

/**
 * 留言接口
 * 对应数据库表: messages
 * 
 * 需求: 4.1.1 - 以表格形式展示留言（称呼、联系方式、内容摘要、时间、状态）
 */
export interface Message {
  /** 唯一标识符（自增） */
  id: number
  /** 称呼/昵称 */
  nickname: string
  /** 联系方式（邮箱或电话） */
  contact: string
  /** 留言内容 */
  content: string
  /** 留言状态 */
  status: MessageStatus
  /** 对应的文件路径 */
  file_path: string | null
  /** 创建时间 */
  created_at: string
  /** 阅读时间 */
  read_at: string | null
}

/**
 * 创建留言时的输入数据（不包含 id 和自动生成的字段）
 */
export interface MessageInput {
  /** 称呼/昵称 */
  nickname: string
  /** 联系方式 */
  contact: string
  /** 留言内容 */
  content: string
}

/**
 * 数据库原始行数据
 */
export interface MessageRow {
  id: number
  nickname: string
  contact: string
  content: string
  status: string
  file_path: string | null
  created_at: string
  read_at: string | null
}

// ========== 留言筛选参数 ==========

/**
 * 留言筛选参数接口
 * 
 * 需求: 4.1.2 - 支持按时间范围筛选留言
 * 需求: 4.1.3 - 支持按状态筛选（全部/未读/已读）
 * 需求: 4.1.4 - 支持关键词搜索留言内容
 */
export interface MessageFilterParams {
  /** 状态筛选（可选） */
  status?: MessageStatus
  /** 开始日期（可选，格式：YYYY-MM-DD） */
  startDate?: string
  /** 结束日期（可选，格式：YYYY-MM-DD） */
  endDate?: string
  /** 关键词搜索（可选） */
  keyword?: string
  /** 页码（从 1 开始） */
  page?: number
  /** 每页数量 */
  pageSize?: number
}

/**
 * 分页结果接口
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  data: T[]
  /** 总数量 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 总页数 */
  totalPages: number
}

// ========== 留言文件存储格式 ==========

/**
 * 留言文件内容格式
 * 
 * 需求: 4.3.3 - 以最小空间格式存储（每行一个字段）
 * 
 * 文件格式示例：
 * ```
 * 称呼: 张三
 * 联系方式: zhangsan@example.com
 * 时间: 2024-01-15 10:30:00
 * 内容:
 * 这是留言内容
 * 可以是多行
 * ```
 */
export interface MessageFileContent {
  nickname: string
  contact: string
  createdAt: string
  content: string
}

// ========== 工具函数 ==========

/**
 * 将数据库行数据转换为 Message 接口
 */
export function parseMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    nickname: row.nickname,
    contact: row.contact,
    content: row.content,
    status: row.status as MessageStatus,
    file_path: row.file_path,
    created_at: row.created_at,
    read_at: row.read_at
  }
}

/**
 * 验证留言状态是否有效
 */
export function isValidMessageStatus(status: string): status is MessageStatus {
  return ['unread', 'read'].includes(status)
}

/**
 * 验证日期格式是否有效（YYYY-MM-DD）
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return false
  }
  
  // 验证日期是否有效
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * 生成留言文件名
 * 
 * 需求: 4.3.2 - 使用"YYYY-MM-DD_称呼.txt"格式命名文件
 * 需求: 4.3.4 - 同一天同一称呼有多条留言时添加序号后缀
 * 
 * @param date - 日期对象或日期字符串
 * @param nickname - 称呼
 * @param existingCount - 同一天同一称呼已存在的留言数量
 * @returns 文件名
 */
export function generateMessageFileName(
  date: Date | string,
  nickname: string,
  existingCount: number = 0
): string {
  // 格式化日期为 YYYY-MM-DD
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  
  // 清理称呼中的特殊字符（用于文件名）
  const safeNickname = sanitizeFileName(nickname)
  
  // 如果已存在同一天同一称呼的留言，添加序号后缀
  if (existingCount > 0) {
    return `${dateStr}_${safeNickname}_${existingCount + 1}.txt`
  }
  
  return `${dateStr}_${safeNickname}.txt`
}

/**
 * 清理文件名中的特殊字符
 * 
 * @param name - 原始名称
 * @returns 安全的文件名
 */
export function sanitizeFileName(name: string): string {
  // 移除或替换不安全的文件名字符
  return name
    .replace(/[<>:"/\\|?*]/g, '_')  // 替换 Windows 不允许的字符
    .replace(/\s+/g, '_')           // 替换空白字符
    .replace(/_{2,}/g, '_')         // 合并连续的下划线
    .replace(/^_|_$/g, '')          // 移除首尾下划线
    .substring(0, 50)               // 限制长度
}

/**
 * 序列化留言为文件内容
 * 
 * 需求: 4.3.3 - 以最小空间格式存储（每行一个字段）
 * 
 * @param message - 留言数据
 * @returns 文件内容字符串
 */
export function serializeMessageToFile(message: MessageFileContent): string {
  const lines = [
    `称呼: ${message.nickname}`,
    `联系方式: ${message.contact}`,
    `时间: ${message.createdAt}`,
    `内容:`,
    message.content
  ]
  
  return lines.join('\n')
}

/**
 * 从文件内容反序列化留言
 * 
 * @param content - 文件内容字符串
 * @returns 留言数据或 null（解析失败时）
 */
export function deserializeMessageFromFile(content: string): MessageFileContent | null {
  try {
    const lines = content.split('\n')
    
    // 解析各字段
    let nickname = ''
    let contact = ''
    let createdAt = ''
    let contentStartIndex = -1
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // 确保 line 不为 undefined
      if (line === undefined) {
        continue
      }
      
      if (line.startsWith('称呼: ')) {
        nickname = line.substring(4).trim()
      } else if (line.startsWith('联系方式: ')) {
        contact = line.substring(5).trim()
      } else if (line.startsWith('时间: ')) {
        createdAt = line.substring(4).trim()
      } else if (line.startsWith('内容:')) {
        contentStartIndex = i + 1
        break
      }
    }
    
    // 验证必要字段
    if (!nickname || !contact || !createdAt || contentStartIndex === -1) {
      return null
    }
    
    // 提取内容（从"内容:"行之后到文件末尾）
    const messageContent = lines.slice(contentStartIndex).join('\n')
    
    return {
      nickname,
      contact,
      createdAt,
      content: messageContent
    }
  } catch {
    return null
  }
}

/**
 * 从日期字符串中提取日期部分（YYYY-MM-DD）
 * 
 * @param dateTimeStr - 日期时间字符串
 * @returns 日期部分
 */
export function extractDatePart(dateTimeStr: string): string {
  // 处理 ISO 格式或 SQLite 格式的日期时间
  const match = dateTimeStr.match(/^(\d{4}-\d{2}-\d{2})/)
  return match && match[1] ? match[1] : dateTimeStr.substring(0, 10)
}

/**
 * 获取内容摘要（用于列表展示）
 * 
 * @param content - 完整内容
 * @param maxLength - 最大长度（默认 50）
 * @returns 摘要文本
 */
export function getContentSummary(content: string, maxLength: number = 50): string {
  // 移除换行符，合并为单行
  const singleLine = content.replace(/\s+/g, ' ').trim()
  
  if (singleLine.length <= maxLength) {
    return singleLine
  }
  
  return singleLine.substring(0, maxLength - 3) + '...'
}

/**
 * 验证联系方式格式（邮箱或手机号）
 * 
 * @param contact - 联系方式
 * @returns 是否有效
 */
export function isValidContact(contact: string): boolean {
  // 邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  // 中国大陆手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  
  return emailRegex.test(contact) || phoneRegex.test(contact)
}

/**
 * 验证留言输入数据
 * 
 * @param input - 留言输入数据
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validateMessageInput(input: MessageInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // 验证称呼
  if (!input.nickname || input.nickname.trim().length === 0) {
    errors.push('称呼不能为空')
  } else if (input.nickname.length > 50) {
    errors.push('称呼长度不能超过 50 个字符')
  }
  
  // 验证联系方式
  if (!input.contact || input.contact.trim().length === 0) {
    errors.push('联系方式不能为空')
  } else if (!isValidContact(input.contact)) {
    errors.push('联系方式格式无效（请输入有效的邮箱或手机号）')
  }
  
  // 验证内容
  if (!input.content || input.content.trim().length === 0) {
    errors.push('留言内容不能为空')
  } else if (input.content.length > 2000) {
    errors.push('留言内容长度不能超过 2000 个字符')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
