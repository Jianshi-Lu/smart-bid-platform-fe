/**
 * 招标公告相关 TS 类型。
 *
 * 字段名严格对齐 BE 的 AddRequest.java / InvitationForBid.java (V18 重命名后)。
 * BE 修改字段后必须同步更新本文件;FE 不允许自行调整字段命名。
 */
export type BidNoticeStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'AWARDED' | 'CANCELLED'

/**
 * 公告实体(BE 返回的 JSON 结构)。
 * 对齐 BE InvitationForBid.java 的 getter 命名(驼峰)。
 */
export interface InvitationForBid {
    invitationId: number            // 主键,自增
    bidHandlerId: number            // 经办人 ID
    projectNo: string               // 项目编号
    purchaseTaskNo: string          // 采购任务编号
    platformCategory?: string       // 平台采购类别
    tenderProcess?: string          // 招标流程
    tenderMethod?: string           // 招标方式
    purchaseMethod?: string         // 采购方式
    isFixedPrice?: boolean          // 是否固定价
    hasDocumentFee?: boolean        // 是否有文件费
    deposit?: number                // 保证金(BigDecimal → JSON number)
    creditReportRequired?: boolean  // 是否需要资信报告
    registrationDeadline?: string   // 报名截止时间,ISO-8601 字符串
    technicalTenderDeadline?: string// 技术投标截止时间,ISO-8601 字符串
    businessTenderDeadline?: string // 商务投标截止时间,ISO-8601 字符串
    notes?: string                  // 备注
    purchaseCompany?: string        // 采购公司
    purchaseDepartment?: string     // 采购部门
    tenderingParty?: string         // 招标主体
    createdAt?: string              // 创建时间,ISO-8601 字符串(BE 自动填充)
    status?: BidNoticeStatus        // 状态(BE 自动设为 DRAFT)
}

export interface AddRequest {
    bidHandlerId: number           // 必填
    projectNo: string              // 必填
    purchaseTaskNo: string         // 必填
    platformCategory?: string
    tenderProcess?: string
    tenderMethod?: string
    purchaseMethod?: string
    isFixedPrice?: boolean
    hasDocumentFee?: boolean
    deposit?: number
    creditReportRequired?: boolean
    registrationDeadline?: string
    technicalTenderDeadline?: string
    businessTenderDeadline?: string
    notes?: string
    purchaseCompany?: string
    purchaseDepartment?: string
    tenderingParty?: string
}

/**
 * 列表查询参数,字段名严格对齐 BE 的 @RequestParam 形参名。
 *
 * BE 默认值: page=1, pageSize=10, sort="invitation_id desc"。
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
     * 例: "invitation_id desc" / "created_at asc" / "project_no asc"
     * BE 透传给 ORDER BY 子句。
     */
    sort?: string
}