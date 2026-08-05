<script setup lang="ts">
/**
 * chat-agent 阶段 0 会话问答组件。
 *
 * 当前维护会话 ID、会话列表、历史消息和请求状态；不直接连接 Python 服务。
 */
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Check, Close, Delete, EditPen, Promotion } from '@element-plus/icons-vue'
import {
    askChatAgent,
    createChatConversation,
    deleteChatConversation,
    listChatConversationMessages,
    listChatConversations,
    renameChatConversation,
} from '@/api/chat-agent'
import type { ChatMessage, Conversation } from '@/types/chat-agent'
import { getErrorMessage } from '@/shared/utils/error'

const question = ref('')
const answer = ref('')
const conversationId = ref<string | null>(null)
const conversations = ref<Conversation[]>([])
const messages = ref<ChatMessage[]>([])
const pendingClientMessageId = ref<string | null>(null)
const pendingQuestion = ref<string | null>(null)
const loading = ref(false)
const conversationLoading = ref(false)

const canSubmit = computed(() =>
    question.value.trim().length > 0
    && !loading.value
    && !conversationLoading.value
    && conversationId.value !== null,
)
const currentTitle = computed(() =>
    conversations.value.find((c) => c.conversationId === conversationId.value)?.title ?? '新对话',
)
const editingTitle = ref(false)
const draftTitle = ref('')

function createClientMessageId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }
    return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function startNewConversation() {
    if (loading.value || conversationLoading.value) return

    conversationLoading.value = true
    try {
        const conversation = await createChatConversation()
        conversationId.value = conversation.conversationId
        conversations.value = [conversation, ...conversations.value]
        messages.value = []
        question.value = ''
        answer.value = ''
        pendingClientMessageId.value = null
        pendingQuestion.value = null
    } catch (error) {
        ElMessage.error(getErrorMessage(error))
    } finally {
        conversationLoading.value = false
    }
}

function startEditingTitle() {
    draftTitle.value = currentTitle.value
    editingTitle.value = true
}

function cancelEditingTitle() {
    editingTitle.value = false
    draftTitle.value = ''
}

async function saveTitle() {
    const normalizedTitle = draftTitle.value.trim()
    if (!normalizedTitle || !conversationId.value) return

    try {
        const updated = await renameChatConversation(
            conversationId.value,
            normalizedTitle,
        )
        const index = conversations.value.findIndex(
            (c) => c.conversationId === updated.conversationId,
        )
        if (index !== -1) {
            conversations.value[index] = updated
        }
        editingTitle.value = false
    } catch (error) {
        ElMessage.error(getErrorMessage(error))
    }
}

async function deleteCurrentConversation() {
    if (!conversationId.value || loading.value || conversationLoading.value) return

    try {
        await ElMessageBox.confirm(
            '删除后会话将从列表移除，历史消息保留在服务端。确定删除吗？',
            '删除会话',
            {
                type: 'warning',
                confirmButtonText: '删除',
                cancelButtonText: '取消',
            },
        )
    } catch {
        return
    }

    const deletedId = conversationId.value
    try {
        await deleteChatConversation(deletedId)
        conversations.value = conversations.value.filter(
            (c) => c.conversationId !== deletedId,
        )
        messages.value = []
        answer.value = ''
        question.value = ''
        conversationId.value = null
        pendingClientMessageId.value = null
        pendingQuestion.value = null
        editingTitle.value = false
        if (conversations.value.length > 0) {
            await selectConversation(conversations.value[0].conversationId)
        } else {
            await startNewConversation()
        }
    } catch (error) {
        ElMessage.error(getErrorMessage(error))
    }
}

async function selectConversation(selectedConversationId: string) {
    if (
        loading.value
        || conversationLoading.value
        || selectedConversationId === conversationId.value
    ) return

    conversationLoading.value = true
    try {
        const history = await listChatConversationMessages(selectedConversationId)
        conversationId.value = selectedConversationId
        messages.value = history
        answer.value = [...history]
            .reverse()
            .find((message) => message.role === 'ASSISTANT' && message.status === 'COMPLETED')
            ?.content ?? ''
        question.value = ''
        pendingClientMessageId.value = null
        pendingQuestion.value = null
    } catch (error) {
        ElMessage.error(getErrorMessage(error))
    } finally {
        conversationLoading.value = false
    }
}

async function initializeConversations() {
    conversationLoading.value = true
    try {
        const existingConversations = await listChatConversations()
        conversations.value = existingConversations
        if (existingConversations.length > 0) {
            const firstConversation = existingConversations[0]
            const history = await listChatConversationMessages(
                firstConversation.conversationId,
            )
            conversationId.value = firstConversation.conversationId
            messages.value = history
            answer.value = [...history]
                .reverse()
                .find((message) => message.role === 'ASSISTANT' && message.status === 'COMPLETED')
                ?.content ?? ''
        } else {
            conversationLoading.value = false
            await startNewConversation()
        }
    } catch (error) {
        ElMessage.error(getErrorMessage(error))
    } finally {
        conversationLoading.value = false
    }
}

async function submit() {
    const normalizedQuestion = question.value.trim()
    if (!normalizedQuestion || loading.value || !conversationId.value) return

    loading.value = true
    answer.value = ''
    if (pendingClientMessageId.value === null
        || pendingQuestion.value !== normalizedQuestion) {
        pendingClientMessageId.value = createClientMessageId()
        pendingQuestion.value = normalizedQuestion
    }

    try {
        const response = await askChatAgent({
            conversationId: conversationId.value,
            clientMessageId: pendingClientMessageId.value,
            question: normalizedQuestion,
        })
        answer.value = response.answer
        if (response.title && conversationId.value) {
            const index = conversations.value.findIndex(
                (c) => c.conversationId === conversationId.value,
            )
            if (index !== -1) {
                conversations.value[index] = {
                    ...conversations.value[index],
                    title: response.title,
                }
            }
        }
        pendingClientMessageId.value = null
        pendingQuestion.value = null
        try {
            messages.value = await listChatConversationMessages(conversationId.value)
        } catch {
            // 回答已经成功返回；历史回放失败不覆盖本次问答结果。
        }
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

onMounted(() => {
    void initializeConversations()
})
</script>

<template>
    <el-card class="chat-agent-panel" shadow="never">
        <div class="panel-heading">
            <div class="heading-title">
                <el-icon class="heading-icon"><ChatDotRound /></el-icon>
                <h2>智能问答</h2>
            </div>
            <p>基于当前 chat-agent 服务进行会话问答</p>
        </div>

        <div class="conversation-actions">
            <el-select
                :model-value="conversationId"
                class="conversation-select"
                :disabled="loading || conversationLoading"
                placeholder="选择会话"
                @change="selectConversation"
            >
                <el-option
                    v-for="conversation in conversations"
                    :key="conversation.conversationId"
                    :label="conversation.title"
                    :value="conversation.conversationId"
                />
            </el-select>
            <el-button
                plain
                :loading="conversationLoading"
                :disabled="loading || conversationLoading"
                @click="startNewConversation"
            >
                新建会话
            </el-button>
        </div>

        <div v-if="conversationId" class="conversation-title-row">
            <template v-if="editingTitle">
                <el-input
                    v-model="draftTitle"
                    class="title-input"
                    maxlength="200"
                    placeholder="输入新标题"
                    @keyup.enter="saveTitle"
                />
                <el-button
                    type="primary"
                    :icon="Check"
                    circle
                    size="small"
                    @click="saveTitle"
                />
                <el-button
                    :icon="Close"
                    circle
                    size="small"
                    @click="cancelEditingTitle"
                />
            </template>
            <template v-else>
                <span class="conversation-title">{{ currentTitle }}</span>
                <el-button
                    :icon="EditPen"
                    circle
                    size="small"
                    text
                    @click="startEditingTitle"
                />
                <el-button
                    :icon="Delete"
                    circle
                    size="small"
                    text
                    type="danger"
                    :disabled="loading || conversationLoading"
                    @click="deleteCurrentConversation"
                />
            </template>
        </div>

        <div v-if="conversationId" class="conversation-id">
            当前会话：{{ conversationId }}
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
                :loading="loading || conversationLoading"
                :disabled="!canSubmit"
                @click="submit"
            >
                {{ loading ? '回答中...' : '提交问题' }}
            </el-button>
        </div>

        <div v-if="messages.length > 0" class="message-history">
            <div
                v-for="message in messages"
                :key="message.messageId"
                class="message-item"
                :class="message.role === 'USER' ? 'user-message' : 'assistant-message'"
            >
                <div class="message-role">
                    {{ message.role === 'USER' ? '我' : '助手' }}
                </div>
                <div class="message-content">
                    {{ message.content || (message.status === 'PROCESSING' ? '处理中...' : '暂无内容') }}
                </div>
            </div>
        </div>

        <div v-if="answer && messages.length === 0" class="answer-section">
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

.conversation-id {
    color: #606266;
    font-family: monospace;
    margin: -4px 0 12px;
}

.conversation-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin: -8px 0 12px;
}

.conversation-select {
    min-width: 180px;
}

.conversation-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -4px 0 12px;
}

.conversation-title {
    color: #303133;
    font-weight: 600;
}

.title-input {
    max-width: 320px;
}

.message-history {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
}

.message-item {
    max-width: 90%;
}

.user-message {
    align-self: flex-end;
    text-align: right;
}

.assistant-message {
    align-self: flex-start;
}

.message-role {
    margin-bottom: 4px;
    color: #909399;
    font-size: 12px;
}

.message-content {
    padding: 10px 12px;
    color: #303133;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
    background: #f5f7fa;
    border-radius: 6px;
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
