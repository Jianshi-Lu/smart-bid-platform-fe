<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, DocumentAdd } from '@element-plus/icons-vue'
import CloudUploadIcon from '@/shared/components/icons/CloudUploadIcon.vue'
import { uploadKnowledgeFiles } from '@/api/knowledge-file'
import { getErrorMessage } from '@/shared/utils/error'
import type { KnowledgeFileDocument } from '@/types/knowledge-file'

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const uploadedDocuments = ref<KnowledgeFileDocument[]>([])
const uploading = ref(false)

const canUpload = computed(
    () => selectedFiles.value.length > 0 && !uploading.value,
)

function selectFiles(event: Event) {
    const input = event.target as HTMLInputElement
    selectedFiles.value = Array.from(input.files ?? [])
    uploadedDocuments.value = []
}

function openFilePicker() {
    if (!uploading.value) fileInput.value?.click()
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function upload() {
    if (!canUpload.value) return

    uploading.value = true
    try {
        const response = await uploadKnowledgeFiles(selectedFiles.value)
        uploadedDocuments.value = response.documents
        selectedFiles.value = []
        if (fileInput.value) fileInput.value.value = ''
        ElMessage.success(`已成功入库 ${response.documents.length} 个知识文件`)
    } catch (error) {
        ElMessage.error(getErrorMessage(error))
    } finally {
        uploading.value = false
    }
}
</script>

<template>
    <el-card class="knowledge-file-panel" shadow="never">
        <div class="panel-heading">
            <div class="heading-title">
                <span class="heading-icon">
                    <el-icon><DocumentAdd /></el-icon>
                </span>
                <h2>知识文件入库</h2>
            </div>
            <p>上传文档后即可用于智能问答知识库</p>
        </div>

        <div
            class="dropzone"
            :class="{ 'is-disabled': uploading }"
            role="button"
            tabindex="0"
            @click="openFilePicker"
            @keydown.enter="openFilePicker"
        >
            <el-icon class="dropzone-icon"><CloudUploadIcon /></el-icon>
            <div class="dropzone-text">
                <span class="dropzone-title">点击选择知识文件</span>
                <span class="dropzone-hint">支持多个文件；选择后点击上传</span>
            </div>
            <input
                ref="fileInput"
                type="file"
                multiple
                class="hidden-input"
                :disabled="uploading"
                @change="selectFiles"
            />
            <el-button
                type="primary"
                :icon="CloudUploadIcon"
                :loading="uploading"
                :disabled="!canUpload"
                @click.stop="upload"
            >
                {{ uploading ? '处理中...' : '上传文件' }}
            </el-button>
        </div>

        <ul v-if="selectedFiles.length" class="file-list">
            <li v-for="(file, index) in selectedFiles" :key="`${file.name}-${index}`">
                <el-icon class="file-icon"><Document /></el-icon>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </li>
        </ul>

        <div v-if="uploadedDocuments.length" class="result-block">
            <div class="result-title">入库结果</div>
            <el-table
                class="result-table"
                :data="uploadedDocuments"
                size="small"
            >
                <el-table-column prop="originalFilename" label="文件" min-width="180" />
                <el-table-column prop="documentUuid" label="文档编号" min-width="300" />
                <el-table-column prop="chunkCount" label="内容片段数" width="100" />
            </el-table>
        </div>
    </el-card>
</template>

<style scoped>
.knowledge-file-panel {
    max-width: 1200px;
    margin: 20px auto 0;
    border: 1px solid var(--lc-border);
    border-radius: var(--lc-radius-lg);
    background: var(--lc-surface);
    box-shadow: var(--lc-shadow-sm);
}

.knowledge-file-panel :deep(.el-card__body) {
    padding: 24px;
}

.panel-heading {
    margin-bottom: 18px;
}

.heading-title {
    display: flex;
    align-items: center;
    gap: 10px;
}

.heading-title h2 {
    margin: 0;
    color: var(--lc-text);
    font-size: 19px;
    font-weight: 650;
}

.heading-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: var(--lc-accent-soft);
    color: var(--lc-accent);
    font-size: 18px;
}

.panel-heading p {
    margin: 8px 0 0 44px;
    color: var(--lc-text-secondary);
    font-size: 13px;
}

.dropzone {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px;
    border: 1px dashed var(--lc-border-strong);
    border-radius: var(--lc-radius-md);
    background: var(--lc-surface-muted);
    cursor: pointer;
    transition:
        border-color 0.2s ease,
        background-color 0.2s ease;
}

.dropzone:hover {
    border-color: var(--lc-accent);
    background: var(--lc-accent-soft);
}

.dropzone.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.dropzone-icon {
    color: var(--lc-accent);
    font-size: 28px;
    flex-shrink: 0;
}

.dropzone-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
}

.dropzone-title {
    color: var(--lc-text);
    font-size: 14px;
    font-weight: 600;
}

.dropzone-hint {
    color: var(--lc-text-secondary);
    font-size: 12px;
}

.hidden-input {
    display: none;
}

.file-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
}

.file-list li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid var(--lc-border);
    border-radius: var(--lc-radius-sm);
    background: var(--lc-surface);
}

.file-icon {
    color: var(--lc-accent);
    font-size: 16px;
    flex-shrink: 0;
}

.file-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--lc-text);
    font-size: 13px;
}

.file-size {
    color: var(--lc-text-muted);
    font-size: 12px;
    flex-shrink: 0;
}

.result-block {
    margin-top: 18px;
}

.result-title {
    margin-bottom: 10px;
    color: var(--lc-text-secondary);
    font-size: 13px;
    font-weight: 600;
}

.result-table {
    border: 1px solid var(--lc-border);
    border-radius: var(--lc-radius-md);
    overflow: hidden;
}

.result-table :deep(.el-table__header th) {
    background: var(--lc-surface-muted);
    color: var(--lc-text-secondary);
    font-weight: 600;
}

@media (max-width: 600px) {
    .dropzone {
        align-items: stretch;
        flex-direction: column;
    }

    .dropzone .el-button {
        align-self: flex-start;
    }
}
</style>
