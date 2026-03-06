<script setup lang="ts">
/**
 * 页面访问分布饼图组件
 * 使用 ECharts 渲染，展示各页面的访问占比
 * 
 * 需求: 2.2.2 - 使用饼图展示页面访问分布
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { PageDistribution } from '@/types'

// 定义 Props
interface Props {
  /** 页面分布数据 */
  data: PageDistribution[]
  /** 是否加载中 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// 图表容器引用
const chartRef = ref<HTMLDivElement | null>(null)
// ECharts 实例
let chartInstance: echarts.ECharts | null = null

// 页面名称映射（将路径转换为友好名称）
const pageNameMap: Record<string, string> = {
  '/': '首页',
  '/home': '首页',
  '/about': '关于我',
  '/experience': '工作经历',
  '/education': '教育背景',
  '/skills': '技能专长',
  '/projects': '项目作品',
  '/contact': '联系方式',
  '/game': '彩蛋游戏'
}

// 获取页面友好名称
const getPageName = (page: string): string => {
  return pageNameMap[page] || page
}

// 颜色配置
const colorPalette = [
  '#409EFF', // 蓝色
  '#67C23A', // 绿色
  '#E6A23C', // 橙色
  '#F56C6C', // 红色
  '#909399', // 灰色
  '#9B59B6', // 紫色
  '#1ABC9C', // 青色
  '#3498DB', // 浅蓝
  '#E74C3C', // 深红
  '#2ECC71'  // 浅绿
]

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
  
  // 转换数据格式
  const chartData = props.data.map((item, index) => ({
    name: getPageName(item.page),
    value: item.count,
    itemStyle: {
      color: colorPalette[index % colorPalette.length]
    }
  }))
  
  // 计算总访问量
  const total = props.data.reduce((sum, item) => sum + item.count, 0)
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const percent = ((params.value / total) * 100).toFixed(1)
        return `${params.name}<br/>访问量: ${params.value}<br/>占比: ${percent}%`
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: '5%',
      top: 'center',
      itemWidth: 14,
      itemHeight: 14,
      textStyle: {
        fontSize: 12
      }
    },
    series: [
      {
        name: '页面访问',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            formatter: (params: any) => {
              const percent = ((params.value / total) * 100).toFixed(1)
              return `${params.name}\n${percent}%`
            }
          }
        },
        labelLine: {
          show: false
        },
        data: chartData
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
  <el-card class="pie-chart" shadow="hover">
    <template #header>
      <div class="pie-chart__header">
        <span class="pie-chart__title">页面访问分布</span>
      </div>
    </template>
    
    <div 
      ref="chartRef" 
      class="pie-chart__container"
      v-loading="loading"
    />
  </el-card>
</template>

<style lang="scss" scoped>
.pie-chart {
  height: 100%;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  &__container {
    width: 100%;
    height: 300px;
    min-height: 250px;
  }
}

// 响应式适配
@media (max-width: 768px) {
  .pie-chart {
    &__container {
      height: 280px;
    }
  }
}
</style>
