/**
 * 招标经办人模块 API。
 *
 * 通过 http 实例调用,自动应用拦截器(code != 200 转 ApiError)。
 * 调用方通过 getErrorMessage 统一展示异常,无需关心 envelope。
 *
 * ─── Class hierarchy ───
 *   export function createBidHandlerInfo(data: AddRequest): Promise<BidHandlerInfo>
 *   export function listBidHandlers(query: ListRequest): Promise<PageResult<BidHandlerInfo>>
 *   export function getBidHandlerInfo(id: number): Promise<BidHandlerInfo>
 *   export function updateBidHandlerInfo(id: number, data: UpdateRequest): Promise<void>
 *   export function deleteBidHandlerInfo(id: number): Promise<void>
 *
 * 关系:5 个函数一对一映射 BE BidHandlerInfoController 的单条管理端点:
 *   createBidHandlerInfo  ↔ POST /bid-handler-info/add
 *   listBidHandlers       ↔ GET  /bid-handler-info
 *   getBidHandlerInfo     ↔ GET  /bid-handler-info/{id}
 *   updateBidHandlerInfo  ↔ PATCH /bid-handler-info/{id}
 *   deleteBidHandlerInfo  ↔ DELETE /bid-handler-info/{id}
 *
 * 调用方(view):
 *   - bid-inviter/BidHandlerInfo/List.vue   → listBidHandlers / deleteBidHandlerInfo
 *   - bid-inviter/BidHandlerInfo/Create.vue → createBidHandlerInfo / getBidHandlerInfo / updateBidHandlerInfo
 *
 * 业务注意: BE 在 add 后会异步发送通知邮件到 targetEmail(失败不影响主流程)。
 */
import { http } from '@/api/http'

import type { Result, PageResult } from '@/types/common'

import type {
    AddRequest,
    BidHandlerInfo,
    ListRequest,
    UpdateRequest,
} from '@/types/bid-handler-info'


/** POST /bid-handler-info/add 创建经办人。必填: handlerName / companyName / departmentName / targetEmail。 */
export function createBidHandlerInfo(data: AddRequest): Promise<BidHandlerInfo> {
    return http
        .post<Result<BidHandlerInfo>>('/bid-handler-info/add', data)
        .then((resp) => resp.data.data)
}

/**
 * GET /bid-handler-info 分页查询经办人(PageHelper)。
 *
 * 走 Vite 代理(http://localhost:8080/bid-handler-info?page=&pageSize=&sort=),
 * 返回值已拆 envelope,直接拿到 PageResult<BidHandlerInfo>。
 *
 * BE 端点 @RequestParam 默认值: page=1, pageSize=3, sort="bid_handler_id desc"。
 * FE 显式传 pageSize=10 覆盖 BE 默认。
 */
export function listBidHandlers(
    query: ListRequest = {}
): Promise<PageResult<BidHandlerInfo>> {
    return http
        .get<Result<PageResult<BidHandlerInfo>>>('/bid-handler-info', { params: query })
        .then((resp) => resp.data.data)
}

/** GET /bid-handler-info/{id} 按 ID 读取经办人，用于编辑页初始化。 */
export function getBidHandlerInfo(id: number): Promise<BidHandlerInfo> {
    return http
        .get<Result<BidHandlerInfo>>(`/bid-handler-info/${id}`)
        .then((resp) => resp.data.data)
}

/**
 * PATCH /bid-handler-info/{id} 更新经办人。
 *
 * 后端返回 Diff<BidHandlerInfo> 供审计展示；当前表单只关心成功与否，
 * 因此在 API 边界收敛为 void，避免页面重复解析后端实体快照。
 */
export function updateBidHandlerInfo(id: number, data: UpdateRequest): Promise<void> {
    return http
        .patch<Result<unknown>>(`/bid-handler-info/${id}`, data)
        .then(() => undefined)
}

/**
 * DELETE /bid-handler-info/{id} 删除未被招标公告引用的经办人。
 *
 * 后端在同一事务写入 bid_handler_info_operation_history 的 DELETE 快照；
 * 若仍有招标公告引用该经办人，则拒绝删除以避免逻辑外键悬空。
 */
export function deleteBidHandlerInfo(id: number): Promise<void> {
    return http
        .delete<Result<void>>(`/bid-handler-info/${id}`)
        .then(() => undefined)
}
