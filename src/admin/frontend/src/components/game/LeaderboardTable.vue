<script setup lang="ts">
/**
 * 排行榜管理组件
 * 显示游戏排行榜数据，支持删除异常记录和重置排行榜
 * 
 * 需求: 6.1.1 - 显示游戏排行榜数据（排名、玩家名、分数、时间）
 * 需求: 6.1.2 - 提供删除异常记录功能
 * 需求: 6.1.3 - 提供重置排行榜功能（需二次确认）
 * 需求: 14.1 - 时间显示使用北京时间
 */
import { ref, onMounted, computed } from 'vue'
import {
  ElTable,
  ElTableColumn,
  ElButton,
  ElMessage,
  ElMessageBox,
  ElIcon,
  ElEmpty,
  ElTag,
  ElCard,
  ElStatistic,
  ElRow,
  ElCol
} from 'element-plus'
import {
  Delete,
  Refresh,
  Trophy,
  Timer,
  User,
  TrendCharts
} from '@element-plus/icons-vue'
import {
  getLeaderboard,
  deleteLeaderboardEntry,
  resetLeaderboard,
  getLeaderboardStats
} from '@/api/game'
import { formatBeijingTime } from '@/utils/time'

// 排行榜数据
const leaderboardData = ref<any[]>([])
const loading = ref(false)

// 统计数据
const stats = ref({
  totalEntries: 0,
  highestScore: 0,
  averageScore: 0,
  latestEntry: null as any
})

/**
 * 加载排行榜数据
 */
async function loadLeaderboard() {
  loading.value = true
  try {
    const [leaderboardRes, statsRes] = await Promise.all([
      getLeaderboard(100),
      getLeaderboardStats()
    ])
    
    leaderboardData.value = (leaderboardRes as any).data || []
    
    const statsData = statsRes as any
    stats.value = {
      totalEntries: statsData.totalEntries || 0,
      highestScore: statsData.highestScore || 0,
      averageScore: Math.round(statsData.averageScore || 0),
      latestEntry: statsData.latestEntry || null
    }
  } catch (error) {
    console.error('加载排行榜失败:', error)
    ElMessage.error('加载排行榜数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 格式化游戏时长
 */
function formatPlayTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return '-'
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes === 0) {
    return `${remainingSeconds}秒`
  }
  
  if (remainingSeconds === 0) {
    return `${minutes}分钟`
  }
  
  return `${minutes}分${remainingSeconds}秒`
}

/**
 * 格式化日期时间
 * 使用北京时间格式化 - 需求 14.1
 */
function formatDateTime(dateStr: string): string {
  return formatBeijingTime(dateStr, 'YYYY-MM-DD HH:mm')
}

/**
 * 获取排名样式
 */
function getRankClass(index: number): string {
  if (index === 0) return 'rank-gold'
  if (index === 1) return 'rank-silver'
  if (index === 2) return 'rank-bronze'
  return ''
}

/**
 * 删除单条记录
 */
async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定要删除玩家 "${row.player_name}" 的记录吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteLeaderboardEntry(row.id)
    ElMessage.success('删除成功')
    await loadLeaderboard()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 重置排行榜
 */
async function handleReset() {
  try {
    await ElMessageBox.confirm(
      '确定要重置排行榜吗？这将清空所有排行榜记录，此操作不可恢复！',
      '重置排行榜',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    // 二次确认
    await ElMessageBox.confirm(
      '请再次确认：您真的要清空所有排行榜数据吗？',
      '二次确认',
      {
        confirmButtonText: '是的，清空所有数据',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    const res = await resetLeaderboard() as any
    ElMessage.success(`排行榜已重置，共删除 ${res.count || 0} 条记录`)
    await loadLeaderboard()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置失败:', error)
      ElMessage.error('重置排行榜失败')
    }
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadLeaderboard()
})
</script>

<template>
  <div class="leaderboard-container">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="总记录数" :value="stats.totalEntries">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="最高分数" :value="stats.highestScore">
            <template #prefix>
              <el-icon><Trophy /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="平均分数" :value="stats.averageScore">
            <template #prefix>
              <el-icon><TrendCharts /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card latest-entry">
          <div class="latest-title">最新记录</div>
          <div v-if="stats.latestEntry" class="latest-content">
            <span class="player-name">{{ stats.latestEntry.player_name }}</span>
            <span class="score">{{ stats.latestEntry.score }} 分</span>
          </div>
          <div v-else class="latest-content empty">暂无记录</div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="loadLeaderboard" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      <el-button 
        type="danger" 
        @click="handleReset"
        :disabled="leaderboardData.length === 0"
      >
        <el-icon><Delete /></el-icon>
        重置排行榜
      </el-button>
    </div>
    
    <!-- 排行榜表格 -->
    <el-table
      :data="leaderboardData"
      v-loading="loading"
      stripe
      style="width: 100%"
      empty-text="暂无排行榜数据"
    >
      <!-- 排名 -->
      <el-table-column label="排名" width="80" align="center">
        <template #default="{ $index }">
          <span :class="['rank', getRankClass($index)]">
            {{ $index + 1 }}
          </span>
        </template>
      </el-table-column>
      
      <!-- 玩家名 -->
      <el-table-column prop="player_name" label="玩家名" min-width="120">
        <template #default="{ row, $index }">
          <div class="player-cell">
            <el-icon v-if="$index < 3" class="trophy-icon" :class="getRankClass($index)">
              <Trophy />
            </el-icon>
            <span>{{ row.player_name }}</span>
          </div>
        </template>
      </el-table-column>
      
      <!-- 分数 -->
      <el-table-column prop="score" label="分数" width="120" align="right">
        <template #default="{ row }">
          <span class="score-value">{{ row.score.toLocaleString() }}</span>
        </template>
      </el-table-column>
      
      <!-- 关卡 -->
      <el-table-column prop="stage" label="关卡" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.stage" type="info" size="small">
            第 {{ row.stage }} 关
          </el-tag>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      
      <!-- 游戏时长 -->
      <el-table-column label="游戏时长" width="120" align="center">
        <template #default="{ row }">
          <span>{{ formatPlayTime(row.play_time) }}</span>
        </template>
      </el-table-column>
      
      <!-- 记录时间 -->
      <el-table-column label="记录时间" width="180" align="center">
        <template #default="{ row }">
          <span class="text-muted">{{ formatDateTime(row.created_at) }}</span>
        </template>
      </el-table-column>
      
      <!-- 操作 -->
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <el-button
            type="danger"
            size="small"
            text
            @click="handleDelete(row)"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style lang="scss" scoped>
.leaderboard-container {
  padding: 16px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  :deep(.el-statistic__head) {
    font-size: 14px;
    color: var(--text-secondary);
  }
  
  :deep(.el-statistic__content) {
    font-size: 24px;
    font-weight: 600;
  }
  
  :deep(.el-icon) {
    margin-right: 4px;
    color: var(--primary-color);
  }
}

.latest-entry {
  .latest-title {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }
  
  .latest-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .player-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .score {
      font-size: 14px;
      color: #67C23A;
    }
    
    &.empty {
      color: var(--text-secondary);
      font-size: 14px;
    }
  }
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-color-page);
  border-radius: 8px;
}

.rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
  
  &.rank-gold {
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #fff;
  }
  
  &.rank-silver {
    background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
    color: #fff;
  }
  
  &.rank-bronze {
    background: linear-gradient(135deg, #CD7F32, #B87333);
    color: #fff;
  }
}

.player-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .trophy-icon {
    font-size: 16px;
    
    &.rank-gold {
      color: #FFD700;
    }
    
    &.rank-silver {
      color: #C0C0C0;
    }
    
    &.rank-bronze {
      color: #CD7F32;
    }
  }
}

.score-value {
  font-weight: 600;
  color: var(--primary-color);
}

.text-muted {
  color: var(--text-secondary);
}
</style>
