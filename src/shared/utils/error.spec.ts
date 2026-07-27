import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/errors/api-error'
import { getErrorMessage } from '@/shared/utils/error'

describe('getErrorMessage', () => {
  it('keeps the backend business code for ApiError', () => {
    expect(getErrorMessage(new ApiError(400, '参数错误'))).toBe('[400] 参数错误')
  })

  it('adds the default prefix for ordinary errors', () => {
    expect(getErrorMessage(new Error('Network Error'))).toBe('请求失败: Network Error')
  })

  it('can return only the detail for contextual component messages', () => {
    expect(getErrorMessage('上传中断', '')).toBe('上传中断')
  })
})
