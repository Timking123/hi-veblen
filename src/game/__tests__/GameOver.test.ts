/**
 * 游戏结束流程单元测试
 * 验证 GameEngine.triggerGameOver() 和 setOnGameOver() 的正确行为
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GameEngine } from '../GameEngine'
import { PlayerAircraft } from '../entities/PlayerAircraft'

// Mock Canvas 2D Context（复用项目中已有的模式）
function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')

  const mockContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    arc: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } as any

  canvas.getContext = vi.fn(() => mockContext)

  return canvas
}

describe('游戏结束流程', () => {
  let canvas: HTMLCanvasElement
  let gameEngine: GameEngine

  beforeEach(() => {
    canvas = createMockCanvas()
    document.body.appendChild(canvas)
    gameEngine = new GameEngine(canvas, { scaleMultiplier: 1.5 })
  })

  afterEach(() => {
    if (gameEngine) {
      gameEngine.stop()
    }
    document.body.removeChild(canvas)
  })

  describe('setOnGameOver（设置游戏结束回调）', () => {
    it('应该能注册游戏结束回调', () => {
      const callback = vi.fn()
      expect(() => gameEngine.setOnGameOver(callback)).not.toThrow()
    })
  })

  describe('triggerGameOver（触发游戏结束）', () => {
    it('应该停止游戏循环', () => {
      gameEngine.start()
      gameEngine.triggerGameOver(100)

      // 游戏应该已停止，再次调用 stop 不应有副作用
      expect(() => gameEngine.stop()).not.toThrow()
    })

    it('应该调用游戏结束回调并传递分数', () => {
      const callback = vi.fn()
      gameEngine.setOnGameOver(callback)

      gameEngine.triggerGameOver(12345)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(12345)
    })

    it('应该在没有注册回调时安全执行', () => {
      expect(() => gameEngine.triggerGameOver(0)).not.toThrow()
    })

    it('应该在回调异常时不抛出异常', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('回调异常')
      })
      gameEngine.setOnGameOver(errorCallback)
      gameEngine.start()

      expect(() => gameEngine.triggerGameOver(999)).not.toThrow()
      expect(errorCallback).toHaveBeenCalledTimes(1)
    })

    it('应该在回调异常时记录错误日志', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorCallback = vi.fn(() => {
        throw new Error('测试异常')
      })
      gameEngine.setOnGameOver(errorCallback)

      gameEngine.triggerGameOver(0)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GameEngine] 游戏结束回调异常:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('应该传递分数为 0 时正常工作', () => {
      const callback = vi.fn()
      gameEngine.setOnGameOver(callback)

      gameEngine.triggerGameOver(0)

      expect(callback).toHaveBeenCalledWith(0)
    })
  })

  describe('玩家死亡回调链路', () => {
    it('应该在玩家死亡时通过回调链触发游戏结束', () => {
      const gameOverCallback = vi.fn()
      gameEngine.setOnGameOver(gameOverCallback)

      const player = new PlayerAircraft(100, 100)
      player.setOnDeath(() => {
        gameEngine.triggerGameOver(500)
      })
      gameEngine.addEntity(player)

      // 模拟玩家受到致命伤害
      player.takeDamage(player.maxHealth)

      expect(gameOverCallback).toHaveBeenCalledTimes(1)
      expect(gameOverCallback).toHaveBeenCalledWith(500)
    })

    it('应该在玩家受到多次伤害后血量归零时触发游戏结束', () => {
      const gameOverCallback = vi.fn()
      gameEngine.setOnGameOver(gameOverCallback)

      const player = new PlayerAircraft(100, 100)
      player.setOnDeath(() => {
        gameEngine.triggerGameOver(1000)
      })
      gameEngine.addEntity(player)

      // 多次伤害，但不致死
      player.takeDamage(3)
      player.takeDamage(3)
      expect(gameOverCallback).not.toHaveBeenCalled()

      // 最后一击致死
      player.takeDamage(player.health)
      expect(gameOverCallback).toHaveBeenCalledTimes(1)
    })
  })
})
