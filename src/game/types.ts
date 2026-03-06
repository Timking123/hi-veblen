/**
 * 游戏核心类型定义
 */

// ============= 枚举类型 =============

export enum EnemyType {
  WHITE = 'white',
  GREEN = 'green',
  BLUE = 'blue',
  PURPLE = 'purple',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red'
}

export enum PickupType {
  MACHINEGUN_BULLETS = 'machinegun-bullets',
  MACHINEGUN_TRAJECTORY = 'machinegun-trajectory',
  MACHINEGUN_FIRERATE = 'machinegun-firerate',
  MACHINEGUN_DAMAGE = 'machinegun-damage',
  MACHINEGUN_SPEED = 'machinegun-speed',
  MISSILE_COUNT = 'missile-count',
  MISSILE_DAMAGE = 'missile-damage',
  MISSILE_SPEED = 'missile-speed',
  REPAIR = 'repair',
  ENGINE = 'engine'
}

export enum GamePhase {
  IDLE = 'idle',
  COLLAPSE_ANIMATION = 'collapse-animation',
  CMD_WINDOW = 'cmd-window',
  RULES = 'rules',
  PLAYING = 'playing',
  CELEBRATION = 'celebration'
}

// ============= 基础实体接口 =============

export interface Entity {
  id: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean
  
  update(deltaTime: number): void
  render(ctx: CanvasRenderingContext2D): void
  onCollision(other: Entity): void
  destroy(): void
}

// ============= 武器配置 =============

export interface MachineGunConfig {
  bulletsPerShot: number
  trajectories: number
  fireRate: number // milliseconds
  bulletDamage: number
  bulletSpeed: number
}

export interface MissileLauncherConfig {
  missileCount: number
  missileDamage: number
  missileSpeed: number
  explosionRadius: number
}

// ============= 敌人配置 =============

export interface EnemyConfig {
  type: EnemyType
  health: number
  speed: number
  attackPower: number
  text: string
  isBoss: boolean
  isElite: boolean
  machineGun?: MachineGunConfig
  missileLauncher?: MissileLauncherConfig
  dropRates: {
    machineGun: number
    missile: number
    repair: number
    engine: number
  }
}

// ============= 游戏状态 =============

export interface PlayerState {
  x: number
  y: number
  health: number
  maxHealth: number
  speed: number
  machineGun: MachineGunConfig
  missileLauncher: MissileLauncherConfig
  upgrades: Upgrade[]
}

export interface Upgrade {
  type: PickupType
  appliedCount: number
}

export interface GameState {
  isActive: boolean
  isPaused: boolean
  currentStage: number
  player: PlayerState
  enemies: any[] // Will be Enemy[] after implementation
  projectiles: any[] // Will be (Bullet | Missile)[] after implementation
  pickups: any[] // Will be Pickup[] after implementation
  nukeProgress: number
  maxNukeProgress: number
}

// ============= 关卡配置 =============

export interface StageConfig {
  id: number
  name: string
  background: string
  enemyTypes: EnemyType[]
  totalEnemies: number
  spawnRate: number // milliseconds
  bossType: EnemyType
}

// ============= 碰撞检测 =============

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Circle {
  x: number
  y: number
  radius: number
}

// ============= 输入系统 =============

export interface KeyBindings {
  MOVE_UP: string
  MOVE_DOWN: string
  MOVE_LEFT: string
  MOVE_RIGHT: string
  FIRE_GUN: string
  FIRE_MISSILE: string
  LAUNCH_NUKE: string
}
