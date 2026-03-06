/**
 * 留言管理属性测试
 * 
 * 使用属性测试验证留言管理服务的通用正确性属性
 * 
 * **Feature: admin-system, Property 5-7: 留言管理正确性**
 * 
 * 验证需求: 4.1.2, 4.1.3, 4.1.4, 4.3.2, 4.3.3, 4.3.4
 */

import { describe, it, expect } from '@jest/globals'
import * as fc from 'fast-check'
import { initDatabase, closeDatabase } from '../database/init'
import {
  createMessage,
  getMessage,
  getMessageList,
  markMessageAsRead,
  markMessageAsUnread
} from '../services/message'
import {
  serializeMessageToFile,
  deserializeMessageFromFile,
  generateMessageFileName,
  MessageFileContent
} from '../models/message'

describe('留言管理属性测试', () => {
  /**
   * Property 5: 留言序列化往返一致性
   * 
   * 对于任意有效的留言数据，序列化为文件格式后再反序列化，应该得到等价的留言数据。
   * 
   * **Validates: Requirements 4.3.3**
   */
  describe('Property 5: 留言序列化往返一致性', () => {
    it('序列化后再反序列化应该得到相同的留言数据', () => {
      fc.assert(
        fc.property(
          fc.record({
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            contact: fc.string({ minLength: 1, maxLength: 100 }),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().replace('T', ' ').substring(0, 19)),
            content: fc.string({ minLength: 1, maxLength: 500 })
          }),
          (messageData) => {
            // 序列化
            const serialized = serializeMessageToFile(messageData)
            
            // 反序列化
            const deserialized = deserializeMessageFromFile(serialized)
            
            // 验证往返一致性
            expect(deserialized).not.toBeNull()
            if (deserialized) {
              expect(deserialized.nickname).toBe(messageData.nickname)
              expect(deserialized.contact).toBe(messageData.contact)
              expect(deserialized.createdAt).toBe(messageData.createdAt)
              expect(deserialized.content).toBe(messageData.content)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('序列化格式应该是最小空间格式（每行一个字段）', () => {
      fc.assert(
        fc.property(
          fc.record({
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            contact: fc.string({ minLength: 1, maxLength: 100 }),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().replace('T', ' ').substring(0, 19)),
            content: fc.string({ minLength: 1, maxLength: 500 })
          }),
          (messageData) => {
            const serialized = serializeMessageToFile(messageData)
            
            // 验证格式：应该是 4 行（称呼、联系方式、时间、内容）
            const lines = serialized.split('\n')
            expect(lines.length).toBe(4)
            
            // 验证每行内容
            expect(lines[0]).toBe(messageData.nickname)
            expect(lines[1]).toBe(messageData.contact)
            expect(lines[2]).toBe(messageData.createdAt)
            expect(lines[3]).toBe(messageData.content)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('包含特殊字符的留言应该正确序列化和反序列化', () => {
      fc.assert(
        fc.property(
          fc.record({
            nickname: fc.string({ minLength: 1, maxLength: 50 }),
            contact: fc.string({ minLength: 1, maxLength: 100 }),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().replace('T', ' ').substring(0, 19)),
            content: fc.string({ minLength: 1, maxLength: 500 })
              .map(s => s + '\n包含换行\t制表符\r回车符的内容')
          }),
          (messageData) => {
            const serialized = serializeMessageToFile(messageData)
            const deserialized = deserializeMessageFromFile(serialized)
            
            expect(deserialized).not.toBeNull()
            if (deserialized) {
              expect(deserialized.content).toBe(messageData.content)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 6: 文件名生成格式正确性
   * 
   * 对于任意日期和称呼，生成的文件名应该符合 "YYYY-MM-DD_称呼.txt" 格式，
   * 且同一天同一称呼的多条留言应该有正确的序号后缀。
   * 
   * **Validates: Requirements 4.3.2, 4.3.4**
   */
  describe('Property 6: 文件名生成格式正确性', () => {
    it('文件名应该符合 YYYY-MM-DD_称呼.txt 格式', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
          (date, nickname) => {
            const fileName = generateMessageFileName(date, nickname, 0)
            
            // 验证格式
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const expectedPrefix = `${year}-${month}-${day}_${nickname}`
            
            expect(fileName).toBe(`${expectedPrefix}.txt`)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('同一天同一称呼的第二条留言应该有序号后缀 _2', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
          (date, nickname) => {
            const fileName = generateMessageFileName(date, nickname, 1)
            
            // 验证格式
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const expectedPrefix = `${year}-${month}-${day}_${nickname}`
            
            expect(fileName).toBe(`${expectedPrefix}_2.txt`)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('序号应该从 2 开始递增', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('/')),
          fc.integer({ min: 0, max: 100 }),
          (date, nickname, existingCount) => {
            const fileName = generateMessageFileName(date, nickname, existingCount)
            
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const expectedPrefix = `${year}-${month}-${day}_${nickname}`
            
            if (existingCount === 0) {
              expect(fileName).toBe(`${expectedPrefix}.txt`)
            } else {
              expect(fileName).toBe(`${expectedPrefix}_${existingCount + 1}.txt`)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 7: 留言筛选结果正确性
   * 
   * 对于任意留言集合和筛选条件（时间范围、状态、关键词），
   * 筛选结果应该只包含满足所有条件的留言。
   * 
   * **Validates: Requirements 4.1.2, 4.1.3, 4.1.4**
   */
  describe('Property 7: 留言筛选结果正确性', () => {
    it('按状态筛选应该只返回指定状态的留言', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              nickname: fc.string({ minLength: 1, maxLength: 50 }),
              contact: fc.string({ minLength: 1, maxLength: 100 }),
              content: fc.string({ minLength: 1, maxLength: 500 }),
              shouldBeRead: fc.boolean()
            }),
            { minLength: 5, maxLength: 20 }
          ),
          fc.constantFrom('read', 'unread'),
          (messages, targetStatus) => {
            initDatabase(':memory:')
            try {
              // 创建留言并设置状态
              const ids: number[] = []
              for (const msg of messages) {
                const result = createMessage({
                  nickname: msg.nickname,
                  contact: msg.contact,
                  content: msg.content
                })
                
                if (result.success && result.id) {
                  ids.push(result.id)
                  
                  // 根据 shouldBeRead 设置状态
                  if (msg.shouldBeRead) {
                    markMessageAsRead(result.id)
                  }
                }
              }
              
              // 筛选指定状态的留言
              const filtered = getMessageList({ status: targetStatus })
              
              // 验证所有返回的留言都是指定状态
              for (const message of filtered.data) {
                expect(message.status).toBe(targetStatus)
              }
              
              // 验证数量正确
              const expectedCount = messages.filter(m => 
                (targetStatus === 'read' && m.shouldBeRead) ||
                (targetStatus === 'unread' && !m.shouldBeRead)
              ).length
              expect(filtered.data.length).toBe(expectedCount)
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('按时间范围筛选应该只返回范围内的留言', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              nickname: fc.string({ minLength: 1, maxLength: 50 }),
              contact: fc.string({ minLength: 1, maxLength: 100 }),
              content: fc.string({ minLength: 1, maxLength: 500 })
            }),
            { minLength: 10, maxLength: 20 }
          ),
          (messages) => {
            initDatabase(':memory:')
            try {
              // 创建留言
              for (const msg of messages) {
                createMessage({
                  nickname: msg.nickname,
                  contact: msg.contact,
                  content: msg.content
                })
              }
              
              // 获取今天的日期
              const today = new Date().toISOString().split('T')[0]
              
              // 筛选今天的留言
              const filtered = getMessageList({
                startDate: today,
                endDate: today
              })
              
              // 验证所有返回的留言都是今天的
              for (const message of filtered.data) {
                const messageDate = message.created_at.split(' ')[0]
                expect(messageDate).toBe(today)
              }
              
              // 所有留言都应该是今天的（因为刚创建）
              expect(filtered.data.length).toBe(messages.length)
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('按关键词搜索应该只返回包含关键词的留言', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 10 }),
          fc.array(
            fc.record({
              nickname: fc.string({ minLength: 1, maxLength: 50 }),
              contact: fc.string({ minLength: 1, maxLength: 100 }),
              content: fc.string({ minLength: 1, maxLength: 500 }),
              shouldContainKeyword: fc.boolean()
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (keyword, messages) => {
            initDatabase(':memory:')
            try {
              // 创建留言，部分包含关键词
              for (const msg of messages) {
                const content = msg.shouldContainKeyword
                  ? `${msg.content} ${keyword} 测试`
                  : msg.content.replace(keyword, '')
                
                createMessage({
                  nickname: msg.nickname,
                  contact: msg.contact,
                  content: content
                })
              }
              
              // 按关键词搜索
              const filtered = getMessageList({ keyword })
              
              // 验证所有返回的留言都包含关键词
              for (const message of filtered.data) {
                const containsKeyword = 
                  message.nickname.includes(keyword) ||
                  message.contact.includes(keyword) ||
                  message.content.includes(keyword)
                expect(containsKeyword).toBe(true)
              }
              
              // 验证数量正确
              const expectedCount = messages.filter(m => m.shouldContainKeyword).length
              expect(filtered.data.length).toBe(expectedCount)
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('组合多个筛选条件应该返回同时满足所有条件的留言', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 10 }),
          fc.array(
            fc.record({
              nickname: fc.string({ minLength: 1, maxLength: 50 }),
              contact: fc.string({ minLength: 1, maxLength: 100 }),
              content: fc.string({ minLength: 1, maxLength: 500 }),
              shouldBeRead: fc.boolean(),
              shouldContainKeyword: fc.boolean()
            }),
            { minLength: 10, maxLength: 30 }
          ),
          (keyword, messages) => {
            initDatabase(':memory:')
            try {
              // 创建留言
              const ids: number[] = []
              for (const msg of messages) {
                const content = msg.shouldContainKeyword
                  ? `${msg.content} ${keyword} 测试`
                  : msg.content.replace(keyword, '')
                
                const result = createMessage({
                  nickname: msg.nickname,
                  contact: msg.contact,
                  content: content
                })
                
                if (result.success && result.id) {
                  ids.push(result.id)
                  
                  if (msg.shouldBeRead) {
                    markMessageAsRead(result.id)
                  }
                }
              }
              
              // 组合筛选：已读 + 包含关键词
              const today = new Date().toISOString().split('T')[0]
              const filtered = getMessageList({
                status: 'read',
                keyword,
                startDate: today,
                endDate: today
              })
              
              // 验证所有返回的留言都满足所有条件
              for (const message of filtered.data) {
                expect(message.status).toBe('read')
                
                const containsKeyword = 
                  message.nickname.includes(keyword) ||
                  message.contact.includes(keyword) ||
                  message.content.includes(keyword)
                expect(containsKeyword).toBe(true)
                
                const messageDate = message.created_at.split(' ')[0]
                expect(messageDate).toBe(today)
              }
              
              // 验证数量正确
              const expectedCount = messages.filter(m => 
                m.shouldBeRead && m.shouldContainKeyword
              ).length
              expect(filtered.data.length).toBe(expectedCount)
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('空筛选条件应该返回所有留言', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              nickname: fc.string({ minLength: 1, maxLength: 50 }),
              contact: fc.string({ minLength: 1, maxLength: 100 }),
              content: fc.string({ minLength: 1, maxLength: 500 })
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (messages) => {
            initDatabase(':memory:')
            try {
              // 创建留言
              for (const msg of messages) {
                createMessage({
                  nickname: msg.nickname,
                  contact: msg.contact,
                  content: msg.content
                })
              }
              
              // 不传筛选条件
              const filtered = getMessageList({})
              
              // 应该返回所有留言
              expect(filtered.data.length).toBe(messages.length)
            } finally {
              closeDatabase()
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
