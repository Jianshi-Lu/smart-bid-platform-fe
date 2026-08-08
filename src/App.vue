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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, Document, Menu } from '@element-plus/icons-vue'
import { useBidInviterAuth } from '@/composables/useBidInviterAuth'
import { useBidderAuth } from '@/composables/useBidderAuth'

const route = useRoute()
const router = useRouter()
const navOpen = ref(false)

const bidInviterAuth = useBidInviterAuth()
const bidderAuth = useBidderAuth()

/** 当前所在角色入口：招标方 / 投标方；角色选择页与登录页不显示账号区。 */
const activeRole = computed<'bid-inviter' | 'supplier' | null>(() => {
    if (route.path.startsWith('/bid-inviter')
        && route.path !== '/bid-inviter/login') {
        return 'bid-inviter'
    }
    if (route.path.startsWith('/supplier')
        && route.path !== '/supplier/login') {
        return 'supplier'
    }
    return null
})

const accountLabel = computed(() => {
    const account = activeRole.value === 'bid-inviter'
        ? bidInviterAuth.account.value
        : bidderAuth.account.value
    if (!account) return ''
    return account.displayName || account.username
})

function onLogout(): void {
    if (activeRole.value === 'bid-inviter') {
        bidInviterAuth.logout()
        void router.push('/bid-inviter/login')
    } else if (activeRole.value === 'supplier') {
        bidderAuth.logout()
        void router.push('/supplier/login')
    }
}

const breadcrumbs = computed(
    () => (route.meta.breadcrumb as Array<{ label: string; path?: string }> | undefined) ?? [],
)

const globalNav = [
    {
        role: '招标方',
        home: { label: '招标方入口', path: '/bid-inviter' },
        groups: [
            {
                title: '招标公告',
                items: [
                    { label: '公告列表', path: '/bid-inviter/invitation/list' },
                    { label: '创建公告', path: '/bid-inviter/invitation/create' },
                ],
            },
            {
                title: '招标经办人',
                items: [
                    { label: '经办人列表', path: '/bid-inviter/bid-handler-info/list' },
                    { label: '新建经办人', path: '/bid-inviter/bid-handler-info/create' },
                ],
            },
            {
                title: '投标记录',
                items: [
                    { label: '投标列表', path: '/bid-inviter/bid-record/list' },
                ],
            },
            {
                title: '风险分析',
                items: [
                    { label: '风险分析列表', path: '/bid-inviter/risk-analysis/list' },
                ],
            },
        ],
    },
    {
        role: '投标方',
        home: { label: '投标方入口', path: '/supplier' },
        groups: [
            {
                title: '投标项目',
                items: [
                    { label: '项目列表', path: '/supplier/invitation/list' },
                ],
            },
            {
                title: '投标录入',
                items: [
                    { label: '投标录入', path: '/supplier/bid-record/create' },
                ],
            },
        ],
    },
]

const expandedGroup = ref<string | null>(null)

function toggleSection(group: string) {
    expandedGroup.value = expandedGroup.value === group ? null : group
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="app-header-inner">
        <div class="app-header-left">
          <router-link to="/" class="app-brand-link">
            <span class="app-brand-mark">
              <el-icon class="app-brand-icon">
                <Document />
              </el-icon>
            </span>
            <span class="app-brand-text">智能招投标平台</span>
          </router-link>

          <el-button
              class="global-nav-trigger"
              :class="{ 'is-open': navOpen }"
              :icon="Menu"
              circle
              text
              aria-label="全局导航"
              @click="navOpen = !navOpen"
          />
        </div>

        <nav v-if="breadcrumbs.length > 1" class="app-breadcrumb" aria-label="面包屑">
            <template v-for="(item, index) in breadcrumbs" :key="`${item.label}-${index}`">
                <router-link
                    v-if="item.path && index < breadcrumbs.length - 1"
                    :to="item.path"
                    class="breadcrumb-link"
                >
                    {{ item.label }}
                </router-link>
                <span
                    v-else-if="index === breadcrumbs.length - 1"
                    class="breadcrumb-current"
                >
                    {{ item.label }}
                </span>
                <span v-else class="breadcrumb-link">{{ item.label }}</span>
                <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">
                    /
                </span>
            </template>
        </nav>

        <div v-if="activeRole" class="app-header-right">
            <span class="app-account-name">{{ accountLabel }}</span>
            <el-button size="small" @click="onLogout">
                退出登录
            </el-button>
        </div>
      </div>

      <div v-show="navOpen" class="global-nav-panel">
          <nav class="global-nav-flat">
              <template v-for="section in globalNav" :key="section.home.label">
                  <div class="flat-section">
                      <button
                          type="button"
                          class="flat-section-title"
                          :class="{ 'is-open': expandedGroup === section.home.label }"
                          @click="toggleSection(section.home.label)"
                      >
                          <span>{{ section.home.label }}</span>
                          <el-icon class="flat-caret"><ArrowDown /></el-icon>
                      </button>
                      <div v-show="expandedGroup === section.home.label" class="flat-section-items">
                          <router-link
                              :to="section.home.path"
                              class="flat-item"
                              :class="{ 'is-active': route.path === section.home.path }"
                              @click="navOpen = false"
                          >
                              {{ section.home.label }}
                          </router-link>
                          <template v-for="group in section.groups" :key="group.title">
                              <div class="flat-subgroup-title">{{ group.title }}</div>
                              <router-link
                                  v-for="item in group.items"
                                  :key="item.path"
                                  :to="item.path"
                                  class="flat-item depth-2"
                                  :class="{ 'is-active': route.path === item.path }"
                                  @click="navOpen = false"
                              >
                                  {{ item.label }}
                              </router-link>
                          </template>
                      </div>
                  </div>
              </template>
          </nav>
      </div>
    </header>

    <div v-show="navOpen" class="global-nav-backdrop" @click="navOpen = false" />

    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: var(--lc-bg);
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 60px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--lc-border);
}

.app-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 20px;
}

.app-header-left {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.app-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.app-account-name {
  color: var(--lc-text-secondary);
  font-size: 13px;
}

.app-brand-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--lc-text);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.app-brand-link:hover {
  opacity: 0.85;
}

.app-brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  color: #ffffff;
  background: linear-gradient(135deg, #1d4ed8, #2563eb 55%, #3b82f6);
  box-shadow: var(--lc-shadow-sm);
}

.app-brand-icon {
  font-size: 17px;
}

.app-brand-text {
  letter-spacing: -0.01em;
}

.app-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--lc-text-muted);
  font-size: 13px;
  white-space: nowrap;
  overflow-x: auto;
}

.breadcrumb-link {
  color: var(--lc-text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.breadcrumb-link:hover {
  color: var(--lc-accent);
}

.breadcrumb-current {
  color: var(--lc-text);
  font-weight: 600;
}

.breadcrumb-separator {
  color: var(--lc-text-muted);
  user-select: none;
}

.app-main {
  min-height: calc(100vh - 60px);
}
</style>
