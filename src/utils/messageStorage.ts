/**
 * 留言存储工具模块
 * 
 * 提供留言数据的存储功能，包括：
 * - 调用后端 API 保存到数据库和文件
 * - 本地 localStorage 备份存储
 * - 文件名生成（日期+称呼格式）
 * - 留言序列化/反序列化（最小空间格式）
 * 
 * 需求: 4.3.1 - 将留言保存到 file/message/ 文件夹
 * 
 * @module messageStorage
 */

/**
 * 留言数据接口
 * 包含留言的所有必要信息
 */
export interface MessageData {
  /** 留言者称呼 */
  nickname: string
  /** 联系方式（电话/邮箱/微信等） */
  contact: string
  /** 留言内容 */
  message: string
  /** 提交时间戳（ISO 格式） */
  timestamp: string
}

/**
 * 保存结果接口
 * 表示留言保存操作的结果
 */
export interface SaveResult {
  /** 是否保存成功 */
  success: boolean
  /** 保存成功时的文件名 */
  filename?: string
  /** 保存失败时的错误信息 */
  error?: string
}

/**
 * API 响应接口
 */
interface ApiResponse {
  success: boolean
  id?: number
  message?: string
  errors?: string[]
}

/** localStorage 存储键前缀 */
const STORAGE_PREFIX = 'message_'

/** API 基础地址 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * 生成文件名
 * 格式：YYYY-MM-DD_称呼.txt
 * 
 * @param date - 日期对象或 ISO 日期字符串
 * @param nickname - 留言者称呼
 * @returns 格式化的文件名
 * 
 * @example
 * generateFilename(new Date('2024-01-15'), '张三')
 * // 返回: '2024-01-15_张三.txt'
 */
export function generateFilename(date: Date | string, nickname: string): string {
  // 处理日期参数
  let dateStr: string
  if (typeof date === 'string') {
    // 如果是 ISO 字符串，提取日期部分
    dateStr = date.split('T')[0]
  } else {
    // 如果是 Date 对象，格式化为 YYYY-MM-DD
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    dateStr = `${year}-${month}-${day}`
  }
  
  // 清理称呼中的特殊字符（避免文件名问题）
  const cleanNickname = nickname.trim().replace(/[/\\:*?"<>|]/g, '_')
  
  return `${dateStr}_${cleanNickname}.txt`
}

/**
 * 序列化留言数据
 * 使用最小空间格式：每行一个字段，无额外标记
 * 
 * 格式：
 * 第1行：称呼
 * 第2行：联系方式
 * 第3行：留言内容（多行内容会被转义）
 * 第4行：时间戳
 * 
 * @param data - 留言数据对象
 * @returns 序列化后的字符串
 * 
 * @example
 * serializeMessage({
 *   nickname: '张三',
 *   contact: '13800138000',
 *   message: '您好',
 *   timestamp: '2024-01-15T10:30:00.000Z'
 * })
 * // 返回: '张三\n13800138000\n您好\n2024-01-15T10:30:00.000Z'
 */
export function serializeMessage(data: MessageData): string {
  // 处理留言内容中的特殊字符
  // 先转义反斜杠，再转义换行符，确保往返一致性
  const escapedMessage = data.message
    .replace(/\\/g, '\\\\')  // 先转义反斜杠
    .replace(/\n/g, '\\n')   // 再转义换行符
  
  return [
    data.nickname,
    data.contact,
    escapedMessage,
    data.timestamp
  ].join('\n')
}

/**
 * 反序列化留言数据
 * 将最小空间格式的字符串解析为留言数据对象
 * 
 * @param content - 序列化的留言字符串
 * @returns 解析后的留言数据对象，解析失败返回 null
 * 
 * @example
 * deserializeMessage('张三\n13800138000\n您好\n2024-01-15T10:30:00.000Z')
 * // 返回: { nickname: '张三', contact: '13800138000', message: '您好', timestamp: '2024-01-15T10:30:00.000Z' }
 */
export function deserializeMessage(content: string): MessageData | null {
  if (!content || typeof content !== 'string') {
    return null
  }
  
  const lines = content.split('\n')
  
  // 至少需要4行数据
  if (lines.length < 4) {
    return null
  }
  
  const nickname = lines[0]
  const contact = lines[1]
  // 恢复留言内容中的特殊字符
  // 先恢复换行符，再恢复反斜杠，与序列化顺序相反
  const message = lines[2]
    .replace(/\\n/g, '\n')   // 先恢复换行符
    .replace(/\\\\/g, '\\')  // 再恢复反斜杠
  const timestamp = lines[3]
  
  // 验证必要字段不为空
  if (!nickname || !contact || !message || !timestamp) {
    return null
  }
  
  return {
    nickname,
    contact,
    message,
    timestamp
  }
}

/**
 * 调用后端 API 保存留言
 * 
 * @param data - 留言数据对象
 * @returns API 响应结果
 */
async function saveMessageToApi(data: MessageData): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nickname: data.nickname,
        contact: data.contact,
        message: data.message
      })
    })
    
    if (!response.ok) {
      const errorData: ApiResponse = await response.json().catch(() => ({ success: false }))
      return {
        success: false,
        error: errorData.message || errorData.errors?.[0] || '服务器错误'
      }
    }
    
    const result: ApiResponse = await response.json()
    return {
      success: result.success,
      error: result.success ? undefined : (result.message || '保存失败')
    }
  } catch (error) {
    // 网络错误或其他异常
    console.debug('[MessageStorage] API 调用失败:', error)
    return {
      success: false,
      error: '网络错误，请稍后重试'
    }
  }
}

/**
 * 保存留言到本地存储（作为备份）
 * 
 * @param data - 留言数据对象
 * @param filename - 文件名
 * @returns 是否保存成功
 */
function saveMessageToLocal(data: MessageData, filename: string): boolean {
  try {
    const content = serializeMessage(data)
    const key = `${STORAGE_PREFIX}${filename}`
    localStorage.setItem(key, content)
    return true
  } catch {
    return false
  }
}

/**
 * 保存留言
 * 优先调用后端 API 保存到数据库和文件，同时保存到 localStorage 作为备份
 * 
 * 需求: 4.3.1 - 将留言保存到 file/message/ 文件夹（通过后端 API）
 * 
 * @param data - 留言数据对象
 * @returns 保存结果，包含成功状态和文件名或错误信息
 * 
 * @example
 * const result = await saveMessage({
 *   nickname: '张三',
 *   contact: '13800138000',
 *   message: '您好，我对您的项目很感兴趣',
 *   timestamp: '2024-01-15T10:30:00.000Z'
 * })
 * // 成功: { success: true, filename: '2024-01-15_张三.txt' }
 * // 失败: { success: false, error: '保存失败' }
 */
export async function saveMessage(data: MessageData): Promise<SaveResult> {
  try {
    // 验证数据完整性
    if (!data.nickname || !data.contact || !data.message) {
      return {
        success: false,
        error: '留言数据不完整'
      }
    }
    
    // 生成文件名（用于本地备份）
    const filename = generateFilename(data.timestamp || new Date().toISOString(), data.nickname)
    
    // 尝试调用后端 API 保存
    const apiResult = await saveMessageToApi(data)
    
    if (apiResult.success) {
      // API 保存成功，同时保存到本地作为备份
      saveMessageToLocal(data, filename)
      
      return {
        success: true,
        filename
      }
    } else {
      // API 保存失败，尝试仅保存到本地
      const localSaved = saveMessageToLocal(data, filename)
      
      if (localSaved) {
        // 本地保存成功，但提示用户 API 失败
        console.warn('[MessageStorage] API 保存失败，已保存到本地:', apiResult.error)
        return {
          success: true,
          filename,
          error: '留言已暂存，将在网络恢复后同步'
        }
      } else {
        // 两者都失败
        return {
          success: false,
          error: apiResult.error || '保存失败，请稍后重试'
        }
      }
    }
  } catch (error) {
    // 处理异常
    const errorMessage = error instanceof Error ? error.message : '保存失败'
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * 获取所有已保存的留言
 * 从 localStorage 中读取所有留言数据
 * 
 * @returns 留言数据数组
 */
export function getAllMessages(): MessageData[] {
  const messages: MessageData[] = []
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const content = localStorage.getItem(key)
        if (content) {
          const data = deserializeMessage(content)
          if (data) {
            messages.push(data)
          }
        }
      }
    }
  } catch (error) {
    console.error('读取留言失败:', error)
  }
  
  // 按时间戳排序（最新的在前）
  return messages.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

/**
 * 删除指定留言
 * 
 * @param filename - 留言文件名
 * @returns 是否删除成功
 */
export function deleteMessage(filename: string): boolean {
  try {
    const key = `${STORAGE_PREFIX}${filename}`
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('删除留言失败:', error)
    return false
  }
}
