<template>
  <div class="skill-chart-container">
    <div ref="chartRef" class="skill-chart"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { Skill } from '@/types'

interface Props {
  skills: Skill[]
  type?: 'bar' | 'radar'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'bar',
})

const chartRef = ref<HTMLElement | null>(null)
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
        data: props.skills.map((s) => s.name),
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
          data: props.skills.map((s) => s.level),
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
          return `${data.name}<br/>熟练度: ${data.value}%`
        },
      },
    }
    chartInstance.setOption(option)
  } else if (props.type === 'radar') {
    // 雷达图配置 - 需求 6.5: 数据加载时播放绘制动画
    // 需求 6.6: 支持悬停显示具体数值
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      // 全局动画配置 - 数据加载绘制动画
      animation: true,
      animationDuration: 1500,
      animationEasing: 'elasticOut',
      animationDurationUpdate: 800,
      animationEasingUpdate: 'cubicInOut',
      radar: {
        indicator: props.skills.map((s) => ({
          name: s.name,
          max: 100,
        })),
        shape: 'polygon',
        splitNumber: 5,
        center: ['50%', '50%'],
        radius: '70%',
        axisName: {
          color: '#a0aec0',
          fontSize: 12,
          fontWeight: 'normal',
          // 悬停时轴名称样式增强
          rich: {
            hover: {
              color: '#00d9ff',
              fontWeight: 'bold',
            },
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)',
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
            color: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          // 符号（数据点）配置
          symbol: 'circle',
          symbolSize: 8,
          data: [
            {
              value: props.skills.map((s) => s.level),
              name: '技能熟练度',
              // 区域填充样式
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                  { offset: 0, color: 'rgba(0, 217, 255, 0.4)' },
                  { offset: 1, color: 'rgba(123, 97, 255, 0.15)' },
                ]),
              },
              // 线条样式
              lineStyle: {
                color: '#00d9ff',
                width: 2,
                shadowColor: 'rgba(0, 217, 255, 0.5)',
                shadowBlur: 10,
              },
              // 数据点样式
              itemStyle: {
                color: '#00d9ff',
                borderColor: '#fff',
                borderWidth: 2,
                shadowColor: 'rgba(0, 217, 255, 0.8)',
                shadowBlur: 8,
              },
              // 悬停高亮效果
              emphasis: {
                // 悬停时区域样式
                areaStyle: {
                  color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                    { offset: 0, color: 'rgba(0, 217, 255, 0.6)' },
                    { offset: 1, color: 'rgba(123, 97, 255, 0.3)' },
                  ]),
                },
                // 悬停时线条样式
                lineStyle: {
                  color: '#00f0ff',
                  width: 3,
                  shadowColor: 'rgba(0, 240, 255, 0.8)',
                  shadowBlur: 15,
                },
                // 悬停时数据点样式 - 放大效果
                itemStyle: {
                  color: '#00f0ff',
                  borderColor: '#fff',
                  borderWidth: 3,
                  shadowColor: 'rgba(0, 240, 255, 1)',
                  shadowBlur: 15,
                },
              },
            },
          ],
          // 系列动画配置 - 绘制动画
          animationDelay: 200,
          animationDuration: 1500,
          animationEasing: 'elasticOut',
        },
      ],
      // 悬停提示框配置 - 显示具体数值
      tooltip: {
        show: true,
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(21, 25, 50, 0.95)',
        borderColor: 'rgba(0, 217, 255, 0.5)',
        borderWidth: 1,
        borderRadius: 8,
        padding: [12, 16],
        textStyle: {
          color: '#ffffff',
          fontSize: 14,
        },
        // 自定义格式化函数 - 显示所有技能的具体数值
        formatter: (params: any) => {
          if (!params.value || !Array.isArray(params.value)) {
            return ''
          }
          
          let result = `<div style="font-weight: bold; margin-bottom: 8px; color: #00d9ff; font-size: 15px;">📊 ${params.name}</div>`
          result += '<div style="display: grid; gap: 6px;">'
          
          props.skills.forEach((skill, index) => {
            const value = params.value[index]
            const percentage = value || 0
            
            // 根据熟练度显示不同颜色
            let levelColor = '#4ade80' // 绿色 - 高级
            if (percentage < 60) {
              levelColor = '#fbbf24' // 黄色 - 中级
            }
            if (percentage < 40) {
              levelColor = '#f87171' // 红色 - 初级
            }
            
            // 进度条样式
            result += `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="min-width: 70px; color: #a0aec0;">${skill.name}</span>
                <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                  <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #00d9ff, ${levelColor}); border-radius: 3px; transition: width 0.3s;"></div>
                </div>
                <span style="min-width: 45px; text-align: right; color: ${levelColor}; font-weight: bold;">${percentage}%</span>
              </div>
            `
          })
          
          result += '</div>'
          return result
        },
        // 提示框位置跟随鼠标
        position: function (point, _params, _dom, _rect, size) {
          // 确保提示框不超出图表区域
          const x = (point as number[])[0] + 10
          const y = (point as number[])[1] - (size as { contentSize: number[] }).contentSize[1] / 2
          return [x, y]
        },
      },
    }
    chartInstance.setOption(option)
  }
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
  () => [props.skills, props.type],
  () => {
    initChart()
  },
  { deep: true }
)
</script>

<style scoped>
.skill-chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.skill-chart {
  width: 100%;
  height: 400px;
  min-height: 400px;
}

@media (max-width: 768px) {
  .skill-chart {
    height: 350px;
    min-height: 350px;
  }
}
</style>
