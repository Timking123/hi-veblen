/**
 * 游戏管理控制器模块
 * 处理 /api/game/* 路由的请求
 * 
 * 需求: 6.1.1 - 显示游戏排行榜数据（排名、玩家名、分数、时间）
 * 需求: 6.1.2 - 提供删除异常记录功能
 * 需求: 6.1.3 - 提供重置排行榜功能（需二次确认）
 * 需求: 6.2.1 - 显示成就列表（名称、描述、条件、图标）
 * 需求: 6.2.2 - 提供成就 CRUD 操作
 * 需求: 6.2.3 - 提供成就条件配置（类型、目标值）
 * 需求: 6.3.1 - 提供启用/禁用彩蛋游戏的开关
 * 需求: 6.3.2 - 提供调试模式开关
 * 需求: 6.4.1-6.6.4 - 游戏参数配置
 */

import { Request, Response } from 'express'
import {
  getLeaderboard,
  getLeaderboardEntry,
  deleteLeaderboardEntry,
  resetLeaderboard,
  getLeaderboardStats,
  addLeaderboardEntry,
  getAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getGameConfig,
  updateGameConfig,
  resetGameConfig,
  setGameEnabled,
  setDebugMode,
  exportConfig,
  importConfig,
  getDefaultGameConfig
} from '../services/game'
import { AchievementInput, isValidAchievementConditionType } from '../models/game'

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: number
  message: string
  details?: {
    field?: string
    reason?: string
  }
}

/**
 * 发送错误响应
 * 
 * @param res - Express Response 对象
 * @param code - HTTP 状态码
 * @param message - 错误消息
 * @param details - 错误详情（可选）
 */
function sendError(
  res: Response,
  code: number,
  message: string,
  details?: ErrorResponse['details']
): void {
  const errorResponse: ErrorResponse = {
    code,
    message
  }
  
  if (details) {
    errorResponse.details = details
  }
  
  res.status(code).json(errorResponse)
}

// ========== 排行榜管理 ==========

/**
 * 获取排行榜列表
 * GET /api/game/leaderboard
 * 
 * 需要认证: 是
 * 查询参数:
 * - limit: 返回数量限制（默认 100，最大 500）
 * 
 * 响应: { data: LeaderboardEntry[] }
 * 
 * 需求: 6.1.1
 */
export function getLeaderboardHandler(req: Request, res: Response): void {
  try {
    const { limit } = req.query
    
    // 解析并验证 limit 参数
    let limitNum = 100
    if (limit) {
      limitNum = parseInt(limit as string, 10)
      if (isNaN(limitNum) || limitNum < 1) {
        sendError(res, 400, '返回数量必须是正整数', {
          field: 'limit',
          reason: 'invalid_value'
        })
        return
      }
      // 限制最大值
      if (limitNum > 500) {
        limitNum = 500
      }
    }
    
    const data = getLeaderboard(limitNum)
    res.json({ data })
  } catch (error) {
    console.error('获取排行榜错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 获取排行榜统计数据
 * GET /api/game/leaderboard/stats
 * 
 * 需要认证: 是
 * 响应: { totalEntries, highestScore, averageScore, latestEntry }
 * 
 * 需求: 6.1.1
 */
export function getLeaderboardStatsHandler(_req: Request, res: Response): void {
  try {
    const stats = getLeaderboardStats()
    res.json(stats)
  } catch (error) {
    console.error('获取排行榜统计错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 删除单条排行榜记录
 * DELETE /api/game/leaderboard/:id
 * 
 * 需要认证: 是
 * 路径参数: id - 排行榜条目 ID
 * 响应: { success: boolean }
 * 
 * 需求: 6.1.2
 */
export function deleteLeaderboardEntryHandler(req: Request, res: Response): void {
  try {
    const { id } = req.params
    
    // 验证 ID 参数
    if (!id) {
      sendError(res, 400, '请提供排行榜记录 ID', {
        field: 'id',
        reason: 'required'
      })
      return
    }
    
    const entryId = parseInt(id, 10)
    if (isNaN(entryId) || entryId < 1) {
      sendError(res, 400, '无效的排行榜记录 ID', {
        field: 'id',
        reason: 'invalid_value'
      })
      return
    }
    
    // 检查记录是否存在
    const entry = getLeaderboardEntry(entryId)
    if (!entry) {
      sendError(res, 404, '排行榜记录不存在')
      return
    }
    
    // 删除记录
    const success = deleteLeaderboardEntry(entryId)
    
    if (!success) {
      sendError(res, 500, '删除排行榜记录失败')
      return
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('删除排行榜记录错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 重置排行榜（清空所有记录）
 * DELETE /api/game/leaderboard
 * 
 * 需要认证: 是
 * 响应: { success: boolean, count: number }
 * 
 * 需求: 6.1.3
 */
export function resetLeaderboardHandler(_req: Request, res: Response): void {
  try {
    const count = resetLeaderboard()
    res.json({ success: true, count })
  } catch (error) {
    console.error('重置排行榜错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 添加排行榜记录（供前端游戏调用）
 * POST /api/game/leaderboard
 * 
 * 需要认证: 否（公开接口）
 * 请求体: { playerName, score, stage?, playTime? }
 * 响应: { success: boolean, id?: number }
 * 
 * 需求: 6.1.1
 */
export function addLeaderboardEntryHandler(req: Request, res: Response): void {
  try {
    const { playerName, score, stage, playTime } = req.body
    
    // 验证玩家名称
    if (!playerName || typeof playerName !== 'string') {
      sendError(res, 400, '请提供玩家名称', {
        field: 'playerName',
        reason: 'required'
      })
      return
    }
    
    if (playerName.trim().length === 0) {
      sendError(res, 400, '玩家名称不能为空', {
        field: 'playerName',
        reason: 'empty'
      })
      return
    }
    
    if (playerName.length > 50) {
      sendError(res, 400, '玩家名称长度不能超过 50 个字符', {
        field: 'playerName',
        reason: 'too_long'
      })
      return
    }
    
    // 验证分数
    if (score === undefined || score === null) {
      sendError(res, 400, '请提供游戏分数', {
        field: 'score',
        reason: 'required'
      })
      return
    }
    
    const scoreNum = typeof score === 'string' ? parseInt(score, 10) : score
    if (!Number.isInteger(scoreNum) || scoreNum < 0) {
      sendError(res, 400, '分数必须是非负整数', {
        field: 'score',
        reason: 'invalid_value'
      })
      return
    }
    
    // 验证关卡（可选）
    let stageNum: number | undefined = undefined
    if (stage !== undefined && stage !== null) {
      const parsedStage = typeof stage === 'string' ? parseInt(stage, 10) : stage
      if (!Number.isInteger(parsedStage) || parsedStage < 1) {
        sendError(res, 400, '关卡必须是正整数', {
          field: 'stage',
          reason: 'invalid_value'
        })
        return
      }
      stageNum = parsedStage
    }
    
    // 验证游戏时长（可选）
    let playTimeNum: number | undefined = undefined
    if (playTime !== undefined && playTime !== null) {
      const parsedPlayTime = typeof playTime === 'string' ? parseInt(playTime, 10) : playTime
      if (!Number.isInteger(parsedPlayTime) || parsedPlayTime < 0) {
        sendError(res, 400, '游戏时长必须是非负整数', {
          field: 'playTime',
          reason: 'invalid_value'
        })
        return
      }
      playTimeNum = parsedPlayTime
    }
    
    // 添加记录
    const result = addLeaderboardEntry(
      playerName.trim(), 
      scoreNum, 
      stageNum !== undefined ? stageNum : undefined, 
      playTimeNum !== undefined ? playTimeNum : undefined
    )
    
    if (!result.success) {
      sendError(res, 500, result.errors?.[0] || '添加排行榜记录失败')
      return
    }
    
    res.json({ success: true, id: result.id })
  } catch (error) {
    console.error('添加排行榜记录错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== 成就管理 ==========

/**
 * 获取所有成就
 * GET /api/game/achievements
 * 
 * 需要认证: 是
 * 响应: { data: Achievement[] }
 * 
 * 需求: 6.2.1
 */
export function getAchievementsHandler(_req: Request, res: Response): void {
  try {
    const data = getAchievements()
    res.json({ data })
  } catch (error) {
    console.error('获取成就列表错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 获取单个成就
 * GET /api/game/achievements/:id
 * 
 * 需要认证: 是
 * 路径参数: id - 成就 ID
 * 响应: { achievement: Achievement }
 * 
 * 需求: 6.2.1
 */
export function getAchievementHandler(req: Request, res: Response): void {
  try {
    const { id } = req.params
    
    // 验证 ID 参数
    if (!id) {
      sendError(res, 400, '请提供成就 ID', {
        field: 'id',
        reason: 'required'
      })
      return
    }
    
    const achievement = getAchievementById(id)
    
    if (!achievement) {
      sendError(res, 404, '成就不存在')
      return
    }
    
    res.json({ achievement })
  } catch (error) {
    console.error('获取成就详情错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 创建成就
 * POST /api/game/achievements
 * 
 * 需要认证: 是
 * 请求体: AchievementInput
 * 响应: { success: boolean, achievement?: Achievement }
 * 
 * 需求: 6.2.2, 6.2.3
 */
export function createAchievementHandler(req: Request, res: Response): void {
  try {
    const { id, name, description, icon, condition_type, condition_value, sort_order } = req.body
    
    // 验证必填字段
    if (!id || typeof id !== 'string') {
      sendError(res, 400, '请提供成就 ID', {
        field: 'id',
        reason: 'required'
      })
      return
    }
    
    if (!name || typeof name !== 'string') {
      sendError(res, 400, '请提供成就名称', {
        field: 'name',
        reason: 'required'
      })
      return
    }
    
    if (!condition_type || typeof condition_type !== 'string') {
      sendError(res, 400, '请提供成就条件类型', {
        field: 'condition_type',
        reason: 'required'
      })
      return
    }
    
    if (!isValidAchievementConditionType(condition_type)) {
      sendError(res, 400, '无效的成就条件类型，有效值: score, stage, time, kills, combo, noDamage', {
        field: 'condition_type',
        reason: 'invalid_value'
      })
      return
    }
    
    if (condition_value === undefined || condition_value === null) {
      sendError(res, 400, '请提供成就条件值', {
        field: 'condition_value',
        reason: 'required'
      })
      return
    }
    
    const conditionValueNum = typeof condition_value === 'string' 
      ? parseInt(condition_value, 10) 
      : condition_value
    
    if (!Number.isInteger(conditionValueNum) || conditionValueNum <= 0) {
      sendError(res, 400, '成就条件值必须是正整数', {
        field: 'condition_value',
        reason: 'invalid_value'
      })
      return
    }
    
    // 构建输入数据
    const input: AchievementInput = {
      id: id.trim(),
      name: name.trim(),
      description: description?.trim() || null,
      icon: icon || null,
      condition_type,
      condition_value: conditionValueNum,
      sort_order: sort_order !== undefined ? parseInt(sort_order, 10) : undefined
    }
    
    // 创建成就
    const result = createAchievement(input)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '创建成就失败')
      return
    }
    
    res.status(201).json({ success: true, achievement: result.achievement })
  } catch (error) {
    console.error('创建成就错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新成就
 * PUT /api/game/achievements/:id
 * 
 * 需要认证: 是
 * 路径参数: id - 成就 ID
 * 请求体: Partial<AchievementInput>
 * 响应: { success: boolean, achievement?: Achievement }
 * 
 * 需求: 6.2.2
 */
export function updateAchievementHandler(req: Request, res: Response): void {
  try {
    const { id } = req.params
    const { name, description, icon, condition_type, condition_value, sort_order } = req.body
    
    // 验证 ID 参数
    if (!id) {
      sendError(res, 400, '请提供成就 ID', {
        field: 'id',
        reason: 'required'
      })
      return
    }
    
    // 检查成就是否存在
    const existing = getAchievementById(id)
    if (!existing) {
      sendError(res, 404, '成就不存在')
      return
    }
    
    // 验证条件类型（如果提供）
    if (condition_type !== undefined && !isValidAchievementConditionType(condition_type)) {
      sendError(res, 400, '无效的成就条件类型，有效值: score, stage, time, kills, combo, noDamage', {
        field: 'condition_type',
        reason: 'invalid_value'
      })
      return
    }
    
    // 验证条件值（如果提供）
    let conditionValueNum: number | undefined = undefined
    if (condition_value !== undefined) {
      const parsedValue = typeof condition_value === 'string' 
        ? parseInt(condition_value, 10) 
        : condition_value
      
      if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        sendError(res, 400, '成就条件值必须是正整数', {
          field: 'condition_value',
          reason: 'invalid_value'
        })
        return
      }
      conditionValueNum = parsedValue
    }
    
    // 构建更新数据
    const updateData: Partial<Omit<AchievementInput, 'id'>> = {}
    
    if (name !== undefined) {
      updateData.name = name
    }
    if (description !== undefined) {
      updateData.description = description
    }
    if (icon !== undefined) {
      updateData.icon = icon
    }
    if (condition_type !== undefined) {
      updateData.condition_type = condition_type
    }
    if (conditionValueNum !== undefined) {
      updateData.condition_value = conditionValueNum
    }
    if (sort_order !== undefined) {
      updateData.sort_order = parseInt(sort_order, 10)
    }
    
    // 更新成就
    const result = updateAchievement(id, updateData)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '更新成就失败')
      return
    }
    
    res.json({ success: true, achievement: result.achievement })
  } catch (error) {
    console.error('更新成就错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 删除成就
 * DELETE /api/game/achievements/:id
 * 
 * 需要认证: 是
 * 路径参数: id - 成就 ID
 * 响应: { success: boolean }
 * 
 * 需求: 6.2.2
 */
export function deleteAchievementHandler(req: Request, res: Response): void {
  try {
    const { id } = req.params
    
    // 验证 ID 参数
    if (!id) {
      sendError(res, 400, '请提供成就 ID', {
        field: 'id',
        reason: 'required'
      })
      return
    }
    
    // 检查成就是否存在
    const existing = getAchievementById(id)
    if (!existing) {
      sendError(res, 404, '成就不存在')
      return
    }
    
    // 删除成就
    const success = deleteAchievement(id)
    
    if (!success) {
      sendError(res, 500, '删除成就失败')
      return
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('删除成就错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

// ========== 游戏配置管理 ==========

/**
 * 获取游戏配置
 * GET /api/game/config
 * 
 * 需要认证: 是
 * 响应: { config: GameConfigRecord }
 * 
 * 需求: 6.4.1-6.6.1
 */
export function getGameConfigHandler(_req: Request, res: Response): void {
  try {
    const config = getGameConfig()
    
    if (!config) {
      sendError(res, 500, '获取游戏配置失败')
      return
    }
    
    res.json({ config })
  } catch (error) {
    console.error('获取游戏配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 更新游戏配置
 * PUT /api/game/config
 * 
 * 需要认证: 是
 * 请求体: GameConfig
 * 响应: { success: boolean, config?: GameConfigRecord }
 * 
 * 需求: 6.4.1-6.6.1
 */
export function updateGameConfigHandler(req: Request, res: Response): void {
  try {
    const config = req.body
    
    // 验证配置结构
    if (!config || typeof config !== 'object') {
      sendError(res, 400, '请提供有效的游戏配置', {
        field: 'config',
        reason: 'required'
      })
      return
    }
    
    if (!config.basic || typeof config.basic !== 'object') {
      sendError(res, 400, '缺少基础配置', {
        field: 'basic',
        reason: 'required'
      })
      return
    }
    
    if (!config.advanced || typeof config.advanced !== 'object') {
      sendError(res, 400, '缺少高级配置', {
        field: 'advanced',
        reason: 'required'
      })
      return
    }
    
    // 更新配置
    const result = updateGameConfig(config)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '更新游戏配置失败')
      return
    }
    
    res.json({ success: true, config: result.config })
  } catch (error) {
    console.error('更新游戏配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 恢复默认游戏配置
 * POST /api/game/config/reset
 * 
 * 需要认证: 是
 * 响应: { success: boolean, config?: GameConfigRecord }
 * 
 * 需求: 6.6.2
 */
export function resetGameConfigHandler(_req: Request, res: Response): void {
  try {
    const result = resetGameConfig()
    
    if (!result.success) {
      sendError(res, 500, result.errors?.[0] || '恢复默认配置失败')
      return
    }
    
    res.json({ success: true, config: result.config })
  } catch (error) {
    console.error('恢复默认配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 设置游戏开关
 * PUT /api/game/config/enabled
 * 
 * 需要认证: 是
 * 请求体: { enabled: boolean }
 * 响应: { success: boolean, enabled?: boolean }
 * 
 * 需求: 6.3.1
 */
export function setGameEnabledHandler(req: Request, res: Response): void {
  try {
    const { enabled } = req.body
    
    if (enabled === undefined || enabled === null) {
      sendError(res, 400, '请提供游戏开关状态', {
        field: 'enabled',
        reason: 'required'
      })
      return
    }
    
    const enabledBool = typeof enabled === 'string' 
      ? enabled === 'true' 
      : Boolean(enabled)
    
    const result = setGameEnabled(enabledBool)
    
    if (!result.success) {
      sendError(res, 500, result.errors?.[0] || '设置游戏开关失败')
      return
    }
    
    res.json({ success: true, enabled: result.enabled })
  } catch (error) {
    console.error('设置游戏开关错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 设置调试模式
 * PUT /api/game/config/debug
 * 
 * 需要认证: 是
 * 请求体: { enabled: boolean }
 * 响应: { success: boolean, debugMode?: boolean }
 * 
 * 需求: 6.3.2
 */
export function setDebugModeHandler(req: Request, res: Response): void {
  try {
    const { enabled } = req.body
    
    if (enabled === undefined || enabled === null) {
      sendError(res, 400, '请提供调试模式状态', {
        field: 'enabled',
        reason: 'required'
      })
      return
    }
    
    const enabledBool = typeof enabled === 'string' 
      ? enabled === 'true' 
      : Boolean(enabled)
    
    const result = setDebugMode(enabledBool)
    
    if (!result.success) {
      sendError(res, 500, result.errors?.[0] || '设置调试模式失败')
      return
    }
    
    res.json({ success: true, debugMode: result.debugMode })
  } catch (error) {
    console.error('设置调试模式错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 导出游戏配置
 * GET /api/game/config/export
 * 
 * 需要认证: 是
 * 查询参数:
 * - pretty: 是否格式化输出（默认 true）
 * 
 * 响应: JSON 文件下载
 * 
 * 需求: 6.6.4
 */
export function exportConfigHandler(req: Request, res: Response): void {
  try {
    const { pretty } = req.query
    const prettyBool = pretty !== 'false'
    
    const result = exportConfig(prettyBool)
    
    if (!result.success || !result.json) {
      sendError(res, 500, result.errors?.[0] || '导出配置失败')
      return
    }
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const filename = `game-config-${timestamp}.json`
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', Buffer.byteLength(result.json, 'utf8'))
    
    // 发送文件数据
    res.send(result.json)
  } catch (error) {
    console.error('导出配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 导入游戏配置
 * POST /api/game/config/import
 * 
 * 需要认证: 是
 * 请求体: JSON 格式的游戏配置
 * 响应: { success: boolean, config?: GameConfigRecord }
 * 
 * 需求: 6.6.4
 */
export function importConfigHandler(req: Request, res: Response): void {
  try {
    let json: string
    
    // 支持两种方式：直接传 JSON 对象或传 JSON 字符串
    if (typeof req.body === 'string') {
      json = req.body
    } else if (typeof req.body === 'object') {
      json = JSON.stringify(req.body)
    } else {
      sendError(res, 400, '请提供有效的 JSON 配置', {
        field: 'config',
        reason: 'required'
      })
      return
    }
    
    const result = importConfig(json)
    
    if (!result.success) {
      sendError(res, 400, result.errors?.[0] || '导入配置失败')
      return
    }
    
    res.json({ success: true, config: result.config })
  } catch (error) {
    console.error('导入配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}

/**
 * 获取默认游戏配置
 * GET /api/game/config/default
 * 
 * 需要认证: 是
 * 响应: { config: GameConfig }
 * 
 * 需求: 6.6.3
 */
export function getDefaultConfigHandler(_req: Request, res: Response): void {
  try {
    const config = getDefaultGameConfig()
    res.json({ config })
  } catch (error) {
    console.error('获取默认配置错误:', error)
    sendError(res, 500, '服务器内部错误')
  }
}
