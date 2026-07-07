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
 */
import type { Component } from 'vue'
import { Document } from '@element-plus/icons-vue'

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
        title: '投标项目列表',
        description: '查看所有招标公告,选择项目进行投标',
        path: '/supplier/invitation/list',
        icon: Document,
    },
]
</script>

<template>
    <div class="home">
        <h1>投标方入口</h1>
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

        <div class="home-footer">
            <el-button @click="$router.push('/')">← 返回首页</el-button>
        </div>
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
.home-footer {
    margin-top: 32px;
    display: flex;
    justify-content: flex-end;
}
</style>