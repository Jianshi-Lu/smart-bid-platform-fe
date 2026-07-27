<script setup lang="ts">
/**
 * 根路由的角色选择页。角色入口由 roles 配置驱动，并使用 router-link 保留链接语义。
 * 新增角色时需要同时追加入口配置和对应路由。
 */
import type { Component } from 'vue'
import { Document, ShoppingCart } from '@element-plus/icons-vue'

interface RoleEntry {
  title: string
  description: string
  path: string
  icon: Component
}

const roles: RoleEntry[] = [
  {
    title: '招标方入口',
    description: '公告管理 / 经办人管理 / 投标记录 / 风险分析',
    path: '/purchaser',
    icon: Document,
  },
  {
    title: '投标方入口',
    description: '浏览招标项目 / 提交投标',
    path: '/supplier',
    icon: ShoppingCart,
  },
]
</script>

<template>
    <div class="role-selector">
        <header class="role-selector-header">
            <h1>智能招投标平台</h1>
            <p class="subtitle">请选择入口</p>
        </header>

        <el-row :gutter="32" justify="center">
            <el-col
                v-for="role in roles"
                :key="role.path"
                class="role-column"
                :xs="24"
                :md="10"
                :lg="8"
            >
                <router-link :to="role.path" class="role-link">
                    <el-card class="role-card" shadow="hover">
                        <el-icon :size="64" class="role-icon">
                            <component :is="role.icon" />
                        </el-icon>
                        <h2>{{ role.title }}</h2>
                        <p class="description">{{ role.description }}</p>
                    </el-card>
                </router-link>
            </el-col>
        </el-row>
    </div>
</template>

<style scoped>
.role-selector {
    max-width: 1200px;
    margin: 0 auto;
    padding: 80px 16px 32px;
}

.role-selector-header {
    text-align: center;
    margin-bottom: 48px;
}

.role-selector-header h1 {
    margin: 0 0 12px;
    font-size: 32px;
    font-weight: 600;
    color: #303133;
}

.role-selector-header .subtitle {
    color: #909399;
    font-size: 16px;
    margin: 0;
}

.role-column {
    margin-bottom: 24px;
}

.role-link {
    display: block;
    height: 100%;
    color: inherit;
    text-decoration: none;
    border-radius: 8px;
}

.role-link:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
}

.role-card {
    height: 100%;
    text-align: center;
    padding: 40px 24px;
    transition: transform 0.2s, box-shadow 0.2s;
    border-radius: 8px;
}

.role-card:hover {
    transform: translateY(-4px);
}

.role-icon {
    color: #409eff;
    margin-bottom: 20px;
}

.role-card h2 {
    margin: 0 0 12px;
    font-size: 22px;
    font-weight: 600;
    color: #303133;
}

.role-card .description {
    color: #606266;
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
}
</style>
