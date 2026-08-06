/**
 * 前端展示层字典：只做显示映射，不改任何业务字段值。
 *
 * - 固定枚举：公告状态、风险等级；
 * - 常见自由文本：平台类别 / 招标流程 / 采购方式（存量数据可能是英文，展示时转中文，未知值原样显示）；
 * - 布尔字段统一显示为「是 / 否」。
 */
import type { BidNoticeStatus } from '@/types/invitation-for-bid'
import type { RiskLevel } from '@/types/risk-analysis'

export const BID_NOTICE_STATUS_LABEL: Record<BidNoticeStatus, string> = {
    DRAFT: '草稿',
    PUBLISHED: '已发布',
    CLOSED: '已截止',
    AWARDED: '已定标',
    CANCELLED: '已取消',
}

export const BID_NOTICE_STATUS_DESC: Record<BidNoticeStatus, string> = {
    DRAFT: '创建后尚未发布',
    PUBLISHED: '已对外公开，可接受投标',
    CLOSED: '投标已截止，进入评审阶段',
    AWARDED: '已完成定标',
    CANCELLED: '公告已取消',
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
    CRITICAL: '严重',
}

export const RISK_LEVEL_DESC: Record<RiskLevel, string> = {
    LOW: '风险较低，可正常推进',
    MEDIUM: '存在一定风险，需持续关注',
    HIGH: '风险较高，需重点处理',
    CRITICAL: '风险严重，需立即处置',
}

export const PLATFORM_CATEGORY_LABEL: Record<string, string> = {
    SERVICE: '服务类',
    GOODS: '货物类',
    ENGINEERING: '工程类',
}

export const TENDER_PROCESS_LABEL: Record<string, string> = {
    OPEN_TENDER: '公开招标',
    INVITATION_TENDER: '邀请招标',
    COMPETITIVE_NEGOTIATION: '竞争性谈判',
    COMPETITIVE_CONSULTATION: '竞争性磋商',
    SINGLE_SOURCE: '单一来源',
    INQUIRY: '询价',
}

export const PURCHASE_METHOD_LABEL: Record<string, string> = {
    OPEN_TENDER: '公开招标',
    INVITATION_TENDER: '邀请招标',
    COMPETITIVE_NEGOTIATION: '竞争性谈判',
    COMPETITIVE_CONSULTATION: '竞争性磋商',
    SINGLE_SOURCE: '单一来源',
    INQUIRY: '询价',
}

/** 字典映射：已知值转中文，未知值原样显示，空值显示 -。 */
export function dictLabel(
    map: Record<string, string>,
    value: string | null | undefined,
): string {
    if (value == null || value === '') return '-'
    return map[value] ?? value
}

/** 布尔字段显示为「是 / 否」。 */
export function boolLabel(value: boolean | null | undefined): string {
    if (value == null) return '-'
    return value ? '是' : '否'
}
