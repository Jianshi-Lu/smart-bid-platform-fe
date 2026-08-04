/** 一个已经完成 MinIO 持久化和 Chroma 向量化的知识文件。 */
export interface KnowledgeFileDocument {
    documentUuid: string
    originalFilename: string
    originalObjectKey: string
    convertedObjectKey: string
    originalSha256: string
    convertedSha256: string
    chunkCount: number
}

/** 一次同步多文件上传的成功结果。 */
export interface KnowledgeFileUploadResponse {
    documents: KnowledgeFileDocument[]
}
