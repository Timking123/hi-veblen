/**
 * 对象池管理器
 * 统一管理所有对象池
 */

import { ObjectPool } from './ObjectPool'
import { Bullet } from './entities/Bullet'
import { Missile } from './entities/Missile'
import { AudioSystem } from './AudioSystem'

export class PoolManager {
  private static instance: PoolManager | null = null

  private bulletPool: ObjectPool<Bullet>
  private missilePool: ObjectPool<Missile>
  private audioSystem: AudioSystem | null = null

  private constructor() {
    console.log('[对象池管理器] 初始化对象池')

    // 创建子弹对象池
    this.bulletPool = new ObjectPool<Bullet>(
      () => new Bullet(),
      (bullet) => {
        bullet.isActive = false
        // bullet.hasExploded = false // 属性不存在
        bullet.x = 0
        bullet.y = 0
        bullet.vx = 0
        bullet.vy = 0
      },
      50, // 初始大小
      200 // 最大大小
    )

    // 创建导弹对象池
    this.missilePool = new ObjectPool<Missile>(
      () => new Missile(),
      (missile) => {
        missile.isActive = false
        missile.hasExploded = false
        missile.x = 0
        missile.y = 0
        missile.vx = 0
        missile.vy = 0
      },
      20, // 初始大小
      50 // 最大大小
    )
  }

  /**
   * 获取单例实例
   */
  static getInstance(): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager()
    }
    return PoolManager.instance
  }
  
  /**
   * 设置音频系统
   */
  setAudioSystem(audioSystem: AudioSystem): void {
    this.audioSystem = audioSystem
  }

  /**
   * 获取子弹
   */
  acquireBullet(
    x: number,
    y: number,
    damage: number,
    speed: number,
    owner: 'player' | 'enemy',
    angle: number = 0
  ): Bullet {
    const bullet = this.bulletPool.acquire()
    bullet.init(x, y, damage, speed, owner, angle)
    
    // 设置音频系统
    if (this.audioSystem) {
      bullet.setAudioSystem(this.audioSystem)
    }
    
    return bullet
  }

  /**
   * 归还子弹
   */
  releaseBullet(bullet: Bullet): void {
    this.bulletPool.release(bullet)
  }

  /**
   * 获取导弹
   */
  acquireMissile(
    x: number,
    y: number,
    damage: number,
    speed: number,
    explosionRadius: number,
    owner: 'player' | 'enemy',
    angle: number = 0
  ): Missile {
    const missile = this.missilePool.acquire()
    missile.init(x, y, damage, speed, explosionRadius, owner, angle)
    
    // 设置音频系统
    if (this.audioSystem) {
      missile.setAudioSystem(this.audioSystem)
    }
    
    return missile
  }

  /**
   * 归还导弹
   */
  releaseMissile(missile: Missile): void {
    this.missilePool.release(missile)
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    bullets: { available: number; inUse: number; totalCreated: number }
    missiles: { available: number; inUse: number; totalCreated: number }
  } {
    const bulletStats = this.bulletPool.getStats()
    const missileStats = this.missilePool.getStats()
    
    return {
      bullets: {
        available: bulletStats.available,
        inUse: bulletStats.inUse,
        totalCreated: bulletStats.totalCreated
      },
      missiles: {
        available: missileStats.available,
        inUse: missileStats.inUse,
        totalCreated: missileStats.totalCreated
      }
    }
  }

  /**
   * 收缩所有对象池（释放未使用的对象）
   */
  shrink(): void {
    this.bulletPool.shrink()
    this.missilePool.shrink()
    console.log('[对象池管理器] 收缩所有对象池')
  }

  /**
   * 清空所有对象池
   */
  clear(): void {
    this.bulletPool.clear()
    this.missilePool.clear()
    console.log('[对象池管理器] 清空所有对象池')
  }

  /**
   * 销毁单例
   */
  static destroy(): void {
    if (PoolManager.instance) {
      PoolManager.instance.clear()
      PoolManager.instance = null
      console.log('[对象池管理器] 销毁单例')
    }
  }
}
