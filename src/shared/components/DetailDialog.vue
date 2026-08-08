<script setup lang="ts">
/** 通用详情弹窗：以描述列表展示一行数据的完整字段。 */
export interface DetailField {
    label: string
    value: string | number | boolean | null | undefined
}

defineProps<{
    modelValue: boolean
    title: string
    fields: DetailField[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()
</script>

<template>
    <el-dialog
        :model-value="modelValue"
        :title="title"
        width="560px"
        top="0"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <el-descriptions class="detail-dialog-descriptions" :column="1" border>
            <el-descriptions-item
                v-for="field in fields"
                :key="field.label"
                :label="field.label"
            >
                {{ field.value ?? '-' }}
            </el-descriptions-item>
        </el-descriptions>
    </el-dialog>
</template>

<style>
/*
 * 详情弹窗固定两列布局：长路径、UUID、SHA-256 等不可断行内容强制换行，
 * 避免表格撑出弹窗卡片边框。
 */
.detail-dialog-descriptions .el-descriptions__table {
    width: 100%;
    table-layout: fixed;
}

.detail-dialog-descriptions .el-descriptions__cell {
    word-break: break-all;
    overflow-wrap: anywhere;
}

.detail-dialog-descriptions .el-descriptions__label {
    width: 140px;
}
</style>
