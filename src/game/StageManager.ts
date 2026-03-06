/**
 * 关卡管理器
 * 
 * 功能：
 * - 管理三个关卡的配置和状态
 * - 控制敌人生成频率和类型
 * - 跟踪已生成和已击杀敌人数量
 * - 处理关卡切换逻辑
 * - 生成 Boss 敌人
 */

import type { StageConfig } from './types'
import { STAGES } from './constants'
import { EnemyType } from './types'

export class StageManager {
  private currentStageIndex: number = 0
  private currentStage: StageConfig
  private spawnedEnemies: number = 0
  private killedEnemies: number = 0
  private bossSpawned: boolean = false

  constructor() {
    this.currentStage = STAGES[0]
    console.log(`[关卡管理器] 初始化，当前关卡: ${this.currentStage.name}`)
  }

  /**
   * 获取当前关卡
   */
  getCurrentStage(): StageConfig {
    return this.currentStage
  }

  /**
   * 获取当前关卡索引（1-based）
   */
  getCurrentStageNumber(): number {
    return this.currentStageIndex + 1
  }

  /**
   * 获取总关卡数
   */
  getTotalStages(): number {
    return STAGES.length
  }

  /**
   * 获取已生成敌人数量
   */
  getSpawnedCount(): number {
    return this.spawnedEnemies
  }

  /**
   * 获取已击杀敌人数量
   */
  getKilledCount(): number {
    return this.killedEnemies
  }

  /**
   * 获取剩余敌人数量
   */
  getRemainingCount(): number {
    return this.currentStage.totalEnemies - this.killedEnemies
  }

  /**
   * 是否可以生成敌人
   */
  canSpawnEnemy(): boolean {
    // 如果已生成数量小于总数，可以生成
    return this.spawnedEnemies < this.currentStage.totalEnemies
  }

  /**
   * 是否应该生成 Boss
   */
  shouldSpawnBoss(): boolean {
    // 当所有普通敌人都被击杀，且 Boss 未生成时
    return (
      this.killedEnemies >= this.currentStage.totalEnemies &&
      !this.bossSpawned
    )
  }

  /**
   * 生成敌人
   * @returns 敌人类型和是否为精英
   */
  spawnEnemy(): { type: EnemyType; isElite: boolean } {
    if (!this.canSpawnEnemy()) {
      throw new Error('无法生成更多敌人')
    }

    this.spawnedEnemies++

    // 随机选择敌人类型
    const types = this.currentStage.enemyTypes
    const type = types[Math.floor(Math.random() * types.length)]

    // 10% 概率生成精英怪
    const isElite = Math.random() < 0.1

    console.log(
      `[关卡管理器] 生成敌人 ${this.spawnedEnemies}/${this.currentStage.totalEnemies}: ${type}, 精英: ${isElite}`
    )

    return { type, isElite }
  }

  /**
   * 生成 Boss
   * @returns Boss 类型
   */
  spawnBoss(): EnemyType {
    if (!this.shouldSpawnBoss()) {
      throw new Error('无法生成 Boss')
    }

    this.bossSpawned = true
    console.log(`[关卡管理器] 生成 Boss: ${this.currentStage.bossType}`)

    return this.currentStage.bossType
  }

  /**
   * 记录敌人被击杀
   */
  recordKill(): void {
    this.killedEnemies++
    console.log(
      `[关卡管理器] 击杀敌人 ${this.killedEnemies}/${this.currentStage.totalEnemies}`
    )
  }

  /**
   * 记录 Boss 被击杀
   */
  recordBossKill(): void {
    console.log(`[关卡管理器] Boss 被击杀`)
  }

  /**
   * 是否可以进入下一关
   */
  canAdvanceStage(): boolean {
    // Boss 已生成且已被击杀（通过检查是否还有敌人存活）
    return this.bossSpawned && this.getRemainingCount() === 0
  }

  /**
   * 进入下一关
   * @returns 是否成功进入下一关
   */
  advanceStage(): boolean {
    if (!this.canAdvanceStage()) {
      console.warn('[关卡管理器] 无法进入下一关：条件未满足')
      return false
    }

    if (this.currentStageIndex >= STAGES.length - 1) {
      console.log('[关卡管理器] 已经是最后一关，游戏通关！')
      return false
    }

    this.currentStageIndex++
    this.currentStage = STAGES[this.currentStageIndex]
    this.spawnedEnemies = 0
    this.killedEnemies = 0
    this.bossSpawned = false

    console.log(`[关卡管理器] 进入关卡 ${this.getCurrentStageNumber()}: ${this.currentStage.name}`)

    return true
  }

  /**
   * 是否为最终关卡
   */
  isFinalStage(): boolean {
    return this.currentStageIndex === STAGES.length - 1
  }

  /**
   * 是否游戏通关
   */
  isGameComplete(): boolean {
    return this.isFinalStage() && this.bossSpawned && this.getRemainingCount() === 0
  }

  /**
   * 获取敌人生成间隔
   */
  getSpawnRate(): number {
    return this.currentStage.spawnRate
  }

  /**
   * 重置关卡管理器
   */
  reset(): void {
    this.currentStageIndex = 0
    this.currentStage = STAGES[0]
    this.spawnedEnemies = 0
    this.killedEnemies = 0
    this.bossSpawned = false
    console.log('[关卡管理器] 已重置')
  }
}
