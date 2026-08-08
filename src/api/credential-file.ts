/**
 * 资信材料文件 API（投标方登录链路）。
 *
 * 上传/删除都走 /bidder/bid-records 下带账号归属校验的接口；
 * 不再使用旧版 uploadBatchId 追加上传语义。
 */
import { http } from '@/api/http'
import { subscribeToSse } from '@/api/sse'
import type { FileDownloadKind } from '@/shared/utils/download'
import type { Result } from '@/types/common'
import type { CredentialFile } from '@/types/credential-file'

/**
 * GET /bidder/bid-records/{bidRecordId}/credential-files
 * 查询投标记录下全部未删除资信文件（含转换状态），已删除文件后端不可见。
 */
export function listCredentialFiles(
    bidRecordId: number
): Promise<CredentialFile[]> {
    return http
        .get<Result<CredentialFile[]>>(
            `/bidder/bid-records/${bidRecordId}/credential-files`
        )
        .then((resp) => resp.data.data)
}

/**
 * DELETE /bidder/bid-records/{bidRecordId}/credential-files/{fileId}
 * 删除已上传资信文件（连同存储对象）。
 *
 * 只有请求成功后,调用方才能从本地已上传列表移除文件。
 */
export function deleteCredentialFile(
    bidRecordId: number,
    fileId: number
): Promise<void> {
    return http
        .delete(
            `/bidder/bid-records/${bidRecordId}/credential-files/${fileId}`
        )
        .then(() => undefined)
}

/** 下载投标方本人投标记录下的原始文件或 Markdown 文件。 */
export function downloadCredentialFile(
    bidRecordId: number,
    fileId: number,
    kind: FileDownloadKind,
): Promise<Blob> {
    return http
        .get<Blob>(
            `/bidder/bid-records/${bidRecordId}/credential-files/${fileId}/download/${kind}`,
            { responseType: 'blob' },
        )
        .then((resp) => resp.data)
}

/** 订阅指定投标记录下资信文件的转换状态变化。 */
export function subscribeCredentialFileEvents(
    bidRecordId: number,
    onUpdate: () => void,
): () => void {
    return subscribeToSse(
        `/bidder/bid-records/${bidRecordId}/credential-files/events`,
        (message) => {
            if (message.event === 'file-status') onUpdate()
        },
    )
}
