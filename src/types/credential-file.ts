/**
 * 资信材料文件相关类型。
 *
 * 当前上传阶段后端只会返回 UPLOADED,转换相关状态保留为字符串,
 * 避免后端扩展状态时要求前端同步修改基础 DTO。
 */

export type CredentialFileConvertStatus = string

export interface CredentialFile {
    fileId: number
    fileOrder: number
    originalFilename: string
    contentType: string
    fileSize: number
    originalFilePath?: string
    convertStatus: CredentialFileConvertStatus
}

export interface CredentialFileUploadResponse {
    files: CredentialFile[]
}
