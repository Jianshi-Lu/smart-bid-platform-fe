/**
 * 招标公告模块 API。
 *
 * 通过 http 实例调用,自动应用拦截器(code != 200 转 ApiError)。
 * 调用方通过 getErrorMessage 统一展示异常,无需关心 envelope。
 *
 * ─── Class hierarchy ───
 *   export function createInvitationForBid(data: AddRequest): Promise<InvitationForBid>
 *   export function listInvitationForBids(query: ListRequest): Promise<PageResult<InvitationForBid>>
 *   export function getInvitationForBid(id: number): Promise<InvitationForBid>
 *   export function updateInvitationForBid(id: number, data: UpdateRequest): Promise<Diff<InvitationForBid>>
 *   export function updateInvitationForBidStatus(id, status, remark?): Promise<InvitationForBid>
 *   export function deleteInvitationForBid(id): Promise<void>
 *   export function listBidderInvitationForBids(query): Promise<PageResult<InvitationForBid>>
 *   export function getBidderInvitationForBid(id): Promise<InvitationForBid>
 *
 * 关系:8 个函数映射招标方管理端点和投标方只读公告边界:
 *   createInvitationForBid        ↔ POST   /invitation-for-bid/add
 *   listInvitationForBids         ↔ GET    /invitation-for-bid
 *   getInvitationForBid           ↔ GET    /invitation-for-bid/{id}
 *   updateInvitationForBid        ↔ PATCH  /invitation-for-bid/{id}
 *   updateInvitationForBidStatus  ↔ POST   /invitation-for-bid/status-update
 *   deleteInvitationForBid        ↔ DELETE /invitation-for-bid/{id}
 *   listBidderInvitationForBids   ↔ GET    /bidder/invitations
 *   getBidderInvitationForBid     ↔ GET    /bidder/invitations/{id}
 *
 * 调用方(view):
 *   - bid-inviter/InvitationForBid/List.vue → listInvitationForBids
 *   - bid-inviter/InvitationForBid/Create.vue → createInvitationForBid
 *   - bid-inviter/InvitationForBid/Edit.vue → getInvitationForBid + updateInvitationForBid
 *   - List.vue (操作列) → updateInvitationForBidStatus
 *   - List.vue (操作列) → deleteInvitationForBid
 *   - supplier/InvitationList.vue → listBidderInvitationForBids
 *   - supplier/BidRecordCreate.vue → getBidderInvitationForBid
 */
import { http } from '@/api/http'

import type { Diff, Result, PageResult } from '@/types/common'

import type { AddRequest, BidNoticeStatus, InvitationForBid, ListRequest, UpdateRequest } from '@/types/invitation-for-bid'


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

/** GET /bidder/invitations：投标方登录后浏览公告列表。 */
export function listBidderInvitationForBids(
    query: ListRequest = {}
): Promise<PageResult<InvitationForBid>> {
    return http
        .get<Result<PageResult<InvitationForBid>>>(
            '/bidder/invitations',
            { params: query }
        )
        .then((resp) => resp.data.data)
}

/**
 * GET /invitation-for-bid/{id} 按 ID 查询单条公告。
 *
 * BE 端点:InvitationForBidController.getByIdInvitationForBid。
 *   - 找到:返回 Result<InvitationForBid>(code 200)
 *   - 找不到:返回 Result.error(404, "记录不存在")(仍 HTTP 200)
 */
export function getInvitationForBid(id: number): Promise<InvitationForBid> {
    return http
        .get<Result<InvitationForBid>>(`/invitation-for-bid/${id}`)
        .then((resp) => resp.data.data)
}

/** GET /bidder/invitations/{id}：投标方登录后查看待投公告。 */
export function getBidderInvitationForBid(id: number): Promise<InvitationForBid> {
    return http
        .get<Result<InvitationForBid>>(`/bidder/invitations/${id}`)
        .then((resp) => resp.data.data)
}

/**
 * PATCH /invitation-for-bid/{id} 部分更新公告。
 *
 * BE 端点:InvitationForBidController.patchInvitationForBid。
 * PATCH 语义:UpdateRequest 中的 null 字段不修改。
 * 不支持修改 status(请使用 updateInvitationForBidStatus)。
 * 返回 Diff<InvitationForBid>(更新前后对比)。
 */
export function updateInvitationForBid(
    id: number,
    data: UpdateRequest
): Promise<Diff<InvitationForBid>> {
    return http
        .patch<Result<Diff<InvitationForBid>>>(`/invitation-for-bid/${id}`, data)
        .then((resp) => resp.data.data)
}

/**
 * POST /invitation-for-bid/status-update 变更公告状态。
 *
 * BE 端点:InvitationForBidController.updateInvitationForBidStatus。
 * body = { invitationId, status, remark? }。状态机由 BE 校验(IllegalArgumentException → 400)。
 * 返回更新后的实体(含最新 status)。
 */
export function updateInvitationForBidStatus(
    id: number,
    status: BidNoticeStatus,
    remark?: string
): Promise<InvitationForBid> {
    return http
        .post<Result<InvitationForBid>>('/invitation-for-bid/status-update', {
            invitationId: id,
            status,
            remark,
        })
        .then((resp) => resp.data.data)
}

/**
 * DELETE /invitation-for-bid/{id} 删除没有关联投标记录的公告。
 *
 * 后端会在同一事务写入 invitation_for_bid_operation_history 的 DELETE 快照；
 * 若公告仍有关联投标记录，则由后端拒绝删除并返回业务错误。
 */
export function deleteInvitationForBid(id: number): Promise<void> {
    return http
        .delete<Result<void>>(`/invitation-for-bid/${id}`)
        .then(() => undefined)
}
