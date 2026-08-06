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
        <el-descriptions :column="1" border>
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
