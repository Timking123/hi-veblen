<script setup lang="ts">
/**
 * 配置差异显示组件
 * 显示当前配置与默认值的差异
 * 
 * 需求: 6.6.3 - 在修改参数时显示与默认值的差异
 */
import { computed } from 'vue'
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElTag,
  ElEmpty
} from 'element-plus'
import type { GameConfig, ConfigDiffItem } from '@/api/game'

// Props
const props = defineProps<{
  currentConfig: GameConfig
  defaultConfig: GameConfig
}>()

/**
 * 比较两个配置，返回差异列表
 */
function getConfigDiff(
  current: GameConfig,
  defaultConfig: GameConfig
): ConfigDiffItem[] {
  const diffs: ConfigDiffItem[] = []

  function compare(currentObj: unknown, defaultObj: unknown, path: string): void {
    // 处理数组
    if (Array.isArray(currentObj) && Array.isArray(defaultObj)) {
      if (JSON.stringify(currentObj) !== JSON.stringify(defaultObj)) {
        diffs.push({ path, currentValue: currentObj, defaultValue: defaultObj })
      }
      return
    }

    // 处理对象
    if (
      currentObj !== null &&
      typeof currentObj === 'object' &&
      defaultObj !== null &&
      typeof defaultObj === 'object'
    ) {
      const currentKeys = Object.keys(currentObj as object)
      const defaultKeys = Object.keys(defaultObj as object)
      const allKeys = new Set([...currentKeys, ...defaultKeys])

      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key
        compare(
          (currentObj as Record<string, unknown>)[key],
          (defaultObj as Record<string, unknown>)[key],
          newPath
        )
      }
      return
    }

    // 处理基本类型
    if (currentObj !== defaultObj) {
      diffs.push({ path, currentValue: currentObj, defaultValue: defaultObj })
    }
  }

  compare(current, defaultConfig, '')

  return diffs
}

// 计算差异列表
const diffList = computed(() => {
  return getConfigDiff(props.currentConfig, props.defaultConfig)
})

// 是否有差异
const hasDiff = computed(() => diffList.value.length > 0)

/**
 * 格式化路径为可读名称
 */
function formatPath(path: string): string {
  const pathMap: Record<string, string> = {
    'basic.playerInitialHealth': '玩家初始生命值',
    'basic.playerInitialSpeed': '玩家初始速度',
    'basic.nukeMaxProgress': '核弹进度条最大值',
    'basic.enemySpawnRate': '敌人生成速率',
    'basic.stageTotalEnemies': '关卡敌人总数',
    'advanced.scene.canvasWidth': '画布宽度',
    'advanced.scene.canvasHeight': '画布高度',
    'advanced.scene.scaleMultiplier': '缩放倍率',
    'advanced.scene.pixelBlockSize': '像素块大小',
    'advanced.player.moveDistance': '玩家移动距离',
    'advanced.player.moveInterval': '玩家移动间隔',
    'advanced.player.collisionWidth': '玩家碰撞宽度',
    'advanced.player.collisionHeight': '玩家碰撞高度',
    'advanced.movement.enemyMoveInterval': '敌人移动间隔',
    'advanced.movement.enemyDownInterval': '敌人下降间隔',
    'advanced.movement.pickupMoveSpeed': '掉落物移动速度',
    'advanced.shooting.playerGunCooldown': '玩家机炮冷却',
    'advanced.shooting.enemyGunCooldown': '敌人机炮冷却',
    'advanced.shooting.bulletSpeed': '子弹速度',
    'advanced.shooting.bulletMoveInterval': '子弹移动间隔',
    'advanced.shooting.missileSpeed': '导弹速度',
    'advanced.shooting.missileMoveInterval': '导弹移动间隔',
    'advanced.effects.explosionDuration': '爆炸持续时间',
    'advanced.effects.explosionFrames': '爆炸动画帧数',
    'advanced.effects.screenShakeDuration': '屏幕震动时间',
    'advanced.effects.screenShakeIntensityMin': '震动最小强度',
    'advanced.effects.screenShakeIntensityMax': '震动最大强度',
    'advanced.audio.musicVolume': '背景音乐音量',
    'advanced.audio.effectVolume': '音效音量',
    'advanced.audio.maxConcurrentSounds': '最大同时音效数',
    'advanced.audio.audioPoolSize': '音频对象池大小',
    'advanced.performance.targetFPS': '目标帧率',
    'advanced.performance.maxMemoryMB': '最大内存',
    'advanced.performance.memoryCheckInterval': '内存检查间隔',
    'advanced.performance.cacheCleanupThreshold': '缓存清理阈值',
    'advanced.enemies.eliteMultiplier': '精英怪倍率',
    'advanced.enemies.bossMultiplier': 'Boss 倍率',
    'advanced.enemies.finalBossMultiplier': '最终 Boss 倍率',
    'advanced.enemies.eliteSizeMultiplier': '精英怪体积倍率',
    'advanced.enemies.bossSizeMultiplier': 'Boss 体积倍率',
    'advanced.enemies.finalBossSizeMultiplier': '最终 Boss 体积倍率'
  }
  
  return pathMap[path] || path
}

/**
 * 格式化值显示
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * 获取分类
 */
function getCategory(path: string): string {
  if (path.startsWith('basic.')) return '基础参数'
  if (path.startsWith('advanced.scene.')) return '场景配置'
  if (path.startsWith('advanced.player.')) return '玩家配置'
  if (path.startsWith('advanced.movement.')) return '移动配置'
  if (path.startsWith('advanced.shooting.')) return '射击配置'
  if (path.startsWith('advanced.effects.')) return '效果配置'
  if (path.startsWith('advanced.audio.')) return '音频配置'
  if (path.startsWith('advanced.performance.')) return '性能配置'
  if (path.startsWith('advanced.enemies.')) return '敌人配置'
  if (path.startsWith('advanced.stages')) return '关卡配置'
  return '其他'
}
</script>

<template>
  <div class="config-diff">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">配置差异</span>
          <el-tag v-if="hasDiff" type="warning" size="small">
            {{ diffList.length }} 项修改
          </el-tag>
          <el-tag v-else type="success" size="small">
            无修改
          </el-tag>
        </div>
      </template>
      
      <el-table
        v-if="hasDiff"
        :data="diffList"
        size="small"
        stripe
        max-height="400"
      >
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ getCategory(row.path) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="参数" min-width="150">
          <template #default="{ row }">
            <span class="param-name">{{ formatPath(row.path) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="当前值" width="150">
          <template #default="{ row }">
            <span class="current-value">{{ formatValue(row.currentValue) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="默认值" width="150">
          <template #default="{ row }">
            <span class="default-value">{{ formatValue(row.defaultValue) }}</span>
          </template>
        </el-table-column>
      </el-table>
      
      <el-empty v-else description="当前配置与默认值相同" :image-size="80" />
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.config-diff {
  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }
  }
  
  .param-name {
    font-weight: 500;
    color: #303133;
  }
  
  .current-value {
    color: #E6A23C;
    font-family: monospace;
    font-size: 12px;
  }
  
  .default-value {
    color: #909399;
    font-family: monospace;
    font-size: 12px;
  }
}
</style>
