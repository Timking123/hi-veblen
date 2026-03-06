<script setup lang="ts">
/**
 * 404 页面
 * 页面未找到时显示
 */
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <h1>404</h1>
      <h2>页面未找到</h2>
      <p>抱歉，您访问的页面不存在</p>
      <div class="actions">
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goBack">返回上页</el-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.not-found-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-color-page);
}

.not-found-content {
  text-align: center;
  
  h1 {
    font-size: 120px;
    color: var(--primary-color);
    margin: 0;
    line-height: 1;
  }
  
  h2 {
    font-size: 24px;
    color: var(--text-primary);
    margin: 20px 0 10px;
  }
  
  p {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 30px;
  }
  
  .actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
}
</style>
