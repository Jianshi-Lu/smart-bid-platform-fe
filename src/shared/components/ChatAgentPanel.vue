<script setup lang="ts">
/**
 * chat-agent 最小单轮问答组件。
 *
 * 只维护当前问题、请求状态和当前回答，不保存会话历史，也不处理流式输出。
 */
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Promotion } from '@element-plus/icons-vue'
import { askChatAgent } from '@/api/chat-agent'
import { getErrorMessage } from '@/shared/utils/error'

const question = ref('')
const answer = ref('')
const loading = ref(false)

const canSubmit = computed(() => question.value.trim().length > 0 && !loading.value)

async function submit() {
    const normalizedQuestion = question.value.trim()
    if (!normalizedQuestion || loading.value) return

    loading.value = true
    answer.value = ''

    try {
        const response = await askChatAgent(normalizedQuestion)
        answer.value = response.answer
    } catch (error) {
        ElMessage.error(getErrorMessage(error))
    } finally {
        loading.value = false
    }
}

function onQuestionKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        void submit()
    }
}
</script>

<template>
    <el-card class="chat-agent-panel" shadow="never">
        <div class="panel-heading">
            <div class="heading-title">
                <el-icon class="heading-icon"><ChatDotRound /></el-icon>
                <h2>智能问答</h2>
            </div>
            <p>基于当前 chat-agent 服务进行单轮问答</p>
        </div>

        <el-input
            v-model="question"
            type="textarea"
            :rows="4"
            maxlength="2000"
            show-word-limit
            resize="vertical"
            placeholder="请输入要咨询的问题"
            @keydown="onQuestionKeydown"
        />

        <div class="panel-actions">
            <span class="shortcut-tip">支持 Ctrl/⌘ + Enter 提交</span>
            <el-button
                type="primary"
                :icon="Promotion"
                :loading="loading"
                :disabled="!canSubmit"
                @click="submit"
            >
                {{ loading ? '回答中...' : '提交问题' }}
            </el-button>
        </div>

        <div v-if="answer" class="answer-section">
            <div class="answer-label">回答</div>
            <div class="answer-content">{{ answer }}</div>
        </div>
    </el-card>
</template>

<style scoped>
.chat-agent-panel {
    max-width: 1200px;
    margin: 24px auto 0;
    border-radius: 8px;
}

.panel-heading {
    margin-bottom: 16px;
}

.heading-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.heading-title h2 {
    margin: 0;
    color: #303133;
    font-size: 20px;
}

.heading-icon {
    color: var(--el-color-primary);
    font-size: 22px;
}

.panel-heading p {
    margin: 6px 0 0 30px;
    color: #909399;
    font-size: 13px;
}

.panel-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
}

.shortcut-tip {
    color: #909399;
    font-size: 12px;
}

.answer-section {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
}

.answer-label {
    margin-bottom: 8px;
    color: #606266;
    font-size: 14px;
    font-weight: 600;
}

.answer-content {
    padding: 12px;
    color: #303133;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
    background: #f5f7fa;
    border-radius: 4px;
}

@media (max-width: 600px) {
    .panel-actions {
        align-items: flex-end;
        flex-direction: column;
    }

    .shortcut-tip {
        align-self: flex-start;
    }
}
</style>
