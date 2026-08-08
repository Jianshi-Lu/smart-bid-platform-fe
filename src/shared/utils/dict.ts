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
    SINGLE_SOURCE: '单一来源采购',
    INQUIRY: '询价采购',
}

/** 招标方式：线上/线下组织形态，兼容公开/邀请招标等常见取值。 */
export const TENDER_METHOD_LABEL: Record<string, string> = {
    ONLINE: '线上（电子招标）',
    OFFLINE: '线下（现场招标）',
    OPEN_TENDER: '公开招标',
    INVITATION_TENDER: '邀请招标',
    COMPETITIVE_NEGOTIATION: '竞争性谈判',
    COMPETITIVE_CONSULTATION: '竞争性磋商',
    SINGLE_SOURCE: '单一来源采购',
    INQUIRY: '询价采购',
}

/** 采购方式：集中/分散组织形态，兼容招标类常见取值。 */
export const PURCHASE_METHOD_LABEL: Record<string, string> = {
    CENTRALIZED: '集中采购',
    DECENTRALIZED: '分散采购',
    OPEN_TENDER: '公开招标',
    INVITATION_TENDER: '邀请招标',
    COMPETITIVE_NEGOTIATION: '竞争性谈判',
    COMPETITIVE_CONSULTATION: '竞争性磋商',
    SINGLE_SOURCE: '单一来源采购',
    INQUIRY: '询价采购',
}

/** 资信文件转换状态显示映射。 */
export const CREDENTIAL_CONVERT_STATUS_LABEL: Record<string, string> = {
    UPLOADING: '上传中',
    UPLOADED: '已上传',
    CONVERTING: '转换中',
    CONVERTED: '已转换',
    FAILED: '失败',
}

/** 原始文件落入对象存储的状态显示映射。 */
export const ORIGINAL_STORAGE_STATUS_LABEL: Record<string, string> = {
    STORING: '原文件上传中',
    STORED: '原文件已存储',
    FAILED: '原文件存储失败',
}

/** 存储介质显示映射。 */
export const STORAGE_TYPE_LABEL: Record<string, string> = {
    LOCAL: '本地存储',
    MINIO: 'MinIO 对象存储',
}

/** 知识文件失败阶段显示映射。 */
export const KNOWLEDGE_ERROR_STAGE_LABEL: Record<string, string> = {
    CONVERT: '转换',
    VECTORIZE: '向量化',
    UNKNOWN: '未知',
}

/** 资信文件失败阶段显示映射（对齐 knowledge_file）。 */
export const CREDENTIAL_ERROR_STAGE_LABEL: Record<string, string> = {
    UPLOAD: '上传',
    CONVERT: '转换',
    UNKNOWN: '未知',
}

/** 投标记录风险分析状态显示映射。 */
export const RISK_ANALYSIS_STATUS_LABEL: Record<string, string> = {
    IDLE: '未分析',
    ANALYZING: '分析中',
    COMPLETED: '已完成',
    FAILED: '失败',
}

/** 知识文件转换状态显示映射。 */
export const KNOWLEDGE_CONVERT_STATUS_LABEL: Record<string, string> = {
    UPLOADED: '待转换',
    CONVERTING: '转换中',
    CONVERTED: '已转换',
    FAILED: '失败',
}

/** 知识文件向量化状态显示映射。 */
export const KNOWLEDGE_INDEX_STATUS_LABEL: Record<string, string> = {
    PENDING: '待向量化',
    VECTORIZING: '向量化中',
    VECTORIZED: '已入库',
    FAILED: '失败',
}

/** 固定枚举字段的统一显示注册表：字段代码名 → 英文值 → 中文显示。 */
export type EnumFieldKey =
    | 'bidNoticeStatus'
    | 'riskLevel'
    | 'riskAnalysisStatus'
    | 'credentialConvertStatus'
    | 'originalStorageStatus'
    | 'credentialErrorStage'
    | 'knowledgeConvertStatus'
    | 'knowledgeIndexStatus'
    | 'knowledgeErrorStage'
    | 'storageType'
    | 'platformCategory'
    | 'tenderProcess'
    | 'tenderMethod'
    | 'purchaseMethod'

export const FIELD_ENUM_LABELS: Record<EnumFieldKey, Record<string, string>> = {
    bidNoticeStatus: BID_NOTICE_STATUS_LABEL,
    riskLevel: RISK_LEVEL_LABEL,
    riskAnalysisStatus: RISK_ANALYSIS_STATUS_LABEL,
    credentialConvertStatus: CREDENTIAL_CONVERT_STATUS_LABEL,
    originalStorageStatus: ORIGINAL_STORAGE_STATUS_LABEL,
    credentialErrorStage: CREDENTIAL_ERROR_STAGE_LABEL,
    knowledgeConvertStatus: KNOWLEDGE_CONVERT_STATUS_LABEL,
    knowledgeIndexStatus: KNOWLEDGE_INDEX_STATUS_LABEL,
    knowledgeErrorStage: KNOWLEDGE_ERROR_STAGE_LABEL,
    storageType: STORAGE_TYPE_LABEL,
    platformCategory: PLATFORM_CATEGORY_LABEL,
    tenderProcess: TENDER_PROCESS_LABEL,
    tenderMethod: TENDER_METHOD_LABEL,
    purchaseMethod: PURCHASE_METHOD_LABEL,
}

/** 取字段枚举的中文显示；未知值原样显示，空值显示 -。 */
export function enumLabel(
    field: EnumFieldKey,
    value: string | null | undefined,
): string {
    return dictLabel(FIELD_ENUM_LABELS[field], value)
}

/** 取字段枚举的下拉选项（英文值 → 中文显示），供 el-select 复用。 */
export function enumOptions(field: EnumFieldKey): Array<[string, string]> {
    return Object.entries(FIELD_ENUM_LABELS[field])
}

export const KNOWLEDGE_CONVERT_STATUS_DESC: Record<string, string> = {
    UPLOADED: '原始文件已存入对象存储，等待转换',
    CONVERTING: '正在调用转换服务生成 Markdown',
    CONVERTED: 'Markdown 已生成并通过完整性校验',
    FAILED: '转换失败，可点击重试',
}

/** 资信文件转换状态图例说明。 */
export const CREDENTIAL_CONVERT_STATUS_DESC: Record<string, string> = {
    UPLOADING: '批次仍在接收文件',
    UPLOADED: '原始文件已落盘，等待转换',
    CONVERTING: '正在调用转换服务生成 Markdown',
    CONVERTED: 'Markdown 已生成并通过完整性校验',
    FAILED: '转换失败',
}

export const ORIGINAL_STORAGE_STATUS_DESC: Record<string, string> = {
    STORING: '正在写入 MinIO 或其他对象存储',
    STORED: '原始文件已完成对象存储写入并通过校验',
    FAILED: '原始文件写入对象存储失败，可重试上传',
}

export const KNOWLEDGE_INDEX_STATUS_DESC: Record<string, string> = {
    PENDING: '等待写入向量库',
    VECTORIZING: '正在写入 Chroma 向量库',
    VECTORIZED: '已写入向量库，可用于智能问答',
    FAILED: '向量化失败，可点击重试',
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
