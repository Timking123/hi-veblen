/**
 * 游戏数据模型
 * 定义游戏管理相关的 TypeScript 接口
 * 
 * 对应数据库表: game_leaderboard, game_achievements, game_config
 * 
 * 需求: 6.4.1-6.6.4
 */

// ========== 敌人类型枚举 ==========

/**
 * 敌人类型枚举
 * 与前端游戏 src/game/types.ts 中的 EnemyType 保持一致
 */
export enum EnemyType {
  WHITE = 'white',
  GREEN = 'green',
  BLUE = 'blue',
  PURPLE = 'purple',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red'
}

// ========== 成就条件类型 ==========

/**
 * 成就条件类型
 * 
 * 需求: 6.2.3 - 提供成就条件配置（类型、目标值）
 */
export type AchievementConditionType = 
  | 'score'    // 分数达到
  | 'stage'    // 通关关卡
  | 'time'     // 游戏时长
  | 'kills'    // 击杀数
  | 'combo'    // 连击数
  | 'noDamage' // 无伤通关

// ========== 排行榜条目接口 ==========

/**
 * 排行榜条目接口
 * 对应数据库表: game_leaderboard
 * 
 * 需求: 6.1.1 - 显示游戏排行榜数据（排名、玩家名、分数、时间）
 */
export interface LeaderboardEntry {
  /** 唯一标识符（自增） */
  id: number
  /** 玩家名称 */
  player_name: string
  /** 游戏分数 */
  score: number
  /** 通关关卡 */
  stage: number | null
  /** 游戏时长（秒） */
  play_time: number | null
  /** 创建时间 */
  created_at: string
}

/**
 * 数据库原始行数据
 */
export interface LeaderboardRow {
  id: number
  player_name: string
  score: number
  stage: number | null
  play_time: number | null
  created_at: string
}

// ========== 成就接口 ==========

/**
 * 成就接口
 * 对应数据库表: game_achievements
 * 
 * 需求: 6.2.1 - 显示成就列表（名称、描述、条件、图标）
 * 需求: 6.2.2 - 提供成就 CRUD 操作
 * 需求: 6.2.3 - 提供成就条件配置（类型、目标值）
 */
export interface Achievement {
  /** 唯一标识符 */
  id: string
  /** 成就名称 */
  name: string
  /** 成就描述 */
  description: string | null
  /** 成就图标路径 */
  icon: string | null
  /** 条件类型 */
  condition_type: AchievementConditionType
  /** 条件目标值 */
  condition_value: number
  /** 排序顺序（数值越小越靠前） */
  sort_order: number
}

/**
 * 创建成就时的输入数据
 */
export interface AchievementInput {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  condition_type: AchievementConditionType
  condition_value: number
  sort_order?: number
}


/**
 * 数据库中的成就记录
 * 包含数据库自动生成的字段
 */
export interface AchievementRecord extends Achievement {
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/**
 * 数据库原始行数据
 */
export interface AchievementRow {
  id: string
  name: string
  description: string | null
  icon: string | null
  condition_type: string
  condition_value: number
  sort_order: number
  created_at: string
  updated_at: string
}

// ========== 机炮配置接口 ==========

/**
 * 机炮配置接口
 * 
 * 需求: 6.5.2 - 玩家初始机炮配置
 */
export interface MachineGunConfig {
  /** 每次发射子弹数 */
  bulletsPerShot: number
  /** 弹道数 */
  trajectories: number
  /** 射速（毫秒） */
  fireRate: number
  /** 子弹伤害 */
  bulletDamage: number
  /** 子弹速度 */
  bulletSpeed: number
}

// ========== 导弹配置接口 ==========

/**
 * 导弹配置接口
 * 
 * 需求: 6.5.2 - 玩家初始导弹配置
 */
export interface MissileLauncherConfig {
  /** 导弹数量 */
  missileCount: number
  /** 导弹伤害 */
  missileDamage: number
  /** 导弹速度 */
  missileSpeed: number
  /** 爆炸半径 */
  explosionRadius: number
}


// ========== 掉落概率配置接口 ==========

/**
 * 掉落概率配置接口
 */
export interface DropRates {
  /** 机炮升级掉落概率 */
  machineGun: number
  /** 导弹补给掉落概率 */
  missile: number
  /** 维修包掉落概率 */
  repair: number
  /** 引擎升级掉落概率 */
  engine: number
}

// ========== 敌人类型配置接口 ==========

/**
 * 单个敌人类型配置接口
 * 
 * 需求: 6.6.1 - 敌人配置（按类型）
 */
export interface EnemyTypeConfig {
  /** 血量 */
  health: number
  /** 速度 */
  speed: number
  /** 攻击力 */
  attackPower: number
  /** 机炮配置（可选） */
  machineGun?: MachineGunConfig
  /** 导弹配置（可选） */
  missileLauncher?: MissileLauncherConfig
  /** 掉落概率 */
  dropRates: DropRates
}

// ========== 关卡配置接口 ==========

/**
 * 关卡配置接口
 * 
 * 需求: 6.6.1 - 关卡配置
 */
export interface StageConfig {
  /** 关卡 ID */
  id: number
  /** 关卡名称 */
  name: string
  /** 背景场景 */
  background: string
  /** 敌人类型列表 */
  enemyTypes: EnemyType[]
  /** 敌人总数 */
  totalEnemies: number
  /** 生成速率（毫秒） */
  spawnRate: number
  /** Boss 类型 */
  bossType: EnemyType
}


// ========== 游戏配置接口 ==========

/**
 * 基础参数配置接口
 * 
 * 需求: 6.4.1 - 玩家初始生命值配置
 * 需求: 6.4.2 - 玩家初始速度配置
 * 需求: 6.4.3 - 核弹进度条最大值配置
 * 需求: 6.4.4 - 敌人生成速率配置
 * 需求: 6.4.5 - 关卡敌人总数配置
 */
export interface BasicConfig {
  /** 玩家初始生命值 */
  playerInitialHealth: number
  /** 玩家初始速度 */
  playerInitialSpeed: number
  /** 核弹进度条最大值 */
  nukeMaxProgress: number
  /** 敌人生成速率（毫秒） */
  enemySpawnRate: number
  /** 关卡敌人总数 */
  stageTotalEnemies: number
}

/**
 * 场景配置接口
 * 
 * 需求: 6.6.1 - 场景配置
 */
export interface SceneConfig {
  /** 画布宽度 */
  canvasWidth: number
  /** 画布高度 */
  canvasHeight: number
  /** 场景缩放倍率 */
  scaleMultiplier: number
  /** 像素块大小 */
  pixelBlockSize: number
}

/**
 * 玩家配置接口
 * 
 * 需求: 6.5.2 - 玩家完整参数配置
 */
export interface PlayerConfig {
  /** 移动距离（像素块） */
  moveDistance: number
  /** 移动间隔（长按时，毫秒） */
  moveInterval: number
  /** 碰撞体积宽度 */
  collisionWidth: number
  /** 碰撞体积高度 */
  collisionHeight: number
  /** 初始机炮配置 */
  initialMachineGun: MachineGunConfig
  /** 初始导弹配置 */
  initialMissileLauncher: MissileLauncherConfig
}


/**
 * 移动配置接口
 * 
 * 需求: 6.6.1 - 移动配置
 */
export interface MovementConfig {
  /** 敌人移动间隔（毫秒） */
  enemyMoveInterval: number
  /** 敌人下降间隔（毫秒） */
  enemyDownInterval: number
  /** 掉落物移动速度 */
  pickupMoveSpeed: number
}

/**
 * 射击配置接口
 * 
 * 需求: 6.6.1 - 射击配置
 */
export interface ShootingConfig {
  /** 玩家机炮冷却时间（毫秒） */
  playerGunCooldown: number
  /** 敌人机炮冷却时间（毫秒） */
  enemyGunCooldown: number
  /** 子弹速度（像素块/毫秒） */
  bulletSpeed: number
  /** 子弹移动间隔（毫秒） */
  bulletMoveInterval: number
  /** 导弹速度（像素块/毫秒） */
  missileSpeed: number
  /** 导弹移动间隔（毫秒） */
  missileMoveInterval: number
}

/**
 * 效果配置接口
 * 
 * 需求: 6.6.1 - 效果配置
 */
export interface EffectsConfig {
  /** 爆炸持续时间（毫秒） */
  explosionDuration: number
  /** 爆炸动画帧数 */
  explosionFrames: number
  /** 屏幕震动持续时间（毫秒） */
  screenShakeDuration: number
  /** 屏幕震动最小强度（像素） */
  screenShakeIntensityMin: number
  /** 屏幕震动最大强度（像素） */
  screenShakeIntensityMax: number
}

/**
 * 音频配置接口
 * 
 * 需求: 6.6.1 - 音频配置
 */
export interface AudioConfig {
  /** 背景音乐音量 (0.0-1.0) */
  musicVolume: number
  /** 音效音量 (0.0-1.0) */
  effectVolume: number
  /** 最大同时播放音效数 */
  maxConcurrentSounds: number
  /** 音频对象池大小 */
  audioPoolSize: number
}


/**
 * 性能配置接口
 * 
 * 需求: 6.6.1 - 性能配置
 */
export interface PerformanceConfig {
  /** 目标帧率 */
  targetFPS: number
  /** 最大内存限制（MB） */
  maxMemoryMB: number
  /** 内存检查间隔（毫秒） */
  memoryCheckInterval: number
  /** 缓存清理阈值 (0.0-1.0) */
  cacheCleanupThreshold: number
}

/**
 * 敌人配置接口
 * 
 * 需求: 6.6.1 - 敌人配置
 */
export interface EnemiesConfig {
  /** 各类型敌人配置 */
  types: Record<EnemyType, EnemyTypeConfig>
  /** 精英怪倍率 */
  eliteMultiplier: number
  /** Boss 倍率 */
  bossMultiplier: number
  /** 最终 Boss 倍率 */
  finalBossMultiplier: number
  /** 精英怪体积倍率 */
  eliteSizeMultiplier: number
  /** Boss 体积倍率 */
  bossSizeMultiplier: number
  /** 最终 Boss 体积倍率 */
  finalBossSizeMultiplier: number
}

/**
 * 高级参数配置接口
 * 
 * 需求: 6.5.1 - 高级模式开关
 * 需求: 6.5.2 - 玩家完整参数配置
 * 需求: 6.6.1 - 详细参数配置
 */
export interface AdvancedConfig {
  /** 场景配置 */
  scene: SceneConfig
  /** 玩家配置 */
  player: PlayerConfig
  /** 移动配置 */
  movement: MovementConfig
  /** 射击配置 */
  shooting: ShootingConfig
  /** 效果配置 */
  effects: EffectsConfig
  /** 音频配置 */
  audio: AudioConfig
  /** 性能配置 */
  performance: PerformanceConfig
  /** 敌人配置 */
  enemies: EnemiesConfig
  /** 关卡配置 */
  stages: StageConfig[]
}


/**
 * 游戏完整配置接口
 * 包含所有可配置的游戏参数
 * 
 * 需求: 6.4.1-6.6.4
 */
export interface GameConfig {
  /** 基础参数（默认显示） */
  basic: BasicConfig
  /** 高级参数（需开启高级模式） */
  advanced: AdvancedConfig
}

/**
 * 游戏配置数据库记录接口
 * 对应数据库表: game_config
 */
export interface GameConfigRecord {
  /** 记录 ID（固定为 1，单行表） */
  id: 1
  /** 游戏是否启用 */
  enabled: boolean
  /** 调试模式是否开启 */
  debug_mode: boolean
  /** 完整的游戏配置 */
  config: GameConfig
  /** 更新时间 */
  updated_at: string
}

/**
 * 数据库原始行数据（JSON 字段为字符串）
 */
export interface GameConfigRow {
  id: number
  enabled: number  // SQLite 中布尔值存储为 0/1
  debug_mode: number
  config_json: string
  updated_at: string
}

// ========== 默认游戏配置 ==========

/**
 * 默认敌人类型配置
 * 与前端游戏 src/game/constants.ts 中的 ENEMY_CONFIGS 保持一致
 */
export const DEFAULT_ENEMY_CONFIGS: Record<EnemyType, EnemyTypeConfig> = {
  [EnemyType.WHITE]: {
    health: 2,
    speed: 2,
    attackPower: 1,
    machineGun: {
      bulletsPerShot: 1,
      bulletDamage: 2,
      bulletSpeed: 20,
      fireRate: 3000,
      trajectories: 1
    },
    dropRates: {
      machineGun: 0.2,
      missile: 0.1,
      repair: 0.25,
      engine: 0.1
    }
  },
  [EnemyType.GREEN]: {
    health: 5,
    speed: 2,
    attackPower: 1,
    machineGun: {
      bulletsPerShot: 1,
      bulletDamage: 2,
      bulletSpeed: 20,
      fireRate: 3000,
      trajectories: 1
    },
    dropRates: {
      machineGun: 0.2,
      missile: 0.1,
      repair: 0.25,
      engine: 0.1
    }
  },
  [EnemyType.BLUE]: {
    health: 8,
    speed: 2,
    attackPower: 1,
    machineGun: {
      bulletsPerShot: 1,
      bulletDamage: 3,
      bulletSpeed: 20,
      fireRate: 3000,
      trajectories: 1
    },
    dropRates: {
      machineGun: 0.2,
      missile: 0.1,
      repair: 0.25,
      engine: 0.1
    }
  },
  [EnemyType.PURPLE]: {
    health: 8,
    speed: 3,
    attackPower: 1,
    machineGun: {
      bulletsPerShot: 4,
      bulletDamage: 3,
      bulletSpeed: 22,
      fireRate: 3000,
      trajectories: 1
    },
    dropRates: {
      machineGun: 0.2,
      missile: 0.1,
      repair: 0.25,
      engine: 0.1
    }
  },
  [EnemyType.YELLOW]: {
    health: 6,
    speed: 6,
    attackPower: 1,
    machineGun: {
      bulletsPerShot: 1,
      bulletDamage: 3,
      bulletSpeed: 20,
      fireRate: 3000,
      trajectories: 1
    },
    dropRates: {
      machineGun: 0.2,
      missile: 0.1,
      repair: 0.25,
      engine: 0.1
    }
  },
  [EnemyType.ORANGE]: {
    health: 12,
    speed: 2,
    attackPower: 1,
    machineGun: {
      bulletsPerShot: 4,
      bulletDamage: 3,
      bulletSpeed: 20,
      fireRate: 3000,
      trajectories: 3
    },
    dropRates: {
      machineGun: 0.2,
      missile: 0.1,
      repair: 0.25,
      engine: 0.1
    }
  },
  [EnemyType.RED]: {
    health: 20,
    speed: 1,
    attackPower: 1,
    machineGun: {
      bulletsPerShot: 6,
      bulletDamage: 3,
      bulletSpeed: 20,
      fireRate: 3000,
      trajectories: 3
    },
    missileLauncher: {
      missileCount: Infinity,
      missileDamage: 5,
      missileSpeed: 12,
      explosionRadius: 3
    },
    dropRates: {
      machineGun: 0.2,
      missile: 0.1,
      repair: 0.25,
      engine: 0.1
    }
  }
}


/**
 * 默认关卡配置
 * 与前端游戏 src/game/constants.ts 中的 STAGES 保持一致
 */
export const DEFAULT_STAGES: StageConfig[] = [
  {
    id: 1,
    name: '家里',
    background: 'home-scene',
    enemyTypes: [EnemyType.WHITE, EnemyType.GREEN, EnemyType.BLUE],
    totalEnemies: 50,
    spawnRate: 3000,
    bossType: EnemyType.PURPLE
  },
  {
    id: 2,
    name: '学校',
    background: 'school-scene',
    enemyTypes: [EnemyType.WHITE, EnemyType.GREEN, EnemyType.BLUE, EnemyType.PURPLE, EnemyType.YELLOW],
    totalEnemies: 70,
    spawnRate: 2000,
    bossType: EnemyType.ORANGE
  },
  {
    id: 3,
    name: '公司',
    background: 'company-scene',
    enemyTypes: [EnemyType.PURPLE, EnemyType.YELLOW, EnemyType.ORANGE, EnemyType.RED],
    totalEnemies: 80,
    spawnRate: 1500,
    bossType: EnemyType.RED
  }
]

/**
 * 默认游戏配置
 * 
 * 需求: 6.6.2 - 提供"恢复默认值"按钮
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
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
    },
    enemies: {
      types: DEFAULT_ENEMY_CONFIGS,
      eliteMultiplier: 1.5,
      bossMultiplier: 2,
      finalBossMultiplier: 5,
      eliteSizeMultiplier: 1.2,
      bossSizeMultiplier: 1.5,
      finalBossSizeMultiplier: 2
    },
    stages: DEFAULT_STAGES
  }
}

// ========== 工具函数 ==========

/**
 * 将数据库行数据转换为 LeaderboardEntry（排行榜条目）接口
 */
export function parseLeaderboardRow(row: LeaderboardRow): LeaderboardEntry {
  return {
    id: row.id,
    player_name: row.player_name,
    score: row.score,
    stage: row.stage,
    play_time: row.play_time,
    created_at: row.created_at
  }
}

/**
 * 将数据库行数据转换为 Achievement（成就）接口
 */
export function parseAchievementRow(row: AchievementRow): Achievement {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    condition_type: row.condition_type as AchievementConditionType,
    condition_value: row.condition_value,
    sort_order: row.sort_order
  }
}

/**
 * 将数据库行数据转换为 GameConfigRecord（游戏配置记录）接口
 */
export function parseGameConfigRow(row: GameConfigRow): GameConfigRecord {
  return {
    id: 1,
    enabled: row.enabled === 1,
    debug_mode: row.debug_mode === 1,
    config: JSON.parse(row.config_json) as GameConfig,
    updated_at: row.updated_at
  }
}


// ========== 验证函数 ==========

/**
 * 验证成就条件类型是否有效
 */
export function isValidAchievementConditionType(type: string): type is AchievementConditionType {
  return ['score', 'stage', 'time', 'kills', 'combo', 'noDamage'].includes(type)
}

/**
 * 验证敌人类型是否有效
 */
export function isValidEnemyType(type: string): type is EnemyType {
  return Object.values(EnemyType).includes(type as EnemyType)
}

/**
 * 验证音量值是否有效（0.0-1.0）
 */
export function isValidVolume(volume: number): boolean {
  return typeof volume === 'number' && volume >= 0 && volume <= 1
}

/**
 * 验证正整数
 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

/**
 * 验证非负整数
 */
export function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

/**
 * 验证正数
 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && value > 0
}

/**
 * 验证非负数
 */
export function isNonNegativeNumber(value: number): boolean {
  return typeof value === 'number' && value >= 0
}

/**
 * 验证基础配置是否有效
 */
export function validateBasicConfig(config: BasicConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!isPositiveInteger(config.playerInitialHealth)) {
    errors.push('玩家初始生命值必须是正整数')
  }
  if (!isPositiveInteger(config.playerInitialSpeed)) {
    errors.push('玩家初始速度必须是正整数')
  }
  if (!isPositiveInteger(config.nukeMaxProgress)) {
    errors.push('核弹进度条最大值必须是正整数')
  }
  if (!isPositiveInteger(config.enemySpawnRate)) {
    errors.push('敌人生成速率必须是正整数')
  }
  if (!isPositiveInteger(config.stageTotalEnemies)) {
    errors.push('关卡敌人总数必须是正整数')
  }

  return { valid: errors.length === 0, errors }
}


/**
 * 验证成就输入数据
 */
export function validateAchievementInput(input: AchievementInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证 ID
  if (!input.id || input.id.trim().length === 0) {
    errors.push('成就 ID 不能为空')
  } else if (!/^[a-zA-Z0-9_-]+$/.test(input.id)) {
    errors.push('成就 ID 只能包含字母、数字、下划线和连字符')
  }

  // 验证名称
  if (!input.name || input.name.trim().length === 0) {
    errors.push('成就名称不能为空')
  } else if (input.name.length > 50) {
    errors.push('成就名称长度不能超过 50 个字符')
  }

  // 验证条件类型
  if (!isValidAchievementConditionType(input.condition_type)) {
    errors.push('无效的成就条件类型')
  }

  // 验证条件值
  if (!isPositiveInteger(input.condition_value)) {
    errors.push('成就条件值必须是正整数')
  }

  // 验证排序顺序（如果提供）
  if (input.sort_order !== undefined && !isNonNegativeInteger(input.sort_order)) {
    errors.push('排序顺序必须是非负整数')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 深度合并游戏配置
 * 用于将部分配置与默认配置合并
 * 
 * @param target - 目标配置（将被修改）
 * @param source - 源配置（部分配置）
 * @returns 合并后的配置
 */
export function deepMergeConfig<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target }

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key]
      const targetValue = target[key]

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        // 递归合并对象
        (result as Record<string, unknown>)[key] = deepMergeConfig(
          targetValue as object,
          sourceValue as object
        )
      } else if (sourceValue !== undefined) {
        // 直接赋值
        (result as Record<string, unknown>)[key] = sourceValue
      }
    }
  }

  return result
}


/**
 * 比较两个游戏配置，返回差异
 * 
 * 需求: 6.6.3 - 在修改参数时显示与默认值的差异
 * 
 * @param current - 当前配置
 * @param defaultConfig - 默认配置
 * @returns 差异对象，包含路径和值
 */
export function getConfigDiff(
  current: GameConfig,
  defaultConfig: GameConfig = DEFAULT_GAME_CONFIG
): Array<{ path: string; currentValue: unknown; defaultValue: unknown }> {
  const diffs: Array<{ path: string; currentValue: unknown; defaultValue: unknown }> = []

  function compare(currentObj: unknown, defaultObj: unknown, path: string): void {
    // 处理数组
    if (Array.isArray(currentObj) && Array.isArray(defaultObj)) {
      if (JSON.stringify(currentObj) !== JSON.stringify(defaultObj)) {
        diffs.push({ path, currentValue: currentObj, defaultValue: defaultObj })
      }
      return
    }

    // 处理对象
    if (
      currentObj !== null &&
      typeof currentObj === 'object' &&
      defaultObj !== null &&
      typeof defaultObj === 'object'
    ) {
      const currentKeys = Object.keys(currentObj as object)
      const defaultKeys = Object.keys(defaultObj as object)
      const allKeys = new Set([...currentKeys, ...defaultKeys])

      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key
        compare(
          (currentObj as Record<string, unknown>)[key],
          (defaultObj as Record<string, unknown>)[key],
          newPath
        )
      }
      return
    }

    // 处理基本类型
    if (currentObj !== defaultObj) {
      diffs.push({ path, currentValue: currentObj, defaultValue: defaultObj })
    }
  }

  compare(current, defaultConfig, '')

  return diffs
}

/**
 * 格式化游戏时长（秒）为可读字符串
 * 
 * @param seconds - 游戏时长（秒）
 * @returns 格式化后的字符串，如 "5分30秒"
 */
export function formatPlayTime(seconds: number | null): string {
  if (seconds === null || seconds < 0) {
    return '-'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${remainingSeconds}秒`
  }

  if (remainingSeconds === 0) {
    return `${minutes}分钟`
  }

  return `${minutes}分${remainingSeconds}秒`
}


/**
 * 创建默认的游戏配置记录
 * 用于数据库初始化
 */
export function createDefaultGameConfigRecord(): Omit<GameConfigRecord, 'updated_at'> {
  return {
    id: 1,
    enabled: true,
    debug_mode: false,
    config: DEFAULT_GAME_CONFIG
  }
}

/**
 * 将游戏配置序列化为 JSON 字符串
 * 
 * 需求: 6.6.4 - 提供参数导出功能（JSON 格式）
 * 
 * @param config - 游戏配置
 * @param pretty - 是否格式化输出
 * @returns JSON 字符串
 */
export function serializeGameConfig(config: GameConfig, pretty: boolean = true): string {
  return pretty ? JSON.stringify(config, null, 2) : JSON.stringify(config)
}

/**
 * 从 JSON 字符串反序列化游戏配置
 * 
 * 需求: 6.6.4 - 提供参数导入功能（JSON 格式）
 * 
 * @param json - JSON 字符串
 * @returns 游戏配置或 null（解析失败时）
 */
export function deserializeGameConfig(json: string): GameConfig | null {
  try {
    const parsed = JSON.parse(json)
    
    // 基本结构验证
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    
    if (!parsed.basic || typeof parsed.basic !== 'object') {
      return null
    }
    
    if (!parsed.advanced || typeof parsed.advanced !== 'object') {
      return null
    }
    
    // 验证基础配置
    const basicValidation = validateBasicConfig(parsed.basic)
    if (!basicValidation.valid) {
      return null
    }
    
    return parsed as GameConfig
  } catch {
    return null
  }
}

/**
 * 克隆游戏配置（深拷贝）
 * 
 * @param config - 原始配置
 * @returns 克隆后的配置
 */
export function cloneGameConfig(config: GameConfig): GameConfig {
  return JSON.parse(JSON.stringify(config))
}
