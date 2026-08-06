/**
 * 招标方（管理员）账号 API。
 *
 * 对应后端 BidInviterAuthController (/bid-inviter/auth)：
 * 注册/登录/me 与投标方账号体系对称，鉴权采用 HTTP Basic。
 */
import { http } from '@/api/http'

import type { Result } from '@/types/common'
import type {
    BidInviterAccount,
    BidInviterLoginRequest,
    BidInviterLoginResponse,
    BidInviterRegisterRequest,
} from '@/types/bid-inviter-account'

/** POST /bid-inviter/auth/register 注册招标方账号。 */
export function registerBidInviterAccount(
    data: BidInviterRegisterRequest
): Promise<BidInviterAccount> {
    return http
        .post<Result<BidInviterAccount>>('/bid-inviter/auth/register', data)
        .then((resp) => resp.data.data)
}

/** POST /bid-inviter/auth/login 登录。 */
export function loginBidInviterAccount(
    data: BidInviterLoginRequest
): Promise<BidInviterLoginResponse> {
    return http
        .post<Result<BidInviterLoginResponse>>('/bid-inviter/auth/login', data)
        .then((resp) => resp.data.data)
}

/** GET /bid-inviter/auth/me 查询当前登录账号。 */
export function getCurrentBidInviterAccount(): Promise<BidInviterLoginResponse> {
    return http
        .get<Result<BidInviterLoginResponse>>('/bid-inviter/auth/me')
        .then((resp) => resp.data.data)
}
