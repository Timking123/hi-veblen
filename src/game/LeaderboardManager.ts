/**
 * 排行榜管理器
 * 负责管理游戏分数记录的存储、排序和查询
 * 
 * 需求: 7.1, 7.2, 7.3
 * - 7.1: 存储最多 10 条最高分记录到 localStorage
 * - 7.2: 按分数降序排列，显示排名、玩家名、分数和关卡
 * - 7.3: 判断玩家是否达成新的高分
 */

/**
 * 分数记录条目接口
 */
export interface ScoreEntry {
  /** 唯一标识符 */
  id: string
  /** 玩家名称 */
  playerName: string
  /** 分数 */
  score: number
  /** 达到的关卡 */
  stage: number
  /** 记录时间戳 */
  timestamp: number
  /** 获得的成就列表 */
  achievements: string[]
}

/**
 * 排行榜配置接口
 */
export interface LeaderboardConfig {
  /** 最大记录条数 */
  maxEntries: number
  /** localStorage 存储键名 */
  storageKey: string
}

/**
 * 添加分数的返回结果
 */
export interface AddScoreResult {
  /** 排名（1-based），如果未进入排行榜则为 0 */
  rank: number
  /** 是否为高分（进入排行榜） */
  isHighScore: boolean
}

/**
 * 排行榜管理器类
 * 
 * 功能：
 * - 存储和管理游戏分数记录
 * - 自动按分数降序排序
 * - 限制最大记录数量（默认 10 条）
 * - 持久化存储到 localStorage
 */
export class LeaderboardManager {
  private readonly config: LeaderboardConfig

  /**
   * 创建排行榜管理器实例
   * @param config 可选的配置参数
   */
  constructor(config: Partial<LeaderboardConfig> = {}) {
    this.config = {
      maxEntries: 10,
      storageKey: 'game_leaderboard',
      ...config,
    }
  }

  /**
   * 获取所有分数记录
   * 返回按分数降序排列的记录列表
   * 
   * @returns 分数记录数组
   */
  getScores(): ScoreEntry[] {
    try {
      const data = localStorage.getItem(this.config.storageKey)
      if (!data) {
        return []
      }
      const scores = JSON.parse(data) as ScoreEntry[]
      // 确保返回的数据是有效的数组
      if (!Array.isArray(scores)) {
        return []
      }
      return scores
    } catch {
      // JSON 解析失败时返回空数组
      return []
    }
  }

  /**
   * 添加新的分数记录
   * 
   * 流程：
   * 1. 生成唯一 ID
   * 2. 将新记录添加到列表
   * 3. 按分数降序排序
   * 4. 截取前 maxEntries 条记录
   * 5. 保存到 localStorage
   * 6. 返回排名和是否为高分
   * 
   * @param entry 分数记录（不含 id）
   * @returns 添加结果，包含排名和是否为高分
   */
  addScore(entry: Omit<ScoreEntry, 'id'>): AddScoreResult {
    const scores = this.getScores()
    
    // 生成唯一 ID
    const newEntry: ScoreEntry = {
      ...entry,
      id: this.generateId(),
    }

    // 添加新记录
    scores.push(newEntry)

    // 按分数降序排序
    scores.sort((a, b) => b.score - a.score)

    // 截取前 maxEntries 条记录
    const trimmed = scores.slice(0, this.config.maxEntries)

    // 保存到 localStorage
    this.saveScores(trimmed)

    // 计算排名（1-based）
    const rank = trimmed.findIndex(s => s.id === newEntry.id) + 1
    
    // 如果 rank 为 0，说明新记录未进入排行榜
    const isHighScore = rank > 0 && rank <= this.config.maxEntries

    return { rank, isHighScore }
  }

  /**
   * 判断给定分数是否能进入排行榜
   * 
   * 判断逻辑：
   * - 如果排行榜未满（< maxEntries），任何分数都是高分
   * - 如果排行榜已满，分数必须高于最低分才是高分
   * 
   * @param score 要判断的分数
   * @returns 是否为高分
   */
  isHighScore(score: number): boolean {
    const scores = this.getScores()
    
    // 排行榜未满，任何分数都是高分
    if (scores.length < this.config.maxEntries) {
      return true
    }

    // 排行榜已满，比较最低分
    const lowestScore = scores[scores.length - 1].score
    return score > lowestScore
  }

  /**
   * 清空所有分数记录
   */
  clearScores(): void {
    localStorage.removeItem(this.config.storageKey)
  }

  /**
   * 获取配置信息
   * @returns 当前配置
   */
  getConfig(): LeaderboardConfig {
    return { ...this.config }
  }

  /**
   * 生成唯一 ID
   * 优先使用 crypto.randomUUID()，不支持时使用备用方案
   * 
   * @returns 唯一 ID 字符串
   */
  private generateId(): string {
    // 优先使用 crypto.randomUUID()
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    // 备用方案：使用时间戳 + 随机数
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * 保存分数记录到 localStorage
   * 
   * @param scores 要保存的分数记录数组
   */
  private saveScores(scores: ScoreEntry[]): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(scores))
    } catch (error) {
      // localStorage 配额超限时，尝试清除旧数据后重试
      console.warn('LeaderboardManager: localStorage 存储失败，尝试清理后重试', error)
      try {
        // 只保留一半的记录
        const reducedScores = scores.slice(0, Math.ceil(scores.length / 2))
        localStorage.setItem(this.config.storageKey, JSON.stringify(reducedScores))
      } catch {
        // 如果仍然失败，静默忽略
        console.error('LeaderboardManager: localStorage 存储失败')
      }
    }
  }
}
