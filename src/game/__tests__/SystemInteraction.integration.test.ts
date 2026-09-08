/**
 * 集成测试 33.2：执行真实容器控制链、引擎碰撞、武器、效果、音频与 HUD。
 * 浏览器能力使用合成替身；不加载真实音频/图片，不访问外部服务。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { GameEngine } from '../GameEngine'
import { SoundEffect } from '../AudioSystem'
import { ExplosionSize } from '../EffectSystem'
import { PlayerAircraft } from '../entities/PlayerAircraft'
import { Enemy } from '../entities/Enemy'
import { Bullet } from '../entities/Bullet'
import { Missile } from '../entities/Missile'
import { Pickup } from '../entities/Pickup'
import { EnemyType, PickupType } from '../types'
import { AUDIO_CONFIG, EFFECT_CONFIG, MOVEMENT_CONFIG } from '../constants'
import { PoolManager } from '../PoolManager'
import { MemoryManager } from '../MemoryManager'
import { ResourceManager } from '../ResourceManager'
import { StageManager } from '../StageManager'
import { NuclearBomb } from '../weapons/NuclearBomb'
import { SceneRenderer } from '../SceneRenderer'
import { useEasterEggStore } from '@/stores/easterEgg'
import GameContainer from '@/components/game/GameContainer.vue'
import { installGameEnvironment, TestAudio } from './gameEnvironment'

describe('集成测试 33.2: 系统交互', () => {
  let environment: ReturnType<typeof installGameEnvironment>
  let engine: GameEngine
  let player: PlayerAircraft
  let wrapper: VueWrapper | undefined
  let stage: StageManager
  let nuclear: NuclearBomb
  let random: ReturnType<typeof vi.spyOn>
  const forbiddenFetch = vi.fn(() => { throw new Error('集成测试禁止外部请求') })

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
    vi.setSystemTime(10000)
    environment = installGameEnvironment()
    vi.stubGlobal('fetch', forbiddenFetch)
    forbiddenFetch.mockClear()
    random = vi.spyOn(Math, 'random').mockReturnValue(0.25)
    // 这里的 localStorage 属于当前 Happy DOM 测试实例。
    localStorage.clear()
    wrapper = undefined
  })

  afterEach(async () => {
    wrapper?.unmount()
    engine?.stop()
    engine?.getAudioSystem().cleanup()
    await vi.advanceTimersByTimeAsync(1000)
    MemoryManager.getInstance().destroy()
    ResourceManager.getInstance().destroy()
    PoolManager.destroy()
    expect(forbiddenFetch).not.toHaveBeenCalled()
    localStorage.clear()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  // 仅推进生产代码注册的帧，不复制 GameContainer 的输入或控制循环。
  const frame = async (milliseconds = 16) => {
    await vi.advanceTimersByTimeAsync(milliseconds)
    const callback = environment.frames.mock.lastCall?.[0]
    expect(callback, '真实引擎应已安排下一帧').toBeDefined()
    callback!(performance.now())
    await flushPromises()
    if (wrapper) expect(wrapper.find('.error-overlay').exists()).toBe(false)
  }

  const key = (type: 'keydown' | 'keyup', value: string) => {
    window.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }))
  }

  const playingAudio = (src: string) => TestAudio.created.find(audio => audio.src === src && !audio.paused)

  const startEngine = async () => {
    const canvas = document.createElement('canvas')
    engine = new GameEngine(canvas)
    player = new PlayerAircraft(200, 300)
    engine.addEntity(player)
    await engine.initializeAudio()
    PoolManager.getInstance().setAudioSystem(engine.getAudioSystem())
    engine.start()
  }

  const startContainer = async () => {
    // 观察真实实例并原样调用生产方法；不替换实例、更新回调或武器逻辑。
    const originalStart = GameEngine.prototype.start
    vi.spyOn(GameEngine.prototype, 'start').mockImplementation(function () {
      engine = this
      originalStart.call(this)
    })
    const originalStage = StageManager.prototype.getCurrentStage
    vi.spyOn(StageManager.prototype, 'getCurrentStage').mockImplementation(function () {
      stage = this
      return originalStage.call(this)
    })
    const originalProgress = NuclearBomb.prototype.getProgress
    vi.spyOn(NuclearBomb.prototype, 'getProgress').mockImplementation(function () {
      nuclear = this
      return originalProgress.call(this)
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    useEasterEggStore().enterGame()
    wrapper = mount(GameContainer, { global: { plugins: [pinia] }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.find('.error-overlay').exists()).toBe(false)
    expect(wrapper.find('.game-hud').exists()).toBe(true)
    player = engine.getEntities().find(entity => entity instanceof PlayerAircraft) as PlayerAircraft
    expect(player).toBeInstanceOf(PlayerAircraft)
    expect(stage).toBeInstanceOf(StageManager)
    expect(nuclear).toBeInstanceOf(NuclearBomb)
  }

  const spawnEnemy = async () => {
    await frame(stage.getSpawnRate())
    const enemy = engine.getEntities().find(entity => entity instanceof Enemy && entity.isActive) as Enemy
    expect(enemy).toBeInstanceOf(Enemy)
    return enemy
  }

  const spawnPickup = async (type: PickupType.REPAIR | PickupType.MISSILE_COUNT) => {
    const enemy = await spawnEnemy()
    enemy.x = 100
    enemy.y = 100
    const rates = enemy.config.dropRates
    // 控制掉落随机源，死亡、容器登记与 Pickup 创建仍由真实模块执行。
    if (type === PickupType.REPAIR) {
      random.mockReturnValueOnce(rates.repair / 2).mockReturnValueOnce(rates.repair / 2)
    } else {
      const chance = rates.repair + rates.machineGun + rates.missile / 2
      random.mockReturnValueOnce(chance).mockReturnValueOnce(0).mockReturnValueOnce(chance).mockReturnValueOnce(0)
    }
    enemy.takeDamage(enemy.getCurrentHealth())
    await frame()
    const pickup = engine.getEntities().find(entity => entity instanceof Pickup && entity.getType() === type) as Pickup
    expect(pickup).toBeInstanceOf(Pickup)
    return pickup
  }

  const collect = async (pickup: Pickup) => {
    pickup.x = player.x
    pickup.y = player.y
    await frame()
    expect(pickup.isActive).toBe(false)
    expect(engine.getEntities()).not.toContain(pickup)
  }

  const prepareBoss = async () => {
    // 用公开关卡接口设置“普通敌人已清除”的合成前置条件。
    // BOSS 生成、音乐切换、击杀登记与关卡过渡由容器的真实帧驱动。
    while (stage.canSpawnEnemy()) { stage.spawnEnemy(); stage.recordKill() }
    await frame(stage.getSpawnRate())
    const boss = engine.getEntities().find(entity => entity instanceof Enemy && entity.config.isBoss) as Enemy
    expect(boss).toBeInstanceOf(Enemy)
    return boss
  }

  describe('渲染和音频协同', () => {
    it('应该在游戏开始时播放背景音乐', async () => {
      await startContainer()
      const music = playingAudio(AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_1)
      expect(music).toBeDefined()
      expect(music!.loop).toBe(true)
      await vi.advanceTimersByTimeAsync(1000)
      expect(music!.volume).toBeGreaterThan(0)
      expect(wrapper!.get('.stage-info').text()).toContain('关卡: 1/3')
    })

    it('应该在 BOSS 出现时切换音乐', async () => {
      await startContainer()
      const oldMusic = playingAudio(AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_1)!
      await prepareBoss()
      await vi.advanceTimersByTimeAsync(1000)
      expect(oldMusic.paused).toBe(true)
      expect(oldMusic.currentTime).toBe(0)
      expect(playingAudio(AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_1_BOSS)?.loop).toBe(true)
    })

    it('应该在渲染时应用屏幕震动偏移', async () => {
      await startEngine()
      const context = environment.contexts.get(engine.getCanvas())!
      context.translate.mockClear()
      engine.getEffectSystem().triggerScreenShake()
      await frame()
      const offset = engine.getEffectSystem().getScreenOffset()
      expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThan(0)
      expect(context.translate).toHaveBeenCalledWith(offset.x, offset.y)
    })

    it('应该在震动结束后恢复正常渲染', async () => {
      await startEngine()
      engine.getEffectSystem().triggerScreenShake()
      await frame()
      expect(engine.getEffectSystem().getScreenOffset().x).not.toBe(0)
      const context = environment.contexts.get(engine.getCanvas())!
      context.translate.mockClear()
      await frame(EFFECT_CONFIG.SCREEN_SHAKE_DURATION)
      expect(engine.getEffectSystem().getScreenOffset()).toEqual({ x: 0, y: 0 })
      expect(context.translate).toHaveBeenCalledWith(0, 0)
    })
  })

  describe('效果和音效协同', () => {
    it('应该在敌人被击败时创建爆炸并播放音效', async () => {
      await startEngine()
      const enemy = new Enemy(EnemyType.WHITE, 100, 100)
      engine.addEntity(enemy)
      enemy.takeDamage(enemy.getCurrentHealth())
      await frame()
      expect(engine.getEntities()).not.toContain(enemy)
      expect(engine.getEffectSystem().getExplosions()).toEqual([expect.objectContaining({ size: ExplosionSize.SMALL })])
      expect(playingAudio(AUDIO_CONFIG.SOUND_EFFECTS.ENEMY_EXPLODE)).toBeDefined()
    })

    it('应该在玩家被击中时触发震动和音效', async () => {
      await startEngine()
      // 致命命中应将碰撞震动与玩家爆炸音效连起来。
      player.takeDamage(player.health - 1)
      const death = vi.fn()
      player.setOnDeath(death)
      engine.addEntity(new Enemy(EnemyType.WHITE, player.x, player.y))
      await frame()
      expect(player.health).toBe(0)
      expect(death).toHaveBeenCalledTimes(1)
      await frame()
      const offset = engine.getEffectSystem().getScreenOffset()
      expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThan(0)
      expect(playingAudio(AUDIO_CONFIG.SOUND_EFFECTS.PLAYER_EXPLODE)).toBeDefined()
    })

    it('应该在导弹爆炸时播放爆炸音效', async () => {
      await startEngine()
      const enemy = new Enemy(EnemyType.WHITE, 100, 100)
      const missile = PoolManager.getInstance().acquireMissile(100, 100, 1, 0, 4.5, 'player')
      engine.addEntity(enemy)
      engine.addEntity(missile)
      await frame()
      expect(missile.hasExploded).toBe(true)
      expect(enemy.getCurrentHealth()).toBe(1)
      expect(playingAudio(AUDIO_CONFIG.SOUND_EFFECTS.MISSILE_EXPLODE)).toBeDefined()
    })

    it('应该根据敌人类型播放不同的爆炸音效', async () => {
      await startEngine()
      const play = vi.spyOn(engine.getAudioSystem(), 'playSoundEffect')
      const cases = [
        { type: EnemyType.WHITE, elite: false, boss: false, size: ExplosionSize.SMALL, sound: SoundEffect.ENEMY_EXPLODE },
        { type: EnemyType.WHITE, elite: true, boss: false, size: ExplosionSize.MEDIUM, sound: SoundEffect.ELITE_EXPLODE },
        { type: EnemyType.PURPLE, elite: false, boss: true, size: ExplosionSize.LARGE, sound: SoundEffect.STAGE_BOSS_EXPLODE },
        { type: EnemyType.RED, elite: false, boss: true, size: ExplosionSize.HUGE, sound: SoundEffect.FINAL_BOSS_EXPLODE },
      ]
      for (const fixture of cases) {
        const enemy = new Enemy(fixture.type, 100, 100, fixture.elite, fixture.boss)
        engine.addEntity(enemy)
        enemy.takeDamage(enemy.getCurrentHealth())
        play.mockClear()
        await frame()
        expect(play).toHaveBeenCalledExactlyOnceWith(fixture.sound)
        expect(engine.getEffectSystem().getExplosions().some(item => item.size === fixture.size)).toBe(true)
        expect(playingAudio(AUDIO_CONFIG.SOUND_EFFECTS[fixture.sound])).toBeDefined()
      }
    })
  })

  describe('输入和移动协同', () => {
    it('应该在按下方向键时移动玩家', async () => {
      await startContainer()
      const initialX = player.x
      key('keydown', 'd')
      await frame()
      expect(player.x).toBe(initialX + MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE)
    })

    it('应该在释放方向键时停止移动', async () => {
      await startContainer()
      key('keydown', 'd')
      await frame()
      const movedX = player.x
      key('keyup', 'd')
      await frame(250)
      expect(player.x).toBe(movedX)
      await frame(250)
      expect(player.x).toBe(movedX)
    })

    it('应该在按下射击键时发射武器', async () => {
      await startContainer()
      key('keydown', 'j')
      await frame()
      const bullets = engine.getEntities().filter(entity => entity instanceof Bullet && entity.owner === 'player')
      expect(bullets).toHaveLength(1)
      expect(playingAudio(AUDIO_CONFIG.SOUND_EFFECTS.PLAYER_GUN_FIRE)).toBeDefined()
      key('keyup', 'j')
      await frame(250)
      expect(engine.getEntities().filter(entity => entity instanceof Bullet && entity.owner === 'player')).toHaveLength(1)
    })

    it('应该在长按移动键时持续移动', async () => {
      await startContainer()
      const initialX = player.x
      key('keydown', 'd')
      for (let index = 0; index < 5; index++) await frame(200)
      expect(player.x).toBe(initialX + 5 * MOVEMENT_CONFIG.PLAYER_MOVE_DISTANCE)
    })
  })

  describe('UI 和游戏状态协同', () => {
    it('应该在玩家受伤时更新生命值', async () => {
      await startContainer()
      player.takeDamage(1)
      await frame()
      expect(wrapper!.get('.health-text').text()).toBe(`${player.maxHealth - 1}/${player.maxHealth}`)
      expect(wrapper!.get('.health-fill').attributes('style')).toContain('90%')
    })

    it('应该在玩家发射导弹时更新导弹数量', async () => {
      await startContainer()
      const initialMissiles = Number(wrapper!.get('.missile-text').text())
      key('keydown', 'k')
      await frame()
      expect(wrapper!.get('.missile-text').text()).toBe(String(initialMissiles - 1))
      expect(engine.getEntities().filter(entity => entity instanceof Missile)).toHaveLength(1)
      await frame(250)
      expect(wrapper!.get('.missile-text').text()).toBe(String(initialMissiles - 1))
      key('keyup', 'k')
      key('keydown', 'k')
      await frame()
      expect(wrapper!.get('.missile-text').text()).toBe(String(initialMissiles - 2))
    })

    it('应该在拾取道具时更新玩家状态', async () => {
      await startContainer()
      player.takeDamage(2)
      const pickup = await spawnPickup(PickupType.REPAIR)
      const damagedHealth = player.health
      await collect(pickup)
      expect(player.health).toBe(damagedHealth + 1)
      expect(wrapper!.get('.health-text').text()).toBe(`${player.health}/${player.maxHealth}`)
    })

    it('应该在玩家死亡时触发游戏结束', async () => {
      await startContainer()
      player.takeDamage(player.maxHealth)
      await flushPromises()
      expect(player.isActive).toBe(false)
      expect(wrapper!.get('.game-over-overlay').text()).toContain('游戏结束')
      expect(wrapper!.find('.game-hud').exists()).toBe(false)
      const frameCount = environment.frames.mock.calls.length
      await frame()
      expect(environment.frames.mock.calls).toHaveLength(frameCount)
    })

    it('应该在核弹进度条满时允许发射核弹', async () => {
      await startContainer()
      const enemy = await spawnEnemy()
      nuclear.addProgress(nuclear.getMaxProgress())
      await frame()
      expect(wrapper!.get('.nuke-fill').attributes('style')).toContain('100%')
      key('keydown', ' ')
      await frame()
      expect(enemy.isActive).toBe(false)
      expect(nuclear.isLaunchingAnimation()).toBe(true)
      expect(nuclear.canLaunch()).toBe(false)
      key('keyup', ' ')
      await frame(2000)
      expect(wrapper!.get('.nuke-text').text()).toBe('0/100')
      expect(nuclear.canLaunch()).toBe(false)
    })
  })

  describe('多系统协同场景', () => {
    it('应该正确处理玩家击败敌人的完整流程', async () => {
      await startContainer()
      const enemy = await spawnEnemy()
      enemy.x = player.getCenterX() - enemy.width / 2
      // 保持真实射击距离，避免以机体相撞冒充子弹击杀。
      enemy.y = player.y - enemy.height - 20
      const initialHealth = player.health
      key('keydown', 'j')
      for (let step = 0; step < 60 && enemy.isActive; step++) await frame()
      key('keyup', 'j')
      expect(enemy.getCurrentHealth()).toBe(0)
      expect(player.health).toBe(initialHealth)
      expect(enemy.isActive).toBe(false)
      await frame()
      expect(engine.getEntities()).not.toContain(enemy)
      expect(wrapper!.get('.score-number').text()).toBe('100')
      expect(engine.getEffectSystem().getExplosions()).toHaveLength(1)
      expect(playingAudio(AUDIO_CONFIG.SOUND_EFFECTS.BULLET_HIT)).toBeDefined()
      expect(playingAudio(AUDIO_CONFIG.SOUND_EFFECTS.ENEMY_EXPLODE)).toBeDefined()
    })

    it('应该正确处理敌人击中玩家的完整流程', async () => {
      await startContainer()
      const enemy = await spawnEnemy()
      const initialHealth = player.health
      const damage = enemy.getCurrentHealth()
      const shake = vi.spyOn(engine.getEffectSystem(), 'triggerScreenShake')
      enemy.x = player.x
      enemy.y = player.y
      await frame()
      expect(player.health).toBe(initialHealth - damage)
      expect(enemy.isActive).toBe(false)
      expect(wrapper!.get('.health-text').text()).toBe(`${player.health}/${player.maxHealth}`)
      await frame()
      const offset = engine.getEffectSystem().getScreenOffset()
      expect(Math.abs(offset.x) + Math.abs(offset.y)).toBeGreaterThan(0)
      expect(shake).toHaveBeenCalledTimes(1)
      const projectile = PoolManager.getInstance().acquireBullet(player.x, player.y, 1, 100, 'enemy')
      engine.addEntity(projectile)
      await frame()
      expect(player.health).toBe(initialHealth - damage)
      expect(projectile.isActive).toBe(false)
      expect(shake).toHaveBeenCalledTimes(1)
    })

    it('应该正确处理玩家拾取道具的完整流程', async () => {
      await startContainer()
      const initialMissiles = Number(wrapper!.get('.missile-text').text())
      const pickup = await spawnPickup(PickupType.MISSILE_COUNT)
      await collect(pickup)
      expect(wrapper!.get('.missile-text').text()).toBe(String(initialMissiles + 2))
      key('keydown', 'k')
      await frame()
      expect(wrapper!.get('.missile-text').text()).toBe(String(initialMissiles + 1))
      expect(engine.getEntities().some(entity => entity instanceof Missile && entity.owner === 'player')).toBe(true)
    })

    it('应该正确处理关卡切换的完整流程', async () => {
      const renderScene = vi.spyOn(SceneRenderer, 'renderBackground')
      await startContainer()
      const boss = await prepareBoss()
      boss.takeDamage(boss.getCurrentHealth())
      await frame()
      expect(wrapper!.get('.stage-transition-overlay').text()).toContain('关卡 1 完成')
      expect(stage.getCurrentStageNumber()).toBe(1)
      await vi.advanceTimersByTimeAsync(1999)
      expect(stage.getCurrentStageNumber()).toBe(1)
      await vi.advanceTimersByTimeAsync(1)
      await flushPromises()
      expect(wrapper!.find('.stage-transition-overlay').exists()).toBe(false)
      expect(wrapper!.get('.stage-info').text()).toContain('关卡: 2/3')
      expect(stage.getKilledCount()).toBe(0)
      expect(stage.getSpawnedCount()).toBe(0)
      expect(renderScene).toHaveBeenLastCalledWith(engine.getContext(), 'school-scene')
      expect(playingAudio(AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_2)).toBeDefined()
      await vi.advanceTimersByTimeAsync(1000)
      expect(playingAudio(AUDIO_CONFIG.BACKGROUND_MUSIC.STAGE_1_BOSS)).toBeUndefined()
    })
  })
})
