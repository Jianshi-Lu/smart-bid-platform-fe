<script setup lang="ts">
/**
 * 应用导航首页。
 *
 * 设计原则:
 *   1. entries 配置数组驱动,加新模块只需往数组里加一个对象,模板不动
 *   2. el-row 响应式列数(:xs/:sm/:md/:lg),1/2/3/4 列自动 reflow
 *   3. 卡片整体可点击跳转,鼠标 hover 抬升阴影
 *
 * 当前 7 entries:
 *   - 招标公告:列表 + 创建
 *   - 招标经办人:列表 + 创建
 *   - 投标记录:列表 + 创建
 *   - 风险分析:仅列表(BE RiskAnalysisController 只读入口,无 create/edit/delete)
 *
 * 未来加新模块的姿势(在 entries 数组追加 1-2 个对象):
 *   列表+创建双动作模块: 追加 2 个对象 (如 {title, path:'/xxx/list'} + {title, path:'/xxx/create'})
 *   只读模块: 追加 1 个对象 (如 {title:'风险分析列表', path:'/xxx/list', icon:...})
 */
import type { Component } from 'vue'
import { DataAnalysis, Document, List, Plus, User, UserFilled } from '@element-plus/icons-vue'

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
        path: '/invitation/list',
        icon: Document,
    },
    {
        title: '创建公告',
        description: '新建一条招标公告,填写 18 个业务字段',
        path: '/invitation/create',
        icon: Plus,
    },
    {
        title: '经办人列表',
        description: '查看所有招标经办人',
        path: '/bid-handler-info/list',
        icon: User,
    },
    {
        title: '新建经办人',
        description: '创建一条招标经办人记录',
        path: '/bid-handler-info/create',
        icon: UserFilled,
    },
    {
        title: '投标列表',
        description: '查看所有投标记录',
        path: '/bid-record/list',
        icon: List,
    },
    {
        title: '新建投标',
        description: '为某条招标公告创建一条投标记录',
        path: '/bid-record/create',
        icon: Plus,
    },
    {
        title: '风险分析列表',
        description: '查看所有 AI 风险分析历史结果',
        path: '/risk-analysis/list',
        icon: DataAnalysis,
    },
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
