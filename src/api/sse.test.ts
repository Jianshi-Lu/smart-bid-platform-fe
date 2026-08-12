import { afterEach, describe, expect, it, vi } from 'vitest'

import { isRetryableSseStatus, subscribeToSse } from '@/api/sse'

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('isRetryableSseStatus', () => {
    it.each([408, 425, 429, 500, 502, 503])('retries temporary HTTP %s', (status) => {
        expect(isRetryableSseStatus(status)).toBe(true)
    })

    it.each([204, 400, 401, 403, 404, 422])('stops on permanent HTTP %s', (status) => {
        expect(isRetryableSseStatus(status)).toBe(false)
    })
})

describe('subscribeToSse', () => {
    it('does not reconnect after the server returns HTTP 204', async () => {
        vi.useFakeTimers()
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(() => JSON.stringify({
                username: 'bidder',
                password: 'secret',
            })),
        })
        const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
        vi.stubGlobal('fetch', fetchMock)

        const unsubscribe = subscribeToSse('/bidder/files/events', vi.fn())
        await vi.advanceTimersByTimeAsync(0)
        expect(fetchMock).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(6000)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        unsubscribe()
    })
})
