<script setup lang="ts">
/**
 * 应用角色选择器(根路由 /)。
 *
 * 设计意图:
 *   1. 进站先选择角色(招标方 / 投标方),后续按角色分流到对应入口
 *   2. 2 大卡响应式布局(:xs=24, :md=10, :lg=8),小屏 1 列、中大屏 2 列
 *   3. 卡片整体可点击跳转,鼠标 hover 抬升
 *
 * 当前状态:
 *   - 招标方(/purchaser): 已实现,完整功能(原 Home.vue 的 7 entries)
 *   - 投标方(/supplier): 占位,等待后续实现
 *
 * 未来加角色入口的姿势:SupplierHome.vue 实现后,在 RoleSelector
 * 移除 disabled 样式即可;若加新角色(如审计员/管理员),同样加一张 el-card。
 *
 * ─── Class hierarchy ───
 *   - exports: 无
 *   - props: 无
 *   - state: 无 (纯展示页,2 张 el-card 直接绑 go())
 *   - 跨组件导航: useRouter().push() (招标方 / 投标方入口)
 *
 * ─── Style dependencies ───
 *   - global (style.css): 无
 *   - scoped (本文件 owns):
 *     .role-selector / .role-selector-header / .role-selector-header h1
 *     .role-selector-header .subtitle
 *     .role-cards / .role-card / .role-card:hover (含 translateY(-2px))
 *     .role-icon / .role-card h2 / .role-card p
 */
import { useRouter } from 'vue-router'
import { Document, ShoppingCart } from '@element-plus/icons-vue'

const router = useRouter()

function go(path: string) {
  router.push(path)
}
</script>

<template>
    <div class="role-selector">
        <header class="role-selector-header">
            <h1>智能招投标平台</h1>
            <p class="subtitle">请选择入口</p>
        </header>

        <el-row :gutter="32" justify="center">
            <el-col :xs="24" :md="10" :lg="8">
                <el-card class="role-card" shadow="hover" @click="go('/purchaser')">
                    <el-icon :size="64" class="role-icon"><Document /></el-icon>
                    <h2>招标方入口</h2>
                    <p class="description">公告管理 / 经办人管理 / 投标记录 / 风险分析</p>
                </el-card>
            </el-col>

            <el-col :xs="24" :md="10" :lg="8">
                <el-card class="role-card" shadow="hover" @click="go('/supplier')">
                    <el-icon :size="64" class="role-icon"><ShoppingCart /></el-icon>
                    <h2>投标方入口</h2>
                    <p class="description"></p>
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
    color: #303133;
}

.role-selector-header .subtitle {
    color: #909399;
    font-size: 16px;
    margin: 0;
}

.role-card {
    cursor: pointer;
    text-align: center;
    padding: 40px 24px;
    transition: transform 0.2s, box-shadow 0.2s;
    border-radius: 8px;
}

.role-card:hover {
    transform: translateY(-4px);
}

.role-card-disabled {
    cursor: pointer;
    opacity: 0.85;
}

.role-icon {
    color: #409eff;
    margin-bottom: 20px;
}

.role-card-disabled .role-icon {
    color: #c0c4cc;
}

.role-card h2 {
    margin: 0 0 12px;
    font-size: 22px;
    font-weight: 600;
    color: #303133;
}

.role-card-disabled h2 {
    color: #909399;
}

.role-card .description {
    color: #606266;
    font-size: 14px;
    line-height: 1.6;
    margin: 0;
}
</style>