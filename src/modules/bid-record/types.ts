/**
 * 投标记录相关 TS 类型。
 *
 * 字段名严格对齐 BE 的 AddRequest.java / BidRecord.java (V18 重命名后)。
 * BE 修改字段后必须同步更新本文件;FE 不允许自行调整字段命名。
 *
 * 特殊字段说明:
 *   - bidNo: BE 在 add 时按 (invitationId, bidderName) 计算 max(bid_no)+1,客户端不传
 *   - bidAt: BE 在 add 时自动设为当前时间,客户端不传
 *   - credentials: 资信材料链接,可选,BE @Size(max=500)
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
