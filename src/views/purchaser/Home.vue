<script setup lang="ts">
/**
 * 招标方首页(/purchaser)。
 *
 * 设计: 按业务模块分组,每张卡片 = 1 个模块,卡内用 router-link 列出该模块下
 * 的所有动作(列表/创建等)。整张卡不绑定跳转,只触发 hover 阴影效果。
 *
 * 当前 4 groups:
 *   - 招标公告:列表 + 创建
 *   - 招标经办人:列表 + 创建
 *   - 投标记录:列表 + 创建
 *   - 风险分析:仅列表(由投标列表的"风险分析"按钮触发生成)
 *
 * 加新模块: 往 groups 数组追加一个对象,模板无需改动。
 *
 * ─── Class hierarchy ───
 *   interface HomeAction { label, path, icon }
 *   interface HomeGroup  { title, description, icon, actions[] }
 *   const groups: HomeGroup[]                    // 4 个模块的静态数据
 *   - exports: 无(无 defineExpose / 无 emit)
 *   - props: 无
 *   - 不调用任何 api / 不订阅 store
 *   - 跨组件导航: <router-link :to="a.path"> (静态路径,声明式导航)
 *
 * ─── Style dependencies ───
 *   - global (style.css): 无 (本文件不引用 .page*)
 *   - scoped (本文件 owns):
 *     .home / .home h1 / .home .subtitle / .group-card / .group-card:hover
 *     .group-header / .group-icon / .group-title / .group-desc
 *     .action-list / .action-item / .action-item:hover / .action-item:hover .arrow / .arrow
 *   - 关键: el-row default display:flex + el-col default align-items:stretch
 *     (来自 Element Plus 内部 CSS) → 4 张卡等高,本文件无需自定义等高逻辑。
 *     el-card__body 用 display:flex; flex-direction:column + action-list margin-top:auto
 *     让子项始终贴卡底 (无 height:100% 强制,避免内部内容被裁剪)。
 */
import type { Component } from 'vue'
import {
    ArrowRight,
    DataAnalysis,
    Document,
    List,
    Plus,
    User,
} from '@element-plus/icons-vue'

interface HomeAction {
    /** 子项标签, e.g. '公告列表' */
    label: string
    /** 子项跳转路径 */
    path: string
    /** 子项图标 */
    icon: Component
}

interface HomeGroup {
    /** 模块主标题, e.g. '招标公告' */
    title: string
    /** 模块描述(1 句话说明模块用途) */
    description: string
    /** 模块主图标(显示在卡片 header) */
    icon: Component
    /** 模块下所有动作(至少 1 个) */
    actions: HomeAction[]
}

const groups: HomeGroup[] = [
    {
        title: '招标公告',
        description: '查看/管理/创建招标公告',
        icon: Document,
        actions: [
            { label: '公告列表', path: '/purchaser/invitation/list',   icon: List },
            { label: '创建公告', path: '/purchaser/invitation/create', icon: Plus },
        ],
    },
    {
        title: '招标经办人',
        description: '管理招标经办人信息',
        icon: User,
        actions: [
            { label: '经办人列表', path: '/purchaser/bid-handler-info/list',   icon: List },
            { label: '新建经办人', path: '/purchaser/bid-handler-info/create', icon: Plus },
        ],
    },
    {
        title: '投标记录',
        description: '查看/管理/创建投标记录',
        icon: List,
        actions: [
            { label: '投标列表', path: '/purchaser/bid-record/list',   icon: List },
            { label: '新建投标', path: '/purchaser/bid-record/create', icon: Plus },
        ],
    },
    {
        title: '风险分析',
        description: 'AI 风险分析历史结果',
        icon: DataAnalysis,
        actions: [
            { label: '风险分析列表', path: '/purchaser/risk-analysis/list', icon: List },
        ],
    },
]
</script>

<template>
    <div class="home">
        <h1>招标方入口</h1>
        <p class="subtitle">请选择操作:</p>

        <el-row :gutter="20">
            <el-col
                v-for="(g, i) in groups"
                :key="i"
                class="group-column"
                :xs="24"
                :sm="12"
                :md="12"
                :lg="6"
            >
                <el-card class="group-card" shadow="hover">
                    <div class="group-header">
                        <el-icon :size="24" class="group-icon">
                            <component :is="g.icon" />
                        </el-icon>
                        <h3>{{ g.title }}</h3>
                    </div>
                    <p class="group-desc">{{ g.description }}</p>
                    <el-divider class="group-divider" />
                    <div class="action-list">
                        <router-link
                            v-for="(a, j) in g.actions"
                            :key="j"
                            :to="a.path"
                            class="action-item"
                        >
                            <el-icon class="action-icon">
                                <component :is="a.icon" />
                            </el-icon>
                            <span class="action-label">{{ a.label }}</span>
                            <el-icon class="action-arrow">
                                <ArrowRight />
                            </el-icon>
                        </router-link>
                    </div>
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
.group-column {
    margin-bottom: 20px;
}
.group-card {
    height: 100%;
}
.group-card :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
}
.group-header {
    display: flex;
    align-items: center;
    gap: 8px;
}
.group-icon {
    color: var(--el-color-primary);
}
.group-header h3 {
    margin: 0;
    font-size: 18px;
}
.group-desc {
    color: #999;
    font-size: 13px;
    line-height: 1.5;
    margin: 8px 0 0;
}
.group-divider {
    margin: 12px 0 8px;
}
.action-list {
    display: flex;
    flex-direction: column;
    margin-top: auto;
}
.action-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 4px;
    color: #333;
    text-decoration: none;
    border-radius: 4px;
    transition: background-color 0.15s, color 0.15s;
}
.action-item:hover {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
}
.action-icon {
    color: #666;
    font-size: 16px;
}
.action-item:hover .action-icon {
    color: var(--el-color-primary);
}
.action-label {
    flex: 1;
    font-size: 14px;
}
.action-arrow {
    color: #ccc;
    font-size: 14px;
    transition: transform 0.15s, color 0.15s;
}
.action-item:hover .action-arrow {
    color: var(--el-color-primary);
    transform: translateX(2px);
}
</style>
