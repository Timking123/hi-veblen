/**
 * 留言服务单元测试
 * 
 * 测试留言管理相关的 CRUD 操作和文件存储功能
 * 
 * 需求: 4.1.1-4.3.4
 */

import { initDatabase, closeDatabase, resetDatabase } from '../../database/init'
import {
  getMessageList,
  getMessage,
  createMessage,
  markMessageAsRead,
  markMessageAsUnread,
  deleteMessage,
  batchDeleteMessages,
  getMessageStats,
  getRecentMessages
} from '../message'
import {
  generateMessageFileName,
  serializeMessageToFile,
  deserializeMessageFromFile,
  sanitizeFileName,
  validateMessageInput,
  getContentSummary,
  MessageFileContent
} from '../../models/message'

// 测试前初始化数据库
beforeAll(async () => {
  await initDatabase(':memory:')
})

// 每个测试后重置数据库
afterEach(() => {
  resetDatabase()
})

// 测试后关闭数据库
afterAll(() => {
  closeDatabase()
})

// ========== 模型工具函数测试 ==========

describe('留言模型工具函数', () => {
  describe('generateMessageFileName（生成文件名）', () => {
    /**
     * 需求: 4.3.2 - 使用"YYYY-MM-DD_称呼.txt"格式命名文件
     */
    it('应该生成正确格式的文件名', () => {
      const date = new Date('2024-01-15')
      const nickname = '张三'
      
      const fileName = generateMessageFileName(date, nickname, 0)
      
      expect(fileName).toBe('2024-01-15_张三.txt')
    })
    
    /**
     * 需求: 4.3.4 - 同一天同一称呼有多条留言时添加序号后缀
     */
    it('应该为重复留言添加序号后缀', () => {
      const date = new Date('2024-01-15')
      const nickname = '张三'
      
      const fileName1 = generateMessageFileName(date, nickname, 0)
      const fileName2 = generateMessageFileName(date, nickname, 1)
      const fileName3 = generateMessageFileName(date, nickname, 2)
      
      expect(fileName1).toBe('2024-01-15_张三.txt')
      expect(fileName2).toBe('2024-01-15_张三_2.txt')
      expect(fileName3).toBe('2024-01-15_张三_3.txt')
    })
    
    it('应该处理特殊字符的称呼', () => {
      const date = new Date('2024-01-15')
      const nickname = '用户<test>'
      
      const fileName = generateMessageFileName(date, nickname, 0)
      
      // 特殊字符应该被替换
      expect(fileName).not.toContain('<')
      expect(fileName).not.toContain('>')
      expect(fileName).toMatch(/^2024-01-15_.*\.txt$/)
    })
  })
  
  describe('sanitizeFileName（清理文件名）', () => {
    it('应该移除不安全的字符', () => {
      expect(sanitizeFileName('test<>:"/\\|?*file')).toBe('test_file')
    })
    
    it('应该替换空白字符', () => {
      expect(sanitizeFileName('hello world')).toBe('hello_world')
    })
    
    it('应该合并连续的下划线', () => {
      expect(sanitizeFileName('test___file')).toBe('test_file')
    })
    
    it('应该限制文件名长度', () => {
      const longName = 'a'.repeat(100)
      expect(sanitizeFileName(longName).length).toBeLessThanOrEqual(50)
    })
  })
  
  describe('serializeMessageToFile / deserializeMessageFromFile（序列化/反序列化）', () => {
    /**
     * 需求: 4.3.3 - 以最小空间格式存储（每行一个字段）
     */
    it('应该正确序列化和反序列化留言', () => {
      const original: MessageFileContent = {
        nickname: '张三',
        contact: 'zhangsan@example.com',
        createdAt: '2024-01-15 10:30:00',
        content: '这是一条测试留言\n包含多行内容'
      }
      
      const serialized = serializeMessageToFile(original)
      const deserialized = deserializeMessageFromFile(serialized)
      
      expect(deserialized).not.toBeNull()
      expect(deserialized?.nickname).toBe(original.nickname)
      expect(deserialized?.contact).toBe(original.contact)
      expect(deserialized?.createdAt).toBe(original.createdAt)
      expect(deserialized?.content).toBe(original.content)
    })
    
    it('序列化格式应该是每行一个字段', () => {
      const message: MessageFileContent = {
        nickname: '测试用户',
        contact: 'test@test.com',
        createdAt: '2024-01-15 10:00:00',
        content: '测试内容'
      }
      
      const serialized = serializeMessageToFile(message)
      
      expect(serialized).toContain('称呼: 测试用户')
      expect(serialized).toContain('联系方式: test@test.com')
      expect(serialized).toContain('时间: 2024-01-15 10:00:00')
      expect(serialized).toContain('内容:')
      expect(serialized).toContain('测试内容')
    })
    
    it('应该处理无效的文件内容', () => {
      const invalidContent = '这不是有效的留言格式'
      const result = deserializeMessageFromFile(invalidContent)
      
      expect(result).toBeNull()
    })
  })
  
  describe('validateMessageInput（验证输入）', () => {
    it('应该验证有效的输入', () => {
      const input = {
        nickname: '张三',
        contact: 'zhangsan@example.com',
        content: '这是一条留言'
      }
      
      const result = validateMessageInput(input)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
    
    it('应该拒绝空称呼', () => {
      const input = {
        nickname: '',
        contact: 'test@test.com',
        content: '内容'
      }
      
      const result = validateMessageInput(input)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('称呼不能为空')
    })
    
    it('应该拒绝无效的联系方式', () => {
      const input = {
        nickname: '测试',
        contact: 'invalid-contact',
        content: '内容'
      }
      
      const result = validateMessageInput(input)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('联系方式格式无效'))).toBe(true)
    })
    
    it('应该接受有效的手机号', () => {
      const input = {
        nickname: '测试',
        contact: '13800138000',
        content: '内容'
      }
      
      const result = validateMessageInput(input)
      
      expect(result.valid).toBe(true)
    })
    
    it('应该拒绝空内容', () => {
      const input = {
        nickname: '测试',
        contact: 'test@test.com',
        content: ''
      }
      
      const result = validateMessageInput(input)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('留言内容不能为空')
    })
  })
  
  describe('getContentSummary（获取内容摘要）', () => {
    it('应该返回短内容的完整文本', () => {
      const content = '短内容'
      expect(getContentSummary(content)).toBe('短内容')
    })
    
    it('应该截断长内容并添加省略号', () => {
      const content = '这是一段很长的内容，需要被截断以便在列表中显示，超过50个字符的部分会被省略'
      const summary = getContentSummary(content, 20)
      
      expect(summary.length).toBeLessThanOrEqual(20)
      expect(summary).toEndWith('...')
    })
    
    it('应该将多行内容合并为单行', () => {
      const content = '第一行\n第二行\n第三行'
      const summary = getContentSummary(content)
      
      expect(summary).not.toContain('\n')
    })
  })
})

// ========== 留言服务 CRUD 测试 ==========

describe('留言服务 CRUD 操作', () => {
  describe('createMessage（创建留言）', () => {
    it('应该成功创建留言', () => {
      const input = {
        nickname: '测试用户',
        contact: 'test@example.com',
        content: '这是一条测试留言'
      }
      
      const result = createMessage(input)
      
      expect(result.success).toBe(true)
      expect(result.id).toBeGreaterThan(0)
    })
    
    it('应该拒绝无效的输入', () => {
      const input = {
        nickname: '',
        contact: 'invalid',
        content: ''
      }
      
      const result = createMessage(input)
      
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })
  })
  
  describe('getMessage（获取留言）', () => {
    it('应该返回存在的留言', () => {
      // 先创建一条留言
      const createResult = createMessage({
        nickname: '测试',
        contact: 'test@test.com',
        content: '测试内容'
      })
      
      const message = getMessage(createResult.id!)
      
      expect(message).not.toBeNull()
      expect(message?.nickname).toBe('测试')
      expect(message?.contact).toBe('test@test.com')
      expect(message?.content).toBe('测试内容')
      expect(message?.status).toBe('unread')
    })
    
    it('应该返回 null 对于不存在的留言', () => {
      const message = getMessage(99999)
      expect(message).toBeNull()
    })
  })
  
  describe('getMessageList（获取留言列表）', () => {
    beforeEach(() => {
      // 创建测试数据
      createMessage({ nickname: '用户1', contact: 'user1@test.com', content: '留言1' })
      createMessage({ nickname: '用户2', contact: 'user2@test.com', content: '留言2' })
      createMessage({ nickname: '用户3', contact: 'user3@test.com', content: '留言3' })
    })
    
    /**
     * 需求: 4.1.1 - 以表格形式展示留言
     */
    it('应该返回所有留言', () => {
      const result = getMessageList()
      
      expect(result.data.length).toBe(3)
      expect(result.total).toBe(3)
    })
    
    it('应该支持分页', () => {
      const result = getMessageList({ page: 1, pageSize: 2 })
      
      expect(result.data.length).toBe(2)
      expect(result.total).toBe(3)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(2)
      expect(result.totalPages).toBe(2)
    })
    
    /**
     * 需求: 4.1.4 - 支持关键词搜索留言内容
     */
    it('应该支持关键词搜索', () => {
      const result = getMessageList({ keyword: '用户1' })
      
      expect(result.data.length).toBe(1)
      expect(result.data[0]?.nickname).toBe('用户1')
    })
  })
  
  describe('markMessageAsRead / markMessageAsUnread（标记已读/未读）', () => {
    /**
     * 需求: 4.2.2 - 提供标记已读/未读功能
     */
    it('应该能标记留言为已读', () => {
      const createResult = createMessage({
        nickname: '测试',
        contact: 'test@test.com',
        content: '内容'
      })
      
      const success = markMessageAsRead(createResult.id!)
      expect(success).toBe(true)
      
      const message = getMessage(createResult.id!)
      expect(message?.status).toBe('read')
      expect(message?.read_at).not.toBeNull()
    })
    
    it('应该能标记留言为未读', () => {
      const createResult = createMessage({
        nickname: '测试',
        contact: 'test@test.com',
        content: '内容'
      })
      
      // 先标记为已读
      markMessageAsRead(createResult.id!)
      
      // 再标记为未读
      const success = markMessageAsUnread(createResult.id!)
      expect(success).toBe(true)
      
      const message = getMessage(createResult.id!)
      expect(message?.status).toBe('unread')
      expect(message?.read_at).toBeNull()
    })
  })
  
  describe('deleteMessage（删除留言）', () => {
    /**
     * 需求: 4.2.3 - 提供删除留言功能
     */
    it('应该能删除留言', () => {
      const createResult = createMessage({
        nickname: '测试',
        contact: 'test@test.com',
        content: '内容'
      })
      
      const success = deleteMessage(createResult.id!)
      expect(success).toBe(true)
      
      const message = getMessage(createResult.id!)
      expect(message).toBeNull()
    })
  })
  
  describe('batchDeleteMessages（批量删除）', () => {
    /**
     * 需求: 4.2.3 - 提供删除留言功能（支持批量删除）
     */
    it('应该能批量删除留言', () => {
      const id1 = createMessage({ nickname: '用户1', contact: 'u1@test.com', content: '1' }).id!
      const id2 = createMessage({ nickname: '用户2', contact: 'u2@test.com', content: '2' }).id!
      const id3 = createMessage({ nickname: '用户3', contact: 'u3@test.com', content: '3' }).id!
      
      const result = batchDeleteMessages([id1, id2])
      
      expect(result.success).toBe(true)
      expect(result.count).toBeGreaterThanOrEqual(2)
      
      // 验证删除结果
      expect(getMessage(id1)).toBeNull()
      expect(getMessage(id2)).toBeNull()
      expect(getMessage(id3)).not.toBeNull()
    })
    
    it('应该处理空数组', () => {
      const result = batchDeleteMessages([])
      
      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
    })
  })
  
  describe('getMessageStats（获取统计）', () => {
    it('应该返回正确的统计数据', () => {
      // 创建测试数据
      const id1 = createMessage({ nickname: '用户1', contact: 'u1@test.com', content: '1' }).id!
      createMessage({ nickname: '用户2', contact: 'u2@test.com', content: '2' })
      createMessage({ nickname: '用户3', contact: 'u3@test.com', content: '3' })
      
      // 标记一条为已读
      markMessageAsRead(id1)
      
      const stats = getMessageStats()
      
      expect(stats.total).toBe(3)
      expect(stats.read).toBe(1)
      expect(stats.unread).toBe(2)
    })
  })
  
  describe('getRecentMessages（获取最近留言）', () => {
    it('应该返回最近的留言', () => {
      createMessage({ nickname: '用户1', contact: 'u1@test.com', content: '1' })
      createMessage({ nickname: '用户2', contact: 'u2@test.com', content: '2' })
      createMessage({ nickname: '用户3', contact: 'u3@test.com', content: '3' })
      
      const recent = getRecentMessages(2)
      
      expect(recent.length).toBe(2)
    })
  })
})

// ========== 筛选功能测试 ==========

describe('留言筛选功能', () => {
  beforeEach(() => {
    // 创建测试数据
    const id1 = createMessage({ nickname: '张三', contact: 'zhang@test.com', content: '关于产品的问题' }).id!
    createMessage({ nickname: '李四', contact: 'li@test.com', content: '技术支持请求' })
    createMessage({ nickname: '王五', contact: 'wang@test.com', content: '合作咨询' })
    
    // 标记第一条为已读
    markMessageAsRead(id1)
  })
  
  /**
   * 需求: 4.1.3 - 支持按状态筛选（全部/未读/已读）
   */
  it('应该能按状态筛选', () => {
    const unreadResult = getMessageList({ status: 'unread' })
    expect(unreadResult.data.length).toBe(2)
    
    const readResult = getMessageList({ status: 'read' })
    expect(readResult.data.length).toBe(1)
  })
  
  /**
   * 需求: 4.1.4 - 支持关键词搜索留言内容
   */
  it('应该能搜索留言内容', () => {
    const result = getMessageList({ keyword: '产品' })
    
    expect(result.data.length).toBe(1)
    expect(result.data[0]?.nickname).toBe('张三')
  })
  
  it('应该能搜索联系方式', () => {
    const result = getMessageList({ keyword: 'li@test.com' })
    
    expect(result.data.length).toBe(1)
    expect(result.data[0]?.nickname).toBe('李四')
  })
  
  it('应该能组合多个筛选条件', () => {
    const result = getMessageList({
      status: 'unread',
      keyword: '技术'
    })
    
    expect(result.data.length).toBe(1)
    expect(result.data[0]?.nickname).toBe('李四')
  })
})
