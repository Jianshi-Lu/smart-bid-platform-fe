<script setup lang="ts">
/**
 * 应用根组件。
 *
 * 只负责:
 *   - 顶部 nav: 公告列表 / 创建公告 两个 router-link
 *   - 主区域: <router-view /> 渲染当前路由对应的视图组件
 *
 * 视图组件位置约定:
 *   src/views/{Feature}/{Action}.vue
 *   例: src/views/InvitationForBid/List.vue
 */
</script>

<template>
  <div class="app">
    <nav class="app-nav">
      <router-link to="/">首页</router-link>
      <router-link to="/list">公告列表</router-link>
      <router-link to="/create">创建公告</router-link>
    </nav>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>