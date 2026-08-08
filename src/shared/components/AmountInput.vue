<script setup lang="ts">
/**
 * 金额输入框：键盘输入，自动过滤非数字字符并显示千分位。
 *
 * - 值通过 v-model 以 number | null 双向绑定，空输入为 null；
 * - 只保留数字和一个小数点，小数位最多 precision 位（默认 2）；
 * - 失焦时按当前值规范化显示（千分位 + 小数位截断）。
 */
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
    modelValue?: number | null
    placeholder?: string
    disabled?: boolean
    precision?: number
}>(), {
    modelValue: null,
    placeholder: '',
    disabled: false,
    precision: 2,
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: number | null): void
}>()

const text = ref(formatValue(props.modelValue))
const focused = ref(false)

function formatValue(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return ''
    return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: props.precision,
    })
}

function parseDisplay(display: string): number | null {
    const cleaned = display.replace(/,/g, '').trim()
    if (cleaned === '') return null
    const numeric = Number(cleaned)
    return Number.isFinite(numeric) ? numeric : null
}

function onInput(value: string) {
    let cleaned = value.replace(/[^\d.]/g, '')
    const dotIndex = cleaned.indexOf('.')
    if (dotIndex !== -1) {
        cleaned = cleaned.slice(0, dotIndex + 1)
            + cleaned.slice(dotIndex + 1)
                .replace(/\./g, '')
                .slice(0, props.precision)
    }
    const [intPart, decPart] = cleaned.split('.')
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    text.value = decPart !== undefined
        ? `${formattedInt}.${decPart}`
        : formattedInt
    emit('update:modelValue', parseDisplay(text.value))
}

function onFocus() {
    focused.value = true
}

function onBlur() {
    focused.value = false
    text.value = formatValue(props.modelValue)
}

watch(() => props.modelValue, (value) => {
    if (!focused.value) {
        text.value = formatValue(value)
    }
})
</script>

<template>
    <el-input
        :model-value="text"
        :placeholder="placeholder"
        :disabled="disabled"
        inputmode="decimal"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
    />
</template>
