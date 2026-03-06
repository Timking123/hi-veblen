/**
 * 敌人实体
 */

import type { Entity, EnemyConfig } from '../types'
import { ENEMY_CONFIGS, PIXEL_STYLE, ELITE_MULTIPLIER, BOSS_MULTIPLIER, ELITE_SIZE_MULTIPLIER, BOSS_SIZE_MULTIPLIER, MOVEMENT_CONFIG, PIXEL_BLOCK_CONFIG } from '../constants'
import { EnemyType, PickupType } from '../types'
import { enemyContentProvider } from '../EnemyContentProvider'
import { MachineGun } from '../weapons/MachineGun'
import { MissileLauncher } from '../weapons/MissileLauncher'
import { enemyTextRenderer, EnemyTextSize } from '../EnemyTextRenderer'
import { AudioSystem } from '../AudioSystem'

export class Enemy implements Entity {
  id: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean = true

  config: EnemyConfig
  currentHealth: number
  machineGun: MachineGun | null = null
  missileLauncher: MissileLauncher | null = null
  lastAttackTime: number = 0
  
  // V2: 移动定时器
  private lastHorizontalMoveTime: number = 0
  private lastVerticalMoveTime: number = 0
  private isFinalBoss: boolean = false

  constructor(type: EnemyType, x: number, y: number, isElite: boolean = false, isBoss: boolean = false, scaleMultiplier: number = 1.0) {
    this.id = `enemy-${Math.random().toString(36).substr(2, 9)}`
    this.x = x
    this.y = y

    // 获取基础配置
    const baseConfig = ENEMY_CONFIGS[type]

    // 创建完整配置
    this.config = {
      ...baseConfig,
      text: enemyContentProvider.getRandomContent(),
      isElite,
      isBoss
    }

    // 基础尺寸（考虑场景缩放）
    const baseWidth = 60 * scaleMultiplier
    const baseHeight = 40 * scaleMultiplier

    // 应用精英/Boss倍率
    if (isBoss) {
      this.config.health = Math.floor(this.config.health * BOSS_MULTIPLIER)
      this.config.speed *= BOSS_MULTIPLIER
      this.width = baseWidth * BOSS_SIZE_MULTIPLIER
      this.height = baseHeight * BOSS_SIZE_MULTIPLIER
    } else if (isElite) {
      this.config.health = Math.floor(this.config.health * ELITE_MULTIPLIER)
      this.config.speed *= ELITE_MULTIPLIER
      this.width = baseWidth * ELITE_SIZE_MULTIPLIER
      this.height = baseHeight * ELITE_SIZE_MULTIPLIER
    } else {
      this.width = baseWidth
      this.height = baseHeight
    }

    this.currentHealth = this.config.health
    
    // V2: 判断是否为最终 BOSS（第三关的红色 BOSS）
    this.isFinalBoss = isBoss && type === EnemyType.RED
    
    // V2: 初始化移动定时器
    const now = Date.now()
    this.lastHorizontalMoveTime = now
    this.lastVerticalMoveTime = now

    // 创建武器
    if (this.config.machineGun) {
      this.machineGun = new MachineGun(this.config.machineGun, 'enemy')
    }
    if (this.config.missileLauncher) {
      this.missileLauncher = new MissileLauncher(this.config.missileLauncher)
    }

    console.log(`[敌人] 创建 ${type} 敌人: ${this.config.text}, 血量: ${this.currentHealth}, 精英: ${isElite}, Boss: ${isBoss}, 最终BOSS: ${this.isFinalBoss}`)
  }
  
  /**
   * 设置音频系统
   */
  setAudioSystem(audioSystem: AudioSystem): void {
    // 设置武器的音频系统（敌人武器不播放音效，但需要传递以保持一致性）
    if (this.machineGun) {
      this.machineGun.setAudioSystem(audioSystem)
    }
    if (this.missileLauncher) {
      this.missileLauncher.setAudioSystem(audioSystem)
    }
  }

  /**
   * V2: 追踪玩家（新的 AI 系统）
   * 每 500ms 向玩家 X 坐标移动
   * 每 500ms 自动向下移动 1 像素块
   * 最终 BOSS 不向下移动
   */
  trackPlayer(playerX: number, _playerY: number): void {
    const now = Date.now()
    
    // 水平移动：每 500ms 向玩家 X 坐标移动
    if (now - this.lastHorizontalMoveTime >= MOVEMENT_CONFIG.ENEMY_MOVE_INTERVAL) {
      const enemyCenterX = this.x + this.width / 2
      
      // 计算到玩家的水平方向
      if (playerX < enemyCenterX) {
        // 玩家在左边，向左移动 1 像素块
        this.x -= PIXEL_BLOCK_CONFIG.SIZE
      } else if (playerX > enemyCenterX) {
        // 玩家在右边，向右移动 1 像素块
        this.x += PIXEL_BLOCK_CONFIG.SIZE
      }
      
      this.lastHorizontalMoveTime = now
    }
    
    // 垂直移动：每 500ms 自动向下移动 1 像素块（最终 BOSS 除外）
    if (!this.isFinalBoss && now - this.lastVerticalMoveTime >= MOVEMENT_CONFIG.ENEMY_DOWN_INTERVAL) {
      this.y += PIXEL_BLOCK_CONFIG.SIZE
      this.lastVerticalMoveTime = now
    }
  }

  /**
   * 攻击
   */
  attack(): (any)[] {
    const now = Date.now()
    const projectiles: any[] = []

    // 机炮攻击
    if (this.machineGun && now - this.lastAttackTime >= this.config.machineGun!.fireRate) {
      const bullets = this.machineGun.fire(
        this.x + this.width / 2,
        this.y + this.height,
        'enemy'
      )
      projectiles.push(...bullets)
      this.lastAttackTime = now
    }

    // 导弹攻击
    if (this.missileLauncher && now - this.lastAttackTime >= 2000) {
      const missile = this.missileLauncher.fire(
        this.x + this.width / 2,
        this.y + this.height,
        this.width,
        'enemy'
      )
      if (missile) {
        projectiles.push(missile)
        this.lastAttackTime = now
      }
    }

    return projectiles
  }

  /**
   * 受到伤害
   */
  takeDamage(amount: number): void {
    this.currentHealth -= amount
    
    if (this.currentHealth <= 0) {
      this.currentHealth = 0
      this.die()
    }
  }

  /**
   * 死亡
   * @returns 掉落物类型（如果有）
   */
  die(): PickupType | null {
    console.log(`[敌人] ${this.id} (${this.config.text}) 死亡`)
    this.isActive = false
    
    // 掉落判定
    return this.rollDrop()
  }

  /**
   * 掉落判定
   * @returns 掉落物类型（如果有）
   */
  private rollDrop(): PickupType | null {
    const random = Math.random()
    const rates = this.config.dropRates

    // 按概率判定掉落
    if (random < rates.repair) {
      return PickupType.REPAIR
    } else if (random < rates.repair + rates.machineGun) {
      // 随机选择一种机炮升级
      const machineGunUpgrades = [
        PickupType.MACHINEGUN_BULLETS,
        PickupType.MACHINEGUN_TRAJECTORY,
        PickupType.MACHINEGUN_FIRERATE,
        PickupType.MACHINEGUN_DAMAGE,
        PickupType.MACHINEGUN_SPEED
      ]
      return machineGunUpgrades[Math.floor(Math.random() * machineGunUpgrades.length)]
    } else if (random < rates.repair + rates.machineGun + rates.missile) {
      // 随机选择一种导弹升级
      const missileUpgrades = [
        PickupType.MISSILE_COUNT,
        PickupType.MISSILE_DAMAGE,
        PickupType.MISSILE_SPEED
      ]
      return missileUpgrades[Math.floor(Math.random() * missileUpgrades.length)]
    } else if (random < rates.repair + rates.machineGun + rates.missile + rates.engine) {
      return PickupType.ENGINE
    }

    return null
  }

  /**
   * 更新
   */
  update(_deltaTime: number): void {
    // 敌人的移动和攻击由游戏逻辑控制
  }

  /**
   * 获取敌人文字尺寸类型
   */
  private getTextSizeType(): EnemyTextSize {
    if (this.config.isBoss) {
      // 判断是否为最终 BOSS（第三关的红色 BOSS）
      if (this.config.type === EnemyType.RED) {
        return EnemyTextSize.FINAL_BOSS
      }
      return EnemyTextSize.STAGE_BOSS
    } else if (this.config.isElite) {
      return EnemyTextSize.ELITE
    }
    return EnemyTextSize.NORMAL
  }

  /**
   * 渲染
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()

    // 根据类型选择颜色
    let color = PIXEL_STYLE.colors.enemyWhite
    switch (this.config.type) {
      case EnemyType.WHITE:
        color = PIXEL_STYLE.colors.enemyWhite
        break
      case EnemyType.GREEN:
        color = PIXEL_STYLE.colors.enemyGreen
        break
      case EnemyType.BLUE:
        color = PIXEL_STYLE.colors.enemyBlue
        break
      case EnemyType.PURPLE:
        color = PIXEL_STYLE.colors.enemyPurple
        break
      case EnemyType.YELLOW:
        color = PIXEL_STYLE.colors.enemyYellow
        break
      case EnemyType.ORANGE:
        color = PIXEL_STYLE.colors.enemyOrange
        break
      case EnemyType.RED:
        color = PIXEL_STYLE.colors.enemyRed
        break
    }

    // 使用 EnemyTextRenderer 渲染文字
    const textSizeType = this.getTextSizeType()
    
    // 渲染完整文字（不截断）
    enemyTextRenderer.renderEnemyText(
      ctx,
      this.config.text,
      this.x + this.width / 2,
      this.y + this.height / 2,
      textSizeType,
      color
    )

    ctx.restore()

    // 绘制血条
    this.renderHealthBar(ctx)

    // Boss/精英标记
    if (this.config.isBoss || this.config.isElite) {
      this.renderLabel(ctx)
    }
  }

  /**
   * 渲染血条
   */
  private renderHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.width
    const barHeight = 4
    const barX = this.x
    const barY = this.y - 8

    // 背景（红色）
    ctx.fillStyle = '#FF0000'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // 当前血量（根据类型选择颜色）
    const healthPercent = this.currentHealth / this.config.health
    let color = PIXEL_STYLE.colors.enemyWhite
    switch (this.config.type) {
      case EnemyType.GREEN:
        color = PIXEL_STYLE.colors.enemyGreen
        break
      case EnemyType.BLUE:
        color = PIXEL_STYLE.colors.enemyBlue
        break
      case EnemyType.PURPLE:
        color = PIXEL_STYLE.colors.enemyPurple
        break
      case EnemyType.YELLOW:
        color = PIXEL_STYLE.colors.enemyYellow
        break
      case EnemyType.ORANGE:
        color = PIXEL_STYLE.colors.enemyOrange
        break
      case EnemyType.RED:
        color = PIXEL_STYLE.colors.enemyRed
        break
    }
    ctx.fillStyle = color
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight)

    // 边框
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barWidth, barHeight)
  }

  /**
   * 渲染标签（Boss/精英）
   */
  private renderLabel(ctx: CanvasRenderingContext2D): void {
    const label = this.config.isBoss ? 'BOSS' : 'ELITE'
    const labelY = this.y - 18

    ctx.save()
    ctx.font = PIXEL_STYLE.fonts.small
    ctx.fillStyle = this.config.isBoss ? '#FF0000' : '#FFD700'
    ctx.textAlign = 'center'
    ctx.fillText(label, this.x + this.width / 2, labelY)
    ctx.restore()
  }

  /**
   * 碰撞处理
   */
  onCollision(other: Entity): void {
    // 与玩家碰撞
    if (other.id === 'player') {
      console.log(`[敌人] ${this.id} 与玩家碰撞，造成 ${this.currentHealth} 点伤害`)
      // 对玩家造成等于剩余血量的伤害
      if ('takeDamage' in other && typeof other.takeDamage === 'function') {
        ;(other as any).takeDamage(this.currentHealth)
      }
      // 自己也死亡
      this.die()
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.isActive = false
  }

  /**
   * 获取当前血量
   */
  getCurrentHealth(): number {
    return this.currentHealth
  }

  /**
   * 获取中心点坐标
   */
  getCenterX(): number {
    return this.x + this.width / 2
  }

  getCenterY(): number {
    return this.y + this.height / 2
  }
  
  /**
   * V2: 检查是否为最终 BOSS
   */
  getIsFinalBoss(): boolean {
    return this.isFinalBoss
  }
}
