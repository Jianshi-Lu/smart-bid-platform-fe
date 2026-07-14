<script setup lang="ts">
/**
 * 资信材料文件上传组件。
 *
 * 组件只管理浏览器 File 对象、上传批次号和后端返回的文件信息。
 * 不读取或拼接本地物理路径,不负责 Markdown 转换,也不参与投标提交。
 *
 * 当前后端联调占位接口不会返回 fileId,因此这类响应仍可展示,
 * 但删除操作会被禁用,避免前端伪造文件 ID。
 */
import { computed, readonly, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, FolderOpened, Upload } from '@element-plus/icons-vue'
import { ApiError } from '@/api/http'
import { deleteCredentialFile, uploadCredentialFiles } from '@/api/credential-file'
import type { CredentialFile } from '@/types/credential-file'

type PendingFileStatus = 'SELECTED' | 'UPLOADING' | 'FAILED'
type UploadedFileStatus = 'UPLOADED' | 'REMOVED'

interface PendingFile {
    key: string
    file: File
    status: PendingFileStatus
    errorMessage?: string
}

interface UploadedFile {
    key: string
    file: CredentialFile
    status: UploadedFileStatus
    deleting: boolean
    errorMessage?: string
}

const props = withDefaults(defineProps<{
    /** 禁用整个上传组件,供父页面后续在提交中使用。 */
    disabled?: boolean
    /** 可选的浏览器文件类型过滤,不传表示不限制。 */
    accept?: string
}>(), {
    disabled: false,
    accept: '',
})

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<PendingFile[]>([])
const uploadedFiles = ref<UploadedFile[]>([])
const uploadBatchId = ref('')
const uploading = ref(false)
const errorMessage = ref('')

const hasSelectedFiles = computed(() => selectedFiles.value.length > 0)
const hasUploadedFiles = computed(() => uploadedFiles.value.length > 0)
const hasPendingOrUploadingFiles = computed(
    () => selectedFiles.value.length > 0 || uploading.value
)

function formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) return `[${error.code}] ${error.message}`
    return error instanceof Error ? error.message : String(error)
}

function openFilePicker() {
    if (props.disabled || uploading.value) return
    fileInput.value?.click()
}

function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (files.length === 0) return

    errorMessage.value = ''
    const selectionId = Date.now()
    selectedFiles.value.push(
        ...files.map((file, index) => ({
            key: `${file.name}-${file.size}-${file.lastModified}-${selectionId}-${index}`,
            file,
            status: 'SELECTED' as const,
        }))
    )
}

function removeSelectedFile(key: string) {
    if (props.disabled || uploading.value) return
    selectedFiles.value = selectedFiles.value.filter((item) => item.key !== key)
}

async function uploadFiles() {
    if (props.disabled || uploading.value || !hasSelectedFiles.value) return

    uploading.value = true
    errorMessage.value = ''
    const filesToUpload = selectedFiles.value
    selectedFiles.value = filesToUpload.map((item) => ({
        ...item,
        status: 'UPLOADING',
        errorMessage: undefined,
    }))

    try {
        const response = await uploadCredentialFiles(
            filesToUpload.map((item) => item.file),
            uploadBatchId.value || undefined
        )

        if (!response.uploadBatchId) {
            throw new Error('上传响应缺少 uploadBatchId')
        }

        uploadBatchId.value = response.uploadBatchId
        const returnedFiles = response.files ?? []
        const uploadedCount = Math.min(returnedFiles.length, filesToUpload.length)

        uploadedFiles.value.push(
            ...returnedFiles.slice(0, uploadedCount).map((file, index) => ({
                key: `${file.fileId ?? 'pending'}-${file.fileOrder ?? index}-${Date.now()}-${index}`,
                file,
                status: 'UPLOADED' as const,
                deleting: false,
            }))
        )

        const unmatchedFiles = filesToUpload.slice(uploadedCount)
        selectedFiles.value = unmatchedFiles.map((item) => ({
            ...item,
            status: 'FAILED' as const,
            errorMessage: '后端未返回该文件的上传结果,请重试',
        }))

        if (unmatchedFiles.length > 0) {
            errorMessage.value = '部分文件没有上传结果,请重试'
            ElMessage.warning(errorMessage.value)
        } else {
            ElMessage.success(`上传成功,共 ${uploadedCount} 个文件`)
        }
    } catch (error) {
        const message = getErrorMessage(error)
        selectedFiles.value = filesToUpload.map((item) => ({
            ...item,
            status: 'FAILED',
            errorMessage: message,
        }))
        errorMessage.value = message
        ElMessage.error(`资信材料上传失败: ${message}`)
    } finally {
        uploading.value = false
    }
}

function getFileId(file: CredentialFile): number | null {
    const fileId = (file as Partial<CredentialFile>).fileId
    return typeof fileId === 'number' && Number.isFinite(fileId) ? fileId : null
}

async function removeUploadedFile(item: UploadedFile) {
    if (props.disabled || item.deleting) return

    const fileId = getFileId(item.file)
    if (!uploadBatchId.value || fileId === null) {
        const message = '当前后端未返回 fileId,暂时无法删除该文件'
        item.errorMessage = message
        errorMessage.value = message
        ElMessage.warning(message)
        return
    }

    try {
        await ElMessageBox.confirm(
            `确定删除“${item.file.originalFilename}”吗？删除后无法恢复。`,
            '删除资信材料',
            {
                type: 'warning',
                confirmButtonText: '删除',
                cancelButtonText: '取消',
            }
        )
    } catch {
        return
    }

    item.deleting = true
    item.status = 'REMOVED'
    errorMessage.value = ''
    try {
        await deleteCredentialFile(uploadBatchId.value, fileId)
        uploadedFiles.value = uploadedFiles.value.filter(
            (uploaded) => uploaded.key !== item.key
        )
        ElMessage.success('文件已删除')
    } catch (error) {
        item.deleting = false
        item.status = 'UPLOADED'
        const message = getErrorMessage(error)
        item.errorMessage = message
        errorMessage.value = `删除“${item.file.originalFilename}”失败: ${message}`
        ElMessage.error(errorMessage.value)
    }
}

/**
 * 父页面提交投标时调用,确保没有遗漏的待上传文件。
 */
function validateBeforeSubmit(): boolean {
    if (uploading.value) {
        ElMessage.warning('资信材料正在上传,请稍候')
        return false
    }
    if (hasSelectedFiles.value) {
        ElMessage.warning('存在尚未上传的资信材料,请先点击“上传文件”')
        return false
    }
    if (uploadedFiles.value.some((item) => item.deleting)) {
        ElMessage.warning('资信材料正在删除,请稍候')
        return false
    }
    return true
}

defineExpose({
    uploadBatchId: readonly(uploadBatchId),
    uploadedFiles: readonly(uploadedFiles),
    hasPendingOrUploadingFiles: readonly(hasPendingOrUploadingFiles),
    uploading: readonly(uploading),
    validateBeforeSubmit,
})
</script>

<template>
  <div class="credential-upload">
    <input
      ref="fileInput"
      class="file-input"
      type="file"
      multiple
      :accept="props.accept"
      @change="onFileChange"
    />

    <div class="upload-toolbar">
      <el-button :disabled="props.disabled || uploading" @click="openFilePicker">
        <el-icon><FolderOpened /></el-icon>
        选择文件
      </el-button>
      <el-button
        type="primary"
        :loading="uploading"
        :disabled="props.disabled || !hasSelectedFiles"
        @click="uploadFiles"
      >
        <el-icon><Upload /></el-icon>
        {{ uploading ? '上传中...' : '上传文件' }}
      </el-button>
      <span v-if="uploadBatchId" class="batch-id">批次号：{{ uploadBatchId }}</span>
    </div>

    <el-alert
      v-if="errorMessage"
      class="upload-alert"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />

    <div v-if="hasSelectedFiles" class="file-section">
      <div class="section-title">待上传文件（{{ selectedFiles.length }}）</div>
      <div v-for="item in selectedFiles" :key="item.key" class="file-row">
        <div class="file-main">
          <span class="file-name" :title="item.file.name">{{ item.file.name }}</span>
          <span class="file-size">{{ formatFileSize(item.file.size) }}</span>
        </div>
        <div class="file-meta">
          <el-tag :type="item.status === 'FAILED' ? 'danger' : 'info'" size="small">
            {{ item.status === 'FAILED' ? '上传失败' : item.status === 'UPLOADING' ? '上传中' : '待上传' }}
          </el-tag>
          <el-button
            text
            type="danger"
            :disabled="props.disabled || item.status === 'UPLOADING'"
            aria-label="移除待上传文件"
            @click="removeSelectedFile(item.key)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="hasUploadedFiles" class="file-section">
      <div class="section-title">已上传文件（{{ uploadedFiles.length }}）</div>
      <div v-for="item in uploadedFiles" :key="item.key" class="file-row">
        <div class="file-main">
          <span class="file-name" :title="item.file.originalFilename">
            {{ item.file.originalFilename }}
          </span>
          <span class="file-size">{{ formatFileSize(item.file.fileSize) }}</span>
        </div>
        <div class="file-meta">
          <el-tag :type="item.status === 'REMOVED' ? 'warning' : 'success'" size="small">
            {{ item.status === 'REMOVED' ? '删除中' : item.file.convertStatus }}
          </el-tag>
          <el-button
            text
            type="danger"
            :loading="item.deleting"
            :disabled="props.disabled || getFileId(item.file) === null"
            :title="getFileId(item.file) === null ? '后端未返回 fileId,暂时无法删除' : '删除文件'"
            aria-label="删除已上传文件"
            @click="removeUploadedFile(item)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <el-empty
      v-if="!hasSelectedFiles && !hasUploadedFiles"
      :image-size="48"
      description="尚未选择资信材料"
    />
  </div>
</template>

<style scoped>
.credential-upload {
  width: 100%;
}

.file-input {
  display: none;
}

.upload-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.batch-id {
  flex: 1 1 100%;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.upload-alert {
  margin-top: 12px;
}

.file-section {
  margin-top: 16px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.section-title {
  padding: 10px 12px;
  color: #606266;
  font-size: 13px;
  font-weight: 600;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 6px 12px;
  border-bottom: 1px solid #f0f2f5;
}

.file-row:last-child {
  border-bottom: 0;
}

.file-main {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
}

.file-name {
  min-width: 0;
  overflow: hidden;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  flex: none;
  color: #909399;
  font-size: 12px;
}

.file-meta {
  display: flex;
  align-items: center;
  flex: none;
  gap: 4px;
}

.el-empty {
  padding: 12px 0;
}

@media (max-width: 600px) {
  .file-row {
    align-items: flex-start;
  }

  .file-main {
    flex-direction: column;
    gap: 2px;
  }
}
</style>
