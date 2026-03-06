/**
 * 成就系统
 * 负责管理游戏成就的定义、检查和持久化存储
 * 
 * 需求: 7.4, 7.5, 7.6
 * - 7.4: 定义至少 5 种可解锁的成就
 * - 7.5: 当玩家满足成就条件时显示成就解锁通知
 * - 7.6: 将已解锁的成就持久化存储到 localStorage
 */

/**
 * 游戏统计数据接口
 * 用于成就条件检查
 */
export interface GameStats {
  /** 总分数 */
  totalScore: number
  /** 最高关卡 */
  highestStage: number
  /** 总击杀数 */
  totalKills: number
  /** 总游戏时间（毫秒） */
  totalPlayTime: number
  /** 完美通关关卡数（无伤通关） */
  perfectStages: number
}

/**
 * 成就定义接口
 */
export interface Achievement {
  /** 成就唯一标识符 */
  id: string
  /** 成就名称 */
  name: string
  /** 成就描述 */
  description: string
  /** 成就图标（emoji 或图标类名） */
  icon: string
  /** 成就解锁条件函数 */
  condition: (stats: GameStats) => boolean
  /** 解锁时间戳（已解锁时存在） */
  unlockedAt?: number
}

/**
 * 成就系统配置接口
 */
export interface AchievementSystemConfig {
  /** localStorage 存储键名 */
  storageKey: string
}

/**
 * 默认成就定义
 * 包含至少 5 种可解锁的成就
 */
export const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'first_try',
    name: '初次尝试',
    description: '完成第一局游戏',
    icon: '🎮',
    condition: (stats: GameStats) => stats.highestStage >= 1,
  },
  {
    id: 'high_scorer',
    name: '高分玩家',
    description: '获得 10000 分以上',
    icon: '🏆',
    condition: (stats: GameStats) => stats.totalScore >= 10000,
  },
  {
    id: 'stage_master',
    name: '关卡大师',
    description: '通过第 5 关',
    icon: '⭐',
    condition: (stats: GameStats) => stats.highestStage >= 5,
  },
  {
    id: 'kill_expert',
    name: '杀敌达人',
    description: '击杀 100 个敌人',
    icon: '💀',
    condition: (stats: GameStats) => stats.totalKills >= 100,
  },
  {
    id: 'endurance_warrior',
    name: '持久战士',
    description: '游戏时间超过 5 分钟',
    icon: '⏱️',
    condition: (stats: GameStats) => stats.totalPlayTime >= 5 * 60 * 1000,
  },
  {
    id: 'perfect_run',
    name: '完美通关',
    description: '无伤通过任意关卡',
    icon: '💎',
    condition: (stats: GameStats) => stats.perfectStages >= 1,
  },
  {
    id: 'score_legend',
    name: '传奇得分',
    description: '获得 50000 分以上',
    icon: '👑',
    condition: (stats: GameStats) => stats.totalScore >= 50000,
  },
]

/**
 * 成就系统类
 * 
 * 功能：
 * - 管理成就定义列表
 * - 检查游戏统计数据是否满足成就条件
 * - 持久化存储已解锁的成就
 * - 提供成就查询接口
 */
export class AchievementSystem {
  /** localStorage 存储键名 */
  private readonly storageKey: string
  /** 成就定义列表 */
  private achievements: Achievement[]

  /**
   * 创建成就系统实例
   * @param achievements 成就定义列表
   * @param config 可选的配置参数
   */
  constructor(
    achievements: Omit<Achievement, 'unlockedAt'>[] = DEFAULT_ACHIEVEMENTS,
    config: Partial<AchievementSystemConfig> = {}
  ) {
    this.storageKey = config.storageKey || 'game_achievements'
    // 复制成就定义，避免修改原始数据
    this.achievements = achievements.map(a => ({ ...a }))
    // 加载已解锁的成就状态
    this.loadUnlockedStatus()
  }

  /**
   * 检查成就解锁状态
   * 根据游戏统计数据检查所有未解锁的成就
   * 
   * @param stats 游戏统计数据
   * @returns 新解锁的成就列表
   */
  checkAchievements(stats: GameStats): Achievement[] {
    const unlocked = this.getUnlockedAchievements()
    const newlyUnlocked: Achievement[] = []

    for (const achievement of this.achievements) {
      // 跳过已解锁的成就
      if (unlocked.includes(achievement.id)) {
        continue
      }

      try {
        // 检查成就条件
        if (achievement.condition(stats)) {
          const unlockedAt = Date.now()
          achievement.unlockedAt = unlockedAt
          newlyUnlocked.push({ ...achievement })
          this.saveUnlockedAchievement(achievement.id)
        }
      } catch (error) {
        // 成就条件函数抛出异常时，跳过该成就检查
        console.warn(`AchievementSystem: 检查成就 "${achievement.id}" 时发生错误`, error)
      }
    }

    return newlyUnlocked
  }

  /**
   * 获取已解锁的成就 ID 列表
   * 
   * @returns 已解锁的成就 ID 数组
   */
  getUnlockedAchievements(): string[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (!data) {
        return []
      }
      const unlocked = JSON.parse(data)
      // 确保返回的数据是有效的数组
      if (!Array.isArray(unlocked)) {
        return []
      }
      // 过滤无效的值，只保留字符串
      return unlocked.filter((id): id is string => typeof id === 'string')
    } catch {
      // JSON 解析失败时返回空数组
      return []
    }
  }

  /**
   * 获取所有成就定义
   * 包含解锁状态信息
   * 
   * @returns 所有成就的副本数组
   */
  getAllAchievements(): Achievement[] {
    return this.achievements.map(a => ({ ...a }))
  }

  /**
   * 获取成就统计信息
   * 
   * @returns 包含总数和已解锁数的对象
   */
  getAchievementStats(): { total: number; unlocked: number } {
    const unlocked = this.getUnlockedAchievements()
    return {
      total: this.achievements.length,
      unlocked: unlocked.length,
    }
  }

  /**
   * 根据 ID 获取单个成就
   * 
   * @param id 成就 ID
   * @returns 成就对象或 undefined
   */
  getAchievementById(id: string): Achievement | undefined {
    const achievement = this.achievements.find(a => a.id === id)
    return achievement ? { ...achievement } : undefined
  }

  /**
   * 检查指定成就是否已解锁
   * 
   * @param id 成就 ID
   * @returns 是否已解锁
   */
  isAchievementUnlocked(id: string): boolean {
    return this.getUnlockedAchievements().includes(id)
  }

  /**
   * 重置所有成就（清除解锁状态）
   * 主要用于测试或用户请求重置
   */
  resetAchievements(): void {
    localStorage.removeItem(this.storageKey)
    // 重置内存中的解锁状态
    for (const achievement of this.achievements) {
      delete achievement.unlockedAt
    }
  }

  /**
   * 获取存储键名
   * 主要用于测试
   * 
   * @returns 存储键名
   */
  getStorageKey(): string {
    return this.storageKey
  }

  /**
   * 保存已解锁的成就到 localStorage
   * 
   * @param id 成就 ID
   */
  private saveUnlockedAchievement(id: string): void {
    try {
      const unlocked = this.getUnlockedAchievements()
      if (!unlocked.includes(id)) {
        unlocked.push(id)
        localStorage.setItem(this.storageKey, JSON.stringify(unlocked))
      }
    } catch (error) {
      // localStorage 存储失败时，记录警告但不影响游戏运行
      console.warn('AchievementSystem: localStorage 存储失败', error)
    }
  }

  /**
   * 从 localStorage 加载已解锁的成就状态
   * 更新内存中的成就对象
   */
  private loadUnlockedStatus(): void {
    const unlocked = this.getUnlockedAchievements()
    for (const achievement of this.achievements) {
      if (unlocked.includes(achievement.id)) {
        // 设置一个默认的解锁时间（因为我们没有存储具体时间）
        achievement.unlockedAt = achievement.unlockedAt || Date.now()
      }
    }
  }
}
