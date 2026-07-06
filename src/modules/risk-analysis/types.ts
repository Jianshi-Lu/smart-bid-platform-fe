/**
 * 风险分析记录 TS 类型。
 *
 * 文件职责: 镜像 BE RiskAnalysisController / RiskAnalysisService 的相关实体,
 *          提供给 risk-analysis 视图和 api 层使用。
 *
 * 字段命名: 严格对齐 BE getter(驼峰);BE 修改字段后必须同步更新本文件。
 *
 * 特殊字段:
 *   - riskLevel: 枚举字符串 (LOW / MEDIUM / HIGH / CRITICAL)
 *   - rawResponse: DeepSeek 原始 JSON 字符串,长度大,UI 默认不展示
 *   - promptVersion: 提示词版本,可追溯 AI 行为
 *
 * 依赖关系: 不依赖任何业务文件,只 import 自有类型。
 *
 * 历史: RiskAnalysis 类型原本定义在 src/modules/bid-record/types.ts(bid-record 列表
 *       的行内"风险分析"按钮需要此类型展示 dialog)。
 *       后端新增独立 RiskAnalysisController(GET /risk-analysis)后,前端同步分离
 *       为独立 risk-analysis 模块,bid-record 通过 import 引用此类型。
 */

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

/**
 * 列表查询参数,字段名严格对齐 BE 的 @RequestParam 形参名。
 *
 * BE 默认值: page=1, pageSize=10, sort="analysis_id desc"。
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
     * 例: "analysis_id desc" / "risk_level asc" / "analyzed_at desc"
     * BE 透传给 ORDER BY 子句。
     */
    sort?: string
}