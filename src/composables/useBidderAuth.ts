/**
 * 投标方登录态管理（模块级单例）。
 *
 * localStorage 键：
 *  - bidderCredentials：{username, password}，由 http 请求拦截器读取并注入 Basic 头
 *  - bidderAccount：账号信息 JSON
 *
 * 注意：最小鉴权实现需要保存明文密码，仅适用于演示环境。
 */
import { computed, ref } from 'vue'

import { getCurrentBidderAccount } from '@/api/bidder-account'
import type { LoginResponse } from '@/types/bidder-account'

const CREDENTIALS_KEY = 'bidderCredentials'
const ACCOUNT_KEY = 'bidderAccount'

function loadAccount(): LoginResponse | null {
    const raw = localStorage.getItem(ACCOUNT_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw) as LoginResponse
    } catch {
        return null
    }
}

const account = ref<LoginResponse | null>(loadAccount())

export function useBidderAuth() {
    const isLoggedIn = computed(() => {
        return Boolean(account.value?.bidderAccountId
            && localStorage.getItem(CREDENTIALS_KEY))
    })

    function setSession(session: LoginResponse, password: string): void {
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
            const me = await getCurrentBidderAccount()
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
