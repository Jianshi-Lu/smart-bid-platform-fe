<script setup lang="ts">
/**
 * 应用导航首页。
 *
 * 设计原则:
 *   1. entries 配置数组驱动,加新模块只需往数组里加一个对象,模板不动
 *   2. el-row 响应式列数(:xs/:sm/:md/:lg),1/2/3/4 列自动 reflow
 *   3. 卡片整体可点击跳转,鼠标 hover 抬升阴影
 *
 * 未来加新模块的姿势(在 entries 数组追加):
 *   { module: '投标记录', title: '...', description: '...', path: '/bid/list', icon: List }
 *   { module: '经办人',   title: '...', description: '...', path: '/handler/list', icon: User }
 */
import type { Component } from 'vue'
import { Document, Plus } from '@element-plus/icons-vue'

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

const entries: HomeEntry[] = [
    {
        title: '公告列表',
        description: '查看所有招标公告,支持分页查询与状态过滤',
        path: '/list',
        icon: Document,
    },
    {
        title: '创建公告',
        description: '新建一条招标公告,填写 18 个业务字段',
        path: '/create',
        icon: Plus,
    },
    // ——— 未来模块占位 ———
    // { module: '投标记录', title: '投标列表', description: '...', path: '/bid/list', icon: List },
    // { module: '经办人',   title: '经办人管理', description: '...', path: '/handler/list', icon: User },
]
</script>

<template>
    <div class="home">
        <h1>智能招投标平台</h1>
        <p class="subtitle">请选择操作:</p>

        <el-row :gutter="20">
            <el-col
                v-for="(entry, i) in entries"
                :key="i"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
            >
                <el-card class="home-card" shadow="hover" @click="$router.push(entry.path)">
                    <div class="card-header">
                        <el-icon :size="24"><component :is="entry.icon" /></el-icon>
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
    padding: 32px 16px;
}
.home h1 {
    margin: 0 0 8px;
    font-size: 28px;
}
.subtitle {
    color: #999;
    margin: 0 0 24px;
}
.home-card {
    cursor: pointer;
    margin-bottom: 20px;
    transition: transform 0.2s;
}
.home-card:hover {
    transform: translateY(-2px);
}
.card-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 12px;
}
.card-header h3 {
    margin: 0;
    font-size: 18px;
}
.description {
    color: #666;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
    text-align: center;
}
</style>
