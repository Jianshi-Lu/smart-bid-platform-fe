import axios from 'axios'

/**
 * 业务错误异常,响应拦截器统一抛出的标准化错误。
 * 实例走的是 axios 的默认值：responseType: 'json'
 * 一旦 body 不是合法 JSON（如后端的 /service-status 返的裸字符串 "Service is up and running."）
 * → 抛 SyntaxError → 进 error 拦截器 →
 * 两种来源:
 *  - 第 1 层 (BE 业务错):HTTP 200 + body.code != 200,code 来自 BE Result<T>.code (200/400/404/500)
 *  - 第 2 层 (HTTP 框架错):HTTP 4xx/5xx,code 是 HTTP 状态码
 *
 * 调用方只需 `instanceof ApiError` 统一捕获;非 ApiError 表示网络错等不可恢复异常。
 *
 * ─── Class hierarchy ───
 *   export class ApiError extends Error
 *     readonly code: number
 *     constructor(code, message)
 *   export const http: AxiosInstance         // 全局 axios 实例(已挂载响应拦截器)
 *   // http.interceptors.response.use(成功拦截, 失败拦截) — 副作用,不导出
 *
 * 关系:
 *   - ApiError  ←  拦截器内部 throw (Promise.reject(new ApiError(...)))
 *   - view layer  →  try { await apiFn() } catch (e) { if (e instanceof ApiError) ... }
 *   - api/* 层函数   →  .post/.get/.patch<Result<T>>(url, data) .then(resp => resp.data.data)
 *
 * 调用约束:
 *   - 所有 api/* 函数必须用 http (而不是直接 axios),否则不享受拦截器
 *   - 所有 view 必须在 try/catch 中调用,否则非 ApiError 异常会被全局吞掉
 */
export class ApiError extends Error {
    readonly code: number

    constructor(code: number, message: string) {
        super(message)
        this.name = 'ApiError'
        this.code = code
    }
}

/** 全局 axios 实例,所有 api/ 模块统一使用,自动应用响应拦截器 */
export const http = axios.create({})

http.interceptors.response.use(
    // 第 1 层:BE 把业务错也返成 HTTP 200,需手动判定 body.code
    (resp) => {
        const body: any = resp.data
        if (body && typeof body === 'object' && 'code' in body && body.code !== 200) {
            return Promise.reject(
                new ApiError(body.code, body.message ?? `业务错误 ${body.code}`)
            )
        }
        return resp
    },
    // 第 2 层 + 兜底:HTTP 框架错(4xx/5xx)或 网络错(无 response)
    (err) => {
        const status = err?.response?.status
        const body = err?.response?.data

        // 第 2 层·优:响应体含 code 字段(BE 偶发返 Result 信封的场景),用业务码
        if (body && typeof body.code === 'number') {
            return Promise.reject(
                new ApiError(body.code, body.message ?? `HTTP ${status}`)
            )
        }

        // 第 2 层·兜:仅取 HTTP 状态码
        if (status) return Promise.reject(new ApiError(status, `HTTP ${status}`))

        // 网络错 / CORS / 超时:无 response,原 err 透传(不是 ApiError)
        return Promise.reject(err)
    }
)