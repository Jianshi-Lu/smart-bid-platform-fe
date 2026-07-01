/**
 * 招标公告相关 TS 类型。
 *
 * 字段名严格对齐 BE 的 AddRequest.java / InvitationForBid.java (V18 重命名后)。
 * BE 修改字段后必须同步更新本文件;FE 不允许自行调整字段命名。
 */
export type BidNoticeStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'AWARDED' | 'CANCELLED'

export interface InvitationForBid {
    invitationId: number
    bidHandlerId: number
    projectNo: string
    purchaseTaskNo: string
    platformCategory?: string
    tenderProcess?: string
    tenderMethod?: string
    purchaseMethod?: string
    isFixedPrice?: boolean
    hasDocumentFee?: boolean
    deposit?: number
    creditReportRequired?: boolean
    registrationDeadline?: string   // ISO-8601 字符串
    technicalTenderDeadline?: string
    businessTenderDeadline?: string
    notes?: string
    purchaseCompany?: string
    purchaseDepartment?: string
    tenderingParty?: string
    createdAt?: string
    status?: BidNoticeStatus
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