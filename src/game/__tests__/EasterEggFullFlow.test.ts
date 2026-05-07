import { beforeEach, describe, expect, it, vi } from '@/test/vitest-globals'
import { createPinia, setActivePinia } from 'pinia'
import { useEasterEggStore } from '@/stores/easterEgg'
import { GamePhase, EnemyType } from '../types'
import { STAGES } from '../constants'
import { StageManager } from '../StageManager'
import { NuclearBomb } from '../weapons/NuclearBomb'
import { LeaderboardManager } from '../LeaderboardManager'

const completeNormalEnemies = (stageManager: StageManager): void => {
  const totalEnemies = stageManager.getCurrentStage().totalEnemies
  for (let i = 0; i < totalEnemies; i += 1) {
    stageManager.spawnEnemy()
    stageManager.recordKill()
  }
}

const completeCurrentStage = (stageManager: StageManager): void => {
  completeNormalEnemies(stageManager)
  stageManager.spawnBoss()
  stageManager.recordBossKill()
}

describe('彩蛋游戏全流程与关键系统回归', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.body.style.overflow = ''
  })

  describe('彩蛋状态机', () => {
    it('应该按完整链路从触发流转到庆祝页并可无刷新恢复', () => {
      const store = useEasterEggStore()

      expect(store.phase).toBe(GamePhase.IDLE)

      store.enterCollapseAnimation()
      expect(store.phase).toBe(GamePhase.COLLAPSE_ANIMATION)
      expect(document.body.style.overflow).toBe('hidden')
      expect(store.savedPageState).not.toBeNull()

      store.enterCMDWindow()
      expect(store.phase).toBe(GamePhase.CMD_WINDOW)

      store.enterRules()
      expect(store.phase).toBe(GamePhase.RULES)

      store.enterGame()
      expect(store.phase).toBe(GamePhase.PLAYING)

      store.enterCelebration()
      expect(store.phase).toBe(GamePhase.CELEBRATION)

      store.reset()
      expect(store.phase).toBe(GamePhase.IDLE)
      expect(document.body.style.overflow).toBe('')
      expect(store.savedPageState).toBeNull()
    })
  })

  describe('关卡推进与防重复计数', () => {
    it('应该完成三关并只在最终 Boss 击杀后通关', () => {
      const stageManager = new StageManager()

      STAGES.forEach((stage, index) => {
        expect(stageManager.getCurrentStage()).toEqual(stage)
        completeCurrentStage(stageManager)

        if (index < STAGES.length - 1) {
          expect(stageManager.canAdvanceStage()).toBe(true)
          expect(stageManager.isGameComplete()).toBe(false)
          expect(stageManager.advanceStage()).toBe(true)
        } else {
          expect(stageManager.canAdvanceStage()).toBe(false)
          expect(stageManager.isGameComplete()).toBe(true)
        }
      })
    })

    it('应该限制普通敌人击杀数不超过当前关卡总数', () => {
      const stageManager = new StageManager()
      completeNormalEnemies(stageManager)

      stageManager.recordKill()
      stageManager.recordKill()

      expect(stageManager.getKilledCount()).toBe(stageManager.getCurrentStage().totalEnemies)
      expect(stageManager.getRemainingCount()).toBe(0)
    })

    it('不应在 Boss 生成前记录 Boss 击杀', () => {
      const stageManager = new StageManager()

      stageManager.recordBossKill()

      expect(stageManager.canAdvanceStage()).toBe(false)
      completeNormalEnemies(stageManager)
      expect(stageManager.shouldSpawnBoss()).toBe(true)
    })

    it('应该从每关允许的敌人池生成敌人，Boss 类型应匹配关卡配置', () => {
      const stageManager = new StageManager()

      for (let stageIndex = 0; stageIndex < STAGES.length; stageIndex += 1) {
        const stage = STAGES[stageIndex]
        const spawned = stageManager.spawnEnemy()
        expect(stage.enemyTypes).toContain(spawned.type)
        expect(typeof spawned.isElite).toBe('boolean')

        while (stageManager.canSpawnEnemy()) {
          stageManager.spawnEnemy()
        }
        for (let i = 0; i < stage.totalEnemies; i += 1) {
          stageManager.recordKill()
        }

        expect(stageManager.spawnBoss()).toBe(stage.bossType)
        stageManager.recordBossKill()

        if (stageIndex < STAGES.length - 1) {
          expect(stageManager.advanceStage()).toBe(true)
        }
      }
    })
  })

  describe('核弹系统', () => {
    it('进度应封顶，满进度后允许发射，动画结束后重置', () => {
      const nuclearBomb = new NuclearBomb()

      nuclearBomb.addProgress(250)
      expect(nuclearBomb.getProgress()).toBe(100)
      expect(nuclearBomb.getProgressPercentage()).toBe(100)
      expect(nuclearBomb.canLaunch()).toBe(true)

      expect(nuclearBomb.launch()).toBe(true)
      expect(nuclearBomb.canLaunch()).toBe(false)
      expect(nuclearBomb.isLaunchingAnimation()).toBe(true)

      nuclearBomb.update(2000)
      expect(nuclearBomb.isLaunchingAnimation()).toBe(false)
      expect(nuclearBomb.getProgress()).toBe(0)
    })

    it('蘑菇云外层圆应以画面中心 X 坐标绘制', () => {
      const nuclearBomb = new NuclearBomb()
      nuclearBomb.addProgress(100)
      nuclearBomb.launch()
      nuclearBomb.update(1200)

      const arc = vi.fn()
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        arc,
        set fillStyle(_value: string) {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {},
      } as unknown as CanvasRenderingContext2D

      nuclearBomb.renderLaunchAnimation(ctx)

      const cloudArcCall = arc.mock.calls.find((call: unknown[]) => call[0] === 400)
      expect(cloudArcCall).toBeTruthy()
    })
  })

  describe('排行榜', () => {
    it('应该只保留前 10 名并按分数降序排列', () => {
      const leaderboard = new LeaderboardManager({ storageKey: 'test-game-leaderboard' })

      for (let score = 1; score <= 12; score += 1) {
        leaderboard.addScore({
          playerName: `玩家${score}`,
          score,
          stage: Math.min(3, score),
          timestamp: score,
          achievements: [],
        })
      }

      const scores = leaderboard.getScores()
      expect(scores).toHaveLength(10)
      expect(scores[0].score).toBe(12)
      expect(scores[9].score).toBe(3)
      expect(leaderboard.isHighScore(2)).toBe(false)
      expect(leaderboard.isHighScore(13)).toBe(true)
    })
  })

  describe('测试枚举兼容性', () => {
    it('应该使用当前有效敌人枚举而非旧版占位枚举', () => {
      expect(Object.values(EnemyType)).toEqual([
        'white',
        'green',
        'blue',
        'purple',
        'yellow',
        'orange',
        'red',
      ])
    })
  })
})
