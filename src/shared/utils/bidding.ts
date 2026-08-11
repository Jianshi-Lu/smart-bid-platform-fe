import type { InvitationForBid } from '@/types/invitation-for-bid'

export interface BiddingAvailability {
  open: boolean
  reason: string
}

/**
 * 判断公告当前是否允许提交投标。
 *
 * 状态必须为已发布；配置了商务投标截止时间时，当前时间还必须早于截止时间。
 * 前端判断只用于及时反馈，最终业务约束仍由后端重复校验。
 */
export function getBiddingAvailability(
  invitation: Pick<InvitationForBid, 'status' | 'businessTenderDeadline'>,
  nowMillis = Date.now(),
): BiddingAvailability {
  if (invitation.status !== 'PUBLISHED') {
    return { open: false, reason: '当前公告未处于已发布状态，不能提交投标' }
  }

  const deadline = invitation.businessTenderDeadline
  if (!deadline) {
    return { open: true, reason: '' }
  }

  const deadlineMillis = Date.parse(deadline)
  if (!Number.isFinite(deadlineMillis)) {
    return { open: false, reason: '商务投标截止时间无效，请联系招标方处理' }
  }
  if (nowMillis >= deadlineMillis) {
    return { open: false, reason: '商务投标已截止，不能继续提交投标' }
  }
  return { open: true, reason: '' }
}
