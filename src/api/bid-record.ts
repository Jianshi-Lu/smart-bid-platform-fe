/**
 * 投标记录模块 API。
 *
 * 文件职责: 封装 bid-record 模块的所有 BE 调用,通过 http 实例自动应用拦截器。
 *
 * 依赖关系:
 *   - 上游(被依赖): types/common.ts (Result<T>)、bid-record/types.ts (类型定义)
 *   - 下游(依赖): api/http.ts (http 实例 + ApiError + 拦截器)
 *
 * 数据承接载体(view ↔ api ↔ http ↔ BE):
 *   - createBidRecord: AddRequest (4 必填 + 1 可选) → BidRecord 实体(含 BE 自动算的 bidNo/bidAt)
 *   - listBidRecords:  ListRequest (page/pageSize/sort) → PageResult<BidRecord>
 *   - analyzeRisk:     number (bidRecordId) → RiskAnalysis 实体(类型见 risk-analysis 模块)
 *
 * 对应后端调用入口(BidRecordController.java):
 *   - POST /bid-record/add                  → addBidRecord
 *   - GET  /bid-record?page=&pageSize=&sort= → listBidRecord (PageHelper 分页)
 *   - POST /bid-record/analyze-risk/{id}    → analyzeRisk (同步 DeepSeek,落库 risk_analysis)
 *
 * 跨模块依赖: RiskAnalysis 类型来自 modules/risk-analysis/types.ts(后端独立 Controller 后
 *           前端同步分离,bid-record 通过 import 引用,严格单向依赖)。
 *
 * 错误处理: 所有调用都通过拦截器统一包装 ApiError,view 只需 try/catch + instanceof ApiError。
 */
import { http } from '@/api/http'

import type { Result, PageResult } from '@/types/common'

import type { AddRequest, BidRecord, ListRequest } from '@/types/bid-record'
import type { RiskAnalysis } from '@/types/risk-analysis'


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

/**
 * POST /bid-record/analyze-risk/{id} 触发 AI 风险分析(同步 DeepSeek 调用)。
 *
 * 流程: BE 同步调用 DeepSeek → 解析 JSON → 落库 risk_analysis 表 → 返回最新 analysis。
 * 耗时可能数秒到数十秒,前端按钮需置 loading。
 */
export function analyzeRisk(id: number): Promise<RiskAnalysis> {
    return http
        // 后端入口: POST /bid-record/analyze-risk/{id}
        // 数据承接载体: id (number) → RiskAnalysis 实体(含 analysisId/riskLevel/summary/suggestions 等)
        .post<Result<RiskAnalysis>>(`/bid-record/analyze-risk/${id}`)
        // http 拦截器拆 envelope,Promise resolve(analysis)
        .then((resp) => resp.data.data)
}