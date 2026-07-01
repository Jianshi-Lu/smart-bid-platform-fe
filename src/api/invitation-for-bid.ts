/**
 * 招标公告模块 API。
 *
 * 当前未走 http.ts 统一拦截器 (方案 C),调用方负责:
 *   1. 判定 resp.data.code (200=成功,其他=业务失败)
 *   2. 读取 resp.data.data 取业务实体
 *   3. try/catch 兜底网络错误
 *
 * 升级触发点: 端点 ≥3 个 或 BE 加鉴权时,抽 http.ts + 拦截器 (见 docs/架构说明.md)
 */
import axios from 'axios'
import type { Result } from '@/types/common'
import type { AddRequest, InvitationForBid } from '@/types/invitation-for-bid'

/** POST /invitation-for-bid/add 创建公告。必填: bidHandlerId / projectNo / purchaseTaskNo。 */
export function createInvitationForBid(data: AddRequest) {
    return axios.post<Result<InvitationForBid>>('/invitation-for-bid/add', data)
}