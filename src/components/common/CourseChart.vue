<template>
  <div class="course-chart-container">
    <div ref="chartRef" class="course-chart"></div>
    <div v-if="hoveredCourse" class="course-tooltip" :style="tooltipStyle">
      <h4>{{ hoveredCourse.name }}</h4>
      <p class="score">成绩: {{ hoveredCourse.score }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { Course } from '@/types'

interface Props {
  courses: Course[]
  type?: 'bar' | 'radar'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'bar',
})

const chartRef = ref<HTMLElement | null>(null)
const hoveredCourse = ref<Course | null>(null)
const tooltipStyle = ref({})
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  if (props.type === 'bar') {
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: props.courses.map((c) => c.name),
        axisLabel: {
          color: '#a0aec0',
          fontSize: 11,
          interval: 0,
          rotate: 45,
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          color: '#a0aec0',
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
      series: [
        {
          data: props.courses.map((c) => c.score),
          type: 'bar',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#00d9ff' },
              { offset: 1, color: '#7b61ff' },
            ]),
            borderRadius: [8, 8, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#00f0ff' },
                { offset: 1, color: '#9b81ff' },
              ]),
              shadowBlur: 20,
              shadowColor: 'rgba(0, 217, 255, 0.5)',
            },
          },
          animationDelay: (idx: number) => idx * 50,
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        backgroundColor: 'rgba(21, 25, 50, 0.95)',
        borderColor: 'rgba(0, 217, 255, 0.3)',
        textStyle: {
          color: '#ffffff',
        },
        formatter: (params: any) => {
          const data = params[0]
          return `${data.name}<br/>成绩: ${data.value}`
        },
      },
    }
    chartInstance.setOption(option)
  } else if (props.type === 'radar') {
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      radar: {
        indicator: props.courses.map((c) => ({
          name: c.name,
          max: 100,
        })),
        shape: 'polygon',
        splitNumber: 5,
        axisName: {
          color: '#a0aec0',
          fontSize: 12,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(160, 174, 192, 0.2)',
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: [
              'rgba(0, 217, 255, 0.05)',
              'rgba(123, 97, 255, 0.05)',
              'rgba(0, 217, 255, 0.03)',
              'rgba(123, 97, 255, 0.03)',
              'rgba(0, 217, 255, 0.01)',
            ],
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(160, 174, 192, 0.2)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: props.courses.map((c) => c.score),
              name: '课程成绩',
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                  { offset: 0, color: 'rgba(0, 217, 255, 0.3)' },
                  { offset: 1, color: 'rgba(123, 97, 255, 0.1)' },
                ]),
              },
              lineStyle: {
                color: '#00d9ff',
                width: 2,
              },
              itemStyle: {
                color: '#00d9ff',
                borderColor: '#fff',
                borderWidth: 2,
              },
            },
          ],
          animationDelay: 100,
        },
      ],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(21, 25, 50, 0.95)',
        borderColor: 'rgba(0, 217, 255, 0.3)',
        textStyle: {
          color: '#ffffff',
        },
      },
    }
    chartInstance.setOption(option)
  }

  // Handle mouse events for custom tooltip
  chartInstance.on('mouseover', (params: any) => {
    if (params.componentType === 'series') {
      const index = params.dataIndex
      hoveredCourse.value = props.courses[index]
    }
  })

  chartInstance.on('mouseout', () => {
    hoveredCourse.value = null
  })
}

const handleResize = () => {
  chartInstance?.resize()
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

watch(
  () => props.courses,
  () => {
    initChart()
  },
  { deep: true }
)

watch(
  () => props.type,
  () => {
    initChart()
  }
)
</script>

<style scoped>
.course-chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.course-chart {
  width: 100%;
  height: 400px;
  min-height: 400px;
}

.course-tooltip {
  position: absolute;
  background: rgba(21, 25, 50, 0.95);
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 8px;
  padding: 1rem;
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.course-tooltip h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary, #ffffff);
  font-size: 1rem;
}

.course-tooltip .score {
  margin: 0;
  color: var(--primary, #00d9ff);
  font-weight: 600;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .course-chart {
    height: 350px;
    min-height: 350px;
  }
}
</style>
