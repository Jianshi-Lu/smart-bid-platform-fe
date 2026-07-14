/**
 * 资信材料文件 API。
 *
 * 上传接口使用 multipart/form-data。首次上传不携带 uploadBatchId,
 * 后续追加上传复用首次响应返回的批次号。前端不读取或拼接本地路径。
 *
 * 调用方(view/component):
 *   - shared/components/CredentialFileUpload.vue
 */
import { http } from '@/api/http'

import type { Result } from '@/types/common'
import type { CredentialFileUploadResponse } from '@/types/credential-file'

/**
 * POST /credential-files/upload 上传一个或多个资信材料文件。
 *
 * FormData 字段:
 *   - files: 一个或多个 File
 *   - uploadBatchId: 追加上传时携带,首次上传省略
 *
 * 不手动设置 Content-Type,由浏览器为 multipart boundary 自动生成。
 */
export function uploadCredentialFiles(
    files: File[],
    uploadBatchId?: string
): Promise<CredentialFileUploadResponse> {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    if (uploadBatchId) formData.append('uploadBatchId', uploadBatchId)

    return http
        .post<Result<CredentialFileUploadResponse>>(
            '/credential-files/upload',
            formData
        )
        .then((resp) => resp.data.data)
}

/**
 * DELETE /credential-files/{uploadBatchId}/files/{fileId} 删除已上传文件。
 *
 * 只有请求成功后,调用方才能从本地已上传列表移除文件。
 */
export function deleteCredentialFile(
    uploadBatchId: string,
    fileId: number
): Promise<void> {
    return http
        .delete(`/credential-files/${uploadBatchId}/files/${fileId}`)
        .then(() => undefined)
}
