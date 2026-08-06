import axios from 'axios'
import { ApiError } from '@/shared/errors/api-error'

export { ApiError } from '@/shared/errors/api-error'

/**
 * 全局 Axios 实例与响应错误归一化边界。
 *
 * 新版 Result 使用 success + 字符串业务码（成功码为 SUCCESS）；
 * 同时兼容旧版 code=200 的响应，避免前后端逐个接口切换时互相影响。
 * 所有业务 API 必须复用此实例，避免各模块重复解释后端响应信封。
 */
/** 全局 axios 实例,所有 api/ 模块统一使用,自动应用响应拦截器 */
export const http = axios.create({})

// 第 0 层：角色登录凭据统一注入（HTTP Basic）。
// /bidder 前缀使用投标方凭据（bidderCredentials），其余业务前缀使用
// 招标方凭据（bidInviterCredentials）；由 useBidderAuth / useBidInviterAuth 维护。
// 最小鉴权实现每次请求都携带凭据，由后端实时校验。
http.interceptors.request.use((config) => {
    const url = config.url ?? ''
    const key = url.startsWith('/bidder')
        ? 'bidderCredentials'
        : 'bidInviterCredentials'
    const raw = localStorage.getItem(key)
    if (raw) {
        try {
            const credentials = JSON.parse(raw) as {
                username: string
                password: string
            }
            const basic = toBase64(
                `${credentials.username}:${credentials.password}`
            )
            config.headers.set('Authorization', `Basic ${basic}`)
        } catch {
            localStorage.removeItem('bidderCredentials')
        }
    }
    return config
})

http.interceptors.response.use(
    // 第 1 层：HTTP 200 也可能携带业务失败，按新版 success 判断。
    (resp) => {
        const body: any = resp.data
        if (isBusinessFailure(body)) {
            return Promise.reject(
                new ApiError(String(body.code ?? 'BUSINESS_ERROR'), body.message ?? '业务处理失败')
            )
        }
        return resp
    },
    // 第 2 层 + 兜底：HTTP 框架错(4xx/5xx)或网络错(无 response)
    (err) => {
        const status = err?.response?.status
        const body = err?.response?.data

        // 登录失效时清理对应角色的本地会话，页面/守卫负责跳转登录。
        const code = String((body as Record<string, unknown>)?.code ?? '')
        if (status === 401 && code.startsWith('BIDDER_ACCOUNT.')) {
            localStorage.removeItem('bidderCredentials')
            localStorage.removeItem('bidderAccount')
        }
        if (status === 401 && code.startsWith('BID_INVITER_ACCOUNT.')) {
            localStorage.removeItem('bidInviterCredentials')
            localStorage.removeItem('bidInviterAccount')
        }

        // HTTP 错误若仍带有 Result 信封，优先使用后端稳定错误码。
        if (body && typeof body === 'object' && 'code' in body) {
            return Promise.reject(
                new ApiError(String(body.code ?? status ?? 'HTTP_ERROR'), body.message ?? `HTTP ${status}`)
            )
        }

        // 第 2 层·兜:仅取 HTTP 状态码
        if (status) return Promise.reject(new ApiError(status, `HTTP ${status}`))

        // 网络错 / CORS / 超时:无 response,原 err 透传(不是 ApiError)
        return Promise.reject(err)
    }
)

/** 按 UTF-8 编码字符串为 Base64（支持中文用户名/密码）。 */
function toBase64(value: string): string {
    const bytes = new TextEncoder().encode(value)
    let binary = ''
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte)
    })
    return btoa(binary)
}

/** 判断统一 Result 是否明确表示业务失败。 */
function isBusinessFailure(body: unknown): body is {
    success?: boolean
    code?: string | number
    message?: string
} {
    if (!body || typeof body !== 'object') return false

    const result = body as Record<string, unknown>
    if ('success' in result) return result.success !== true

    // 兼容尚未迁移到新版 Result 的旧接口。
    if ('code' in result) return result.code !== 200 && result.code !== 'SUCCESS'

    return false
}
