/**
 * 机炮武器系统
 */

import type { MachineGunConfig } from '../types'
import { Bullet } from '../entities/Bullet'
import { INITIAL_MACHINE_GUN } from '../constants'
import { PoolManager } from '../PoolManager'
import { AudioSystem, SoundEffect } from '../AudioSystem'

export class MachineGun {
  config: MachineGunConfig
  lastFireTime: number = 0
  isAutoFiring: boolean = false
  private poolManager: PoolManager
  private audioSystem: AudioSystem | null = null
  private owner: 'player' | 'enemy'

  constructor(config?: Partial<MachineGunConfig>, owner: 'player' | 'enemy' = 'player') {
    this.config = {
      ...INITIAL_MACHINE_GUN,
      ...config
    }
    this.poolManager = PoolManager.getInstance()
    this.owner = owner
    
    // 根据所有者设置不同的射速
    // 需求 7.1: 玩家机炮冷却时间为 200ms
    // 需求 7.2: 敌人机炮冷却时间为 1000ms
    if (owner === 'player') {
      this.config.fireRate = 200
    } else {
      this.config.fireRate = 1000
    }
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
    const now = Date.now()
    return now - this.lastFireTime >= this.config.fireRate
  }

  /**
   * 发射子弹
   */
  fire(x: number, y: number, owner: 'player' | 'enemy' = 'player'): Bullet[] {
    if (!this.canFire()) {
      return []
    }

    this.lastFireTime = Date.now()
    const bullets: Bullet[] = []

    // 根据弹道数量计算角度
    const trajectories = this.config.trajectories
    const angleStep = trajectories > 1 ? Math.PI / 12 : 0 // 15度间隔
    const startAngle = -(trajectories - 1) * angleStep / 2

    for (let i = 0; i < trajectories; i++) {
      const angle = startAngle + i * angleStep

      // 每个弹道发射多个子弹
      for (let j = 0; j < this.config.bulletsPerShot; j++) {
        const offsetX = (j - (this.config.bulletsPerShot - 1) / 2) * 8
        // 使用对象池获取子弹
        const bullet = this.poolManager.acquireBullet(
          x + offsetX,
          y,
          this.config.bulletDamage,
          this.config.bulletSpeed,
          owner,
          angle
        )
        bullets.push(bullet)
      }
    }
    
    // 需求 17.1: 玩家机炮发射时播放音效
    // 需求 17.12: 敌人武器不播放音效
    if (this.owner === 'player' && this.audioSystem) {
      this.audioSystem.playSoundEffect(SoundEffect.PLAYER_GUN_FIRE)
    }

    return bullets
  }

  /**
   * 升级：增加子弹数量
   */
  upgradeBullets(): void {
    this.config.bulletsPerShot++
    console.log(`[机炮] 子弹数量升级至: ${this.config.bulletsPerShot}`)
  }

  /**
   * 升级：增加弹道
   */
  upgradeTrajectories(): void {
    this.config.trajectories++
    console.log(`[机炮] 弹道数量升级至: ${this.config.trajectories}`)
  }

  /**
   * 升级：减少间隔
   */
  upgradeFireRate(): void {
    this.config.fireRate = Math.max(500, this.config.fireRate - 100)
    console.log(`[机炮] 射速升级至: ${this.config.fireRate}ms`)
  }

  /**
   * 升级：增加伤害
   */
  upgradeDamage(): void {
    this.config.bulletDamage++
    console.log(`[机炮] 伤害升级至: ${this.config.bulletDamage}`)
  }

  /**
   * 升级：增加速度
   */
  upgradeSpeed(): void {
    this.config.bulletSpeed += 2
    console.log(`[机炮] 子弹速度升级至: ${this.config.bulletSpeed}`)
  }
}
