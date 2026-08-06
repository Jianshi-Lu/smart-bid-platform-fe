/**
 * 投标方自己的投标记录 API（登录后）。
 *
 * 对应后端 BidderBidRecordController (/bidder/bid-records)：
 * 列表/创建/详情/修改/删除均做账号归属校验；
 * 资信文件上传同样先校验记录归属，保证文件链路归属到账号。
 */
import { http } from '@/api/http'

import type { Result } from '@/types/common'
import type {
    AddRequest,
    BidRecord,
    UpdateRequest,
} from '@/types/bid-record'
import type { CredentialFileUploadResponse } from '@/types/credential-file'

/** GET /bidder/bid-records 我的投标列表。 */
export function listMyBidRecords(): Promise<BidRecord[]> {
    return http
        .get<Result<BidRecord[]>>('/bidder/bid-records')
        .then((resp) => resp.data.data)
}

/** POST /bidder/bid-records 投标（自动绑定当前账号）。 */
export function createBidderBidRecord(data: AddRequest): Promise<BidRecord> {
    return http
        .post<Result<BidRecord>>('/bidder/bid-records', data)
        .then((resp) => resp.data.data)
}

/** GET /bidder/bid-records/{id} 我的投标详情。 */
export function getBidderBidRecord(id: number): Promise<BidRecord> {
    return http
        .get<Result<BidRecord>>(`/bidder/bid-records/${id}`)
        .then((resp) => resp.data.data)
}

/** PATCH /bidder/bid-records/{id} 修改我的投标（PATCH 语义）。 */
export function updateBidderBidRecord(
    id: number,
    data: UpdateRequest
): Promise<BidRecord> {
    return http
        .patch<Result<{ after?: BidRecord }>>(
            `/bidder/bid-records/${id}`,
            data
        )
        .then((resp) => resp.data.data?.after ?? ({} as BidRecord))
}

/** DELETE /bidder/bid-records/{id} 删除我的投标。 */
export function deleteBidderBidRecord(id: number): Promise<void> {
    return http
        .delete<Result<null>>(`/bidder/bid-records/${id}`)
        .then(() => undefined)
}

/**
 * POST /bidder/bid-records/{id}/credential-files 上传资信材料。
 *
 * 登录模式下一次请求一组文件；不依赖旧版 uploadBatchId 追加上传语义。
 */
export function uploadBidderCredentialFiles(
    files: File[],
    bidRecordId: number
): Promise<CredentialFileUploadResponse> {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return http
        .post<Result<CredentialFileUploadResponse>>(
            `/bidder/bid-records/${bidRecordId}/credential-files`,
            formData
        )
        .then((resp) => resp.data.data)
}
