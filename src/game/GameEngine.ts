/**
 * 游戏引擎核心类
 * 负责游戏循环、实体管理、碰撞检测
 */

import type { Entity } from './types'
import { GAME_CONFIG, SCENE_CONFIG } from './constants'
import { PoolManager } from './PoolManager'
import { Bullet } from './entities/Bullet'
import { Missile } from './entities/Missile'
import { EffectSystem, ExplosionSize } from './EffectSystem'
import { Enemy } from './entities/Enemy'
import { PlayerAircraft } from './entities/PlayerAircraft'
import { AudioSystem, SoundEffect } from './AudioSystem'
import { MemoryManager } from './MemoryManager'
import { isEntityVisible, checkAABBCollision, getEntityCenter } from './utils'
import { Quadtree } from './Quadtree'

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private entities: Entity[] = []
  private isRunning: boolean = false
  private lastFrameTime: number = 0
  private animationFrameId: number | null = null
  private fps: number = 0
  private frameCount: number = 0
  private fpsUpdateTime: number = 0
  private onUpdateCallback: ((deltaTime: number) => void) | null = null
  private onGameOverCallback: ((score: number) => void) | null = null
  private backgroundRenderer: ((ctx: CanvasRenderingContext2D) => void) | null = null
  private poolManager: PoolManager
  private scaleMultiplier: number = 1.0
  private effectSystem: EffectSystem
  private audioSystem: AudioSystem
  private memoryManager: MemoryManager

  constructor(canvas: HTMLCanvasElement, options?: { scaleMultiplier?: number }) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文')
    }
    this.ctx = ctx

    // 设置场景缩放参数（默认使用 V2 配置的 1.5x）
    this.scaleMultiplier = options?.scaleMultiplier ?? SCENE_CONFIG.SCALE_MULTIPLIER

    // 初始化画布尺寸（自适应屏幕）
    this.resizeCanvas()

    console.log(`[游戏引擎] Canvas 尺寸: ${this.canvas.width}x${this.canvas.height} (缩放: ${this.scaleMultiplier}x)`)

    // 获取对象池管理器
    this.poolManager = PoolManager.getInstance()
    
    // 初始化效果系统
    this.effectSystem = new EffectSystem()
    
    // 检测 prefers-reduced-motion 并设置到效果系统
    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        console.log('[游戏引擎] 检测到 prefers-reduced-motion，禁用屏幕震动')
        this.effectSystem.setReducedMotion(true)
      }
    }
    
    // 初始化音频系统
    this.audioSystem = new AudioSystem()
    
    // 初始化内存管理器
    this.memoryManager = MemoryManager.getInstance()
    
    // 注册清理回调到内存管理器
    this.memoryManager.registerCleanupCallback(() => {
      this.performCleanup()
    })
  }

  /**
   * 启动游戏循环
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[游戏引擎] 游戏已经在运行中')
      return
    }

    console.log('[游戏引擎] 启动游戏循环')
    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.fpsUpdateTime = this.lastFrameTime
    
    // 启动内存监控
    this.memoryManager.startMonitoring()
    
    this.gameLoop()
  }

  /**
   * 停止游戏循环
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    console.log('[游戏引擎] 停止游戏循环')
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    
    // 停止音频
    this.audioSystem.stopBackgroundMusic()
    
    // 停止内存监控
    this.memoryManager.stopMonitoring()
  }

  /**
   * 暂停游戏
   */
  pause(): void {
    if (!this.isRunning) {
      return
    }

    console.log('[游戏引擎] 暂停游戏')
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * 恢复游戏
   */
  resume(): void {
    if (this.isRunning) {
      return
    }

    console.log('[游戏引擎] 恢复游戏')
    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.gameLoop()
  }

  /**
   * 游戏主循环
   */
  private gameLoop = (): void => {
    if (!this.isRunning) {
      return
    }

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastFrameTime
    this.lastFrameTime = currentTime

    // 更新 FPS
    this.updateFPS(currentTime)

    // 更新游戏状态
    this.update(deltaTime)

    // 渲染游戏画面
    this.render()

    // 请求下一帧
    this.animationFrameId = requestAnimationFrame(this.gameLoop)
  }

  /**
   * 更新 FPS 计数
   */
  private updateFPS(currentTime: number): void {
    this.frameCount++
    const elapsed = currentTime - this.fpsUpdateTime

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed)
      this.frameCount = 0
      this.fpsUpdateTime = currentTime
    }
  }

  /**
   * 获取当前 FPS
   */
  getFPS(): number {
    return this.fps
  }

  /**
   * 更新所有实体
   * 优化：使用反向循环和提前退出减少不必要的迭代
   */
  private update(deltaTime: number): void {
    // 调用外部更新回调（用于玩家控制等）
    if (this.onUpdateCallback) {
      this.onUpdateCallback(deltaTime)
    }

    // 更新效果系统
    this.effectSystem.update(deltaTime)

    // 优化：使用反向循环，便于在循环中删除元素
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i]
      
      if (!entity.isActive) {
        // 在实体被移除前，检查是否需要创建爆炸效果
        this.handleEntityDestruction(entity)
        
        // 回收子弹和导弹到对象池
        if (entity instanceof Bullet) {
          this.poolManager.releaseBullet(entity)
        } else if (entity instanceof Missile) {
          this.poolManager.releaseMissile(entity)
        }
        
        // 移除不活跃的实体
        this.entities.splice(i, 1)
      } else {
        // 更新活跃实体
        entity.update(deltaTime)
      }
    }

    // 检测碰撞
    this.checkCollisions()
  }

  /**
   * 处理实体销毁（创建爆炸效果和播放音效）
   * 根据实体类型创建相应的爆炸效果和音效
   */
  private handleEntityDestruction(entity: Entity): void {
    // 处理敌人销毁
    if (entity instanceof Enemy) {
      this.handleEnemyDestruction(entity)
    }
    
    // 处理玩家销毁
    if (entity instanceof PlayerAircraft) {
      this.handlePlayerDestruction(entity)
    }
  }
  
  /**
   * 处理敌人销毁
   * @param enemy 敌人实体
   */
  private handleEnemyDestruction(enemy: Enemy): void {
    // 只有当敌人血量为 0 时才创建爆炸（表示被击败）
    if (enemy.getCurrentHealth() > 0) {
      return
    }
    
    const center = getEntityCenter(enemy)
    const { explosionSize, soundEffect } = this.getEnemyExplosionConfig(enemy)
    
    this.effectSystem.createExplosion(center.x, center.y, explosionSize)
    
    if (soundEffect) {
      this.audioSystem.playSoundEffect(soundEffect)
    }
    
    console.log(`[效果系统] 敌人被击败，创建爆炸效果: ${explosionSize}，音效: ${soundEffect}`)
  }
  
  /**
   * 获取敌人爆炸配置
   * @param enemy 敌人实体
   * @returns 爆炸尺寸和音效
   */
  private getEnemyExplosionConfig(enemy: Enemy): {
    explosionSize: ExplosionSize
    soundEffect: SoundEffect | null
  } {
    if (enemy.config.isBoss) {
      // 判断是否为最终 BOSS
      if (enemy.getIsFinalBoss()) {
        return {
          explosionSize: ExplosionSize.HUGE,
          soundEffect: SoundEffect.FINAL_BOSS_EXPLODE // 需求 17.10
        }
      } else {
        return {
          explosionSize: ExplosionSize.LARGE,
          soundEffect: SoundEffect.STAGE_BOSS_EXPLODE // 需求 17.9
        }
      }
    } else if (enemy.config.isElite) {
      return {
        explosionSize: ExplosionSize.MEDIUM,
        soundEffect: SoundEffect.ELITE_EXPLODE // 需求 17.8
      }
    } else {
      return {
        explosionSize: ExplosionSize.SMALL,
        soundEffect: SoundEffect.ENEMY_EXPLODE // 需求 17.7
      }
    }
  }
  
  /**
   * 处理玩家销毁
   * @param player 玩家实体
   */
  private handlePlayerDestruction(player: PlayerAircraft): void {
    const center = getEntityCenter(player)
    
    this.effectSystem.createExplosion(center.x, center.y, ExplosionSize.HUGE)
    
    // 需求 17.11: 玩家爆炸音效
    this.audioSystem.playSoundEffect(SoundEffect.PLAYER_EXPLODE)
    
    console.log('[效果系统] 玩家被击败，创建爆炸效果')
  }

  /**
   * 渲染所有实体（带视锥剔除）
   * 优化：只渲染可见实体，减少不必要的绘制调用
   */
  private render(): void {
    // 首先清除整个画布（修复残影问题）
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // 获取屏幕震动偏移
    const shakeOffset = this.effectSystem.getScreenOffset()
    
    // 应用震动偏移（仅用于渲染）
    this.ctx.save()
    this.ctx.translate(shakeOffset.x, shakeOffset.y)
    
    // 渲染背景
    if (this.backgroundRenderer) {
      this.backgroundRenderer(this.ctx)
    } else {
      // 默认黑色背景
      this.ctx.fillStyle = '#000000'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    // 优化：批量渲染可见实体，减少状态切换
    // 将实体按类型分组可以进一步优化，但当前实现已足够高效
    const visibleEntities = this.entities.filter(
      entity => entity.isActive && this.isEntityVisible(entity)
    )
    
    for (const entity of visibleEntities) {
      entity.render(this.ctx)
    }
    
    // 渲染效果（爆炸动画）
    this.effectSystem.render(this.ctx)
    
    // 恢复变换（移除震动偏移）
    this.ctx.restore()
  }

  /**
   * 检查实体是否在可见区域内（视锥剔除）
   * 使用工具函数提高代码复用性
   */
  private isEntityVisible(entity: Entity): boolean {
    return isEntityVisible(entity, this.canvas.width, this.canvas.height, 50)
  }

  /**
   * 添加实体
   */
  addEntity(entity: Entity): void {
    this.entities.push(entity)
  }

  /**
   * 移除实体
   */
  removeEntity(entity: Entity): void {
    const index = this.entities.indexOf(entity)
    if (index !== -1) {
      this.entities.splice(index, 1)
    }
  }

  /**
   * 获取所有实体
   */
  getEntities(): Entity[] {
    return this.entities
  }

  /**
   * 清空所有实体
   */
  clearEntities(): void {
    this.entities = []
  }

  /**
   * 碰撞检测
   * 使用四叉树空间分区算法优化碰撞检测性能
   * 每帧重建四叉树，插入所有活跃实体，然后检测候选碰撞对
   */
  private checkCollisions(): void {
    // 构建四叉树
    const quadtree = new Quadtree({
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
    })

    // 插入所有活跃实体
    for (const entity of this.entities) {
      if (entity.isActive) {
        quadtree.insert(entity)
      }
    }

    // 获取潜在碰撞对并检测
    const pairs = quadtree.getPotentialCollisions()
    for (const [entityA, entityB] of pairs) {
      if (!entityA.isActive || !entityB.isActive) continue

      // 使用 AABB 碰撞检测工具函数
      if (checkAABBCollision(entityA, entityB)) {
        // 检查是否为玩家受伤（触发屏幕震动）
        this.checkPlayerHit(entityA, entityB)

        // 特殊处理导弹碰撞（需要爆炸）
        if (entityA.id.startsWith('missile')) {
          this.handleMissileCollision(entityA, entityB)
        } else if (entityB.id.startsWith('missile')) {
          this.handleMissileCollision(entityB, entityA)
        } else {
          entityA.onCollision(entityB)
          entityB.onCollision(entityA)
        }
      }
    }
  }
  
  /**
   * 检查玩家是否被击中（触发屏幕震动）
   * 判断碰撞是否涉及玩家和敌方实体
   */
  private checkPlayerHit(entityA: Entity, entityB: Entity): void {
    const isPlayerHit = 
      (entityA.id === 'player' && this.isEnemyEntity(entityB)) ||
      (entityB.id === 'player' && this.isEnemyEntity(entityA))
    
    if (isPlayerHit) {
      this.effectSystem.triggerScreenShake()
      console.log('[效果系统] 玩家被击中，触发屏幕震动')
    }
  }
  
  /**
   * 检查是否为敌方实体
   * @param entity 实体
   * @returns 是否为敌方实体
   */
  private isEnemyEntity(entity: Entity): boolean {
    return (
      entity.id.startsWith('enemy') ||
      entity.id.startsWith('bullet-enemy') ||
      entity.id.startsWith('missile-enemy')
    )
  }

  /**
   * 处理导弹碰撞
   * 检查导弹是否应该对目标造成伤害并触发爆炸
   */
  private handleMissileCollision(missile: Entity, target: Entity): void {
    // 检查导弹是否应该对目标造成伤害
    const missileOwner = (missile as any).owner
    const shouldExplode =
      (missileOwner === 'player' && target.id.startsWith('enemy')) ||
      (missileOwner === 'enemy' && target.id === 'player')

    if (shouldExplode && 'explode' in missile && typeof missile.explode === 'function') {
      // 触发爆炸，传递实体数组以便造成范围伤害
      ;(missile as any).explode(this.entities)
      console.log(`[游戏引擎] 导弹 ${missile.id} 触发爆炸`)
    }
  }

  /**
   * 获取 Canvas 上下文
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }

  /**
   * 获取 Canvas 元素
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  /**
   * 获取场景缩放倍数
   */
  getScaleMultiplier(): number {
    return this.scaleMultiplier
  }

  /**
   * 调整画布尺寸以适配屏幕
   * 保持 4:3 的宽高比，并根据屏幕尺寸自动缩放
   */
  resizeCanvas(): void {
    // 获取容器尺寸（通常是窗口尺寸）
    const containerWidth = window.innerWidth
    const containerHeight = window.innerHeight

    // 基础尺寸（4:3 宽高比）
    const baseWidth = GAME_CONFIG.CANVAS_WIDTH
    const baseHeight = GAME_CONFIG.CANVAS_HEIGHT
    const aspectRatio = baseWidth / baseHeight

    // 计算适配后的尺寸
    let canvasWidth: number
    let canvasHeight: number

    // 根据容器宽高比决定缩放方式
    const containerAspectRatio = containerWidth / containerHeight

    if (containerAspectRatio > aspectRatio) {
      // 容器更宽，以高度为基准
      canvasHeight = Math.min(containerHeight * 0.9, baseHeight * this.scaleMultiplier)
      canvasWidth = canvasHeight * aspectRatio
    } else {
      // 容器更高，以宽度为基准
      canvasWidth = Math.min(containerWidth * 0.9, baseWidth * this.scaleMultiplier)
      canvasHeight = canvasWidth / aspectRatio
    }

    // 应用缩放倍数
    this.canvas.width = Math.floor(canvasWidth)
    this.canvas.height = Math.floor(canvasHeight)

    console.log(`[游戏引擎] 画布尺寸调整: ${this.canvas.width}x${this.canvas.height}`)
  }

  /**
   * 获取缩放后的 Canvas 宽度
   */
  getCanvasWidth(): number {
    return this.canvas.width
  }

  /**
   * 获取缩放后的 Canvas 高度
   */
  getCanvasHeight(): number {
    return this.canvas.height
  }

  /**
   * 设置更新回调
   */
  setOnUpdate(callback: (deltaTime: number) => void): void {
    this.onUpdateCallback = callback
  }

  /**
   * 设置游戏结束回调
   * @param callback 游戏结束时调用的回调函数，参数为当前分数
   */
  setOnGameOver(callback: (score: number) => void): void {
    this.onGameOverCallback = callback
  }

  /**
   * 触发游戏结束流程
   * 停止游戏循环并调用游戏结束回调
   * 使用 try-catch 确保即使回调异常，游戏循环也能安全停止
   * @param score 当前游戏分数
   */
  triggerGameOver(score: number): void {
    this.stop()
    if (this.onGameOverCallback) {
      try {
        this.onGameOverCallback(score)
      } catch (error) {
        console.error('[GameEngine] 游戏结束回调异常:', error)
      }
    }
  }

  /**
   * 设置背景渲染器
   */
  setBackgroundRenderer(renderer: (ctx: CanvasRenderingContext2D) => void): void {
    this.backgroundRenderer = renderer
  }
  
  /**
   * 获取效果系统
   */
  getEffectSystem(): EffectSystem {
    return this.effectSystem
  }
  
  /**
   * 获取音频系统
   */
  getAudioSystem(): AudioSystem {
    return this.audioSystem
  }
  
  /**
   * 初始化音频系统
   */
  async initializeAudio(): Promise<void> {
    try {
      await this.audioSystem.initialize()
      console.log('[游戏引擎] 音频系统初始化成功')
    } catch (error) {
      console.error('[游戏引擎] 音频系统初始化失败:', error)
    }
  }
  
  /**
   * 恢复音频上下文（处理浏览器自动播放策略）
   */
  async resumeAudio(): Promise<void> {
    await this.audioSystem.resumeAudioContext()
  }
  
  /**
   * 获取内存管理器
   */
  getMemoryManager(): MemoryManager {
    return this.memoryManager
  }
  
  /**
   * 执行清理操作（由内存管理器触发）
   */
  private performCleanup(): void {
    console.log('[游戏引擎] 执行内存清理')
    
    // 1. 清理不活跃的实体
    const inactiveCount = this.entities.filter(e => !e.isActive).length
    this.entities = this.entities.filter(e => e.isActive)
    
    if (inactiveCount > 0) {
      console.log(`[游戏引擎] 清理了 ${inactiveCount} 个不活跃实体`)
    }
    
    // 2. 优化对象池（收缩到合理大小）
    // 注意：PoolManager 没有 shrink 方法，但可以通过统计信息判断是否需要清理
    const poolStats = this.poolManager.getStats()
    console.log(`[游戏引擎] 对象池状态 - 子弹: ${poolStats.bullets.available}, 导弹: ${poolStats.missiles.available}`)
    
    // 3. 清理效果系统中已完成的效果
    // EffectSystem 会自动清理，这里只是确保
    console.log('[游戏引擎] 效果系统自动清理已完成的效果')
    
    // 4. 触发音频系统清理
    // AudioSystem 会自动管理音频池，这里只是记录
    console.log('[游戏引擎] 音频系统自动管理音频资源')
  }
}
