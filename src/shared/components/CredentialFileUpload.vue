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

// 定义Vue的 Ref 容器,响应式状态，用来驱动页面更新。
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<PendingFile[]>([])
const uploadedFiles = ref<UploadedFile[]>([])
const uploadBatchId = ref('')
const uploading = ref(false)
const errorMessage = ref('')

// 已选择文件的上传状态
const hasSelectedFiles = computed(() => selectedFiles.value.length > 0)
const hasUploadedFiles = computed(() => uploadedFiles.value.length > 0)
const hasPendingOrUploadingFiles = computed(
    () => selectedFiles.value.length > 0 || uploading.value
)

// 把已经以字节表示的文件大小进行单位换算和格式化
function formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
}

// 接收任何类型的异常值，最终返回一个可以展示给用户的字符串。
function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) return `[${error.code}] ${error.message}`
    return error instanceof Error ? error.message : String(error)
}


// 当父组件不禁用上传组件 或 当前不在上传 ：
// <input type="file"> DOM 元素已挂载的话 <-> (fileInput.value !== null && fileInput.value !== undefined)：
// 则调用游览器原生方法，模拟点击并打开文件选择窗口（fileInput 是 Vue 变量，但 fileInput.value 保存的是原生 DOM，此处操作DOM）。
function openFilePicker() {
    if (props.disabled || uploading.value) return
    fileInput.value?.click()
}

// 读取所选文件，将它们包装成带唯一 key 和“待上传”状态的业务对象，然后加入 selectedFiles 响应式列表，供页面展示和后续上传。
function onFileChange(event: Event) {
    // 取得触发事件@change="onFileChange"的真实元素event.target，作为 HTMLInputElement 进行类型断言
    const input = event.target as HTMLInputElement  // 文件选择框 DOM
    // input当前是原生 DOM 对象，自带浏览器的一系列属性和方法。
    const files = Array.from(input.files ?? []) // input.files为dom属性，表示文件选择框中的文件集合
    input.value = ''
    if (files.length === 0) return

    // 清空之前的错误信息
    errorMessage.value = ''
    // 生成本次选择的时间标识
    const selectionId = Date.now()
    selectedFiles.value.push(
        ...files.map((file, index) => ({
            key: `${file.name}-${file.size}-${file.lastModified}-${selectionId}-${index}`,
            file,
            status: 'SELECTED' as const,
        }))
    )
}

// 当父组件不禁用上传组件 或 当前不在上传：
function removeSelectedFile(key: string) {
    if (props.disabled || uploading.value) return
    // 过滤掉 key 等于指定值的文件，保留其他文件
    selectedFiles.value = selectedFiles.value.filter((item) => item.key !== key)
}

// 把 selectedFiles 中的待处理文件发给后端，根据后端返回结果，将成功文件移入 uploadedFiles，
// 将失败或没有返回结果的文件继续保留在 selectedFiles 中。
async function uploadFiles() {
    if (props.disabled || uploading.value || !hasSelectedFiles.value) return

    // 进入上传状态
    uploading.value = true
    errorMessage.value = ''
    const filesToUpload = selectedFiles.value
    // 将页面中的文件状态改成上传中
    selectedFiles.value = filesToUpload.map((item) => ({
        ...item,
        status: 'UPLOADING',
        errorMessage: undefined,
    }))

    // 调用上传接口
    try {
        const response = await uploadCredentialFiles( // 后端api
            filesToUpload.map((item) => item.file),
            uploadBatchId.value || undefined
        )

        if (!response.uploadBatchId) {
            throw new Error('上传响应缺少 uploadBatchId')
        }

        // 第一次上传后端返回上传批次id
        uploadBatchId.value = response.uploadBatchId
        const returnedFiles = response.files ?? []
        // 计算确认上传成功的数量：取“后端返回数量”和“本次请求数量”中的较小值，差值为上传失败文件数
        const uploadedCount = Math.min(returnedFiles.length, filesToUpload.length)

        // 将成功文件加入已上传列表,包装成前端业务对象
        uploadedFiles.value.push(
            ...returnedFiles.slice(0, uploadedCount).map((file, index) => ({
                key: `${file.fileId ?? 'pending'}-${file.fileOrder ?? index}-${Date.now()}-${index}`,
                file,
                status: 'UPLOADED' as const,
                deleting: false,
            }))
        )
        // 找出没有得到后端结果的文件,将无结果文件标记为失败
        const unmatchedFiles = filesToUpload.slice(uploadedCount)
        selectedFiles.value = unmatchedFiles.map((item) => ({
            ...item,
            status: 'FAILED' as const,
            errorMessage: '后端未返回该文件的上传结果,请重试',
        }))

        // 显示部分成功或全部成功提示
        if (unmatchedFiles.length > 0) {
            errorMessage.value = '部分文件没有上传结果,请重试'
            ElMessage.warning(errorMessage.value)
        } else {
            ElMessage.success(`上传成功,共 ${uploadedCount} 个文件`)
        }
    } catch (error) { //整体异常处理
        const message = getErrorMessage(error)
        selectedFiles.value = filesToUpload.map((item) => ({
            ...item,
            status: 'FAILED',
            errorMessage: message,
        }))
        errorMessage.value = message
        ElMessage.error(`资信材料上传失败: ${message}`)
    } finally { // 无论成功失败都结束上传状态
        uploading.value = false
    }
}

// 当前代码注释说明，占位后端接口可能不返回 fileId
// 主要供删除接口使用。
// TODO: 实现后端fileId逻辑之后落实文件id索引逻辑
function getFileId(file: CredentialFile): number | null {
    const fileId = (file as Partial<CredentialFile>).fileId
    return typeof fileId === 'number' && Number.isFinite(fileId) ? fileId : null
}

// 删除已上传文件
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

// 子组件主动决定哪些变量和方法允许父组件通过组件 ref 访问
// // 暴露 Ref 而非其 .value，可保留与子组件内部响应式状态的实时关联（.value实时更新）
defineExpose({
    uploadBatchId: readonly(uploadBatchId),
    uploadedFiles: readonly(uploadedFiles),
    hasPendingOrUploadingFiles: readonly(hasPendingOrUploadingFiles),
    uploading: readonly(uploading),
    validateBeforeSubmit,
})
</script>

<template>
  <!--  HTMLDivElement-->
  <!--  └── HTMLInputElement-->
  <div class="credential-upload">
    <input
      ref="fileInput"
      class="file-input"
      type="file"
      multiple
      :accept="props.accept"
      @change="onFileChange"
    />

    <!--    div.upload-toolbar              原生 DOM 容器-->
    <!--    ├── el-button                   Element Plus 按钮组件-->
    <!--    │   ├── el-icon                 Element Plus 图标容器组件-->
    <!--    │   │   └── FolderOpened        图标组件-->
    <!--    │   └── “选择文件”              文本-->
    <!--    ├── el-button                   Element Plus 按钮组件-->
    <!--    │   ├── el-icon-->
    <!--    │   │   └── Upload-->
    <!--    │   └── “上传中/上传文件”        动态文本-->
    <!--    └── span.batch-id               原生 DOM，条件显示批次号-->
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
