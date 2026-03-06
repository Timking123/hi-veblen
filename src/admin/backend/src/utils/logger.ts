import fs from 'fs'
import path from 'path'

/**
 * 日志级别枚举
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * 日志条目接口
 */
interface LogEntry {
  timestamp: string
  level: string
  module: string
  message: string
  data?: unknown
}

/**
 * Logger 类 - 结构化日志系统
 * 
 * 功能：
 * - 支持 debug/info/warn/error 四个级别
 * - 输出 JSON 格式日志
 * - 日志级别过滤（通过环境变量 LOG_LEVEL 配置）
 * - 日志文件写入（按日期轮转，单文件最大 10MB）
 * - 过期日志清理（超过 30 天自动删除）
 */
export class Logger {
  private module: string
  private logDir: string
  private maxFileSize: number = 10 * 1024 * 1024 // 10MB
  private maxAge: number = 30 // 30天
  private minLevel: LogLevel

  constructor(module: string) {
    this.module = module
    this.logDir = path.resolve(__dirname, '../../logs')
    
    // 从环境变量读取最低日志级别，默认为 INFO
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO'
    this.minLevel = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO

    // 确保日志目录存在
    this.ensureLogDirectory()
    
    // 启动时清理过期日志
    this.cleanOldLogs()
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  /**
   * 记录 DEBUG 级别日志
   */
  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  /**
   * 记录 INFO 级别日志
   */
  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data)
  }

  /**
   * 记录 WARN 级别日志
   */
  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data)
  }

  /**
   * 记录 ERROR 级别日志
   */
  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data)
  }

  /**
   * 核心日志记录方法
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    // 日志级别过滤
    if (level < this.minLevel) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      module: this.module,
      message,
      ...(data !== undefined && { data })
    }

    // 输出到控制台
    const jsonLog = JSON.stringify(entry)
    console.log(jsonLog)

    // 写入文件
    this.writeToFile(entry)
  }

  /**
   * 写入日志到文件
   */
  private writeToFile(entry: LogEntry): void {
    try {
      const logFilePath = this.getCurrentLogFilePath()
      const jsonLog = JSON.stringify(entry) + '\n'

      // 检查文件大小，如果超过限制则轮转
      if (fs.existsSync(logFilePath)) {
        const stats = fs.statSync(logFilePath)
        if (stats.size >= this.maxFileSize) {
          this.rotateLogFile(logFilePath)
        }
      }

      // 追加写入日志
      fs.appendFileSync(logFilePath, jsonLog, 'utf-8')
    } catch (error) {
      // 写入失败时回退到 console 输出，不影响业务逻辑
      console.error('[Logger] 写入日志文件失败:', error)
    }
  }

  /**
   * 获取当前日志文件路径（按日期命名）
   */
  private getCurrentLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    return path.join(this.logDir, `app-${date}.log`)
  }

  /**
   * 轮转日志文件（当文件超过大小限制时）
   */
  private rotateLogFile(logFilePath: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const ext = path.extname(logFilePath)
    const base = path.basename(logFilePath, ext)
    const rotatedPath = path.join(
      this.logDir,
      `${base}-${timestamp}${ext}`
    )

    try {
      fs.renameSync(logFilePath, rotatedPath)
    } catch (error) {
      console.error('[Logger] 日志文件轮转失败:', error)
    }
  }

  /**
   * 清理过期日志文件（超过 30 天）
   */
  private cleanOldLogs(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        return
      }

      const now = Date.now()
      const maxAgeMs = this.maxAge * 24 * 60 * 60 * 1000

      const files = fs.readdirSync(this.logDir)
      
      for (const file of files) {
        if (!file.endsWith('.log')) {
          continue
        }

        const filePath = path.join(this.logDir, file)
        const stats = fs.statSync(filePath)
        const age = now - stats.mtimeMs

        if (age > maxAgeMs) {
          fs.unlinkSync(filePath)
          console.log(`[Logger] 已删除过期日志文件: ${file}`)
        }
      }
    } catch (error) {
      console.error('[Logger] 清理过期日志失败:', error)
    }
  }
}

/**
 * 创建 Logger 实例的工厂函数
 * @param module 模块名称
 * @returns Logger 实例
 */
export function createLogger(module: string): Logger {
  return new Logger(module)
}
