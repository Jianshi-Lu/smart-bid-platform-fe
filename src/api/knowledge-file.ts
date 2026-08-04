import { http } from '@/api/http'
import type { Result } from '@/types/common'
import type { KnowledgeFileUploadResponse } from '@/types/knowledge-file'

/**
 * 上传一个或多个知识文件；Java 只有在转换和 Chroma 向量化全部成功后才返回。
 */
export function uploadKnowledgeFiles(
    files: File[],
): Promise<KnowledgeFileUploadResponse> {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    return http
        .post<Result<KnowledgeFileUploadResponse>>('/knowledge-files', formData)
        .then((response) => response.data.data)
}
