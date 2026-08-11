/**
 * 招标方查看 Agent 已引用投标记录的资信材料。
 *
 * 此模块只服务于招标方角色：文件列表与下载都经过后端招标方路由和状态校验，
 * 浏览器不会得到对象存储路径，也不会复用投标方的本人归属下载接口。
 */
import { http } from '@/api/http'
import type { FileDownloadKind } from '@/shared/utils/download'
import type { Result } from '@/types/common'
import type { CredentialFile } from '@/types/credential-file'

/** GET /credential-files/bid-records/{bidRecordId}，读取指定记录的未删除资信材料。 */
export function listBidInviterCredentialFiles(
    bidRecordId: number,
): Promise<CredentialFile[]> {
    return http
        .get<Result<CredentialFile[]>>(
            `/credential-files/bid-records/${bidRecordId}`,
        )
        .then((resp) => resp.data.data)
}

/** 下载招标方可访问的原文件或已转换 .md；后端仍会复核文件状态。 */
export function downloadBidInviterCredentialFile(
    fileId: number,
    kind: FileDownloadKind,
): Promise<Blob> {
    return http
        .get<Blob>(
            `/credential-files/${fileId}/download/${kind}`,
            { responseType: 'blob' },
        )
        .then((resp) => resp.data)
}
