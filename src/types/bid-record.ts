/**
 * 投标记录 TS 类型。
 *
 * 文件职责: 镜像 BE 的 BidRecord.java / 各 *Request.java,
 *          提供给 view 和 api 层使用。
 *
 * 字段命名: 严格对齐 BE getter(驼峰);BE 修改字段后必须同步更新本文件。
 *           字段顺序与 BE entity 一致,便于对照。
 *
 * 特殊字段:
 *   - BidRecord.bidNo / bidAt: BE 自动算/填,AddRequest 不包含,form 无输入框
 *   - BidRecord.credentials: 资信材料链接,可选
 *
 * 注意: 风险分析相关类型(RiskAnalysis)已迁移到 src/types/risk-analysis.ts,
 *       本模块通过 import 引用(BidRecord 列表的"风险分析"按钮 + 弹窗)。
 *
 * 依赖关系: 仅依赖 types/common.ts 的通用 PageRequest。
 *
 * ─── Class hierarchy ───
 *   export interface BidRecord   { 8 字段(主键 + 6 必填 + 1 可选) }
 *   export interface AddRequest  { 5 字段(4 必填 + 1 可选;不含 bidNo/bidAt) }
 *   export type ListRequest = PageRequest
 *
 * 关系:
 *   - AddRequest   是投标方 createBidderBidRecord 的入参体
 *   - ListRequest  是 listBidRecords 的 query 参数
 *   - BidRecord    是 BE 返回的实体 (含 BE 自动算的 bidNo/bidAt)
 *
 * 调用方(view):
 *   - List.vue:   BidRecord + ListRequest + RiskAnalysis (跨模块 import)
 *   - Create.vue: AddRequest
 *   - supplier/BidRecordCreate.vue: AddRequest + BidRecord (返回值)
 *
 * 注意:
 *   - BidRecord.bidNo / bidAt: BE 在 add 时自动算/填,AddRequest 不包含,form 无输入框
 *   - credentials(资信材料)可选,BE @Size(max=500)
 *   - 风险分析相关类型已迁移到 risk-analysis 模块,本文件单向 import
 */
import type { PageRequest } from '@/types/common'

/**
 * 投标记录实体(BE 返回的 JSON 结构)。
 * 对齐 BE BidRecord.java 的 getter 命名(驼峰)。
 */
export interface BidRecord {
    bidRecordId: number        // 主键,自增
    invitationId: number       // 招标公告 ID(逻辑 FK → invitation_for_bid.invitation_id)
    bidNo: number              // 投标次序,BE 自动算,同 invitationId+bidderName 下递增
    bidAt: string              // 投标时间,BE 自动填,ISO-8601 字符串
    bidderName: string         // 投标人名称
    quotePrice: number         // 报价(BigDecimal → JSON number)
    bidderContact: string      // 投标人联系方式
    credentials?: string       // 资信材料链接(可选)
}

export interface AddRequest {
    invitationId: number       // 必填,BE @NotNull
    bidderName: string         // 必填,BE @NotBlank + @Size(max=100)
    quotePrice: number         // 必填,BE @NotNull
    bidderContact: string      // 必填,BE @NotBlank + @Size(max=255)
    credentials?: string       // 可选,BE @Size(max=500)
}

/**
 * 更新投标记录请求(PATCH 语义，null/undefined 字段表示"不修改")。
 * 对齐 BE UpdateRequest：不开放 invitationId / bidNo / bidAt / 账号归属修改。
 */
export interface UpdateRequest {
    bidderName?: string
    quotePrice?: number
    bidderContact?: string
    credentials?: string
}

/**
 * 列表查询参数,字段名严格对齐 BE 的 @RequestParam 形参名。
 *
 * BE 默认值: page=1, pageSize=10, sort="bid_record_id desc"。
 * 实际请求时 axios 会把 undefined 字段自动剔除,BE 走 defaultValue。
 */
export type ListRequest = PageRequest
