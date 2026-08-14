import { describe, expect, it } from 'vitest'

import { getBiddingAvailability } from '@/shared/utils/bidding'
import type { InvitationForBid } from '@/types/invitation-for-bid'

describe('getBiddingAvailability', () => {
  it('rejects invitations that are not published', () => {
    expect(getBiddingAvailability({ status: 'DRAFT' })).toMatchObject({ open: false })
  })

  it('accepts published invitations regardless of the business deadline', () => {
    const pastDeadlineInvitation: Pick<InvitationForBid, 'status' | 'businessTenderDeadline'> = {
      status: 'PUBLISHED',
      businessTenderDeadline: '2020-01-01T00:00:00+08:00',
    }
    const invalidDeadlineInvitation: Pick<InvitationForBid, 'status' | 'businessTenderDeadline'> = {
      status: 'PUBLISHED',
      businessTenderDeadline: 'invalid-deadline',
    }

    expect(getBiddingAvailability({ status: 'PUBLISHED' })).toEqual({ open: true, reason: '' })
    expect(getBiddingAvailability(pastDeadlineInvitation)).toEqual({ open: true, reason: '' })
    expect(getBiddingAvailability(invalidDeadlineInvitation)).toEqual({ open: true, reason: '' })
  })
})
