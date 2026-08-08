/**
 * 资信材料文件相关类型。
 *
 * 当前上传阶段后端只会返回 UPLOADED,转换相关状态保留为字符串,
 * 避免后端扩展状态时要求前端同步修改基础 DTO。
 */

export type CredentialFileConvertStatus = string

export interface CredentialFile {
    fileId: number
    fileUuid: string
    fileOrder: number
    originalFilename: string
    contentType: string
    fileSize: number
    originalSha256: string
    convertedSha256?: string | null
    storageType: string
    originalFilePath?: string
    originalStorageStatus?: string | null
    markdownFilePath?: string | null
    convertStatus: CredentialFileConvertStatus
    errorMessage?: string | null
    errorStage?: string | null
    createdAt?: string | null
    convertedAt?: string | null
    boundAt?: string | null
    deletedAt?: string | null
    deletionStatus?: string | null
    deletionFailedStage?: string | null
    deletionErrorMessage?: string | null
    deletionStartedAt?: string | null
}

export interface CredentialFileUploadResponse {
    files: CredentialFile[]
}
