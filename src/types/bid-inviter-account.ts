/**
 * 招标方（管理员）账号相关类型。
 */

export interface BidInviterAccount {
    bidInviterAccountId: number
    username: string
    password?: string | null
    phone?: string | null
    displayName?: string | null
    createdAt?: string
}

export interface BidInviterLoginResponse {
    bidInviterAccountId: number
    username: string
    displayName: string | null
}

export interface BidInviterRegisterRequest {
    username: string
    password: string
    phone?: string
    displayName?: string
}

export interface BidInviterLoginRequest {
    username: string
    password: string
}
