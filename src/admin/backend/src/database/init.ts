/**
 * 数据库初始化脚本
 * 创建所有表结构并初始化数据库连接
 * 
 * 使用 sql.js（纯 JavaScript SQLite 实现）
 * 需求: 1.6 - 使用 SQLite 作为数据库，减少内存占用
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { databaseConfig } from '../config/database'
import { hashPasswordSync } from '../utils/crypto'

// 导入后端数据源
import { profileData, projectsData, skillTreeData } from '../data/profile'
import type { SkillTreeNode as FrontendSkillTreeNode } from '../data/types'

// 数据库实例（单例模式）
let db: SqlJsDatabase | null = null
let dbPath: string = ''

/**
 * 获取数据库实例
 * 使用单例模式确保整个应用只有一个数据库连接
 */
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()')
  }
  return db
}

/**
 * 检查数据库是否已初始化
 */
export function isDatabaseInitialized(): boolean {
  return db !== null
}

/**
 * 保存数据库到文件
 * sql.js 是内存数据库，需要手动保存到文件
 */
export function saveDatabase(): void {
  if (!db || dbPath === ':memory:') {
    return
  }
  
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
    console.log('✓ 数据库已保存到文件')
  } catch (error) {
    console.error('保存数据库失败:', error)
    throw error
  }
}

/**
 * 创建用户表
 * 存储管理员账户信息
 */
function createUsersTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME
    )
  `)
  if (!silent) {
    console.log('✓ 用户表 (users) 创建成功')
  }
}

/**
 * 创建访问记录表
 * 存储网站访问统计数据
 */
function createVisitsTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      device_type TEXT,
      browser TEXT,
      referrer TEXT,
      session_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // 创建索引以优化查询性能
  database.run(`CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_visits_page ON visits(page)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_visits_session_id ON visits(session_id)`)
  if (!silent) {
    console.log('✓ 访问记录表 (visits) 创建成功')
  }
}

/**
 * 创建留言表
 * 存储访客留言信息
 */
function createMessagesTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      contact TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME
    )
  `)
  
  // 创建索引
  database.run(`CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)`)
  database.run(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`)
  if (!silent) {
    console.log('✓ 留言表 (messages) 创建成功')
  }
}

/**
 * 创建个人信息表（单行表）
 * 存储网站管理员的个人信息
 */
function createProfileTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      avatar TEXT,
      summary TEXT,
      job_intentions TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!silent) {
    console.log('✓ 个人信息表 (profile) 创建成功')
  }
}

/**
 * 创建教育经历表
 * 存储教育背景信息
 */
function createEducationTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS education (
      id TEXT PRIMARY KEY,
      school TEXT NOT NULL,
      college TEXT,
      major TEXT NOT NULL,
      period TEXT NOT NULL,
      rank TEXT,
      honors TEXT,
      courses TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!silent) {
    console.log('✓ 教育经历表 (education) 创建成功')
  }
}

/**
 * 创建工作经历表
 * 存储工作经验信息
 */
function createExperienceTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS experience (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      period TEXT NOT NULL,
      responsibilities TEXT,
      achievements TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!silent) {
    console.log('✓ 工作经历表 (experience) 创建成功')
  }
}

/**
 * 创建技能表
 * 存储技能信息
 */
function createSkillsTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      level INTEGER NOT NULL CHECK (level >= 0 AND level <= 100),
      category TEXT NOT NULL,
      experience TEXT,
      projects TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // 创建分类索引
  database.run(`CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)`)
  if (!silent) {
    console.log('✓ 技能表 (skills) 创建成功')
  }
}

/**
 * 创建技能树表
 * 存储技能树结构数据
 */
function createSkillTreeTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS skill_tree (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      experience TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES skill_tree(id) ON DELETE CASCADE
    )
  `)
  if (!silent) {
    console.log('✓ 技能树表 (skill_tree) 创建成功')
  }
}

/**
 * 创建项目表
 * 存储项目作品信息
 */
function createProjectsTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      period TEXT,
      role TEXT,
      technologies TEXT,
      highlights TEXT,
      screenshots TEXT,
      demo_url TEXT,
      source_url TEXT,
      category TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // 创建分类索引
  database.run(`CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category)`)
  if (!silent) {
    console.log('✓ 项目表 (projects) 创建成功')
  }
}

/**
 * 创建校园经历表
 * 存储校园活动和组织经历
 */
function createCampusExperienceTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS campus_experience (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization TEXT NOT NULL,
      position TEXT NOT NULL,
      period TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!silent) {
    console.log('✓ 校园经历表 (campus_experience) 创建成功')
  }
}

/**
 * 创建简历版本表
 * 存储简历文件版本历史
 */
function createResumeVersionsTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS resume_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      is_active INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!silent) {
    console.log('✓ 简历版本表 (resume_versions) 创建成功')
  }
}

/**
 * 创建游戏排行榜表
 * 存储彩蛋游戏排行榜数据
 */
function createGameLeaderboardTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS game_leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      stage INTEGER,
      play_time INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // 创建分数降序索引
  database.run(`CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON game_leaderboard(score DESC)`)
  if (!silent) {
    console.log('✓ 游戏排行榜表 (game_leaderboard) 创建成功')
  }
}

/**
 * 创建游戏成就表
 * 存储游戏成就配置
 */
function createGameAchievementsTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS game_achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      condition_type TEXT NOT NULL,
      condition_value INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!silent) {
    console.log('✓ 游戏成就表 (game_achievements) 创建成功')
  }
}

/**
 * 创建游戏配置表（单行表）
 * 存储游戏参数配置
 */
function createGameConfigTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS game_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER DEFAULT 1,
      debug_mode INTEGER DEFAULT 0,
      config_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!silent) {
    console.log('✓ 游戏配置表 (game_config) 创建成功')
  }
}

/**
 * 创建 SEO 配置表（单行表）
 * 存储网站 SEO 相关配置
 */
function createSeoConfigTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS seo_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      page_meta TEXT,
      schemas TEXT,
      sitemap_config TEXT,
      robots_txt TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!silent) {
    console.log('✓ SEO 配置表 (seo_config) 创建成功')
  }
}

/**
 * 创建统计数据表（单行表）
 * 存储网站统计数据
 */
function createStatisticsTable(database: SqlJsDatabase, silent?: boolean): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS statistics (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      resume_downloads INTEGER DEFAULT 0,
      game_triggers INTEGER DEFAULT 0,
      game_completions INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  if (!silent) {
    console.log('✓ 统计数据表 (statistics) 创建成功')
  }
}


/**
 * 创建所有数据库表
 * 按照依赖顺序创建表结构
 */
function createAllTables(database: SqlJsDatabase, silent?: boolean): void {
  if (!silent) {
    console.log('\n开始创建数据库表结构...\n')
  }
  
  // 启用外键约束
  database.run('PRAGMA foreign_keys = ON')
  
  // 用户和认证相关
  createUsersTable(database, silent)
  
  // 访问统计相关
  createVisitsTable(database, silent)
  
  // 留言相关
  createMessagesTable(database, silent)
  
  // 内容管理相关
  createProfileTable(database, silent)
  createEducationTable(database, silent)
  createExperienceTable(database, silent)
  createSkillsTable(database, silent)
  createSkillTreeTable(database, silent)
  createProjectsTable(database, silent)
  createCampusExperienceTable(database, silent)
  
  // 文件管理相关
  createResumeVersionsTable(database, silent)
  
  // 游戏相关
  createGameLeaderboardTable(database, silent)
  createGameAchievementsTable(database, silent)
  createGameConfigTable(database, silent)
  
  // SEO 和统计相关
  createSeoConfigTable(database, silent)
  createStatisticsTable(database, silent)
  
  if (!silent) {
    console.log('\n✓ 所有数据库表创建完成！\n')
  }
}

/**
 * 获取默认游戏配置 JSON
 */
function getDefaultGameConfig(): string {
  return JSON.stringify({
    basic: {
      playerInitialHealth: 10,
      playerInitialSpeed: 5,
      nukeMaxProgress: 100,
      enemySpawnRate: 3000,
      stageTotalEnemies: 50
    },
    advanced: {
      scene: {
        canvasWidth: 800,
        canvasHeight: 600,
        scaleMultiplier: 1.5,
        pixelBlockSize: 8
      },
      player: {
        moveDistance: 8,
        moveInterval: 100,
        collisionWidth: 96,
        collisionHeight: 64,
        initialMachineGun: {
          bulletsPerShot: 1,
          trajectories: 1,
          fireRate: 3000,
          bulletDamage: 2,
          bulletSpeed: 20
        },
        initialMissileLauncher: {
          missileCount: 10,
          missileDamage: 5,
          missileSpeed: 12,
          explosionRadius: 3
        }
      },
      movement: {
        enemyMoveInterval: 500,
        enemyDownInterval: 500,
        pickupMoveSpeed: 2
      },
      shooting: {
        playerGunCooldown: 200,
        enemyGunCooldown: 1000,
        bulletSpeed: 0.08,
        bulletMoveInterval: 50,
        missileSpeed: 0.053,
        missileMoveInterval: 80
      },
      effects: {
        explosionDuration: 500,
        explosionFrames: 8,
        screenShakeDuration: 300,
        screenShakeIntensityMin: 2,
        screenShakeIntensityMax: 4
      },
      audio: {
        musicVolume: 0.5,
        effectVolume: 0.7,
        maxConcurrentSounds: 10,
        audioPoolSize: 5
      },
      performance: {
        targetFPS: 60,
        maxMemoryMB: 100,
        memoryCheckInterval: 5000,
        cacheCleanupThreshold: 0.9
      }
    }
  })
}

/**
 * 默认管理员账户配置
 * 需求: 1.1 - 提供用户登录认证功能，支持用户名密码登录
 */
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123'
}

/**
 * 初始化单行表的默认数据
 * 为 profile、game_config、seo_config、statistics 表插入默认记录
 * 同时创建默认管理员账户
 */
function initializeSingletonTables(database: SqlJsDatabase, silent?: boolean): void {
  if (!silent) {
    console.log('初始化单行表默认数据...\n')
  }
  
  // 辅助函数：安全获取计数
  const getCount = (result: ReturnType<SqlJsDatabase['exec']>): number => {
    const firstResult = result[0]
    if (result.length > 0 && firstResult && firstResult.values) {
      const firstRow = firstResult.values[0]
      if (firstRow && firstRow[0] !== undefined) {
        return firstRow[0] as number
      }
    }
    return 0
  }
  
  // 检查并初始化默认管理员账户
  // 需求: 1.1 - 如果 users 表为空，则插入默认管理员
  const usersResult = database.exec('SELECT COUNT(*) as count FROM users')
  const usersCount = getCount(usersResult)
  if (usersCount === 0) {
    // 使用 bcryptjs 加密默认密码
    const passwordHash = hashPasswordSync(DEFAULT_ADMIN.password)
    database.run(`
      INSERT INTO users (username, password_hash)
      VALUES (?, ?)
    `, [DEFAULT_ADMIN.username, passwordHash])
    if (!silent) {
      console.log(`✓ 默认管理员账户已创建 (用户名: ${DEFAULT_ADMIN.username})`)
    }
  }
  
  // 检查并初始化 profile 表
  const profileResult = database.exec('SELECT COUNT(*) as count FROM profile')
  const profileCount = getCount(profileResult)
  if (profileCount === 0) {
    database.run(`
      INSERT INTO profile (id, name, title, job_intentions)
      VALUES (1, '待设置', '待设置', '[]')
    `)
    if (!silent) {
      console.log('✓ 个人信息表默认数据已初始化')
    }
  }
  
  // 检查并初始化 game_config 表
  const gameConfigResult = database.exec('SELECT COUNT(*) as count FROM game_config')
  const gameConfigCount = getCount(gameConfigResult)
  if (gameConfigCount === 0) {
    const defaultGameConfig = getDefaultGameConfig()
    database.run(`
      INSERT INTO game_config (id, enabled, debug_mode, config_json)
      VALUES (1, 1, 0, ?)
    `, [defaultGameConfig])
    if (!silent) {
      console.log('✓ 游戏配置表默认数据已初始化')
    }
  }
  
  // 检查并初始化 seo_config 表
  const seoConfigResult = database.exec('SELECT COUNT(*) as count FROM seo_config')
  const seoConfigCount = getCount(seoConfigResult)
  if (seoConfigCount === 0) {
    database.run(`
      INSERT INTO seo_config (id, page_meta, schemas, sitemap_config, robots_txt)
      VALUES (1, '{}', '{}', '{}', 'User-agent: *\nAllow: /')
    `)
    if (!silent) {
      console.log('✓ SEO 配置表默认数据已初始化')
    }
  }
  
  // 检查并初始化 statistics 表
  const statisticsResult = database.exec('SELECT COUNT(*) as count FROM statistics')
  const statisticsCount = getCount(statisticsResult)
  if (statisticsCount === 0) {
    database.run(`
      INSERT INTO statistics (id, resume_downloads, game_triggers, game_completions)
      VALUES (1, 0, 0, 0)
    `)
    if (!silent) {
      console.log('✓ 统计数据表默认数据已初始化')
    }
  }
  
  if (!silent) {
    console.log('\n✓ 单行表默认数据初始化完成！\n')
  }
}

/**
 * 初始化数据库
 * 创建数据库连接、设置配置、创建表结构
 * 
 * @param customPath - 可选的自定义数据库路径（用于测试）
 * @param silent - 是否抑制日志输出（用于测试）
 * @returns Promise<SqlJsDatabase> 数据库实例
 */
export async function initDatabase(customPath?: string, silent?: boolean): Promise<SqlJsDatabase> {
  dbPath = customPath || databaseConfig.path
  
  if (!silent) {
    console.log('========================================')
    console.log('       后台管理系统数据库初始化')
    console.log('========================================')
    console.log(`数据库路径: ${dbPath}`)
    console.log(`外键约束: ${databaseConfig.foreignKeys ? '启用' : '禁用'}`)
    console.log('========================================\n')
  }
  
  try {
    // 初始化 sql.js
    const SQL = await initSqlJs()
    
    // 检查是否存在现有数据库文件
    let existingData: Buffer | undefined
    if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
      existingData = fs.readFileSync(dbPath)
      if (!silent) {
        console.log('✓ 加载现有数据库文件')
      }
    } else if (dbPath !== ':memory:') {
      // 确保数据目录存在
      const dataDir = path.dirname(dbPath)
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
        if (!silent) {
          console.log(`✓ 数据目录已创建: ${dataDir}`)
        }
      }
    }
    
    // 创建数据库实例
    db = existingData ? new SQL.Database(existingData) : new SQL.Database()
    
    // 创建所有表
    createAllTables(db, silent)
    
    // 初始化单行表默认数据
    initializeSingletonTables(db, silent)
    
    // 保存数据库到文件
    if (!silent) {
      saveDatabase()
    }
    
    if (!silent) {
      console.log('========================================')
      console.log('       数据库初始化成功！')
      console.log('========================================\n')
    }
    
    return db
  } catch (error) {
    if (!silent) {
      console.error('数据库初始化失败:', error)
    }
    throw error
  }
}

/**
 * 关闭数据库连接
 * 在应用退出时调用
 * 
 * @param silent - 是否抑制日志输出（用于测试）
 */
export function closeDatabase(silent?: boolean): void {
  if (db) {
    // 保存数据库到文件
    saveDatabase()
    db.close()
    db = null
    if (!silent) {
      console.log('数据库连接已关闭')
    }
  }
}

/**
 * 重置数据库（仅用于测试）
 * 删除所有表并重新创建
 */
export function resetDatabase(): void {
  if (!db) {
    throw new Error('数据库未初始化')
  }
  
  console.log('重置数据库...')
  
  // 获取所有表名
  const tablesResult = db.exec(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `)
  
  const firstResult = tablesResult[0]
  if (tablesResult.length > 0 && firstResult && firstResult.values) {
    const tables = firstResult.values.map(row => row[0] as string)
    
    // 禁用外键约束以便删除表
    db.run('PRAGMA foreign_keys = OFF')
    
    // 删除所有表
    for (const table of tables) {
      db.run(`DROP TABLE IF EXISTS ${table}`)
    }
    
    // 重新启用外键约束
    db.run('PRAGMA foreign_keys = ON')
  }
  
  // 重新创建所有表
  createAllTables(db)
  initializeSingletonTables(db)
  
  // 保存数据库
  saveDatabase()
  
  console.log('数据库重置完成')
}

// 导出数据库实例
export { db }

/**
 * 初始化默认内容数据
 * 将 profile.ts 中的现有数据自动导入到数据库中
 * 
 * @param silent - 是否抑制日志输出
 * @returns Promise<void>
 */
export async function initializeDefaultContent(silent?: boolean): Promise<void> {
  const database = getDatabase()
  
  if (!silent) {
    console.log('\n========================================')
    console.log('       导入默认内容数据')
    console.log('========================================\n')
  }
  
  try {
    // 1. 导入个人信息（Profile）
    await importProfile(database, silent)
    
    // 2. 导入教育经历（Education）
    await importEducation(database, silent)
    
    // 3. 导入工作经历（Experience）
    await importExperience(database, silent)
    
    // 4. 导入技能（Skills）
    await importSkills(database, silent)
    
    // 5. 导入技能树（Skill Tree）
    await importSkillTree(database, silent)
    
    // 6. 导入项目（Projects）
    await importProjects(database, silent)
    
    // 7. 导入校园经历（Campus Experience）
    await importCampusExperience(database, silent)
    
    // 保存数据库
    saveDatabase()
    
    if (!silent) {
      console.log('\n========================================')
      console.log('       默认内容数据导入完成！')
      console.log('========================================\n')
    }
  } catch (error) {
    console.error('导入默认内容数据失败:', error)
    throw error
  }
}

/**
 * 导入个人信息
 */
function importProfile(database: SqlJsDatabase, silent?: boolean): void {
  // 检查是否已有数据（非默认数据）
  const result = database.exec('SELECT name FROM profile WHERE id = 1')
  const firstResult = result[0]
  if (result.length > 0 && firstResult?.values?.[0]?.[0] !== '待设置') {
    if (!silent) {
      console.log('⏭ 个人信息已存在，跳过导入')
    }
    return
  }
  
  const { name, title, phone, email, avatar, summary, jobIntentions } = profileData
  
  database.run(`
    UPDATE profile SET
      name = ?,
      title = ?,
      phone = ?,
      email = ?,
      avatar = ?,
      summary = ?,
      job_intentions = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [
    name,
    title,
    phone,
    email,
    avatar,
    summary,
    JSON.stringify(jobIntentions)
  ])
  
  if (!silent) {
    console.log('✓ 个人信息导入成功')
  }
}

/**
 * 导入教育经历
 */
function importEducation(database: SqlJsDatabase, silent?: boolean): void {
  // 检查是否已有数据
  const result = database.exec('SELECT COUNT(*) as count FROM education')
  const count = result[0]?.values?.[0]?.[0] as number || 0
  if (count > 0) {
    if (!silent) {
      console.log('⏭ 教育经历已存在，跳过导入')
    }
    return
  }
  
  profileData.education.forEach((edu, index) => {
    database.run(`
      INSERT INTO education (id, school, college, major, period, rank, honors, courses, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      edu.id,
      edu.school,
      edu.college,
      edu.major,
      edu.period,
      edu.rank,
      JSON.stringify(edu.honors),
      JSON.stringify(edu.courses),
      index
    ])
  })
  
  if (!silent) {
    console.log(`✓ 教育经历导入成功 (${profileData.education.length} 条记录)`)
  }
}

/**
 * 导入工作经历
 */
function importExperience(database: SqlJsDatabase, silent?: boolean): void {
  // 检查是否已有数据
  const result = database.exec('SELECT COUNT(*) as count FROM experience')
  const count = result[0]?.values?.[0]?.[0] as number || 0
  if (count > 0) {
    if (!silent) {
      console.log('⏭ 工作经历已存在，跳过导入')
    }
    return
  }
  
  profileData.experience.forEach((exp, index) => {
    database.run(`
      INSERT INTO experience (id, company, position, period, responsibilities, achievements, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      exp.id,
      exp.company,
      exp.position,
      exp.period,
      JSON.stringify(exp.responsibilities),
      JSON.stringify(exp.achievements || []),
      index
    ])
  })
  
  if (!silent) {
    console.log(`✓ 工作经历导入成功 (${profileData.experience.length} 条记录)`)
  }
}

/**
 * 导入技能
 */
function importSkills(database: SqlJsDatabase, silent?: boolean): void {
  // 检查是否已有数据
  const result = database.exec('SELECT COUNT(*) as count FROM skills')
  const count = result[0]?.values?.[0]?.[0] as number || 0
  if (count > 0) {
    if (!silent) {
      console.log('⏭ 技能数据已存在，跳过导入')
    }
    return
  }
  
  profileData.skills.forEach((skill, index) => {
    database.run(`
      INSERT INTO skills (name, level, category, experience, projects, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      skill.name,
      skill.level,
      skill.category,
      skill.experience,
      JSON.stringify(skill.projects),
      index
    ])
  })
  
  if (!silent) {
    console.log(`✓ 技能数据导入成功 (${profileData.skills.length} 条记录)`)
  }
}

/**
 * 递归导入技能树节点
 */
function insertSkillTreeNode(
  database: SqlJsDatabase,
  node: FrontendSkillTreeNode,
  parentId: string | null,
  sortOrder: number
): void {
  database.run(`
    INSERT OR REPLACE INTO skill_tree (id, parent_id, name, level, experience, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    node.id,
    parentId,
    node.name,
    node.level,
    node.experience || null,
    sortOrder
  ])
  
  // 递归插入子节点
  if (node.children && node.children.length > 0) {
    node.children.forEach((child, index) => {
      insertSkillTreeNode(database, child, node.id, index)
    })
  }
}

/**
 * 导入技能树
 */
function importSkillTree(database: SqlJsDatabase, silent?: boolean): void {
  // 检查是否已有数据
  const result = database.exec('SELECT COUNT(*) as count FROM skill_tree')
  const count = result[0]?.values?.[0]?.[0] as number || 0
  if (count > 0) {
    if (!silent) {
      console.log('⏭ 技能树数据已存在，跳过导入')
    }
    return
  }
  
  // 递归插入技能树
  insertSkillTreeNode(database, skillTreeData, null, 0)
  
  // 统计插入的节点数
  const countResult = database.exec('SELECT COUNT(*) as count FROM skill_tree')
  const totalCount = countResult[0]?.values?.[0]?.[0] as number || 0
  
  if (!silent) {
    console.log(`✓ 技能树数据导入成功 (${totalCount} 个节点)`)
  }
}

/**
 * 导入项目
 */
function importProjects(database: SqlJsDatabase, silent?: boolean): void {
  // 检查是否已有数据
  const result = database.exec('SELECT COUNT(*) as count FROM projects')
  const count = result[0]?.values?.[0]?.[0] as number || 0
  if (count > 0) {
    if (!silent) {
      console.log('⏭ 项目数据已存在，跳过导入')
    }
    return
  }
  
  projectsData.forEach((project, index) => {
    database.run(`
      INSERT INTO projects (
        id, name, description, period, role, technologies,
        highlights, screenshots, demo_url, source_url, category, sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      project.id,
      project.name,
      project.description,
      project.period,
      project.role,
      JSON.stringify(project.technologies),
      JSON.stringify(project.highlights),
      JSON.stringify(project.screenshots),
      project.demoUrl || null,
      project.sourceUrl || null,
      project.category,
      index
    ])
  })
  
  if (!silent) {
    console.log(`✓ 项目数据导入成功 (${projectsData.length} 条记录)`)
  }
}

/**
 * 导入校园经历
 */
function importCampusExperience(database: SqlJsDatabase, silent?: boolean): void {
  // 检查是否已有数据
  const result = database.exec('SELECT COUNT(*) as count FROM campus_experience')
  const count = result[0]?.values?.[0]?.[0] as number || 0
  if (count > 0) {
    if (!silent) {
      console.log('⏭ 校园经历已存在，跳过导入')
    }
    return
  }
  
  profileData.campusExperience.forEach((exp, index) => {
    database.run(`
      INSERT INTO campus_experience (organization, position, period, sort_order)
      VALUES (?, ?, ?, ?)
    `, [
      exp.organization,
      exp.position,
      exp.period,
      index
    ])
  })
  
  if (!silent) {
    console.log(`✓ 校园经历导入成功 (${profileData.campusExperience.length} 条记录)`)
  }
}

// 如果直接运行此脚本，则初始化数据库并导入默认内容
if (require.main === module) {
  initDatabase()
    .then(() => initializeDefaultContent())
    .catch(console.error)
}
