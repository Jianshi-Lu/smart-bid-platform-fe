import type { InvitationForBid } from '@/types/invitation-for-bid'

export interface BiddingAvailability {
  open: boolean
  reason: string
}

/**
 * 判断公告当前是否允许提交投标。
 *
 * 只有招标公告状态是投标准入依据：已发布即允许提交投标。
 * 商务投标截止时间仅作为公告信息展示，不参与投标开关判断。
 * 前端判断只用于及时反馈，最终业务约束仍由后端重复校验。
 */
export function getBiddingAvailability(
  invitation: Pick<InvitationForBid, 'status'>,
): BiddingAvailability {
  if (invitation.status !== 'PUBLISHED') {
    return { open: false, reason: '当前公告未处于已发布状态，不能提交投标' }
  }
  return { open: true, reason: '' }
}
