<script setup lang="ts">
/**
 * 投标方首页(/supplier)。
 *
 * 文件职责: 投标方角色的入口首页,展示当前可用的业务模块。
 *
 * 当前 1 entry(后续可扩展):
 *   - 投标项目列表: 查看所有招标公告,选择项目进行投标
 *
 * 所有 path 以 /supplier 为前缀,与 router 路由表对齐。
 *
 * 未来加投标方业务的姿势(在 entries 数组追加对象):
 *   { title: '...', description: '...', path: '/supplier/xxx', icon: ... }
 *   例: 我创建的投标记录、我的风险分析、我的中标项目等
 *
 * ─── Class hierarchy ───
 *   interface HomeEntry { title, description, path, icon }
 *   const entries: HomeEntry[]                   // 当前 1 项,数组形态便于扩展
 *   - exports: 无
 *   - props: 无
 *   - 跨组件导航: useRouter().push() (卡片整张可点 + 返回首页按钮)
 *
 * ─── Style dependencies ───
 *   - global (style.css): 无 (本文件不引用 .page*)
 *   - scoped (本文件 owns):
 *     .home / .home h1 / .home .subtitle
 *     .home-card / .home-card:hover (含 translateY(-2px) 抬升效果)
 *     .card-header / .card-header h3
 *     .description
 *     .home-footer
 *   - el-card shadow="hover" 替代手写 box-shadow 抬升
 */
import type { Component } from 'vue'
import { useRouter } from 'vue-router'
import { Document, Tickets } from '@element-plus/icons-vue'

interface HomeEntry {
    /** 卡片主标题 */
    title: string
    /** 卡片描述(1-2 句话说明用途) */
    description: string
    /** 点击后跳转的路径 */
    path: string
    /** 卡片图标(@element-plus/icons-vue) */
    icon: Component
}

const router = useRouter()

const entries: HomeEntry[] = [
    {
        title: '投标项目列表',
        description: '浏览招标公告并参与投标',
        path: '/supplier/invitation/list',
        icon: Document,
    },
    {
        title: '我的投标',
        description: '管理投标记录与资信材料',
        path: '/supplier/my-bids',
        icon: Tickets,
    },
]

function go(path: string) {
  router.push(path)
}

</script>

<template>
    <div class="home">
        <div class="home-topbar">
            <div>
                <h1>投标方入口</h1>
                <p class="subtitle">请选择操作:</p>
            </div>
            <div class="home-actions">
                <el-button type="primary" @click="go('/supplier/my-bids')">
                    我的投标
                </el-button>
            </div>
        </div>

        <el-row :gutter="20">
            <el-col
                v-for="(entry, i) in entries"
                :key="i"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
            >
                <el-card class="home-card" shadow="hover" @click="go(entry.path)">
                    <div class="card-header">
                        <span class="card-icon-chip">
                            <el-icon :size="18"><component :is="entry.icon" /></el-icon>
                        </span>
                        <h3>{{ entry.title }}</h3>
                    </div>
                    <p class="description">{{ entry.description }}</p>
                </el-card>
            </el-col>
        </el-row>

    </div>
</template>

<style scoped>
.home {
    max-width: 1200px;
    margin: 0 auto;
    padding: 36px 16px 40px;
}
.home-topbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
}
.home-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
.home h1 {
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 650;
    letter-spacing: -0.01em;
    color: var(--lc-text);
}
.subtitle {
    color: var(--lc-text-secondary);
    margin: 0 0 24px;
}
.home-card {
    height: 100%;
    cursor: pointer;
    margin-bottom: 20px;
    border: 1px solid var(--lc-border);
    border-radius: var(--lc-radius-lg);
    background: var(--lc-surface);
    box-shadow: var(--lc-shadow-sm);
    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
}
.home-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--lc-shadow-md);
}
.home-card :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
}
.card-header {
    display: flex;
    align-items: center;
    gap: 12px;
}
.card-icon-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--lc-accent-soft);
    color: var(--lc-accent);
    flex-shrink: 0;
}
.card-header h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 650;
    color: var(--lc-text);
}
.description {
    color: var(--lc-text-secondary);
    font-size: 13px;
    line-height: 1.5;
    margin: 8px 0 0;
    text-align: center;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
