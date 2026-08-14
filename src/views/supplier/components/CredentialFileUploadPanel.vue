<script setup lang="ts">
/**
 * 投标方资信文件的页面级业务适配器。
 *
 * 文件选择、统一批量上传、待上传移除、列表、详情、下载和状态刷新均由
 * FileUploadPanel 提供；本文件只映射投标记录上下文、资信 API、鉴权和状态文案。
 */
import { uploadBidderCredentialFiles } from '@/api/bidder-bid-record'
import {
    deleteCredentialFile,
    downloadCredentialFile,
    listCredentialFiles,
    subscribeCredentialFileEvents,
} from '@/api/credential-file'
import { useBidderAuth } from '@/composables/useBidderAuth'
import type { DetailField } from '@/shared/components/DetailDialog.vue'
import FileUploadPanel, {
    type StatusColumn,
    type UploadOutcome,
} from '@/shared/components/FileUploadPanel.vue'
import {
    CREDENTIAL_CONVERT_STATUS_DESC,
    CREDENTIAL_INDEX_STATUS_DESC,
    ORIGINAL_STORAGE_STATUS_DESC,
    enumLabel,
} from '@/shared/utils/dict'
import {
    CREDENTIAL_CONVERT_STATUS_TYPE,
    CREDENTIAL_INDEX_STATUS_TYPE,
    ORIGINAL_STORAGE_STATUS_TYPE,
} from '@/shared/utils/el-tag'
import {
    markdownDownloadFilename,
    type DownloadedFile,
    type FileDownloadKind,
} from '@/shared/utils/download'
import { displayOrDash, formatTime } from '@/shared/utils/format'
import type { CredentialFile } from '@/types/credential-file'

const props = withDefaults(defineProps<{
    bidRecordId: number
    embedded?: boolean
    showRecordContext?: boolean
    accept?: string
}>(), {
    embedded: true,
    showRecordContext: false,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html',
})

const { account } = useBidderAuth()

function getUsername(): string | null {
    return account.value?.username ?? null
}

const statusColumns: StatusColumn<CredentialFile>[] = [
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
        width: 100,
        value: (row) => row.convertStatus,
        dict: 'credentialConvertStatus',
        typeMap: CREDENTIAL_CONVERT_STATUS_TYPE,
        descMap: CREDENTIAL_CONVERT_STATUS_DESC,
    },
    {
        label: '向量状态',
        width: 100,
        value: (row) => row.indexStatus,
        dict: 'credentialIndexStatus',
        typeMap: CREDENTIAL_INDEX_STATUS_TYPE,
        descMap: CREDENTIAL_INDEX_STATUS_DESC,
    },
]

function formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function detailFields(row: CredentialFile): DetailField[] {
    return [
        { label: '文件名称', value: row.originalFilename },
        { label: '文件类型', value: displayOrDash(row.contentType) },
        { label: '文件大小', value: formatFileSize(row.fileSize) },
        { label: '存储介质', value: enumLabel('storageType', row.storageType) },
        { label: '原文件存储状态', value: enumLabel('originalStorageStatus', row.originalStorageStatus) },
        { label: '.md 转换状态', value: enumLabel('credentialConvertStatus', row.convertStatus) },
        { label: '向量状态', value: enumLabel('credentialIndexStatus', row.indexStatus) },
        { label: '向量片段数', value: row.chunkCount ?? '-' },
        { label: '失败阶段', value: enumLabel('credentialErrorStage', row.errorStage) },
        { label: '失败原因', value: displayOrDash(row.errorMessage) },
        { label: '创建时间', value: formatTime(row.createdAt) },
        { label: '.md 转换完成时间', value: formatTime(row.convertedAt) },
        { label: '向量化完成时间', value: formatTime(row.indexedAt) },
    ]
}

function buildPendingRow(file: File): CredentialFile {
    return {
        fileId: -1,
        fileUuid: `pending-${file.name}:${file.size}:${file.lastModified}`,
        fileOrder: 0,
        originalFilename: file.name,
        contentType: file.type,
        fileSize: file.size,
        originalSha256: '',
        originalStorageStatus: 'STORING',
        storageType: 'MINIO',
        convertStatus: 'UPLOADED',
        indexStatus: 'PENDING',
        chunkCount: 0,
        createdAt: new Date().toISOString(),
    }
}

function isPendingRow(row: CredentialFile): boolean {
    return row.fileId < 0 || row.fileUuid.startsWith('pending-')
}

function rowKey(row: CredentialFile): string {
    return row.fileUuid || String(row.fileId)
}

function isInProgress(row: CredentialFile): boolean {
    return row.originalStorageStatus === 'STORING'
        || row.convertStatus === 'UPLOADED'
        || row.convertStatus === 'CONVERTING'
        || (row.convertStatus === 'CONVERTED'
            && (row.indexStatus === 'PENDING' || row.indexStatus === 'VECTORIZING'))
}

async function listFiles(page: number, pageSize: number) {
    const all = await listCredentialFiles(props.bidRecordId)
    const start = (page - 1) * pageSize
    return {
        list: all.slice(start, start + pageSize),
        total: all.length,
    }
}

async function uploadFiles(
    files: File[],
    username: string,
): Promise<UploadOutcome> {
    const response = await uploadBidderCredentialFiles(
        files,
        props.bidRecordId,
        username,
    )
    const failedNames = (response.files ?? [])
        .filter((item) => item.convertStatus === 'FAILED')
        .map((item) => item.originalFilename)
    return { failedNames }
}

function deleteFile(row: CredentialFile): Promise<void> {
    return deleteCredentialFile(props.bidRecordId, row.fileId)
}

function subscribeUpdates(onUpdate: () => void): () => void {
    return subscribeCredentialFileEvents(props.bidRecordId, onUpdate)
}

function isDownloadable(
    row: CredentialFile,
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
    row: CredentialFile,
    kind: FileDownloadKind,
): Promise<DownloadedFile> {
    const blob = await downloadCredentialFile(
        props.bidRecordId,
        row.fileId,
        kind,
    )
    return {
        blob,
        filename: kind === 'original'
            ? row.originalFilename
            : markdownDownloadFilename(row.originalFilename),
    }
}
</script>

<template>
    <div class="credential-file-upload-adapter">
        <div v-if="showRecordContext" class="record-context">
            <span class="record-label">投标记录 ID</span>
            <el-input
                class="record-id"
                :model-value="String(bidRecordId)"
                disabled
            />
        </div>

        <FileUploadPanel
            title="资信材料"
            description=""
            :embedded="embedded"
            :accept="accept"
            :list-api="listFiles"
            :upload-api="uploadFiles"
            :delete-api="deleteFile"
            :get-username="getUsername"
            :row-key="rowKey"
            :build-pending-row="buildPendingRow"
            :is-pending-row="isPendingRow"
            :detail-fields="detailFields"
            :status-columns="statusColumns"
            :in-progress-checker="isInProgress"
            :subscribe-updates="subscribeUpdates"
            :download-api="downloadFile"
            :downloadable-checker="isDownloadable"
            dropzone-title="点击选择资信材料"
            dropzone-hint="支持多个文件"
            :confirm-delete-text="() => '确定删除该资信文件吗？删除后无法恢复。'"
            empty-text="还没有上传的资信材料"
        />
    </div>
</template>

<style scoped>
.credential-file-upload-adapter {
    width: 100%;
}

.record-context {
    display: grid;
    grid-template-columns: 96px minmax(0, 240px);
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.record-label {
    color: var(--lc-text-secondary);
    font-size: 14px;
}

.record-id {
    width: 100%;
}

@media (max-width: 480px) {
    .record-context {
        grid-template-columns: 1fr;
        gap: 8px;
    }
}
</style>
