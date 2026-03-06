/**
 * 游戏管理属性测试
 * 
 * 使用属性测试验证游戏管理服务的通用正确性属性
 * 
 * **Feature: admin-system, Property 10: 游戏参数配置往返一致性**
 * 
 * 验证需求: 6.4.1-6.4.5, 6.5.2, 6.6.1, 6.6.4
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import * as fc from 'fast-check'
import { initDatabase, closeDatabase } from '../database/init'
import {
  getGameConfig,
  updateGameConfig,
  exportConfig,
  importConfig,
  getDefaultGameConfig,
  resetGameConfig,
  setGameEnabled,
  setDebugMode,
  getLeaderboard,
  addLeaderboardEntry,
  resetLeaderboard
} from '../services/game'
import {
  GameConfig,
  BasicConfig,
  AdvancedConfig,
  SceneConfig,
  PlayerConfig,
  MovementConfig,
  ShootingConfig,
  EffectsConfig,
  AudioConfig,
  PerformanceConfig,
  EnemiesConfig,
  StageConfig,
  MachineGunConfig,
  MissileLauncherConfig,
  DropRates,
  EnemyTypeConfig,
  EnemyType,
  serializeGameConfig,
  deserializeGameConfig,
  cloneGameConfig
} from '../models/game'

// ========== 生成器定义 ==========

/**
 * 生成有效的机炮配置
 */
const machineGunConfigArb: fc.Arbitrary<MachineGunConfig> = fc.record({
  bulletsPerShot: fc.integer({ min: 1, max: 10 }),
  trajectories: fc.integer({ min: 1, max: 5 }),
  fireRate: fc.integer({ min: 100, max: 10000 }),
  bulletDamage: fc.integer({ min: 1, max: 100 }),
  bulletSpeed: fc.integer({ min: 1, max: 100 })
})

/**
 * 生成有效的导弹配置
 */
const missileLauncherConfigArb: fc.Arbitrary<MissileLauncherConfig> = fc.record({
  missileCount: fc.integer({ min: 1, max: 100 }),
  missileDamage: fc.integer({ min: 1, max: 100 }),
  missileSpeed: fc.integer({ min: 1, max: 50 }),
  explosionRadius: fc.integer({ min: 1, max: 10 })
})

/**
 * 生成有效的掉落概率配置
 */
const dropRatesArb: fc.Arbitrary<DropRates> = fc.record({
  machineGun: fc.double({ min: 0, max: 1, noNaN: true }),
  missile: fc.double({ min: 0, max: 1, noNaN: true }),
  repair: fc.double({ min: 0, max: 1, noNaN: true }),
  engine: fc.double({ min: 0, max: 1, noNaN: true })
})

/**
 * 生成有效的敌人类型配置
 */
const enemyTypeConfigArb: fc.Arbitrary<EnemyTypeConfig> = fc.record({
  health: fc.integer({ min: 1, max: 1000 }),
  speed: fc.integer({ min: 1, max: 20 }),
  attackPower: fc.integer({ min: 1, max: 50 }),
  machineGun: fc.option(machineGunConfigArb, { nil: undefined }),
  missileLauncher: fc.option(missileLauncherConfigArb, { nil: undefined }),
  dropRates: dropRatesArb
})

/**
 * 生成有效的基础配置
 * 
 * 需求: 6.4.1-6.4.5
 */
const basicConfigArb: fc.Arbitrary<BasicConfig> = fc.record({
  playerInitialHealth: fc.integer({ min: 1, max: 100 }),
  playerInitialSpeed: fc.integer({ min: 1, max: 20 }),
  nukeMaxProgress: fc.integer({ min: 10, max: 1000 }),
  enemySpawnRate: fc.integer({ min: 100, max: 10000 }),
  stageTotalEnemies: fc.integer({ min: 1, max: 500 })
})

/**
 * 生成有效的场景配置
 */
const sceneConfigArb: fc.Arbitrary<SceneConfig> = fc.record({
  canvasWidth: fc.integer({ min: 320, max: 1920 }),
  canvasHeight: fc.integer({ min: 240, max: 1080 }),
  scaleMultiplier: fc.double({ min: 0.5, max: 3, noNaN: true }),
  pixelBlockSize: fc.integer({ min: 4, max: 16 })
})

/**
 * 生成有效的玩家配置
 * 
 * 需求: 6.5.2
 */
const playerConfigArb: fc.Arbitrary<PlayerConfig> = fc.record({
  moveDistance: fc.integer({ min: 1, max: 32 }),
  moveInterval: fc.integer({ min: 10, max: 500 }),
  collisionWidth: fc.integer({ min: 16, max: 256 }),
  collisionHeight: fc.integer({ min: 16, max: 256 }),
  initialMachineGun: machineGunConfigArb,
  initialMissileLauncher: missileLauncherConfigArb
})

/**
 * 生成有效的移动配置
 */
const movementConfigArb: fc.Arbitrary<MovementConfig> = fc.record({
  enemyMoveInterval: fc.integer({ min: 50, max: 2000 }),
  enemyDownInterval: fc.integer({ min: 50, max: 2000 }),
  pickupMoveSpeed: fc.integer({ min: 1, max: 10 })
})

/**
 * 生成有效的射击配置
 */
const shootingConfigArb: fc.Arbitrary<ShootingConfig> = fc.record({
  playerGunCooldown: fc.integer({ min: 50, max: 1000 }),
  enemyGunCooldown: fc.integer({ min: 100, max: 5000 }),
  bulletSpeed: fc.double({ min: 0.01, max: 1, noNaN: true }),
  bulletMoveInterval: fc.integer({ min: 10, max: 200 }),
  missileSpeed: fc.double({ min: 0.01, max: 1, noNaN: true }),
  missileMoveInterval: fc.integer({ min: 10, max: 200 })
})

/**
 * 生成有效的效果配置
 */
const effectsConfigArb: fc.Arbitrary<EffectsConfig> = fc.record({
  explosionDuration: fc.integer({ min: 100, max: 2000 }),
  explosionFrames: fc.integer({ min: 1, max: 20 }),
  screenShakeDuration: fc.integer({ min: 50, max: 1000 }),
  screenShakeIntensityMin: fc.integer({ min: 1, max: 10 }),
  screenShakeIntensityMax: fc.integer({ min: 1, max: 20 })
})

/**
 * 生成有效的音频配置
 */
const audioConfigArb: fc.Arbitrary<AudioConfig> = fc.record({
  musicVolume: fc.double({ min: 0, max: 1, noNaN: true }),
  effectVolume: fc.double({ min: 0, max: 1, noNaN: true }),
  maxConcurrentSounds: fc.integer({ min: 1, max: 50 }),
  audioPoolSize: fc.integer({ min: 1, max: 20 })
})

/**
 * 生成有效的性能配置
 */
const performanceConfigArb: fc.Arbitrary<PerformanceConfig> = fc.record({
  targetFPS: fc.integer({ min: 30, max: 120 }),
  maxMemoryMB: fc.integer({ min: 50, max: 500 }),
  memoryCheckInterval: fc.integer({ min: 1000, max: 30000 }),
  cacheCleanupThreshold: fc.double({ min: 0.5, max: 1, noNaN: true })
})

/**
 * 生成有效的敌人类型枚举
 */
const enemyTypeArb: fc.Arbitrary<EnemyType> = fc.constantFrom(
  EnemyType.WHITE,
  EnemyType.GREEN,
  EnemyType.BLUE,
  EnemyType.PURPLE,
  EnemyType.YELLOW,
  EnemyType.ORANGE,
  EnemyType.RED
)

/**
 * 生成有效的关卡配置
 */
const stageConfigArb: fc.Arbitrary<StageConfig> = fc.record({
  id: fc.integer({ min: 1, max: 100 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  background: fc.string({ minLength: 1, maxLength: 50 }),
  enemyTypes: fc.array(enemyTypeArb, { minLength: 1, maxLength: 7 }),
  totalEnemies: fc.integer({ min: 1, max: 500 }),
  spawnRate: fc.integer({ min: 100, max: 10000 }),
  bossType: enemyTypeArb
})

/**
 * 生成有效的敌人配置
 */
const enemiesConfigArb: fc.Arbitrary<EnemiesConfig> = fc.record({
  types: fc.record({
    [EnemyType.WHITE]: enemyTypeConfigArb,
    [EnemyType.GREEN]: enemyTypeConfigArb,
    [EnemyType.BLUE]: enemyTypeConfigArb,
    [EnemyType.PURPLE]: enemyTypeConfigArb,
    [EnemyType.YELLOW]: enemyTypeConfigArb,
    [EnemyType.ORANGE]: enemyTypeConfigArb,
    [EnemyType.RED]: enemyTypeConfigArb
  }),
  eliteMultiplier: fc.double({ min: 1, max: 5, noNaN: true }),
  bossMultiplier: fc.double({ min: 1, max: 10, noNaN: true }),
  finalBossMultiplier: fc.double({ min: 1, max: 20, noNaN: true }),
  eliteSizeMultiplier: fc.double({ min: 1, max: 3, noNaN: true }),
  bossSizeMultiplier: fc.double({ min: 1, max: 5, noNaN: true }),
  finalBossSizeMultiplier: fc.double({ min: 1, max: 10, noNaN: true })
})

/**
 * 生成有效的高级配置
 * 
 * 需求: 6.5.2, 6.6.1
 */
const advancedConfigArb: fc.Arbitrary<AdvancedConfig> = fc.record({
  scene: sceneConfigArb,
  player: playerConfigArb,
  movement: movementConfigArb,
  shooting: shootingConfigArb,
  effects: effectsConfigArb,
  audio: audioConfigArb,
  performance: performanceConfigArb,
  enemies: enemiesConfigArb,
  stages: fc.array(stageConfigArb, { minLength: 1, maxLength: 10 })
})

/**
 * 生成有效的完整游戏配置
 * 
 * 需求: 6.4.1-6.4.5, 6.5.2, 6.6.1
 */
const gameConfigArb: fc.Arbitrary<GameConfig> = fc.record({
  basic: basicConfigArb,
  advanced: advancedConfigArb
})

// ========== 测试套件 ==========

describe('游戏管理属性测试', () => {
  /**
   * Property 10: 游戏参数配置往返一致性
   * 
   * 对于任意有效的游戏配置，保存后再读取应该得到等价的配置；
   * 导出为 JSON 后再导入应该得到等价的配置。
   * 
   * **Validates: Requirements 6.4.1-6.4.5, 6.5.2, 6.6.1, 6.6.4**
   */
  describe('Property 10: 游戏参数配置往返一致性', () => {
    describe('数据库存储往返一致性', () => {
      it('保存游戏配置后读取应该得到等价的配置', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            (config) => {
              initDatabase(':memory:')
              try {
                // 保存配置
                const updateResult = updateGameConfig(config)
                expect(updateResult.success).toBe(true)

                // 读取配置
                const retrieved = getGameConfig()
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  // 验证基础配置
                  expect(retrieved.config.basic.playerInitialHealth).toBe(config.basic.playerInitialHealth)
                  expect(retrieved.config.basic.playerInitialSpeed).toBe(config.basic.playerInitialSpeed)
                  expect(retrieved.config.basic.nukeMaxProgress).toBe(config.basic.nukeMaxProgress)
                  expect(retrieved.config.basic.enemySpawnRate).toBe(config.basic.enemySpawnRate)
                  expect(retrieved.config.basic.stageTotalEnemies).toBe(config.basic.stageTotalEnemies)

                  // 验证高级配置 - 场景
                  expect(retrieved.config.advanced.scene.canvasWidth).toBe(config.advanced.scene.canvasWidth)
                  expect(retrieved.config.advanced.scene.canvasHeight).toBe(config.advanced.scene.canvasHeight)
                  expect(retrieved.config.advanced.scene.pixelBlockSize).toBe(config.advanced.scene.pixelBlockSize)

                  // 验证高级配置 - 玩家
                  expect(retrieved.config.advanced.player.moveDistance).toBe(config.advanced.player.moveDistance)
                  expect(retrieved.config.advanced.player.moveInterval).toBe(config.advanced.player.moveInterval)
                  expect(retrieved.config.advanced.player.collisionWidth).toBe(config.advanced.player.collisionWidth)
                  expect(retrieved.config.advanced.player.collisionHeight).toBe(config.advanced.player.collisionHeight)

                  // 验证高级配置 - 关卡数量
                  expect(retrieved.config.advanced.stages.length).toBe(config.advanced.stages.length)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })

      it('多次更新配置后应该保留最新的配置', () => {
        fc.assert(
          fc.property(
            fc.array(gameConfigArb, { minLength: 2, maxLength: 5 }),
            (configs) => {
              initDatabase(':memory:')
              try {
                // 依次更新配置
                for (const config of configs) {
                  const result = updateGameConfig(config)
                  expect(result.success).toBe(true)
                }

                // 读取最终配置
                const retrieved = getGameConfig()
                expect(retrieved).not.toBeNull()

                // 验证是最后一个配置
                const lastConfig = configs[configs.length - 1]
                if (retrieved) {
                  expect(retrieved.config.basic.playerInitialHealth).toBe(lastConfig.basic.playerInitialHealth)
                  expect(retrieved.config.basic.playerInitialSpeed).toBe(lastConfig.basic.playerInitialSpeed)
                  expect(retrieved.config.advanced.stages.length).toBe(lastConfig.advanced.stages.length)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('JSON 导出/导入往返一致性', () => {
      it('导出为 JSON 后再导入应该得到等价的配置', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            (config) => {
              initDatabase(':memory:')
              try {
                // 先保存配置
                updateGameConfig(config)

                // 导出配置
                const exportResult = exportConfig(true)
                expect(exportResult.success).toBe(true)
                expect(exportResult.json).toBeDefined()

                // 导入配置
                const importResult = importConfig(exportResult.json!)
                expect(importResult.success).toBe(true)

                // 读取导入后的配置
                const retrieved = getGameConfig()
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  // 验证基础配置
                  expect(retrieved.config.basic.playerInitialHealth).toBe(config.basic.playerInitialHealth)
                  expect(retrieved.config.basic.playerInitialSpeed).toBe(config.basic.playerInitialSpeed)
                  expect(retrieved.config.basic.nukeMaxProgress).toBe(config.basic.nukeMaxProgress)
                  expect(retrieved.config.basic.enemySpawnRate).toBe(config.basic.enemySpawnRate)
                  expect(retrieved.config.basic.stageTotalEnemies).toBe(config.basic.stageTotalEnemies)

                  // 验证高级配置
                  expect(retrieved.config.advanced.scene.canvasWidth).toBe(config.advanced.scene.canvasWidth)
                  expect(retrieved.config.advanced.player.moveDistance).toBe(config.advanced.player.moveDistance)
                  expect(retrieved.config.advanced.stages.length).toBe(config.advanced.stages.length)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })

      it('序列化后反序列化应该得到等价的配置', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            (config) => {
              // 序列化
              const json = serializeGameConfig(config, true)
              expect(json).toBeTruthy()

              // 反序列化
              const deserialized = deserializeGameConfig(json)
              expect(deserialized).not.toBeNull()

              if (deserialized) {
                // 验证基础配置
                expect(deserialized.basic.playerInitialHealth).toBe(config.basic.playerInitialHealth)
                expect(deserialized.basic.playerInitialSpeed).toBe(config.basic.playerInitialSpeed)
                expect(deserialized.basic.nukeMaxProgress).toBe(config.basic.nukeMaxProgress)
                expect(deserialized.basic.enemySpawnRate).toBe(config.basic.enemySpawnRate)
                expect(deserialized.basic.stageTotalEnemies).toBe(config.basic.stageTotalEnemies)

                // 验证高级配置
                expect(deserialized.advanced.scene.canvasWidth).toBe(config.advanced.scene.canvasWidth)
                expect(deserialized.advanced.scene.canvasHeight).toBe(config.advanced.scene.canvasHeight)
                expect(deserialized.advanced.player.moveDistance).toBe(config.advanced.player.moveDistance)
                expect(deserialized.advanced.stages.length).toBe(config.advanced.stages.length)
              }
            }
          ),
          { numRuns: 20 }
        )
      })

      it('非格式化和格式化的 JSON 导出应该产生等价的配置', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            (config) => {
              // 格式化导出
              const prettyJson = serializeGameConfig(config, true)
              // 非格式化导出
              const compactJson = serializeGameConfig(config, false)

              // 两者反序列化后应该等价
              const prettyDeserialized = deserializeGameConfig(prettyJson)
              const compactDeserialized = deserializeGameConfig(compactJson)

              expect(prettyDeserialized).not.toBeNull()
              expect(compactDeserialized).not.toBeNull()

              if (prettyDeserialized && compactDeserialized) {
                expect(prettyDeserialized.basic).toEqual(compactDeserialized.basic)
                expect(prettyDeserialized.advanced.scene).toEqual(compactDeserialized.advanced.scene)
                expect(prettyDeserialized.advanced.player).toEqual(compactDeserialized.advanced.player)
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('克隆配置一致性', () => {
      it('克隆配置应该得到等价但独立的配置', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            (config) => {
              // 克隆配置
              const cloned = cloneGameConfig(config)

              // 验证等价性
              expect(cloned.basic.playerInitialHealth).toBe(config.basic.playerInitialHealth)
              expect(cloned.basic.playerInitialSpeed).toBe(config.basic.playerInitialSpeed)
              expect(cloned.advanced.scene.canvasWidth).toBe(config.advanced.scene.canvasWidth)
              expect(cloned.advanced.stages.length).toBe(config.advanced.stages.length)

              // 验证独立性（修改克隆不影响原始）
              cloned.basic.playerInitialHealth = 999
              expect(config.basic.playerInitialHealth).not.toBe(999)
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('基础配置往返一致性', () => {
      it('只更新基础配置应该保留高级配置', () => {
        fc.assert(
          fc.property(
            basicConfigArb,
            basicConfigArb,
            (initialBasic, newBasic) => {
              initDatabase(':memory:')
              try {
                // 获取默认配置
                const defaultConfig = getDefaultGameConfig()

                // 设置初始配置
                const initialConfig: GameConfig = {
                  basic: initialBasic,
                  advanced: defaultConfig.advanced
                }
                updateGameConfig(initialConfig)

                // 更新基础配置
                const updatedConfig: GameConfig = {
                  basic: newBasic,
                  advanced: defaultConfig.advanced
                }
                updateGameConfig(updatedConfig)

                // 读取配置
                const retrieved = getGameConfig()
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  // 验证基础配置已更新
                  expect(retrieved.config.basic.playerInitialHealth).toBe(newBasic.playerInitialHealth)
                  expect(retrieved.config.basic.playerInitialSpeed).toBe(newBasic.playerInitialSpeed)

                  // 验证高级配置保持不变
                  expect(retrieved.config.advanced.scene.canvasWidth).toBe(defaultConfig.advanced.scene.canvasWidth)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('关卡配置往返一致性', () => {
      it('关卡配置保存后应该保持顺序和内容', () => {
        fc.assert(
          fc.property(
            fc.array(stageConfigArb, { minLength: 1, maxLength: 5 }),
            (stages) => {
              initDatabase(':memory:')
              try {
                const defaultConfig = getDefaultGameConfig()
                const config: GameConfig = {
                  basic: defaultConfig.basic,
                  advanced: {
                    ...defaultConfig.advanced,
                    stages: stages
                  }
                }

                // 保存配置
                updateGameConfig(config)

                // 读取配置
                const retrieved = getGameConfig()
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  // 验证关卡数量
                  expect(retrieved.config.advanced.stages.length).toBe(stages.length)

                  // 验证每个关卡的内容
                  for (let i = 0; i < stages.length; i++) {
                    expect(retrieved.config.advanced.stages[i].id).toBe(stages[i].id)
                    expect(retrieved.config.advanced.stages[i].name).toBe(stages[i].name)
                    expect(retrieved.config.advanced.stages[i].totalEnemies).toBe(stages[i].totalEnemies)
                    expect(retrieved.config.advanced.stages[i].spawnRate).toBe(stages[i].spawnRate)
                    expect(retrieved.config.advanced.stages[i].bossType).toBe(stages[i].bossType)
                  }
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('敌人配置往返一致性', () => {
      it('敌人类型配置保存后应该保持完整', () => {
        fc.assert(
          fc.property(
            enemiesConfigArb,
            (enemies) => {
              initDatabase(':memory:')
              try {
                const defaultConfig = getDefaultGameConfig()
                const config: GameConfig = {
                  basic: defaultConfig.basic,
                  advanced: {
                    ...defaultConfig.advanced,
                    enemies: enemies
                  }
                }

                // 保存配置
                updateGameConfig(config)

                // 读取配置
                const retrieved = getGameConfig()
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  // 验证敌人倍率配置
                  expect(retrieved.config.advanced.enemies.eliteMultiplier).toBe(enemies.eliteMultiplier)
                  expect(retrieved.config.advanced.enemies.bossMultiplier).toBe(enemies.bossMultiplier)
                  expect(retrieved.config.advanced.enemies.finalBossMultiplier).toBe(enemies.finalBossMultiplier)

                  // 验证每种敌人类型的配置
                  for (const enemyType of Object.values(EnemyType)) {
                    const originalEnemy = enemies.types[enemyType]
                    const retrievedEnemy = retrieved.config.advanced.enemies.types[enemyType]

                    expect(retrievedEnemy.health).toBe(originalEnemy.health)
                    expect(retrievedEnemy.speed).toBe(originalEnemy.speed)
                    expect(retrievedEnemy.attackPower).toBe(originalEnemy.attackPower)
                  }
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('音频和性能配置往返一致性', () => {
      it('音频配置保存后应该保持精度', () => {
        fc.assert(
          fc.property(
            audioConfigArb,
            (audio) => {
              initDatabase(':memory:')
              try {
                const defaultConfig = getDefaultGameConfig()
                const config: GameConfig = {
                  basic: defaultConfig.basic,
                  advanced: {
                    ...defaultConfig.advanced,
                    audio: audio
                  }
                }

                // 保存配置
                updateGameConfig(config)

                // 读取配置
                const retrieved = getGameConfig()
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  // 验证音频配置（浮点数比较）
                  expect(retrieved.config.advanced.audio.musicVolume).toBeCloseTo(audio.musicVolume, 10)
                  expect(retrieved.config.advanced.audio.effectVolume).toBeCloseTo(audio.effectVolume, 10)
                  expect(retrieved.config.advanced.audio.maxConcurrentSounds).toBe(audio.maxConcurrentSounds)
                  expect(retrieved.config.advanced.audio.audioPoolSize).toBe(audio.audioPoolSize)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })

      it('性能配置保存后应该保持完整', () => {
        fc.assert(
          fc.property(
            performanceConfigArb,
            (performance) => {
              initDatabase(':memory:')
              try {
                const defaultConfig = getDefaultGameConfig()
                const config: GameConfig = {
                  basic: defaultConfig.basic,
                  advanced: {
                    ...defaultConfig.advanced,
                    performance: performance
                  }
                }

                // 保存配置
                updateGameConfig(config)

                // 读取配置
                const retrieved = getGameConfig()
                expect(retrieved).not.toBeNull()

                if (retrieved) {
                  expect(retrieved.config.advanced.performance.targetFPS).toBe(performance.targetFPS)
                  expect(retrieved.config.advanced.performance.maxMemoryMB).toBe(performance.maxMemoryMB)
                  expect(retrieved.config.advanced.performance.memoryCheckInterval).toBe(performance.memoryCheckInterval)
                  expect(retrieved.config.advanced.performance.cacheCleanupThreshold).toBeCloseTo(performance.cacheCleanupThreshold, 10)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })
  })

  /**
   * Property 11: 游戏配置恢复默认值正确性
   * 
   * 对于任意已修改的游戏配置，执行恢复默认值操作后，配置应该等于预定义的默认配置。
   * 
   * **Validates: Requirements 6.6.2**
   */
  describe('Property 11: 游戏配置恢复默认值正确性', () => {
    describe('恢复默认值后配置等于预定义默认配置', () => {
      it('任意修改的游戏配置恢复默认值后应该等于 DEFAULT_GAME_CONFIG', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            (modifiedConfig) => {
              initDatabase(':memory:')
              try {
                // 获取预定义的默认配置
                const defaultConfig = getDefaultGameConfig()

                // 先保存修改后的配置
                const updateResult = updateGameConfig(modifiedConfig)
                expect(updateResult.success).toBe(true)

                // 验证配置已被修改（可能与默认值不同）
                const beforeReset = getGameConfig()
                expect(beforeReset).not.toBeNull()

                // 执行恢复默认值操作
                const resetResult = resetGameConfig()
                expect(resetResult.success).toBe(true)

                // 读取恢复后的配置
                const afterReset = getGameConfig()
                expect(afterReset).not.toBeNull()

                if (afterReset) {
                  // 验证基础配置等于默认值
                  expect(afterReset.config.basic.playerInitialHealth).toBe(defaultConfig.basic.playerInitialHealth)
                  expect(afterReset.config.basic.playerInitialSpeed).toBe(defaultConfig.basic.playerInitialSpeed)
                  expect(afterReset.config.basic.nukeMaxProgress).toBe(defaultConfig.basic.nukeMaxProgress)
                  expect(afterReset.config.basic.enemySpawnRate).toBe(defaultConfig.basic.enemySpawnRate)
                  expect(afterReset.config.basic.stageTotalEnemies).toBe(defaultConfig.basic.stageTotalEnemies)

                  // 验证高级配置 - 场景
                  expect(afterReset.config.advanced.scene.canvasWidth).toBe(defaultConfig.advanced.scene.canvasWidth)
                  expect(afterReset.config.advanced.scene.canvasHeight).toBe(defaultConfig.advanced.scene.canvasHeight)
                  expect(afterReset.config.advanced.scene.scaleMultiplier).toBe(defaultConfig.advanced.scene.scaleMultiplier)
                  expect(afterReset.config.advanced.scene.pixelBlockSize).toBe(defaultConfig.advanced.scene.pixelBlockSize)

                  // 验证高级配置 - 玩家
                  expect(afterReset.config.advanced.player.moveDistance).toBe(defaultConfig.advanced.player.moveDistance)
                  expect(afterReset.config.advanced.player.moveInterval).toBe(defaultConfig.advanced.player.moveInterval)
                  expect(afterReset.config.advanced.player.collisionWidth).toBe(defaultConfig.advanced.player.collisionWidth)
                  expect(afterReset.config.advanced.player.collisionHeight).toBe(defaultConfig.advanced.player.collisionHeight)

                  // 验证高级配置 - 移动
                  expect(afterReset.config.advanced.movement.enemyMoveInterval).toBe(defaultConfig.advanced.movement.enemyMoveInterval)
                  expect(afterReset.config.advanced.movement.enemyDownInterval).toBe(defaultConfig.advanced.movement.enemyDownInterval)
                  expect(afterReset.config.advanced.movement.pickupMoveSpeed).toBe(defaultConfig.advanced.movement.pickupMoveSpeed)

                  // 验证高级配置 - 射击
                  expect(afterReset.config.advanced.shooting.playerGunCooldown).toBe(defaultConfig.advanced.shooting.playerGunCooldown)
                  expect(afterReset.config.advanced.shooting.enemyGunCooldown).toBe(defaultConfig.advanced.shooting.enemyGunCooldown)
                  expect(afterReset.config.advanced.shooting.bulletSpeed).toBe(defaultConfig.advanced.shooting.bulletSpeed)
                  expect(afterReset.config.advanced.shooting.bulletMoveInterval).toBe(defaultConfig.advanced.shooting.bulletMoveInterval)

                  // 验证高级配置 - 效果
                  expect(afterReset.config.advanced.effects.explosionDuration).toBe(defaultConfig.advanced.effects.explosionDuration)
                  expect(afterReset.config.advanced.effects.explosionFrames).toBe(defaultConfig.advanced.effects.explosionFrames)
                  expect(afterReset.config.advanced.effects.screenShakeDuration).toBe(defaultConfig.advanced.effects.screenShakeDuration)

                  // 验证高级配置 - 音频
                  expect(afterReset.config.advanced.audio.musicVolume).toBe(defaultConfig.advanced.audio.musicVolume)
                  expect(afterReset.config.advanced.audio.effectVolume).toBe(defaultConfig.advanced.audio.effectVolume)
                  expect(afterReset.config.advanced.audio.maxConcurrentSounds).toBe(defaultConfig.advanced.audio.maxConcurrentSounds)

                  // 验证高级配置 - 性能
                  expect(afterReset.config.advanced.performance.targetFPS).toBe(defaultConfig.advanced.performance.targetFPS)
                  expect(afterReset.config.advanced.performance.maxMemoryMB).toBe(defaultConfig.advanced.performance.maxMemoryMB)
                  expect(afterReset.config.advanced.performance.memoryCheckInterval).toBe(defaultConfig.advanced.performance.memoryCheckInterval)

                  // 验证高级配置 - 敌人倍率
                  expect(afterReset.config.advanced.enemies.eliteMultiplier).toBe(defaultConfig.advanced.enemies.eliteMultiplier)
                  expect(afterReset.config.advanced.enemies.bossMultiplier).toBe(defaultConfig.advanced.enemies.bossMultiplier)
                  expect(afterReset.config.advanced.enemies.finalBossMultiplier).toBe(defaultConfig.advanced.enemies.finalBossMultiplier)

                  // 验证高级配置 - 关卡数量
                  expect(afterReset.config.advanced.stages.length).toBe(defaultConfig.advanced.stages.length)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })

      it('多次修改后恢复默认值应该始终等于 DEFAULT_GAME_CONFIG', () => {
        fc.assert(
          fc.property(
            fc.array(gameConfigArb, { minLength: 1, maxLength: 5 }),
            (configSequence) => {
              initDatabase(':memory:')
              try {
                const defaultConfig = getDefaultGameConfig()

                // 依次应用多个配置修改
                for (const config of configSequence) {
                  const result = updateGameConfig(config)
                  expect(result.success).toBe(true)
                }

                // 执行恢复默认值操作
                const resetResult = resetGameConfig()
                expect(resetResult.success).toBe(true)

                // 读取恢复后的配置
                const afterReset = getGameConfig()
                expect(afterReset).not.toBeNull()

                if (afterReset) {
                  // 验证完整的基础配置
                  expect(afterReset.config.basic).toEqual(defaultConfig.basic)

                  // 验证高级配置的关键部分
                  expect(afterReset.config.advanced.scene).toEqual(defaultConfig.advanced.scene)
                  expect(afterReset.config.advanced.movement).toEqual(defaultConfig.advanced.movement)
                  expect(afterReset.config.advanced.shooting).toEqual(defaultConfig.advanced.shooting)
                  expect(afterReset.config.advanced.effects).toEqual(defaultConfig.advanced.effects)
                  expect(afterReset.config.advanced.audio).toEqual(defaultConfig.advanced.audio)
                  expect(afterReset.config.advanced.performance).toEqual(defaultConfig.advanced.performance)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('恢复默认值操作的幂等性', () => {
      it('连续多次恢复默认值应该得到相同的结果', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            fc.integer({ min: 2, max: 5 }),
            (modifiedConfig, resetCount) => {
              initDatabase(':memory:')
              try {
                const defaultConfig = getDefaultGameConfig()

                // 先保存修改后的配置
                updateGameConfig(modifiedConfig)

                // 连续多次恢复默认值
                for (let i = 0; i < resetCount; i++) {
                  const resetResult = resetGameConfig()
                  expect(resetResult.success).toBe(true)
                }

                // 读取最终配置
                const finalConfig = getGameConfig()
                expect(finalConfig).not.toBeNull()

                if (finalConfig) {
                  // 验证配置等于默认值
                  expect(finalConfig.config.basic).toEqual(defaultConfig.basic)
                  expect(finalConfig.config.advanced.scene).toEqual(defaultConfig.advanced.scene)
                  expect(finalConfig.config.advanced.player.moveDistance).toBe(defaultConfig.advanced.player.moveDistance)
                  expect(finalConfig.config.advanced.player.moveInterval).toBe(defaultConfig.advanced.player.moveInterval)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('恢复默认值不影响其他游戏设置', () => {
      it('恢复默认值应该保留 enabled 和 debug_mode 设置', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            fc.boolean(),
            fc.boolean(),
            (modifiedConfig, enabled, debugMode) => {
              initDatabase(':memory:')
              try {
                // 先保存修改后的配置
                updateGameConfig(modifiedConfig)

                // 设置 enabled 和 debug_mode
                setGameEnabled(enabled)
                setDebugMode(debugMode)

                // 执行恢复默认值操作
                const resetResult = resetGameConfig()
                expect(resetResult.success).toBe(true)

                // 读取恢复后的配置
                const afterReset = getGameConfig()
                expect(afterReset).not.toBeNull()

                if (afterReset) {
                  // 验证 enabled 和 debug_mode 保持不变
                  expect(afterReset.enabled).toBe(enabled)
                  expect(afterReset.debug_mode).toBe(debugMode)

                  // 验证配置已恢复为默认值
                  const defaultConfig = getDefaultGameConfig()
                  expect(afterReset.config.basic).toEqual(defaultConfig.basic)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('恢复默认值后的配置完整性', () => {
      it('恢复默认值后所有敌人类型配置应该等于默认值', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            (modifiedConfig) => {
              initDatabase(':memory:')
              try {
                const defaultConfig = getDefaultGameConfig()

                // 先保存修改后的配置
                updateGameConfig(modifiedConfig)

                // 执行恢复默认值操作
                resetGameConfig()

                // 读取恢复后的配置
                const afterReset = getGameConfig()
                expect(afterReset).not.toBeNull()

                if (afterReset) {
                  // 验证每种敌人类型的配置
                  for (const enemyType of Object.values(EnemyType)) {
                    const defaultEnemy = defaultConfig.advanced.enemies.types[enemyType]
                    const resetEnemy = afterReset.config.advanced.enemies.types[enemyType]

                    expect(resetEnemy.health).toBe(defaultEnemy.health)
                    expect(resetEnemy.speed).toBe(defaultEnemy.speed)
                    expect(resetEnemy.attackPower).toBe(defaultEnemy.attackPower)
                    expect(resetEnemy.dropRates).toEqual(defaultEnemy.dropRates)
                  }
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })

      it('恢复默认值后所有关卡配置应该等于默认值', () => {
        fc.assert(
          fc.property(
            gameConfigArb,
            (modifiedConfig) => {
              initDatabase(':memory:')
              try {
                const defaultConfig = getDefaultGameConfig()

                // 先保存修改后的配置
                updateGameConfig(modifiedConfig)

                // 执行恢复默认值操作
                resetGameConfig()

                // 读取恢复后的配置
                const afterReset = getGameConfig()
                expect(afterReset).not.toBeNull()

                if (afterReset) {
                  // 验证关卡数量
                  expect(afterReset.config.advanced.stages.length).toBe(defaultConfig.advanced.stages.length)

                  // 验证每个关卡的配置
                  for (let i = 0; i < defaultConfig.advanced.stages.length; i++) {
                    const defaultStage = defaultConfig.advanced.stages[i]
                    const resetStage = afterReset.config.advanced.stages[i]

                    expect(resetStage.id).toBe(defaultStage.id)
                    expect(resetStage.name).toBe(defaultStage.name)
                    expect(resetStage.background).toBe(defaultStage.background)
                    expect(resetStage.totalEnemies).toBe(defaultStage.totalEnemies)
                    expect(resetStage.spawnRate).toBe(defaultStage.spawnRate)
                    expect(resetStage.bossType).toBe(defaultStage.bossType)
                    expect(resetStage.enemyTypes).toEqual(defaultStage.enemyTypes)
                  }
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })
  })

  /**
   * Property 12: 排行榜排序正确性
   * 
   * 对于任意排行榜数据集合，返回的排行榜应该按分数降序排列。
   * 
   * **Feature: admin-system, Property 12: 排行榜排序正确性**
   * 
   * **Validates: Requirements 6.1.1**
   */
  describe('Property 12: 排行榜排序正确性', () => {
    /**
     * 生成有效的玩家名称
     * 玩家名称长度限制为 1-50 个字符
     */
    const playerNameArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length > 0)

    /**
     * 生成有效的分数
     * 分数必须是非负整数
     */
    const scoreArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: 1000000 })

    /**
     * 生成有效的关卡数
     * 关卡数为可选的正整数
     */
    const stageArb: fc.Arbitrary<number | undefined> = fc.option(
      fc.integer({ min: 1, max: 10 }),
      { nil: undefined }
    )

    /**
     * 生成有效的游戏时长（秒）
     * 游戏时长为可选的非负整数
     */
    const playTimeArb: fc.Arbitrary<number | undefined> = fc.option(
      fc.integer({ min: 0, max: 36000 }),
      { nil: undefined }
    )

    /**
     * 生成排行榜条目数据
     */
    const leaderboardEntryDataArb: fc.Arbitrary<{
      playerName: string
      score: number
      stage: number | undefined
      playTime: number | undefined
    }> = fc.record({
      playerName: playerNameArb,
      score: scoreArb,
      stage: stageArb,
      playTime: playTimeArb
    })

    describe('排行榜按分数降序排列', () => {
      it('任意排行榜数据集合返回的排行榜应该按分数降序排列', () => {
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryDataArb, { minLength: 1, maxLength: 50 }),
            (entries) => {
              initDatabase(':memory:')
              try {
                // 添加所有排行榜条目
                for (const entry of entries) {
                  const result = addLeaderboardEntry(
                    entry.playerName,
                    entry.score,
                    entry.stage,
                    entry.playTime
                  )
                  expect(result.success).toBe(true)
                }

                // 获取排行榜
                const leaderboard = getLeaderboard(entries.length + 10)

                // 验证排行榜长度
                expect(leaderboard.length).toBe(entries.length)

                // 验证排行榜按分数降序排列
                for (let i = 1; i < leaderboard.length; i++) {
                  const prevScore = leaderboard[i - 1].score
                  const currScore = leaderboard[i].score
                  expect(prevScore).toBeGreaterThanOrEqual(currScore)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })

      it('相同分数的条目应该按创建时间升序排列（先创建的排在前面）', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 100000 }),
            fc.array(playerNameArb, { minLength: 2, maxLength: 10 }),
            (score, playerNames) => {
              initDatabase(':memory:')
              try {
                // 添加多个相同分数的条目
                const addedIds: number[] = []
                for (const playerName of playerNames) {
                  const result = addLeaderboardEntry(playerName, score)
                  expect(result.success).toBe(true)
                  if (result.id !== undefined) {
                    addedIds.push(result.id)
                  }
                }

                // 获取排行榜
                const leaderboard = getLeaderboard(playerNames.length + 10)

                // 验证所有条目分数相同
                for (const entry of leaderboard) {
                  expect(entry.score).toBe(score)
                }

                // 验证按 ID 升序排列（ID 越小表示创建时间越早）
                for (let i = 1; i < leaderboard.length; i++) {
                  const prevId = leaderboard[i - 1].id
                  const currId = leaderboard[i].id
                  expect(prevId).toBeLessThan(currId)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })

      it('空排行榜应该返回空数组', () => {
        initDatabase(':memory:')
        try {
          const leaderboard = getLeaderboard()
          expect(leaderboard).toEqual([])
        } finally {
          closeDatabase()
        }
      })

      it('limit 参数应该正确限制返回的条目数量', () => {
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryDataArb, { minLength: 5, maxLength: 30 }),
            fc.integer({ min: 1, max: 20 }),
            (entries, limit) => {
              initDatabase(':memory:')
              try {
                // 添加所有排行榜条目
                for (const entry of entries) {
                  addLeaderboardEntry(
                    entry.playerName,
                    entry.score,
                    entry.stage,
                    entry.playTime
                  )
                }

                // 获取限制数量的排行榜
                const leaderboard = getLeaderboard(limit)

                // 验证返回数量不超过 limit
                expect(leaderboard.length).toBeLessThanOrEqual(limit)

                // 验证返回数量等于 min(entries.length, limit)
                expect(leaderboard.length).toBe(Math.min(entries.length, limit))

                // 验证排行榜仍然按分数降序排列
                for (let i = 1; i < leaderboard.length; i++) {
                  expect(leaderboard[i - 1].score).toBeGreaterThanOrEqual(leaderboard[i].score)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })

      it('返回的排行榜应该包含分数最高的条目', () => {
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryDataArb, { minLength: 2, maxLength: 30 }),
            fc.integer({ min: 1, max: 10 }),
            (entries, limit) => {
              initDatabase(':memory:')
              try {
                // 添加所有排行榜条目
                for (const entry of entries) {
                  addLeaderboardEntry(
                    entry.playerName,
                    entry.score,
                    entry.stage,
                    entry.playTime
                  )
                }

                // 获取限制数量的排行榜
                const leaderboard = getLeaderboard(limit)

                if (leaderboard.length > 0) {
                  // 找出输入数据中的最高分
                  const maxScore = Math.max(...entries.map(e => e.score))

                  // 验证排行榜第一名的分数等于最高分
                  expect(leaderboard[0].score).toBe(maxScore)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('排行榜重置后排序正确性', () => {
      it('重置排行榜后添加新数据应该仍然按分数降序排列', () => {
        fc.assert(
          fc.property(
            fc.array(leaderboardEntryDataArb, { minLength: 1, maxLength: 20 }),
            fc.array(leaderboardEntryDataArb, { minLength: 1, maxLength: 20 }),
            (firstBatch, secondBatch) => {
              initDatabase(':memory:')
              try {
                // 添加第一批数据
                for (const entry of firstBatch) {
                  addLeaderboardEntry(
                    entry.playerName,
                    entry.score,
                    entry.stage,
                    entry.playTime
                  )
                }

                // 重置排行榜
                resetLeaderboard()

                // 验证排行榜已清空
                expect(getLeaderboard()).toEqual([])

                // 添加第二批数据
                for (const entry of secondBatch) {
                  addLeaderboardEntry(
                    entry.playerName,
                    entry.score,
                    entry.stage,
                    entry.playTime
                  )
                }

                // 获取排行榜
                const leaderboard = getLeaderboard(secondBatch.length + 10)

                // 验证排行榜长度
                expect(leaderboard.length).toBe(secondBatch.length)

                // 验证排行榜按分数降序排列
                for (let i = 1; i < leaderboard.length; i++) {
                  expect(leaderboard[i - 1].score).toBeGreaterThanOrEqual(leaderboard[i].score)
                }
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('排行榜数据完整性', () => {
      it('排行榜条目应该包含所有必要字段', () => {
        fc.assert(
          fc.property(
            leaderboardEntryDataArb,
            (entry) => {
              initDatabase(':memory:')
              try {
                // 添加排行榜条目
                const result = addLeaderboardEntry(
                  entry.playerName,
                  entry.score,
                  entry.stage,
                  entry.playTime
                )
                expect(result.success).toBe(true)

                // 获取排行榜
                const leaderboard = getLeaderboard(1)
                expect(leaderboard.length).toBe(1)

                const retrieved = leaderboard[0]

                // 验证必要字段存在
                expect(retrieved.id).toBeDefined()
                expect(typeof retrieved.id).toBe('number')
                expect(retrieved.player_name).toBe(entry.playerName.trim())
                expect(retrieved.score).toBe(entry.score)
                expect(retrieved.stage).toBe(entry.stage ?? null)
                expect(retrieved.play_time).toBe(entry.playTime ?? null)
                expect(retrieved.created_at).toBeDefined()
                expect(typeof retrieved.created_at).toBe('string')
              } finally {
                closeDatabase()
              }
            }
          ),
          { numRuns: 20 }
        )
      })
    })
  })
})
