import { http } from '@/api/http'
import { subscribeToSse } from '@/api/sse'
import type { FileDownloadKind } from '@/shared/utils/download'
import type { PageResult, Result } from '@/types/common'
import type {
    KnowledgeFileListRequest,
    KnowledgeFileRecord,
    KnowledgeFileUploadResponse,
} from '@/types/knowledge-file'

/**
 * 上传一个或多个知识文件；逐文件返回转换/向量化状态，失败文件可重试。
 */
export function uploadKnowledgeFiles(
    files: File[],
    username: string,
): Promise<KnowledgeFileUploadResponse> {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    formData.append('username', username)

    return http
        .post<Result<KnowledgeFileUploadResponse>>('/knowledge-files', formData)
        .then((resp) => resp.data.data)
}

/** 分页查询知识文件生命周期记录。 */
export function listKnowledgeFiles(
    params: KnowledgeFileListRequest,
): Promise<PageResult<KnowledgeFileRecord>> {
    return http
        .get<Result<PageResult<KnowledgeFileRecord>>>('/knowledge-files', {
            params,
        })
        .then((resp) => resp.data.data)
}

/** 查询单个知识文件的完整追溯记录。 */
export function getKnowledgeFile(
    documentUuid: string,
): Promise<KnowledgeFileRecord> {
    return http
        .get<Result<KnowledgeFileRecord>>(
            `/knowledge-files/${encodeURIComponent(documentUuid)}`,
        )
        .then((resp) => resp.data.data)
}

/** 按失败点重试：未转换则重转，未向量化则重向量化。 */
export function retryKnowledgeFile(
    documentUuid: string,
): Promise<KnowledgeFileRecord> {
    return http
        .post<Result<KnowledgeFileRecord>>(
            `/knowledge-files/${encodeURIComponent(documentUuid)}/retry`,
        )
        .then((resp) => resp.data.data)
}

/** 删除知识文件：向量 + 对象 + 数据库软删除记录。 */
export function deleteKnowledgeFile(documentUuid: string): Promise<void> {
    return http
        .delete<Result<null>>(
            `/knowledge-files/${encodeURIComponent(documentUuid)}`,
        )
        .then(() => undefined)
}

/** 下载知识文件的原始文件或已转换 Markdown 文件。 */
export function downloadKnowledgeFile(
    documentUuid: string,
    kind: FileDownloadKind,
): Promise<Blob> {
    return http
        .get<Blob>(
            `/knowledge-files/${encodeURIComponent(documentUuid)}/download/${kind}`,
            { responseType: 'blob' },
        )
        .then((resp) => resp.data)
}

/**
 * 订阅知识文件 .md 转换/向量化状态变化。
 * connected 事件代表 SSE 已建立，触发一次数据库回读以补偿建连或重连间隙。
 */
export function subscribeKnowledgeFileEvents(
    onUpdate: () => void,
): () => void {
    return subscribeToSse('/knowledge-files/events', (message) => {
        if (message.event === 'connected' || message.event === 'file-status') {
            onUpdate()
        }
    })
}
