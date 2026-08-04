<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentAdd, UploadFilled } from '@element-plus/icons-vue'
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

async function upload() {
    if (!canUpload.value) return

    uploading.value = true
    try {
        const response = await uploadKnowledgeFiles(selectedFiles.value)
        uploadedDocuments.value = response.documents
        selectedFiles.value = []
        if (fileInput.value) fileInput.value.value = ''
        ElMessage.success(`已完成 ${response.documents.length} 个知识文件的向量化`)
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
                <el-icon class="heading-icon"><DocumentAdd /></el-icon>
                <h2>知识文件入库</h2>
            </div>
            <p>文件将依次完成对象存储、Markdown 转换和向量化</p>
        </div>

        <div class="upload-row">
            <input
                ref="fileInput"
                type="file"
                multiple
                :disabled="uploading"
                @change="selectFiles"
            />
            <el-button
                type="primary"
                :icon="UploadFilled"
                :loading="uploading"
                :disabled="!canUpload"
                @click="upload"
            >
                {{ uploading ? '处理中...' : '上传并向量化' }}
            </el-button>
        </div>

        <ul v-if="selectedFiles.length" class="file-list">
            <li v-for="(file, index) in selectedFiles" :key="`${file.name}-${index}`">
                {{ file.name }}（{{ file.size }} bytes）
            </li>
        </ul>

        <el-table
            v-if="uploadedDocuments.length"
            class="result-table"
            :data="uploadedDocuments"
            size="small"
        >
            <el-table-column prop="originalFilename" label="文件" min-width="180" />
            <el-table-column prop="documentUuid" label="document_uuid" min-width="300" />
            <el-table-column prop="chunkCount" label="Chunks" width="90" />
        </el-table>
    </el-card>
</template>

<style scoped>
.knowledge-file-panel {
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

.upload-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.file-list {
    margin: 14px 0 0;
    padding-left: 20px;
    color: #606266;
    line-height: 1.8;
}

.result-table {
    margin-top: 16px;
}

@media (max-width: 600px) {
    .upload-row {
        align-items: stretch;
        flex-direction: column;
    }
}
</style>
