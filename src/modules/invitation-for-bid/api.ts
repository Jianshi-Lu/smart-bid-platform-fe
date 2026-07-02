/**
 * 招标公告模块 API。
 *
 * 通过 http 实例调用,自动应用拦截器(code != 200 转 ApiError)。
 * 调用方只需 try/catch + instanceof ApiError 判错,无需关心 envelope。
 */
import { http } from '@/api/http'
import type { Result } from '@/types/common'
import type { AddRequest, InvitationForBid } from '@/modules/invitation-for-bid/types'

/** POST /invitation-for-bid/add 创建公告。必填: bidHandlerId / projectNo / purchaseTaskNo。 */
export function createInvitationForBid(data: AddRequest): Promise<InvitationForBid> {
    return http
        .post<Result<InvitationForBid>>('/invitation-for-bid/add', data)
        .then((resp) => resp.data.data)
}
