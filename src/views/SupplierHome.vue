<script setup lang="ts">
/**
 * 投标方首页(/supplier,占位)。
 *
 * 当前状态: 未实现,等待后续开发。
 * 设计意图: 占位组件让用户知道投标方入口的存在,但不暴露任何业务功能
 *          避免误用;同时给出明确跳转路径(招标方入口 / 角色选择器)。
 *
 * 未来加投标方业务的姿势: 在 /supplier 路径下加子路由,
 * 例 /supplier/bid-record/list /supplier/risk-analysis/list 等。
 */
import { useRouter } from 'vue-router'
import { ShoppingCart } from '@element-plus/icons-vue'

const router = useRouter()
</script>

<template>
    <div class="page">
        <div class="placeholder-card">
            <el-icon :size="64" class="placeholder-icon"><ShoppingCart /></el-icon>
            <h2>投标方入口</h2>
            <p class="subtitle">即将推出...</p>
            <p class="hint">当前所有功能(公告管理 / 经办人管理 / 投标记录 / 风险分析)均位于招标方入口</p>
            <div class="actions">
                <el-button type="primary" @click="router.push('/purchaser')">
                    前往招标方入口
                </el-button>
                <el-button @click="router.push('/')">
                    返回角色选择
                </el-button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.placeholder-card {
    max-width: 560px;
    margin: 80px auto 0;
    padding: 48px 32px;
    background: #ffffff;
    border-radius: 8px;
    text-align: center;
}

.placeholder-icon {
    color: #c0c4cc;
    margin-bottom: 16px;
}

.placeholder-card h2 {
    margin: 0 0 12px;
    font-size: 22px;
    font-weight: 600;
    color: #303133;
}

.placeholder-card .subtitle {
    color: #409eff;
    font-size: 16px;
    margin: 0 0 24px;
}

.placeholder-card .hint {
    color: #909399;
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 32px;
}

.placeholder-card .actions {
    display: flex;
    justify-content: center;
    gap: 12px;
}
</style>