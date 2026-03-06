<script setup lang="ts">
/**
 * 数据看板页面
 * 展示网站访问统计和关键指标
 * 
 * 需求: 2.1.1-2.3.2
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Monitor, Trophy, User, TrendCharts } from '@element-plus/icons-vue'
import DashboardStats from '@/components/dashboard/DashboardStats.vue'
import TrendChart from '@/components/dashboard/TrendChart.vue'
import PieChart from '@/components/dashboard/PieChart.vue'
import BarChart from '@/components/dashboard/BarChart.vue'
import RecentVisits from '@/components/dashboard/RecentVisits.vue'
import dashboardApi from '@/api/dashboard'
import { getAuthToken } from '@/api/request'
import type { 
  DashboardStats as DashboardStatsType, 
  VisitTrend, 
  PageDistribution, 
  SourceAnalysis, 
  RecentVisit 
} from '@/types'

// 统计数据
const router = useRouter()
const stats = ref<DashboardStatsType | null>(null)
const trendData = ref<VisitTrend[]>([])
const pageDistribution = ref<PageDistribution[]>([])
const sourceAnalysis = ref<SourceAnalysis | null>(null)
const recentVisits = ref<RecentVisit[]>([])

// 游戏数据统计（需求 2.2.4）
const gameStats = ref({
  totalPlayers: 0,
  averageScore: 0,
  highestScore: 0,
  todayPlayers: 0
})

// 加载状态
const statsLoading = ref(false)
const trendLoading = ref(false)
const pageLoading = ref(false)
const sourceLoading = ref(false)
const recentLoading = ref(false)
const gameLoading = ref(false)

// 趋势图时间周期
const trendPeriod = ref<'day' | 'week' | 'month'>('day')

// 自动刷新相关（需求 2.3.2）
let refreshTimer: ReturnType<typeof setInterval> | null = null
const REFRESH_INTERVAL = 30 * 1000 // 30秒自动刷新
const lastRefreshTime = ref<string>('')
const autoRefreshEnabled = ref(true)

/**
 * 更新最后刷新时间
 */
const updateLastRefreshTime = () => {
  const now = new Date()
  lastRefreshTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 加载统计数据
 * 需求: 2.1.1-2.1.4
 * 
 * 注意: 响应拦截器已经返回 response.data，所以这里直接使用 response
 * API 返回格式: { visits: { today: { pv, uv }, week: {...}, month: {...} }, messages: {...}, resume: {...}, game: {...} }
 * 需要转换为前端期望的格式: { pv: { today, week, month }, uv: {...}, messages: {...}, downloads: number, game: {...} }
 */
const loadStats = async () => {
  statsLoading.value = true
  try {
    const response = await dashboardApi.getStats() as any
    // 转换数据结构以匹配前端组件期望的格式
    if (response) {
      stats.value = {
        pv: {
          today: response.visits?.today?.pv || 0,
          week: response.visits?.week?.pv || 0,
          month: response.visits?.month?.pv || 0
        },
        uv: {
          today: response.visits?.today?.uv || 0,
          week: response.visits?.week?.uv || 0,
          month: response.visits?.month?.uv || 0
        },
        messages: {
          total: response.messages?.total || 0,
          unread: response.messages?.unread || 0,
          read: response.messages?.read || 0
        },
        downloads: response.resume?.downloads || 0,
        game: {
          triggers: response.game?.triggers || 0,
          completions: response.game?.completions || 0,
          players: response.game?.players || 0,
          avgScore: response.game?.avgScore || 0,
          highScore: response.game?.highScore || 0
        },
        gameStats: {
          totalPlayers: response.game?.players || 0,
          averageScore: response.game?.avgScore || 0,
          highestScore: response.game?.highScore || 0,
          todayPlayers: 0 // API 暂未提供此字段
        }
      } as DashboardStatsType
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  } finally {
    statsLoading.value = false
  }
}

/**
 * 加载访问趋势数据
 * 需求: 2.2.1
 * 注意: 响应拦截器已经返回 response.data
 */
const loadTrendData = async () => {
  trendLoading.value = true
  try {
    const response = await dashboardApi.getVisitTrend(trendPeriod.value) as any
    trendData.value = response?.data || response || []
  } catch (error) {
    console.error('加载访问趋势失败:', error)
  } finally {
    trendLoading.value = false
  }
}

/**
 * 加载页面分布数据
 * 需求: 2.2.2
 * 注意: 响应拦截器已经返回 response.data
 */
const loadPageDistribution = async () => {
  pageLoading.value = true
  try {
    const response = await dashboardApi.getPageDistribution() as any
    pageDistribution.value = response?.data || response || []
  } catch (error) {
    console.error('加载页面分布失败:', error)
  } finally {
    pageLoading.value = false
  }
}

/**
 * 加载来源分析数据
 * 需求: 2.2.3
 * 注意: 响应拦截器已经返回 response.data
 */
const loadSourceAnalysis = async () => {
  sourceLoading.value = true
  try {
    const response = await dashboardApi.getSourceAnalysis() as any
    sourceAnalysis.value = response
  } catch (error) {
    console.error('加载来源分析失败:', error)
  } finally {
    sourceLoading.value = false
  }
}

/**
 * 加载最近访问记录
 * 需求: 2.3.1
 * 注意: 响应拦截器已经返回 response.data
 */
const loadRecentVisits = async () => {
  recentLoading.value = true
  try {
    const response = await dashboardApi.getRecentVisits(10) as any
    recentVisits.value = response?.data || response || []
  } catch (error) {
    console.error('加载最近访问失败:', error)
  } finally {
    recentLoading.value = false
  }
}

/**
 * 加载游戏数据统计
 * 需求: 2.2.4
 */
const loadGameStats = async () => {
  gameLoading.value = true
  try {
    // 从统计数据中提取游戏相关信息
    if (stats.value?.gameStats) {
      gameStats.value = {
        totalPlayers: stats.value.gameStats.totalPlayers || 0,
        averageScore: stats.value.gameStats.averageScore || 0,
        highestScore: stats.value.gameStats.highestScore || 0,
        todayPlayers: stats.value.gameStats.todayPlayers || 0
      }
    }
  } catch (error) {
    console.error('加载游戏统计失败:', error)
  } finally {
    gameLoading.value = false
  }
}

/**
 * 刷新所有数据
 * 需求: 2.3.2
 * @param showMessage - 是否显示刷新成功提示（手动刷新时显示，自动刷新时不显示）
 */
const refreshAllData = async (showMessage = false) => {
  updateLastRefreshTime()
  
  // 并行加载所有数据
  await Promise.all([
    loadStats(),
    loadTrendData(),
    loadPageDistribution(),
    loadSourceAnalysis(),
    loadRecentVisits()
  ])
  
  // 加载游戏统计（依赖 stats 数据）
  await loadGameStats()
  
  // 只在手动刷新时显示提示
  if (showMessage) {
    ElMessage.success('数据已刷新')
  }
}

/**
 * 手动刷新数据
 */
const handleRefresh = async () => {
  await refreshAllData(true) // 手动刷新显示提示
}

/**
 * 启动自动刷新定时器
 * 需求: 2.3.2 - 每30秒自动刷新
 */
const startAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  
  refreshTimer = setInterval(() => {
    if (autoRefreshEnabled.value) {
      refreshAllData()
    }
  }, REFRESH_INTERVAL)
}

/**
 * 停止自动刷新定时器
 */
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

/**
 * 切换自动刷新状态
 */
const toggleAutoRefresh = () => {
  autoRefreshEnabled.value = !autoRefreshEnabled.value
  if (autoRefreshEnabled.value) {
    ElMessage.success('已开启自动刷新')
  } else {
    ElMessage.info('已关闭自动刷新')
  }
}

// 监听趋势周期变化
watch(trendPeriod, () => {
  loadTrendData()
})

/**
 * 等待 token 就绪并确保请求拦截器能正确读取
 * 解决登录后立即跳转导致的竞态条件问题
 * 
 * 使用 getAuthToken() 从内存缓存获取 token，比 localStorage 更快更可靠
 */
const waitForToken = async (maxRetries = 10, delay = 100): Promise<boolean> => {
  console.log('[Dashboard] 开始等待 token 就绪...')
  
  for (let i = 0; i < maxRetries; i++) {
    const token = getAuthToken()
    if (token) {
      console.log(`[Dashboard] Token 已就绪 (第 ${i + 1} 次检查)`)
      return true
    }
    console.log(`[Dashboard] Token 未就绪，等待中... (第 ${i + 1}/${maxRetries} 次)`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  console.warn('[Dashboard] Token 等待超时')
  return false
}

// 组件挂载时初始化
onMounted(async () => {
  console.log('[Dashboard] 组件挂载，开始初始化...')
  
  // 等待 token 就绪（解决竞态条件）
  const tokenReady = await waitForToken()
  if (!tokenReady) {
    console.warn('[Dashboard] Token 未就绪，可能需要重新登录')
    // 跳转到登录页
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  console.log('[Dashboard] Token 已就绪，开始加载数据...')
  
  // 初始加载所有数据
  await refreshAllData()
  
  // 启动自动刷新
  startAutoRefresh()
})

// 组件卸载时清理
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="dashboard-container">
    <!-- 页面头部 -->
    <div class="dashboard-header">
      <div class="dashboard-header__left">
        <h2 class="dashboard-header__title">
          <el-icon><Monitor /></el-icon>
          数据看板
        </h2>
        <span v-if="lastRefreshTime" class="dashboard-header__time">
          上次刷新: {{ lastRefreshTime }}
        </span>
        <el-tag 
          :type="autoRefreshEnabled ? 'success' : 'info'" 
          size="small"
          class="dashboard-header__status"
          @click="toggleAutoRefresh"
          style="cursor: pointer;"
        >
          {{ autoRefreshEnabled ? '自动刷新中' : '自动刷新已关闭' }}
        </el-tag>
      </div>
      <el-button 
        type="primary" 
        :icon="Refresh" 
        :loading="statsLoading"
        @click="handleRefresh"
      >
        刷新数据
      </el-button>
    </div>

    <!-- 基础统计卡片 -->
    <DashboardStats :stats="stats" :loading="statsLoading" />

    <!-- 游戏数据统计卡片（需求 2.2.4） -->
    <div class="game-stats-section">
      <h3 class="section-title">
        <el-icon><Trophy /></el-icon>
        游戏数据统计
      </h3>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover" class="game-stat-card" v-loading="gameLoading">
            <div class="game-stat-card__content">
              <div class="game-stat-card__icon game-stat-card__icon--primary">
                <el-icon><User /></el-icon>
              </div>
              <div class="game-stat-card__info">
                <div class="game-stat-card__value">{{ gameStats.totalPlayers }}</div>
                <div class="game-stat-card__label">总玩家数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover" class="game-stat-card" v-loading="gameLoading">
            <div class="game-stat-card__content">
              <div class="game-stat-card__icon game-stat-card__icon--warning">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="game-stat-card__info">
                <div class="game-stat-card__value">{{ gameStats.averageScore.toFixed(0) }}</div>
                <div class="game-stat-card__label">平均分数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover" class="game-stat-card" v-loading="gameLoading">
            <div class="game-stat-card__content">
              <div class="game-stat-card__icon game-stat-card__icon--info">
                <el-icon><Trophy /></el-icon>
              </div>
              <div class="game-stat-card__info">
                <div class="game-stat-card__value">{{ gameStats.highestScore }}</div>
                <div class="game-stat-card__label">最高分数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover" class="game-stat-card" v-loading="gameLoading">
            <div class="game-stat-card__content">
              <div class="game-stat-card__icon game-stat-card__icon--success">
                <el-icon><User /></el-icon>
              </div>
              <div class="game-stat-card__info">
                <div class="game-stat-card__value">{{ gameStats.todayPlayers }}</div>
                <div class="game-stat-card__label">今日玩家</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-section">
      <!-- 访问趋势图 -->
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="chart-card__header">
              <span class="chart-card__title">访问趋势</span>
              <el-radio-group v-model="trendPeriod" size="small">
                <el-radio-button value="day">按日</el-radio-button>
                <el-radio-button value="week">按周</el-radio-button>
                <el-radio-button value="month">按月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <TrendChart :data="trendData" :loading="trendLoading" :period="trendPeriod" />
        </el-card>
      </el-col>

      <!-- 页面分布饼图 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <span class="chart-card__title">页面访问分布</span>
          </template>
          <PieChart :data="pageDistribution" :loading="pageLoading" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 来源分析和最近访问 -->
    <el-row :gutter="20" class="charts-section">
      <!-- 来源分析 -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <span class="chart-card__title">访客来源分析</span>
          </template>
          <div v-if="sourceAnalysis" class="source-analysis">
            <div class="source-analysis__section">
              <h4>设备类型</h4>
              <BarChart 
                :data="sourceAnalysis.devices || []" 
                :loading="sourceLoading"
                label-key="deviceType"
                value-key="count"
              />
            </div>
            <div class="source-analysis__section">
              <h4>浏览器分布</h4>
              <BarChart 
                :data="sourceAnalysis.browsers || []" 
                :loading="sourceLoading"
                label-key="browser"
                value-key="count"
              />
            </div>
          </div>
          <el-empty v-else description="暂无数据" />
        </el-card>
      </el-col>

      <!-- 最近访问记录 -->
      <el-col :xs="24" :lg="12">
        <RecentVisits 
          :data="recentVisits" 
          :loading="recentLoading"
          :limit="10"
          @retry="loadRecentVisits"
        />
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  padding: 20px;
  background-color: var(--bg-color-page);
  min-height: calc(100vh - 60px);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: var(--bg-color);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.dashboard-header__left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dashboard-header__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  
  .el-icon {
    font-size: 24px;
    color: var(--primary-color);
  }
}

.dashboard-header__time {
  font-size: 13px;
  color: var(--text-secondary);
}

.dashboard-header__status {
  margin-left: 8px;
}

// 游戏数据统计区域
.game-stats-section {
  margin-top: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  .el-icon {
    color: var(--warning-color);
  }
}

.game-stat-card {
  margin-bottom: 20px;
  
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.game-stat-card__content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.game-stat-card__icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .el-icon {
    font-size: 28px;
    color: var(--bg-color);
  }
  
  // 使用 CSS 变量定义渐变背景
  &--primary {
    background: var(--gradient-primary);
  }
  
  &--warning {
    background: var(--gradient-warning);
  }
  
  &--info {
    background: var(--gradient-info);
  }
  
  &--success {
    background: var(--gradient-success);
  }
}

.game-stat-card__info {
  flex: 1;
}

.game-stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.game-stat-card__label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

// 图表区域
.charts-section {
  margin-top: 20px;
}

.chart-card {
  margin-bottom: 20px;
  
  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color-lighter);
  }
  
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.chart-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

// 来源分析
.source-analysis {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.source-analysis__section {
  h4 {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-regular);
    margin: 0 0 12px 0;
  }
}

// 响应式调整
@media (max-width: 768px) {
  .dashboard-container {
    padding: 12px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .dashboard-header__left {
    flex-wrap: wrap;
  }
  
  .game-stat-card__value {
    font-size: 24px;
  }
  
  .game-stat-card__icon {
    width: 48px;
    height: 48px;
    
    .el-icon {
      font-size: 24px;
    }
  }
}
</style>
