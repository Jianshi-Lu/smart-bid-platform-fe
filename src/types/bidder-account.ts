/**
 * 投标方账号类型定义。
 *
 * 对应后端 bidder_account 表与 /bidder/auth/* 接口。
 * 最小鉴权实现不签发令牌：登录/请求直接携带用户名+密码（HTTP Basic）。
 */

export interface BidderAccount {
    bidderAccountId: number
    username: string
    phone?: string | null
    displayName?: string | null
    createdAt?: string
}

export interface RegisterRequest {
    username: string
    password: string
    phone?: string
    displayName?: string
}

export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    bidderAccountId: number
    username: string
    displayName?: string | null
}
