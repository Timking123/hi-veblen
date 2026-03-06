<script setup lang="ts">
/**
 * 访问趋势折线图组件
 * 使用 ECharts 渲染，支持按日/周/月切换
 * 
 * 需求: 2.2.1 - 使用折线图展示访问趋势（支持按日/周/月切换）
 */
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import type { VisitTrend } from '@/types'

// 定义 Props
interface Props {
  /** 趋势数据 */
  data: VisitTrend[]
  /** 当前时间周期 */
  period: 'day' | 'week' | 'month'
  /** 是否加载中 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// 定义 Emits
const emit = defineEmits<{
  (e: 'update:period', value: 'day' | 'week' | 'month'): void
}>()

// 图表容器引用
const chartRef = ref<HTMLDivElement | null>(null)
// ECharts 实例
let chartInstance: echarts.ECharts | null = null

// 时间周期选项
const periodOptions = [
  { label: '按日', value: 'day' as const },
  { label: '按周', value: 'week' as const },
  { label: '按月', value: 'month' as const }
]

// 当前选中的周期
const currentPeriod = computed({
  get: () => props.period,
  set: (value) => emit('update:period', value)
})

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  // 销毁旧实例
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  // 创建新实例
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

// 更新图表数据
const updateChart = () => {
  if (!chartInstance) return
  
  const xAxisData = props.data.map(item => item.date)
  const pvData = props.data.map(item => item.pv)
  const uvData = props.data.map(item => item.uv)
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    legend: {
      data: ['PV (页面浏览)', 'UV (独立访客)'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      axisLabel: {
        rotate: props.data.length > 15 ? 45 : 0,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: 'PV (页面浏览)',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        },
        data: pvData
      },
      {
        name: 'UV (独立访客)',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: '#67C23A'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
            { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
          ])
        },
        data: uvData
      }
    ]
  }
  
  chartInstance.setOption(option)
}

// 处理窗口大小变化
const handleResize = () => {
  chartInstance?.resize()
}

// 监听数据变化
watch(() => props.data, () => {
  updateChart()
}, { deep: true })

// 生命周期
onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <el-card class="trend-chart" shadow="hover">
    <template #header>
      <div class="trend-chart__header">
        <span class="trend-chart__title">访问趋势</span>
        <el-radio-group 
          v-model="currentPeriod" 
          size="small"
          class="trend-chart__period-selector"
        >
          <el-radio-button 
            v-for="option in periodOptions" 
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </el-radio-button>
        </el-radio-group>
      </div>
    </template>
    
    <div 
      ref="chartRef" 
      class="trend-chart__container"
      v-loading="loading"
    />
  </el-card>
</template>

<style lang="scss" scoped>
.trend-chart {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  &__period-selector {
    flex-shrink: 0;
  }

  &__container {
    width: 100%;
    height: 350px;
    min-height: 300px;
  }
}

// 响应式适配
@media (max-width: 768px) {
  .trend-chart {
    &__header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__container {
      height: 280px;
    }
  }
}
</style>
