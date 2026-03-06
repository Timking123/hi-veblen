<script setup lang="ts">
/**
 * 高级配置面板组件
 * 显示和编辑游戏高级参数：场景、玩家、移动、射击、效果、音频、性能、敌人、关卡配置
 * 
 * 需求: 6.5.1 - 提供"显示高级参数"开关，默认隐藏
 * 需求: 6.5.2 - 玩家完整参数配置
 * 需求: 6.6.1 - 详细参数配置
 */
import { ref, computed } from 'vue'
import {
  ElFormItem,
  ElInputNumber,
  ElRow,
  ElCol,
  ElCollapse,
  ElCollapseItem,
  ElSlider,
  ElTable,
  ElTableColumn,
  ElTag
} from 'element-plus'
import type { AdvancedConfig } from '@/api/game'

// Props
const props = defineProps<{
  modelValue: AdvancedConfig
  defaultConfig: AdvancedConfig
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: AdvancedConfig): void
}>()

// 展开的面板
const activeNames = ref(['scene', 'player'])

// 敌人类型名称映射
const enemyTypeNames: Record<string, string> = {
  white: '白色敌人',
  green: '绿色敌人',
  blue: '蓝色敌人',
  purple: '紫色敌人',
  yellow: '黄色敌人',
  orange: '橙色敌人',
  red: '红色敌人'
}

/**
 * 防御性获取敌人类型数据
 * 确保在 modelValue.enemies.types 为 undefined 时返回空数组
 */
const enemyTypesEntries = computed(() => {
  return props.modelValue?.enemies?.types 
    ? Object.entries(props.modelValue.enemies.types) 
    : []
})

/**
 * 防御性获取关卡数据
 */
const stagesData = computed(() => {
  return props.modelValue?.stages ?? []
})

/**
 * 安全获取音频配置值
 */
const safeAudioMusicVolume = computed(() => props.modelValue?.audio?.musicVolume ?? 0.5)
const safeAudioEffectVolume = computed(() => props.modelValue?.audio?.effectVolume ?? 0.5)

/**
 * 安全获取性能配置值
 */
const safeCacheCleanupThreshold = computed(() => props.modelValue?.performance?.cacheCleanupThreshold ?? 0.8)
</script>

<template>
  <div class="advanced-config-panel">
    <el-collapse v-model="activeNames">
      <!-- 场景配置 -->
      <el-collapse-item title="场景配置" name="scene">
        <template #title>
          <span class="collapse-title">场景配置</span>
          <span class="collapse-desc">画布尺寸、缩放倍率、像素块大小</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="画布宽度">
              <el-input-number
                :model-value="modelValue.scene.canvasWidth"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, scene: { ...modelValue.scene, canvasWidth: v as number } })"
                :min="400" :max="1920" :step="100"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="画布高度">
              <el-input-number
                :model-value="modelValue.scene.canvasHeight"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, scene: { ...modelValue.scene, canvasHeight: v as number } })"
                :min="300" :max="1080" :step="100"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="缩放倍率">
              <el-input-number
                :model-value="modelValue.scene.scaleMultiplier"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, scene: { ...modelValue.scene, scaleMultiplier: v as number } })"
                :min="0.5" :max="3" :step="0.1" :precision="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="像素块大小">
              <el-input-number
                :model-value="modelValue.scene.pixelBlockSize"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, scene: { ...modelValue.scene, pixelBlockSize: v as number } })"
                :min="4" :max="16" :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-collapse-item>

      <!-- 玩家配置 -->
      <el-collapse-item title="玩家配置" name="player">
        <template #title>
          <span class="collapse-title">玩家配置</span>
          <span class="collapse-desc">移动、碰撞、机炮、导弹参数</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="移动距离（像素块）">
              <el-input-number
                :model-value="modelValue.player.moveDistance"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, moveDistance: v as number } })"
                :min="1" :max="32" :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="移动间隔（毫秒）">
              <el-input-number
                :model-value="modelValue.player.moveInterval"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, moveInterval: v as number } })"
                :min="50" :max="500" :step="10"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="碰撞宽度">
              <el-input-number
                :model-value="modelValue.player.collisionWidth"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, collisionWidth: v as number } })"
                :min="32" :max="256" :step="8"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="碰撞高度">
              <el-input-number
                :model-value="modelValue.player.collisionHeight"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, collisionHeight: v as number } })"
                :min="32" :max="256" :step="8"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 机炮配置 -->
        <div class="sub-section">
          <h4>初始机炮配置</h4>
          <el-row :gutter="16">
            <el-col :span="4">
              <el-form-item label="每次发射子弹数">
                <el-input-number
                  :model-value="modelValue.player.initialMachineGun.bulletsPerShot"
                  @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, initialMachineGun: { ...modelValue.player.initialMachineGun, bulletsPerShot: v as number } } })"
                  :min="1" :max="10" :step="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="弹道数">
                <el-input-number
                  :model-value="modelValue.player.initialMachineGun.trajectories"
                  @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, initialMachineGun: { ...modelValue.player.initialMachineGun, trajectories: v as number } } })"
                  :min="1" :max="5" :step="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="射速（毫秒）">
                <el-input-number
                  :model-value="modelValue.player.initialMachineGun.fireRate"
                  @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, initialMachineGun: { ...modelValue.player.initialMachineGun, fireRate: v as number } } })"
                  :min="100" :max="5000" :step="100"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="子弹伤害">
                <el-input-number
                  :model-value="modelValue.player.initialMachineGun.bulletDamage"
                  @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, initialMachineGun: { ...modelValue.player.initialMachineGun, bulletDamage: v as number } } })"
                  :min="1" :max="50" :step="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="子弹速度">
                <el-input-number
                  :model-value="modelValue.player.initialMachineGun.bulletSpeed"
                  @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, initialMachineGun: { ...modelValue.player.initialMachineGun, bulletSpeed: v as number } } })"
                  :min="5" :max="50" :step="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        
        <!-- 导弹配置 -->
        <div class="sub-section">
          <h4>初始导弹配置</h4>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="导弹数量">
                <el-input-number
                  :model-value="modelValue.player.initialMissileLauncher.missileCount"
                  @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, initialMissileLauncher: { ...modelValue.player.initialMissileLauncher, missileCount: v as number } } })"
                  :min="1" :max="50" :step="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="导弹伤害">
                <el-input-number
                  :model-value="modelValue.player.initialMissileLauncher.missileDamage"
                  @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, initialMissileLauncher: { ...modelValue.player.initialMissileLauncher, missileDamage: v as number } } })"
                  :min="1" :max="100" :step="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="导弹速度">
                <el-input-number
                  :model-value="modelValue.player.initialMissileLauncher.missileSpeed"
                  @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, initialMissileLauncher: { ...modelValue.player.initialMissileLauncher, missileSpeed: v as number } } })"
                  :min="5" :max="30" :step="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="爆炸半径">
                <el-input-number
                  :model-value="modelValue.player.initialMissileLauncher.explosionRadius"
                  @update:model-value="(v) => emit('update:modelValue', { ...modelValue, player: { ...modelValue.player, initialMissileLauncher: { ...modelValue.player.initialMissileLauncher, explosionRadius: v as number } } })"
                  :min="1" :max="10" :step="1"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-collapse-item>

      <!-- 移动配置 -->
      <el-collapse-item title="移动配置" name="movement">
        <template #title>
          <span class="collapse-title">移动配置</span>
          <span class="collapse-desc">敌人移动、掉落物速度</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="敌人移动间隔（毫秒）">
              <el-input-number
                :model-value="modelValue.movement.enemyMoveInterval"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, movement: { ...modelValue.movement, enemyMoveInterval: v as number } })"
                :min="100" :max="2000" :step="50"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="敌人下降间隔（毫秒）">
              <el-input-number
                :model-value="modelValue.movement.enemyDownInterval"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, movement: { ...modelValue.movement, enemyDownInterval: v as number } })"
                :min="100" :max="2000" :step="50"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="掉落物移动速度">
              <el-input-number
                :model-value="modelValue.movement.pickupMoveSpeed"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, movement: { ...modelValue.movement, pickupMoveSpeed: v as number } })"
                :min="1" :max="10" :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-collapse-item>
      
      <!-- 射击配置 -->
      <el-collapse-item title="射击配置" name="shooting">
        <template #title>
          <span class="collapse-title">射击配置</span>
          <span class="collapse-desc">冷却时间、子弹/导弹速度</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="玩家机炮冷却（毫秒）">
              <el-input-number
                :model-value="modelValue.shooting.playerGunCooldown"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, shooting: { ...modelValue.shooting, playerGunCooldown: v as number } })"
                :min="50" :max="1000" :step="50"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="敌人机炮冷却（毫秒）">
              <el-input-number
                :model-value="modelValue.shooting.enemyGunCooldown"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, shooting: { ...modelValue.shooting, enemyGunCooldown: v as number } })"
                :min="200" :max="5000" :step="100"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="子弹速度">
              <el-input-number
                :model-value="modelValue.shooting.bulletSpeed"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, shooting: { ...modelValue.shooting, bulletSpeed: v as number } })"
                :min="0.01" :max="0.5" :step="0.01" :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="子弹移动间隔（毫秒）">
              <el-input-number
                :model-value="modelValue.shooting.bulletMoveInterval"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, shooting: { ...modelValue.shooting, bulletMoveInterval: v as number } })"
                :min="10" :max="200" :step="10"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="导弹速度">
              <el-input-number
                :model-value="modelValue.shooting.missileSpeed"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, shooting: { ...modelValue.shooting, missileSpeed: v as number } })"
                :min="0.01" :max="0.5" :step="0.01" :precision="3"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="导弹移动间隔（毫秒）">
              <el-input-number
                :model-value="modelValue.shooting.missileMoveInterval"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, shooting: { ...modelValue.shooting, missileMoveInterval: v as number } })"
                :min="10" :max="200" :step="10"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-collapse-item>

      <!-- 效果配置 -->
      <el-collapse-item title="效果配置" name="effects">
        <template #title>
          <span class="collapse-title">效果配置</span>
          <span class="collapse-desc">爆炸、屏幕震动效果</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="爆炸持续时间（毫秒）">
              <el-input-number
                :model-value="modelValue.effects.explosionDuration"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, effects: { ...modelValue.effects, explosionDuration: v as number } })"
                :min="100" :max="2000" :step="50"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="爆炸动画帧数">
              <el-input-number
                :model-value="modelValue.effects.explosionFrames"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, effects: { ...modelValue.effects, explosionFrames: v as number } })"
                :min="4" :max="16" :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="屏幕震动时间（毫秒）">
              <el-input-number
                :model-value="modelValue.effects.screenShakeDuration"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, effects: { ...modelValue.effects, screenShakeDuration: v as number } })"
                :min="50" :max="1000" :step="50"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="震动最小强度（像素）">
              <el-input-number
                :model-value="modelValue.effects.screenShakeIntensityMin"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, effects: { ...modelValue.effects, screenShakeIntensityMin: v as number } })"
                :min="1" :max="10" :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="震动最大强度（像素）">
              <el-input-number
                :model-value="modelValue.effects.screenShakeIntensityMax"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, effects: { ...modelValue.effects, screenShakeIntensityMax: v as number } })"
                :min="1" :max="20" :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-collapse-item>
      
      <!-- 音频配置 -->
      <el-collapse-item title="音频配置" name="audio">
        <template #title>
          <span class="collapse-title">音频配置</span>
          <span class="collapse-desc">音量、音效数量限制</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="背景音乐音量">
              <el-slider
                :model-value="safeAudioMusicVolume"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, audio: { ...modelValue.audio, musicVolume: v as number } })"
                :min="0" :max="1" :step="0.1"
                :format-tooltip="(v: number) => `${Math.round(v * 100)}%`"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="音效音量">
              <el-slider
                :model-value="safeAudioEffectVolume"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, audio: { ...modelValue.audio, effectVolume: v as number } })"
                :min="0" :max="1" :step="0.1"
                :format-tooltip="(v: number) => `${Math.round(v * 100)}%`"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大同时播放音效数">
              <el-input-number
                :model-value="modelValue.audio.maxConcurrentSounds"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, audio: { ...modelValue.audio, maxConcurrentSounds: v as number } })"
                :min="1" :max="30" :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="音频对象池大小">
              <el-input-number
                :model-value="modelValue.audio.audioPoolSize"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, audio: { ...modelValue.audio, audioPoolSize: v as number } })"
                :min="1" :max="20" :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-collapse-item>

      <!-- 性能配置 -->
      <el-collapse-item title="性能配置" name="performance">
        <template #title>
          <span class="collapse-title">性能配置</span>
          <span class="collapse-desc">帧率、内存限制</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="目标帧率">
              <el-input-number
                :model-value="modelValue.performance.targetFPS"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, performance: { ...modelValue.performance, targetFPS: v as number } })"
                :min="30" :max="120" :step="10"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="最大内存（MB）">
              <el-input-number
                :model-value="modelValue.performance.maxMemoryMB"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, performance: { ...modelValue.performance, maxMemoryMB: v as number } })"
                :min="50" :max="500" :step="10"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="内存检查间隔（毫秒）">
              <el-input-number
                :model-value="modelValue.performance.memoryCheckInterval"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, performance: { ...modelValue.performance, memoryCheckInterval: v as number } })"
                :min="1000" :max="30000" :step="1000"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="缓存清理阈值">
              <el-slider
                :model-value="safeCacheCleanupThreshold"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, performance: { ...modelValue.performance, cacheCleanupThreshold: v as number } })"
                :min="0.5" :max="1" :step="0.05"
                :format-tooltip="(v: number) => `${Math.round(v * 100)}%`"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-collapse-item>
      
      <!-- 敌人配置 -->
      <el-collapse-item title="敌人配置" name="enemies">
        <template #title>
          <span class="collapse-title">敌人配置</span>
          <span class="collapse-desc">敌人倍率、体积倍率</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="精英怪倍率">
              <el-input-number
                :model-value="modelValue.enemies.eliteMultiplier"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, enemies: { ...modelValue.enemies, eliteMultiplier: v as number } })"
                :min="1" :max="5" :step="0.1" :precision="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Boss 倍率">
              <el-input-number
                :model-value="modelValue.enemies.bossMultiplier"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, enemies: { ...modelValue.enemies, bossMultiplier: v as number } })"
                :min="1" :max="10" :step="0.5" :precision="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="最终 Boss 倍率">
              <el-input-number
                :model-value="modelValue.enemies.finalBossMultiplier"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, enemies: { ...modelValue.enemies, finalBossMultiplier: v as number } })"
                :min="1" :max="20" :step="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="精英怪体积倍率">
              <el-input-number
                :model-value="modelValue.enemies.eliteSizeMultiplier"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, enemies: { ...modelValue.enemies, eliteSizeMultiplier: v as number } })"
                :min="1" :max="3" :step="0.1" :precision="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Boss 体积倍率">
              <el-input-number
                :model-value="modelValue.enemies.bossSizeMultiplier"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, enemies: { ...modelValue.enemies, bossSizeMultiplier: v as number } })"
                :min="1" :max="5" :step="0.1" :precision="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="最终 Boss 体积倍率">
              <el-input-number
                :model-value="modelValue.enemies.finalBossSizeMultiplier"
                @update:model-value="(v) => emit('update:modelValue', { ...modelValue, enemies: { ...modelValue.enemies, finalBossSizeMultiplier: v as number } })"
                :min="1" :max="5" :step="0.1" :precision="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <!-- 敌人类型表格 -->
        <div class="sub-section">
          <h4>敌人类型配置</h4>
          <el-table :data="enemyTypesEntries" size="small" stripe>
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row[0] === 'red' ? 'danger' : row[0] === 'green' ? 'success' : row[0] === 'blue' ? 'primary' : 'warning'" size="small">
                  {{ enemyTypeNames[row[0]] || row[0] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="血量" width="80" align="center">
              <template #default="{ row }">{{ row[1].health }}</template>
            </el-table-column>
            <el-table-column label="速度" width="80" align="center">
              <template #default="{ row }">{{ row[1].speed }}</template>
            </el-table-column>
            <el-table-column label="攻击力" width="80" align="center">
              <template #default="{ row }">{{ row[1].attackPower }}</template>
            </el-table-column>
            <el-table-column label="机炮" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row[1].machineGun" type="success" size="small">有</el-tag>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="导弹" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row[1].missileLauncher" type="danger" size="small">有</el-tag>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-collapse-item>

      <!-- 关卡配置 -->
      <el-collapse-item title="关卡配置" name="stages">
        <template #title>
          <span class="collapse-title">关卡配置</span>
          <span class="collapse-desc">各关卡敌人类型、数量、生成速率</span>
        </template>
        <el-table :data="stagesData" size="small" stripe>
          <el-table-column label="关卡" width="80" align="center">
            <template #default="{ row }">
              <el-tag type="info" size="small">第 {{ row.id }} 关</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" width="100" />
          <el-table-column prop="background" label="背景" width="120" />
          <el-table-column label="敌人类型" min-width="200">
            <template #default="{ row }">
              <el-tag
                v-for="type in row.enemyTypes"
                :key="type"
                size="small"
                style="margin-right: 4px; margin-bottom: 4px;"
              >
                {{ enemyTypeNames[type] || type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="totalEnemies" label="敌人总数" width="100" align="center" />
          <el-table-column label="生成速率" width="100" align="center">
            <template #default="{ row }">{{ row.spawnRate }}ms</template>
          </el-table-column>
          <el-table-column label="Boss" width="100" align="center">
            <template #default="{ row }">
              <el-tag type="danger" size="small">{{ enemyTypeNames[row.bossType] || row.bossType }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style lang="scss" scoped>
.advanced-config-panel {
  :deep(.el-collapse-item__header) {
    height: 56px;
    line-height: 56px;
    padding: 0 16px;
    background: var(--bg-color-page);
    
    &:hover {
      background: var(--table-row-hover-bg);
    }
  }
  
  :deep(.el-collapse-item__content) {
    padding: 20px;
  }
  
  .collapse-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-right: 12px;
  }
  
  .collapse-desc {
    font-size: 13px;
    color: var(--text-secondary);
  }
  
  .sub-section {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px dashed var(--border-color);
    
    h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-regular);
    }
  }
  
  .text-muted {
    color: var(--text-secondary);
  }
}
</style>
