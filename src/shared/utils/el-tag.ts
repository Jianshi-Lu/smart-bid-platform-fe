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

/** 知识文件转换状态 → 标签颜色。 */
export const KNOWLEDGE_CONVERT_STATUS_TYPE: Record<string, ElementTagType> = {
  UPLOADED: 'info',
  CONVERTING: 'warning',
  CONVERTED: 'success',
  FAILED: 'danger',
}

/** 知识文件向量化状态 → 标签颜色。 */
export const KNOWLEDGE_INDEX_STATUS_TYPE: Record<string, ElementTagType> = {
  PENDING: 'info',
  VECTORIZING: 'warning',
  VECTORIZED: 'success',
  FAILED: 'danger',
}

/** 资信文件转换状态 → 标签颜色。 */
export const CREDENTIAL_CONVERT_STATUS_TYPE: Record<string, ElementTagType> = {
  UPLOADING: 'info',
  UPLOADED: 'info',
  CONVERTING: 'warning',
  CONVERTED: 'success',
  FAILED: 'danger',
}

/** 资信文件向量化状态 → 标签颜色。 */
export const CREDENTIAL_INDEX_STATUS_TYPE: Record<string, ElementTagType> = {
  PENDING: 'info',
  VECTORIZING: 'warning',
  VECTORIZED: 'success',
  FAILED: 'danger',
}

/** 原始文件对象存储状态 → 标签颜色。 */
export const ORIGINAL_STORAGE_STATUS_TYPE: Record<string, ElementTagType> = {
  STORING: 'warning',
  STORED: 'success',
  FAILED: 'danger',
}

/**
 * 风险等级额外样式类：严重（CRITICAL）与高（HIGH）都用 danger 主色，
 * 通过该 class 加深严重等级，形成视觉区分。
 */
export const RISK_LEVEL_TAG_CLASS: Record<import('@/types/risk-analysis').RiskLevel, string> = {
  LOW: '',
  MEDIUM: '',
  HIGH: '',
  CRITICAL: 'is-critical',
}
