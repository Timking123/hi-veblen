<script setup lang="ts">
/**
 * SEO 管理页面
 * 使用 Tab 组织 Meta、Schema、Sitemap、Robots 配置
 * 
 * 需求: 7.1.1-7.4.2
 */
import { ref } from 'vue'
import {
  ElTabs,
  ElTabPane,
  ElIcon
} from 'element-plus'
import {
  Document,
  Connection,
  Files,
  Setting
} from '@element-plus/icons-vue'
import {
  MetaConfigForm,
  SchemaEditor,
  SitemapConfig,
  RobotsEditor
} from '@/components/seo'

// 当前激活的标签页
const activeTab = ref('meta')
</script>

<template>
  <div class="seo-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>SEO 管理</h2>
      <p class="page-desc">配置网站的 SEO 信息，提升搜索引擎排名</p>
    </div>
    
    <!-- 标签页 -->
    <el-tabs v-model="activeTab" type="border-card">
      <!-- Meta 配置 -->
      <el-tab-pane name="meta">
        <template #label>
          <span class="tab-label">
            <el-icon><Document /></el-icon>
            Meta 配置
          </span>
        </template>
        <MetaConfigForm />
      </el-tab-pane>
      
      <!-- 结构化数据 -->
      <el-tab-pane name="schema">
        <template #label>
          <span class="tab-label">
            <el-icon><Connection /></el-icon>
            结构化数据
          </span>
        </template>
        <SchemaEditor />
      </el-tab-pane>
      
      <!-- Sitemap 配置 -->
      <el-tab-pane name="sitemap">
        <template #label>
          <span class="tab-label">
            <el-icon><Files /></el-icon>
            Sitemap
          </span>
        </template>
        <SitemapConfig />
      </el-tab-pane>
      
      <!-- Robots.txt 配置 -->
      <el-tab-pane name="robots">
        <template #label>
          <span class="tab-label">
            <el-icon><Setting /></el-icon>
            Robots.txt
          </span>
        </template>
        <RobotsEditor />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.seo-container {
  padding: 20px;
  background-color: var(--bg-color-page);
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 20px;
  
  h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .page-desc {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.el-tabs__content) {
  padding: 0;
}
</style>
