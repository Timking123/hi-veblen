<template>
  <div class="leaderboard">
    <!-- 标题 -->
    <div class="leaderboard-header">
      <h2 class="leaderboard-title">🏆 排行榜</h2>
    </div>

    <!-- 排行榜列表 -->
    <div class="leaderboard-content">
      <!-- 空状态 -->
      <div v-if="scores.length === 0" class="leaderboard-empty">
        <span class="empty-icon">📊</span>
        <p class="empty-text">暂无记录</p>
        <p class="empty-hint">完成游戏后将显示在这里</p>
      </div>

      <!-- 排行榜条目 -->
      <div v-else class="leaderboard-list">
        <div
          v-for="(entry, index) in scores"
          :key="entry.id"
          class="leaderboard-item"
          :class="{
            'is-highlighted': highlightedId === entry.id,
            'is-top-three': index < 3
          }"
        >
          <!-- 排名 -->
          <div class="item-rank">
            <span v-if="index === 0" class="rank-medal gold">🥇</span>
            <span v-else-if="index === 1" class="rank-medal silver">🥈</span>
            <span v-else-if="index === 2" class="rank-medal bronze">🥉</span>
            <span v-else class="rank-number">{{ index + 1 }}</span>
          </div>

          <!-- 玩家信息 -->
          <div class="item-info">
            <span class="player-name">{{ entry.playerName }}</span>
            <span class="player-stage">关卡 {{ entry.stage }}</span>
          </div>

          <!-- 分数 -->
          <div class="item-score">
            <span class="score-value">{{ formatScore(entry.score) }}</span>
            <span class="score-label">分</span>
          </div>

          <!-- 新记录标识 -->
          <div v-if="highlightedId === entry.id" class="new-record-badge">
            NEW!
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div v-if="showClearButton && scores.length > 0" class="leaderboard-footer">
      <button class="clear-button" @click="handleClear">
        清空记录
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 排行榜组件
 * 
 * 功能：
 * - 显示排行榜列表（最多 10 条）
 * - 按分数降序排列
 * - 显示排名、玩家名、分数和关卡
 * - 前三名显示金银铜牌图标
 * - 支持高亮显示新记录
 * 
 * 需求: 7.2, 7.3
 * - 7.2: 按分数降序排列，显示排名、玩家名、分数和关卡
 * - 7.3: 高亮显示新记录
 */
import { ref, onMounted, watch } from 'vue'
import { LeaderboardManager, type ScoreEntry } from '@/game/LeaderboardManager'

// Props 定义
interface Props {
  /** 高亮显示的记录 ID（新记录） */
  highlightedId?: string
  /** 是否显示清空按钮 */
  showClearButton?: boolean
  /** 自定义 LeaderboardManager 实例（用于测试） */
  manager?: LeaderboardManager
}

const props = withDefaults(defineProps<Props>(), {
  highlightedId: '',
  showClearButton: false,
  manager: undefined
})

// Emits 定义
const emit = defineEmits<{
  /** 清空记录事件 */
  (e: 'clear'): void
}>()

// 排行榜管理器
const leaderboardManager = props.manager || new LeaderboardManager()

// 分数列表
const scores = ref<ScoreEntry[]>([])

/**
 * 加载分数数据
 */
const loadScores = (): void => {
  scores.value = leaderboardManager.getScores()
}

/**
 * 格式化分数显示
 * @param score 分数
 * @returns 格式化后的分数字符串
 */
const formatScore = (score: number): string => {
  return score.toLocaleString()
}

/**
 * 处理清空记录
 */
const handleClear = (): void => {
  leaderboardManager.clearScores()
  loadScores()
  emit('clear')
}

// 监听 highlightedId 变化，自动刷新数据
watch(() => props.highlightedId, () => {
  loadScores()
})

// 组件挂载时加载数据
onMounted(() => {
  loadScores()
})

// 暴露方法供外部调用
defineExpose({
  loadScores,
  scores
})
</script>


<style scoped>
.leaderboard {
  background: var(--bg-card, rgba(21, 25, 50, 0.8));
  border: 2px solid var(--primary, #00d9ff);
  border-radius: var(--radius-lg, 16px);
  padding: var(--spacing-lg, 24px);
  min-width: 320px;
  max-width: 400px;
  box-shadow: var(--shadow-glow-primary, 0 0 20px rgba(0, 217, 255, 0.3));
  font-family: 'Press Start 2P', 'Courier New', monospace;
}

/* 标题区域 */
.leaderboard-header {
  text-align: center;
  margin-bottom: var(--spacing-lg, 24px);
  padding-bottom: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}

.leaderboard-title {
  font-size: var(--text-xl, 1.25rem);
  color: var(--primary, #00d9ff);
  margin: 0;
  text-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
  letter-spacing: 2px;
}

/* 内容区域 */
.leaderboard-content {
  min-height: 200px;
}

/* 空状态 */
.leaderboard-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl, 48px) var(--spacing-md, 16px);
  color: var(--text-muted, #718096);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md, 16px);
  opacity: 0.5;
}

.empty-text {
  font-size: var(--text-sm, 0.875rem);
  margin: 0 0 var(--spacing-sm, 8px) 0;
  color: var(--text-secondary, #a0aec0);
}

.empty-hint {
  font-size: var(--text-xs, 0.75rem);
  margin: 0;
  color: var(--text-muted, #718096);
}

/* 排行榜列表 */
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

/* 排行榜条目 */
.leaderboard-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  background: var(--bg-secondary, #151932);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  transition: all var(--transition-base, 300ms ease);
  position: relative;
  overflow: hidden;
}

.leaderboard-item:hover {
  background: var(--bg-tertiary, #1a1f3a);
  border-color: var(--border-strong, rgba(255, 255, 255, 0.2));
  transform: translateX(4px);
}

/* 前三名特殊样式 */
.leaderboard-item.is-top-three {
  border-color: var(--primary, #00d9ff);
  background: linear-gradient(
    135deg,
    var(--bg-secondary, #151932) 0%,
    rgba(0, 217, 255, 0.1) 100%
  );
}

/* 高亮新记录 */
.leaderboard-item.is-highlighted {
  border-color: var(--accent, #ff6b9d);
  background: linear-gradient(
    135deg,
    var(--bg-secondary, #151932) 0%,
    rgba(255, 107, 157, 0.2) 100%
  );
  animation: highlightPulse 2s ease-in-out infinite;
  box-shadow: 0 0 15px rgba(255, 107, 157, 0.4);
}

@keyframes highlightPulse {
  0%, 100% {
    box-shadow: 0 0 15px rgba(255, 107, 157, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(255, 107, 157, 0.6);
  }
}

/* 排名 */
.item-rank {
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.rank-medal {
  font-size: 24px;
  display: inline-block;
  animation: medalBounce 2s ease-in-out infinite;
}

.rank-medal.gold {
  animation-delay: 0s;
}

.rank-medal.silver {
  animation-delay: 0.2s;
}

.rank-medal.bronze {
  animation-delay: 0.4s;
}

@keyframes medalBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.rank-number {
  font-size: var(--text-base, 1rem);
  color: var(--text-secondary, #a0aec0);
  font-weight: var(--font-bold, 700);
}

/* 玩家信息 */
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.player-name {
  font-size: var(--text-sm, 0.875rem);
  color: var(--text-primary, #ffffff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-stage {
  font-size: var(--text-xs, 0.75rem);
  color: var(--text-muted, #718096);
}

/* 分数 */
.item-score {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
}

.score-value {
  font-size: var(--text-lg, 1.125rem);
  color: var(--primary, #00d9ff);
  font-weight: var(--font-bold, 700);
  text-shadow: 0 0 5px rgba(0, 217, 255, 0.5);
}

.score-label {
  font-size: var(--text-xs, 0.75rem);
  color: var(--text-muted, #718096);
}

/* 新记录标识 */
.new-record-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: linear-gradient(135deg, var(--accent, #ff6b9d), var(--accent-dark, #ff4d85));
  color: var(--text-primary, #ffffff);
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 0 var(--radius-md, 8px) 0 var(--radius-md, 8px);
  animation: newBadgePulse 1s ease-in-out infinite;
  text-transform: uppercase;
  letter-spacing: 1px;
}

@keyframes newBadgePulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* 底部操作区域 */
.leaderboard-footer {
  margin-top: var(--spacing-lg, 24px);
  padding-top: var(--spacing-md, 16px);
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  text-align: center;
}

.clear-button {
  font-family: 'Press Start 2P', 'Courier New', monospace;
  font-size: var(--text-xs, 0.75rem);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  background: transparent;
  color: var(--text-muted, #718096);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: all var(--transition-base, 300ms ease);
}

.clear-button:hover {
  color: var(--accent, #ff6b9d);
  border-color: var(--accent, #ff6b9d);
  background: rgba(255, 107, 157, 0.1);
}

.clear-button:active {
  transform: scale(0.98);
}

/* 响应式适配 */
@media (max-width: 480px) {
  .leaderboard {
    min-width: 280px;
    padding: var(--spacing-md, 16px);
  }

  .leaderboard-title {
    font-size: var(--text-lg, 1.125rem);
  }

  .leaderboard-item {
    padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
    gap: var(--spacing-sm, 8px);
  }

  .item-rank {
    width: 32px;
  }

  .rank-medal {
    font-size: 20px;
  }

  .player-name {
    font-size: var(--text-xs, 0.75rem);
  }

  .score-value {
    font-size: var(--text-base, 1rem);
  }
}
</style>
