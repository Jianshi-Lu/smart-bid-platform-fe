<script setup lang="ts">
/**
 * 根路由的角色选择页。角色入口由 roles 配置驱动，并使用 router-link 保留链接语义。
 * 新增角色时需要同时追加入口配置和对应路由。
 */
import type { Component } from 'vue'
import { useRouter } from 'vue-router'
import { Document, ShoppingCart } from '@element-plus/icons-vue'
import fosunBrandHero from '@/assets/brand/fosun-brand-hero.png'
import fosunPharmaLogoWhite from '@/assets/brand/fosun-pharma-logo-white.png'

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
        <section
            class="brand-hero"
            :style="{ backgroundImage: `url(${fosunBrandHero})` }"
            aria-labelledby="platform-title"
        >
            <div class="brand-hero-copy">
                <img
                    :src="fosunPharmaLogoWhite"
                    class="brand-hero-logo"
                    alt="复星万邦（江苏）医药集团有限公司"
                />
                <p class="brand-hero-kicker">AI 赋能的招投标全流程管理</p>
                <h1 id="platform-title">智能招投标管理平台</h1>
                <p class="brand-hero-description">
                    面向招标方与投标方的数字化业务协同平台
                </p>
            </div>
        </section>

        <div class="role-section-heading">
            <h2>选择使用角色</h2>
            <p>进入对应入口后，原有业务流程与操作方式保持不变</p>
        </div>

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
    min-height: calc(100vh - 64px);
    padding: 28px 16px 48px;
    overflow-x: clip;
}

.brand-hero {
    min-height: 230px;
    display: flex;
    align-items: center;
    padding: 32px 52px;
    overflow: hidden;
    border-radius: var(--lc-radius-xl);
    background-color: #0252bf;
    background-position: center center;
    background-repeat: no-repeat;
    background-size: cover;
    box-shadow: var(--lc-shadow-md);
}

.brand-hero-copy {
    width: min(520px, 50%);
    color: #ffffff;
}

.brand-hero-logo {
    display: block;
    width: 220px;
    height: auto;
    margin-bottom: 22px;
}

.brand-hero-kicker {
    margin: 0 0 8px;
    color: rgba(255, 255, 255, 0.86);
    font-size: 14px;
    letter-spacing: 0.04em;
}

.brand-hero h1 {
    margin: 0;
    color: #ffffff;
    font-size: 36px;
    font-weight: 600;
    line-height: 1.25;
}

.brand-hero-description {
    margin: 12px 0 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 15px;
    line-height: 1.6;
}

.role-section-heading {
    margin: 28px 4px 18px;
}

.role-section-heading h2 {
    margin: 0 0 6px;
    color: var(--lc-brand-deep);
    font-size: 22px;
    font-weight: 650;
}

.role-section-heading p {
    margin: 0;
    color: var(--lc-text-secondary);
    font-size: 14px;
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

@media (max-width: 640px) {
    .role-selector {
        padding: 20px 12px 36px;
    }

    .brand-hero {
        min-height: 200px;
        padding: 24px 20px;
        background-position: center center;
    }

    .brand-hero-copy {
        width: 58%;
    }

    .brand-hero-logo {
        display: none;
    }

    .brand-hero-kicker {
        font-size: 13px;
        line-height: 1.5;
    }

    .brand-hero h1 {
        font-size: 26px;
    }

    .brand-hero-description {
        display: none;
    }

    .role-section-heading {
        margin-top: 24px;
    }

    .role-card {
        padding: 32px 18px;
    }
}
</style>
