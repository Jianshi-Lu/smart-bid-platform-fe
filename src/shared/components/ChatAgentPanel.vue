<script setup lang="ts">
/**
 * chat-agent 阶段 0 会话问答组件。
 *
 * 当前维护会话 ID、会话列表、历史消息和请求状态；不直接连接 Python 服务。
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    Check,
    Close,
    Delete,
    Download,
    EditPen,
    Plus,
    Promotion,
} from '@element-plus/icons-vue'
import {
    askChatAgent,
    createChatConversation,
    deleteChatConversation,
    listChatConversationMessages,
    listChatConversations,
    renameChatConversation,
} from '@/api/chat-agent'
import {
    downloadBidInviterCredentialFile,
    listBidInviterCredentialFiles,
} from '@/api/bid-inviter-credential-file'
import FileDownloadDialog from '@/shared/components/FileDownloadDialog.vue'
import type { ChatMessage, Conversation } from '@/types/chat-agent'
import type { CredentialFile } from '@/types/credential-file'
import { getErrorMessage } from '@/shared/utils/error'
import {
    markdownDownloadFilename,
    saveBlobFile,
    type FileDownloadKind,
} from '@/shared/utils/download'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

const question = ref('')
const answer = ref('')
const typingAnswer = ref('')
const typingTimer = ref<number | null>(null)
const conversationId = ref<string | null>(null)
const conversations = ref<Conversation[]>([])
const messages = ref<ChatMessage[]>([])
const messageHistoryRef = ref<HTMLElement | null>(null)
const pendingClientMessageId = ref<string | null>(null)
const pendingQuestion = ref<string | null>(null)
const loading = ref(false)
const conversationLoading = ref(false)
const credentialFilesByBidRecordId = ref<Record<number, CredentialFile[]>>({})
const localReferencedBidRecordIds = ref<Record<string, number[]>>({})
const downloadDialogVisible = ref(false)
const downloadRecord = ref<CredentialFile | null>(null)
const downloadingKind = ref<FileDownloadKind | null>(null)
const credentialFileLoads = new Map<number, Promise<void>>()

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
const sidebarWidth = ref(250)

const BID_RECORD_REFERENCE_MARKER = /<!--\s*bid-record-refs\s*:\s*([0-9,\s]+)\s*-->/gi
const VISIBLE_BID_RECORD_ID = /投标记录\s*(?:ID)?\s*(?:[：:]|\s)\s*(\d+)/g

function normalizeBidRecordIds(values: Array<number | string | null | undefined>): number[] {
    const ids: number[] = []
    for (const value of values) {
        const id = typeof value === 'number' ? value : Number(value)
        if (!Number.isInteger(id) || id <= 0 || ids.includes(id)) continue
        ids.push(id)
    }
    return ids.slice(0, 12)
}

/**
 * 新消息优先使用 Java 返回的工具引用；历史消息使用持久化的 Markdown 注释回放。
 * 兼容旧历史的可见“投标记录 ID”文本，历史数据无需迁移也可获得下载入口。
 */
function referencedBidRecordIdsForMessage(message: ChatMessage): number[] {
    const localIds = localReferencedBidRecordIds.value[message.messageId]
    if (localIds) return localIds

    const content = message.content ?? ''
    const ids: Array<number | string> = []
    for (const marker of content.matchAll(BID_RECORD_REFERENCE_MARKER)) {
        ids.push(...marker[1].split(','))
    }
    for (const match of content.matchAll(VISIBLE_BID_RECORD_ID)) {
        ids.push(match[1])
    }
    return normalizeBidRecordIds(ids)
}

async function loadCredentialFilesForBidRecord(bidRecordId: number): Promise<void> {
    if (Object.hasOwn(credentialFilesByBidRecordId.value, bidRecordId)) return
    const existing = credentialFileLoads.get(bidRecordId)
    if (existing) return existing

    const load = listBidInviterCredentialFiles(bidRecordId)
        .then((files) => {
            credentialFilesByBidRecordId.value = {
                ...credentialFilesByBidRecordId.value,
                [bidRecordId]: files,
            }
        })
        .catch(() => {
            // 历史会话可能引用了已删除资料；保持回答可读，不把附件加载失败升级为问答失败。
            credentialFilesByBidRecordId.value = {
                ...credentialFilesByBidRecordId.value,
                [bidRecordId]: [],
            }
        })
        .finally(() => {
            credentialFileLoads.delete(bidRecordId)
        })
    credentialFileLoads.set(bidRecordId, load)
    return load
}

function hydrateCredentialFiles(history: ChatMessage[]): void {
    const ids = normalizeBidRecordIds(history
        .filter((message) => message.role === 'ASSISTANT' && message.status === 'COMPLETED')
        .flatMap(referencedBidRecordIdsForMessage))
    void Promise.all(ids.map(loadCredentialFilesForBidRecord))
}

function credentialFilesForMessage(message: ChatMessage): CredentialFile[] {
    const deduplicated = new Map<number, CredentialFile>()
    for (const bidRecordId of referencedBidRecordIdsForMessage(message)) {
        for (const file of credentialFilesByBidRecordId.value[bidRecordId] ?? []) {
            deduplicated.set(file.fileId, file)
        }
    }
    return [...deduplicated.values()]
}

function availableDownloadKinds(file: CredentialFile): FileDownloadKind[] {
    const kinds: FileDownloadKind[] = []
    if (file.originalStorageStatus === 'STORED'
        && Boolean(file.originalFilePath && file.originalSha256)) {
        kinds.push('original')
    }
    if (file.convertStatus === 'CONVERTED'
        && Boolean(file.markdownFilePath && file.convertedSha256)) {
        kinds.push('markdown')
    }
    return kinds
}

function openDownloadDialog(file: CredentialFile): void {
    if (availableDownloadKinds(file).length === 0 || downloadingKind.value) return
    downloadRecord.value = file
    downloadDialogVisible.value = true
}

async function downloadCredentialFile(kind: FileDownloadKind): Promise<void> {
    const file = downloadRecord.value
    if (!file || !availableDownloadKinds(file).includes(kind) || downloadingKind.value) return

    downloadingKind.value = kind
    try {
        const blob = await downloadBidInviterCredentialFile(file.fileId, kind)
        saveBlobFile({
            blob,
            filename: kind === 'original'
                ? file.originalFilename
                : markdownDownloadFilename(file.originalFilename),
        })
        ElMessage.success(`${kind === 'original' ? '原文件' : '.md'}下载已开始`)
    } catch (error) {
        ElMessage.error(`下载失败: ${getErrorMessage(error, '')}`)
    } finally {
        downloadingKind.value = null
    }
}

function clearDownloadRecord(): void {
    downloadRecord.value = null
}

function isLocalMessage(messageId: string): boolean {
    return messageId.startsWith('local-')
}

function clearTypingTimer(): void {
    if (typingTimer.value !== null) {
        window.clearInterval(typingTimer.value)
        typingTimer.value = null
    }
}

function localMessage(
    role: 'USER' | 'ASSISTANT',
    content: string | null,
    clientMessageId: string,
    status: string,
): ChatMessage {
    return {
        messageId: `local-${clientMessageId}-${role.toLowerCase()}`,
        conversationId: conversationId.value ?? '',
        requestId: clientMessageId,
        clientMessageId,
        role,
        content,
        contentType: role === 'ASSISTANT' ? 'MARKDOWN' : 'TEXT',
        sequenceNo: 0,
        status,
        errorCode: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
}

function updateLocalMessage(
    messageId: string,
    patch: Partial<ChatMessage>,
): void {
    messages.value = messages.value.map((message) =>
        message.messageId === messageId
            ? { ...message, ...patch }
            : message,
    )
}

/** 消息更新后把对话区域滚动到底部，保证最新消息可见。 */
function scrollMessageHistoryToBottom(): void {
    void nextTick(() => {
        const container = messageHistoryRef.value
        if (container) {
            container.scrollTop = container.scrollHeight
        }
    })
}

function createClientMessageId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }
    return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function startNewConversation() {
    if (loading.value || conversationLoading.value) return

    clearTypingTimer()
    conversationLoading.value = true
    try {
        const conversation = await createChatConversation()
        conversationId.value = conversation.conversationId
        conversations.value = [conversation, ...conversations.value]
        messages.value = []
        localReferencedBidRecordIds.value = {}
        void nextTick(scrollMessageHistoryToBottom)
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

async function deleteConversationById(conversationIdToDelete: string) {
    if (loading.value || conversationLoading.value) return

    try {
        await ElMessageBox.confirm(
            '确定删除该会话吗？',
            '删除会话',
            {
                confirmButtonText: '删除',
                cancelButtonText: '取消',
            },
        )
    } catch {
        return
    }

    try {
        clearTypingTimer()
        await deleteChatConversation(conversationIdToDelete)
        conversations.value = conversations.value.filter(
            (c) => c.conversationId !== conversationIdToDelete,
        )
        if (conversationId.value !== conversationIdToDelete) return

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

    clearTypingTimer()
    conversationLoading.value = true
    try {
        const history = await listChatConversationMessages(selectedConversationId)
        conversationId.value = selectedConversationId
        messages.value = history
        hydrateCredentialFiles(history)
        scrollMessageHistoryToBottom()
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
            hydrateCredentialFiles(history)
            scrollMessageHistoryToBottom()
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

/**
 * 打字机效果：把完整回答按字符增量写入本地助手消息，并同步滚动到底部。
 * 完成时 resolve，调用方再回放服务端历史。
 */
function typeAnswer(
    text: string,
    assistantMessageId: string,
): Promise<void> {
    return new Promise((resolve) => {
        clearTypingTimer()
        typingAnswer.value = ''
        let index = 0
        const step = 3
        const intervalMs = 20
        typingTimer.value = window.setInterval(() => {
            index = Math.min(text.length, index + step)
            typingAnswer.value = text.slice(0, index)
            updateLocalMessage(assistantMessageId, {
                content: typingAnswer.value,
                status: index >= text.length ? 'COMPLETED' : 'PROCESSING',
            })
            scrollMessageHistoryToBottom()
            if (index >= text.length) {
                clearTypingTimer()
                resolve()
            }
        }, intervalMs)
    })
}

async function submit() {
    const normalizedQuestion = question.value.trim()
    if (!normalizedQuestion || loading.value || !conversationId.value) return

    // 问题已提交，立即清空输入框，避免用户重复发送。
    question.value = ''
    loading.value = true
    answer.value = ''
    clearTypingTimer()
    if (pendingClientMessageId.value === null
        || pendingQuestion.value !== normalizedQuestion) {
        pendingClientMessageId.value = createClientMessageId()
        pendingQuestion.value = normalizedQuestion
    }

    const activeConversationId = conversationId.value
    const activeClientMessageId = pendingClientMessageId.value
    // 本地乐观追加：用户消息 + 打字机助手消息，避免回答区域整段跳变。
    const localUser = localMessage(
        'USER',
        normalizedQuestion,
        activeClientMessageId,
        'COMPLETED',
    )
    const localAssistant = localMessage(
        'ASSISTANT',
        '',
        activeClientMessageId,
        'PROCESSING',
    )
    messages.value = [
        ...messages.value,
        localUser,
        localAssistant,
    ]
    scrollMessageHistoryToBottom()

    try {
        const response = await askChatAgent({
            conversationId: activeConversationId,
            clientMessageId: activeClientMessageId,
            question: normalizedQuestion,
        })
        answer.value = response.answer
        localReferencedBidRecordIds.value = {
            ...localReferencedBidRecordIds.value,
            [localAssistant.messageId]: normalizeBidRecordIds(
                response.referencedBidRecordIds ?? [],
            ),
        }
        void Promise.all((response.referencedBidRecordIds ?? [])
            .map((id) => loadCredentialFilesForBidRecord(id)))
        if (response.title && activeConversationId) {
            const index = conversations.value.findIndex(
                (c) => c.conversationId === activeConversationId,
            )
            if (index !== -1) {
                conversations.value[index] = {
                    ...conversations.value[index],
                    title: response.title,
                }
            }
        }
        await typeAnswer(response.answer, localAssistant.messageId)
        pendingClientMessageId.value = null
        pendingQuestion.value = null
        try {
            messages.value = await listChatConversationMessages(
                activeConversationId,
            )
            hydrateCredentialFiles(messages.value)
            scrollMessageHistoryToBottom()
        } catch {
            // 回答已经成功返回；历史回放失败不覆盖本次问答结果。
        }
    } catch (error) {
        updateLocalMessage(localAssistant.messageId, {
            content: null,
            status: 'FAILED',
            errorMessage: getErrorMessage(error, '知识问答失败'),
        })
        ElMessage.error(getErrorMessage(error))
    } finally {
        loading.value = false
        clearTypingTimer()
        scrollMessageHistoryToBottom()
    }
}

function startSidebarResize(event: MouseEvent) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth.value
    const onMove = (moveEvent: MouseEvent) => {
        sidebarWidth.value = Math.min(360, Math.max(180, startWidth + moveEvent.clientX - startX))
    }
    const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
}

function renderMarkdown(content: string | null): string {
    if (!content) return ''
    return DOMPurify.sanitize(marked.parse(content, { async: false }) as string)
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

onUnmounted(() => {
    clearTypingTimer()
})
</script>

<template>
    <el-card class="chat-agent-panel" shadow="never">
        <div class="chat-layout">
            <aside class="conversation-sidebar" :style="{ width: sidebarWidth + 'px' }">
                <div class="sidebar-header">
                    <span class="sidebar-title">会话</span>
                    <el-button
                        type="primary"
                        :icon="Plus"
                        size="small"
                        :loading="conversationLoading"
                        :disabled="loading || conversationLoading"
                        @click="startNewConversation"
                    >
                        新建
                    </el-button>
                </div>
                <div class="conversation-list">
                    <div
                        v-for="conversation in conversations"
                        :key="conversation.conversationId"
                        class="conversation-item"
                        :class="{ 'is-active': conversation.conversationId === conversationId }"
                        @click="selectConversation(conversation.conversationId)"
                    >
                        <span class="conversation-item-title">{{ conversation.title }}</span>
                        <el-button
                            class="conversation-item-delete"
                            :icon="Delete"
                            size="small"
                            text
                            @click.stop="deleteConversationById(conversation.conversationId)"
                        />
                    </div>
                    <div v-if="!conversations.length" class="conversation-empty">
                        暂无会话
                    </div>
                </div>
            </aside>

            <div class="sidebar-resizer" @mousedown.prevent="startSidebarResize" />

            <div class="chat-main">
                <div class="chat-header">
                    <div class="chat-header-title">
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
                                size="small"
                                class="title-action"
                                @click="saveTitle"
                            />
                            <el-button
                                :icon="Close"
                                size="small"
                                class="title-action"
                                @click="cancelEditingTitle"
                            />
                        </template>
                        <template v-else>
                            <span class="chat-header-name">{{ currentTitle }}</span>
                            <el-button
                                :icon="EditPen"
                                size="small"
                                text
                                class="title-action"
                                @click="startEditingTitle"
                            />
                        </template>
                    </div>
                    <p class="chat-header-subtitle">
                        可随时询问公共知识、任意投标记录及其对应资信材料。
                    </p>
                </div>

        <div
            v-if="messages.length > 0"
            ref="messageHistoryRef"
            class="message-history"
        >
            <div
                v-for="message in messages"
                :key="message.messageId"
                class="message-item"
                :class="message.role === 'USER' ? 'user-message' : 'assistant-message'"
            >
                <div class="message-role">
                    {{ message.role === 'USER' ? '我' : '助手' }}
                </div>
                <div
                    v-if="message.role === 'USER'"
                    class="message-content"
                >
                    {{ message.content || (message.status === 'PROCESSING' ? '处理中...' : '暂无内容') }}
                </div>
                <div v-else class="message-content">
                    <template v-if="isLocalMessage(message.messageId)">
                        <span class="typing-content">
                            {{ message.status === 'FAILED'
                                ? (message.errorMessage || '回答失败')
                                : (message.content || '正在输入...') }}
                        </span>
                        <span
                            v-if="message.status === 'PROCESSING'"
                            class="typing-caret"
                        >▍</span>
                    </template>
                    <div
                        v-else
                        class="markdown-body"
                        v-html="renderMarkdown(
                            message.status === 'FAILED'
                                ? (message.errorMessage || '回答失败')
                                : (message.content || (message.status === 'PROCESSING' ? '处理中...' : '暂无内容')),
                        )"
                    />
                    <div
                        v-if="message.status === 'COMPLETED'
                            && credentialFilesForMessage(message).length"
                        class="message-credential-files"
                    >
                        <div class="credential-files-heading">
                            <span>相关资信材料</span>
                            <span class="credential-files-records">
                                投标记录 {{ referencedBidRecordIdsForMessage(message).join('、') }}
                            </span>
                        </div>
                        <div
                            v-for="file in credentialFilesForMessage(message)"
                            :key="file.fileId"
                            class="credential-file-reference"
                        >
                            <span class="credential-file-name" :title="file.originalFilename">
                                {{ file.originalFilename }}
                            </span>
                            <span
                                v-if="availableDownloadKinds(file).length === 0"
                                class="credential-file-pending"
                            >
                                文件处理中
                            </span>
                            <el-button
                                v-else
                                class="credential-file-download"
                                text
                                type="primary"
                                size="small"
                                :icon="Download"
                                :disabled="Boolean(downloadingKind)"
                                title="下载文件"
                                aria-label="下载文件"
                                @click="openDownloadDialog(file)"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="answer && messages.length === 0" class="answer-section">
            <div class="answer-label">回答</div>
            <div class="answer-content markdown-body" v-html="renderMarkdown(answer)" />
        </div>

        <div class="composer">
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
        </div>
            </div>
        </div>
    </el-card>

    <FileDownloadDialog
        v-model="downloadDialogVisible"
        :filename="downloadRecord?.originalFilename ?? null"
        :available-kinds="downloadRecord ? availableDownloadKinds(downloadRecord) : []"
        :downloading-kind="downloadingKind"
        @select="downloadCredentialFile"
        @closed="clearDownloadRecord"
    />
</template>

<style scoped>
.chat-agent-panel {
    max-width: 1200px;
    margin: 20px auto 0;
    height: auto;
    min-height: min(480px, calc(100vh - 140px));
    max-height: min(680px, calc(100vh - 140px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--lc-border);
    border-radius: var(--lc-radius-lg);
    background: var(--lc-surface);
    box-shadow: var(--lc-shadow-sm);
}

.chat-agent-panel :deep(.el-card__body) {
    padding: 0;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}

.chat-layout {
    display: flex;
    flex: 1;
    min-height: 0;
}

.conversation-sidebar {
    display: flex;
    flex-direction: column;
    width: 250px;
    flex-shrink: 0;
    padding: 16px 12px;
    background: var(--lc-surface-muted);
    border-right: 1px solid var(--lc-border);
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 0 4px;
}

.sidebar-title {
    color: var(--lc-text-secondary);
    font-size: 13px;
    font-weight: 600;
}

.conversation-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    overflow-y: auto;
}

.conversation-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border-radius: 10px;
    color: var(--lc-text);
    font-size: 13px;
    cursor: pointer;
    transition:
        background-color 0.15s ease,
        color 0.15s ease;
}

.conversation-item:hover {
    background: var(--lc-accent-soft);
}

.conversation-item.is-active {
    background: var(--lc-accent);
    color: #ffffff;
}

.conversation-item-title {
    display: block;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-item-delete {
    visibility: hidden;
    flex-shrink: 0;
}

.conversation-item:hover .conversation-item-delete,
.conversation-item.is-active .conversation-item-delete {
    visibility: visible;
}

.conversation-item.is-active .conversation-item-delete {
    color: rgba(255, 255, 255, 0.85);
}

.conversation-empty {
    padding: 16px 8px;
    color: var(--lc-text-muted);
    font-size: 12px;
    text-align: center;
}

.chat-main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
}

.chat-header {
    padding: 16px 24px 12px;
    border-bottom: 1px solid var(--lc-border);
    flex-shrink: 0;
}

.chat-header-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.chat-header-name {
    margin: 0;
    color: var(--lc-text);
    font-size: 16px;
    font-weight: 650;
}

.chat-header-subtitle {
    margin: 6px 0 0;
    color: var(--lc-text-secondary);
    font-size: 12px;
}

.title-input {
    max-width: 320px;
}

.title-action {
    margin-left: 2px;
}

.message-history {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 16px 24px;
    overflow-y: auto;
}

.message-item {
    max-width: 82%;
    animation: lc-message-in 0.25s ease both;
}

.message-role {
    margin-bottom: 5px;
    font-size: 11px;
    font-weight: 500;
    opacity: 0.75;
}

.message-content {
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
}

.user-message {
    align-self: flex-end;
    text-align: left;
}

.user-message .message-content {
    padding: 10px 14px;
    border-radius: 14px 14px 4px 14px;
    background: var(--lc-accent);
    color: #ffffff;
}

.user-message .message-role {
    color: var(--lc-accent-strong);
}

.assistant-message {
    align-self: flex-start;
}

.assistant-message .message-content {
    padding: 10px 14px;
    border-radius: 14px 14px 14px 4px;
    background: var(--lc-surface-muted);
    border: 1px solid var(--lc-border);
    color: var(--lc-text);
}

.assistant-message .message-role {
    color: var(--lc-text-secondary);
}

.message-credential-files {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--lc-border);
    white-space: normal;
}

.credential-files-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    color: var(--lc-text-secondary);
    font-size: 12px;
    font-weight: 600;
}

.credential-files-records {
    color: var(--lc-text-muted);
    font-size: 11px;
    font-weight: 400;
}

.credential-file-reference {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 6px;
    padding: 6px 8px;
    border-radius: var(--lc-radius-sm);
    background: var(--lc-surface);
}

.credential-file-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--lc-text);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.credential-file-pending {
    flex: 0 0 auto;
    color: var(--lc-text-muted);
    font-size: 11px;
}

.credential-file-download {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    margin: 0 !important;
    padding: 0;
}

.sidebar-resizer {
    width: 5px;
    flex-shrink: 0;
    cursor: col-resize;
    background: transparent;
    transition: background-color 0.15s ease;
}

.sidebar-resizer:hover {
    background: var(--lc-accent-soft);
}

.composer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0;
    padding: 12px 24px 16px;
    border-top: 1px solid var(--lc-border);
    flex-shrink: 0;
}

.composer :deep(.el-textarea__inner) {
    color: var(--lc-text);
    /* 保证拖拽缩小时仍至少容纳一行输入文字及必要的内边距。 */
    min-height: max(36px, 1.5em);
    resize: vertical;
}

.panel-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    flex-shrink: 0;
}

.shortcut-tip {
    color: var(--lc-text-muted);
    font-size: 12px;
}

.answer-section {
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid var(--lc-border);
}

.answer-label {
    margin-bottom: 8px;
    color: var(--lc-text-secondary);
    font-size: 13px;
    font-weight: 600;
}

.answer-content {
    padding: 12px 14px;
    font-size: 14px;
    border-radius: var(--lc-radius-md);
    background: var(--lc-surface-muted);
    border: 1px solid var(--lc-border);
    color: var(--lc-text);
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
}

.markdown-body {
    font-size: 14px;
    line-height: 1.55;
    word-break: break-word;
}

.markdown-body > :first-child {
    margin-top: 0;
}

.markdown-body > :last-child {
    margin-bottom: 0;
}

.typing-content {
    white-space: pre-wrap;
}

.typing-caret {
    display: inline-block;
    margin-left: 1px;
    color: inherit;
    animation: lc-caret-blink 0.9s steps(2, start) infinite;
}

@keyframes lc-caret-blink {
    0%,
    49% {
        opacity: 1;
    }
    50%,
    100% {
        opacity: 0;
    }
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4 {
    margin: 12px 0 6px;
    font-weight: 650;
    line-height: 1.3;
}

.markdown-body h1 { font-size: 16px; }
.markdown-body h2 { font-size: 15px; }
.markdown-body h3 { font-size: 14px; }
.markdown-body h4 { font-size: 14px; }

.markdown-body p {
    margin: 5px 0;
}

.markdown-body ul,
.markdown-body ol {
    margin: 5px 0;
    padding-left: 22px;
}

.markdown-body li + li {
    margin-top: 3px;
}

.markdown-body code {
    padding: 2px 5px;
    border-radius: 5px;
    background: rgba(0, 0, 0, 0.06);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
}

.markdown-body pre {
    margin: 8px 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--lc-surface-muted);
    border: 1px solid var(--lc-border);
    overflow-x: auto;
}

.markdown-body pre code {
    padding: 0;
    background: transparent;
}

.markdown-body blockquote {
    margin: 8px 0;
    padding: 2px 12px;
    border-left: 3px solid var(--lc-accent);
    color: var(--lc-text-secondary);
}

.markdown-body table {
    margin: 8px 0;
    border-collapse: collapse;
    width: 100%;
    font-size: 12.5px;
}

.markdown-body th,
.markdown-body td {
    padding: 6px 10px;
    border: 1px solid var(--lc-border);
    text-align: left;
}

.markdown-body th {
    background: var(--lc-surface-muted);
    font-weight: 600;
}

.markdown-body a {
    color: var(--lc-accent);
    text-decoration: none;
}

.markdown-body img {
    max-width: 100%;
    border-radius: 8px;
}

.markdown-body hr {
    margin: 12px 0;
    border: none;
    border-top: 1px solid var(--lc-border);
}

@media (max-width: 600px) {
    .panel-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .shortcut-tip {
        align-self: flex-start;
    }

    .message-item {
        max-width: 92%;
    }
}

@media (max-width: 768px) {
    .sidebar-resizer {
        display: none;
    }

    .chat-layout {
        flex-direction: column;
        min-height: 0;
    }

    .conversation-sidebar {
        width: 100%;
        max-height: 220px;
        padding: 12px;
        border-right: none;
        border-bottom: 1px solid var(--lc-border);
    }

    .conversation-list {
        flex-direction: row;
        overflow-x: auto;
        overflow-y: hidden;
    }

    .conversation-item {
        flex-shrink: 0;
    }

    .chat-main {
        min-height: 480px;
    }
}
</style>
