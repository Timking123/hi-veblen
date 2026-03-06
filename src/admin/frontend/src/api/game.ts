/**
 * 游戏管理 API 接口
 * 提供游戏管理相关的 API 调用
 * 
 * 需求: 6.1.1-6.6.4
 */
import request from './request'

// ========== 类型定义 ==========

/** 排行榜条目 */
export interface LeaderboardEntry {
  id: number
  player_name: string
  score: number
  stage: number | null
  play_time: number | null
  created_at: string
}

/** 排行榜统计 */
export interface LeaderboardStats {
  totalEntries: number
  highestScore: number
  averageScore: number
  latestEntry: LeaderboardEntry | null
}

/** 成就条件类型 */
export type AchievementConditionType = 
  | 'score'    // 分数达到
  | 'stage'    // 通关关卡
  | 'time'     // 游戏时长
  | 'kills'    // 击杀数
  | 'combo'    // 连击数
  | 'noDamage' // 无伤通关

/** 成就 */
export interface Achievement {
  id: string
  name: string
  description: string | null
  icon: string | null
  condition_type: AchievementConditionType
  condition_value: number
  sort_order: number
}

/** 成就输入 */
export interface AchievementInput {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  condition_type: AchievementConditionType
  condition_value: number
  sort_order?: number
}

/** 机炮配置 */
export interface MachineGunConfig {
  bulletsPerShot: number
  trajectories: number
  fireRate: number
  bulletDamage: number
  bulletSpeed: number
}

/** 导弹配置 */
export interface MissileLauncherConfig {
  missileCount: number
  missileDamage: number
  missileSpeed: number
  explosionRadius: number
}

/** 基础配置 */
export interface BasicConfig {
  playerInitialHealth: number
  playerInitialSpeed: number
  nukeMaxProgress: number
  enemySpawnRate: number
  stageTotalEnemies: number
}

/** 场景配置 */
export interface SceneConfig {
  canvasWidth: number
  canvasHeight: number
  scaleMultiplier: number
  pixelBlockSize: number
}

/** 玩家配置 */
export interface PlayerConfig {
  moveDistance: number
  moveInterval: number
  collisionWidth: number
  collisionHeight: number
  initialMachineGun: MachineGunConfig
  initialMissileLauncher: MissileLauncherConfig
}

/** 移动配置 */
export interface MovementConfig {
  enemyMoveInterval: number
  enemyDownInterval: number
  pickupMoveSpeed: number
}

/** 射击配置 */
export interface ShootingConfig {
  playerGunCooldown: number
  enemyGunCooldown: number
  bulletSpeed: number
  bulletMoveInterval: number
  missileSpeed: number
  missileMoveInterval: number
}

/** 效果配置 */
export interface EffectsConfig {
  explosionDuration: number
  explosionFrames: number
  screenShakeDuration: number
  screenShakeIntensityMin: number
  screenShakeIntensityMax: number
}

/** 音频配置 */
export interface AudioConfig {
  musicVolume: number
  effectVolume: number
  maxConcurrentSounds: number
  audioPoolSize: number
}

/** 性能配置 */
export interface PerformanceConfig {
  targetFPS: number
  maxMemoryMB: number
  memoryCheckInterval: number
  cacheCleanupThreshold: number
}

/** 掉落概率配置 */
export interface DropRates {
  machineGun: number
  missile: number
  repair: number
  engine: number
}

/** 敌人类型配置 */
export interface EnemyTypeConfig {
  health: number
  speed: number
  attackPower: number
  machineGun?: MachineGunConfig
  missileLauncher?: MissileLauncherConfig
  dropRates: DropRates
}

/** 敌人类型枚举 */
export enum EnemyType {
  WHITE = 'white',
  GREEN = 'green',
  BLUE = 'blue',
  PURPLE = 'purple',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red'
}

/** 敌人配置 */
export interface EnemiesConfig {
  types: Record<EnemyType, EnemyTypeConfig>
  eliteMultiplier: number
  bossMultiplier: number
  finalBossMultiplier: number
  eliteSizeMultiplier: number
  bossSizeMultiplier: number
  finalBossSizeMultiplier: number
}

/** 关卡配置 */
export interface StageConfig {
  id: number
  name: string
  background: string
  enemyTypes: EnemyType[]
  totalEnemies: number
  spawnRate: number
  bossType: EnemyType
}

/** 高级配置 */
export interface AdvancedConfig {
  scene: SceneConfig
  player: PlayerConfig
  movement: MovementConfig
  shooting: ShootingConfig
  effects: EffectsConfig
  audio: AudioConfig
  performance: PerformanceConfig
  enemies: EnemiesConfig
  stages: StageConfig[]
}

/** 游戏配置 */
export interface GameConfig {
  basic: BasicConfig
  advanced: AdvancedConfig
}

/** 游戏配置记录 */
export interface GameConfigRecord {
  id: 1
  enabled: boolean
  debug_mode: boolean
  config: GameConfig
  updated_at: string
}

/** 配置差异项 */
export interface ConfigDiffItem {
  path: string
  currentValue: unknown
  defaultValue: unknown
}

// ========== 排行榜管理接口 ==========

/**
 * 获取排行榜列表
 * 
 * @param limit - 返回数量限制（默认 100，最大 500）
 * @returns 排行榜数据列表
 * 
 * 需求: 6.1.1
 */
export function getLeaderboard(limit: number = 100) {
  return request.get<{ data: LeaderboardEntry[] }>('/game/leaderboard', {
    params: { limit }
  })
}

/**
 * 获取排行榜统计数据
 * 
 * @returns 排行榜统计
 * 
 * 需求: 6.1.1
 */
export function getLeaderboardStats() {
  return request.get<LeaderboardStats>('/game/leaderboard/stats')
}

/**
 * 删除排行榜记录
 * 
 * @param id - 记录 ID
 * @returns 操作结果
 * 
 * 需求: 6.1.2
 */
export function deleteLeaderboardEntry(id: number) {
  return request.delete<{ success: boolean }>(`/game/leaderboard/${id}`)
}

/**
 * 重置排行榜（清空所有记录）
 * 
 * @returns 操作结果和删除数量
 * 
 * 需求: 6.1.3
 */
export function resetLeaderboard() {
  return request.delete<{ success: boolean; count: number }>('/game/leaderboard')
}

// ========== 成就管理接口 ==========

/**
 * 获取成就列表
 * 
 * @returns 成就列表
 * 
 * 需求: 6.2.1
 */
export function getAchievements() {
  return request.get<{ data: Achievement[] }>('/game/achievements')
}

/**
 * 获取单个成就
 * 
 * @param id - 成就 ID
 * @returns 成就详情
 * 
 * 需求: 6.2.1
 */
export function getAchievement(id: string) {
  return request.get<{ achievement: Achievement }>(`/game/achievements/${id}`)
}

/**
 * 创建成就
 * 
 * @param data - 成就数据
 * @returns 创建结果
 * 
 * 需求: 6.2.2, 6.2.3
 */
export function createAchievement(data: AchievementInput) {
  return request.post<{ success: boolean; achievement: Achievement }>('/game/achievements', data)
}

/**
 * 更新成就
 * 
 * @param id - 成就 ID
 * @param data - 更新数据
 * @returns 更新结果
 * 
 * 需求: 6.2.2
 */
export function updateAchievement(id: string, data: Partial<Omit<AchievementInput, 'id'>>) {
  return request.put<{ success: boolean; achievement: Achievement }>(`/game/achievements/${id}`, data)
}

/**
 * 删除成就
 * 
 * @param id - 成就 ID
 * @returns 操作结果
 * 
 * 需求: 6.2.2
 */
export function deleteAchievement(id: string) {
  return request.delete<{ success: boolean }>(`/game/achievements/${id}`)
}

// ========== 游戏配置接口 ==========

/**
 * 获取游戏配置
 * 
 * @returns 游戏配置记录
 * 
 * 需求: 6.3.1-6.6.1
 */
export function getGameConfig() {
  return request.get<{ config: GameConfigRecord }>('/game/config')
}

/**
 * 更新游戏配置
 * 
 * @param config - 游戏配置
 * @returns 更新结果
 * 
 * 需求: 6.4.1-6.6.1
 */
export function updateGameConfig(config: GameConfig) {
  return request.put<{ success: boolean; config: GameConfigRecord }>('/game/config', config)
}

/**
 * 恢复默认配置
 * 
 * @returns 恢复结果
 * 
 * 需求: 6.6.2
 */
export function resetGameConfig() {
  return request.post<{ success: boolean; config: GameConfigRecord }>('/game/config/reset')
}

/**
 * 获取默认配置
 * 
 * @returns 默认游戏配置
 * 
 * 需求: 6.6.3
 */
export function getDefaultConfig() {
  return request.get<{ config: GameConfig }>('/game/config/default')
}

/**
 * 设置游戏开关
 * 
 * @param enabled - 是否启用
 * @returns 操作结果
 * 
 * 需求: 6.3.1
 */
export function setGameEnabled(enabled: boolean) {
  return request.put<{ success: boolean; enabled: boolean }>('/game/config/enabled', { enabled })
}

/**
 * 设置调试模式
 * 
 * @param enabled - 是否启用
 * @returns 操作结果
 * 
 * 需求: 6.3.2
 */
export function setDebugMode(enabled: boolean) {
  return request.put<{ success: boolean; debugMode: boolean }>('/game/config/debug', { enabled })
}

/**
 * 导出配置
 * 
 * @param pretty - 是否格式化输出
 * @returns 配置 JSON 文件
 * 
 * 需求: 6.6.4
 */
export function exportConfig(pretty: boolean = true) {
  return request.get('/game/config/export', {
    params: { pretty },
    responseType: 'blob'
  })
}

/**
 * 导入配置
 * 
 * @param config - 游戏配置
 * @returns 导入结果
 * 
 * 需求: 6.6.4
 */
export function importConfig(config: GameConfig) {
  return request.post<{ success: boolean; config: GameConfigRecord }>('/game/config/import', config)
}
