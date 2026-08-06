/**
 * 投标方账号认证 API。
 *
 * 对应后端 BidderAccountController (/bidder/auth/*)。
 * 登录成功后由 useBidderAuth 保存用户名+密码与账号信息，
 * 后续请求由 http 拦截器自动携带 Authorization: Basic 头。
 */
import { http } from '@/api/http'

import type { Result } from '@/types/common'
import type {
    BidderAccount,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
} from '@/types/bidder-account'

/** POST /bidder/auth/register 注册投标方账号。 */
export function registerBidderAccount(
    data: RegisterRequest
): Promise<BidderAccount> {
    return http
        .post<Result<BidderAccount>>('/bidder/auth/register', data)
        .then((resp) => resp.data.data)
}

/** POST /bidder/auth/login 登录并返回数据库令牌。 */
export function loginBidderAccount(
    data: LoginRequest
): Promise<LoginResponse> {
    return http
        .post<Result<LoginResponse>>('/bidder/auth/login', data)
        .then((resp) => resp.data.data)
}

/** GET /bidder/auth/me 查询当前登录账号。 */
export function getCurrentBidderAccount(): Promise<LoginResponse> {
    return http
        .get<Result<LoginResponse>>('/bidder/auth/me')
        .then((resp) => resp.data.data)
}
