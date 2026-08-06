<script setup lang="ts">
/**
 * 404 页面:任何未匹配路由都落到这里,而不是 redirect 跳到首页。
 *
 * 设计意图:
 *   - 明确告知"资源不存在",区别于"系统异常"和"权限不足"
 *   - 显示用户访问的完整路径,方便定位错误 URL
 *   - 主操作 = 返回首页(单一出口,避免迷路)
 *
 * ─── Class hierarchy ───
 *   const route = useRoute();  const router = useRouter()
 *   - exports: 无
 *   - props: 无
 *   - state: 无
 *   - 跳转: router.push('/') (主按钮:返回首页)
 *
 * ─── Style dependencies ───
 *   - global (style.css): 无
 *   - scoped (本文件 owns):
 *     .not-found / .not-found h1 (大号 404 文字)
 *     .not-found .title / .not-found .path-hint
 */
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
    <div class="not-found">
        <h1>404</h1>
        <p class="title">您访问的页面不存在</p>
        <!-- route.path 是用户输入但未匹配上的完整 URL,便于定位错误链接 -->
        <p class="path-hint">{{ route.path }}</p>
        <el-button type="primary" size="large" @click="router.push('/')">
            返回首页
        </el-button>
    </div>
</template>

<style scoped>
.not-found {
    max-width: 600px;
    margin: 0 auto;
    padding: 80px 16px;
    text-align: center;
}
.not-found h1 {
    font-size: 96px;
    color: var(--lc-border-strong);
    margin: 0 0 16px;
    line-height: 1;
}
.not-found .title {
    color: var(--lc-text-secondary);
    font-size: 18px;
    margin: 0 0 8px;
}
.not-found .path-hint {
    color: var(--lc-text-muted);
    font-family: monospace;
    font-size: 13px;
    margin: 0 0 32px;
}
</style>
