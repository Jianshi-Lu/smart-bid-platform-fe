/**
 * 招标经办人相关 TS 类型。
 *
 * 字段名严格对齐 BE 的 AddRequest.java / BidHandlerInfo.java (V18 重命名后)。
 * BE 修改字段后必须同步更新本文件;FE 不允许自行调整字段命名。
 */

/**
 * 经办人实体(BE 返回的 JSON 结构)。
 * 对齐 BE BidHandlerInfo.java 的 getter 命名(驼峰)。
 */
export interface BidHandlerInfo {
    bidHandlerId: number        // 主键,自增
    handlerName: string         // 经办人姓名
    companyName: string         // 所属公司
    departmentName: string      // 所属部门
    targetEmail: string         // 通知邮件收件人
}

export interface AddRequest {
    handlerName: string         // 必填,BE @NotBlank + @Size(max=50)
    companyName: string         // 必填,BE @NotBlank + @Size(max=100)
    departmentName: string      // 必填,BE @NotBlank + @Size(max=100)
    targetEmail: string         // 必填,BE @NotBlank + @Size(max=255)
}

/**
 * 列表查询参数,字段名严格对齐 BE 的 @RequestParam 形参名。
 *
 * BE 默认值: page=1, pageSize=3, sort="bid_handler_id desc"。
 * FE 显式传 pageSize=10 覆盖 BE 默认的 3,与 invitation-for-bid 列表行为一致。
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
     * 例: "bid_handler_id desc" / "handler_name asc"
     * BE 透传给 ORDER BY 子句。
     */
    sort?: string
}
