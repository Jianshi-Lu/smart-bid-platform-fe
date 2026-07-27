import { describe, expect, it, vi } from 'vitest'
import { usePagedList } from '@/shared/composables/usePagedList'
import type { PageResult } from '@/types/common'

function pageResult<T>(list: T[], pageNum: number, total = list.length): PageResult<T> {
  return {
    total,
    list,
    pageNum,
    pageSize: 10,
    size: list.length,
    startRow: list.length ? 1 : 0,
    endRow: list.length,
    pages: total ? Math.ceil(total / 10) : 0,
    prePage: pageNum > 1 ? pageNum - 1 : 0,
    nextPage: 0,
    isFirstPage: pageNum === 1,
    isLastPage: true,
    hasPreviousPage: pageNum > 1,
    hasNextPage: false,
    navigatePages: 8,
    navigatepageNums: total ? [pageNum] : [],
    navigateFirstPage: total ? pageNum : 0,
    navigateLastPage: total ? pageNum : 0,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('usePagedList', () => {
  it('loads a page and updates shared pagination state', async () => {
    const pending = deferred<PageResult<number>>()
    const fetchPage = vi.fn(() => pending.promise)
    const state = usePagedList({
      fetchPage,
      sort: 'id desc',
      pageSize: 20,
    })

    const loadingPromise = state.load(2)
    expect(state.loading.value).toBe(true)
    expect(fetchPage).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      sort: 'id desc',
    })

    pending.resolve(pageResult([21, 22], 2, 42))
    await loadingPromise

    expect(state.rows.value).toEqual([21, 22])
    expect(state.total.value).toBe(42)
    expect(state.currentPage.value).toBe(2)
    expect(state.loading.value).toBe(false)
  })

  it('reports the latest request error without clearing existing data', async () => {
    const error = new Error('network unavailable')
    const onError = vi.fn()
    const state = usePagedList<number>({
      fetchPage: () => Promise.reject(error),
      sort: 'id desc',
      onError,
    })
    state.rows.value = [1]

    await state.load()

    expect(onError).toHaveBeenCalledWith(error)
    expect(state.rows.value).toEqual([1])
    expect(state.loading.value).toBe(false)
  })

  it('ignores an older response that arrives after a newer page', async () => {
    const first = deferred<PageResult<number>>()
    const second = deferred<PageResult<number>>()
    const fetchPage = vi
      .fn<(query: { page?: number }) => Promise<PageResult<number>>>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const state = usePagedList({ fetchPage, sort: 'id desc' })

    const firstLoad = state.load(1)
    const secondLoad = state.load(2)

    second.resolve(pageResult([2], 2, 2))
    await secondLoad
    first.resolve(pageResult([1], 1, 2))
    await firstLoad

    expect(state.rows.value).toEqual([2])
    expect(state.currentPage.value).toBe(2)
    expect(state.loading.value).toBe(false)
  })
})
