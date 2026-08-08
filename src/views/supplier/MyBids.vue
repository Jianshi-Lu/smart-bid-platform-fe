<script setup lang="ts">
/**
 * 投标方"我的投标"页(/supplier/my-bids)。
 *
 * 展示当前登录账号的全部投标记录；支持查看详情、编辑、删除，
 * 详情弹窗内可继续上传资信材料（走登录鉴权接口，归属自动校验）。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    CaretBottom,
    CaretTop,
    Delete,
    Edit,
    FolderOpened,
} from '@element-plus/icons-vue'
import {
    deleteBidderBidRecord,
    getBidderBidRecord,
    listMyBidRecords,
    updateBidderBidRecord,
    uploadBidderCredentialFiles,
} from '@/api/bidder-bid-record'
import {
    deleteCredentialFile,
    downloadCredentialFile,
    listCredentialFiles,
    subscribeCredentialFileEvents,
} from '@/api/credential-file'
import { useBidderAuth } from '@/composables/useBidderAuth'
import AmountInput from '@/shared/components/AmountInput.vue'
import FileLibraryPanel, {
    type StatusColumn,
    type UploadOutcome,
} from '@/shared/components/FileLibraryPanel.vue'
import type { DetailField } from '@/shared/components/DetailDialog.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { usePersistedSort } from '@/shared/composables/usePersistedSort'
import { getErrorMessage } from '@/shared/utils/error'
import { formatTime, displayOrDash } from '@/shared/utils/format'
import {
    CREDENTIAL_CONVERT_STATUS_DESC,
    ORIGINAL_STORAGE_STATUS_DESC,
    enumLabel,
} from '@/shared/utils/dict'
import {
    CREDENTIAL_CONVERT_STATUS_TYPE,
    ORIGINAL_STORAGE_STATUS_TYPE,
} from '@/shared/utils/el-tag'
import type { BidRecord } from '@/types/bid-record'
import type { CredentialFile } from '@/types/credential-file'
import {
    markdownDownloadFilename,
    type DownloadedFile,
    type FileDownloadKind,
} from '@/shared/utils/download'

const router = useRouter()
const { account, logout } = useBidderAuth()

const records = ref<BidRecord[]>([])
const loading = ref(false)
/** 记录 ID 列排序方向：desc 倒序（默认）/ asc 正序。 */
const sortDirection = usePersistedSort('sort:supplier:my-bids:record-id')

const sortedRecords = computed(() =>
    [...records.value].sort((left, right) =>
        sortDirection.value === 'desc'
            ? right.bidRecordId - left.bidRecordId
            : left.bidRecordId - right.bidRecordId,
    ),
)

function toggleSort() {
    sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
}

// ——— 编辑弹窗 ———
const editVisible = ref(false)
const editSaving = ref(false)
const editingId = ref<number | null>(null)
const editForm = reactive({
    bidderName: '',
    quotePrice: undefined as number | undefined,
    bidderContact: '',
})

// ——— 详情/资信上传弹窗 ———
const detailVisible = ref(false)
const detailRecord = ref<BidRecord | null>(null)

const accountLabel = computed(() => {
    const acc = account.value
    if (!acc) return ''
    return acc.displayName || acc.username
})

function getUsername(): string | null {
    return account.value?.username ?? null
}

// ——— 资信材料文件面板适配（复用 FileLibraryPanel） ———
const credentialStatusColumns: StatusColumn<CredentialFile>[] = [
    {
        label: '原文件状态',
        width: 120,
        value: (row) => row.originalStorageStatus ?? 'STORED',
        dict: 'originalStorageStatus',
        typeMap: ORIGINAL_STORAGE_STATUS_TYPE,
        descMap: ORIGINAL_STORAGE_STATUS_DESC,
    },
    {
        label: '转换状态',
        width: 100,
        value: (row) => row.convertStatus,
        dict: 'credentialConvertStatus',
        typeMap: CREDENTIAL_CONVERT_STATUS_TYPE,
        descMap: CREDENTIAL_CONVERT_STATUS_DESC,
    },
]

function formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function credentialDetailFields(row: CredentialFile): DetailField[] {
    return [
        { label: '文件名称', value: row.originalFilename },
        { label: '文件类型', value: displayOrDash(row.contentType) },
        { label: '文件大小', value: formatFileSize(row.fileSize) },
        { label: '存储介质', value: enumLabel('storageType', row.storageType) },
        { label: '原文件状态', value: enumLabel('originalStorageStatus', row.originalStorageStatus) },
        { label: '转换状态', value: enumLabel('credentialConvertStatus', row.convertStatus) },
        { label: '失败阶段', value: enumLabel('credentialErrorStage', row.errorStage) },
        { label: '失败原因', value: displayOrDash(row.errorMessage) },
        { label: '创建时间', value: formatTime(row.createdAt) },
        { label: '转换完成时间', value: formatTime(row.convertedAt) },
    ]
}

function buildPendingCredentialRow(file: File): CredentialFile {
    return {
        fileId: -1,
        fileUuid: '',
        fileOrder: 0,
        originalFilename: file.name,
        contentType: file.type,
        fileSize: file.size,
        originalSha256: '',
        storageType: 'MINIO',
        originalStorageStatus: 'STORING',
        convertStatus: 'UPLOADED',
        createdAt: new Date().toISOString(),
    }
}

function isPendingCredentialRow(row: CredentialFile): boolean {
    return row.fileId < 0
}

function isCredentialInProgress(row: CredentialFile): boolean {
    return row.originalStorageStatus === 'STORING'
        || row.convertStatus === 'UPLOADED'
        || row.convertStatus === 'CONVERTING'
}

async function listCredentialRows(page: number, pageSize: number) {
    const bidRecordId = detailRecord.value?.bidRecordId
    if (!bidRecordId) return { list: [], total: 0 }
    const all = await listCredentialFiles(bidRecordId)
    const start = (page - 1) * pageSize
    return {
        list: all.slice(start, start + pageSize),
        total: all.length,
    }
}

async function uploadCredentialFiles(
    files: File[],
    username: string,
): Promise<UploadOutcome> {
    const bidRecordId = detailRecord.value?.bidRecordId
    if (!bidRecordId) throw new Error('投标记录无效，无法上传资信材料')
    const response = await uploadBidderCredentialFiles(
        files,
        bidRecordId,
        username,
    )
    const failedNames = (response.files ?? [])
        .filter((item) => item.convertStatus === 'FAILED')
        .map((item) => item.originalFilename)
    return { failedNames }
}

async function deleteCredentialRow(row: CredentialFile) {
    const bidRecordId = detailRecord.value?.bidRecordId
    if (!bidRecordId) throw new Error('投标记录无效，无法删除资信材料')
    await deleteCredentialFile(bidRecordId, row.fileId)
}

function subscribeCredentialUpdates(onUpdate: () => void): () => void {
    const bidRecordId = detailRecord.value?.bidRecordId
    return bidRecordId
        ? subscribeCredentialFileEvents(bidRecordId, onUpdate)
        : () => undefined
}

function isCredentialDownloadable(
    row: CredentialFile,
    kind: FileDownloadKind,
): boolean {
    if (isPendingCredentialRow(row)) return false
    if (kind === 'original') {
        return row.originalStorageStatus === 'STORED'
            && Boolean(row.originalFilePath && row.originalSha256)
    }
    return row.convertStatus === 'CONVERTED'
        && Boolean(row.markdownFilePath && row.convertedSha256)
}

async function downloadCredentialRow(
    row: CredentialFile,
    kind: FileDownloadKind,
): Promise<DownloadedFile> {
    const bidRecordId = detailRecord.value?.bidRecordId
    if (!bidRecordId) throw new Error('投标记录无效，无法下载资信材料')
    const blob = await downloadCredentialFile(bidRecordId, row.fileId, kind)
    return {
        blob,
        filename: kind === 'original'
            ? row.originalFilename
            : markdownDownloadFilename(row.originalFilename),
    }
}

async function loadRecords() {
    loading.value = true
    try {
        records.value = await listMyBidRecords()
    } catch (error) {
        ElMessage.error(`加载我的投标失败: ${getErrorMessage(error, '')}`)
    } finally {
        loading.value = false
    }
}

async function onLogout() {
    await logout()
    ElMessage.success('已退出登录')
    await router.replace('/supplier')
}

function openEdit(record: BidRecord) {
    editingId.value = record.bidRecordId
    editForm.bidderName = record.bidderName
    editForm.quotePrice = Number(record.quotePrice)
    editForm.bidderContact = record.bidderContact
    editVisible.value = true
}

async function saveEdit() {
    if (editingId.value === null || editSaving.value) return
    if (!editForm.bidderName.trim() || editForm.quotePrice == null) {
        ElMessage.warning('投标人名称和报价不能为空')
        return
    }
    editSaving.value = true
    try {
        await updateBidderBidRecord(editingId.value, {
            bidderName: editForm.bidderName.trim(),
            quotePrice: editForm.quotePrice,
            bidderContact: editForm.bidderContact.trim(),
        })
        ElMessage.success('修改成功')
        editVisible.value = false
        await loadRecords()
    } catch (error) {
        ElMessage.error(`修改失败: ${getErrorMessage(error, '')}`)
    } finally {
        editSaving.value = false
    }
}

async function openDetail(record: BidRecord) {
    try {
        detailRecord.value = await getBidderBidRecord(record.bidRecordId)
        detailVisible.value = true
    } catch (error) {
        ElMessage.error(`加载详情失败: ${getErrorMessage(error, '')}`)
    }
}

function openEditFromDetail() {
    if (!detailRecord.value) return
    detailVisible.value = false
    openEdit(detailRecord.value)
}

async function remove(record: BidRecord) {
    try {
        await ElMessageBox.confirm(
            `确定删除“${record.bidderName}”的投标记录吗？删除后无法恢复。`,
            '删除投标记录',
            {
                type: 'warning',
                confirmButtonText: '删除',
                cancelButtonText: '取消',
            }
        )
    } catch {
        return
    }
    try {
        await deleteBidderBidRecord(record.bidRecordId)
        ElMessage.success('删除成功')
        await loadRecords()
    } catch (error) {
        ElMessage.error(`删除失败: ${getErrorMessage(error, '')}`)
    }
}

onMounted(loadRecords)
</script>

<template>
  <div class="page">
    <PageHeader title="我的投标" :back-to="'/supplier'" back-label="返回首页">
      <template #actions>
        <span class="account-badge">{{ accountLabel }}</span>
        <el-button @click="onLogout">退出登录</el-button>
      </template>
    </PageHeader>

    <el-card class="page-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="sortedRecords"
        empty-text="还没有投标记录，去项目列表投标吧"
        stripe
        class="clickable-table"
        @row-click="openDetail"
      >
        <el-table-column prop="bidRecordId" width="90">
          <template #header>
            <div class="column-header">
              记录 ID
              <el-button
                class="sort-toggle"
                text
                size="small"
                :icon="sortDirection === 'desc' ? CaretBottom : CaretTop"
                :title="sortDirection === 'desc' ? '当前倒序，点击切换正序' : '当前正序，点击切换倒序'"
                @click.stop="toggleSort"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="invitationId" label="公告 ID" width="90" />
        <el-table-column prop="bidNo" label="投标次序" width="90" />
        <el-table-column prop="bidderName" label="投标人名称" min-width="160" />
        <el-table-column label="报价" width="120">
          <template #default="{ row }">
            ¥{{ Number(row.quotePrice).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="投标时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.bidAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" :icon="Delete" @click.stop="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 修改弹窗 -->
    <el-dialog
      v-model="editVisible"
      title="修改投标记录"
      width="480px"
      destroy-on-close
    >
      <el-form :model="editForm" label-position="top">
        <el-form-item label="投标人名称" required>
          <el-input v-model="editForm.bidderName" maxlength="100" />
        </el-form-item>
        <el-form-item label="报价" required>
          <AmountInput
            v-model="editForm.quotePrice"
            placeholder="请输入报价"
          />
        </el-form-item>
        <el-form-item label="联系方式" required>
          <el-input v-model="editForm.bidderContact" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="saveEdit">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情 + 资信材料弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :title="`投标详情（记录 ${detailRecord?.bidRecordId ?? ''}）`"
      width="860px"
      top="0"
      destroy-on-close
    >
      <el-descriptions v-if="detailRecord" :column="2" border>
        <el-descriptions-item label="投标人名称">
          {{ detailRecord.bidderName }}
        </el-descriptions-item>
        <el-descriptions-item label="投标次序">
          {{ detailRecord.bidNo }}
        </el-descriptions-item>
        <el-descriptions-item label="报价">
          ¥{{ Number(detailRecord.quotePrice).toLocaleString() }}
        </el-descriptions-item>
        <el-descriptions-item label="投标时间">
          {{ formatTime(detailRecord.bidAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="联系方式" :span="2">
          {{ displayOrDash(detailRecord.bidderContact) }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="detailRecord" class="credential-section">
        <div class="credential-title">
          <span class="credential-title-icon">
            <el-icon><FolderOpened /></el-icon>
          </span>
          资信材料
        </div>
        <FileLibraryPanel
          title="资信材料"
          description=""
          embedded
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html"
          :list-api="listCredentialRows"
          :upload-api="uploadCredentialFiles"
          :delete-api="deleteCredentialRow"
          :get-username="getUsername"
          :row-key="(row) => String(row.fileId)"
          :build-pending-row="buildPendingCredentialRow"
          :is-pending-row="isPendingCredentialRow"
          :detail-fields="credentialDetailFields"
          :status-columns="credentialStatusColumns"
          :in-progress-checker="isCredentialInProgress"
          :subscribe-updates="subscribeCredentialUpdates"
          :download-api="downloadCredentialRow"
          :downloadable-checker="isCredentialDownloadable"
          dropzone-title="点击选择资信材料"
          dropzone-hint="支持多个文件；选择后点击统一上传"
          :confirm-delete-text="() => '确定删除该资信文件吗？删除后无法恢复。'"
          empty-text="还没有上传的资信材料"
        />
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" :icon="Edit" @click="openEditFromDetail">
          修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.account-badge {
  margin-right: 8px;
  color: var(--lc-text-secondary);
  font-size: 13px;
}
.credential-section {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--lc-border);
}

.credential-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 650;
  color: var(--lc-text);
}

.credential-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--lc-accent-soft);
  color: var(--lc-accent);
  font-size: 16px;
  flex-shrink: 0;
}
</style>
