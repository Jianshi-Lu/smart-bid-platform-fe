/**
 * 招标公告模块 API。
 *
 * 通过 http 实例调用,自动应用拦截器(code != 200 转 ApiError)。
 * 调用方只需 try/catch + instanceof ApiError 判错,无需关心 envelope。
 */
import { http } from '@/api/http'

import type { Result, PageResult } from '@/types/common'

import type { AddRequest, InvitationForBid, ListRequest } from '@/modules/invitation-for-bid/types'


/** POST /invitation-for-bid/add 创建公告。必填: bidHandlerId / projectNo / purchaseTaskNo。 */
export function createInvitationForBid(data: AddRequest): Promise<InvitationForBid> {
    return http
        .post<Result<InvitationForBid>>('/invitation-for-bid/add', data)
        .then((resp) => resp.data.data)
}

/**
 * GET /invitation-for-bid 分页查询公告(PageHelper)。
 *
 * 走 Vite 代理(http://localhost:8080/invitation-for-bid?page=&pageSize=&sort=),
 * 返回值已拆 envelope,直接拿到 PageResult<InvitationForBid>。
 *
 * BE 端点 @RequestParam 默认值: page=1, pageSize=10, sort="invitation_id desc"。
 */
export function listInvitationForBids(
    query: ListRequest = {}
): Promise<PageResult<InvitationForBid>> {
    return http
        .get<Result<PageResult<InvitationForBid>>>('/invitation-for-bid', { params: query })
        .then((resp) => resp.data.data)
}