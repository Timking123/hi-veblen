<template>
  <div class="game-container" :class="{ 'game-active': isGameActive }">
    <!-- 游戏 Canvas -->
    <canvas ref="gameCanvas" class="game-canvas"></canvas>

    <!-- 游戏 HUD -->
    <div v-if="isGameActive && !isPaused && !isGameOver" class="game-hud">
      <!-- 左上角：生命值显示 -->
      <div class="hud-top-left">
        <div class="health-display">
          <div class="health-icon">♥</div>
          <div class="health-bar">
            <div class="health-fill" :style="{ width: (playerHealth / playerMaxHealth * 100) + '%' }"></div>
          </div>
          <div class="health-text">{{ playerHealth }}/{{ playerMaxHealth }}</div>
        </div>
      </div>

      <!-- 右上角：导弹数量显示 -->
      <div class="hud-top-right">
        <div class="missile-display">
          <div class="missile-icon">🚀</div>
          <div class="missile-text">{{ missileCount }}</div>
        </div>
        
        <!-- 音乐开关按钮 -->
        <button 
          class="music-toggle-button" 
          @click="toggleMusic"
          :title="isMusicEnabled ? '关闭音乐' : '开启音乐'"
        >
          <span class="music-icon">{{ isMusicEnabled ? '♪' : '🔇' }}</span>
          <span class="music-status">{{ isMusicEnabled ? 'ON' : 'OFF' }}</span>
        </button>
      </div>

      <!-- 左下角：核弹进度条 -->
      <div class="hud-bottom-left">
        <div class="nuke-progress">
          <div class="nuke-label">核弹</div>
          <div class="nuke-bar">
            <div class="nuke-fill" :style="{ width: nukeProgressPercent + '%' }"></div>
          </div>
          <div class="nuke-text">{{ nukeProgress }}/{{ nukeMaxProgress }}</div>
        </div>
      </div>

      <!-- 右下角：关卡信息 -->
      <div class="hud-bottom-right">
        <div class="stage-info">
          <div class="info-item">关卡: {{ currentStage }}/{{ totalStages }}</div>
          <div class="info-item">敌人: {{ remainingEnemies }}</div>
        </div>
      </div>
    </div>

    <!-- FPS 显示（开发模式） -->
    <div v-if="showFPS" class="fps-counter">FPS: {{ fps }}</div>

    <!-- 操作提示 -->
    <div v-if="showControls" class="controls-overlay">
      <div class="controls-panel">
        <h3>操作说明</h3>
        <div class="control-item">
          <span class="key">W A S D</span>
          <span class="desc">移动</span>
        </div>
        <div class="control-item">
          <span class="key">J</span>
          <span class="desc">发射机炮</span>
        </div>
        <div class="control-item">
          <span class="key">K</span>
          <span class="desc">发射导弹</span>
        </div>
        <div class="control-item">
          <span class="key">空格</span>
          <span class="desc">发射核弹</span>
        </div>
      </div>
    </div>

    <!-- 游戏暂停提示 -->
    <div v-if="isPaused" class="pause-overlay">
      <div class="pause-message">
        <p>游戏已暂停</p>
        <button @click="resumeGame" class="resume-button">继续游戏</button>
        <button @click="exitGame" class="exit-button">退出游戏</button>
      </div>
    </div>

    <!-- 游戏结束提示 -->
    <div v-if="isGameOver" class="game-over-overlay">
      <div class="game-over-message">
        <h2>游戏结束</h2>
        <p>最终得分: {{ gameStats.totalScore.toLocaleString() }} 分</p>
        <p>到达关卡: {{ gameStats.highestStage }}</p>
        <p>击杀敌人: {{ gameStats.totalKills }}</p>
        <div class="game-over-buttons">
          <button @click="toggleLeaderboard" class="leaderboard-button">
            {{ showLeaderboard ? '隐藏排行榜' : '查看排行榜' }}
          </button>
          <button @click="toggleAchievementList" class="achievement-button">
            {{ showAchievementList ? '隐藏成就' : '查看成就' }}
          </button>
          <button @click="exitGame" class="exit-button">返回首页</button>
        </div>
      </div>
      
      <!-- 排行榜弹窗 -->
      <div v-if="showLeaderboard" class="leaderboard-modal">
        <div class="modal-content">
          <button class="modal-close" @click="showLeaderboard = false">×</button>
          <div class="leaderboard-wrapper">
            <div class="leaderboard-header-custom">
              <h2 class="leaderboard-title">🏆 排行榜</h2>
            </div>
            <div class="leaderboard-list-custom">
              <div
                v-for="(entry, index) in leaderboardManager.getScores()"
                :key="entry.id"
                class="leaderboard-item-custom"
                :class="{ 'is-highlighted': highlightedScoreId === entry.id }"
              >
                <div class="item-rank-custom">
                  <span v-if="index === 0" class="rank-medal">🥇</span>
                  <span v-else-if="index === 1" class="rank-medal">🥈</span>
                  <span v-else-if="index === 2" class="rank-medal">🥉</span>
                  <span v-else class="rank-number">{{ index + 1 }}</span>
                </div>
                <div class="item-info-custom">
                  <span class="player-name">{{ entry.playerName }}</span>
                  <span class="player-stage">关卡 {{ entry.stage }}</span>
                </div>
                <div class="item-score-custom">
                  <span class="score-value">{{ entry.score.toLocaleString() }}</span>
                  <span class="score-label">分</span>
                </div>
                <div v-if="highlightedScoreId === entry.id" class="new-record-badge">NEW!</div>
              </div>
              <div v-if="leaderboardManager.getScores().length === 0" class="empty-state">
                暂无记录
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 成就列表弹窗 -->
      <div v-if="showAchievementList" class="achievement-modal">
        <div class="modal-content">
          <button class="modal-close" @click="showAchievementList = false">×</button>
          <div class="achievement-wrapper">
            <div class="achievement-header-custom">
              <h2 class="achievement-title">🏅 成就系统</h2>
              <div class="achievement-progress-custom">
                {{ achievementSystem.getAchievementStats().unlocked }}/{{ achievementSystem.getAchievementStats().total }}
              </div>
            </div>
            <div class="achievement-grid-custom">
              <div
                v-for="achievement in achievementSystem.getAllAchievements()"
                :key="achievement.id"
                class="achievement-item-custom"
                :class="{ 'is-unlocked': achievementSystem.isAchievementUnlocked(achievement.id) }"
              >
                <div class="item-icon-custom">
                  <span class="icon-emoji">{{ achievement.icon }}</span>
                  <div v-if="!achievementSystem.isAchievementUnlocked(achievement.id)" class="lock-overlay">🔒</div>
                </div>
                <div class="item-info-achievement">
                  <h3 class="item-name">{{ achievement.name }}</h3>
                  <p class="item-description">{{ achievement.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 成就解锁通知 -->
    <Transition name="achievement-notification">
      <div 
        v-if="showAchievementNotification && currentNotificationAchievement" 
        class="achievement-notification-popup"
        @click="closeAchievementNotification"
      >
        <div class="notification-glow"></div>
        <div class="notification-content">
          <div class="notification-icon">
            <span class="icon-emoji">{{ currentNotificationAchievement.icon }}</span>
          </div>
          <div class="notification-info">
            <span class="notification-label">🎉 成就解锁</span>
            <h3 class="notification-title">{{ currentNotificationAchievement.name }}</h3>
            <p class="notification-description">{{ currentNotificationAchievement.description }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 错误提示 -->
    <div v-if="hasError" class="error-overlay">
      <div class="error-message">
        <h2>⚠️ 游戏错误</h2>
        <p>{{ errorMessage }}</p>
        <button @click="handleErrorRetry" class="resume-button">重试</button>
        <button @click="exitGame" class="exit-button">退出游戏</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useEasterEggStore } from '@/stores/easterEgg'
import { GameEngine } from '@/game/GameEngine'
import { EnhancedInputManager } from '@/game/EnhancedInputManager'
import { PlayerAircraft } from '@/game/entities/PlayerAircraft'
import { Enemy } from '@/game/entities/Enemy'
import { Pickup } from '@/game/entities/Pickup'
import { MachineGun } from '@/game/weapons/MachineGun'
import { MissileLauncher } from '@/game/weapons/MissileLauncher'
import { NuclearBomb } from '@/game/weapons/NuclearBomb'
import { StageManager } from '@/game/StageManager'
import { SceneRenderer } from '@/game/SceneRenderer'
import { GAME_CONFIG } from '@/game/constants'
import { PickupType } from '@/game/types'
import { PoolManager } from '@/game/PoolManager'
// 排行榜和成就系统
import { LeaderboardManager } from '@/game/LeaderboardManager'
import { AchievementSystem, DEFAULT_ACHIEVEMENTS, type Achievement, type GameStats } from '@/game/AchievementSystem'

const easterEggStore = useEasterEggStore()

// 排行榜和成就系统实例
const leaderboardManager = new LeaderboardManager()
const achievementSystem = new AchievementSystem(DEFAULT_ACHIEVEMENTS)

// 组件引用
const gameCanvas = ref<HTMLCanvasElement | null>(null)

// 游戏状态
const isGameActive = ref(false)
const isPaused = ref(false)
const isGameOver = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const fps = ref(0)
const showFPS = ref(import.meta.env.DEV) // 仅在开发模式显示 FPS
const nukeProgress = ref(0)
const nukeMaxProgress = ref(GAME_CONFIG.NUKE_MAX_PROGRESS)
const nukeProgressPercent = ref(0)
const currentStage = ref(1)
const totalStages = ref(3)
const remainingEnemies = ref(0)
const showControls = ref(false)
const playerHealth = ref(10)
const playerMaxHealth = ref(10)
const missileCount = ref(10)
const isMusicEnabled = ref(true)

// 排行榜和成就相关状态
const showLeaderboard = ref(false)
const showAchievementList = ref(false)
const highlightedScoreId = ref('')
const newlyUnlockedAchievements = ref<Achievement[]>([])
const showAchievementNotification = ref(false)
const currentNotificationAchievement = ref<Achievement | null>(null)

// 游戏统计数据
const gameStats = ref<GameStats>({
  totalScore: 0,
  highestStage: 1,
  totalKills: 0,
  totalPlayTime: 0,
  perfectStages: 0
})
const gameStartTime = ref(0)
const stageStartHealth = ref(10) // 关卡开始时的血量，用于判断无伤通关

// 游戏引擎实例
let gameEngine: GameEngine | null = null
let inputManager: EnhancedInputManager | null = null
let fpsInterval: number | null = null
let resizeTimeout: number | null = null // 窗口 resize 防抖定时器

// 游戏对象
let player: PlayerAircraft | null = null
let machineGun: MachineGun | null = null
let missileLauncher: MissileLauncher | null = null
let nuclearBomb: NuclearBomb | null = null
let stageManager: StageManager | null = null
let enemies: Enemy[] = []
let pickups: Pickup[] = []
let enemySpawnTimer: number = 0

/**
 * 初始化游戏
 */
const initGame = (): void => {
  if (!gameCanvas.value) {
    console.error('[游戏容器] Canvas 元素未找到')
    showError('Canvas 元素未找到，无法启动游戏')
    return
  }

  // 检查 Canvas 支持
  if (!checkCanvasSupport()) {
    showError('您的浏览器不支持 Canvas，无法运行游戏。请使用现代浏览器（Chrome、Firefox、Edge 等）')
    return
  }

  try {
    console.log('[游戏容器] 初始化游戏引擎')

    // 创建游戏引擎（使用 V2 场景扩展配置）
    gameEngine = new GameEngine(gameCanvas.value, {
      scaleMultiplier: 1.5 // 场景扩大 50%
    })

    // 创建增强输入管理器（传递 canvas 以支持移动端控制）
    inputManager = new EnhancedInputManager(gameCanvas.value)

    // 获取缩放后的 Canvas 尺寸
    const canvasWidth = gameEngine.getCanvasWidth()
    const canvasHeight = gameEngine.getCanvasHeight()

    // 创建玩家飞机（位置需要根据缩放后的尺寸调整）
    player = new PlayerAircraft(
      canvasWidth / 2 - 20,
      canvasHeight - 100
    )
    gameEngine.addEntity(player)

    // 注册玩家死亡回调，连接到游戏结束流程
    player.setOnDeath(() => {
      gameEngine!.triggerGameOver(gameStats.value.totalScore)
    })

    // 创建武器系统
    machineGun = new MachineGun(undefined, 'player')
    missileLauncher = new MissileLauncher()
    nuclearBomb = new NuclearBomb()

    // 创建关卡管理器
    stageManager = new StageManager()

    console.log('[游戏容器] 玩家和武器系统初始化完成')
  } catch (error) {
    console.error('[游戏容器] 游戏初始化失败:', error)
    showError('游戏初始化失败，请刷新页面重试')
  }
}

/**
 * 检查 Canvas 支持
 */
const checkCanvasSupport = (): boolean => {
  if (!gameCanvas.value) return false
  
  try {
    const ctx = gameCanvas.value.getContext('2d')
    return ctx !== null
  } catch (e) {
    return false
  }
}

/**
 * 显示错误信息
 */
const showError = (message: string): void => {
  console.error('[游戏容器] 错误:', message)
  hasError.value = true
  errorMessage.value = message
  
  // 停止游戏
  if (gameEngine) {
    try {
      gameEngine.stop()
    } catch (e) {
      console.error('[游戏容器] 停止游戏引擎失败:', e)
    }
  }
}

/**
 * 处理错误重试
 */
const handleErrorRetry = (): void => {
  console.log('[游戏容器] 重试游戏')
  hasError.value = false
  errorMessage.value = ''
  
  // 清理旧资源
  cleanupGame()
  
  // 重新初始化
  setTimeout(() => {
    initGame()
    startGame()
  }, 100)
}

/**
 * 启动游戏
 */
const startGame = async (): Promise<void> => {
  if (!gameEngine) {
    console.error('[游戏容器] 游戏引擎未初始化')
    showError('游戏引擎未初始化')
    return
  }

  try {
    console.log('[游戏容器] 启动游戏')
    isGameActive.value = true
    isPaused.value = false
    isGameOver.value = false

    // 重置游戏统计
    resetGameStats()

    // 注册游戏结束回调
    gameEngine.setOnGameOver((score: number) => {
      console.log(`[游戏容器] 游戏结束，最终得分: ${score}`)
      handlePlayerDeath()
    })

    // 初始化音频系统
    await gameEngine.initializeAudio()
    
    // 恢复音频上下文（处理浏览器自动播放策略）
    await gameEngine.resumeAudio()
    
    // 获取音频系统并设置到武器和对象池
    const audioSystem = gameEngine.getAudioSystem()
    if (audioSystem) {
      if (machineGun) {
        machineGun.setAudioSystem(audioSystem)
      }
      if (missileLauncher) {
        missileLauncher.setAudioSystem(audioSystem)
      }
      
      // 设置音频系统到对象池管理器
      const poolManager = PoolManager.getInstance()
      poolManager.setAudioSystem(audioSystem)
    }
    
    // 播放第一关音乐
    if (audioSystem && stageManager) {
      audioSystem.playBackgroundMusic(stageManager.getCurrentStageNumber(), false)
    }

    // 显示操作提示
    showControls.value = true
    setTimeout(() => {
      showControls.value = false
    }, 5000) // 5秒后隐藏

    // 设置玩家控制
    setupPlayerControls()

    gameEngine.start()

    // 启动 FPS 更新
    if (showFPS.value) {
      fpsInterval = window.setInterval(() => {
        if (gameEngine) {
          fps.value = gameEngine.getFPS()
        }
      }, 500)
    }

    // 监听窗口大小变化
    window.addEventListener('resize', handleWindowResize)
  } catch (error) {
    console.error('[游戏容器] 启动游戏失败:', error)
    showError('游戏启动失败，请重试')
  }
}

/**
 * 设置玩家控制
 */
const setupPlayerControls = (): void => {
  if (!inputManager || !player || !gameEngine) return

  try {
    // 设置背景渲染器
    updateSceneBackground()

    // 设置更新回调
    gameEngine.setOnUpdate((deltaTime) => {
      try {
        // 更新输入管理器（清除单帧状态）
        if (inputManager) {
          inputManager.update(deltaTime)
        }
        
        handlePlayerMovement()
        handleWeaponFiring()
        handleEnemySpawning(deltaTime)
        handleEnemyBehavior()
        handlePickupBehavior()
        handleNuclearBomb(deltaTime)
      } catch (error) {
        console.error('[游戏容器] 游戏循环错误:', error)
        showError('游戏运行时发生错误')
      }
    })
  } catch (error) {
    console.error('[游戏容器] 设置玩家控制失败:', error)
    showError('设置游戏控制失败')
  }
}

/**
 * 处理玩家移动
 */
const handlePlayerMovement = (): void => {
  if (!inputManager || !player || !gameEngine) return

  // 使用增强输入管理器获取移动输入
  // 自动处理单次按键和长按逻辑（200ms 间隔）
  const movement = inputManager.getMovementInput()
  
  if (movement.x !== 0 || movement.y !== 0) {
    // 使用像素块移动距离
    const moveDistance = 8 // PIXEL_BLOCK_CONFIG.SIZE
    player.x += movement.x * moveDistance
    player.y += movement.y * moveDistance
    
    // 边界检测
    const canvasWidth = gameEngine.getCanvasWidth()
    const canvasHeight = gameEngine.getCanvasHeight()
    
    if (player.x < 0) player.x = 0
    if (player.x + player.width > canvasWidth) player.x = canvasWidth - player.width
    if (player.y < 0) player.y = 0
    if (player.y + player.height > canvasHeight) player.y = canvasHeight - player.height
  }
}

/**
 * 处理武器发射
 */
const handleWeaponFiring = (): void => {
  if (!inputManager || !player || !gameEngine || !machineGun || !missileLauncher || !nuclearBomb)
    return

  // 发射机炮（J键）- 使用射速限制（200ms 冷却）
  if (inputManager.shouldFireGun()) {
    const bullets = machineGun.fire(player.getCenterX(), player.y, 'player')
    bullets.forEach((bullet) => gameEngine!.addEntity(bullet))
  }

  // 发射导弹（K键）- 单次发射，长按不连续发射
  if (inputManager.shouldFireMissile()) {
    const missile = missileLauncher.fire(player.getCenterX(), player.y, player.width, 'player')
    if (missile) {
      gameEngine.addEntity(missile)
      // 更新导弹数量显示
      missileCount.value = missileLauncher.getMissileCount()
    }
  }

  // 发射核弹（空格键）
  if (inputManager.shouldLaunchNuke()) {
    if (nuclearBomb.canLaunch()) {
      nuclearBomb.launch()
      clearAllEnemiesAndProjectiles()
    }
  }
}

/**
 * 处理敌人生成
 */
const handleEnemySpawning = (deltaTime: number): void => {
  if (!gameEngine || !stageManager) return

  enemySpawnTimer += deltaTime

  // 使用关卡管理器的生成间隔
  const spawnRate = stageManager.getSpawnRate()

  if (enemySpawnTimer >= spawnRate) {
    enemySpawnTimer = 0

    // 检查是否应该生成 Boss
    if (stageManager.shouldSpawnBoss()) {
      spawnBoss()
    }
    // 检查是否可以生成普通敌人
    else if (stageManager.canSpawnEnemy()) {
      spawnEnemy()
    }
  }
}

/**
 * 生成敌人
 */
const spawnEnemy = (): void => {
  if (!gameEngine || !stageManager) return

  // 从关卡管理器获取敌人类型
  const { type, isElite } = stageManager.spawnEnemy()

  // 获取缩放后的 Canvas 宽度和缩放倍数
  const canvasWidth = gameEngine.getCanvasWidth()
  const scaleMultiplier = gameEngine.getScaleMultiplier()

  // 随机生成位置（屏幕上方）
  const x = Math.random() * (canvasWidth - 60 * scaleMultiplier)
  const y = -50

  const enemy = new Enemy(type, x, y, isElite, false, scaleMultiplier)
  
  // 设置音频系统到敌人（敌人武器不播放音效）
  const audioSystem = gameEngine.getAudioSystem()
  if (audioSystem) {
    enemy.setAudioSystem(audioSystem)
  }
  
  enemies.push(enemy)
  gameEngine.addEntity(enemy)

  console.log(`[游戏] 生成敌人: ${type}, 精英: ${isElite}`)
}

/**
 * 生成 Boss
 */
const spawnBoss = (): void => {
  if (!gameEngine || !stageManager) return

  // 从关卡管理器获取 Boss 类型
  const bossType = stageManager.spawnBoss()

  // 获取缩放后的 Canvas 宽度和缩放倍数
  const canvasWidth = gameEngine.getCanvasWidth()
  const scaleMultiplier = gameEngine.getScaleMultiplier()

  // Boss 在屏幕中央上方生成
  const x = canvasWidth / 2 - 60 * scaleMultiplier
  const y = -100

  const boss = new Enemy(bossType, x, y, false, true, scaleMultiplier)
  
  // 设置音频系统到 Boss（敌人武器不播放音效）
  const audioSystem = gameEngine.getAudioSystem()
  if (audioSystem) {
    boss.setAudioSystem(audioSystem)
  }
  
  enemies.push(boss)
  gameEngine.addEntity(boss)

  console.log(`[游戏] 生成 Boss: ${bossType}`)
  
  // 切换到 BOSS 战音乐
  if (audioSystem && stageManager) {
    audioSystem.playBackgroundMusic(stageManager.getCurrentStageNumber(), true)
    console.log('[游戏] 切换到 BOSS 战音乐')
  }
}

/**
 * 处理敌人行为
 */
const handleEnemyBehavior = (): void => {
  if (!player || !gameEngine) return

  // 检测玩家死亡
  if (!player.isActive || player.health <= 0) {
    handlePlayerDeath()
    return
  }

  enemies.forEach((enemy) => {
    if (!enemy.isActive) return

    // 追踪玩家
    enemy.trackPlayer(player!.getCenterX(), player!.getCenterY())

    // 攻击玩家
    const projectiles = enemy.attack()
    projectiles.forEach((projectile) => {
      gameEngine!.addEntity(projectile)
    })

    // 检测敌人与玩家的碰撞
    if (checkCollision(player!, enemy)) {
      handleEnemyPlayerCollision(enemy)
    }
  })

  // 清理死亡的敌人
  const beforeCount = enemies.length
  enemies = enemies.filter((enemy) => {
    if (!enemy.isActive) {
      // 记录击杀并更新分数
      const isElite = enemy.config.isElite || false
      const isBoss = enemy.config.isBoss || false
      recordKill(isElite, isBoss)
      
      // 记录到关卡管理器
      if (stageManager) {
        if (isBoss) {
          stageManager.recordBossKill()
        } else {
          stageManager.recordKill()
        }
      }

      // 敌人死亡，增加核弹进度
      if (nuclearBomb) {
        nuclearBomb.addProgress(1)
      }

      // 掉落判定
      const dropType = enemy.die()
      if (dropType && gameEngine) {
        // 在敌人位置生成掉落物
        const pickup = new Pickup(dropType, enemy.x + enemy.width / 2 - 15, enemy.y + enemy.height / 2 - 15)
        
        // 设置拾取回调，应用掉落物效果
        pickup.setOnPickup((type: PickupType) => {
          applyPickupEffect(type)
        })
        
        pickups.push(pickup)
        gameEngine.addEntity(pickup)
        console.log(`[游戏] 生成掉落物: ${dropType}`)
      }

      return false
    }
    return true
  })

  // 如果有敌人死亡，记录日志
  const killedCount = beforeCount - enemies.length
  if (killedCount > 0) {
    console.log(`[游戏] 击杀 ${killedCount} 个敌人`)
  }

  // 检查关卡切换
  if (stageManager && stageManager.canAdvanceStage()) {
    handleStageAdvance()
  }

  // 检查游戏通关
  if (stageManager && stageManager.isGameComplete()) {
    handleGameComplete()
  }
}

/**
 * 处理掉落物行为
 */
const handlePickupBehavior = (): void => {
  if (!player || !gameEngine || !player.isActive) return

  // 清理不活跃的掉落物
  pickups = pickups.filter((pickup) => {
    if (!pickup.isActive) {
      return false
    }

    // 检测玩家拾取
    if (checkPickupCollision(player!, pickup)) {
      applyPickupEffect(pickup.getType())
      pickup.destroy()
      return false
    }

    return true
  })
}

/**
 * 检测掉落物碰撞
 */
const checkPickupCollision = (player: PlayerAircraft, pickup: Pickup): boolean => {
  return (
    player.x < pickup.x + pickup.width &&
    player.x + player.width > pickup.x &&
    player.y < pickup.y + pickup.height &&
    player.y + player.height > pickup.y
  )
}

/**
 * 应用掉落物效果
 */
const applyPickupEffect = (type: PickupType): void => {
  if (!player || !machineGun || !missileLauncher) return

  console.log(`[游戏] 应用掉落物效果: ${type}`)

  switch (type) {
    // 机炮升级
    case PickupType.MACHINEGUN_BULLETS:
      machineGun.upgradeBullets()
      break
    case PickupType.MACHINEGUN_TRAJECTORY:
      machineGun.upgradeTrajectories()
      break
    case PickupType.MACHINEGUN_FIRERATE:
      machineGun.upgradeFireRate()
      break
    case PickupType.MACHINEGUN_DAMAGE:
      machineGun.upgradeDamage()
      break
    case PickupType.MACHINEGUN_SPEED:
      machineGun.upgradeSpeed()
      break

    // 导弹升级
    case PickupType.MISSILE_COUNT:
      missileLauncher.upgradeCount()
      break
    case PickupType.MISSILE_DAMAGE:
      missileLauncher.upgradeDamage()
      break
    case PickupType.MISSILE_SPEED:
      missileLauncher.upgradeSpeed()
      break

    // 维修
    case PickupType.REPAIR:
      player.heal(1)
      break

    // 引擎
    case PickupType.ENGINE:
      player.increaseSpeed(1)
      break
  }
}

/**
 * 处理核弹系统
 */
const handleNuclearBomb = (deltaTime: number): void => {
  if (!nuclearBomb || !gameEngine) return

  // 更新核弹状态
  nuclearBomb.update(deltaTime)

  // 更新 UI 显示
  nukeProgress.value = nuclearBomb.getProgress()
  nukeProgressPercent.value = nuclearBomb.getProgressPercentage()

  // 更新关卡信息
  if (stageManager) {
    currentStage.value = stageManager.getCurrentStageNumber()
    totalStages.value = stageManager.getTotalStages()
    remainingEnemies.value = stageManager.getRemainingCount()
  }

  // 更新玩家状态
  if (player) {
    playerHealth.value = player.health
    playerMaxHealth.value = player.maxHealth
  }

  // 更新导弹数量
  if (missileLauncher) {
    missileCount.value = missileLauncher.getMissileCount()
  }

  // 渲染核弹动画
  const canvas = gameCanvas.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    if (ctx) {
      nuclearBomb.renderLaunchAnimation(ctx)
    }
  }

  // 检测玩家与敌方子弹/导弹的碰撞
  handleProjectileCollisions()
}

/**
 * 检测碰撞（AABB）
 */
const checkCollision = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean => {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * 处理敌人与玩家的碰撞
 */
const handleEnemyPlayerCollision = (enemy: Enemy): void => {
  if (!player || !player.isActive) return

  // 敌人对玩家造成等于其剩余血量的伤害
  const damage = enemy.getCurrentHealth()
  player.takeDamage(damage)

  // 销毁敌人
  enemy.destroy()

  console.log(`[游戏] 敌人碰撞玩家，造成 ${damage} 点伤害`)
}

/**
 * 处理子弹/导弹与玩家的碰撞
 */
const handleProjectileCollisions = (): void => {
  if (!player || !gameEngine || !player.isActive) return

  const allEntities = gameEngine.getEntities()

  allEntities.forEach((entity) => {
    // 只检测敌方子弹和导弹
    if (entity.id.startsWith('bullet-enemy') || entity.id.startsWith('missile-enemy')) {
      if (checkCollision(player!, entity)) {
        // 获取伤害值
        let damage = 0
        if ('damage' in entity) {
          damage = (entity as any).damage
        }

        // 对玩家造成伤害
        player!.takeDamage(damage)

        // 销毁子弹/导弹
        entity.destroy()

        console.log(`[游戏] 敌方投射物击中玩家，造成 ${damage} 点伤害`)
      }
    }
  })
}

/**
 * 处理玩家死亡
 */
const handlePlayerDeath = (): void => {
  if (isGameOver.value) return // 避免重复触发

  console.log('[游戏] 玩家死亡，游戏结束')

  // 最终检查成就
  checkAchievements()

  // 保存分数到排行榜
  saveGameScore()

  // 停止游戏
  endGame()

  // 显示排行榜
  showLeaderboard.value = true
}

/**
 * 清除所有敌人和敌方子弹
 */
const clearAllEnemiesAndProjectiles = (): void => {
  if (!gameEngine) return

  console.log('[游戏] 核弹发射！清除所有敌人和敌方子弹')

  // 清除所有敌人
  enemies.forEach((enemy) => {
    enemy.destroy()
  })
  enemies = []

  // 清除所有敌方子弹和导弹
  const allEntities = gameEngine.getEntities()
  allEntities.forEach((entity) => {
    // 检查是否是敌方子弹或导弹
    if (entity.id.startsWith('bullet-enemy') || entity.id.startsWith('missile-enemy')) {
      entity.destroy()
    }
  })

  console.log('[游戏] 清屏完成')
}

/**
 * 处理关卡切换
 */
const handleStageAdvance = (): void => {
  if (!stageManager || !gameEngine) return

  console.log('[游戏] 准备切换关卡')

  // 记录关卡完成（检查无伤通关）
  recordStageComplete()

  // 暂停游戏
  pauseGame()

  // 显示关卡切换提示
  setTimeout(() => {
    if (stageManager!.advanceStage()) {
      console.log(`[游戏] 进入关卡 ${stageManager!.getCurrentStageNumber()}`)

      // 记录新关卡开始时的血量
      if (player) {
        stageStartHealth.value = player.health
      }

      // 更新场景背景
      updateSceneBackground()

      // 清理屏幕上的子弹和导弹
      const allEntities = gameEngine!.getEntities()
      allEntities.forEach((entity) => {
        if (entity.id.startsWith('bullet') || entity.id.startsWith('missile')) {
          entity.destroy()
        }
      })
      
      // 切换到新关卡的音乐
      const audioSystem = gameEngine!.getAudioSystem()
      if (audioSystem && stageManager) {
        audioSystem.playBackgroundMusic(stageManager.getCurrentStageNumber(), false)
        console.log('[游戏] 切换到新关卡音乐')
      }

      // 恢复游戏
      resumeGame()
    }
  }, 2000)
}

/**
 * 更新场景背景
 */
const updateSceneBackground = (): void => {
  if (!gameEngine || !stageManager) return

  const currentStage = stageManager.getCurrentStage()
  gameEngine.setBackgroundRenderer((ctx) => {
    SceneRenderer.renderBackground(ctx, currentStage.background)
  })

  console.log(`[游戏] 更新场景背景: ${currentStage.name}`)
}

/**
 * 处理游戏通关
 */
const handleGameComplete = (): void => {
  console.log('[游戏] 游戏通关！')

  // 记录最后一关完成
  recordStageComplete()

  // 最终检查成就
  checkAchievements()

  // 保存分数到排行榜
  saveGameScore()

  // 播放通关音乐
  const audioSystem = gameEngine?.getAudioSystem()
  if (audioSystem) {
    audioSystem.playVictoryMusic()
    console.log('[游戏] 播放通关音乐')
  }

  // 停止游戏
  if (gameEngine) {
    gameEngine.stop()
  }

  // 清理 FPS 定时器
  if (fpsInterval !== null) {
    clearInterval(fpsInterval)
    fpsInterval = null
  }

  // 销毁输入管理器
  if (inputManager) {
    inputManager.destroy()
    inputManager = null
  }

  // 进入庆祝页面
  setTimeout(() => {
    easterEggStore.enterCelebration()
  }, 1000) // 延迟1秒，让玩家看到最后的画面
}

/**
 * 暂停游戏
 */
const pauseGame = (): void => {
  if (!gameEngine) return

  console.log('[游戏容器] 暂停游戏')
  isPaused.value = true
  gameEngine.pause()
}

/**
 * 恢复游戏
 */
const resumeGame = (): void => {
  if (!gameEngine) return

  console.log('[游戏容器] 恢复游戏')
  isPaused.value = false
  gameEngine.resume()
}

/**
 * 结束游戏
 */
const endGame = (): void => {
  if (!gameEngine) return

  console.log('[游戏容器] 游戏结束')
  isGameOver.value = true
  gameEngine.stop()

  if (fpsInterval !== null) {
    clearInterval(fpsInterval)
    fpsInterval = null
  }
}

/**
 * 退出游戏并返回首页
 */
const exitGame = (): void => {
  console.log('[游戏容器] 退出游戏')

  // 移除窗口事件监听
  window.removeEventListener('resize', handleWindowResize)

  // 清理对象池
  PoolManager.destroy()

  cleanupGame()

  // 重置状态
  isGameActive.value = false
  isPaused.value = false
  isGameOver.value = false
  hasError.value = false
  errorMessage.value = ''

  // 重置彩蛋状态
  easterEggStore.reset()

  // 刷新页面返回首页（恢复崩塌后的页面）
  window.location.href = '/'
}

/**
 * 清理游戏资源
 */
const cleanupGame = (): void => {
  // 停止游戏引擎
  if (gameEngine) {
    try {
      gameEngine.stop()
      gameEngine.clearEntities()
    } catch (e) {
      console.error('[游戏容器] 清理游戏引擎失败:', e)
    }
    gameEngine = null
  }

  // 销毁输入管理器
  if (inputManager) {
    try {
      inputManager.destroy()
    } catch (e) {
      console.error('[游戏容器] 销毁输入管理器失败:', e)
    }
    inputManager = null
  }

  // 清理 FPS 定时器
  if (fpsInterval !== null) {
    clearInterval(fpsInterval)
    fpsInterval = null
  }

  // 清理 resize 定时器
  if (resizeTimeout !== null) {
    clearTimeout(resizeTimeout)
    resizeTimeout = null
  }

  // 清理游戏对象
  player = null
  machineGun = null
  missileLauncher = null
  nuclearBomb = null
  stageManager = null
  enemies = []
  pickups = []
  enemySpawnTimer = 0
}

/**
 * 处理窗口大小变化（带防抖）
 */
const handleWindowResize = (): void => {
  // 清除之前的定时器
  if (resizeTimeout !== null) {
    clearTimeout(resizeTimeout)
  }
  
  // 设置新的定时器，300ms 后执行
  resizeTimeout = window.setTimeout(() => {
    console.log('[游戏容器] 窗口大小变化，调整画布尺寸')
    
    // 调整画布尺寸
    if (gameEngine) {
      gameEngine.resizeCanvas()
    }
    
    // 如果游戏正在运行且未暂停，暂时暂停游戏
    if (isGameActive.value && !isPaused.value && !isGameOver.value && !hasError.value) {
      pauseGame()
      
      // 显示提示
      setTimeout(() => {
        if (isPaused.value) {
          alert('窗口大小已改变，游戏已暂停。请点击"继续游戏"按钮恢复。')
        }
      }, 100)
    }
    
    resizeTimeout = null
  }, 300)
}

// 监听游戏阶段变化
watch(
  () => easterEggStore.phase,
  (newPhase) => {
    if (newPhase === 'playing') {
      // 延迟初始化，确保 DOM 已渲染
      setTimeout(() => {
        initGame()
        startGame()
      }, 100)
    }
  }
)

// 组件挂载
onMounted(() => {
  console.log('[游戏容器] 组件已挂载')

  // 如果已经处于游戏阶段，立即初始化
  if (easterEggStore.phase === 'playing') {
    initGame()
    startGame()
  }

  // 监听页面刷新/关闭
  window.addEventListener('beforeunload', handleBeforeUnload)
})

// 组件卸载
onUnmounted(() => {
  console.log('[游戏容器] 组件卸载，清理资源')

  // 移除事件监听
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('beforeunload', handleBeforeUnload)

  cleanupGame()
})

/**
 * 处理页面刷新/关闭
 */
const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
  if (isGameActive.value && !isGameOver.value) {
    // 清理游戏状态
    cleanupGame()
    
    // 恢复正常页面
    easterEggStore.reset()
    
    // 提示用户
    e.preventDefault()
    e.returnValue = ''
  }
}

/**
 * 切换音乐开关
 */
const toggleMusic = (): void => {
  if (!gameEngine) return
  
  const audioSystem = gameEngine.getAudioSystem()
  if (audioSystem) {
    audioSystem.toggleMusic()
    isMusicEnabled.value = audioSystem.isMusicPlaying()
    console.log(`[游戏容器] 音乐${isMusicEnabled.value ? '开启' : '关闭'}`)
  }
}

/**
 * 更新游戏统计数据
 */
const updateGameStats = (): void => {
  if (!stageManager) return
  
  // 更新游戏时间
  if (gameStartTime.value > 0) {
    gameStats.value.totalPlayTime = Date.now() - gameStartTime.value
  }
  
  // 更新最高关卡
  const currentStageNum = stageManager.getCurrentStageNumber()
  if (currentStageNum > gameStats.value.highestStage) {
    gameStats.value.highestStage = currentStageNum
  }
}

/**
 * 检查成就解锁
 * 在游戏过程中定期调用
 */
const checkAchievements = (): void => {
  updateGameStats()
  
  const newAchievements = achievementSystem.checkAchievements(gameStats.value)
  
  if (newAchievements.length > 0) {
    console.log('[游戏容器] 解锁新成就:', newAchievements.map(a => a.name))
    
    // 将新解锁的成就加入队列
    newlyUnlockedAchievements.value.push(...newAchievements)
    
    // 显示第一个成就通知
    if (!showAchievementNotification.value) {
      showNextAchievementNotification()
    }
  }
}

/**
 * 显示下一个成就通知
 */
const showNextAchievementNotification = (): void => {
  if (newlyUnlockedAchievements.value.length === 0) {
    showAchievementNotification.value = false
    currentNotificationAchievement.value = null
    return
  }
  
  currentNotificationAchievement.value = newlyUnlockedAchievements.value.shift()!
  showAchievementNotification.value = true
  
  // 4秒后自动关闭并显示下一个
  setTimeout(() => {
    showNextAchievementNotification()
  }, 4000)
}

/**
 * 关闭成就通知
 */
const closeAchievementNotification = (): void => {
  showAchievementNotification.value = false
  // 立即显示下一个
  setTimeout(() => {
    showNextAchievementNotification()
  }, 300)
}

/**
 * 保存游戏分数到排行榜
 */
const saveGameScore = (): void => {
  updateGameStats()
  
  const score = gameStats.value.totalScore
  const stage = gameStats.value.highestStage
  
  // 获取已解锁的成就
  const unlockedAchievements = achievementSystem.getUnlockedAchievements()
  
  // 添加分数到排行榜
  const result = leaderboardManager.addScore({
    playerName: '玩家',
    score,
    stage,
    timestamp: Date.now(),
    achievements: unlockedAchievements
  })
  
  console.log(`[游戏容器] 保存分数: ${score}, 排名: ${result.rank}, 是否高分: ${result.isHighScore}`)
  
  // 如果是高分，高亮显示
  if (result.isHighScore) {
    const scores = leaderboardManager.getScores()
    const newScore = scores.find((_, index) => index + 1 === result.rank)
    if (newScore) {
      highlightedScoreId.value = newScore.id
    }
  }
}

/**
 * 记录击杀并更新统计
 */
const recordKill = (isElite: boolean = false, isBoss: boolean = false): void => {
  gameStats.value.totalKills++
  
  // 计算分数：普通敌人 100 分，精英 300 分，Boss 1000 分
  let scoreGain = 100
  if (isBoss) {
    scoreGain = 1000
  } else if (isElite) {
    scoreGain = 300
  }
  gameStats.value.totalScore += scoreGain
  
  // 每击杀 10 个敌人检查一次成就
  if (gameStats.value.totalKills % 10 === 0) {
    checkAchievements()
  }
}

/**
 * 记录关卡完成
 */
const recordStageComplete = (): void => {
  // 检查是否无伤通关
  if (player && player.health === stageStartHealth.value) {
    gameStats.value.perfectStages++
    console.log('[游戏容器] 无伤通关！完美关卡数:', gameStats.value.perfectStages)
  }
  
  // 检查成就
  checkAchievements()
}

/**
 * 重置游戏统计
 */
const resetGameStats = (): void => {
  gameStats.value = {
    totalScore: 0,
    highestStage: 1,
    totalKills: 0,
    totalPlayTime: 0,
    perfectStages: 0
  }
  gameStartTime.value = Date.now()
  stageStartHealth.value = 10
  highlightedScoreId.value = ''
  newlyUnlockedAchievements.value = []
}

/**
 * 切换排行榜显示
 */
const toggleLeaderboard = (): void => {
  showLeaderboard.value = !showLeaderboard.value
  if (showLeaderboard.value) {
    showAchievementList.value = false
  }
}

/**
 * 切换成就列表显示
 */
const toggleAchievementList = (): void => {
  showAchievementList.value = !showAchievementList.value
  if (showAchievementList.value) {
    showLeaderboard.value = false
  }
}

// 暴露方法供外部调用
defineExpose({
  startGame,
  pauseGame,
  resumeGame,
  endGame,
  exitGame,
  // 排行榜和成就相关
  gameStats,
  showLeaderboard,
  showAchievementList,
  toggleLeaderboard,
  toggleAchievementList,
  leaderboardManager,
  achievementSystem
})
</script>

<style scoped>
.game-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  /* 安全区域适配：全屏游戏容器需要考虑所有安全区域 */
  padding: var(--safe-area-inset-top) var(--safe-area-inset-right) var(--safe-area-inset-bottom) var(--safe-area-inset-left);
  box-sizing: border-box;
}

.game-container.game-active {
  display: flex;
}

.game-canvas {
  border: 8px solid #8b4513;
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.1);
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.game-hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10001;
  /* 安全区域适配：HUD 需要在安全区域内显示 */
  padding: var(--safe-area-inset-top) var(--safe-area-inset-right) var(--safe-area-inset-bottom) var(--safe-area-inset-left);
}

.hud-top-left {
  position: absolute;
  top: 20px;
  left: 20px;
}

.hud-top-right {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: flex-end;
}

.hud-bottom-left {
  position: absolute;
  bottom: 20px;
  left: 20px;
}

.hud-bottom-right {
  position: absolute;
  bottom: 20px;
  right: 20px;
}

/* 生命值显示 */
.health-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.85);
  padding: 10px 15px;
  border: 3px solid #ff0000;
  border-radius: 4px;
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 14px;
  color: #ff0000;
  box-shadow: 0 0 15px rgba(255, 0, 0, 0.5), inset 0 0 10px rgba(255, 0, 0, 0.1);
}

.health-icon {
  font-size: 20px;
  color: #ff0000;
  text-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
  animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.health-bar {
  width: 120px;
  height: 20px;
  background: #1a0000;
  border: 2px solid #ff0000;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
}

.health-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff0000 0%, #ff6666 50%, #ff0000 100%);
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.6);
  position: relative;
}

.health-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%);
}

.health-text {
  white-space: nowrap;
  min-width: 70px;
  text-align: right;
  font-weight: bold;
  font-size: 13px;
  text-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
}

/* 导弹数量显示 */
.missile-display {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.85);
  padding: 10px 15px;
  border: 3px solid #00ffff;
  border-radius: 4px;
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 16px;
  color: #00ffff;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.1);
}

.missile-icon {
  font-size: 24px;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
  animation: missileGlow 2s ease-in-out infinite;
}

@keyframes missileGlow {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.3);
  }
}

.missile-text {
  font-weight: bold;
  font-size: 18px;
  min-width: 40px;
  text-align: center;
  text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
}

/* 音乐开关按钮 */
.music-toggle-button {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.85);
  padding: 10px 15px;
  border: 3px solid #ffff00;
  border-radius: 4px;
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 14px;
  color: #ffff00;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(255, 255, 0, 0.5), inset 0 0 10px rgba(255, 255, 0, 0.1);
  pointer-events: auto;
}

.music-toggle-button:hover {
  background: rgba(255, 255, 0, 0.1);
  border-color: #ffff00;
  box-shadow: 0 0 20px rgba(255, 255, 0, 0.7), inset 0 0 15px rgba(255, 255, 0, 0.2);
  transform: scale(1.05);
}

.music-toggle-button:active {
  transform: scale(0.95);
}

.music-icon {
  font-size: 20px;
  color: #ffff00;
  text-shadow: 0 0 10px rgba(255, 255, 0, 0.8);
  animation: musicPulse 2s ease-in-out infinite;
}

@keyframes musicPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.music-status {
  font-weight: bold;
  font-size: 12px;
  min-width: 30px;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 255, 0, 0.5);
}

/* 核弹进度条 */
.nuke-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.85);
  padding: 10px 15px;
  border: 3px solid #ffff00;
  border-radius: 4px;
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 12px;
  color: #ffff00;
  box-shadow: 0 0 15px rgba(255, 255, 0, 0.5), inset 0 0 10px rgba(255, 255, 0, 0.1);
}

.nuke-label {
  white-space: nowrap;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(255, 255, 0, 0.5);
}

.nuke-bar {
  width: 150px;
  height: 18px;
  background: #1a1a00;
  border: 2px solid #ffff00;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
}

.nuke-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffff00 0%, #ff6600 100%);
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.5);
  position: relative;
}

.nuke-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%);
}

.nuke-text {
  white-space: nowrap;
  min-width: 60px;
  text-align: right;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(255, 255, 0, 0.5);
}

/* 关卡信息 */
.stage-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.85);
  padding: 10px 15px;
  border: 3px solid #00ff00;
  border-radius: 4px;
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 12px;
  color: #00ff00;
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.5), inset 0 0 10px rgba(0, 255, 0, 0.1);
}

.info-item {
  white-space: nowrap;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
}

.fps-counter {
  position: absolute;
  top: 20px;
  right: 20px;
  color: #0f0;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border: 2px solid #0f0;
  border-radius: 4px;
}

.controls-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10002;
  animation: fadeInOut 5s ease-in-out;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.controls-panel {
  background: rgba(0, 0, 0, 0.9);
  border: 4px solid #00ff00;
  border-radius: 8px;
  padding: 30px 40px;
  font-family: 'Press Start 2P', monospace;
  color: #00ff00;
  box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
}

.controls-panel h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  text-align: center;
  color: #ffff00;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 15px 0;
  font-size: 12px;
}

.key {
  display: inline-block;
  min-width: 100px;
  padding: 8px 12px;
  background: #000;
  border: 2px solid #00ff00;
  border-radius: 4px;
  text-align: center;
  color: #ffff00;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
}

.desc {
  color: #00ff00;
}

.pause-overlay,
.game-over-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10001;
}

.pause-message,
.game-over-message {
  background: #000;
  border: 4px solid #0f0;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  font-family: 'Press Start 2P', monospace;
  color: #0f0;
}

.pause-message p,
.game-over-message h2,
.game-over-message p {
  margin: 0 0 20px 0;
  font-size: 16px;
}

.game-over-message h2 {
  font-size: 24px;
  margin-bottom: 30px;
}

.resume-button,
.exit-button {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  padding: 12px 24px;
  margin: 10px;
  background: #000;
  color: #0f0;
  border: 2px solid #0f0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.resume-button:hover,
.exit-button:hover {
  background: #0f0;
  color: #000;
  transform: scale(1.05);
}

.exit-button {
  border-color: #f00;
  color: #f00;
}

.exit-button:hover {
  background: #f00;
  color: #000;
}

/* 错误提示 */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10002;
}

.error-message {
  background: #000;
  border: 4px solid #f00;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  font-family: 'Press Start 2P', monospace;
  color: #f00;
  max-width: 600px;
}

.error-message h2 {
  font-size: 20px;
  margin-bottom: 20px;
  color: #ff0;
}

.error-message p {
  margin: 0 0 30px 0;
  font-size: 12px;
  line-height: 1.8;
  color: #fff;
}

/* 游戏结束按钮组 */
.game-over-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.leaderboard-button,
.achievement-button {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  padding: 12px 20px;
  background: #000;
  border: 2px solid #00d9ff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  color: #00d9ff;
}

.leaderboard-button:hover {
  background: #00d9ff;
  color: #000;
  transform: scale(1.05);
}

.achievement-button {
  border-color: #7b61ff;
  color: #7b61ff;
}

.achievement-button:hover {
  background: #7b61ff;
  color: #000;
  transform: scale(1.05);
}

/* 弹窗通用样式 */
.leaderboard-modal,
.achievement-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10003;
}

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 80%;
  overflow-y: auto;
}

.modal-close {
  position: absolute;
  top: -15px;
  right: -15px;
  width: 40px;
  height: 40px;
  background: #000;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10004;
  transition: all 0.3s;
}

.modal-close:hover {
  background: #fff;
  color: #000;
  transform: scale(1.1);
}

/* 排行榜自定义样式 */
.leaderboard-wrapper {
  background: rgba(21, 25, 50, 0.95);
  border: 3px solid #00d9ff;
  border-radius: 12px;
  padding: 24px;
  min-width: 350px;
  max-width: 450px;
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.4);
  font-family: 'Press Start 2P', 'Courier New', monospace;
}

.leaderboard-header-custom {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.leaderboard-title {
  font-size: 18px;
  color: #00d9ff;
  margin: 0;
  text-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
}

.leaderboard-list-custom {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leaderboard-item-custom {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 15px;
  background: rgba(21, 25, 50, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  transition: all 0.3s;
}

.leaderboard-item-custom:hover {
  background: rgba(30, 35, 60, 0.9);
  transform: translateX(5px);
}

.leaderboard-item-custom.is-highlighted {
  border-color: #ff6b9d;
  background: linear-gradient(135deg, rgba(21, 25, 50, 0.9) 0%, rgba(255, 107, 157, 0.2) 100%);
  animation: highlightPulse 2s ease-in-out infinite;
  box-shadow: 0 0 15px rgba(255, 107, 157, 0.4);
}

@keyframes highlightPulse {
  0%, 100% { box-shadow: 0 0 15px rgba(255, 107, 157, 0.4); }
  50% { box-shadow: 0 0 25px rgba(255, 107, 157, 0.6); }
}

.item-rank-custom {
  width: 40px;
  text-align: center;
}

.rank-medal {
  font-size: 22px;
}

.rank-number {
  font-size: 14px;
  color: #a0aec0;
  font-weight: bold;
}

.item-info-custom {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-name {
  font-size: 12px;
  color: #fff;
}

.player-stage {
  font-size: 10px;
  color: #718096;
}

.item-score-custom {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.score-value {
  font-size: 16px;
  color: #00d9ff;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(0, 217, 255, 0.5);
}

.score-label {
  font-size: 10px;
  color: #718096;
}

.new-record-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: linear-gradient(135deg, #ff6b9d, #ff4d85);
  color: #fff;
  font-size: 8px;
  padding: 4px 8px;
  border-radius: 0 8px 0 8px;
  animation: newBadgePulse 1s ease-in-out infinite;
}

@keyframes newBadgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: #718096;
  font-size: 12px;
}

/* 成就列表自定义样式 */
.achievement-wrapper {
  background: rgba(21, 25, 50, 0.95);
  border: 3px solid #7b61ff;
  border-radius: 12px;
  padding: 24px;
  min-width: 350px;
  max-width: 500px;
  box-shadow: 0 0 30px rgba(123, 97, 255, 0.4);
  font-family: 'Press Start 2P', 'Courier New', monospace;
}

.achievement-header-custom {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.achievement-title {
  font-size: 18px;
  color: #7b61ff;
  margin: 0 0 10px 0;
  text-shadow: 0 0 10px rgba(123, 97, 255, 0.5);
}

.achievement-progress-custom {
  font-size: 12px;
  color: #a0aec0;
}

.achievement-grid-custom {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.achievement-item-custom {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  background: rgba(21, 25, 50, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}

.achievement-item-custom.is-unlocked {
  border-color: #7b61ff;
  background: linear-gradient(135deg, rgba(21, 25, 50, 0.9) 0%, rgba(123, 97, 255, 0.15) 100%);
}

.achievement-item-custom:not(.is-unlocked) {
  opacity: 0.5;
  filter: grayscale(0.5);
}

.item-icon-custom {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 31, 58, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.is-unlocked .item-icon-custom {
  border-color: #7b61ff;
  box-shadow: 0 0 10px rgba(123, 97, 255, 0.3);
}

.icon-emoji {
  font-size: 24px;
}

.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  font-size: 16px;
}

.item-info-achievement {
  flex: 1;
}

.item-name {
  font-size: 11px;
  color: #fff;
  margin: 0 0 6px 0;
}

.is-unlocked .item-name {
  color: #9580ff;
}

.item-description {
  font-size: 9px;
  color: #718096;
  margin: 0;
  line-height: 1.5;
}

/* 成就解锁通知 */
.achievement-notification-popup {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 10005;
  min-width: 280px;
  max-width: 380px;
  background: linear-gradient(135deg, rgba(21, 25, 50, 0.95) 0%, rgba(123, 97, 255, 0.2) 100%);
  border: 2px solid #7b61ff;
  border-radius: 12px;
  box-shadow: 0 0 30px rgba(123, 97, 255, 0.5);
  cursor: pointer;
  overflow: hidden;
  font-family: 'Press Start 2P', 'Courier New', monospace;
}

.notification-glow {
  position: absolute;
  inset: -50%;
  background: radial-gradient(circle at center, rgba(123, 97, 255, 0.3) 0%, transparent 70%);
  animation: glowPulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.notification-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
}

.notification-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 31, 58, 0.8);
  border-radius: 8px;
  border: 2px solid #7b61ff;
  box-shadow: 0 0 15px rgba(123, 97, 255, 0.5);
  flex-shrink: 0;
}

.notification-icon .icon-emoji {
  font-size: 26px;
  animation: iconBounce 0.6s ease-out;
}

@keyframes iconBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.notification-info {
  flex: 1;
}

.notification-label {
  display: block;
  font-size: 9px;
  color: #9580ff;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.notification-title {
  font-size: 12px;
  color: #fff;
  margin: 0 0 6px 0;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.notification-description {
  font-size: 9px;
  color: #718096;
  margin: 0;
  line-height: 1.4;
}

/* 成就通知动画 */
.achievement-notification-enter-active {
  animation: notificationEnter 0.4s ease-out;
}

.achievement-notification-leave-active {
  animation: notificationLeave 0.3s ease-in;
}

@keyframes notificationEnter {
  0% { transform: translateX(100%) scale(0.8); opacity: 0; }
  100% { transform: translateX(0) scale(1); opacity: 1; }
}

@keyframes notificationLeave {
  0% { transform: translateX(0) scale(1); opacity: 1; }
  100% { transform: translateX(100%) scale(0.8); opacity: 0; }
}
</style>
