/**
 * messageStorage 模块单元测试
 * 
 * 测试留言存储工具的核心功能：
 * - 文件名生成
 * - 序列化/反序列化
 * - 本地存储操作
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  MessageData,
  generateFilename,
  serializeMessage,
  deserializeMessage,
  saveMessage,
  getAllMessages,
  deleteMessage
} from '../messageStorage'

describe('messageStorage', () => {
  // 模拟 localStorage
  let mockStorage: Record<string, string> = {}
  
  beforeEach(() => {
    mockStorage = {}
    
    // 模拟 localStorage
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockStorage[key] = value
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      return mockStorage[key] || null
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete mockStorage[key]
    })
    vi.spyOn(Storage.prototype, 'key').mockImplementation((index) => {
      return Object.keys(mockStorage)[index] || null
    })
    Object.defineProperty(Storage.prototype, 'length', {
      get: () => Object.keys(mockStorage).length,
      configurable: true
    })
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateFilename', () => {
    it('应该使用 Date 对象生成正确格式的文件名', () => {
      const date = new Date('2024-01-15T10:30:00.000Z')
      const filename = generateFilename(date, '张三')
      expect(filename).toBe('2024-01-15_张三.txt')
    })

    it('应该使用 ISO 字符串生成正确格式的文件名', () => {
      const filename = generateFilename('2024-03-20T15:45:00.000Z', '李四')
      expect(filename).toBe('2024-03-20_李四.txt')
    })

    it('应该清理称呼中的特殊字符', () => {
      const filename = generateFilename('2024-01-15', '张/三*')
      expect(filename).toBe('2024-01-15_张_三_.txt')
    })

    it('应该处理带空格的称呼', () => {
      const filename = generateFilename('2024-01-15', '  张三  ')
      expect(filename).toBe('2024-01-15_张三.txt')
    })

    it('应该正确处理月份和日期的补零', () => {
      const date = new Date('2024-03-05T00:00:00.000Z')
      const filename = generateFilename(date, '测试')
      expect(filename).toBe('2024-03-05_测试.txt')
    })
  })

  describe('serializeMessage', () => {
    it('应该正确序列化留言数据', () => {
      const data: MessageData = {
        nickname: '张三',
        contact: '13800138000',
        message: '您好',
        timestamp: '2024-01-15T10:30:00.000Z'
      }
      const result = serializeMessage(data)
      expect(result).toBe('张三\n13800138000\n您好\n2024-01-15T10:30:00.000Z')
    })

    it('应该转义留言内容中的换行符', () => {
      const data: MessageData = {
        nickname: '张三',
        contact: '13800138000',
        message: '第一行\n第二行',
        timestamp: '2024-01-15T10:30:00.000Z'
      }
      const result = serializeMessage(data)
      expect(result).toBe('张三\n13800138000\n第一行\\n第二行\n2024-01-15T10:30:00.000Z')
    })
  })

  describe('deserializeMessage', () => {
    it('应该正确反序列化留言数据', () => {
      const content = '张三\n13800138000\n您好\n2024-01-15T10:30:00.000Z'
      const result = deserializeMessage(content)
      expect(result).toEqual({
        nickname: '张三',
        contact: '13800138000',
        message: '您好',
        timestamp: '2024-01-15T10:30:00.000Z'
      })
    })

    it('应该恢复留言内容中的换行符', () => {
      const content = '张三\n13800138000\n第一行\\n第二行\n2024-01-15T10:30:00.000Z'
      const result = deserializeMessage(content)
      expect(result?.message).toBe('第一行\n第二行')
    })

    it('应该对无效内容返回 null', () => {
      expect(deserializeMessage('')).toBeNull()
      expect(deserializeMessage('只有一行')).toBeNull()
      expect(deserializeMessage('一\n二\n三')).toBeNull() // 少于4行
    })

    it('应该对非字符串输入返回 null', () => {
      expect(deserializeMessage(null as any)).toBeNull()
      expect(deserializeMessage(undefined as any)).toBeNull()
    })
  })

  describe('序列化往返一致性', () => {
    it('序列化后反序列化应该得到等价的数据', () => {
      const original: MessageData = {
        nickname: '张三',
        contact: '13800138000',
        message: '您好，我对您的项目很感兴趣',
        timestamp: '2024-01-15T10:30:00.000Z'
      }
      const serialized = serializeMessage(original)
      const deserialized = deserializeMessage(serialized)
      expect(deserialized).toEqual(original)
    })

    it('包含换行符的留言也应该保持一致性', () => {
      const original: MessageData = {
        nickname: '李四',
        contact: 'test@example.com',
        message: '第一行\n第二行\n第三行',
        timestamp: '2024-03-20T15:45:00.000Z'
      }
      const serialized = serializeMessage(original)
      const deserialized = deserializeMessage(serialized)
      expect(deserialized).toEqual(original)
    })
  })

  describe('saveMessage', () => {
    it('应该成功保存留言', async () => {
      const data: MessageData = {
        nickname: '张三',
        contact: '13800138000',
        message: '测试留言',
        timestamp: '2024-01-15T10:30:00.000Z'
      }
      const result = await saveMessage(data)
      expect(result.success).toBe(true)
      expect(result.filename).toBe('2024-01-15_张三.txt')
    })

    it('应该对不完整数据返回错误', async () => {
      const data = {
        nickname: '',
        contact: '13800138000',
        message: '测试',
        timestamp: '2024-01-15T10:30:00.000Z'
      } as MessageData
      const result = await saveMessage(data)
      expect(result.success).toBe(false)
      expect(result.error).toBe('留言数据不完整')
    })

    it('应该在 localStorage 中存储数据', async () => {
      const data: MessageData = {
        nickname: '测试用户',
        contact: 'test@test.com',
        message: '测试内容',
        timestamp: '2024-02-20T12:00:00.000Z'
      }
      await saveMessage(data)
      const key = 'message_2024-02-20_测试用户.txt'
      expect(mockStorage[key]).toBeDefined()
    })
  })

  describe('getAllMessages', () => {
    it('应该返回所有保存的留言', async () => {
      const data1: MessageData = {
        nickname: '用户1',
        contact: '111',
        message: '留言1',
        timestamp: '2024-01-15T10:00:00.000Z'
      }
      const data2: MessageData = {
        nickname: '用户2',
        contact: '222',
        message: '留言2',
        timestamp: '2024-01-16T10:00:00.000Z'
      }
      await saveMessage(data1)
      await saveMessage(data2)
      
      const messages = getAllMessages()
      expect(messages.length).toBe(2)
    })

    it('应该按时间戳降序排序', async () => {
      const older: MessageData = {
        nickname: '旧用户',
        contact: '111',
        message: '旧留言',
        timestamp: '2024-01-10T10:00:00.000Z'
      }
      const newer: MessageData = {
        nickname: '新用户',
        contact: '222',
        message: '新留言',
        timestamp: '2024-01-20T10:00:00.000Z'
      }
      await saveMessage(older)
      await saveMessage(newer)
      
      const messages = getAllMessages()
      expect(messages[0].nickname).toBe('新用户')
      expect(messages[1].nickname).toBe('旧用户')
    })
  })

  describe('deleteMessage', () => {
    it('应该成功删除留言', async () => {
      const data: MessageData = {
        nickname: '待删除',
        contact: '123',
        message: '测试',
        timestamp: '2024-01-15T10:00:00.000Z'
      }
      await saveMessage(data)
      
      const result = deleteMessage('2024-01-15_待删除.txt')
      expect(result).toBe(true)
      
      const messages = getAllMessages()
      expect(messages.length).toBe(0)
    })
  })
})
