<script setup lang="ts">
/**
 * 招标方首页(/bid-inviter)。
 *
 * 设计: 按业务模块分组,每张卡片 = 1 个模块 = 1 个整卡可点击的入口,
 * 点击进入该模块列表;创建入口统一放在对应列表页底部。
 *
 * 当前 4 groups:
 *   - 招标公告:整卡单一入口(点击卡片进入公告列表,列表底部提供创建按钮)
 *   - 招标经办人:整卡入口 → 经办人列表(列表底部新建)
 *   - 投标记录:整卡入口 → 投标列表(列表底部新建)
 *   - 风险分析:整卡入口 → 风险分析列表(无新增入口)
 *   - 首页下方:ChatAgentPanel 会话问答与会话切换
 *
 * 加新模块: 往 groups 数组追加一个对象,模板无需改动。
 *
 * ─── Class hierarchy ───
 *   interface HomeGroup  { title, description, icon, mainPath }
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
    DataAnalysis,
    Document,
    List,
    User,
} from '@element-plus/icons-vue'
import ChatAgentPanel from '@/shared/components/ChatAgentPanel.vue'
import KnowledgeFileUploadPanel from '@/views/bid-inviter/components/KnowledgeFileUploadPanel.vue'

interface HomeGroup {
    /** 模块主标题, e.g. '招标公告' */
    title: string
    /** 模块描述(1 句话说明模块用途) */
    description: string
    /** 模块主图标(显示在卡片 header) */
    icon: Component
    /** 整卡入口:点击整卡跳转的路径 */
    mainPath?: string
}

const groups: HomeGroup[] = [
    {
        title: '招标公告',
        description: '查看/管理/创建招标公告',
        icon: Document,
        mainPath: '/bid-inviter/invitation/list',
    },
    {
        title: '招标经办人',
        description: '查看/管理/创建经办人',
        icon: User,
        mainPath: '/bid-inviter/bid-handler-info/list',
    },
    {
        title: '投标记录',
        description: '查看/管理投标记录',
        icon: List,
        mainPath: '/bid-inviter/bid-record/list',
    },
    {
        title: '风险分析',
        description: 'AI 风险分析历史结果',
        icon: DataAnalysis,
        mainPath: '/bid-inviter/risk-analysis/list',
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
                <router-link :to="g.mainPath ?? '/bid-inviter'" class="group-card-link">
                    <el-card class="group-card single-entry" shadow="hover">
                        <div class="single-entry-body">
                            <span class="group-icon-chip">
                                <el-icon :size="20" class="group-icon">
                                    <component :is="g.icon" />
                                </el-icon>
                            </span>
                            <div class="single-entry-text">
                                <h3>{{ g.title }}</h3>
                                <p class="group-desc">{{ g.description }}</p>
                            </div>
                        </div>
                    </el-card>
                </router-link>
            </el-col>
        </el-row>
        <KnowledgeFileUploadPanel />
        <ChatAgentPanel />
    </div>
</template>

<style scoped>
.home {
    max-width: 1200px;
    margin: 0 auto;
    padding: 36px 16px 40px;
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
.group-column {
    margin-bottom: 20px;
}
.group-card-link {
    display: block;
    height: auto;
    color: inherit;
    text-decoration: none;
    border-radius: var(--lc-radius-lg);
}
.group-card {
    height: 100%;
    border: 1px solid var(--lc-border);
    border-radius: var(--lc-radius-lg);
    background: var(--lc-surface);
    box-shadow: var(--lc-shadow-sm);
    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
}
.single-entry {
    height: auto;
}
.single-entry :deep(.el-card__body) {
    flex-direction: row;
    align-items: center;
    padding: 14px 18px;
}
.single-entry-body {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}
.single-entry-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}
.single-entry-text h3 {
    margin: 0;
    color: var(--lc-text);
    font-size: 16px;
    font-weight: 650;
}
.single-entry .group-desc {
    margin: 0;
    text-align: left;
}
.group-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--lc-shadow-md);
}
.group-card :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    padding: 24px;
}
.group-header {
    display: flex;
    align-items: center;
    gap: 12px;
}
.group-icon-chip {
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
.group-icon {
    color: var(--lc-accent);
    font-size: 18px;
}
.group-header h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 650;
    color: var(--lc-text);
}
.group-desc {
    color: var(--lc-text-secondary);
    font-size: 13px;
    line-height: 1.5;
    margin: 8px 0 0;
}
</style>
