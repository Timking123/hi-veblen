<script setup lang="ts">
/**
 * 数据看板统计卡片组合组件
 * 组合多个 StatCard 展示完整的统计数据
 * 
 * 需求: 2.1.1-2.1.4
 * - 2.1.1: 显示今日/本周/本月访问量（PV/UV）
 * - 2.1.2: 显示留言总数和未读留言数
 * - 2.1.3: 显示简历下载次数
 * - 2.1.4: 显示彩蛋游戏触发次数和通关次数
 */
import { computed } from 'vue'
import { 
  View, 
  User, 
  ChatDotRound, 
  Document, 
  Trophy 
} from '@element-plus/icons-vue'
import StatCard from './StatCard.vue'
import type { DashboardStats } from '@/types'

// 定义 Props
interface Props {
  /** 统计数据 */
  stats: DashboardStats | null
  /** 是否加载中 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// 计算 PV 卡片数据
const pvCardData = computed(() => {
  if (!props.stats) {
    return {
      value: 0,
      extraInfo: []
    }
  }
  return {
    value: props.stats.pv.today,
    extraInfo: [
      { label: '本周', value: props.stats.pv.week },
      { label: '本月', value: props.stats.pv.month }
    ]
  }
})

// 计算 UV 卡片数据
const uvCardData = computed(() => {
  if (!props.stats) {
    return {
      value: 0,
      extraInfo: []
    }
  }
  return {
    value: props.stats.uv.today,
    extraInfo: [
      { label: '本周', value: props.stats.uv.week },
      { label: '本月', value: props.stats.uv.month }
    ]
  }
})

// 计算留言卡片数据
const messageCardData = computed(() => {
  if (!props.stats) {
    return {
      value: 0,
      extraInfo: []
    }
  }
  return {
    value: props.stats.messages.total,
    extraInfo: [
      { label: '未读', value: props.stats.messages.unread }
    ]
  }
})

// 计算下载卡片数据
const downloadCardData = computed(() => {
  if (!props.stats) {
    return {
      value: 0
    }
  }
  return {
    value: props.stats.downloads
  }
})

// 计算游戏卡片数据
const gameCardData = computed(() => {
  if (!props.stats) {
    return {
      value: 0,
      extraInfo: []
    }
  }
  // 计算通关率
  const completionRate = props.stats.game.triggers > 0
    ? ((props.stats.game.completions / props.stats.game.triggers) * 100).toFixed(1)
    : '0'
  
  return {
    value: props.stats.game.triggers,
    extraInfo: [
      { label: '通关', value: props.stats.game.completions },
      { label: '通关率', value: `${completionRate}%` }
    ]
  }
})
</script>

<template>
  <el-row :gutter="20" class="dashboard-stats">
    <!-- PV 统计卡片 - 需求 2.1.1 -->
    <el-col :xs="24" :sm="12" :lg="8" :xl="4">
      <StatCard
        title="今日访问量 (PV)"
        :value="pvCardData.value"
        subtitle="页面浏览次数"
        :icon="View"
        icon-color="#409EFF"
        :extra-info="pvCardData.extraInfo"
        :loading="loading"
      />
    </el-col>

    <!-- UV 统计卡片 - 需求 2.1.1 -->
    <el-col :xs="24" :sm="12" :lg="8" :xl="4">
      <StatCard
        title="今日访客数 (UV)"
        :value="uvCardData.value"
        subtitle="独立访客数量"
        :icon="User"
        icon-color="#67C23A"
        :extra-info="uvCardData.extraInfo"
        :loading="loading"
      />
    </el-col>

    <!-- 留言统计卡片 - 需求 2.1.2 -->
    <el-col :xs="24" :sm="12" :lg="8" :xl="4">
      <StatCard
        title="留言总数"
        :value="messageCardData.value"
        subtitle="访客留言"
        :icon="ChatDotRound"
        icon-color="#E6A23C"
        :extra-info="messageCardData.extraInfo"
        :loading="loading"
      />
    </el-col>

    <!-- 下载统计卡片 - 需求 2.1.3 -->
    <el-col :xs="24" :sm="12" :lg="8" :xl="4">
      <StatCard
        title="简历下载"
        :value="downloadCardData.value"
        subtitle="简历下载次数"
        :icon="Document"
        icon-color="#909399"
        :loading="loading"
      />
    </el-col>

    <!-- 游戏统计卡片 - 需求 2.1.4 -->
    <el-col :xs="24" :sm="12" :lg="8" :xl="4">
      <StatCard
        title="游戏触发"
        :value="gameCardData.value"
        subtitle="彩蛋游戏数据"
        :icon="Trophy"
        icon-color="#F56C6C"
        :extra-info="gameCardData.extraInfo"
        :loading="loading"
      />
    </el-col>
  </el-row>
</template>

<style lang="scss" scoped>
.dashboard-stats {
  margin-bottom: 20px;

  .el-col {
    margin-bottom: 20px;
  }
}
</style>
