/**
 * 一次上传请求中单个知识文件的处理结果。
 *
 * 逐文件返回状态：转换与向量化分为两个状态列，失败时携带原因，
 * 调用方可以按 documentUuid 调用重试接口。
 */
export interface KnowledgeFileDocument {
    documentUuid: string
    originalFilename: string
    originalObjectKey: string | null
    convertedObjectKey: string | null
    originalSha256: string | null
    convertedSha256: string | null
    chunkCount: number | null
    originalStorageStatus: string
    convertStatus: string
    indexStatus: string
    errorMessage: string | null
}

/** 一次同步多文件上传的逐文件结果。 */
export interface KnowledgeFileUploadResponse {
    documents: KnowledgeFileDocument[]
}

/** 知识文件生命周期记录（对齐 BE knowledge_file 表 / V32）。 */
export interface KnowledgeFileRecord {
    knowledgeFileId: number
    documentUuid: string
    originalFilename: string
    contentType: string | null
    fileSize: number
    originalSha256: string | null
    convertedSha256: string | null
    storageType: string
    originalFilePath: string
    originalStorageStatus: string
    markdownFilePath: string | null
    convertStatus: string
    indexStatus: string
    chunkCount: number | null
    errorMessage: string | null
    errorStage: string | null
    createdAt: string
    convertedAt: string | null
    indexedAt: string | null
    deletedAt: string | null
    deletionStatus: string | null
    deletionFailedStage: string | null
    deletionErrorMessage: string | null
    deletionStartedAt: string | null
}

/** 知识文件分页列表查询参数。 */
export interface KnowledgeFileListRequest {
    page: number
    pageSize: number
    sort?: string
    keyword?: string
    convertStatus?: string
    indexStatus?: string
}
