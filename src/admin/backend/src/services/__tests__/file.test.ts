/**
 * 文件服务单元测试
 * 
 * 测试文件管理相关的操作功能
 * 
 * 需求: 5.4.1 - 以树形结构展示文件目录
 * 需求: 5.4.2 - 提供文件上传/下载/删除功能
 * 需求: 5.4.3 - 提供文件重命名功能
 * 需求: 5.4.4 - 显示文件大小和修改时间
 */

import fs from 'fs'
import path from 'path'
import {
  isPathSafe,
  getFullPath,
  getRelativePath,
  formatFileSize,
  isExtensionAllowed,
  getDirectoryTree,
  getFileInfo,
  saveUploadedFile,
  getFileForDownload,
  readFileContent,
  deleteFile,
  renameFile,
  createDirectory,
  pathExists,
  isDirectory,
  isFile,
  getFileRoot
} from '../file'

// ========== 测试辅助函数 ==========

/**
 * 获取测试目录路径
 */
function getTestDir(): string {
  return path.join(getFileRoot(), '__test__')
}

/**
 * 创建测试目录和文件
 */
function setupTestFiles(): void {
  const testDir = getTestDir()
  
  // 创建测试目录结构
  fs.mkdirSync(testDir, { recursive: true })
  fs.mkdirSync(path.join(testDir, 'subdir'), { recursive: true })
  
  // 创建测试文件
  fs.writeFileSync(path.join(testDir, 'test.txt'), '测试内容')
  fs.writeFileSync(path.join(testDir, 'test.json'), '{"key": "value"}')
  fs.writeFileSync(path.join(testDir, 'subdir', 'nested.txt'), '嵌套文件内容')
}

/**
 * 清理测试目录
 */
function cleanupTestFiles(): void {
  const testDir = getTestDir()
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true })
  }
}

// 测试前后清理
beforeEach(() => {
  cleanupTestFiles()
  setupTestFiles()
})

afterAll(() => {
  cleanupTestFiles()
})

// ========== 路径安全性测试 ==========

describe('路径安全性验证', () => {
  describe('isPathSafe（路径安全检查）', () => {
    it('应该允许空路径（根目录）', () => {
      expect(isPathSafe('')).toBe(true)
      expect(isPathSafe('/')).toBe(true)
    })
    
    it('应该允许正常的相对路径', () => {
      expect(isPathSafe('test.txt')).toBe(true)
      expect(isPathSafe('subdir/file.txt')).toBe(true)
      expect(isPathSafe('a/b/c/d.txt')).toBe(true)
    })
    
    it('应该拒绝包含 .. 的路径', () => {
      expect(isPathSafe('..')).toBe(false)
      expect(isPathSafe('../etc/passwd')).toBe(false)
      expect(isPathSafe('subdir/../../../etc')).toBe(false)
    })
    
    it('应该拒绝禁止的目录名', () => {
      expect(isPathSafe('.git')).toBe(false)
      expect(isPathSafe('.env')).toBe(false)
      expect(isPathSafe('node_modules')).toBe(false)
      expect(isPathSafe('subdir/.git')).toBe(false)
    })
  })
  
  describe('getFullPath（获取完整路径）', () => {
    it('应该返回有效路径的完整路径', () => {
      const fullPath = getFullPath('test.txt')
      expect(fullPath).not.toBeNull()
      expect(fullPath).toContain('test.txt')
    })
    
    it('应该返回 null 对于不安全的路径', () => {
      expect(getFullPath('../etc/passwd')).toBeNull()
      expect(getFullPath('.git')).toBeNull()
    })
    
    it('空路径应该返回根目录', () => {
      const fullPath = getFullPath('')
      expect(fullPath).toBe(getFileRoot())
    })
  })
  
  describe('getRelativePath（获取相对路径）', () => {
    it('应该正确计算相对路径', () => {
      const fileRoot = getFileRoot()
      const fullPath = path.join(fileRoot, 'subdir', 'file.txt')
      
      const relativePath = getRelativePath(fullPath)
      
      expect(relativePath).toBe('subdir/file.txt')
    })
  })
})

// ========== 工具函数测试 ==========

describe('工具函数', () => {
  describe('formatFileSize（格式化文件大小）', () => {
    it('应该正确格式化字节', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(500)).toBe('500 B')
    })
    
    it('应该正确格式化 KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })
    
    it('应该正确格式化 MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
    })
    
    it('应该正确格式化 GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })
  
  describe('isExtensionAllowed（扩展名检查）', () => {
    it('应该允许常见的文档扩展名', () => {
      expect(isExtensionAllowed('document.txt')).toBe(true)
      expect(isExtensionAllowed('document.pdf')).toBe(true)
      expect(isExtensionAllowed('document.md')).toBe(true)
      expect(isExtensionAllowed('data.json')).toBe(true)
      expect(isExtensionAllowed('data.csv')).toBe(true)
    })
    
    it('应该允许图片扩展名', () => {
      expect(isExtensionAllowed('image.jpg')).toBe(true)
      expect(isExtensionAllowed('image.jpeg')).toBe(true)
      expect(isExtensionAllowed('image.png')).toBe(true)
      expect(isExtensionAllowed('image.gif')).toBe(true)
      expect(isExtensionAllowed('image.webp')).toBe(true)
      expect(isExtensionAllowed('image.svg')).toBe(true)
    })
    
    it('应该允许音频扩展名', () => {
      expect(isExtensionAllowed('audio.mp3')).toBe(true)
      expect(isExtensionAllowed('audio.ogg')).toBe(true)
      expect(isExtensionAllowed('audio.wav')).toBe(true)
    })
    
    it('应该允许代码文件扩展名', () => {
      expect(isExtensionAllowed('code.ts')).toBe(true)
      expect(isExtensionAllowed('code.js')).toBe(true)
      expect(isExtensionAllowed('page.html')).toBe(true)
      expect(isExtensionAllowed('style.css')).toBe(true)
    })
    
    it('应该允许没有扩展名的文件', () => {
      expect(isExtensionAllowed('README')).toBe(true)
      expect(isExtensionAllowed('Makefile')).toBe(true)
    })
  })
})

// ========== 目录树测试 ==========

describe('目录树生成', () => {
  /**
   * 需求: 5.4.1 - 以树形结构展示文件目录
   */
  describe('getDirectoryTree（获取目录树）', () => {
    it('应该返回目录树结构', () => {
      const tree = getDirectoryTree('__test__')
      
      expect(tree).toBeInstanceOf(Array)
      expect(tree.length).toBeGreaterThan(0)
    })
    
    it('应该包含文件和目录', () => {
      const tree = getDirectoryTree('__test__')
      
      // 查找目录
      const subdir = tree.find(node => node.name === 'subdir')
      expect(subdir).toBeDefined()
      expect(subdir?.type).toBe('directory')
      
      // 查找文件
      const testFile = tree.find(node => node.name === 'test.txt')
      expect(testFile).toBeDefined()
      expect(testFile?.type).toBe('file')
    })
    
    /**
     * 需求: 5.4.4 - 显示文件大小和修改时间
     */
    it('文件节点应该包含大小和修改时间', () => {
      const tree = getDirectoryTree('__test__')
      const testFile = tree.find(node => node.name === 'test.txt')
      
      expect(testFile?.size).toBeDefined()
      expect(testFile?.size).toBeGreaterThan(0)
      expect(testFile?.modifiedAt).toBeDefined()
    })
    
    it('应该包含嵌套的子目录内容', () => {
      const tree = getDirectoryTree('__test__')
      const subdir = tree.find(node => node.name === 'subdir')
      
      expect(subdir?.children).toBeDefined()
      expect(subdir?.children?.length).toBeGreaterThan(0)
      
      const nestedFile = subdir?.children?.find(node => node.name === 'nested.txt')
      expect(nestedFile).toBeDefined()
    })
    
    it('应该返回空数组对于不存在的路径', () => {
      const tree = getDirectoryTree('nonexistent')
      expect(tree).toEqual([])
    })
    
    it('应该返回空数组对于不安全的路径', () => {
      const tree = getDirectoryTree('../etc')
      expect(tree).toEqual([])
    })
    
    it('目录应该排在文件前面', () => {
      const tree = getDirectoryTree('__test__')
      
      // 找到第一个目录和第一个文件的索引
      const firstDirIndex = tree.findIndex(node => node.type === 'directory')
      const firstFileIndex = tree.findIndex(node => node.type === 'file')
      
      if (firstDirIndex !== -1 && firstFileIndex !== -1) {
        expect(firstDirIndex).toBeLessThan(firstFileIndex)
      }
    })
  })
})

// ========== 文件信息测试 ==========

describe('文件信息', () => {
  /**
   * 需求: 5.4.4 - 显示文件大小和修改时间
   */
  describe('getFileInfo（获取文件信息）', () => {
    it('应该返回文件的详细信息', () => {
      const info = getFileInfo('__test__/test.txt')
      
      expect(info).not.toBeNull()
      expect(info?.name).toBe('test.txt')
      expect(info?.type).toBe('file')
      expect(info?.size).toBeGreaterThan(0)
      expect(info?.modifiedAt).toBeDefined()
      expect(info?.createdAt).toBeDefined()
      expect(info?.extension).toBe('.txt')
    })
    
    it('应该返回目录的信息', () => {
      const info = getFileInfo('__test__/subdir')
      
      expect(info).not.toBeNull()
      expect(info?.name).toBe('subdir')
      expect(info?.type).toBe('directory')
    })
    
    it('应该返回 null 对于不存在的路径', () => {
      const info = getFileInfo('__test__/nonexistent.txt')
      expect(info).toBeNull()
    })
    
    it('应该返回 null 对于不安全的路径', () => {
      const info = getFileInfo('../etc/passwd')
      expect(info).toBeNull()
    })
  })
})

// ========== 文件上传测试 ==========

describe('文件上传', () => {
  /**
   * 需求: 5.4.2 - 提供文件上传功能
   */
  describe('saveUploadedFile（保存上传文件）', () => {
    it('应该成功保存文件', () => {
      const content = Buffer.from('上传的文件内容')
      const result = saveUploadedFile(content, 'uploaded.txt', '__test__')
      
      expect(result.success).toBe(true)
      expect(result.filename).toBe('uploaded.txt')
      expect(result.path).toBe('__test__/uploaded.txt')
      
      // 验证文件确实被创建
      expect(pathExists('__test__/uploaded.txt')).toBe(true)
    })
    
    it('应该处理文件名冲突', () => {
      const content = Buffer.from('内容')
      
      // 上传第一个文件
      saveUploadedFile(content, 'conflict.txt', '__test__')
      
      // 上传同名文件
      const result = saveUploadedFile(content, 'conflict.txt', '__test__')
      
      expect(result.success).toBe(true)
      expect(result.filename).toBe('conflict_1.txt')
    })
    
    it('应该拒绝无效的文件名', () => {
      const content = Buffer.from('内容')
      
      const result1 = saveUploadedFile(content, '../evil.txt', '__test__')
      expect(result1.success).toBe(false)
      
      const result2 = saveUploadedFile(content, 'path/to/file.txt', '__test__')
      expect(result2.success).toBe(false)
    })
    
    it('应该拒绝无效的目标目录', () => {
      const content = Buffer.from('内容')
      const result = saveUploadedFile(content, 'file.txt', '../etc')
      
      expect(result.success).toBe(false)
    })
    
    it('应该自动创建不存在的目标目录', () => {
      const content = Buffer.from('内容')
      const result = saveUploadedFile(content, 'file.txt', '__test__/newdir')
      
      expect(result.success).toBe(true)
      expect(pathExists('__test__/newdir/file.txt')).toBe(true)
    })
  })
})

// ========== 文件下载测试 ==========

describe('文件下载', () => {
  /**
   * 需求: 5.4.2 - 提供文件下载功能
   */
  describe('getFileForDownload（获取下载文件）', () => {
    it('应该返回文件流和信息', () => {
      const result = getFileForDownload('__test__/test.txt')
      
      expect(result).not.toBeNull()
      expect(result?.filename).toBe('test.txt')
      expect(result?.size).toBeGreaterThan(0)
      expect(result?.mimeType).toBe('text/plain')
      expect(result?.stream).toBeDefined()
      
      // 关闭流
      result?.stream.destroy()
    })
    
    it('应该返回 null 对于不存在的文件', () => {
      const result = getFileForDownload('__test__/nonexistent.txt')
      expect(result).toBeNull()
    })
    
    it('应该返回 null 对于目录', () => {
      const result = getFileForDownload('__test__/subdir')
      expect(result).toBeNull()
    })
  })
  
  describe('readFileContent（读取文件内容）', () => {
    it('应该返回文件内容', () => {
      const content = readFileContent('__test__/test.txt')
      
      expect(content).not.toBeNull()
      expect(content?.toString()).toBe('测试内容')
    })
    
    it('应该返回 null 对于不存在的文件', () => {
      const content = readFileContent('__test__/nonexistent.txt')
      expect(content).toBeNull()
    })
  })
})

// ========== 文件删除测试 ==========

describe('文件删除', () => {
  /**
   * 需求: 5.4.2 - 提供文件删除功能
   */
  describe('deleteFile（删除文件）', () => {
    it('应该成功删除文件', () => {
      // 确保文件存在
      expect(pathExists('__test__/test.txt')).toBe(true)
      
      const result = deleteFile('__test__/test.txt')
      
      expect(result.success).toBe(true)
      expect(pathExists('__test__/test.txt')).toBe(false)
    })
    
    it('应该成功删除目录（递归）', () => {
      // 确保目录存在
      expect(pathExists('__test__/subdir')).toBe(true)
      
      const result = deleteFile('__test__/subdir')
      
      expect(result.success).toBe(true)
      expect(pathExists('__test__/subdir')).toBe(false)
    })
    
    it('应该拒绝删除根目录', () => {
      const result1 = deleteFile('')
      expect(result1.success).toBe(false)
      
      const result2 = deleteFile('/')
      expect(result2.success).toBe(false)
    })
    
    it('应该返回错误对于不存在的文件', () => {
      const result = deleteFile('__test__/nonexistent.txt')
      expect(result.success).toBe(false)
    })
    
    it('应该拒绝不安全的路径', () => {
      const result = deleteFile('../etc/passwd')
      expect(result.success).toBe(false)
    })
  })
})

// ========== 文件重命名测试 ==========

describe('文件重命名', () => {
  /**
   * 需求: 5.4.3 - 提供文件重命名功能
   */
  describe('renameFile（重命名文件）', () => {
    it('应该成功重命名文件', () => {
      const result = renameFile('__test__/test.txt', '__test__/renamed.txt')
      
      expect(result.success).toBe(true)
      expect(pathExists('__test__/test.txt')).toBe(false)
      expect(pathExists('__test__/renamed.txt')).toBe(true)
    })
    
    it('应该成功移动文件到其他目录', () => {
      // 创建目标目录
      createDirectory('__test__/movedir')
      
      const result = renameFile('__test__/test.txt', '__test__/movedir/moved.txt')
      
      expect(result.success).toBe(true)
      expect(pathExists('__test__/test.txt')).toBe(false)
      expect(pathExists('__test__/movedir/moved.txt')).toBe(true)
    })
    
    it('应该拒绝重命名到已存在的路径', () => {
      const result = renameFile('__test__/test.txt', '__test__/test.json')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('已存在')
    })
    
    it('应该返回错误对于不存在的源文件', () => {
      const result = renameFile('__test__/nonexistent.txt', '__test__/new.txt')
      expect(result.success).toBe(false)
    })
    
    it('应该拒绝不安全的路径', () => {
      const result1 = renameFile('../etc/passwd', '__test__/passwd')
      expect(result1.success).toBe(false)
      
      const result2 = renameFile('__test__/test.txt', '../etc/evil')
      expect(result2.success).toBe(false)
    })
    
    it('应该拒绝空路径', () => {
      const result1 = renameFile('', '__test__/new.txt')
      expect(result1.success).toBe(false)
      
      const result2 = renameFile('__test__/test.txt', '')
      expect(result2.success).toBe(false)
    })
  })
})

// ========== 目录操作测试 ==========

describe('目录操作', () => {
  describe('createDirectory（创建目录）', () => {
    it('应该成功创建目录', () => {
      const result = createDirectory('__test__/newdir')
      
      expect(result.success).toBe(true)
      expect(isDirectory('__test__/newdir')).toBe(true)
    })
    
    it('应该成功创建嵌套目录', () => {
      const result = createDirectory('__test__/a/b/c')
      
      expect(result.success).toBe(true)
      expect(isDirectory('__test__/a/b/c')).toBe(true)
    })
    
    it('应该返回错误对于已存在的目录', () => {
      const result = createDirectory('__test__/subdir')
      expect(result.success).toBe(false)
    })
    
    it('应该拒绝空路径', () => {
      const result = createDirectory('')
      expect(result.success).toBe(false)
    })
  })
  
  describe('pathExists / isDirectory / isFile（路径检查）', () => {
    it('pathExists 应该正确检测存在的路径', () => {
      expect(pathExists('__test__/test.txt')).toBe(true)
      expect(pathExists('__test__/subdir')).toBe(true)
      expect(pathExists('__test__/nonexistent')).toBe(false)
    })
    
    it('isDirectory 应该正确识别目录', () => {
      expect(isDirectory('__test__/subdir')).toBe(true)
      expect(isDirectory('__test__/test.txt')).toBe(false)
      expect(isDirectory('__test__/nonexistent')).toBe(false)
    })
    
    it('isFile 应该正确识别文件', () => {
      expect(isFile('__test__/test.txt')).toBe(true)
      expect(isFile('__test__/subdir')).toBe(false)
      expect(isFile('__test__/nonexistent')).toBe(false)
    })
  })
})

// ========== 简历版本管理测试 ==========

import { initDatabase, closeDatabase, resetDatabase } from '../../database/init'
import {
  isPdfFile,
  uploadResume,
  getResumeVersions,
  setActiveResume,
  getActiveResume,
  incrementResumeDownloadCount,
  getResumeForDownload,
  deleteResumeVersion,
  getTotalResumeDownloads
} from '../file'

describe('简历版本管理', () => {
  // 在所有简历测试前初始化数据库
  beforeAll(async () => {
    await initDatabase(':memory:')
  })
  
  // 每个测试前重置数据库
  beforeEach(() => {
    resetDatabase()
  })
  
  // 所有测试完成后关闭数据库
  afterAll(() => {
    closeDatabase()
  })
  
  /**
   * 需求: 5.1.1 - 提供简历上传功能（仅支持 PDF 格式）
   */
  describe('isPdfFile（PDF 文件验证）', () => {
    it('应该接受 .pdf 扩展名的文件', () => {
      expect(isPdfFile('resume.pdf')).toBe(true)
      expect(isPdfFile('my_resume.PDF')).toBe(true)
      expect(isPdfFile('简历.pdf')).toBe(true)
    })
    
    it('应该拒绝非 PDF 扩展名的文件', () => {
      expect(isPdfFile('resume.doc')).toBe(false)
      expect(isPdfFile('resume.docx')).toBe(false)
      expect(isPdfFile('resume.txt')).toBe(false)
      expect(isPdfFile('resume.jpg')).toBe(false)
    })
    
    it('应该验证 PDF 文件头', () => {
      // 有效的 PDF 文件头
      const validPdfBuffer = Buffer.from('%PDF-1.4 test content')
      expect(isPdfFile('test.pdf', validPdfBuffer)).toBe(true)
      
      // 无效的文件头（即使扩展名是 .pdf）
      const invalidPdfBuffer = Buffer.from('This is not a PDF')
      expect(isPdfFile('test.pdf', invalidPdfBuffer)).toBe(false)
    })
    
    it('应该处理空文件或小文件', () => {
      const emptyBuffer = Buffer.from('')
      expect(isPdfFile('test.pdf', emptyBuffer)).toBe(true) // 只检查扩展名
      
      const smallBuffer = Buffer.from('%PD')
      expect(isPdfFile('test.pdf', smallBuffer)).toBe(true) // 文件太小，只检查扩展名
    })
  })
  
  /**
   * 需求: 5.1.1 - 提供简历上传功能（仅支持 PDF 格式）
   */
  describe('uploadResume（上传简历）', () => {
    it('应该成功上传 PDF 简历', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test resume content')
      const result = uploadResume(pdfContent, 'my_resume.pdf')
      
      expect(result.success).toBe(true)
      expect(result.version).toBe(1)
    })
    
    it('应该拒绝非 PDF 文件', () => {
      const docContent = Buffer.from('This is a Word document')
      const result = uploadResume(docContent, 'resume.doc')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('PDF')
    })
    
    it('应该拒绝伪装成 PDF 的文件', () => {
      const fakeContent = Buffer.from('This is not a real PDF file')
      const result = uploadResume(fakeContent, 'fake.pdf')
      
      expect(result.success).toBe(false)
    })
    
    it('应该自动递增版本号', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      
      const result1 = uploadResume(pdfContent, 'resume_v1.pdf')
      expect(result1.version).toBe(1)
      
      const result2 = uploadResume(pdfContent, 'resume_v2.pdf')
      expect(result2.version).toBe(2)
      
      const result3 = uploadResume(pdfContent, 'resume_v3.pdf')
      expect(result3.version).toBe(3)
    })
    
    it('第一个上传的简历应该自动设置为当前使用', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      uploadResume(pdfContent, 'first_resume.pdf')
      
      const active = getActiveResume()
      expect(active).not.toBeNull()
      expect(active?.version).toBe(1)
      expect(active?.isActive).toBe(true)
    })
  })
  
  /**
   * 需求: 5.1.2 - 保留简历版本历史（最多 5 个版本）
   */
  describe('getResumeVersions（获取简历版本列表）', () => {
    it('应该返回空列表当没有简历时', () => {
      const versions = getResumeVersions()
      expect(versions).toEqual([])
    })
    
    it('应该返回所有上传的简历版本', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      
      uploadResume(pdfContent, 'resume1.pdf')
      uploadResume(pdfContent, 'resume2.pdf')
      uploadResume(pdfContent, 'resume3.pdf')
      
      const versions = getResumeVersions()
      
      expect(versions.length).toBe(3)
      // 应该按版本号降序排列
      expect(versions[0].version).toBe(3)
      expect(versions[1].version).toBe(2)
      expect(versions[2].version).toBe(1)
    })
    
    it('版本信息应该包含所有必要字段', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      uploadResume(pdfContent, 'my_resume.pdf')
      
      const versions = getResumeVersions()
      const version = versions[0]
      
      expect(version.id).toBeDefined()
      expect(version.version).toBe(1)
      expect(version.filename).toBe('my_resume.pdf')
      expect(version.filePath).toContain('resume')
      expect(version.fileSize).toBeGreaterThan(0)
      expect(version.isActive).toBe(true)
      expect(version.downloadCount).toBe(0)
      expect(version.createdAt).toBeDefined()
    })
    
    it('应该限制最多 5 个版本', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      
      // 上传 7 个版本
      for (let i = 1; i <= 7; i++) {
        uploadResume(pdfContent, `resume_${i}.pdf`)
      }
      
      const versions = getResumeVersions()
      
      // 应该只保留最新的 5 个版本
      expect(versions.length).toBe(5)
      // 最新的版本应该是 7
      expect(versions[0].version).toBe(7)
      // 最旧的版本应该是 3（1 和 2 被删除了）
      expect(versions[4].version).toBe(3)
    })
  })
  
  /**
   * 需求: 5.1.3 - 提供设置当前使用简历的功能
   */
  describe('setActiveResume（设置当前简历）', () => {
    it('应该成功设置当前使用的简历', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      
      uploadResume(pdfContent, 'resume1.pdf')
      uploadResume(pdfContent, 'resume2.pdf')
      uploadResume(pdfContent, 'resume3.pdf')
      
      // 设置版本 2 为当前使用
      const result = setActiveResume(2)
      
      expect(result.success).toBe(true)
      
      const active = getActiveResume()
      expect(active?.version).toBe(2)
    })
    
    it('应该返回错误当版本不存在时', () => {
      const result = setActiveResume(999)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('不存在')
    })
    
    it('设置新的当前简历应该取消之前的当前状态', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      
      uploadResume(pdfContent, 'resume1.pdf')
      uploadResume(pdfContent, 'resume2.pdf')
      
      // 第一个版本默认是当前的
      let versions = getResumeVersions()
      expect(versions.find(v => v.version === 1)?.isActive).toBe(true)
      
      // 设置版本 2 为当前
      setActiveResume(2)
      
      versions = getResumeVersions()
      expect(versions.find(v => v.version === 1)?.isActive).toBe(false)
      expect(versions.find(v => v.version === 2)?.isActive).toBe(true)
    })
  })
  
  /**
   * 需求: 5.1.3 - 提供设置当前使用简历的功能
   */
  describe('getActiveResume（获取当前简历）', () => {
    it('应该返回 null 当没有简历时', () => {
      const active = getActiveResume()
      expect(active).toBeNull()
    })
    
    it('应该返回当前使用的简历', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      uploadResume(pdfContent, 'current_resume.pdf')
      
      const active = getActiveResume()
      
      expect(active).not.toBeNull()
      expect(active?.filename).toBe('current_resume.pdf')
      expect(active?.isActive).toBe(true)
    })
  })
  
  /**
   * 需求: 5.1.4 - 显示简历下载统计
   */
  describe('incrementResumeDownloadCount（增加下载次数）', () => {
    it('应该成功增加下载次数', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      uploadResume(pdfContent, 'resume.pdf')
      
      // 初始下载次数应该是 0
      let versions = getResumeVersions()
      expect(versions[0].downloadCount).toBe(0)
      
      // 增加下载次数
      incrementResumeDownloadCount(1)
      incrementResumeDownloadCount(1)
      incrementResumeDownloadCount(1)
      
      versions = getResumeVersions()
      expect(versions[0].downloadCount).toBe(3)
    })
    
    it('应该返回错误当版本不存在时', () => {
      const result = incrementResumeDownloadCount(999)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('不存在')
    })
  })
  
  /**
   * 需求: 5.1.4 - 显示简历下载统计
   */
  describe('getTotalResumeDownloads（获取总下载次数）', () => {
    it('应该返回 0 当没有下载时', () => {
      const total = getTotalResumeDownloads()
      expect(total).toBe(0)
    })
    
    it('应该返回所有版本的总下载次数', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      
      uploadResume(pdfContent, 'resume1.pdf')
      uploadResume(pdfContent, 'resume2.pdf')
      
      // 版本 1 下载 3 次
      incrementResumeDownloadCount(1)
      incrementResumeDownloadCount(1)
      incrementResumeDownloadCount(1)
      
      // 版本 2 下载 2 次
      incrementResumeDownloadCount(2)
      incrementResumeDownloadCount(2)
      
      const total = getTotalResumeDownloads()
      expect(total).toBe(5)
    })
  })
  
  /**
   * 需求: 5.1.1 - 提供简历上传功能（仅支持 PDF 格式）
   */
  describe('getResumeForDownload（获取简历下载）', () => {
    it('应该返回简历文件信息', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      uploadResume(pdfContent, 'download_test.pdf')
      
      const result = getResumeForDownload(1)
      
      expect(result).not.toBeNull()
      expect(result?.filename).toBe('download_test.pdf')
      expect(result?.mimeType).toBe('application/pdf')
      expect(result?.size).toBeGreaterThan(0)
      expect(result?.stream).toBeDefined()
      
      // 关闭流
      result?.stream.destroy()
    })
    
    it('应该返回 null 当版本不存在时', () => {
      const result = getResumeForDownload(999)
      expect(result).toBeNull()
    })
  })
  
  describe('deleteResumeVersion（删除简历版本）', () => {
    it('应该成功删除简历版本', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      
      uploadResume(pdfContent, 'resume1.pdf')
      uploadResume(pdfContent, 'resume2.pdf')
      
      const result = deleteResumeVersion(1)
      
      expect(result.success).toBe(true)
      
      const versions = getResumeVersions()
      expect(versions.length).toBe(1)
      expect(versions[0].version).toBe(2)
    })
    
    it('删除当前简历后应该自动设置最新版本为当前', () => {
      const pdfContent = Buffer.from('%PDF-1.4 test content')
      
      uploadResume(pdfContent, 'resume1.pdf')
      uploadResume(pdfContent, 'resume2.pdf')
      uploadResume(pdfContent, 'resume3.pdf')
      
      // 设置版本 2 为当前
      setActiveResume(2)
      
      // 删除当前版本
      deleteResumeVersion(2)
      
      // 最新版本（3）应该成为当前
      const active = getActiveResume()
      expect(active?.version).toBe(3)
    })
    
    it('应该返回错误当版本不存在时', () => {
      const result = deleteResumeVersion(999)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('不存在')
    })
  })
})


// ========== 图片和音频处理测试 ==========

import {
  isValidImageFile,
  isValidAudioFile,
  uploadImage,
  uploadAvatar,
  uploadAudio,
  getImagesByCategory,
  getAudioByType,
  deleteImage,
  deleteAudio,
  getImageCategories,
  getAudioTypes,
  ImageCategory,
  AudioType
} from '../file'

describe('图片处理', () => {
  /**
   * 需求: 5.2.1 - 提供图片上传功能（支持 JPG/PNG/WebP）
   */
  describe('isValidImageFile（图片文件验证）', () => {
    it('应该接受 JPG 扩展名的文件', () => {
      expect(isValidImageFile('image.jpg')).toBe(true)
      expect(isValidImageFile('image.jpeg')).toBe(true)
      expect(isValidImageFile('IMAGE.JPG')).toBe(true)
    })
    
    it('应该接受 PNG 扩展名的文件', () => {
      expect(isValidImageFile('image.png')).toBe(true)
      expect(isValidImageFile('IMAGE.PNG')).toBe(true)
    })
    
    it('应该接受 WebP 扩展名的文件', () => {
      expect(isValidImageFile('image.webp')).toBe(true)
      expect(isValidImageFile('IMAGE.WEBP')).toBe(true)
    })
    
    it('应该拒绝不支持的图片格式', () => {
      expect(isValidImageFile('image.gif')).toBe(false)
      expect(isValidImageFile('image.bmp')).toBe(false)
      expect(isValidImageFile('image.tiff')).toBe(false)
      expect(isValidImageFile('image.svg')).toBe(false)
    })
    
    it('应该拒绝非图片文件', () => {
      expect(isValidImageFile('document.pdf')).toBe(false)
      expect(isValidImageFile('document.txt')).toBe(false)
      expect(isValidImageFile('audio.mp3')).toBe(false)
    })
    
    it('应该验证 JPEG 文件头', () => {
      // 有效的 JPEG 文件头 (FF D8 FF)
      const validJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10])
      expect(isValidImageFile('test.jpg', validJpegBuffer)).toBe(true)
      
      // 无效的文件头
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00])
      expect(isValidImageFile('test.jpg', invalidBuffer)).toBe(false)
    })
    
    it('应该验证 PNG 文件头', () => {
      // 有效的 PNG 文件头 (89 50 4E 47)
      const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A])
      expect(isValidImageFile('test.png', validPngBuffer)).toBe(true)
      
      // 无效的文件头
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00])
      expect(isValidImageFile('test.png', invalidBuffer)).toBe(false)
    })
    
    it('应该验证 WebP 文件头', () => {
      // 有效的 WebP 文件头 (RIFF....WEBP)
      const validWebpBuffer = Buffer.from('RIFF\x00\x00\x00\x00WEBP')
      expect(isValidImageFile('test.webp', validWebpBuffer)).toBe(true)
      
      // 无效的文件头
      const invalidBuffer = Buffer.from('NOT A WEBP FILE')
      expect(isValidImageFile('test.webp', invalidBuffer)).toBe(false)
    })
  })
  
  /**
   * 需求: 5.2.4 - 按分类组织图片（头像、项目截图、其他）
   */
  describe('getImageCategories（获取图片分类）', () => {
    it('应该返回所有图片分类', () => {
      const categories = getImageCategories()
      
      expect(categories).toHaveLength(3)
      expect(categories.find(c => c.value === 'avatar')).toBeDefined()
      expect(categories.find(c => c.value === 'screenshot')).toBeDefined()
      expect(categories.find(c => c.value === 'other')).toBeDefined()
    })
    
    it('每个分类应该有中文标签', () => {
      const categories = getImageCategories()
      
      const avatar = categories.find(c => c.value === 'avatar')
      expect(avatar?.label).toBe('头像')
      
      const screenshot = categories.find(c => c.value === 'screenshot')
      expect(screenshot?.label).toBe('项目截图')
      
      const other = categories.find(c => c.value === 'other')
      expect(other?.label).toBe('其他')
    })
  })
  
  /**
   * 需求: 5.2.4 - 按分类组织图片（头像、项目截图、其他）
   */
  describe('getImagesByCategory（按分类获取图片）', () => {
    it('应该返回空数组当没有图片时', () => {
      const images = getImagesByCategory('avatar')
      expect(images).toEqual([])
    })
    
    it('应该返回空数组对于不存在的分类目录', () => {
      const images = getImagesByCategory('other')
      expect(images).toBeInstanceOf(Array)
    })
  })
})

describe('音频处理', () => {
  /**
   * 需求: 5.3.1 - 提供音频文件上传功能（支持 MP3/OGG）
   */
  describe('isValidAudioFile（音频文件验证）', () => {
    it('应该接受 MP3 扩展名的文件', () => {
      expect(isValidAudioFile('audio.mp3')).toBe(true)
      expect(isValidAudioFile('AUDIO.MP3')).toBe(true)
    })
    
    it('应该接受 OGG 扩展名的文件', () => {
      expect(isValidAudioFile('audio.ogg')).toBe(true)
      expect(isValidAudioFile('AUDIO.OGG')).toBe(true)
    })
    
    it('应该拒绝不支持的音频格式', () => {
      expect(isValidAudioFile('audio.wav')).toBe(false)
      expect(isValidAudioFile('audio.flac')).toBe(false)
      expect(isValidAudioFile('audio.aac')).toBe(false)
      expect(isValidAudioFile('audio.m4a')).toBe(false)
    })
    
    it('应该拒绝非音频文件', () => {
      expect(isValidAudioFile('document.pdf')).toBe(false)
      expect(isValidAudioFile('image.jpg')).toBe(false)
      expect(isValidAudioFile('video.mp4')).toBe(false)
    })
    
    it('应该验证 MP3 文件头（ID3 标签）', () => {
      // 有效的 MP3 文件头 (ID3)
      const validMp3Buffer = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00')
      expect(isValidAudioFile('test.mp3', validMp3Buffer)).toBe(true)
    })
    
    it('应该验证 MP3 文件头（帧同步字）', () => {
      // 有效的 MP3 帧同步字 (FF FB)
      const validMp3Buffer = Buffer.from([0xFF, 0xFB, 0x90, 0x00])
      expect(isValidAudioFile('test.mp3', validMp3Buffer)).toBe(true)
    })
    
    it('应该验证 OGG 文件头', () => {
      // 有效的 OGG 文件头 (OggS)
      const validOggBuffer = Buffer.from('OggS\x00\x02\x00\x00')
      expect(isValidAudioFile('test.ogg', validOggBuffer)).toBe(true)
      
      // 无效的文件头
      const invalidBuffer = Buffer.from('NOT AN OGG FILE')
      expect(isValidAudioFile('test.ogg', invalidBuffer)).toBe(false)
    })
    
    it('应该拒绝无效的 MP3 文件头', () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00])
      expect(isValidAudioFile('test.mp3', invalidBuffer)).toBe(false)
    })
  })
  
  /**
   * 需求: 5.3.2 - 按类型分类音频（背景音乐、音效）
   */
  describe('getAudioTypes（获取音频类型）', () => {
    it('应该返回所有音频类型', () => {
      const types = getAudioTypes()
      
      expect(types).toHaveLength(2)
      expect(types.find(t => t.value === 'bgm')).toBeDefined()
      expect(types.find(t => t.value === 'sfx')).toBeDefined()
    })
    
    it('每个类型应该有中文标签', () => {
      const types = getAudioTypes()
      
      const bgm = types.find(t => t.value === 'bgm')
      expect(bgm?.label).toBe('背景音乐')
      
      const sfx = types.find(t => t.value === 'sfx')
      expect(sfx?.label).toBe('音效')
    })
  })
  
  /**
   * 需求: 5.3.2 - 按类型分类音频（背景音乐、音效）
   */
  describe('getAudioByType（按类型获取音频）', () => {
    it('应该返回空数组当没有音频时', () => {
      const audioFiles = getAudioByType('bgm')
      expect(audioFiles).toEqual([])
    })
    
    it('应该返回空数组对于不存在的类型目录', () => {
      const audioFiles = getAudioByType('sfx')
      expect(audioFiles).toBeInstanceOf(Array)
    })
  })
  
  /**
   * 需求: 5.3.1 - 提供音频文件上传功能（支持 MP3/OGG）
   * 需求: 5.3.2 - 按类型分类音频（背景音乐、音效）
   */
  describe('uploadAudio（上传音频）', () => {
    it('应该拒绝不支持的音频格式', async () => {
      const wavContent = Buffer.from('RIFF\x00\x00\x00\x00WAVEfmt ')
      const result = await uploadAudio(wavContent, 'audio.wav', 'bgm')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('不支持')
    })
    
    it('应该拒绝非音频文件', async () => {
      const textContent = Buffer.from('This is not an audio file')
      const result = await uploadAudio(textContent, 'document.txt', 'sfx')
      
      expect(result.success).toBe(false)
    })
    
    it('应该成功上传有效的 MP3 文件', async () => {
      // 创建一个有效的 MP3 文件头
      const mp3Content = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00test audio content')
      const result = await uploadAudio(mp3Content, 'test.mp3', 'bgm')
      
      expect(result.success).toBe(true)
      expect(result.path).toContain('audio/bgm/')
    })
    
    it('应该成功上传有效的 OGG 文件', async () => {
      // 创建一个有效的 OGG 文件头
      const oggContent = Buffer.from('OggS\x00\x02\x00\x00\x00\x00\x00\x00test audio content')
      const result = await uploadAudio(oggContent, 'test.ogg', 'sfx')
      
      expect(result.success).toBe(true)
      expect(result.path).toContain('audio/sfx/')
    })
  })
})

describe('图片上传和处理', () => {
  /**
   * 需求: 5.2.1 - 提供图片上传功能（支持 JPG/PNG/WebP）
   * 需求: 5.2.3 - 自动压缩上传的图片（质量 80%，最大宽度 1920px）
   */
  describe('uploadImage（上传图片）', () => {
    it('应该拒绝不支持的图片格式', async () => {
      const gifContent = Buffer.from('GIF89a\x01\x00\x01\x00')
      const result = await uploadImage(gifContent, 'image.gif', 'other')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('不支持')
    })
    
    it('应该拒绝非图片文件', async () => {
      const textContent = Buffer.from('This is not an image')
      const result = await uploadImage(textContent, 'document.txt', 'other')
      
      expect(result.success).toBe(false)
    })
  })
  
  /**
   * 需求: 5.2.2 - 提供头像裁剪功能（1:1 比例）
   */
  describe('uploadAvatar（上传头像）', () => {
    it('应该拒绝不支持的图片格式', async () => {
      const gifContent = Buffer.from('GIF89a\x01\x00\x01\x00')
      const result = await uploadAvatar(gifContent, 'avatar.gif')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('不支持')
    })
    
    it('应该拒绝非图片文件', async () => {
      const textContent = Buffer.from('This is not an image')
      const result = await uploadAvatar(textContent, 'avatar.txt')
      
      expect(result.success).toBe(false)
    })
  })
})
