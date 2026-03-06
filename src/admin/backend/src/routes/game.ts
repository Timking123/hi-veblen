/**
 * 游戏管理路由模块
 * 注册所有游戏管理相关路由
 * 
 * 路由列表:
 * 
 * 排行榜管理:
 * - GET /leaderboard - 获取排行榜列表（需要认证）
 * - GET /leaderboard/stats - 获取排行榜统计（需要认证）
 * - DELETE /leaderboard/:id - 删除单条记录（需要认证）
 * - DELETE /leaderboard - 重置排行榜（需要认证）
 * - POST /leaderboard - 添加排行榜记录（公开接口，供前端游戏调用）
 * 
 * 成就管理:
 * - GET /achievements - 获取所有成就（需要认证）
 * - GET /achievements/:id - 获取单个成就（需要认证）
 * - POST /achievements - 创建成就（需要认证）
 * - PUT /achievements/:id - 更新成就（需要认证）
 * - DELETE /achievements/:id - 删除成就（需要认证）
 * 
 * 游戏配置管理:
 * - GET /config - 获取游戏配置（需要认证）
 * - PUT /config - 更新游戏配置（需要认证）
 * - POST /config/reset - 恢复默认配置（需要认证）
 * - PUT /config/enabled - 设置游戏开关（需要认证）
 * - PUT /config/debug - 设置调试模式（需要认证）
 * - GET /config/export - 导出配置（需要认证）
 * - POST /config/import - 导入配置（需要认证）
 * - GET /config/default - 获取默认配置（需要认证）
 * 
 * 需求: 6.1.1-6.6.4
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  // 排行榜管理
  getLeaderboardHandler,
  getLeaderboardStatsHandler,
  deleteLeaderboardEntryHandler,
  resetLeaderboardHandler,
  addLeaderboardEntryHandler,
  // 成就管理
  getAchievementsHandler,
  getAchievementHandler,
  createAchievementHandler,
  updateAchievementHandler,
  deleteAchievementHandler,
  // 游戏配置管理
  getGameConfigHandler,
  updateGameConfigHandler,
  resetGameConfigHandler,
  setGameEnabledHandler,
  setDebugModeHandler,
  exportConfigHandler,
  importConfigHandler,
  getDefaultConfigHandler
} from '../controllers/game'

const router = Router()

// ========== 排行榜管理路由 ==========

/**
 * GET /leaderboard/stats
 * 获取排行榜统计数据
 * 
 * 需要认证: 是
 * 响应: { totalEntries, highestScore, averageScore, latestEntry }
 * 
 * 注意: 此路由必须在 /leaderboard/:id 之前定义
 * 
 * 需求: 6.1.1
 */
router.get('/leaderboard/stats', authMiddleware, getLeaderboardStatsHandler)

/**
 * GET /leaderboard
 * 获取排行榜列表
 * 
 * 需要认证: 是
 * 查询参数: limit (可选，默认 100，最大 500)
 * 响应: { data: LeaderboardEntry[] }
 * 
 * 需求: 6.1.1
 */
router.get('/leaderboard', authMiddleware, getLeaderboardHandler)

/**
 * POST /leaderboard
 * 添加排行榜记录（供前端游戏调用）
 * 
 * 需要认证: 否（公开接口）
 * 请求体: { playerName, score, stage?, playTime? }
 * 响应: { success, id? }
 * 
 * 需求: 6.1.1
 */
router.post('/leaderboard', addLeaderboardEntryHandler)

/**
 * DELETE /leaderboard
 * 重置排行榜（清空所有记录）
 * 
 * 需要认证: 是
 * 响应: { success, count }
 * 
 * 注意: 此路由必须在 /leaderboard/:id 之前定义
 * 
 * 需求: 6.1.3
 */
router.delete('/leaderboard', authMiddleware, resetLeaderboardHandler)

/**
 * DELETE /leaderboard/:id
 * 删除单条排行榜记录
 * 
 * 需要认证: 是
 * 路径参数: id - 排行榜条目 ID
 * 响应: { success }
 * 
 * 需求: 6.1.2
 */
router.delete('/leaderboard/:id', authMiddleware, deleteLeaderboardEntryHandler)

// ========== 成就管理路由 ==========

/**
 * GET /achievements
 * 获取所有成就
 * 
 * 需要认证: 是
 * 响应: { data: Achievement[] }
 * 
 * 需求: 6.2.1
 */
router.get('/achievements', authMiddleware, getAchievementsHandler)

/**
 * POST /achievements
 * 创建成就
 * 
 * 需要认证: 是
 * 请求体: AchievementInput
 * 响应: { success, achievement? }
 * 
 * 需求: 6.2.2, 6.2.3
 */
router.post('/achievements', authMiddleware, createAchievementHandler)

/**
 * GET /achievements/:id
 * 获取单个成就
 * 
 * 需要认证: 是
 * 路径参数: id - 成就 ID
 * 响应: { achievement }
 * 
 * 需求: 6.2.1
 */
router.get('/achievements/:id', authMiddleware, getAchievementHandler)

/**
 * PUT /achievements/:id
 * 更新成就
 * 
 * 需要认证: 是
 * 路径参数: id - 成就 ID
 * 请求体: Partial<AchievementInput>
 * 响应: { success, achievement? }
 * 
 * 需求: 6.2.2
 */
router.put('/achievements/:id', authMiddleware, updateAchievementHandler)

/**
 * DELETE /achievements/:id
 * 删除成就
 * 
 * 需要认证: 是
 * 路径参数: id - 成就 ID
 * 响应: { success }
 * 
 * 需求: 6.2.2
 */
router.delete('/achievements/:id', authMiddleware, deleteAchievementHandler)

// ========== 游戏配置管理路由 ==========

/**
 * GET /config/export
 * 导出游戏配置
 * 
 * 需要认证: 是
 * 查询参数: pretty (可选，默认 true)
 * 响应: JSON 文件下载
 * 
 * 注意: 此路由必须在 /config 之前定义
 * 
 * 需求: 6.6.4
 */
router.get('/config/export', authMiddleware, exportConfigHandler)

/**
 * GET /config/default
 * 获取默认游戏配置
 * 
 * 需要认证: 是
 * 响应: { config: GameConfig }
 * 
 * 注意: 此路由必须在 /config 之前定义
 * 
 * 需求: 6.6.3
 */
router.get('/config/default', authMiddleware, getDefaultConfigHandler)

/**
 * POST /config/reset
 * 恢复默认游戏配置
 * 
 * 需要认证: 是
 * 响应: { success, config? }
 * 
 * 注意: 此路由必须在 /config 之前定义
 * 
 * 需求: 6.6.2
 */
router.post('/config/reset', authMiddleware, resetGameConfigHandler)

/**
 * POST /config/import
 * 导入游戏配置
 * 
 * 需要认证: 是
 * 请求体: JSON 格式的游戏配置
 * 响应: { success, config? }
 * 
 * 注意: 此路由必须在 /config 之前定义
 * 
 * 需求: 6.6.4
 */
router.post('/config/import', authMiddleware, importConfigHandler)

/**
 * PUT /config/enabled
 * 设置游戏开关
 * 
 * 需要认证: 是
 * 请求体: { enabled: boolean }
 * 响应: { success, enabled? }
 * 
 * 注意: 此路由必须在 /config 之前定义
 * 
 * 需求: 6.3.1
 */
router.put('/config/enabled', authMiddleware, setGameEnabledHandler)

/**
 * PUT /config/debug
 * 设置调试模式
 * 
 * 需要认证: 是
 * 请求体: { enabled: boolean }
 * 响应: { success, debugMode? }
 * 
 * 注意: 此路由必须在 /config 之前定义
 * 
 * 需求: 6.3.2
 */
router.put('/config/debug', authMiddleware, setDebugModeHandler)

/**
 * GET /config
 * 获取游戏配置
 * 
 * 需要认证: 是
 * 响应: { config: GameConfigRecord }
 * 
 * 需求: 6.4.1-6.6.1
 */
router.get('/config', authMiddleware, getGameConfigHandler)

/**
 * PUT /config
 * 更新游戏配置
 * 
 * 需要认证: 是
 * 请求体: GameConfig
 * 响应: { success, config? }
 * 
 * 需求: 6.4.1-6.6.1
 */
router.put('/config', authMiddleware, updateGameConfigHandler)

export default router
