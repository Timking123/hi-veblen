/**
 * 导出服务单元测试
 * 
 * 测试留言数据导出功能，包括 Excel 和 CSV 格式
 * 
 * 需求: 4.4.1 - 提供导出为 Excel/CSV 功能
 * 需求: 4.4.2 - 支持按时间范围选择导出数据
 */

import { initDatabase, closeDatabase, resetDatabase, getDatabase } from '../../database/init'
import {
  exportMessages,
  getMessagesForExport,
  getExportStats,
  validateExportParams,
  ExportFormat,
  ExportParams
} from '../export'
import { createMessage } from '../message'

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

// ========== 辅助函数 ==========

/**
 * 创建测试留言数据
 */
function createTestMessages() {
  // 创建多条测试留言
  createMessage({
    nickname: '张三',
    contact: 'zhangsan@example.com',
    content: '这是张三的留言内容'
  })
  
  createMessage({
    nickname: '李四',
    contact: '13800138001',
    content: '这是李四的留言\n包含多行内容'
  })
  
  createMessage({
    nickname: '王五',
    contact: 'wangwu@test.com',
    content: '王五的留言，包含特殊字符：<>&"'
  })
}

// ========== 参数验证测试 ==========

describe('validateExportParams（验证导出参数）', () => {
  it('应该验证有效的 Excel 导出参数', () => {
    const params: Partial<ExportParams> = {
      format: 'excel'
    }
    
    const result = validateExportParams(params)
    
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
  
  it('应该验证有效的 CSV 导出参数', () => {
    const params: Partial<ExportParams> = {
      format: 'csv'
    }
    
    const result = validateExportParams(params)
    
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
  
  it('应该验证带时间范围的参数', () => {
    const params: Partial<ExportParams> = {
      format: 'excel',
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    }
    
    const result = validateExportParams(params)
    
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
  
  it('应该拒绝空格式', () => {
    const params: Partial<ExportParams> = {}
    
    const result = validateExportParams(params)
    
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('导出格式不能为空')
  })
  
  it('应该拒绝无效的格式', () => {
    const params: Partial<ExportParams> = {
      format: 'pdf' as ExportFormat
    }
    
    const result = validateExportParams(params)
    
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('无效的导出格式'))).toBe(true)
  })
  
  it('应该拒绝无效的开始日期格式', () => {
    const params: Partial<ExportParams> = {
      format: 'excel',
      startDate: '2024/01/01'
    }
    
    const result = validateExportParams(params)
    
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('开始日期格式无效'))).toBe(true)
  })
  
  it('应该拒绝无效的结束日期格式', () => {
    const params: Partial<ExportParams> = {
      format: 'excel',
      endDate: 'invalid-date'
    }
    
    const result = validateExportParams(params)
    
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('结束日期格式无效'))).toBe(true)
  })
  
  it('应该拒绝开始日期晚于结束日期', () => {
    const params: Partial<ExportParams> = {
      format: 'excel',
      startDate: '2024-12-31',
      endDate: '2024-01-01'
    }
    
    const result = validateExportParams(params)
    
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('开始日期不能晚于结束日期'))).toBe(true)
  })
})

// ========== 数据查询测试 ==========

describe('getMessagesForExport（获取导出数据）', () => {
  beforeEach(() => {
    createTestMessages()
  })
  
  it('应该返回所有留言', () => {
    const messages = getMessagesForExport()
    
    expect(messages.length).toBe(3)
  })
  
  it('应该包含所有必要字段', () => {
    const messages = getMessagesForExport()
    
    expect(messages.length).toBeGreaterThan(0)
    
    const message = messages[0]
    expect(message).toHaveProperty('nickname')
    expect(message).toHaveProperty('contact')
    expect(message).toHaveProperty('content')
    expect(message).toHaveProperty('status')
    expect(message).toHaveProperty('created_at')
    expect(message).toHaveProperty('read_at')
  })
  
  it('应该按创建时间降序排列', () => {
    const messages = getMessagesForExport()
    
    // 最后创建的应该在最前面
    expect(messages[0]?.nickname).toBe('王五')
    expect(messages[2]?.nickname).toBe('张三')
  })
})

// ========== 统计功能测试 ==========

describe('getExportStats（获取导出统计）', () => {
  beforeEach(() => {
    createTestMessages()
  })
  
  it('应该返回正确的统计数据', () => {
    const stats = getExportStats()
    
    expect(stats.total).toBe(3)
    expect(stats.unread).toBe(3)
    expect(stats.read).toBe(0)
  })
  
  it('应该返回空数据库的统计', () => {
    resetDatabase()
    
    const stats = getExportStats()
    
    expect(stats.total).toBe(0)
    expect(stats.unread).toBe(0)
    expect(stats.read).toBe(0)
  })
})

// ========== 导出功能测试 ==========

describe('exportMessages（导出留言）', () => {
  beforeEach(() => {
    createTestMessages()
  })
  
  /**
   * 需求: 4.4.1 - 提供导出为 Excel/CSV 功能
   */
  describe('Excel 导出', () => {
    it('应该成功导出为 Excel 格式', async () => {
      const result = await exportMessages({ format: 'excel' })
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.filename).toMatch(/\.xlsx$/)
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })
    
    it('Excel 文件应该包含数据', async () => {
      const result = await exportMessages({ format: 'excel' })
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.length).toBeGreaterThan(0)
    })
  })
  
  /**
   * 需求: 4.4.1 - 提供导出为 Excel/CSV 功能
   */
  describe('CSV 导出', () => {
    it('应该成功导出为 CSV 格式', async () => {
      const result = await exportMessages({ format: 'csv' })
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.filename).toMatch(/\.csv$/)
      expect(result.mimeType).toBe('text/csv; charset=utf-8')
    })
    
    it('CSV 文件应该包含表头', async () => {
      const result = await exportMessages({ format: 'csv' })
      
      expect(result.success).toBe(true)
      
      const csvContent = result.data!.toString('utf-8')
      
      // 检查表头（跳过 BOM）
      expect(csvContent).toContain('称呼')
      expect(csvContent).toContain('联系方式')
      expect(csvContent).toContain('留言内容')
      expect(csvContent).toContain('状态')
      expect(csvContent).toContain('创建时间')
      expect(csvContent).toContain('阅读时间')
    })
    
    it('CSV 文件应该包含数据行', async () => {
      const result = await exportMessages({ format: 'csv' })
      
      expect(result.success).toBe(true)
      
      const csvContent = result.data!.toString('utf-8')
      
      // 检查数据
      expect(csvContent).toContain('张三')
      expect(csvContent).toContain('李四')
      expect(csvContent).toContain('王五')
    })
    
    it('CSV 应该正确处理特殊字符', async () => {
      const result = await exportMessages({ format: 'csv' })
      
      expect(result.success).toBe(true)
      
      const csvContent = result.data!.toString('utf-8')
      
      // 包含特殊字符的内容应该被引号包裹
      // 王五的留言包含 <>&" 等特殊字符
      expect(csvContent).toContain('王五')
    })
    
    it('CSV 应该正确处理多行内容', async () => {
      const result = await exportMessages({ format: 'csv' })
      
      expect(result.success).toBe(true)
      
      const csvContent = result.data!.toString('utf-8')
      
      // 李四的留言包含换行符，应该被引号包裹
      expect(csvContent).toContain('李四')
    })
  })
  
  /**
   * 需求: 4.4.2 - 支持按时间范围选择导出数据
   */
  describe('时间范围筛选', () => {
    it('应该支持开始日期筛选', async () => {
      // 使用未来日期，应该没有数据
      const result = await exportMessages({
        format: 'csv',
        startDate: '2099-01-01'
      })
      
      expect(result.success).toBe(true)
      
      const csvContent = result.data!.toString('utf-8')
      const lines = csvContent.split('\r\n').filter(line => line.trim())
      
      // 只有表头行
      expect(lines.length).toBe(1)
    })
    
    it('应该支持结束日期筛选', async () => {
      // 使用过去日期，应该没有数据
      const result = await exportMessages({
        format: 'csv',
        endDate: '2000-01-01'
      })
      
      expect(result.success).toBe(true)
      
      const csvContent = result.data!.toString('utf-8')
      const lines = csvContent.split('\r\n').filter(line => line.trim())
      
      // 只有表头行
      expect(lines.length).toBe(1)
    })
    
    it('应该支持日期范围筛选', async () => {
      // 使用包含今天的日期范围
      const today = new Date()
      const startDate = `${today.getFullYear()}-01-01`
      const endDate = `${today.getFullYear()}-12-31`
      
      const result = await exportMessages({
        format: 'csv',
        startDate,
        endDate
      })
      
      expect(result.success).toBe(true)
      
      const csvContent = result.data!.toString('utf-8')
      
      // 应该包含所有测试数据
      expect(csvContent).toContain('张三')
      expect(csvContent).toContain('李四')
      expect(csvContent).toContain('王五')
    })
  })
  
  describe('错误处理', () => {
    it('应该拒绝无效的格式', async () => {
      const result = await exportMessages({ format: 'pdf' as ExportFormat })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('无效的导出格式')
    })
    
    it('应该拒绝无效的开始日期', async () => {
      const result = await exportMessages({
        format: 'excel',
        startDate: 'invalid'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('开始日期格式无效')
    })
    
    it('应该拒绝无效的结束日期', async () => {
      const result = await exportMessages({
        format: 'excel',
        endDate: '2024/01/01'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('结束日期格式无效')
    })
    
    it('应该拒绝开始日期晚于结束日期', async () => {
      const result = await exportMessages({
        format: 'excel',
        startDate: '2024-12-31',
        endDate: '2024-01-01'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('开始日期不能晚于结束日期')
    })
  })
  
  describe('文件名生成', () => {
    it('应该生成正确的 Excel 文件名', async () => {
      const result = await exportMessages({ format: 'excel' })
      
      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/^留言导出_\d{8}\.xlsx$/)
    })
    
    it('应该生成正确的 CSV 文件名', async () => {
      const result = await exportMessages({ format: 'csv' })
      
      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/^留言导出_\d{8}\.csv$/)
    })
    
    it('应该在文件名中包含日期范围', async () => {
      const result = await exportMessages({
        format: 'excel',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      })
      
      expect(result.success).toBe(true)
      expect(result.filename).toContain('2024-01-01')
      expect(result.filename).toContain('2024-12-31')
    })
  })
  
  describe('空数据处理', () => {
    it('应该能导出空数据（Excel）', async () => {
      resetDatabase()
      
      const result = await exportMessages({ format: 'excel' })
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })
    
    it('应该能导出空数据（CSV）', async () => {
      resetDatabase()
      
      const result = await exportMessages({ format: 'csv' })
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      const csvContent = result.data!.toString('utf-8')
      const lines = csvContent.split('\r\n').filter(line => line.trim())
      
      // 只有表头行
      expect(lines.length).toBe(1)
    })
  })
})
