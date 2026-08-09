<script setup lang="ts">
/**
 * 招标方知识文件入库面板。
 *
 * 文件选择、统一批量上传、待上传移除、列表、详情、下载和状态刷新均由
 * FileUploadPanel 提供；本文件只映射知识文件 API、鉴权和状态文案。
 */
import FileUploadPanel, {
    type StatusColumn,
    type UploadOutcome,
} from '@/shared/components/FileUploadPanel.vue'
import type { DetailField } from '@/shared/components/DetailDialog.vue'
import {
    deleteKnowledgeFile,
    downloadKnowledgeFile,
    listKnowledgeFiles,
    retryKnowledgeFile,
    subscribeKnowledgeFileEvents,
    uploadKnowledgeFiles,
} from '@/api/knowledge-file'
import { useBidInviterAuth } from '@/composables/useBidInviterAuth'
import {
    KNOWLEDGE_CONVERT_STATUS_DESC,
    KNOWLEDGE_INDEX_STATUS_DESC,
    ORIGINAL_STORAGE_STATUS_DESC,
    enumLabel,
} from '@/shared/utils/dict'
import {
    KNOWLEDGE_CONVERT_STATUS_TYPE,
    KNOWLEDGE_INDEX_STATUS_TYPE,
    ORIGINAL_STORAGE_STATUS_TYPE,
} from '@/shared/utils/el-tag'
import { displayOrDash, formatTime } from '@/shared/utils/format'
import type { KnowledgeFileRecord } from '@/types/knowledge-file'
import {
    markdownDownloadFilename,
    type DownloadedFile,
    type FileDownloadKind,
} from '@/shared/utils/download'

const { account } = useBidInviterAuth()

function getUsername(): string | null {
    return account.value?.username ?? null
}

const statusColumns: StatusColumn<KnowledgeFileRecord>[] = [
    {
        label: '原文件存储',
        width: 120,
        value: (row) => row.originalStorageStatus,
        dict: 'originalStorageStatus',
        typeMap: ORIGINAL_STORAGE_STATUS_TYPE,
        descMap: ORIGINAL_STORAGE_STATUS_DESC,
    },
    {
        label: '.md 转换状态',
        width: 110,
        value: (row) => row.convertStatus,
        dict: 'knowledgeConvertStatus',
        typeMap: KNOWLEDGE_CONVERT_STATUS_TYPE,
        descMap: KNOWLEDGE_CONVERT_STATUS_DESC,
    },
    {
        label: '向量化状态',
        width: 110,
        value: (row) => row.indexStatus,
        dict: 'knowledgeIndexStatus',
        typeMap: KNOWLEDGE_INDEX_STATUS_TYPE,
        descMap: KNOWLEDGE_INDEX_STATUS_DESC,
    },
]

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function detailFields(row: KnowledgeFileRecord): DetailField[] {
    return [
        { label: '文档编号', value: row.documentUuid },
        { label: '文件名称', value: row.originalFilename },
        { label: '文件类型', value: displayOrDash(row.contentType) },
        { label: '文件大小', value: formatFileSize(row.fileSize) },
        { label: '存储介质', value: enumLabel('storageType', row.storageType) },
        { label: '原文件存储状态', value: enumLabel('originalStorageStatus', row.originalStorageStatus) },
        { label: '原始文件路径', value: displayOrDash(row.originalFilePath) },
        { label: 'Markdown 路径', value: displayOrDash(row.markdownFilePath) },
        { label: '原始文件 SHA-256', value: displayOrDash(row.originalSha256) },
        { label: 'Markdown SHA-256', value: displayOrDash(row.convertedSha256) },
        { label: '.md 转换状态', value: enumLabel('knowledgeConvertStatus', row.convertStatus) },
        { label: '向量化状态', value: enumLabel('knowledgeIndexStatus', row.indexStatus) },
        { label: '内容片段数', value: row.chunkCount ?? '-' },
        { label: '失败阶段', value: enumLabel('knowledgeErrorStage', row.errorStage) },
        { label: '失败原因', value: displayOrDash(row.errorMessage) },
        { label: '创建时间', value: formatTime(row.createdAt) },
        { label: '.md 转换完成时间', value: formatTime(row.convertedAt) },
        { label: '入库完成时间', value: formatTime(row.indexedAt) },
    ]
}

function buildPendingRow(file: File): KnowledgeFileRecord {
    return {
        knowledgeFileId: -1,
        documentUuid: `pending-${file.name}:${file.size}:${file.lastModified}`,
        originalFilename: file.name,
        contentType: file.type || null,
        fileSize: file.size,
        originalSha256: null,
        convertedSha256: null,
        originalStorageStatus: 'STORING',
        storageType: 'MINIO',
        originalFilePath: '',
        markdownFilePath: null,
        convertStatus: 'UPLOADED',
        indexStatus: 'PENDING',
        chunkCount: null,
        errorMessage: null,
        errorStage: null,
        createdAt: new Date().toISOString(),
        convertedAt: null,
        indexedAt: null,
        deletedAt: null,
        deletionStatus: null,
        deletionFailedStage: null,
        deletionErrorMessage: null,
        deletionStartedAt: null,
    }
}

function isPendingRow(row: KnowledgeFileRecord): boolean {
    return row.documentUuid.startsWith('pending-')
}

function isInProgress(row: KnowledgeFileRecord): boolean {
    return row.originalStorageStatus === 'STORING'
        || row.convertStatus === 'UPLOADED'
        || row.convertStatus === 'CONVERTING'
        || row.indexStatus === 'PENDING'
        || row.indexStatus === 'VECTORIZING'
}

function isRetryable(row: KnowledgeFileRecord): boolean {
    return row.convertStatus === 'FAILED' || row.indexStatus === 'FAILED'
}

function isDownloadable(
    row: KnowledgeFileRecord,
    kind: FileDownloadKind,
): boolean {
    if (isPendingRow(row)) return false
    if (kind === 'original') {
        return row.originalStorageStatus === 'STORED'
            && Boolean(row.originalFilePath && row.originalSha256)
    }
    return row.convertStatus === 'CONVERTED'
        && Boolean(row.markdownFilePath && row.convertedSha256)
}

async function downloadFile(
    row: KnowledgeFileRecord,
    kind: FileDownloadKind,
): Promise<DownloadedFile> {
    const blob = await downloadKnowledgeFile(row.documentUuid, kind)
    return {
        blob,
        filename: kind === 'original'
            ? row.originalFilename
            : markdownDownloadFilename(row.originalFilename),
    }
}

async function uploadFiles(
    files: File[],
    username: string,
): Promise<UploadOutcome> {
    const response = await uploadKnowledgeFiles(files, username)
    const failedNames = response.documents
        .filter(
            (item) =>
                item.convertStatus === 'FAILED'
                || item.indexStatus === 'FAILED',
        )
        .map((item) => item.originalFilename)
    return { failedNames }
}
</script>

<template>
    <div class="knowledge-file-panel">
        <FileUploadPanel
            title="知识文件入库"
            description="上传文档后即可用于智能问答知识库"
            :list-api="(page, pageSize) => listKnowledgeFiles({ page, pageSize })"
            :upload-api="uploadFiles"
            :delete-api="(row) => deleteKnowledgeFile(row.documentUuid)"
            :retry-api="(row) => retryKnowledgeFile(row.documentUuid)"
            :retryable-checker="isRetryable"
            :get-username="getUsername"
            :row-key="(row) => row.documentUuid"
            :build-pending-row="buildPendingRow"
            :is-pending-row="isPendingRow"
            :detail-fields="detailFields"
            :status-columns="statusColumns"
            :in-progress-checker="isInProgress"
            :subscribe-updates="subscribeKnowledgeFileEvents"
            :download-api="downloadFile"
            :downloadable-checker="isDownloadable"
            :extra-column="{
                label: '内容片段数',
                width: 100,
                value: (row) => row.chunkCount,
            }"
            dropzone-title="点击选择知识文件"
            dropzone-hint="支持多个文件；选择后点击统一上传"
            :confirm-delete-text="() => '确定删除该知识文件吗？删除后无法恢复。'"
            empty-text="还没有入库的知识文件"
        />
    </div>
</template>

<style scoped>
.knowledge-file-panel {
    margin-top: 20px;
}
</style>
