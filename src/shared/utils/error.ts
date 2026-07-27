import { ApiError } from '@/shared/errors/api-error'

/**
 * 将 API、网络和未知异常统一转换为可展示文案。
 * `fallbackPrefix` 仅用于非 ApiError；传空字符串可只取异常详情。
 */
export function getErrorMessage(
  error: unknown,
  fallbackPrefix = '请求失败'
): string {
  if (error instanceof ApiError) return `[${error.code}] ${error.message}`

  const detail = error instanceof Error ? error.message : String(error)
  return fallbackPrefix ? `${fallbackPrefix}: ${detail}` : detail
}
