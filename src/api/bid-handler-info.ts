/**
 * 招标经办人模块 API。
 *
 * 通过 http 实例调用,自动应用拦截器(code != 200 转 ApiError)。
 * 调用方只需 try/catch + instanceof ApiError 判错,无需关心 envelope。
 *
 * ─── Class hierarchy ───
 *   export function createBidHandlerInfo(data: AddRequest): Promise<BidHandlerInfo>
 *   export function listBidHandlers(query: ListRequest): Promise<PageResult<BidHandlerInfo>>
 *
 * 关系:2 个函数一对一映射 BE BidHandlerInfoController 的 2 个端点:
 *   createBidHandlerInfo  ↔ POST /bid-handler-info/add
 *   listBidHandlers       ↔ GET  /bid-handler-info
 *
 * 调用方(view):
 *   - purchaser/BidHandlerInfo/List.vue   → listBidHandlers
 *   - purchaser/BidHandlerInfo/Create.vue → createBidHandlerInfo
 *
 * 业务注意: BE 在 add 后会异步发送通知邮件到 targetEmail(失败不影响主流程)。
 */
import { http } from '@/api/http'

import type { Result, PageResult } from '@/types/common'

import type { AddRequest, BidHandlerInfo, ListRequest } from '@/types/bid-handler-info'


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
