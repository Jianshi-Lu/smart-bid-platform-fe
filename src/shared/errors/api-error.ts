/** 由 HTTP 适配层抛出的标准业务或 HTTP 状态错误。 */
export class ApiError extends Error {
  /** 后端稳定错误码；兼容旧接口的数字 HTTP/业务码。 */
  readonly code: string | number

  constructor(code: string | number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}
