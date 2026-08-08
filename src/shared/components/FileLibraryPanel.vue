<script setup lang="ts" generic="Row extends { originalFilename: string; createdAt?: string | null }">
/**
 * 通用文件面板：多选/批量上传/移除 + 生命周期列表。
 *
 * 由招标方知识文件面板抽离而来，通过适配器 Props 接入不同业务：
 * - 知识文件：上传后转换 + 向量化，支持重试、删除（向量 + 对象 + 软删记录）；
 * - 资信文件：上传后转换 Markdown，支持删除（对象 + 软删记录）。
 *
 * 组件内部管理选择文件、乐观占位、列表加载与分页；业务差异（接口、鉴权、
 * 状态列、详情字段、状态事件订阅）全部通过 Props 注入，调用方只需做展示适配。
 */
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    Close,
    Delete,
    Document,
    DocumentAdd,
    Download,
    QuestionFilled,
    RefreshRight,
    Upload,
} from '@element-plus/icons-vue'
import CloudUploadIcon from '@/shared/components/icons/CloudUploadIcon.vue'
import DetailDialog, {
    type DetailField,
} from '@/shared/components/DetailDialog.vue'
import { getErrorMessage } from '@/shared/utils/error'
import {
    enumLabel,
    enumOptions,
    type EnumFieldKey,
} from '@/shared/utils/dict'
import type { ElementTagType } from '@/shared/utils/el-tag'
import { formatTime } from '@/shared/utils/format'
import {
    saveBlobFile,
    type DownloadedFile,
    type FileDownloadKind,
} from '@/shared/utils/download'

/** 表格中的固定状态列（字典 + 颜色 + 图例说明）。 */
export interface StatusColumn<Row> {
    label: string
    width?: number
    value: (row: Row) => string | null | undefined
    dict: EnumFieldKey
    typeMap: Record<string, ElementTagType>
    descMap: Record<string, string>
}

/** 上传接口返回结果：失败文件名列表用于提示，未返回视为全部成功。 */
export interface UploadOutcome {
    failedNames?: string[]
}

const props = withDefaults(defineProps<{
    title: string
    description: string
    /** 分页加载列表；返回 {list,total}，调用方可自行包装非分页接口。 */
    listApi: (page: number, pageSize: number) => Promise<{ list: Row[]; total: number }>
    /** 批量上传选中的文件；resolve 后组件会刷新列表并提示。 */
    uploadApi: (files: File[], username: string) => Promise<UploadOutcome | void>
    /** 删除一个文件（后端幂等续删，失败提示"删除失败"）。 */
    deleteApi: (row: Row) => Promise<void>
    /** 可选：按失败点重试（资信文件无重试接口时不传）。 */
    retryApi?: (row: Row) => Promise<unknown>
    /** 可选：只有满足业务失败条件的行才显示重试图标。 */
    retryableChecker?: (row: Row) => boolean
    /** 获取当前登录用户名；缺失时上传被拦截。 */
    getUsername: () => string | null
    rowKey: (row: Row) => string
    /** 乐观占位记录（上传请求进行中插入列表顶部）。 */
    buildPendingRow: (file: File) => Row
    isPendingRow: (row: Row) => boolean
    detailFields: (row: Row) => DetailField[]
    /** 状态列（含图例）；不传则不显示状态列。 */
    statusColumns?: StatusColumn<Row>[]
    /** 判断一行是否仍在处理中；上传/加载后自动轮询直到状态收敛。 */
    inProgressChecker?: (row: Row) => boolean
    /** 可选：订阅后端状态事件；传入后不启动定时轮询。 */
    subscribeUpdates?: (onUpdate: () => void) => () => void
    /** 可选：下载已确认落库的原始文件或已转换的 Markdown 文件。 */
    downloadApi?: (row: Row, kind: FileDownloadKind) => Promise<DownloadedFile>
    /** 判断下载按钮是否应显示；后端仍会再次校验文件状态和权限。 */
    downloadableChecker?: (row: Row, kind: FileDownloadKind) => boolean
    /** 额外值列（如知识文件的内容片段数）。 */
    extraColumn?: {
        label: string
        width?: number
        value: (row: Row) => string | number | null | undefined
    }
    accept?: string
    /** 嵌入模式：不渲染 el-card 外壳与标题区（如弹窗内复用）。 */
    embedded?: boolean
    dropzoneTitle?: string
    dropzoneHint?: string
    confirmDeleteText?: (row: Row) => string
    emptyText?: string
}>(), {
    retryApi: undefined,
    retryableChecker: undefined,
    statusColumns: () => [],
    inProgressChecker: undefined,
    subscribeUpdates: undefined,
    downloadApi: undefined,
    downloadableChecker: undefined,
    extraColumn: undefined,
    accept: '',
    embedded: false,
    dropzoneTitle: '点击选择文件',
    dropzoneHint: '支持多个文件；选择后点击统一上传',
    confirmDeleteText: undefined,
    emptyText: '还没有文件',
})

const pageSize = 10
const page = ref(1)
const total = ref(0)
const records = shallowRef<Row[]>([])
const listLoading = ref(false)
const retryingKey = ref('')
const deletingKey = ref('')
const downloadingKey = ref('')

const detailVisible = ref(false)
const detailRecord = shallowRef<Row | null>(null)
const downloadDialogVisible = ref(false)
const downloadRecord = shallowRef<Row | null>(null)

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const uploadingKeys = ref<Set<string>>(new Set())

let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollCount = 0
let unsubscribeUpdates: (() => void) | null = null
const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 30

function hasInProgressRows(): boolean {
    if (!props.inProgressChecker) return false
    return records.value.some(props.inProgressChecker)
}

async function runPoll() {
    if (pollTimer) {
        clearTimeout(pollTimer)
        pollTimer = null
    }
    if (!props.inProgressChecker || pollCount >= MAX_POLLS) return
    pollCount += 1
    await loadRecords()
    if (hasInProgressRows() && pollCount < MAX_POLLS) {
        pollTimer = setTimeout(() => {
            void runPoll()
        }, POLL_INTERVAL_MS)
    }
}

/** 发现仍有处理中的行时，定时刷新列表直到状态收敛（如转换中→已转换）。 */
function pollUntilSettled() {
    // 已接入 SSE 时由后端状态事件驱动刷新，不再启动轮询。
    if (props.subscribeUpdates) return
    if (!props.inProgressChecker || !hasInProgressRows()) return
    pollCount = 0
    void runPoll()
}

function fileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`
}

function mergeUnique(current: File[], incoming: File[]): File[] {
    const seen = new Set(current.map(fileKey))
    const merged = [...current]
    for (const file of incoming) {
        const key = fileKey(file)
        if (!seen.has(key)) {
            seen.add(key)
            merged.push(file)
        }
    }
    return merged
}

function selectFiles(event: Event) {
    const input = event.target as HTMLInputElement
    const incoming = Array.from(input.files ?? [])
    if (incoming.length === 0) return
    selectedFiles.value = mergeUnique(selectedFiles.value, incoming)
    if (input) input.value = ''
    if (selectedFiles.value.length > 0) {
        void loadRecords()
    }
}

function openFilePicker() {
    fileInput.value?.click()
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function uploadSelectedFiles() {
    if (selectedFiles.value.length === 0 || uploadingKeys.value.size > 0) return
    const username = props.getUsername()
    if (!username) {
        ElMessage.error('当前登录信息缺失，请重新登录')
        return
    }
    const files = [...selectedFiles.value]
    const keys = files.map(fileKey)
    const tempRows = files.map(props.buildPendingRow)
    selectedFiles.value = []
    if (fileInput.value) fileInput.value.value = ''
    records.value = [...tempRows, ...records.value]
    void performUpload(files, keys, tempRows, username)
}

async function performUpload(
    files: File[],
    keys: string[],
    tempRows: Row[],
    username: string,
) {
    keys.forEach((key) => uploadingKeys.value.add(key))
    try {
        const outcome = await props.uploadApi(files, username)
        await loadRecords()
        pollUntilSettled()
        const failedNames = outcome?.failedNames ?? []
        if (failedNames.length > 0) {
            ElMessage.warning(`${failedNames.join('、')} 处理失败，可在列表中重试`)
        } else {
            ElMessage.success(`已上传 ${files.length} 个文件`)
        }
    } catch (error) {
        const tempRowKeys = new Set(tempRows.map(props.rowKey))
        records.value = records.value.filter(
            (item) => !tempRowKeys.has(props.rowKey(item)),
        )
        selectedFiles.value = mergeUnique(selectedFiles.value, files)
        ElMessage.error(getErrorMessage(error))
    } finally {
        keys.forEach((key) => uploadingKeys.value.delete(key))
    }
}

function cancelFile(file: File) {
    const key = fileKey(file)
    selectedFiles.value = selectedFiles.value.filter(
        (item) => fileKey(item) !== key,
    )
    if (selectedFiles.value.length === 0 && fileInput.value) {
        fileInput.value.value = ''
    }
}

async function loadRecords() {
    listLoading.value = true
    try {
        const result = await props.listApi(page.value, pageSize)
        records.value = result.list
        total.value = result.total
    } catch (error) {
        ElMessage.error(`加载列表失败: ${getErrorMessage(error, '')}`)
    } finally {
        listLoading.value = false
    }
}

onMounted(() => {
    void loadRecords().then(() => {
        if (props.subscribeUpdates) {
            unsubscribeUpdates = props.subscribeUpdates(() => {
                void loadRecords()
            })
        } else {
            pollUntilSettled()
        }
    })
})

onUnmounted(() => {
    if (pollTimer) {
        clearTimeout(pollTimer)
        pollTimer = null
    }
    unsubscribeUpdates?.()
    unsubscribeUpdates = null
})

function openDetail(row: Row) {
    if (props.isPendingRow(row)) return
    detailRecord.value = row
    detailVisible.value = true
}

function renderTime(value: string | null | undefined): string {
    return value ? formatTime(value) : '-'
}

function renderValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '-'
    return String(value)
}

async function onRetry(row: Row) {
    if (!props.retryApi || !props.retryableChecker?.(row) || retryingKey.value) return
    const key = props.rowKey(row)
    retryingKey.value = key
    try {
        await props.retryApi(row)
        ElMessage.success('重试完成')
        await loadRecords()
    } catch (error) {
        ElMessage.error(`重试失败: ${getErrorMessage(error, '')}`)
    } finally {
        retryingKey.value = ''
    }
}

async function onDelete(row: Row) {
    if (deletingKey.value) return
    const key = props.rowKey(row)
    try {
        await ElMessageBox.confirm(
            props.confirmDeleteText?.(row) ?? '确定删除该文件吗？删除后无法恢复。',
            `删除${props.title}`,
            {
                type: 'warning',
                confirmButtonText: '删除',
                cancelButtonText: '取消',
            },
        )
    } catch {
        return
    }
    deletingKey.value = key
    try {
        await props.deleteApi(row)
        ElMessage.success('删除成功')
        await loadRecords()
    } catch (error) {
        ElMessage.error(`删除失败: ${getErrorMessage(error, '')}`)
    } finally {
        deletingKey.value = ''
    }
}

async function onDownload(row: Row, kind: FileDownloadKind) {
    if (
        !props.downloadApi
        || !props.downloadableChecker?.(row, kind)
        || props.isPendingRow(row)
        || downloadingKey.value
    ) return
    const key = `${props.rowKey(row)}:${kind}`
    downloadingKey.value = key
    try {
        const file = await props.downloadApi(row, kind)
        saveBlobFile(file)
        ElMessage.success(`${kind === 'original' ? '原文件' : 'Markdown'}下载已开始`)
    } catch (error) {
        ElMessage.error(`下载失败: ${getErrorMessage(error, '')}`)
    } finally {
        downloadingKey.value = ''
    }
}

function availableDownloadKinds(row: Row): FileDownloadKind[] {
    if (!props.downloadApi || props.isPendingRow(row)) return []
    return (['original', 'markdown'] as FileDownloadKind[]).filter(
        (kind) => props.downloadableChecker?.(row, kind) === true,
    )
}

function isDownloadingRow(row: Row): boolean {
    return downloadingKey.value.startsWith(`${props.rowKey(row)}:`)
}

function openDownloadDialog(row: Row) {
    if (availableDownloadKinds(row).length === 0 || downloadingKey.value) return
    downloadRecord.value = row
    downloadDialogVisible.value = true
}

function closeDownloadDialog() {
    downloadDialogVisible.value = false
    downloadRecord.value = null
}

function clearDownloadRecord() {
    downloadRecord.value = null
}

function chooseDownload(kind: FileDownloadKind) {
    const row = downloadRecord.value
    if (!row || !availableDownloadKinds(row).includes(kind)) return
    closeDownloadDialog()
    void onDownload(row, kind)
}
</script>

<template>
    <el-card
        v-if="!embedded"
        class="file-library-panel"
        shadow="never"
    >
        <div class="panel-heading">
            <div class="heading-title">
                <span class="heading-icon">
                    <el-icon><DocumentAdd /></el-icon>
                </span>
                <h2>{{ title }}</h2>
            </div>
            <p>{{ description }}</p>
        </div>

        <div
            class="dropzone"
            role="button"
            tabindex="0"
            @click="openFilePicker"
            @keydown.enter="openFilePicker"
        >
            <el-icon class="dropzone-icon"><CloudUploadIcon /></el-icon>
            <div class="dropzone-text">
                <span class="dropzone-title">{{ dropzoneTitle }}</span>
                <span class="dropzone-hint">{{ dropzoneHint }}</span>
            </div>
            <input
                ref="fileInput"
                type="file"
                multiple
                class="hidden-input"
                :accept="accept"
                @change="selectFiles"
            />
        </div>

        <div v-if="selectedFiles.length" class="selected-section">
            <div class="selected-header">
                <span>已选择 {{ selectedFiles.length }} 个文件</span>
                <el-button
                    type="primary"
                    size="small"
                    :icon="Upload"
                    :loading="uploadingKeys.size > 0"
                    :disabled="uploadingKeys.size > 0"
                    @click="uploadSelectedFiles"
                >
                    上传文件
                </el-button>
            </div>
            <ul class="file-list">
                <li v-for="file in selectedFiles" :key="fileKey(file)">
                    <el-icon class="file-icon"><Document /></el-icon>
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    <el-button
                        class="file-remove-button"
                        text
                        type="danger"
                        :icon="Close"
                        :disabled="uploadingKeys.size > 0"
                        title="移除文件"
                        aria-label="移除文件"
                        @click="cancelFile(file)"
                    />
                </li>
            </ul>
        </div>

        <div v-if="records.length" class="history-block">
            <div class="history-title">
                <span>{{ title }}列表</span>
                <el-popover
                    v-if="statusColumns?.length"
                    placement="bottom"
                    :width="300"
                    trigger="click"
                >
                    <template #reference>
                        <el-icon class="header-help"><QuestionFilled /></el-icon>
                    </template>
                    <div class="header-legend">
                        <div class="header-legend-title">状态说明</div>
                        <template v-for="column in statusColumns" :key="column.label">
                            <div class="legend-group-title">{{ column.label }}</div>
                            <div class="header-legend-items">
                                <div
                                    v-for="[value, label] in enumOptions(column.dict)"
                                    :key="value"
                                    class="legend-entry"
                                >
                                    <el-tag
                                        size="small"
                                        disable-transitions
                                        :type="column.typeMap[value] ?? 'info'"
                                    >
                                        {{ label }}
                                    </el-tag>
                                    <span>：{{ column.descMap[value] }}</span>
                                </div>
                            </div>
                        </template>
                    </div>
                </el-popover>
            </div>

            <el-table
                v-loading="listLoading"
                :data="records"
                class="clickable-table"
                :empty-text="emptyText"
                stripe
                @row-click="openDetail"
            >
                <el-table-column prop="originalFilename" label="文件" min-width="260">
                    <template #default="{ row }: { row: Row }">
                        <div class="file-name-cell">
                            <el-button
                                v-if="retryApi && retryableChecker?.(row)"
                                class="file-retry-button"
                                text
                                type="primary"
                                size="small"
                                :icon="RefreshRight"
                                :loading="retryingKey === rowKey(row)"
                                :disabled="Boolean(retryingKey)"
                                title="重试处理"
                                aria-label="重试处理"
                                @click.stop="onRetry(row)"
                            />
                            <span class="file-name-text" :title="row.originalFilename">
                                {{ row.originalFilename }}
                            </span>
                            <el-button
                                v-if="downloadApi"
                                class="file-download-trigger"
                                text
                                type="primary"
                                size="small"
                                :icon="Download"
                                :loading="isDownloadingRow(row)"
                                :disabled="availableDownloadKinds(row).length === 0 || Boolean(downloadingKey)"
                                title="下载文件"
                                aria-label="下载文件"
                                @click.stop="openDownloadDialog(row)"
                            />
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    v-for="column in statusColumns"
                    :key="column.label"
                    :label="column.label"
                    :min-width="column.width"
                    align="center"
                >
                    <template #default="{ row }: { row: Row }">
                        <el-tag
                            size="small"
                            disable-transitions
                            :type="column.typeMap[column.value(row) ?? ''] ?? 'info'"
                        >
                            {{ enumLabel(column.dict, column.value(row)) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column
                    v-if="extraColumn"
                    :label="extraColumn.label"
                    :min-width="extraColumn.width"
                    align="center"
                >
                    <template #default="{ row }: { row: Row }">
                        {{ renderValue(extraColumn.value(row)) }}
                    </template>
                </el-table-column>
                <el-table-column label="创建时间" min-width="160">
                    <template #default="{ row }: { row: Row }">
                        {{ renderTime(row.createdAt) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" min-width="110" align="center">
                    <template #default="{ row }: { row: Row }">
                        <el-button
                            size="small"
                            type="danger"
                            plain
                            :icon="Delete"
                            :loading="deletingKey === rowKey(row)"
                            :disabled="isPendingRow(row) || Boolean(deletingKey)"
                            @click.stop="onDelete(row)"
                        >
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="page-pagination">
                <el-pagination
                    background
                    layout="total, prev, pager, next"
                    :total="total"
                    :page-size="pageSize"
                    :current-page="page"
                    @current-change="(value: number) => { page = value; void loadRecords() }"
                />
            </div>
        </div>

        <DetailDialog
            v-model="detailVisible"
            :title="`${title}详情`"
            :fields="detailRecord ? detailFields(detailRecord) : []"
        />
    </el-card>

    <div v-else class="file-library-panel embedded">
        <div
            class="dropzone"
            role="button"
            tabindex="0"
            @click="openFilePicker"
            @keydown.enter="openFilePicker"
        >
            <el-icon class="dropzone-icon"><CloudUploadIcon /></el-icon>
            <div class="dropzone-text">
                <span class="dropzone-title">{{ dropzoneTitle }}</span>
                <span class="dropzone-hint">{{ dropzoneHint }}</span>
            </div>
            <input
                ref="fileInput"
                type="file"
                multiple
                class="hidden-input"
                :accept="accept"
                @change="selectFiles"
            />
        </div>

        <div v-if="selectedFiles.length" class="selected-section">
            <div class="selected-header">
                <span>已选择 {{ selectedFiles.length }} 个文件</span>
                <el-button
                    type="primary"
                    size="small"
                    :icon="Upload"
                    :loading="uploadingKeys.size > 0"
                    :disabled="uploadingKeys.size > 0"
                    @click="uploadSelectedFiles"
                >
                    上传文件
                </el-button>
            </div>
            <ul class="file-list">
                <li v-for="file in selectedFiles" :key="fileKey(file)">
                    <el-icon class="file-icon"><Document /></el-icon>
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    <el-button
                        class="file-remove-button"
                        text
                        type="danger"
                        :icon="Close"
                        :disabled="uploadingKeys.size > 0"
                        title="移除文件"
                        aria-label="移除文件"
                        @click="cancelFile(file)"
                    />
                </li>
            </ul>
        </div>

        <div v-if="records.length" class="history-block">
            <div class="history-title">
                <span>{{ title }}列表</span>
                <el-popover
                    v-if="statusColumns?.length"
                    placement="bottom"
                    :width="300"
                    trigger="click"
                >
                    <template #reference>
                        <el-icon class="header-help"><QuestionFilled /></el-icon>
                    </template>
                    <div class="header-legend">
                        <div class="header-legend-title">状态说明</div>
                        <template v-for="column in statusColumns" :key="column.label">
                            <div class="legend-group-title">{{ column.label }}</div>
                            <div class="header-legend-items">
                                <div
                                    v-for="[value, label] in enumOptions(column.dict)"
                                    :key="value"
                                    class="legend-entry"
                                >
                                    <el-tag
                                        size="small"
                                        disable-transitions
                                        :type="column.typeMap[value] ?? 'info'"
                                    >
                                        {{ label }}
                                    </el-tag>
                                    <span>：{{ column.descMap[value] }}</span>
                                </div>
                            </div>
                        </template>
                    </div>
                </el-popover>
            </div>

            <el-table
                v-loading="listLoading"
                :data="records"
                class="clickable-table"
                :empty-text="emptyText"
                stripe
                @row-click="openDetail"
            >
                <el-table-column prop="originalFilename" label="文件" min-width="240">
                    <template #default="{ row }: { row: Row }">
                        <div class="file-name-cell">
                            <el-button
                                v-if="retryApi && retryableChecker?.(row)"
                                class="file-retry-button"
                                text
                                type="primary"
                                size="small"
                                :icon="RefreshRight"
                                :loading="retryingKey === rowKey(row)"
                                :disabled="Boolean(retryingKey)"
                                title="重试处理"
                                aria-label="重试处理"
                                @click.stop="onRetry(row)"
                            />
                            <span class="file-name-text" :title="row.originalFilename">
                                {{ row.originalFilename }}
                            </span>
                            <el-button
                                v-if="downloadApi"
                                class="file-download-trigger"
                                text
                                type="primary"
                                size="small"
                                :icon="Download"
                                :loading="isDownloadingRow(row)"
                                :disabled="availableDownloadKinds(row).length === 0 || Boolean(downloadingKey)"
                                title="下载文件"
                                aria-label="下载文件"
                                @click.stop="openDownloadDialog(row)"
                            />
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    v-for="column in statusColumns"
                    :key="column.label"
                    :label="column.label"
                    :min-width="column.width"
                    align="center"
                >
                    <template #default="{ row }: { row: Row }">
                        <el-tag
                            size="small"
                            disable-transitions
                            :type="column.typeMap[column.value(row) ?? ''] ?? 'info'"
                        >
                            {{ enumLabel(column.dict, column.value(row)) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column
                    v-if="extraColumn"
                    :label="extraColumn.label"
                    :min-width="extraColumn.width"
                    align="center"
                >
                    <template #default="{ row }: { row: Row }">
                        {{ renderValue(extraColumn.value(row)) }}
                    </template>
                </el-table-column>
                <el-table-column label="创建时间" min-width="160">
                    <template #default="{ row }: { row: Row }">
                        {{ renderTime(row.createdAt) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" min-width="110" align="center">
                    <template #default="{ row }: { row: Row }">
                        <el-button
                            size="small"
                            type="danger"
                            plain
                            :icon="Delete"
                            :loading="deletingKey === rowKey(row)"
                            :disabled="isPendingRow(row) || Boolean(deletingKey)"
                            @click.stop="onDelete(row)"
                        >
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="page-pagination">
                <el-pagination
                    background
                    layout="total, prev, pager, next"
                    :total="total"
                    :page-size="pageSize"
                    :current-page="page"
                    @current-change="(value: number) => { page = value; void loadRecords() }"
                />
            </div>
        </div>

        <DetailDialog
            v-model="detailVisible"
            :title="`${title}详情`"
            :fields="detailRecord ? detailFields(detailRecord) : []"
        />
    </div>

    <el-dialog
        v-model="downloadDialogVisible"
        title="选择下载文件"
        width="360px"
        destroy-on-close
        @closed="clearDownloadRecord"
    >
        <div v-if="downloadRecord" class="download-dialog-content">
            <div class="download-dialog-filename" :title="downloadRecord.originalFilename">
                {{ downloadRecord.originalFilename }}
            </div>
            <div class="download-dialog-options">
                <el-button
                    v-if="availableDownloadKinds(downloadRecord).includes('original')"
                    type="primary"
                    plain
                    :icon="Download"
                    :loading="downloadingKey === `${rowKey(downloadRecord)}:original`"
                    @click="chooseDownload('original')"
                >
                    下载原文件
                </el-button>
                <el-button
                    v-if="availableDownloadKinds(downloadRecord).includes('markdown')"
                    type="primary"
                    plain
                    :icon="Download"
                    :loading="downloadingKey === `${rowKey(downloadRecord)}:markdown`"
                    @click="chooseDownload('markdown')"
                >
                    下载.md
                </el-button>
            </div>
        </div>
        <template #footer>
            <el-button @click="closeDownloadDialog">取消</el-button>
        </template>
    </el-dialog>
</template>

<style scoped>
.file-library-panel {
    border: 1px solid var(--lc-border);
    border-radius: var(--lc-radius-lg);
    background: var(--lc-surface);
    box-shadow: var(--lc-shadow-sm);
}

.file-library-panel :deep(.el-card__body) {
    padding: 24px;
}

.file-library-panel.embedded {
    width: 100%;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
}

.file-library-panel.embedded .dropzone {
    padding: 18px 20px;
}

.file-library-panel.embedded .selected-section {
    margin-top: 12px;
}

.file-library-panel.embedded .history-block {
    margin-top: 22px;
}

.file-library-panel.embedded .history-title {
    margin-bottom: 12px;
    font-size: 15px;
}

.file-name-cell {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 6px;
}

.file-name-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.file-download-trigger {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    margin: 0 !important;
    padding: 0;
}

.file-retry-button {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    margin: 0 !important;
    padding: 0;
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
    font-size: 16px;
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
    font-size: 20px;
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

.selected-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
    padding: 12px 14px;
    border: 1px solid var(--lc-border);
    border-radius: var(--lc-radius-sm);
    background: var(--lc-surface);
}

.file-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    margin: 0;
    padding: 0;
    list-style: none;
}

.file-list li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--lc-radius-sm);
    background: var(--lc-surface-muted);
}

.selected-header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    color: var(--lc-text-secondary);
    font-size: 13px;
    font-weight: 600;
}

.selected-header > span {
    margin-right: auto;
}

.file-remove-button {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    margin: 0 !important;
    padding: 0;
    font-size: 16px;
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

.history-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    color: var(--lc-text);
    font-size: 14px;
    font-weight: 600;
}

.history-block {
    margin-top: 24px;
}

.header-help {
    color: var(--lc-accent);
    font-size: 14px;
    cursor: pointer;
}

.legend-group-title {
    margin: 2px 0;
    color: var(--lc-text-muted);
    font-size: 12px;
    font-weight: 600;
}

.page-pagination {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
}

/* 操作列按钮统一横向排列，避免在窄列中上下堆叠 */
:deep(.el-table__body td:last-child) {
    padding: 8px 6px;
}

:deep(.el-table__body td:last-child .cell) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    white-space: nowrap;
}

:deep(.el-table__body td:last-child .el-button) {
    min-width: 0;
    margin: 0 !important;
    padding-left: 8px;
    padding-right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

:deep(.el-table__body td:nth-last-child(2) .cell) {
    white-space: nowrap;
}

.download-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.download-dialog-filename {
    overflow: hidden;
    color: var(--lc-text);
    font-size: 14px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.download-dialog-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.download-dialog-options .el-button {
    width: 100%;
    margin-left: 0;
    justify-content: flex-start;
}

.download-dialog-options .el-button :deep(.el-icon) {
    width: 22px;
    margin-right: 8px;
}
</style>
