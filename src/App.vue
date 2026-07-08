<script setup lang="ts">
/**
 * 应用根组件。
 *
 * 只负责:
 *   - 顶部 header:品牌区(整块可点击,跳首页)+ 主区域 <router-view />
 *   - 品牌区整合了"首页"跳转,不再单独放 nav
 *   - 未来需右侧 nav(用户管理/设置等),再加 .app-nav 块
 *
 * 视图组件位置约定:
 *   src/views/{Feature}/{Action}.vue
 *   例:src/views/InvitationForBid/List.vue
 *
 * 跨组件导航规范:
 *   - 静态路径(已知 to,如品牌区):用 <router-link to="/" /> 声明式
 *   - 动态路径(参数化或条件跳转):useRouter() 取 router,script 内 router.push()
 *   - template 内联写法 $router.push 已弃用,统一改为 script 中声明方法
 *
 * ─── Class hierarchy ───
 *   - exports: 无
 *   - props: 无
 *   - state: 无
 *   - 渲染: 顶部 header(品牌区 <router-link to="/">) + 主区域 <router-view />
 *
 * ─── Style dependencies ───
 *   - global (style.css): 无
 *   - scoped (本文件 owns):
 *     .app / .app-header (position:sticky, 56px 高, z-index:100)
 *     .app-header-inner (max-width 1200 居中)
 *     .app-brand-link / .app-brand-link:hover (主色变 #409eff)
 *     .app-brand-link:hover .app-brand-icon
 *     .app-brand-icon
 *     .app-main (min-height: calc(100vh - 56px))
 *   - 关键: app-main 高度预留 app-header 高度,避免内容区被遮挡
 */
import { Document } from '@element-plus/icons-vue'
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="app-header-inner">
        <router-link to="/" class="app-brand-link">
          <el-icon class="app-brand-icon">
            <Document />
          </el-icon>
          <span>智能招投标平台</span>
        </router-link>
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

.app-brand-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
}

.app-brand-link:hover {
  color: #409eff;
}

.app-brand-link:hover .app-brand-icon {
  color: #409eff;
}

.app-brand-icon {
  font-size: 20px;
  transition: color 0.2s;
}

.app-main {
  min-height: calc(100vh - 56px);
}
</style>
