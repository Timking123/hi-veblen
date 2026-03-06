/**
 * 导弹发射器系统
 */

import type { MissileLauncherConfig } from '../types'
import { Missile } from '../entities/Missile'
import { INITIAL_MISSILE_LAUNCHER } from '../constants'
import { PoolManager } from '../PoolManager'
import { AudioSystem, SoundEffect } from '../AudioSystem'

export class MissileLauncher {
  config: MissileLauncherConfig
  currentSide: 'left' | 'right' = 'left'
  private poolManager: PoolManager
  private audioSystem: AudioSystem | null = null
  private owner: 'player' | 'enemy'

  constructor(config?: Partial<MissileLauncherConfig>, owner: 'player' | 'enemy' = 'player') {
    this.config = {
      ...INITIAL_MISSILE_LAUNCHER,
      ...config
    }
    this.poolManager = PoolManager.getInstance()
    this.owner = owner
  }
  
  /**
   * 设置音频系统
   */
  setAudioSystem(audioSystem: AudioSystem): void {
    this.audioSystem = audioSystem
  }

  /**
   * 检查是否可以发射
   */
  canFire(): boolean {
    return this.config.missileCount > 0
  }

  /**
   * 发射导弹
   * 需求 11.1, 11.2: 按一次 K 键发射一枚导弹，长按不连续发射
   */
  fire(x: number, y: number, width: number, owner: 'player' | 'enemy' = 'player'): Missile | null {
    if (!this.canFire()) {
      console.log(`[导弹发射器] 无法发射，导弹数量: ${this.config.missileCount}`)
      return null
    }

    console.log(`[导弹发射器] 发射导弹，剩余: ${this.config.missileCount - 1}`)

    // 减少导弹数量
    this.config.missileCount--

    // 根据当前侧翼计算发射位置
    const offsetX = this.currentSide === 'left' ? -width / 2 : width / 2

    // 切换侧翼（左右交替）
    this.currentSide = this.currentSide === 'left' ? 'right' : 'left'

    // 使用对象池获取导弹
    const missile = this.poolManager.acquireMissile(
      x + offsetX,
      y,
      this.config.missileDamage,
      this.config.missileSpeed,
      this.config.explosionRadius,
      owner
    )
    
    // 需求 17.2: 玩家导弹发射时播放音效
    // 需求 17.12: 敌人武器不播放音效
    if (this.owner === 'player' && this.audioSystem) {
      this.audioSystem.playSoundEffect(SoundEffect.PLAYER_MISSILE_FIRE)
    }

    return missile
  }

  /**
   * 升级：增加导弹数量
   */
  upgradeCount(): void {
    this.config.missileCount += 2
    console.log(`[导弹发射器] 导弹数量升级至: ${this.config.missileCount}`)
  }

  /**
   * 升级：增加伤害
   */
  upgradeDamage(): void {
    this.config.missileDamage += 3
    console.log(`[导弹发射器] 伤害升级至: ${this.config.missileDamage}`)
  }

  /**
   * 升级：增加速度
   */
  upgradeSpeed(): void {
    this.config.missileSpeed++
    console.log(`[导弹发射器] 速度升级至: ${this.config.missileSpeed}`)
  }

  /**
   * 补充导弹
   */
  addMissiles(count: number): void {
    this.config.missileCount += count
    console.log(`[导弹发射器] 补充 ${count} 枚导弹，当前: ${this.config.missileCount}`)
  }

  /**
   * 获取当前导弹数量
   */
  getMissileCount(): number {
    return this.config.missileCount
  }
}
