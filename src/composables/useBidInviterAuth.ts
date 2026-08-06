/**
 * 招标方登录态管理（模块级单例）。
 *
 * localStorage 键：
 *  - bidInviterCredentials：{username, password}，由 http 请求拦截器读取并注入 Basic 头
 *  - bidInviterAccount：账号信息 JSON
 *
 * 与投标方 useBidderAuth 对称，两个角色可同时保持登录。
 */
import { computed, ref } from 'vue'

import { getCurrentBidInviterAccount } from '@/api/bid-inviter-account'
import type { BidInviterLoginResponse } from '@/types/bid-inviter-account'

const CREDENTIALS_KEY = 'bidInviterCredentials'
const ACCOUNT_KEY = 'bidInviterAccount'

function loadAccount(): BidInviterLoginResponse | null {
    const raw = localStorage.getItem(ACCOUNT_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw) as BidInviterLoginResponse
    } catch {
        return null
    }
}

const account = ref<BidInviterLoginResponse | null>(loadAccount())

export function useBidInviterAuth() {
    const isLoggedIn = computed(() => {
        return Boolean(account.value?.bidInviterAccountId
            && localStorage.getItem(CREDENTIALS_KEY))
    })

    function setSession(session: BidInviterLoginResponse, password: string): void {
        localStorage.setItem(
            CREDENTIALS_KEY,
            JSON.stringify({
                username: session.username,
                password,
            })
        )
        localStorage.setItem(
            ACCOUNT_KEY,
            JSON.stringify(session)
        )
        account.value = session
    }

    function clearSession(): void {
        localStorage.removeItem(CREDENTIALS_KEY)
        localStorage.removeItem(ACCOUNT_KEY)
        account.value = null
    }

    /** 刷新当前账号信息（校验本地凭据仍有效）。 */
    async function refresh(): Promise<boolean> {
        if (!localStorage.getItem(CREDENTIALS_KEY)) return false
        try {
            const me = await getCurrentBidInviterAccount()
            account.value = me
            localStorage.setItem(ACCOUNT_KEY, JSON.stringify(me))
            return true
        } catch {
            clearSession()
            return false
        }
    }

    function logout(): void {
        clearSession()
    }

    return {
        account,
        isLoggedIn,
        setSession,
        clearSession,
        refresh,
        logout,
    }
}
