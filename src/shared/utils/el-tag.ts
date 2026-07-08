/**
 * Element Plus el-tag 颜色常量(全枚举映射,无副作用)。
 *
 * ─── Class hierarchy ───
 *   export type ElementTagType         ('info' | 'primary' | 'success' | 'warning' | 'danger' | '')
 *   export const BID_NOTICE_STATUS_TYPE  (BidNoticeStatus → ElementTagType,5 项全枚举)
 *   export const RISK_LEVEL_TYPE         (RiskLevel → ElementTagType,4 项全枚举)
 *
 * 关系: 两个 const 都是不可变映射,无内部调用。
 *
 * 设计原则:
 *   - 颜色与 enum 字符串一一对应,新增 enum 必须同步更新 map
 *   - 类型严格 Record<Enum, ElementTagType>,所有项必须覆盖(漏一个 TS 编译会报错)
 *   - 模板用 `?? 'info'` 兜底,即使将来 BE 多发一个未知值也不会 TS 报错
 *
 * 跨模块依赖:
 *   - 入依赖: BID_NOTICE_STATUS_TYPE 被 invitation-for-bid 模块的 List.vue / Edit.vue 模板用
 *   - 入依赖: RISK_LEVEL_TYPE 被 risk-analysis 模块的 List.vue / BidRecord.List.vue 用
 *   - 出依赖: types/invitation-for-bid.ts (BidNoticeStatus)
 *              types/risk-analysis.ts (RiskLevel)
 */
import type { BidNoticeStatus } from '@/types/invitation-for-bid'

export type ElementTagType = '' | 'info' | 'primary' | 'success' | 'warning' | 'danger'

export const BID_NOTICE_STATUS_TYPE: Record<BidNoticeStatus, ElementTagType> = {
  DRAFT: 'info',
  PUBLISHED: 'primary',
  CLOSED: 'warning',
  AWARDED: 'success',
  CANCELLED: 'danger',
}

export const RISK_LEVEL_TYPE: Record<import('@/types/risk-analysis').RiskLevel, ElementTagType> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
}
