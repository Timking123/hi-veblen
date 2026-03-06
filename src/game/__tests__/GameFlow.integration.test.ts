/**
 * 集成测试 33.1: 完整游戏流程测试
 * 
 * 测试内容:
 * - 从彩蛋触发到游戏开始
 * - 从第一关到通关
 * - 测试所有关卡和 BOSS
 * - 测试通关庆祝
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameEngine } from '../GameEngine'
import { StageManager } from '../StageManager'
import { PlayerAircraft } from '../entities/PlayerAircraft'
import { Enemy } from '../entities/Enemy'
import { GamePhase, EnemyType } from '../types'
import { useEasterEggStore } from '@/stores/easterEgg'
import { createPinia, setActivePinia } from 'pinia'

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

describe('集成测试 33.1: 完整游戏流程', () => {
  let canvas: HTMLCanvasElement
  let gameEngine: GameEngine
  let stageManager: StageManager
  let player: PlayerAircraft

  beforeEach(() => {
    // 创建测试用 Canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    
    // Mock getContext
    vi.spyOn(canvas, 'getContext').mockReturnValue(new MockCanvasRenderingContext2D() as any)

    // 初始化 Pinia
    setActivePinia(createPinia())

    // 初始化游戏引擎
    gameEngine = new GameEngine(canvas, { scaleMultiplier: 1.5 })
    stageManager = new StageManager()
    player = new PlayerAircraft(400, 500, gameEngine.getCanvasWidth(), gameEngine.getCanvasHeight())
    gameEngine.addEntity(player)
  })

  describe('彩蛋触发流程', () => {
    it('应该从 IDLE 状态开始', () => {
      const store = useEasterEggStore()
      expect(store.phase).toBe(GamePhase.IDLE)
    })

    it('应该能够触发页面崩塌动画', () => {
      const store = useEasterEggStore()
      store.enterCollapseAnimation()
      expect(store.phase).toBe(GamePhase.COLLAPSE_ANIMATION)
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('应该能够进入 CMD 窗口阶段', () => {
      const store = useEasterEggStore()
      store.enterCollapseAnimation()
      store.enterCMDWindow()
      expect(store.phase).toBe(GamePhase.CMD_WINDOW)
    })

    it('应该能够进入游戏规则阶段', () => {
      const store = useEasterEggStore()
      store.enterCollapseAnimation()
      store.enterCMDWindow()
      store.enterRules()
      expect(store.phase).toBe(GamePhase.RULES)
    })

    it('应该能够进入游戏阶段', () => {
      const store = useEasterEggStore()
      store.enterCollapseAnimation()
      store.enterCMDWindow()
      store.enterRules()
      store.enterGame()
      expect(store.phase).toBe(GamePhase.PLAYING)
    })
  })

  describe('第一关流程', () => {
    it('应该从第一关开始', () => {
      expect(stageManager.getCurrentStageNumber()).toBe(1)
      expect(stageManager.getCurrentStage().name).toBe('第一关')
    })

    it('应该能够生成普通敌人', () => {
      const { type, isElite } = stageManager.spawnEnemy()
      expect([EnemyType.NORMAL_1, EnemyType.NORMAL_2, EnemyType.NORMAL_3]).toContain(type)
      expect(typeof isElite).toBe('boolean')
      expect(stageManager.getSpawnedCount()).toBe(1)
    })

    it('应该能够生成所有敌人', () => {
      const totalEnemies = stageManager.getCurrentStage().totalEnemies
      
      for (let i = 0; i < totalEnemies; i++) {
        expect(stageManager.canSpawnEnemy()).toBe(true)
        stageManager.spawnEnemy()
      }
      
      expect(stageManager.getSpawnedCount()).toBe(totalEnemies)
      expect(stageManager.canSpawnEnemy()).toBe(false)
    })

    it('应该在击杀所有敌人后生成 BOSS', () => {
      const totalEnemies = stageManager.getCurrentStage().totalEnemies
      
      // 生成并击杀所有普通敌人
      for (let i = 0; i < totalEnemies; i++) {
        stageManager.spawnEnemy()
        stageManager.recordKill()
      }
      
      expect(stageManager.shouldSpawnBoss()).toBe(true)
      const bossType = stageManager.spawnBoss()
      expect(bossType).toBe(EnemyType.BOSS_1)
    })

    it('应该在击杀 BOSS 后能够进入下一关', () => {
      const totalEnemies = stageManager.getCurrentStage().totalEnemies
      
      // 生成并击杀所有普通敌人
      for (let i = 0; i < totalEnemies; i++) {
        stageManager.spawnEnemy()
        stageManager.recordKill()
      }
      
      // 生成并击杀 BOSS
      stageManager.spawnBoss()
      stageManager.recordBossKill()
      
      expect(stageManager.canAdvanceStage()).toBe(true)
    })
  })

  describe('第二关流程', () => {
    beforeEach(() => {
      // 完成第一关
      const totalEnemies = stageManager.getCurrentStage().totalEnemies
      for (let i = 0; i < totalEnemies; i++) {
        stageManager.spawnEnemy()
        stageManager.recordKill()
      }
      stageManager.spawnBoss()
      stageManager.recordBossKill()
      stageManager.advanceStage()
    })

    it('应该进入第二关', () => {
      expect(stageManager.getCurrentStageNumber()).toBe(2)
      expect(stageManager.getCurrentStage().name).toBe('第二关')
    })

    it('应该重置敌人计数', () => {
      expect(stageManager.getSpawnedCount()).toBe(0)
      expect(stageManager.getKilledCount()).toBe(0)
    })

    it('应该能够生成第二关的敌人', () => {
      const { type } = stageManager.spawnEnemy()
      expect([EnemyType.NORMAL_4, EnemyType.NORMAL_5, EnemyType.NORMAL_6]).toContain(type)
    })

    it('应该在击杀所有敌人后生成第二关 BOSS', () => {
      const totalEnemies = stageManager.getCurrentStage().totalEnemies
      
      for (let i = 0; i < totalEnemies; i++) {
        stageManager.spawnEnemy()
        stageManager.recordKill()
      }
      
      const bossType = stageManager.spawnBoss()
      expect(bossType).toBe(EnemyType.BOSS_2)
    })
  })

  describe('第三关（最终关）流程', () => {
    beforeEach(() => {
      // 完成第一关
      let totalEnemies = stageManager.getCurrentStage().totalEnemies
      for (let i = 0; i < totalEnemies; i++) {
        stageManager.spawnEnemy()
        stageManager.recordKill()
      }
      stageManager.spawnBoss()
      stageManager.recordBossKill()
      stageManager.advanceStage()

      // 完成第二关
      totalEnemies = stageManager.getCurrentStage().totalEnemies
      for (let i = 0; i < totalEnemies; i++) {
        stageManager.spawnEnemy()
        stageManager.recordKill()
      }
      stageManager.spawnBoss()
      stageManager.recordBossKill()
      stageManager.advanceStage()
    })

    it('应该进入第三关（最终关）', () => {
      expect(stageManager.getCurrentStageNumber()).toBe(3)
      expect(stageManager.getCurrentStage().name).toBe('第三关')
      expect(stageManager.isFinalStage()).toBe(true)
    })

    it('应该能够生成第三关的敌人', () => {
      const { type } = stageManager.spawnEnemy()
      expect([EnemyType.NORMAL_7, EnemyType.NORMAL_8, EnemyType.NORMAL_9]).toContain(type)
    })

    it('应该在击杀所有敌人后生成最终 BOSS', () => {
      const totalEnemies = stageManager.getCurrentStage().totalEnemies
      
      for (let i = 0; i < totalEnemies; i++) {
        stageManager.spawnEnemy()
        stageManager.recordKill()
      }
      
      const bossType = stageManager.spawnBoss()
      expect(bossType).toBe(EnemyType.FINAL_BOSS)
    })

    it('应该在击杀最终 BOSS 后游戏通关', () => {
      const totalEnemies = stageManager.getCurrentStage().totalEnemies
      
      for (let i = 0; i < totalEnemies; i++) {
        stageManager.spawnEnemy()
        stageManager.recordKill()
      }
      
      stageManager.spawnBoss()
      stageManager.recordBossKill()
      
      expect(stageManager.isGameComplete()).toBe(true)
      expect(stageManager.canAdvanceStage()).toBe(false)
    })
  })

  describe('通关庆祝流程', () => {
    it('应该能够进入庆祝页面', () => {
      const store = useEasterEggStore()
      store.enterGame()
      store.enterCelebration()
      expect(store.phase).toBe(GamePhase.CELEBRATION)
    })

    it('应该能够从庆祝页面恢复正常', () => {
      const store = useEasterEggStore()
      store.enterCelebration()
      
      // Mock window.location.href
      const originalLocation = window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: originalLocation },
        writable: true
      })
      
      store.restoreNormalPage()
      expect(store.phase).toBe(GamePhase.IDLE)
      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('完整游戏流程集成', () => {
    it('应该能够完成从彩蛋触发到通关的完整流程', () => {
      const store = useEasterEggStore()
      
      // 1. 触发彩蛋
      expect(store.phase).toBe(GamePhase.IDLE)
      store.enterCollapseAnimation()
      expect(store.phase).toBe(GamePhase.COLLAPSE_ANIMATION)
      
      // 2. 进入 CMD 窗口
      store.enterCMDWindow()
      expect(store.phase).toBe(GamePhase.CMD_WINDOW)
      
      // 3. 显示游戏规则
      store.enterRules()
      expect(store.phase).toBe(GamePhase.RULES)
      
      // 4. 开始游戏
      store.enterGame()
      expect(store.phase).toBe(GamePhase.PLAYING)
      
      // 5. 完成所有三关
      for (let stage = 1; stage <= 3; stage++) {
        expect(stageManager.getCurrentStageNumber()).toBe(stage)
        
        // 生成并击杀所有普通敌人
        const totalEnemies = stageManager.getCurrentStage().totalEnemies
        for (let i = 0; i < totalEnemies; i++) {
          stageManager.spawnEnemy()
          stageManager.recordKill()
        }
        
        // 生成并击杀 BOSS
        stageManager.spawnBoss()
        stageManager.recordBossKill()
        
        // 如果不是最后一关，进入下一关
        if (stage < 3) {
          expect(stageManager.canAdvanceStage()).toBe(true)
          stageManager.advanceStage()
        }
      }
      
      // 6. 验证游戏通关
      expect(stageManager.isGameComplete()).toBe(true)
      
      // 7. 进入庆祝页面
      store.enterCelebration()
      expect(store.phase).toBe(GamePhase.CELEBRATION)
    })
  })

  describe('游戏引擎生命周期', () => {
    it('应该能够启动和停止游戏循环', () => {
      gameEngine.start()
      expect(gameEngine.getFPS()).toBeGreaterThanOrEqual(0)
      
      gameEngine.stop()
      // 停止后 FPS 应该保持最后的值
      expect(gameEngine.getFPS()).toBeGreaterThanOrEqual(0)
    })

    it('应该能够暂停和恢复游戏', () => {
      gameEngine.start()
      gameEngine.pause()
      
      // 暂停后应该能够恢复
      gameEngine.resume()
      expect(gameEngine.getFPS()).toBeGreaterThanOrEqual(0)
      
      gameEngine.stop()
    })

    it('应该能够添加和移除实体', () => {
      const enemy = new Enemy(
        EnemyType.NORMAL_1,
        100,
        100,
        false,
        false,
        gameEngine.getCanvasWidth(),
        gameEngine.getCanvasHeight()
      )
      
      gameEngine.addEntity(enemy)
      expect(gameEngine.getEntities()).toContain(enemy)
      
      gameEngine.removeEntity(enemy)
      expect(gameEngine.getEntities()).not.toContain(enemy)
    })

    it('应该能够清空所有实体', () => {
      const enemy1 = new Enemy(
        EnemyType.NORMAL_1,
        100,
        100,
        false,
        false,
        gameEngine.getCanvasWidth(),
        gameEngine.getCanvasHeight()
      )
      const enemy2 = new Enemy(
        EnemyType.NORMAL_2,
        200,
        100,
        false,
        false,
        gameEngine.getCanvasWidth(),
        gameEngine.getCanvasHeight()
      )
      
      gameEngine.addEntity(enemy1)
      gameEngine.addEntity(enemy2)
      
      gameEngine.clearEntities()
      expect(gameEngine.getEntities().length).toBe(0)
    })
  })
})
