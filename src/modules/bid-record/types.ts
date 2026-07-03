/**
 * 投标记录 + 风险分析 TS 类型。
 *
 * 文件职责: 镜像 BE 的 BidRecord.java / RiskAnalysis.java / 各 *Request.java,
 *          提供给 view 和 api 层使用。
 *
 * 字段命名: 严格对齐 BE getter(驼峰);BE 修改字段后必须同步更新本文件。
 *           字段顺序与 BE entity 一致,便于对照。
 *
 * 特殊字段:
 *   - BidRecord.bidNo / bidAt: BE 自动算/填,AddRequest 不包含,form 无输入框
 *   - BidRecord.credentials: 资信材料链接,可选
 *   - RiskAnalysis.riskLevel: 枚举字符串 (LOW / MEDIUM / HIGH / CRITICAL)
 *   - RiskAnalysis.rawResponse: DeepSeek 原始 JSON 字符串,长度大,UI 默认不展示
 *
 * 依赖关系: 不依赖任何业务文件,只 import 自有类型。
 */

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
 * 列表查询参数,字段名严格对齐 BE 的 @RequestParam 形参名。
 *
 * BE 默认值: page=1, pageSize=10, sort="bid_record_id desc"。
 * 实际请求时 axios 会把 undefined 字段自动剔除,BE 走 defaultValue。
 */
export interface ListRequest {
    /** 页号,从 1 开始 */
    page?: number
    /** 每页条数 */
    pageSize?: number
    /**
     * 排序参数: SQL 列名 + 空格 + 方向。
     *
     * 注意: 这是 SQL 列名(**snake_case**),不是实体属性(camelCase)。
     * 例: "bid_record_id desc" / "quote_price asc" / "bid_at desc"
     * BE 透传给 ORDER BY 子句。
     */
    sort?: string
}

/**
 * 风险分析结果(BE 返回的 JSON 结构)。
 * 对齐 BE RiskAnalysis.java 的 getter 命名(驼峰)。
 *
 * 由 RiskAnalysisService.analyzeRisk() 同步生成,落库 risk_analysis 表后返回。
 */
export interface RiskAnalysis {
    analysisId: number          // 主键,自增
    bidRecordId: number         // 关联的投标记录 ID
    bidderName: string          // 投标人名称(冗余存储,便于查询)
    riskLevel: string           // 风险等级(枚举字符串: LOW / MEDIUM / HIGH / CRITICAL)
    summary: string             // 风险摘要(AI 生成的简短描述)
    suggestions: string         // 风险建议(AI 生成的处置建议)
    rawResponse?: string        // DeepSeek 原始 JSON 字符串(可选,长度大,UI 默认不展示)
    promptVersion?: string      // 提示词版本(可选,用于追溯 AI 行为)
    analyzedAt: string          // 分析时间,ISO-8601 字符串
}