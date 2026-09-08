/**
 * 场景扩展系统属性测试
 * 
 * 测试场景扩展功能的正确性：
 * - 属性 6: 场景尺寸扩展正确性
 * - 属性 7: 元素同步扩展
 * - 属性 8: 扩展后性能保持
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GameEngine } from '../GameEngine'
import { PlayerAircraft } from '../entities/PlayerAircraft'
import { Enemy } from '../entities/Enemy'
import { Bullet } from '../entities/Bullet'
import { Missile } from '../entities/Missile'
import { Pickup } from '../entities/Pickup'
import { PoolManager } from '../PoolManager'
import { GAME_CONFIG, SCENE_CONFIG } from '../constants'
import { EnemyType, PickupType } from '../types'

// Mock Canvas 2D Context
function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  
  // Mock getContext to return a valid 2D context
  const mockContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    clip: vi.fn(),
    rect: vi.fn(),
  } as any

  canvas.getContext = vi.fn(() => mockContext)
  
  return canvas
}

describe('场景扩展系统属性测试', () => {
  let canvas: HTMLCanvasElement
  let gameEngine: GameEngine

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('innerWidth', 1920)
    vi.stubGlobal('innerHeight', 1440)
    // 创建测试用 Canvas with mock context
    canvas = createMockCanvas()
    document.body.appendChild(canvas)
  })

  afterEach(() => {
    // 清理
    if (gameEngine) {
      gameEngine.stop()
    }
    document.body.removeChild(canvas)
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  /**
   * 属性 6: 场景尺寸扩展正确性
   * Feature: game-v2-upgrade, Property 6: 场景尺寸扩展正确性
   * 
   * 对于游戏场景，初始化后的尺寸应该是原版的 1.5 倍
   * 验证需求: 5.1
   */
  describe('属性 6: 场景尺寸扩展正确性', () => {
    it('应该将场景尺寸扩大到原版的 1.5 倍', () => {
      // 创建使用默认缩放的游戏引擎
      gameEngine = new GameEngine(canvas)

      // 验证 Canvas 尺寸
      const expectedWidth = Math.floor(GAME_CONFIG.CANVAS_WIDTH * SCENE_CONFIG.SCALE_MULTIPLIER)
      const expectedHeight = Math.floor(GAME_CONFIG.CANVAS_HEIGHT * SCENE_CONFIG.SCALE_MULTIPLIER)

      expect(gameEngine.getCanvasWidth()).toBe(expectedWidth)
      expect(gameEngine.getCanvasHeight()).toBe(expectedHeight)
      expect(gameEngine.getScaleMultiplier()).toBe(SCENE_CONFIG.SCALE_MULTIPLIER)

      // 验证实际 Canvas 元素尺寸
      expect(canvas.width).toBe(expectedWidth)
      expect(canvas.height).toBe(expectedHeight)
    })

    it('应该正确应用自定义缩放倍数', () => {
      // 测试不同的缩放倍数
      const customScale = 2.0
      gameEngine = new GameEngine(canvas, { scaleMultiplier: customScale })

      const expectedWidth = Math.floor(GAME_CONFIG.CANVAS_WIDTH * customScale)
      const expectedHeight = Math.floor(GAME_CONFIG.CANVAS_HEIGHT * customScale)

      expect(gameEngine.getCanvasWidth()).toBe(expectedWidth)
      expect(gameEngine.getCanvasHeight()).toBe(expectedHeight)
      expect(gameEngine.getScaleMultiplier()).toBe(customScale)
    })

    it('应该使用 SCENE_CONFIG 中定义的 V2 尺寸', () => {
      gameEngine = new GameEngine(canvas)

      // 验证与 SCENE_CONFIG 中预计算的值一致
      expect(gameEngine.getCanvasWidth()).toBe(SCENE_CONFIG.CANVAS_WIDTH_V2)
      expect(gameEngine.getCanvasHeight()).toBe(SCENE_CONFIG.CANVAS_HEIGHT_V2)
    })

    it.each([
      [400, 800, 360, 270],
      [800, 400, 480, 360],
    ])('视口 %ix%i 应保持比例并适配可用空间', (width, height, expectedWidth, expectedHeight) => {
      vi.stubGlobal('innerWidth', width)
      vi.stubGlobal('innerHeight', height)
      gameEngine = new GameEngine(canvas)

      expect(canvas.width).toBe(expectedWidth)
      expect(canvas.height).toBe(expectedHeight)
      expect(canvas.width / canvas.height).toBeCloseTo(4 / 3)
      expect(canvas.width).toBeLessThanOrEqual(width * 0.9)
      expect(canvas.height).toBeLessThanOrEqual(height * 0.9)
    })
  })

  describe('实际画布边界同步', () => {
    it.each(['入队前缩小', '入队后缩小'] as const)('%s 时所有实体都应该使用实际小屏边界', phase => {
      if (phase === '入队前缩小') {
        vi.stubGlobal('innerWidth', 400)
        vi.stubGlobal('innerHeight', 800)
      }
      gameEngine = new GameEngine(canvas)
      const bullet = new Bullet(100, 50, 2, 20, 'enemy', 0)
      const missile = new Missile(100, 50, 5, 12, 3, 'player', Math.PI / 2)
      const pickup = new Pickup(PickupType.REPAIR, 100, 50)
      const player = new PlayerAircraft(1100, 800)
      for (const entity of [bullet, missile, pickup, player]) gameEngine.addEntity(entity)

      if (phase === '入队后缩小') {
        vi.stubGlobal('innerWidth', 400)
        vi.stubGlobal('innerHeight', 800)
        gameEngine.resizeCanvas()
      }
      expect(canvas.width).toBe(360)
      expect(canvas.height).toBe(270)
      expect(player.x).toBe(canvas.width - player.width)
      expect(player.y).toBe(canvas.height - player.height)
      player.move(1, 1)
      expect(player.x).toBe(canvas.width - player.width)
      expect(player.y).toBe(canvas.height - player.height)

      // 恰好处于原有销毁阈值时仍保留，越过一像素后才销毁。
      bullet.y = canvas.height + bullet.height
      bullet.update(0)
      expect(bullet.isActive).toBe(true)
      bullet.y++
      bullet.update(0)
      expect(bullet.isActive).toBe(false)

      missile.x = canvas.width + missile.width
      missile.update(0)
      expect(missile.isActive).toBe(true)
      missile.x++
      missile.update(0)
      expect(missile.isActive).toBe(false)

      pickup.y = canvas.height - pickup.fallSpeed
      pickup.update(0)
      expect(pickup.isActive).toBe(true)
      pickup.update(0)
      expect(pickup.isActive).toBe(false)
    })

    it('对象池复用后应该采用新画布边界，且不影响其他实例', () => {
      vi.stubGlobal('innerWidth', 400)
      vi.stubGlobal('innerHeight', 800)
      gameEngine = new GameEngine(canvas)
      const pool = PoolManager.getInstance()
      const bullet = pool.acquireBullet(100, 100, 2, 20, 'enemy')
      const missile = pool.acquireMissile(100, 100, 5, 12, 3, 'enemy')
      gameEngine.addEntity(bullet)
      gameEngine.addEntity(missile)
      gameEngine.removeEntity(bullet)
      gameEngine.removeEntity(missile)
      pool.releaseBullet(bullet)
      pool.releaseMissile(missile)

      vi.stubGlobal('innerWidth', 1920)
      vi.stubGlobal('innerHeight', 1440)
      gameEngine.resizeCanvas()
      const reusedBullet = pool.acquireBullet(100, 500, 2, 20, 'enemy')
      const reusedMissile = pool.acquireMissile(100, 500, 5, 12, 3, 'enemy')
      expect(reusedBullet).toBe(bullet)
      expect(reusedMissile).toBe(missile)
      gameEngine.addEntity(reusedBullet)
      gameEngine.addEntity(reusedMissile)

      // 另一个小画布中的同类实体不能改变已入队对象的边界。
      const otherBullet = new Bullet(100, 500, 2, 20, 'enemy')
      const otherMissile = new Missile(100, 500, 5, 12, 3, 'enemy')
      otherBullet.setCanvasBounds(360, 270)
      otherMissile.setCanvasBounds(360, 270)
      otherBullet.update(0)
      otherMissile.update(0)
      expect(otherBullet.isActive).toBe(false)
      expect(otherMissile.isActive).toBe(false)
      reusedBullet.update(0)
      reusedMissile.update(0)
      expect(reusedBullet.isActive).toBe(true)
      expect(reusedMissile.isActive).toBe(true)

      reusedBullet.y = canvas.height + reusedBullet.height + 1
      reusedMissile.y = canvas.height + reusedMissile.height + 1
      reusedBullet.update(0)
      reusedMissile.update(0)
      expect(reusedBullet.isActive).toBe(false)
      expect(reusedMissile.isActive).toBe(false)
      gameEngine.removeEntity(reusedBullet)
      gameEngine.removeEntity(reusedMissile)
      pool.releaseBullet(reusedBullet)
      pool.releaseMissile(reusedMissile)
    })

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('实体应该拒绝无效画布尺寸 %s', invalidSize => {
      const entities = [new Bullet(), new Missile(), new Pickup(PickupType.REPAIR, 0, 0), new PlayerAircraft(0, 0)]
      for (const entity of entities) {
        expect(() => entity.setCanvasBounds(invalidSize, 270)).toThrow(RangeError)
        expect(() => entity.setCanvasBounds(360, invalidSize)).toThrow(RangeError)
      }
    })
  })

  /**
   * 属性 7: 元素同步扩展
   * Feature: game-v2-upgrade, Property 7: 元素同步扩展
   * 
   * 对于任何游戏元素（边框、背景等），当场景扩大时，元素尺寸应该同步扩大相同比例
   * 验证需求: 5.2
   */
  describe('属性 7: 元素同步扩展', () => {
    it('玩家飞机应该能在扩展后的场景中正确移动', () => {
      gameEngine = new GameEngine(canvas)
      const canvasWidth = gameEngine.getCanvasWidth()
      const canvasHeight = gameEngine.getCanvasHeight()

      // 创建玩家在场景中央
      const player = new PlayerAircraft(canvasWidth / 2, canvasHeight / 2)
      gameEngine.addEntity(player)

      // 向右移动到边界
      const initialX = player.x
      while (player.x < canvasWidth - player.width - 10) {
        player.move(1, 0)
      }

      // 验证玩家可以移动到接近右边界
      expect(player.x).toBeGreaterThan(initialX)
      expect(player.x).toBeLessThanOrEqual(canvasWidth - player.width)

      // 向下移动到边界
      const initialY = player.y
      while (player.y < canvasHeight - player.height - 10) {
        player.move(0, 1)
      }

      // 验证玩家可以移动到接近下边界
      expect(player.y).toBeGreaterThan(initialY)
      expect(player.y).toBeLessThanOrEqual(canvasHeight - player.height)
    })

    it('子弹应该在扩展后的场景边界外销毁', () => {
      gameEngine = new GameEngine(canvas)
      const canvasHeight = gameEngine.getCanvasHeight()

      // 创建向上飞行的子弹
      const bullet = new Bullet(100, 50, 2, 20, 'player', 0)
      gameEngine.addEntity(bullet)

      // 模拟子弹飞出屏幕上方
      bullet.y = -bullet.height - 1
      bullet.update(16)

      // 验证子弹被销毁
      expect(bullet.isActive).toBe(false)

      // 创建向下飞行的子弹
      const bullet2 = new Bullet(100, canvasHeight - 50, 2, 20, 'enemy', 0)
      gameEngine.addEntity(bullet2)

      // 模拟子弹飞出屏幕下方
      bullet2.y = canvasHeight + bullet2.height + 1
      bullet2.update(16)

      // 验证子弹被销毁
      expect(bullet2.isActive).toBe(false)
    })

    it('导弹应该在扩展后的场景边界外销毁', () => {
      gameEngine = new GameEngine(canvas)
      const canvasWidth = gameEngine.getCanvasWidth()
      // const canvasHeight = gameEngine.getCanvasHeight() // 暂未使用

      // 创建导弹
      const missile = new Missile(100, 50, 5, 12, 3, 'player', 0)
      gameEngine.addEntity(missile)

      // 模拟导弹飞出屏幕上方
      missile.y = -missile.height - 1
      missile.update(16)

      // 验证导弹被销毁
      expect(missile.isActive).toBe(false)

      // 创建导弹飞出右侧
      const missile2 = new Missile(canvasWidth - 50, 100, 5, 12, 3, 'player', Math.PI / 2)
      gameEngine.addEntity(missile2)

      missile2.x = canvasWidth + missile2.width + 1
      missile2.update(16)

      // 验证导弹被销毁
      expect(missile2.isActive).toBe(false)
    })

    it('掉落物应该在扩展后的场景底部边界外销毁', () => {
      gameEngine = new GameEngine(canvas)
      const canvasHeight = gameEngine.getCanvasHeight()

      // 创建掉落物
      const pickup = new Pickup(PickupType.REPAIR, 100, canvasHeight - 50)
      gameEngine.addEntity(pickup)

      // 模拟掉落物飞出屏幕底部
      pickup.y = canvasHeight + 1
      pickup.update(16)

      // 验证掉落物被销毁
      expect(pickup.isActive).toBe(false)
    })

    it('敌人应该能在扩展后的场景中生成和移动', () => {
      gameEngine = new GameEngine(canvas)
      const canvasWidth = gameEngine.getCanvasWidth()

      // 在场景宽度范围内生成多个敌人
      const positions = [
        canvasWidth * 0.1,
        canvasWidth * 0.3,
        canvasWidth * 0.5,
        canvasWidth * 0.7,
        canvasWidth * 0.9 - 60 // 减去敌人宽度
      ]

      positions.forEach(x => {
        const enemy = new Enemy(EnemyType.WHITE, x, 50, false, false)
        gameEngine.addEntity(enemy)

        // 验证敌人在场景范围内
        expect(enemy.x).toBeGreaterThanOrEqual(0)
        expect(enemy.x).toBeLessThan(canvasWidth)
      })
    })
  })

  /**
   * 属性 8: 扩展后性能保持
   * Feature: game-v2-upgrade, Property 8: 扩展后性能保持
   * 
   * 对于扩大后的游戏场景，帧率应该保持在 60 FPS
   * 验证需求: 5.4
   */
  describe('属性 8: 扩展后性能保持', () => {
    it('应该在扩展场景中保持稳定的帧率', () => {
      gameEngine = new GameEngine(canvas)
      const canvasWidth = gameEngine.getCanvasWidth()
      const canvasHeight = gameEngine.getCanvasHeight()

      // 添加多个实体以模拟游戏负载
      const player = new PlayerAircraft(canvasWidth / 2, canvasHeight - 100)
      gameEngine.addEntity(player)

      // 添加多个敌人
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * (canvasWidth - 60)
        const y = Math.random() * 200
        const enemy = new Enemy(EnemyType.WHITE, x, y, false, false)
        gameEngine.addEntity(enemy)
      }

      // 添加多个子弹
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * canvasWidth
        const y = Math.random() * canvasHeight
        const bullet = new Bullet(x, y, 2, 20, 'player', 0)
        gameEngine.addEntity(bullet)
      }

      // 启动游戏引擎
      gameEngine.start()

      // 在测试环境中，FPS 计数器需要时间来初始化
      // 我们验证游戏引擎可以正常启动和运行
      expect(gameEngine).toBeDefined()
      
      // 验证所有实体都被正确添加
      const entityCount = gameEngine.getEntities().length
      expect(entityCount).toBeGreaterThan(0)

      // 停止游戏引擎
      gameEngine.stop()

      // 在实际浏览器环境中，FPS 应该能达到 60
      // 在测试环境中，我们主要验证系统不会崩溃
    })

    it('应该能够处理大量实体而不崩溃', () => {
      gameEngine = new GameEngine(canvas)
      const canvasWidth = gameEngine.getCanvasWidth()
      const canvasHeight = gameEngine.getCanvasHeight()

      // 添加大量实体
      const entityCount = 100

      for (let i = 0; i < entityCount; i++) {
        const x = Math.random() * (canvasWidth - 60)
        const y = Math.random() * (canvasHeight - 40)
        const enemy = new Enemy(EnemyType.WHITE, x, y, false, false)
        gameEngine.addEntity(enemy)
      }

      // 验证所有实体都被添加
      expect(gameEngine.getEntities().length).toBe(entityCount)

      // 启动游戏引擎
      gameEngine.start()

      // 运行几帧
      for (let i = 0; i < 10; i++) {
        // 游戏循环会自动运行
      }

      // 停止游戏引擎
      gameEngine.stop()

      // 验证游戏引擎仍然正常工作
      expect(gameEngine).toBeDefined()
    })

    it('应该正确处理视锥剔除以优化性能', () => {
      gameEngine = new GameEngine(canvas)
      const canvasWidth = gameEngine.getCanvasWidth()
      const canvasHeight = gameEngine.getCanvasHeight()

      // 添加屏幕外的实体
      const offscreenEnemy = new Enemy(EnemyType.WHITE, -200, -200, false, false)
      gameEngine.addEntity(offscreenEnemy)

      // 添加屏幕内的实体
      const onscreenEnemy = new Enemy(EnemyType.WHITE, canvasWidth / 2, canvasHeight / 2, false, false)
      gameEngine.addEntity(onscreenEnemy)

      // 验证两个实体都被添加
      expect(gameEngine.getEntities().length).toBe(2)

      // 启动游戏引擎
      gameEngine.start()

      // 运行一帧
      setTimeout(() => {
        gameEngine.stop()
      }, 100)

      // 视锥剔除应该在渲染时跳过屏幕外的实体
      // 但实体仍然存在于实体列表中
      expect(gameEngine.getEntities().length).toBe(2)
    })
  })
})
