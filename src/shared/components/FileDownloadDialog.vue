<script setup lang="ts">
/**
 * 所有受保护文件下载入口共用的下载格式选择弹窗。
 *
 * 调用方只负责提供已通过本业务状态校验的下载类型与实际下载动作；这里不感知
 * 文件属于知识库、资信材料还是 Agent 对话引用，保证下载交互和文案一致。
 */
import { Download } from '@element-plus/icons-vue'
import type { FileDownloadKind } from '@/shared/utils/download'

const props = withDefaults(defineProps<{
    modelValue: boolean
    filename: string | null
    availableKinds: FileDownloadKind[]
    downloadingKind?: FileDownloadKind | null
}>(), {
    downloadingKind: null,
})

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    select: [kind: FileDownloadKind]
    closed: []
}>()

function close(): void {
    emit('update:modelValue', false)
}
</script>

<template>
    <el-dialog
        :model-value="modelValue"
        title="选择下载文件"
        width="360px"
        destroy-on-close
        @update:model-value="emit('update:modelValue', $event)"
        @closed="emit('closed')"
    >
        <div v-if="filename" class="download-dialog-content">
            <div class="download-dialog-filename" :title="filename">
                {{ filename }}
            </div>
            <div class="download-dialog-options">
                <el-button
                    v-if="availableKinds.includes('original')"
                    type="primary"
                    plain
                    :icon="Download"
                    :loading="downloadingKind === 'original'"
                    @click="emit('select', 'original')"
                >
                    下载原文件
                </el-button>
                <el-button
                    v-if="availableKinds.includes('markdown')"
                    type="primary"
                    plain
                    :icon="Download"
                    :loading="downloadingKind === 'markdown'"
                    @click="emit('select', 'markdown')"
                >
                    下载.md
                </el-button>
            </div>
        </div>
        <template #footer>
            <el-button @click="close">取消</el-button>
        </template>
    </el-dialog>
</template>

<style scoped>
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
