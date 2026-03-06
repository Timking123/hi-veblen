/**
 * 游戏服务模块
 * 提供游戏管理相关的操作功能
 * 
 * 需求: 6.1.1-6.6.4
 * - 排行榜管理（查询、删除、重置）
 * - 成就 CRUD
 * - 游戏配置读写、恢复默认、导入导出
 * - 游戏开关和调试模式开关
 */

import { getDatabase, saveDatabase, isDatabaseInitialized } from '../database/init'
import {
  LeaderboardEntry,
  LeaderboardRow,
  Achievement,
  AchievementRow,
  AchievementInput,
  GameConfig,
  GameConfigRecord,
  GameConfigRow,
  DEFAULT_GAME_CONFIG,
  parseLeaderboardRow,
  parseAchievementRow,
  parseGameConfigRow,
  validateAchievementInput,
  serializeGameConfig,
  deserializeGameConfig,
  cloneGameConfig
} from '../models/game'

// ========== 排行榜管理 ==========

/**
 * 获取排行榜列表（按分数降序）
 * 
 * 需求: 6.1.1 - 显示游戏排行榜数据（排名、玩家名、分数、时间）
 * 
 * @param limit - 返回数量限制，默认 100
 * @returns 排行榜条目列表
 */
export function getLeaderboard(limit: number = 100): LeaderboardEntry[] {
  if (!isDatabaseInitialized()) {
    return []
  }

  try {
    const db = getDatabase()
    const result = db.exec(`
      SELECT id, player_name, score, stage, play_time, created_at
      FROM game_leaderboard
      ORDER BY score DESC, created_at ASC
      LIMIT ?
    `, [limit])

    if (result.length === 0 || !result[0]?.values) {
      return []
    }

    return result[0].values.map(row => {
      const leaderboardRow: LeaderboardRow = {
        id: row[0] as number,
        player_name: row[1] as string,
        score: row[2] as number,
        stage: row[3] as number | null,
        play_time: row[4] as number | null,
        created_at: row[5] as string
      }
      return parseLeaderboardRow(leaderboardRow)
    })
  } catch (error) {
    console.error('获取排行榜失败:', error)
    return []
  }
}


/**
 * 获取单个排行榜条目
 * 
 * @param id - 排行榜条目 ID
 * @returns 排行榜条目或 null
 */
export function getLeaderboardEntry(id: number): LeaderboardEntry | null {
  if (!isDatabaseInitialized()) {
    return null
  }

  try {
    const db = getDatabase()
    const result = db.exec(`
      SELECT id, player_name, score, stage, play_time, created_at
      FROM game_leaderboard
      WHERE id = ?
    `, [id])

    if (result.length === 0 || !result[0]?.values?.[0]) {
      return null
    }

    const row = result[0].values[0]
    const leaderboardRow: LeaderboardRow = {
      id: row[0] as number,
      player_name: row[1] as string,
      score: row[2] as number,
      stage: row[3] as number | null,
      play_time: row[4] as number | null,
      created_at: row[5] as string
    }
    return parseLeaderboardRow(leaderboardRow)
  } catch (error) {
    console.error('获取排行榜条目失败:', error)
    return null
  }
}

/**
 * 删除单条排行榜记录
 * 
 * 需求: 6.1.2 - 提供删除异常记录功能
 * 
 * @param id - 排行榜条目 ID
 * @returns 是否删除成功
 */
export function deleteLeaderboardEntry(id: number): boolean {
  if (!isDatabaseInitialized()) {
    return false
  }

  try {
    const db = getDatabase()
    
    // 检查记录是否存在
    const checkResult = db.exec(
      'SELECT id FROM game_leaderboard WHERE id = ?',
      [id]
    )
    
    if (checkResult.length === 0 || !checkResult[0]?.values?.length) {
      return false
    }

    db.run('DELETE FROM game_leaderboard WHERE id = ?', [id])
    saveDatabase()
    return true
  } catch (error) {
    console.error('删除排行榜记录失败:', error)
    return false
  }
}

/**
 * 重置排行榜（清空所有记录）
 * 
 * 需求: 6.1.3 - 提供重置排行榜功能（需二次确认）
 * 
 * @returns 删除的记录数量
 */
export function resetLeaderboard(): number {
  if (!isDatabaseInitialized()) {
    return 0
  }

  try {
    const db = getDatabase()
    
    // 获取当前记录数
    const countResult = db.exec('SELECT COUNT(*) FROM game_leaderboard')
    const count = countResult.length > 0 && countResult[0]?.values?.[0]
      ? (countResult[0].values[0][0] as number)
      : 0

    // 清空排行榜
    db.run('DELETE FROM game_leaderboard')
    saveDatabase()
    
    return count
  } catch (error) {
    console.error('重置排行榜失败:', error)
    return 0
  }
}

/**
 * 获取排行榜统计数据
 * 
 * @returns 统计数据
 */
export function getLeaderboardStats(): {
  totalEntries: number
  highestScore: number
  averageScore: number
  latestEntry: string | null
} {
  if (!isDatabaseInitialized()) {
    return {
      totalEntries: 0,
      highestScore: 0,
      averageScore: 0,
      latestEntry: null
    }
  }

  try {
    const db = getDatabase()
    const result = db.exec(`
      SELECT 
        COUNT(*) as total,
        MAX(score) as highest,
        AVG(score) as average,
        MAX(created_at) as latest
      FROM game_leaderboard
    `)

    if (result.length === 0 || !result[0]?.values?.[0]) {
      return {
        totalEntries: 0,
        highestScore: 0,
        averageScore: 0,
        latestEntry: null
      }
    }

    const row = result[0].values[0]
    return {
      totalEntries: (row[0] as number) || 0,
      highestScore: (row[1] as number) || 0,
      averageScore: Math.round((row[2] as number) || 0),
      latestEntry: row[3] as string | null
    }
  } catch (error) {
    console.error('获取排行榜统计失败:', error)
    return {
      totalEntries: 0,
      highestScore: 0,
      averageScore: 0,
      latestEntry: null
    }
  }
}

// ========== 成就管理 ==========

/**
 * 获取所有成就
 * 
 * 需求: 6.2.1 - 显示成就列表（名称、描述、条件、图标）
 * 
 * @returns 成就列表
 */
export function getAchievements(): Achievement[] {
  if (!isDatabaseInitialized()) {
    return []
  }

  try {
    const db = getDatabase()
    const result = db.exec(`
      SELECT id, name, description, icon, condition_type, condition_value, sort_order, created_at, updated_at
      FROM game_achievements
      ORDER BY sort_order ASC, created_at ASC
    `)

    if (result.length === 0 || !result[0]?.values) {
      return []
    }

    return result[0].values.map(row => {
      const achievementRow: AchievementRow = {
        id: row[0] as string,
        name: row[1] as string,
        description: row[2] as string | null,
        icon: row[3] as string | null,
        condition_type: row[4] as string,
        condition_value: row[5] as number,
        sort_order: row[6] as number,
        created_at: row[7] as string,
        updated_at: row[8] as string
      }
      return parseAchievementRow(achievementRow)
    })
  } catch (error) {
    console.error('获取成就列表失败:', error)
    return []
  }
}

/**
 * 获取单个成就
 * 
 * @param id - 成就 ID
 * @returns 成就或 null
 */
export function getAchievementById(id: string): Achievement | null {
  if (!isDatabaseInitialized()) {
    return null
  }

  try {
    const db = getDatabase()
    const result = db.exec(`
      SELECT id, name, description, icon, condition_type, condition_value, sort_order, created_at, updated_at
      FROM game_achievements
      WHERE id = ?
    `, [id])

    if (result.length === 0 || !result[0]?.values?.[0]) {
      return null
    }

    const row = result[0].values[0]
    const achievementRow: AchievementRow = {
      id: row[0] as string,
      name: row[1] as string,
      description: row[2] as string | null,
      icon: row[3] as string | null,
      condition_type: row[4] as string,
      condition_value: row[5] as number,
      sort_order: row[6] as number,
      created_at: row[7] as string,
      updated_at: row[8] as string
    }
    return parseAchievementRow(achievementRow)
  } catch (error) {
    console.error('获取成就失败:', error)
    return null
  }
}

/**
 * 创建成就
 * 
 * 需求: 6.2.2 - 提供成就 CRUD 操作
 * 需求: 6.2.3 - 提供成就条件配置（类型、目标值）
 * 
 * @param input - 成就输入数据
 * @returns 创建结果
 */
export function createAchievement(input: AchievementInput): {
  success: boolean
  achievement?: Achievement
  errors?: string[]
} {
  // 验证输入
  const validation = validateAchievementInput(input)
  if (!validation.valid) {
    return { success: false, errors: validation.errors }
  }

  if (!isDatabaseInitialized()) {
    return { success: false, errors: ['数据库未初始化'] }
  }

  try {
    const db = getDatabase()

    // 检查 ID 是否已存在
    const existingResult = db.exec(
      'SELECT id FROM game_achievements WHERE id = ?',
      [input.id]
    )
    
    if (existingResult.length > 0 && existingResult[0]?.values?.length) {
      return { success: false, errors: ['成就 ID 已存在'] }
    }

    // 获取最大排序顺序
    const maxSortResult = db.exec('SELECT MAX(sort_order) FROM game_achievements')
    const maxSort = maxSortResult.length > 0 && maxSortResult[0]?.values?.[0]
      ? (maxSortResult[0].values[0][0] as number) || 0
      : 0
    
    const sortOrder = input.sort_order ?? maxSort + 1
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    db.run(`
      INSERT INTO game_achievements (id, name, description, icon, condition_type, condition_value, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      input.id,
      input.name.trim(),
      input.description?.trim() || null,
      input.icon || null,
      input.condition_type,
      input.condition_value,
      sortOrder,
      now,
      now
    ])

    saveDatabase()

    // 返回创建的成就
    const achievement = getAchievementById(input.id)
    return { success: true, achievement: achievement || undefined }
  } catch (error) {
    console.error('创建成就失败:', error)
    return { success: false, errors: ['创建成就失败'] }
  }
}

/**
 * 更新成就
 * 
 * 需求: 6.2.2 - 提供成就 CRUD 操作
 * 
 * @param id - 成就 ID
 * @param input - 更新数据
 * @returns 更新结果
 */
export function updateAchievement(
  id: string,
  input: Partial<Omit<AchievementInput, 'id'>>
): {
  success: boolean
  achievement?: Achievement
  errors?: string[]
} {
  if (!isDatabaseInitialized()) {
    return { success: false, errors: ['数据库未初始化'] }
  }

  try {
    const db = getDatabase()

    // 检查成就是否存在
    const existing = getAchievementById(id)
    if (!existing) {
      return { success: false, errors: ['成就不存在'] }
    }

    // 构建更新数据
    const updates: string[] = []
    const params: (string | number | null)[] = []

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        return { success: false, errors: ['成就名称不能为空'] }
      }
      updates.push('name = ?')
      params.push(input.name.trim())
    }

    if (input.description !== undefined) {
      updates.push('description = ?')
      params.push(input.description?.trim() || null)
    }

    if (input.icon !== undefined) {
      updates.push('icon = ?')
      params.push(input.icon || null)
    }

    if (input.condition_type !== undefined) {
      updates.push('condition_type = ?')
      params.push(input.condition_type)
    }

    if (input.condition_value !== undefined) {
      if (!Number.isInteger(input.condition_value) || input.condition_value <= 0) {
        return { success: false, errors: ['成就条件值必须是正整数'] }
      }
      updates.push('condition_value = ?')
      params.push(input.condition_value)
    }

    if (input.sort_order !== undefined) {
      updates.push('sort_order = ?')
      params.push(input.sort_order)
    }

    if (updates.length === 0) {
      return { success: true, achievement: existing }
    }

    // 更新时间
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    updates.push('updated_at = ?')
    params.push(now)

    // 添加 WHERE 条件参数
    params.push(id)

    db.run(`
      UPDATE game_achievements
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params)

    saveDatabase()

    // 返回更新后的成就
    const achievement = getAchievementById(id)
    return { success: true, achievement: achievement || undefined }
  } catch (error) {
    console.error('更新成就失败:', error)
    return { success: false, errors: ['更新成就失败'] }
  }
}

/**
 * 删除成就
 * 
 * 需求: 6.2.2 - 提供成就 CRUD 操作
 * 
 * @param id - 成就 ID
 * @returns 是否删除成功
 */
export function deleteAchievement(id: string): boolean {
  if (!isDatabaseInitialized()) {
    return false
  }

  try {
    const db = getDatabase()

    // 检查成就是否存在
    const checkResult = db.exec(
      'SELECT id FROM game_achievements WHERE id = ?',
      [id]
    )
    
    if (checkResult.length === 0 || !checkResult[0]?.values?.length) {
      return false
    }

    db.run('DELETE FROM game_achievements WHERE id = ?', [id])
    saveDatabase()
    return true
  } catch (error) {
    console.error('删除成就失败:', error)
    return false
  }
}


// ========== 游戏配置管理 ==========

/**
 * 获取游戏配置
 * 
 * 需求: 6.4.1-6.6.1 - 游戏参数配置
 * 
 * @returns 游戏配置记录或 null
 */
export function getGameConfig(): GameConfigRecord | null {
  if (!isDatabaseInitialized()) {
    return null
  }

  try {
    const db = getDatabase()
    const result = db.exec(`
      SELECT id, enabled, debug_mode, config_json, updated_at
      FROM game_config
      WHERE id = 1
    `)

    if (result.length === 0 || !result[0]?.values?.[0]) {
      // 如果没有配置记录，创建默认配置
      return initializeGameConfig()
    }

    const row = result[0].values[0]
    const configRow: GameConfigRow = {
      id: row[0] as number,
      enabled: row[1] as number,
      debug_mode: row[2] as number,
      config_json: row[3] as string,
      updated_at: row[4] as string
    }
    return parseGameConfigRow(configRow)
  } catch (error) {
    console.error('获取游戏配置失败:', error)
    return null
  }
}

/**
 * 初始化游戏配置（创建默认配置记录）
 * 
 * @returns 创建的配置记录或 null
 */
function initializeGameConfig(): GameConfigRecord | null {
  if (!isDatabaseInitialized()) {
    return null
  }

  try {
    const db = getDatabase()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const configJson = JSON.stringify(DEFAULT_GAME_CONFIG)

    db.run(`
      INSERT OR REPLACE INTO game_config (id, enabled, debug_mode, config_json, updated_at)
      VALUES (1, 1, 0, ?, ?)
    `, [configJson, now])

    saveDatabase()

    return {
      id: 1,
      enabled: true,
      debug_mode: false,
      config: cloneGameConfig(DEFAULT_GAME_CONFIG),
      updated_at: now
    }
  } catch (error) {
    console.error('初始化游戏配置失败:', error)
    return null
  }
}

/**
 * 更新游戏配置
 * 
 * 需求: 6.4.1-6.6.1 - 游戏参数配置
 * 
 * @param config - 新的游戏配置
 * @returns 更新结果
 */
export function updateGameConfig(config: GameConfig): {
  success: boolean
  config?: GameConfigRecord
  errors?: string[]
} {
  if (!isDatabaseInitialized()) {
    return { success: false, errors: ['数据库未初始化'] }
  }

  try {
    // 验证配置结构
    if (!config || typeof config !== 'object') {
      return { success: false, errors: ['无效的配置格式'] }
    }

    if (!config.basic || typeof config.basic !== 'object') {
      return { success: false, errors: ['缺少基础配置'] }
    }

    if (!config.advanced || typeof config.advanced !== 'object') {
      return { success: false, errors: ['缺少高级配置'] }
    }

    const db = getDatabase()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const configJson = JSON.stringify(config)

    db.run(`
      UPDATE game_config
      SET config_json = ?, updated_at = ?
      WHERE id = 1
    `, [configJson, now])

    saveDatabase()

    // 返回更新后的配置
    const updatedConfig = getGameConfig()
    return { success: true, config: updatedConfig || undefined }
  } catch (error) {
    console.error('更新游戏配置失败:', error)
    return { success: false, errors: ['更新游戏配置失败'] }
  }
}

/**
 * 恢复默认游戏配置
 * 
 * 需求: 6.6.2 - 提供"恢复默认值"按钮
 * 
 * @returns 恢复结果
 */
export function resetGameConfig(): {
  success: boolean
  config?: GameConfigRecord
  errors?: string[]
} {
  if (!isDatabaseInitialized()) {
    return { success: false, errors: ['数据库未初始化'] }
  }

  try {
    const db = getDatabase()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const configJson = JSON.stringify(DEFAULT_GAME_CONFIG)

    db.run(`
      UPDATE game_config
      SET config_json = ?, updated_at = ?
      WHERE id = 1
    `, [configJson, now])

    saveDatabase()

    // 返回重置后的配置
    const config = getGameConfig()
    return { success: true, config: config || undefined }
  } catch (error) {
    console.error('恢复默认配置失败:', error)
    return { success: false, errors: ['恢复默认配置失败'] }
  }
}

/**
 * 设置游戏开关
 * 
 * 需求: 6.3.1 - 提供启用/禁用彩蛋游戏的开关
 * 
 * @param enabled - 是否启用游戏
 * @returns 设置结果
 */
export function setGameEnabled(enabled: boolean): {
  success: boolean
  enabled?: boolean
  errors?: string[]
} {
  if (!isDatabaseInitialized()) {
    return { success: false, errors: ['数据库未初始化'] }
  }

  try {
    const db = getDatabase()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    db.run(`
      UPDATE game_config
      SET enabled = ?, updated_at = ?
      WHERE id = 1
    `, [enabled ? 1 : 0, now])

    saveDatabase()

    return { success: true, enabled }
  } catch (error) {
    console.error('设置游戏开关失败:', error)
    return { success: false, errors: ['设置游戏开关失败'] }
  }
}

/**
 * 设置调试模式
 * 
 * 需求: 6.3.2 - 提供调试模式开关（显示碰撞框、FPS等）
 * 
 * @param enabled - 是否启用调试模式
 * @returns 设置结果
 */
export function setDebugMode(enabled: boolean): {
  success: boolean
  debugMode?: boolean
  errors?: string[]
} {
  if (!isDatabaseInitialized()) {
    return { success: false, errors: ['数据库未初始化'] }
  }

  try {
    const db = getDatabase()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    db.run(`
      UPDATE game_config
      SET debug_mode = ?, updated_at = ?
      WHERE id = 1
    `, [enabled ? 1 : 0, now])

    saveDatabase()

    return { success: true, debugMode: enabled }
  } catch (error) {
    console.error('设置调试模式失败:', error)
    return { success: false, errors: ['设置调试模式失败'] }
  }
}

/**
 * 导出游戏配置（JSON 格式）
 * 
 * 需求: 6.6.4 - 提供参数导出功能（JSON 格式）
 * 
 * @param pretty - 是否格式化输出，默认 true
 * @returns 导出结果
 */
export function exportConfig(pretty: boolean = true): {
  success: boolean
  json?: string
  errors?: string[]
} {
  try {
    const configRecord = getGameConfig()
    if (!configRecord) {
      return { success: false, errors: ['获取游戏配置失败'] }
    }

    const json = serializeGameConfig(configRecord.config, pretty)
    return { success: true, json }
  } catch (error) {
    console.error('导出配置失败:', error)
    return { success: false, errors: ['导出配置失败'] }
  }
}

/**
 * 导入游戏配置（JSON 格式）
 * 
 * 需求: 6.6.4 - 提供参数导入功能（JSON 格式）
 * 
 * @param json - JSON 格式的配置字符串
 * @returns 导入结果
 */
export function importConfig(json: string): {
  success: boolean
  config?: GameConfigRecord
  errors?: string[]
} {
  if (!json || typeof json !== 'string') {
    return { success: false, errors: ['无效的 JSON 字符串'] }
  }

  try {
    // 解析并验证配置
    const config = deserializeGameConfig(json)
    if (!config) {
      return { success: false, errors: ['无效的配置格式或配置验证失败'] }
    }

    // 更新配置
    return updateGameConfig(config)
  } catch (error) {
    console.error('导入配置失败:', error)
    return { success: false, errors: ['导入配置失败，请检查 JSON 格式'] }
  }
}

/**
 * 获取默认游戏配置
 * 
 * 需求: 6.6.3 - 在修改参数时显示与默认值的差异
 * 
 * @returns 默认游戏配置
 */
export function getDefaultGameConfig(): GameConfig {
  return cloneGameConfig(DEFAULT_GAME_CONFIG)
}

// ========== 辅助功能 ==========

/**
 * 添加排行榜记录（供前端游戏调用）
 * 
 * @param playerName - 玩家名称
 * @param score - 分数
 * @param stage - 通关关卡（可选）
 * @param playTime - 游戏时长（可选，秒）
 * @returns 添加结果
 */
export function addLeaderboardEntry(
  playerName: string,
  score: number,
  stage?: number,
  playTime?: number
): {
  success: boolean
  id?: number
  errors?: string[]
} {
  if (!isDatabaseInitialized()) {
    return { success: false, errors: ['数据库未初始化'] }
  }

  // 验证输入
  if (!playerName || playerName.trim().length === 0) {
    return { success: false, errors: ['玩家名称不能为空'] }
  }

  if (playerName.length > 50) {
    return { success: false, errors: ['玩家名称长度不能超过 50 个字符'] }
  }

  if (!Number.isInteger(score) || score < 0) {
    return { success: false, errors: ['分数必须是非负整数'] }
  }

  try {
    const db = getDatabase()
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    db.run(`
      INSERT INTO game_leaderboard (player_name, score, stage, play_time, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      playerName.trim(),
      score,
      stage ?? null,
      playTime ?? null,
      now
    ])

    saveDatabase()

    // 获取插入的 ID
    const idResult = db.exec('SELECT last_insert_rowid() as id')
    const id = idResult.length > 0 && idResult[0]?.values?.[0]
      ? (idResult[0].values[0][0] as number)
      : -1

    return { success: true, id }
  } catch (error) {
    console.error('添加排行榜记录失败:', error)
    return { success: false, errors: ['添加排行榜记录失败'] }
  }
}

/**
 * 检查游戏是否启用
 * 
 * @returns 游戏是否启用
 */
export function isGameEnabled(): boolean {
  const config = getGameConfig()
  return config?.enabled ?? true
}

/**
 * 检查调试模式是否启用
 * 
 * @returns 调试模式是否启用
 */
export function isDebugModeEnabled(): boolean {
  const config = getGameConfig()
  return config?.debug_mode ?? false
}
