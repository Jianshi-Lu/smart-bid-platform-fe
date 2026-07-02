<script setup lang="ts">
/**
 * 应用根组件。
 *
 * 只负责:
 *   - 顶部 header:品牌区 + 首页 / 公告列表 / 创建公告 三个 router-link
 *   - 主区域:<router-view /> 渲染当前路由对应的视图组件
 *
 * 视图组件位置约定:
 *   src/views/{Feature}/{Action}.vue
 *   例:src/views/InvitationForBid/List.vue
 */
import { Document } from '@element-plus/icons-vue'
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="app-header-inner">
        <div class="app-brand">
          <el-icon class="app-brand-icon">
            <Document />
          </el-icon>
          <span>智能招投标平台</span>
        </div>

        <nav class="app-nav">
          <router-link to="/">首页</router-link>
          <router-link to="/list">公告列表</router-link>
          <router-link to="/create">创建公告</router-link>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #f5f7fa;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
}

.app-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 16px;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.app-brand-icon {
  color: #409eff;
  font-size: 20px;
}

.app-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-nav a {
  padding: 8px 12px;
  color: #606266;
  text-decoration: none;
  border-radius: 6px;
  transition: color 0.2s, background-color 0.2s;
}

.app-nav a:hover {
  color: #409eff;
  background: #f5f7fa;
}

.app-main {
  min-height: calc(100vh - 56px);
}
</style>
