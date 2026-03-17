/**
 * 游戏常量和配置
 */

import type { EnemyConfig, StageConfig, KeyBindings, MachineGunConfig } from './types'
import { EnemyType } from './types'

// ============= 游戏基础配置 =============

export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  FPS: 60,
  PLAYER_INITIAL_HEALTH: 10,
  PLAYER_INITIAL_SPEED: 10, // 从 5 提升到 10（2 倍速度）
  NUKE_MAX_PROGRESS: 100
}

// ============= V2 游戏配置 =============

// 像素块配置
export const PIXEL_BLOCK_CONFIG = {
  SIZE: 8, // 每个像素块的大小（像素）
  PLAYER_SHIP: {
    WIDTH: 12, // 12 像素块
    HEIGHT: 8 // 8 像素块
  },
  ENEMY_TEXT: {
    NORMAL: 2, // 2x2 像素块
    ELITE: 3, // 3x3 像素块
    STAGE_BOSS: 4, // 4x4 像素块
    FINAL_BOSS: 5 // 5x5 像素块
  },
  PICKUP: 4 // 4x4 像素块
}

// 场景扩展配置
export const SCENE_CONFIG = {
  SCALE_MULTIPLIER: 1.5, // 场景扩大 50%
  CANVAS_WIDTH_V2: Math.floor(GAME_CONFIG.CANVAS_WIDTH * 1.5), // 1200
  CANVAS_HEIGHT_V2: Math.floor(GAME_CONFIG.CANVAS_HEIGHT * 1.5) // 900
}

// 移动配置
export const MOVEMENT_CONFIG = {
  PLAYER_MOVE_DISTANCE: PIXEL_BLOCK_CONFIG.SIZE * 2, // 2 像素块（从 1 像素块提升到 2 像素块，速度提升 2 倍）
  PLAYER_MOVE_INTERVAL: 100, // 长按移动间隔（ms）
  ENEMY_MOVE_INTERVAL: 500, // 敌人移动间隔（ms）
  ENEMY_DOWN_INTERVAL: 500 // 敌人下降间隔（ms）
}

// 射击配置
export const SHOOTING_CONFIG = {
  PLAYER_GUN_COOLDOWN: 200, // 玩家机炮冷却时间（ms）
  ENEMY_GUN_COOLDOWN: 1000, // 敌人机炮冷却时间（ms）
  BULLET_SPEED: PIXEL_BLOCK_CONFIG.SIZE / 100, // 1 像素块 / 100ms
  BULLET_MOVE_INTERVAL: 50, // 子弹移动间隔（ms）
  MISSILE_SPEED: PIXEL_BLOCK_CONFIG.SIZE / 150, // 1 像素块 / 150ms
  MISSILE_MOVE_INTERVAL: 80 // 导弹移动间隔（ms）
}

// 效果配置
export const EFFECT_CONFIG = {
  EXPLOSION_DURATION: 500, // 爆炸持续时间（ms）
  EXPLOSION_FRAMES: 8, // 爆炸动画帧数
  SCREEN_SHAKE_DURATION: 300, // 屏幕震动持续时间（ms）
  SCREEN_SHAKE_INTENSITY_MIN: 2, // 最小震动强度（像素）
  SCREEN_SHAKE_INTENSITY_MAX: 4 // 最大震动强度（像素）
}

// 音频配置
export const AUDIO_CONFIG = {
  // 背景音乐路径
  BACKGROUND_MUSIC: {
    STAGE_1: '/audio/music/stage1.mp3',
    STAGE_1_BOSS: '/audio/music/stage1_boss.mp3',
    STAGE_2: '/audio/music/stage2.mp3',
    STAGE_2_BOSS: '/audio/music/stage2_boss.mp3',
    STAGE_3: '/audio/music/stage3.mp3',
    FINAL_BOSS: '/audio/music/final_boss.mp3',
    VICTORY: '/audio/music/victory.mp3'
  },
  // 音效路径
  SOUND_EFFECTS: {
    // 武器音效
    PLAYER_GUN_FIRE: '/audio/sfx/player_gun_fire.mp3',
    PLAYER_MISSILE_FIRE: '/audio/sfx/player_missile_fire.mp3',
    BULLET_FLY: '/audio/sfx/bullet_fly.mp3',
    MISSILE_FLY: '/audio/sfx/missile_fly.mp3',
    BULLET_HIT: '/audio/sfx/bullet_hit.mp3',
    MISSILE_EXPLODE: '/audio/sfx/missile_explode.mp3',
    // 爆炸音效
    ENEMY_EXPLODE: '/audio/sfx/enemy_explode.mp3',
    ELITE_EXPLODE: '/audio/sfx/elite_explode.mp3',
    STAGE_BOSS_EXPLODE: '/audio/sfx/stage_boss_explode.mp3',
    FINAL_BOSS_EXPLODE: '/audio/sfx/final_boss_explode.mp3',
    PLAYER_EXPLODE: '/audio/sfx/player_explode.mp3',
    // 庆祝页面音效
    BALLOON_POP: '/audio/sfx/balloon_pop.mp3',
    BANNER_SHAKE: '/audio/sfx/banner_shake.mp3',
    CAKE_LIGHT: '/audio/sfx/cake_light.mp3',
    CARPET_ROLL: '/audio/sfx/carpet_roll.mp3',
    FIREWORK_LAUNCH: '/audio/sfx/firework_launch.mp3'
  },
  // 音量配置
  MUSIC_VOLUME: 0.5, // 0.0 - 1.0
  EFFECT_VOLUME: 0.7, // 0.0 - 1.0
  // 性能配置
  MAX_CONCURRENT_SOUNDS: 10, // 最大同时播放音效数
  AUDIO_POOL_SIZE: 5 // 音频对象池大小
}

// 性能配置
export const PERFORMANCE_CONFIG = {
  TARGET_FPS: 60,
  MAX_MEMORY_MB: 100,
  MEMORY_CHECK_INTERVAL: 5000, // 内存检查间隔（ms）
  CACHE_CLEANUP_THRESHOLD: 0.9 // 内存使用超过 90% 时清理缓存
}

// ============= 键位绑定 =============

export const KEY_BINDINGS: KeyBindings = {
  MOVE_UP: 'w',
  MOVE_DOWN: 's',
  MOVE_LEFT: 'a',
  MOVE_RIGHT: 'd',
  FIRE_GUN: 'j',
  FIRE_MISSILE: 'k',
  LAUNCH_NUKE: ' '
}

// ============= 像素风格配置 =============

export const PIXEL_STYLE = {
  fonts: {
    primary: '16px "Press Start 2P", monospace',
    enemy: '14px SimSun, serif', // 宋体
    ui: '12px "Press Start 2P", monospace',
    small: '10px "Press Start 2P", monospace'
  },
  colors: {
    player: '#00FF00',
    playerBullet: '#FFFF00',
    playerMissile: '#FF6600',
    enemyWhite: '#FFFFFF',
    enemyGreen: '#00FF00',
    enemyBlue: '#0099FF',
    enemyPurple: '#9933FF',
    enemyYellow: '#FFFF00',
    enemyOrange: '#FF9900',
    enemyRed: '#FF0000',
    background: '#000000',
    ui: '#00FF00',
    uiSecondary: '#00AA00',
    explosion: '#FF6600',
    nuke: '#FFFF00'
  },
  arcade: {
    borderWidth: 8,
    borderColor: '#8B4513',
    cornerRadius: 4,
    screenGlow: 'rgba(0, 255, 0, 0.1)'
  }
}

// ============= 初始武器配置 =============

export const INITIAL_MACHINE_GUN: MachineGunConfig = {
  bulletsPerShot: 1,
  trajectories: 1,
  fireRate: 3000,
  bulletDamage: 2,
  bulletSpeed: 20
}

export const INITIAL_MISSILE_LAUNCHER = {
  missileCount: 10,
  missileDamage: 7.5, // 从 5 提升到 7.5（1.5 倍）
  missileSpeed: 12,
  explosionRadius: 4.5 // 从 3 提升到 4.5（1.5 倍）
}

// ============= 敌人配置 =============

export const ENEMY_CONFIGS: Record<EnemyType, Omit<EnemyConfig, 'text' | 'isBoss' | 'isElite'>> = {
  [EnemyType.WHITE]: {
    type: EnemyType.WHITE,
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
    type: EnemyType.GREEN,
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
    type: EnemyType.BLUE,
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
    type: EnemyType.PURPLE,
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
    type: EnemyType.YELLOW,
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
    type: EnemyType.ORANGE,
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
    type: EnemyType.RED,
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
      missileDamage: 7.5, // 从 5 提升到 7.5（1.5 倍）
      missileSpeed: 12,
      explosionRadius: 4.5 // 从 3 提升到 4.5（1.5 倍）
    },
    dropRates: {
      machineGun: 0.2,
      missile: 0.1,
      repair: 0.25,
      engine: 0.1
    }
  }
}

// ============= 关卡配置 =============

export const STAGES: StageConfig[] = [
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

// ============= Boss和精英怪倍率 =============

export const ELITE_MULTIPLIER = 1.5
export const BOSS_MULTIPLIER = 2
export const FINAL_BOSS_MULTIPLIER = 5

export const ELITE_SIZE_MULTIPLIER = 1.2
export const BOSS_SIZE_MULTIPLIER = 1.5
export const FINAL_BOSS_SIZE_MULTIPLIER = 2
