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
 *   - getBidRecord:    number (bidRecordId) → BidRecord
 *   - listBidRecords:  ListRequest (page/pageSize/sort) → PageResult<BidRecord>
 *   - analyzeRisk:     number (bidRecordId) → RiskAnalysis 实体(类型见 risk-analysis 模块)
 *
 * 对应后端调用入口(BidRecordController.java):
 *   - GET  /bid-record/{id}                 → getBidRecord
 *   - GET  /bid-record?page=&pageSize=&sort= → listBidRecord (PageHelper 分页)
 *   - POST /bid-record/analyze-risk/{id}    → analyzeRisk (同步 DeepSeek,落库 risk_analysis)
 *
 * 跨模块依赖: RiskAnalysis 类型来自 types/risk-analysis.ts(后端独立 Controller 后
 *           前端同步分离,bid-record 通过 import 引用,严格单向依赖)。
 *
 * 错误处理: 拦截器统一包装 ApiError,调用方通过 getErrorMessage 展示异常。
 *
 * ─── Class hierarchy ───
 *   export function getBidRecord(id: number): Promise<BidRecord>
 *   export function listBidRecords(query: ListRequest): Promise<PageResult<BidRecord>>
 *   export function analyzeRisk(id: number): Promise<RiskAnalysis>            // 跨模块: 副作用落库 risk_analysis
 *
 * 关系:3 个函数一对一映射 BE BidRecordController 的端点:
 *   getBidRecord     ↔ GET  /bid-record/{id}
 *   listBidRecords   ↔ GET  /bid-record
 *   analyzeRisk      ↔ POST /bid-record/analyze-risk/{id}     (BE 同步 DeepSeek → 落库 risk_analysis)
 *
 * 调用方(view):
 *   - bid-inviter/BidRecord/List.vue   → listBidRecords + analyzeRisk (行内按钮)
 *   - getBidRecord 为后续资信上传页校验路由中的 bidRecordId 预留，当前尚无对应 view/route
 */
import { http } from '@/api/http'

import type { Result, PageResult } from '@/types/common'

import type { BidRecord, ListRequest } from '@/types/bid-record'
import type { RiskAnalysis } from '@/types/risk-analysis'


/**
 * GET /bid-record/{id} 按 ID 查询投标记录。
 *
 * 预留给后续资信材料上传页，用于根据路由中的 bidRecordId 确认文件所属记录。
 */
export function getBidRecord(id: number): Promise<BidRecord> {
    return http
        .get<Result<BidRecord>>(`/bid-record/${id}`)
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
