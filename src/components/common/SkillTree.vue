<template>
  <div class="skill-tree-container">
    <div ref="chartRef" class="skill-tree-chart"></div>
  </div>
</template>

<script setup lang="ts">
/**
 * SkillTree 组件
 * 使用 ECharts 以径向树状图形式展示技能的层级关系
 * 
 * 功能：
 * - 径向布局展示技能层级
 * - 支持展开/折叠子节点
 * - 悬停显示技能详情（熟练度、使用年限等）
 * - 根据技能熟练度动态调整节点大小
 * 
 * 验证需求: 6.1, 6.2, 6.3, 6.4
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import type { SkillTreeNode, SkillTreeConfig } from '@/types/skillTree'
import { defaultSkillTreeConfig } from '@/types/skillTree'

// 组件属性接口
interface Props {
  /** 技能树数据 */
  data: SkillTreeNode
  /** 配置选项 */
  config?: Partial<SkillTreeConfig>
}

const props = withDefaults(defineProps<Props>(), {
  config: () => ({}),
})

// 合并配置
const mergedConfig = computed<SkillTreeConfig>(() => ({
  ...defaultSkillTreeConfig,
  ...props.config,
}))

// 图表引用
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

/**
 * 根据熟练度计算节点大小
 * 需求 6.4: 根据技能熟练度动态调整节点大小
 * @param level 熟练度等级 (0-100)
 * @returns 节点大小
 */
const calculateNodeSize = (level: number): number => {
  return mergedConfig.value.nodeSize(level)
}

/**
 * 转换技能树数据为 ECharts 格式
 * 递归处理节点，添加样式和大小信息
 */
const transformData = (node: SkillTreeNode): any => {
  const nodeSize = calculateNodeSize(node.level)
  
  const result: any = {
    name: node.name,
    value: node.level,
    // 存储原始数据用于 tooltip
    originalData: {
      id: node.id,
      name: node.name,
      level: node.level,
      experience: node.experience,
      childCount: node.children?.length || 0,
    },
    // 节点样式
    itemStyle: {
      color: getNodeColor(node.level),
      borderColor: getNodeBorderColor(node.level),
      borderWidth: 2,
    },
    // 节点大小
    symbolSize: nodeSize,
    // 标签样式
    label: {
      show: true,
      position: 'right',
      color: 'var(--text-primary, #ffffff)',
      fontSize: Math.max(10, nodeSize / 2.5),
      formatter: '{b}',
    },
  }
  
  // 递归处理子节点
  if (node.children && node.children.length > 0) {
    result.children = node.children.map(transformData)
  }
  
  return result
}

/**
 * 根据熟练度获取节点颜色
 * 熟练度越高，颜色越亮
 */
const getNodeColor = (level: number): string => {
  // 使用渐变色：从紫色到青色
  const ratio = level / 100
  const r = Math.round(123 - ratio * 123)
  const g = Math.round(97 + ratio * 120)
  const b = Math.round(255 - ratio * 0)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * 根据熟练度获取节点边框颜色
 */
const getNodeBorderColor = (level: number): string => {
  if (level >= 90) return '#00d9ff'
  if (level >= 80) return '#00b8d9'
  if (level >= 70) return '#7b61ff'
  if (level >= 60) return '#9b81ff'
  return 'rgba(255, 255, 255, 0.3)'
}

/**
 * 初始化图表
 * 需求 6.1: 以径向树状图形式展示技能的层级关系
 * 需求 6.2: 支持展开和折叠子节点
 * 需求 6.3: 悬停显示技能详情
 */
const initChart = () => {
  if (!chartRef.value) return
  
  // 销毁旧实例
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  // 创建新实例
  chartInstance = echarts.init(chartRef.value)
  
  // 转换数据
  const treeData = transformData(props.data)
  
  // 配置选项
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    // 需求 6.3: 悬停显示技能详情
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: 'rgba(21, 25, 50, 0.95)',
      borderColor: 'rgba(0, 217, 255, 0.3)',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: {
        color: '#ffffff',
        fontSize: 13,
      },
      formatter: (params: any) => {
        const data = params.data?.originalData
        if (!data) return params.name
        
        let html = `<div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #00d9ff;">${data.name}</div>`
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">`
        html += `<span style="color: #a0aec0;">熟练度:</span>`
        html += `<span style="color: #ffffff; font-weight: 500;">${data.level}%</span>`
        html += `</div>`
        
        if (data.experience) {
          html += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">`
          html += `<span style="color: #a0aec0;">使用年限:</span>`
          html += `<span style="color: #ffffff; font-weight: 500;">${data.experience}</span>`
          html += `</div>`
        }
        
        if (data.childCount > 0) {
          html += `<div style="display: flex; justify-content: space-between;">`
          html += `<span style="color: #a0aec0;">子技能:</span>`
          html += `<span style="color: #ffffff; font-weight: 500;">${data.childCount} 项</span>`
          html += `</div>`
        }
        
        // 添加熟练度进度条
        html += `<div style="margin-top: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; height: 6px; overflow: hidden;">`
        html += `<div style="width: ${data.level}%; height: 100%; background: linear-gradient(90deg, #7b61ff, #00d9ff); border-radius: 4px;"></div>`
        html += `</div>`
        
        return html
      },
    },
    series: [
      {
        type: 'tree',
        data: [treeData],
        // 需求 6.1: 径向布局
        layout: 'radial',
        // 节点符号
        symbol: 'circle',
        // 初始展开层级
        initialTreeDepth: mergedConfig.value.expandLevel,
        // 需求 6.2: 支持展开和折叠子节点
        expandAndCollapse: true,
        // 动画持续时间
        animationDuration: 550,
        animationDurationUpdate: 750,
        // 标签配置
        label: {
          position: 'right',
          verticalAlign: 'middle',
          align: 'left',
          fontSize: 12,
          color: 'var(--text-primary, #ffffff)',
          distance: 8,
        },
        // 叶子节点标签
        leaves: {
          label: {
            position: 'right',
            verticalAlign: 'middle',
            align: 'left',
            fontSize: 11,
            color: 'var(--text-secondary, #a0aec0)',
          },
        },
        // 连接线样式
        lineStyle: {
          color: 'rgba(0, 217, 255, 0.3)',
          width: 1.5,
          curveness: 0.5,
        },
        // 强调样式
        emphasis: {
          focus: 'descendant',
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 217, 255, 0.5)',
          },
          lineStyle: {
            color: '#00d9ff',
            width: 2,
          },
        },
        // 布局参数
        roam: true, // 允许缩放和平移
        center: ['50%', '50%'],
        // 径向布局的半径范围
        // 根据容器大小自适应
      },
    ],
  }
  
  chartInstance.setOption(option)
  
  // 需求 6.2: 点击节点展开/折叠
  chartInstance.on('click', (params: any) => {
    // ECharts 树图默认支持点击展开/折叠
    // 这里可以添加额外的点击处理逻辑
    if (params.data?.children && params.data.children.length > 0) {
      // 节点有子节点，ECharts 会自动处理展开/折叠
    }
  })
}

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  chartInstance?.resize()
}

// 生命周期钩子
onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

// 监听数据变化
watch(
  () => [props.data, props.config],
  () => {
    initChart()
  },
  { deep: true }
)

/**
 * 暴露方法供外部调用
 */
defineExpose({
  /** 刷新图表 */
  refresh: initChart,
  /** 调整大小 */
  resize: handleResize,
  /** 获取图表实例 */
  getChartInstance: () => chartInstance,
})
</script>

<style scoped>
.skill-tree-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.skill-tree-chart {
  width: 100%;
  height: 600px;
  min-height: 500px;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .skill-tree-chart {
    height: 550px;
  }
}

@media (max-width: 768px) {
  .skill-tree-container {
    min-height: 400px;
  }
  
  .skill-tree-chart {
    height: 450px;
    min-height: 400px;
  }
}

@media (max-width: 480px) {
  .skill-tree-container {
    min-height: 350px;
  }
  
  .skill-tree-chart {
    height: 400px;
    min-height: 350px;
  }
}
</style>
