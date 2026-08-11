import { describe, expect, it } from 'vitest'

import { getBiddingAvailability } from '@/shared/utils/bidding'

describe('getBiddingAvailability', () => {
  it('rejects invitations that are not published', () => {
    expect(getBiddingAvailability({ status: 'DRAFT' })).toMatchObject({ open: false })
  })

  it('accepts published invitations without a configured deadline', () => {
    expect(getBiddingAvailability({ status: 'PUBLISHED' })).toEqual({ open: true, reason: '' })
  })

  it('accepts published invitations before the business deadline', () => {
    expect(getBiddingAvailability(
      { status: 'PUBLISHED', businessTenderDeadline: '2026-08-15T12:00:00+08:00' },
      Date.parse('2026-08-15T11:59:59+08:00'),
    )).toEqual({ open: true, reason: '' })
  })

  it('rejects published invitations at or after the business deadline', () => {
    expect(getBiddingAvailability(
      { status: 'PUBLISHED', businessTenderDeadline: '2026-08-15T12:00:00+08:00' },
      Date.parse('2026-08-15T12:00:00+08:00'),
    )).toMatchObject({ open: false })
  })

  it('fails closed when the deadline cannot be parsed', () => {
    expect(getBiddingAvailability({
      status: 'PUBLISHED',
      businessTenderDeadline: 'invalid-deadline',
    })).toMatchObject({ open: false })
  })
})
