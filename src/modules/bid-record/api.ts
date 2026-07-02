/**
 * 投标记录模块 API。
 *
 * 通过 http 实例调用,自动应用拦截器(code != 200 转 ApiError)。
 * 调用方只需 try/catch + instanceof ApiError 判错,无需关心 envelope。
 */
import { http } from '@/api/http'

import type { Result, PageResult } from '@/types/common'

import type { AddRequest, BidRecord, ListRequest } from '@/modules/bid-record/types'


/**
 * POST /bid-record/add 创建投标记录。
 *
 * 必填: invitationId / bidderName / quotePrice / bidderContact。
 * 注意: bidNo 与 bidAt 由 BE 自动算,客户端不传也不接收(返回 entity 时 BE 填好)。
 */
export function createBidRecord(data: AddRequest): Promise<BidRecord> {
    return http
        .post<Result<BidRecord>>('/bid-record/add', data)
        .then((resp) => resp.data.data)
}

/**
 * GET /bid-record 分页查询投标记录(PageHelper)。
 *
 * 走 Vite 代理(http://localhost:8080/bid-record?page=&pageSize=&sort=),
 * 返回值已拆 envelope,直接拿到 PageResult<BidRecord>。
 *
 * BE 端点 @RequestParam 默认值: page=1, pageSize=10, sort="bid_record_id desc"。
 */
export function listBidRecords(
    query: ListRequest = {}
): Promise<PageResult<BidRecord>> {
    return http
        .get<Result<PageResult<BidRecord>>>('/bid-record', { params: query })
        .then((resp) => resp.data.data)
}
