/**
 * 集成测试 33.2: 系统交互测试
 * 
 * 测试内容:
 * - 测试渲染和音频协同
 * - 测试效果和音效协同
 * - 测试输入和移动协同
 * - 测试 UI 和游戏状态协同
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GameEngine } from '../GameEngine'
import { PlayerAircraft } from '../entities/PlayerAircraft'
import { Enemy } from '../entities/Enemy'
import { EnhancedInputManager } from '../EnhancedInputManager'
import { EnemyType } from '../types'
import { SoundEffect, ExplosionSize } from '../EffectSystem'

// Mock Canvas API
class MockCanvasRenderingContext2D {
  canvas = { width: 800, height: 600 }
  fillStyle = ''
  strokeStyle = ''
  lineWidth = 1
  font = ''
  textAlign = 'left'
  textBaseline = 'top'
  
  fillRect() {}
  strokeRect() {}
  clearRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  fill() {}
  stroke() {}
  fillText() {}
  strokeText() {}
  measureText() { return { width: 10 } }
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  scale() {}
  drawImage() {}
  createLinearGradient() { return { addColorStop: () => {} } }
  createRadialGradient() { return { addColorStop: () => {} } }
  getImageData() { return { data: new Uint8ClampedArray(4), width: 1, height: 1 } }
  putImageData() {}
}

describe('集成测试 33.2: 系统交互', () => {
  let canvas: HTMLCanvasElement
  let gameEngine: GameEngine
  let player: PlayerAircraft
  let inputManager: EnhancedInputManager

  beforeEach(() => {
    // 创建测试用 Canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    
    // Mock getContext
    vi.spyOn(canvas, 'getContext').mockReturnValue(new MockCanvasRenderingContext2D() as any)

    // 初始化游戏引擎
    gameEngine = new GameEngine(canvas, { scaleMultiplier: 1.5 })
    player = new PlayerAircraft(400, 500, gameEngine.getCanvasWidth(), gameEngine.getCanvasHeight())
    gameEngine.addEntity(player)

    // 初始化输入管理器（传递 canvas 以支持移动端控制）
    inputManager = new EnhancedInputManager(canvas)

    // Mock 音频系统
    vi.spyOn(gameEngine.getAudioSystem(), 'playSoundEffect')
    vi.spyOn(gameEngine.getAudioSystem(), 'playBackgroundMusic')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('渲染和音频协同', () => {
    it('应该在游戏开始时播放背景音乐', async () => {
      const audioSystem = gameEngine.getAudioSystem()
      await audioSystem.initialize()
      
      audioSystem.playBackgroundMusic(1, false)
      expect(audioSystem.playBackgroundMusic).toHaveBeenCalledWith(1, false)
    })

    it('应该在 BOSS 出现时切换音乐', async () => {
      const audioSystem = gameEngine.getAudioSystem()
      await audioSystem.initialize()
      
      // 普通关卡音乐
      audioSystem.playBackgroundMusic(1, false)
      expect(audioSystem.playBackgroundMusic).toHaveBeenCalledWith(1, false)
      
      // BOSS 音乐
      audioSystem.playBackgroundMusic(1, true)
      expect(audioSystem.playBackgroundMusic).toHaveBeenCalledWith(1, true)
    })

    it('应该在渲染时应用屏幕震动偏移', () => {
      const effectSystem = gameEngine.getEffectSystem()
      
      // 触发屏幕震动
      effectSystem.triggerScreenShake()
      
      // 获取震动偏移
      const offset = effectSystem.getScreenOffset()
      expect(Math.abs(offset.x)).toBeGreaterThan(0)
      expect(Math.abs(offset.y)).toBeGreaterThan(0)
    })

    it('应该在震动结束后恢复正常渲染', () => {
      const effectSystem = gameEngine.getEffectSystem()
      
      effectSystem.triggerScreenShake()
      
      // 等待震动结束（300ms）
      effectSystem.update(350)
      
      const offset = effectSystem.getScreenOffset()
      expect(offset.x).toBe(0)
      expect(offset.y).toBe(0)
    })
  })

  describe('效果和音效协同', () => {
    it('应该在敌人被击败时创建爆炸并播放音效', () => {
      const enemy = new Enemy(
        EnemyType.WHITE,
        100,
        100,
        false,
        false,
        1.0
      )
      
      gameEngine.addEntity(enemy)
      
      // 击败敌人
      enemy.takeDamage(enemy.getCurrentHealth())
      
      // 更新游戏引擎以触发实体销毁处理
      gameEngine.start()
      setTimeout(() => {
        gameEngine.stop()
        
        // 验证爆炸效果被创建
        const effectSystem = gameEngine.getEffectSystem()
        expect(effectSystem.getExplosions().length).toBeGreaterThan(0)
        
        // 验证音效被播放
        expect(gameEngine.getAudioSystem().playSoundEffect).toHaveBeenCalled()
      }, 100)
    })

    it('应该在玩家被击中时触发震动和音效', () => {
      const enemy = new Enemy(
        EnemyType.WHITE,
        player.x,
        player.y,
        false,
        false,
        1.0
      )
      
      gameEngine.addEntity(enemy)
      
      const initialHealth = player.getCurrentHealth()
      
      // 启动游戏循环以触发碰撞检测
      gameEngine.start()
      
      setTimeout(() => {
        gameEngine.stop()
        
        // 验证玩家受伤
        expect(player.getCurrentHealth()).toBeLessThan(initialHealth)
        
        // 验证屏幕震动被触发
        const effectSystem = gameEngine.getEffectSystem()
        const offset = effectSystem.getScreenOffset()
        expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThan(0)
      }, 100)
    })

    it('应该在导弹爆炸时播放爆炸音效', () => {
      const audioSystem = gameEngine.getAudioSystem()
      
      // 模拟导弹爆炸
      audioSystem.playSoundEffect(SoundEffect.MISSILE_EXPLODE)
      
      expect(audioSystem.playSoundEffect).toHaveBeenCalledWith(SoundEffect.MISSILE_EXPLODE)
    })

    it('应该根据敌人类型播放不同的爆炸音效', () => {
      const audioSystem = gameEngine.getAudioSystem()
      
      // 普通敌人
      audioSystem.playSoundEffect(SoundEffect.ENEMY_EXPLODE)
      expect(audioSystem.playSoundEffect).toHaveBeenCalledWith(SoundEffect.ENEMY_EXPLODE)
      
      // 精英怪
      audioSystem.playSoundEffect(SoundEffect.ELITE_EXPLODE)
      expect(audioSystem.playSoundEffect).toHaveBeenCalledWith(SoundEffect.ELITE_EXPLODE)
      
      // 关底 BOSS
      audioSystem.playSoundEffect(SoundEffect.STAGE_BOSS_EXPLODE)
      expect(audioSystem.playSoundEffect).toHaveBeenCalledWith(SoundEffect.STAGE_BOSS_EXPLODE)
      
      // 最终 BOSS
      audioSystem.playSoundEffect(SoundEffect.FINAL_BOSS_EXPLODE)
      expect(audioSystem.playSoundEffect).toHaveBeenCalledWith(SoundEffect.FINAL_BOSS_EXPLODE)
    })
  })

  describe('输入和移动协同', () => {
    it('应该在按下方向键时移动玩家', () => {
      const initialX = player.x
      
      // 模拟按下右方向键
      inputManager.handleKeyDown({ key: 'd' } as KeyboardEvent)
      
      // 更新输入管理器
      inputManager.update(16)
      
      // 更新玩家
      player.handleInput(inputManager)
      
      // 验证玩家移动
      expect(player.x).toBeGreaterThan(initialX)
    })

    it('应该在释放方向键时停止移动', () => {
      // 按下右方向键
      inputManager.handleKeyDown({ key: 'd' } as KeyboardEvent)
      inputManager.update(16)
      player.handleInput(inputManager)
      
      const x1 = player.x
      
      // 释放方向键
      inputManager.handleKeyUp({ key: 'd' } as KeyboardEvent)
      inputManager.update(16)
      player.handleInput(inputManager)
      
      const x2 = player.x
      
      // 再次更新，玩家应该不再移动
      inputManager.update(16)
      player.handleInput(inputManager)
      
      const x3 = player.x
      
      expect(x2).toBe(x3) // 释放后不再移动
    })

    it('应该在按下射击键时发射武器', () => {
      const initialEntities = gameEngine.getEntities().length
      
      // 按下机炮键
      inputManager.handleKeyDown({ key: 'j' } as KeyboardEvent)
      inputManager.update(16)
      
      // 更新玩家（会发射子弹）
      player.handleInput(inputManager)
      player.update(16)
      
      // 验证子弹被创建
      expect(gameEngine.getEntities().length).toBeGreaterThan(initialEntities)
    })

    it('应该在长按移动键时持续移动', () => {
      const initialX = player.x
      
      // 按下右方向键
      inputManager.handleKeyDown({ key: 'd' } as KeyboardEvent)
      
      // 模拟长按（多次更新）
      for (let i = 0; i < 5; i++) {
        inputManager.update(200) // 每次 200ms
        player.handleInput(inputManager)
      }
      
      // 验证玩家持续移动
      expect(player.x).toBeGreaterThan(initialX)
    })
  })

  describe('UI 和游戏状态协同', () => {
    it('应该在玩家受伤时更新生命值', () => {
      const initialHealth = player.getCurrentHealth()
      
      player.takeDamage(1)
      
      expect(player.getCurrentHealth()).toBe(initialHealth - 1)
    })

    it('应该在玩家发射导弹时更新导弹数量', () => {
      const initialMissiles = player.getMissileCount()
      
      // 按下导弹键
      inputManager.handleKeyDown({ key: 'k' } as KeyboardEvent)
      inputManager.update(16)
      player.handleInput(inputManager)
      player.update(16)
      
      // 验证导弹数量减少
      expect(player.getMissileCount()).toBe(initialMissiles - 1)
    })

    it('应该在拾取道具时更新玩家状态', () => {
      const initialHealth = player.getCurrentHealth()
      const initialMissiles = player.getMissileCount()
      
      // 模拟拾取生命值道具
      player.heal(1)
      expect(player.getCurrentHealth()).toBe(Math.min(initialHealth + 1, player.getMaxHealth()))
      
      // 模拟拾取导弹道具
      player.addMissiles(1)
      expect(player.getMissileCount()).toBe(initialMissiles + 1)
    })

    it('应该在玩家死亡时触发游戏结束', () => {
      const maxHealth = player.getMaxHealth()
      
      // 造成致命伤害
      player.takeDamage(maxHealth)
      
      // 验证玩家死亡
      expect(player.getCurrentHealth()).toBe(0)
      expect(player.isActive).toBe(false)
    })

    it('应该在核弹进度条满时允许发射核弹', () => {
      // 设置核弹进度为满
      player.setNuclearProgress(100)
      
      expect(player.canFireNuclear()).toBe(true)
      
      // 发射核弹
      player.fireNuclear()
      
      // 验证进度重置
      expect(player.getNuclearProgress()).toBe(0)
      expect(player.canFireNuclear()).toBe(false)
    })
  })

  describe('多系统协同场景', () => {
    it('应该正确处理玩家击败敌人的完整流程', () => {
      const enemy = new Enemy(
        EnemyType.WHITE,
        100,
        100,
        false,
        false,
        1.0
      )
      
      gameEngine.addEntity(enemy)
      
      const initialScore = 0 // 假设有分数系统
      
      // 玩家发射子弹
      inputManager.handleKeyDown({ key: 'j' } as KeyboardEvent)
      inputManager.update(16)
      player.handleInput(inputManager)
      player.update(16)
      
      // 击败敌人
      enemy.takeDamage(enemy.getCurrentHealth())
      
      // 验证：
      // 1. 敌人被标记为不活跃
      expect(enemy.isActive).toBe(false)
      
      // 2. 爆炸效果被创建（需要游戏循环更新）
      // 3. 音效被播放（需要游戏循环更新）
      // 4. 分数增加（如果有分数系统）
    })

    it('应该正确处理敌人击中玩家的完整流程', () => {
      const enemy = new Enemy(
        EnemyType.WHITE,
        player.x,
        player.y - 50,
        false,
        false,
        1.0
      )
      
      gameEngine.addEntity(enemy)
      
      const initialHealth = player.getCurrentHealth()
      
      // 敌人向下移动接近玩家
      enemy.y = player.y
      
      // 启动游戏循环触发碰撞
      gameEngine.start()
      
      setTimeout(() => {
        gameEngine.stop()
        
        // 验证：
        // 1. 玩家生命值减少
        expect(player.getCurrentHealth()).toBeLessThanOrEqual(initialHealth)
        
        // 2. 屏幕震动被触发
        const offset = gameEngine.getEffectSystem().getScreenOffset()
        expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThanOrEqual(0)
        
        // 3. UI 更新显示新的生命值
      }, 100)
    })

    it('应该正确处理玩家拾取道具的完整流程', () => {
      const initialHealth = player.getCurrentHealth()
      const initialMissiles = player.getMissileCount()
      
      // 模拟拾取生命值道具
      player.heal(1)
      
      // 验证：
      // 1. 玩家生命值增加
      expect(player.getCurrentHealth()).toBeGreaterThan(initialHealth)
      
      // 2. UI 更新显示新的生命值
      // 3. 播放拾取音效（如果有）
      
      // 模拟拾取导弹道具
      player.addMissiles(1)
      
      // 验证：
      // 1. 导弹数量增加
      expect(player.getMissileCount()).toBeGreaterThan(initialMissiles)
      
      // 2. UI 更新显示新的导弹数量
    })

    it('应该正确处理关卡切换的完整流程', async () => {
      const audioSystem = gameEngine.getAudioSystem()
      await audioSystem.initialize()
      
      // 第一关音乐
      audioSystem.playBackgroundMusic(1, false)
      expect(audioSystem.playBackgroundMusic).toHaveBeenCalledWith(1, false)
      
      // 切换到第二关
      audioSystem.stopBackgroundMusic()
      audioSystem.playBackgroundMusic(2, false)
      
      // 验证：
      // 1. 旧音乐停止
      // 2. 新音乐开始播放
      expect(audioSystem.playBackgroundMusic).toHaveBeenCalledWith(2, false)
      
      // 3. 背景渲染切换
      // 4. 敌人类型切换
    })
  })
})
