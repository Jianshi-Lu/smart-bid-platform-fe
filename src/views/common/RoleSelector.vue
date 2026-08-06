<script setup lang="ts">
/**
 * 根路由的角色选择页。角色入口由 roles 配置驱动，并使用 router-link 保留链接语义。
 * 新增角色时需要同时追加入口配置和对应路由。
 */
import type { Component } from 'vue'
import { useRouter } from 'vue-router'
import { Document, ShoppingCart } from '@element-plus/icons-vue'

interface RoleEntry {
  title: string
  description: string
  path: string
  loginPath: string
  icon: Component
}

const router = useRouter()

const roles: RoleEntry[] = [
  {
    title: '招标方入口',
    description: '公告管理 / 经办人管理 / 投标记录 / 风险分析',
    path: '/bid-inviter',
    loginPath: '/bid-inviter/login',
    icon: Document,
  },
  {
    title: '投标方入口',
    description: '浏览招标项目 / 提交投标',
    path: '/supplier',
    loginPath: '/supplier/login',
    icon: ShoppingCart,
  },
]

/**
 * 点击角色入口：未登录先进入对应登录校验页，登录后由守卫/登录页跳回入口；
 * 已登录直接进入角色首页。
 */
function enter(role: RoleEntry): void {
  const credentialsKey = role.path.startsWith('/bid-inviter')
    ? 'bidInviterCredentials'
    : 'bidderCredentials'
  const hasCredentials = Boolean(localStorage.getItem(credentialsKey))
  router.push(hasCredentials ? role.path : role.loginPath)
}
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
                <el-card
                    class="role-card"
                    shadow="hover"
                    tabindex="0"
                    @click="enter(role)"
                    @keyup.enter="enter(role)"
                >
                    <el-icon :size="64" class="role-icon">
                        <component :is="role.icon" />
                    </el-icon>
                    <h2>{{ role.title }}</h2>
                    <p class="description">{{ role.description }}</p>
                </el-card>
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
    letter-spacing: -0.02em;
    color: var(--lc-text);
}

.role-selector-header .subtitle {
    color: var(--lc-text-secondary);
    font-size: 16px;
    margin: 0;
}

.role-column {
    margin-bottom: 24px;
}

.role-card {
    height: 100%;
    text-align: center;
    padding: 40px 24px;
    cursor: pointer;
    outline: none;
    transition: transform 0.2s, box-shadow 0.2s;
    border-radius: var(--lc-radius-lg);
    border: 1px solid var(--lc-border);
    box-shadow: var(--lc-shadow-sm);
}

.role-card:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
}

.role-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--lc-shadow-md);
}

.role-icon {
    color: var(--lc-accent);
    margin-bottom: 20px;
}

.role-card h2 {
    margin: 0 0 12px;
    font-size: 22px;
    font-weight: 600;
    color: var(--lc-text);
}

.role-card .description {
    color: var(--lc-text-secondary);
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
}
</style>
