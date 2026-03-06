/**
 * 留言服务模块
 * 提供留言管理相关的 CRUD 操作和文件存储功能
 * 
 * 需求: 4.1.1-4.3.4
 */

import path from 'path'
import fs from 'fs'
import { getDatabase, saveDatabase } from '../database/init'
import {
  Message,
  MessageRow,
  MessageInput,
  MessageFilterParams,
  PaginatedResult,
  MessageFileContent,
  parseMessageRow,
  generateMessageFileName,
  serializeMessageToFile,
  deserializeMessageFromFile,
  validateMessageInput
} from '../models/message'

// ========== 常量配置 ==========

/**
 * 留言文件存储目录
 * 需求: 4.3.1 - 将留言保存到 file/message/ 文件夹
 */
const MESSAGE_DIR = path.resolve(__dirname, '../../../file/message')

/**
 * 默认分页大小
 */
const DEFAULT_PAGE_SIZE = 20

/**
 * 最大分页大小
 */
const MAX_PAGE_SIZE = 100

// ========== 辅助函数 ==========

/**
 * 确保留言目录存在
 */
function ensureMessageDir(): void {
  if (!fs.existsSync(MESSAGE_DIR)) {
    fs.mkdirSync(MESSAGE_DIR, { recursive: true })
  }
}

/**
 * 获取同一天同一称呼的留言数量
 * 
 * @param date - 日期
 * @param nickname - 称呼
 * @returns 已存在的留言数量
 */
function getExistingMessageCount(date: Date, nickname: string): number {
  ensureMessageDir()
  
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  
  // 读取目录中的文件
  const files = fs.readdirSync(MESSAGE_DIR)
  
  // 统计匹配的文件数量
  // 匹配格式：YYYY-MM-DD_称呼.txt 或 YYYY-MM-DD_称呼_N.txt
  const pattern = new RegExp(`^${dateStr}_${escapeRegExp(nickname)}(_\\d+)?\\.txt$`)
  
  return files.filter(file => pattern.test(file)).length
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ========== 留言 CRUD 操作 ==========

/**
 * 获取留言列表（支持筛选和分页）
 * 
 * 需求: 4.1.1 - 以表格形式展示留言
 * 需求: 4.1.2 - 支持按时间范围筛选留言
 * 需求: 4.1.3 - 支持按状态筛选（全部/未读/已读）
 * 需求: 4.1.4 - 支持关键词搜索留言内容
 * 
 * @param params - 筛选参数
 * @returns 分页结果
 */
export function getMessageList(params: MessageFilterParams = {}): PaginatedResult<Message> {
  const db = getDatabase()
  
  // 处理分页参数
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE))
  const offset = (page - 1) * pageSize
  
  // 构建查询条件
  const conditions: string[] = []
  const queryParams: (string | number)[] = []
  
  // 状态筛选
  if (params.status) {
    conditions.push('status = ?')
    queryParams.push(params.status)
  }
  
  // 时间范围筛选
  if (params.startDate) {
    conditions.push('date(created_at) >= ?')
    queryParams.push(params.startDate)
  }
  if (params.endDate) {
    conditions.push('date(created_at) <= ?')
    queryParams.push(params.endDate)
  }
  
  // 关键词搜索（搜索称呼、联系方式、内容）
  if (params.keyword) {
    const keyword = `%${params.keyword}%`
    conditions.push('(nickname LIKE ? OR contact LIKE ? OR content LIKE ?)')
    queryParams.push(keyword, keyword, keyword)
  }
  
  // 构建 WHERE 子句
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  
  // 查询总数
  const countSql = `SELECT COUNT(*) as count FROM messages ${whereClause}`
  const countResult = db.exec(countSql, queryParams)
  const total = countResult.length > 0 && countResult[0]?.values?.[0]
    ? (countResult[0].values[0][0] as number)
    : 0
  
  // 查询数据
  const dataSql = `
    SELECT id, nickname, contact, content, status, file_path, created_at, read_at
    FROM messages
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `
  const dataParams = [...queryParams, pageSize, offset]
  const dataResult = db.exec(dataSql, dataParams)
  
  // 解析结果
  const data: Message[] = []
  if (dataResult.length > 0 && dataResult[0]?.values) {
    for (const row of dataResult[0].values) {
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
      data.push(parseMessageRow(messageRow))
    }
  }
  
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

/**
 * 获取单个留言详情
 * 
 * 需求: 4.2.1 - 提供查看留言详情功能
 * 
 * @param id - 留言 ID
 * @returns 留言详情或 null
 */
export function getMessage(id: number): Message | null {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, nickname, contact, content, status, file_path, created_at, read_at
    FROM messages
    WHERE id = ?
  `, [id])
  
  if (result.length === 0 || !result[0]?.values?.[0]) {
    return null
  }
  
  const row = result[0].values[0]
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
}

/**
 * 创建留言
 * 
 * 需求: 4.3.1 - 将留言保存到 file/message/ 文件夹
 * 需求: 4.3.2 - 使用"YYYY-MM-DD_称呼.txt"格式命名文件
 * 需求: 4.3.3 - 以最小空间格式存储（每行一个字段）
 * 需求: 4.3.4 - 同一天同一称呼有多条留言时添加序号后缀
 * 
 * @param input - 留言输入数据
 * @returns 创建结果，包含留言 ID 或错误信息
 */
export function createMessage(input: MessageInput): { success: boolean; id?: number; errors?: string[] } {
  // 验证输入
  const validation = validateMessageInput(input)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }
  
  const db = getDatabase()
  const now = new Date()
  
  try {
    // 生成文件名
    const existingCount = getExistingMessageCount(now, input.nickname)
    const fileName = generateMessageFileName(now, input.nickname, existingCount)
    const filePath = path.join(MESSAGE_DIR, fileName)
    
    // 格式化创建时间
    const createdAt = now.toISOString().replace('T', ' ').substring(0, 19)
    
    // 保存到文件
    ensureMessageDir()
    const fileContent: MessageFileContent = {
      nickname: input.nickname.trim(),
      contact: input.contact.trim(),
      createdAt,
      content: input.content.trim()
    }
    fs.writeFileSync(filePath, serializeMessageToFile(fileContent), 'utf-8')
    
    // 保存到数据库
    db.run(`
      INSERT INTO messages (nickname, contact, content, status, file_path, created_at)
      VALUES (?, ?, ?, 'unread', ?, ?)
    `, [
      input.nickname.trim(),
      input.contact.trim(),
      input.content.trim(),
      fileName,
      createdAt
    ])
    
    saveDatabase()
    
    // 获取插入的 ID
    const idResult = db.exec('SELECT last_insert_rowid() as id')
    const id = idResult.length > 0 && idResult[0]?.values?.[0]
      ? (idResult[0].values[0][0] as number)
      : -1
    
    return { success: true, id }
  } catch (error) {
    console.error('创建留言失败:', error)
    return { success: false, errors: ['创建留言失败，请稍后重试'] }
  }
}

/**
 * 标记留言为已读
 * 
 * 需求: 4.2.2 - 提供标记已读/未读功能
 * 
 * @param id - 留言 ID
 * @returns 是否成功
 */
export function markMessageAsRead(id: number): boolean {
  const db = getDatabase()
  
  try {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    
    db.run(`
      UPDATE messages
      SET status = 'read', read_at = ?
      WHERE id = ?
    `, [now, id])
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('标记留言已读失败:', error)
    return false
  }
}

/**
 * 标记留言为未读
 * 
 * 需求: 4.2.2 - 提供标记已读/未读功能
 * 
 * @param id - 留言 ID
 * @returns 是否成功
 */
export function markMessageAsUnread(id: number): boolean {
  const db = getDatabase()
  
  try {
    db.run(`
      UPDATE messages
      SET status = 'unread', read_at = NULL
      WHERE id = ?
    `, [id])
    
    saveDatabase()
    return true
  } catch (error) {
    console.error('标记留言未读失败:', error)
    return false
  }
}

/**
 * 删除留言
 * 
 * 需求: 4.2.3 - 提供删除留言功能
 * 
 * @param id - 留言 ID
 * @returns 是否成功
 */
export function deleteMessage(id: number): boolean {
  const db = getDatabase()
  
  try {
    // 先获取留言信息（用于删除文件）
    const message = getMessage(id)
    
    // 从数据库删除
    db.run('DELETE FROM messages WHERE id = ?', [id])
    saveDatabase()
    
    // 删除对应的文件
    if (message?.file_path) {
      const filePath = path.join(MESSAGE_DIR, message.file_path)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
    
    return true
  } catch (error) {
    console.error('删除留言失败:', error)
    return false
  }
}

/**
 * 批量删除留言
 * 
 * 需求: 4.2.3 - 提供删除留言功能（支持批量删除）
 * 
 * @param ids - 留言 ID 数组
 * @returns 删除结果，包含成功数量
 */
export function batchDeleteMessages(ids: number[]): { success: boolean; count: number } {
  if (ids.length === 0) {
    return { success: true, count: 0 }
  }
  
  const db = getDatabase()
  let deletedCount = 0
  
  try {
    // 获取所有要删除的留言（用于删除文件）
    const placeholders = ids.map(() => '?').join(', ')
    const result = db.exec(`
      SELECT id, file_path FROM messages WHERE id IN (${placeholders})
    `, ids)
    
    // 收集文件路径
    const filePaths: string[] = []
    if (result.length > 0 && result[0]?.values) {
      for (const row of result[0].values) {
        const filePath = row[1] as string | null
        if (filePath) {
          filePaths.push(filePath)
        }
      }
    }
    
    // 从数据库批量删除
    db.run(`DELETE FROM messages WHERE id IN (${placeholders})`, ids)
    saveDatabase()
    
    // 删除对应的文件
    for (const fileName of filePaths) {
      const filePath = path.join(MESSAGE_DIR, fileName)
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
          deletedCount++
        } catch {
          // 文件删除失败不影响整体结果
        }
      } else {
        deletedCount++
      }
    }
    
    // 如果没有文件需要删除，使用 ids 长度作为删除数量
    if (filePaths.length === 0) {
      deletedCount = ids.length
    }
    
    return { success: true, count: deletedCount }
  } catch (error) {
    console.error('批量删除留言失败:', error)
    return { success: false, count: deletedCount }
  }
}

// ========== 统计功能 ==========

/**
 * 获取留言统计数据
 * 
 * @returns 统计数据
 */
export function getMessageStats(): { total: number; unread: number; read: number } {
  const db = getDatabase()
  
  try {
    // 查询总数
    const totalResult = db.exec('SELECT COUNT(*) FROM messages')
    const total = totalResult.length > 0 && totalResult[0]?.values?.[0]
      ? (totalResult[0].values[0][0] as number)
      : 0
    
    // 查询未读数
    const unreadResult = db.exec("SELECT COUNT(*) FROM messages WHERE status = 'unread'")
    const unread = unreadResult.length > 0 && unreadResult[0]?.values?.[0]
      ? (unreadResult[0].values[0][0] as number)
      : 0
    
    return {
      total,
      unread,
      read: total - unread
    }
  } catch (error) {
    console.error('获取留言统计失败:', error)
    return { total: 0, unread: 0, read: 0 }
  }
}

/**
 * 获取最近的留言列表
 * 
 * @param limit - 数量限制
 * @returns 留言列表
 */
export function getRecentMessages(limit: number = 10): Message[] {
  const db = getDatabase()
  
  const result = db.exec(`
    SELECT id, nickname, contact, content, status, file_path, created_at, read_at
    FROM messages
    ORDER BY created_at DESC
    LIMIT ?
  `, [limit])
  
  if (result.length === 0 || !result[0]?.values) {
    return []
  }
  
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

// ========== 文件操作 ==========

/**
 * 从文件读取留言内容
 * 
 * @param fileName - 文件名
 * @returns 留言内容或 null
 */
export function readMessageFromFile(fileName: string): MessageFileContent | null {
  const filePath = path.join(MESSAGE_DIR, fileName)
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return deserializeMessageFromFile(content)
  } catch (error) {
    console.error('读取留言文件失败:', error)
    return null
  }
}

/**
 * 获取留言文件目录路径
 * 
 * @returns 目录路径
 */
export function getMessageDirectory(): string {
  return MESSAGE_DIR
}

/**
 * 列出所有留言文件
 * 
 * @returns 文件名列表
 */
export function listMessageFiles(): string[] {
  ensureMessageDir()
  
  try {
    return fs.readdirSync(MESSAGE_DIR)
      .filter(file => file.endsWith('.txt'))
      .sort()
      .reverse() // 按时间倒序（文件名以日期开头）
  } catch (error) {
    console.error('列出留言文件失败:', error)
    return []
  }
}

/**
 * 同步文件和数据库
 * 检查文件系统中的留言文件，确保与数据库一致
 * 
 * @returns 同步结果
 */
export function syncMessagesWithFiles(): { added: number; removed: number } {
  const db = getDatabase()
  let added = 0
  let removed = 0
  
  try {
    ensureMessageDir()
    
    // 获取数据库中的所有文件路径
    const dbResult = db.exec('SELECT file_path FROM messages WHERE file_path IS NOT NULL')
    const dbFilePaths = new Set<string>()
    if (dbResult.length > 0 && dbResult[0]?.values) {
      for (const row of dbResult[0].values) {
        if (row[0]) {
          dbFilePaths.add(row[0] as string)
        }
      }
    }
    
    // 获取文件系统中的所有文件
    const fsFiles = fs.readdirSync(MESSAGE_DIR).filter(f => f.endsWith('.txt'))
    const fsFilePaths = new Set(fsFiles)
    
    // 检查数据库中有但文件系统中没有的记录（标记为文件丢失）
    for (const dbPath of dbFilePaths) {
      if (!fsFilePaths.has(dbPath)) {
        // 文件不存在，可以选择删除数据库记录或标记
        // 这里选择保留记录但清空 file_path
        db.run('UPDATE messages SET file_path = NULL WHERE file_path = ?', [dbPath])
        removed++
      }
    }
    
    // 检查文件系统中有但数据库中没有的文件（导入到数据库）
    for (const fsPath of fsFilePaths) {
      if (!dbFilePaths.has(fsPath)) {
        // 尝试从文件读取内容并导入
        const content = readMessageFromFile(fsPath)
        if (content) {
          db.run(`
            INSERT INTO messages (nickname, contact, content, status, file_path, created_at)
            VALUES (?, ?, ?, 'unread', ?, ?)
          `, [
            content.nickname,
            content.contact,
            content.content,
            fsPath,
            content.createdAt
          ])
          added++
        }
      }
    }
    
    if (added > 0 || removed > 0) {
      saveDatabase()
    }
    
    return { added, removed }
  } catch (error) {
    console.error('同步留言失败:', error)
    return { added, removed }
  }
}
