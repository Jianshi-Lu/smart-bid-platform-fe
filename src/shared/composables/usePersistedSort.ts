import { ref, watch } from 'vue'

/**
 * 轻量持久化排序方向：切换页面后再回来仍保持上次选择。
 *
 * 值直接写入 localStorage（desc / asc），不引入状态库或后端接口。
 */
export function usePersistedSort(storageKey: string) {
    const stored = localStorage.getItem(storageKey)
    const sortDirection = ref<'desc' | 'asc'>(stored === 'asc' ? 'asc' : 'desc')

    watch(sortDirection, (value) => {
        localStorage.setItem(storageKey, value)
    })

    return sortDirection
}
