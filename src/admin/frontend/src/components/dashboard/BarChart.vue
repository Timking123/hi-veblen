<script setup lang="ts">
/**
 * 柱状图组件
 * 使用 ECharts 渲染，支持自定义数据格式
 * 
 * 需求: 2.2.3 - 使用柱状图展示访客来源分析（设备类型、浏览器）
 */
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'

// 定义 Props
interface Props {
  /** 图表数据数组 */
  data: Array<Record<string, any>>
  /** 标签字段名 */
  labelKey?: string
  /** 数值字段名 */
  valueKey?: string
  /** 是否加载中 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'name',
  valueKey: 'count',
  loading: false
})

// 图表容器引用
const chartRef = ref<HTMLDivElement | null>(null)
// ECharts 实例
let chartInstance: echarts.ECharts | null = null

// 颜色配置
const colorPalette = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#00D4AA']

// 处理后的数据
const chartData = computed(() => {
  return props.data.map(item => ({
    name: String(item[props.labelKey] || ''),
    value: Number(item[props.valueKey] || 0)
  }))
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
  
  const data = chartData.value
  
  // 计算总数
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const item = params[0]
        const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
        return `${item.name}<br/>数量: ${item.value}<br/>占比: ${percent}%`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLabel: {
        interval: 0,
        rotate: data.length > 5 ? 30 : 0,
        fontSize: 11
      },
      axisTick: {
        alignWithLabel: true
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: '数量',
        type: 'bar',
        barWidth: '50%',
        data: data.map((item, index) => ({
          value: item.value,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: colorPalette[index % colorPalette.length] },
              { offset: 1, color: echarts.color.modifyHSL(colorPalette[index % colorPalette.length], undefined, undefined, 0.7) }
            ]),
            borderRadius: [4, 4, 0, 0]
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const percent = total > 0 ? ((params.value / total) * 100).toFixed(0) : '0'
            return `${percent}%`
          },
          fontSize: 11,
          color: '#606266'
        }
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
  <div 
    ref="chartRef" 
    class="bar-chart__container"
    v-loading="loading"
  />
</template>

<style lang="scss" scoped>
.bar-chart__container {
  width: 100%;
  height: 150px;
  min-height: 120px;
}
</style>
