/**
 * 资信材料文件 API（投标方登录链路）。
 *
 * 上传/删除都走 /bidder/bid-records 下带账号归属校验的接口；
 * 不再使用旧版 uploadBatchId 追加上传语义。
 */
import { http } from '@/api/http'

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
