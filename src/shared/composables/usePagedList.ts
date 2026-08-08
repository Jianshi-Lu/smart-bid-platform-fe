import { ref, shallowRef } from 'vue'
import type { PageRequest, PageResult } from '@/types/common'

interface UsePagedListOptions<T> {
  fetchPage: (query: PageRequest) => Promise<PageResult<T>>
  /** 固定排序或按需动态返回排序（如 ID 正/倒序切换）。 */
  sort: string | (() => string)
  pageSize?: number
  onError?: (error: unknown) => void
}

/**
 * 管理 PageHelper 列表共有的分页状态，并忽略晚于新请求返回的旧响应。
 */
export function usePagedList<T>(options: UsePagedListOptions<T>) {
  const rows = shallowRef<T[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const loading = ref(false)
  const pageSize = options.pageSize ?? 10

  let latestRequestId = 0

  async function load(page = currentPage.value): Promise<void> {
    const requestId = ++latestRequestId
    loading.value = true

    try {
      const data = await options.fetchPage({
        page,
        pageSize,
        sort: typeof options.sort === 'function' ? options.sort() : options.sort,
      })

      if (requestId !== latestRequestId) return

      rows.value = data.list
      total.value = data.total
      currentPage.value = data.pageNum
    } catch (error) {
      if (requestId === latestRequestId) options.onError?.(error)
    } finally {
      if (requestId === latestRequestId) loading.value = false
    }
  }

  return {
    rows,
    total,
    currentPage,
    loading,
    pageSize,
    load,
  }
}
