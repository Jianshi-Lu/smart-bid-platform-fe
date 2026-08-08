/** 文件下载类型。 */
export type FileDownloadKind = 'original' | 'markdown'

/** 下载 API 返回给通用文件面板的浏览器文件结果。 */
export interface DownloadedFile {
    blob: Blob
    filename: string
}

/** 将鉴权接口返回的 Blob 保存为浏览器下载文件。 */
export function saveBlobFile(file: DownloadedFile): void {
    const url = URL.createObjectURL(file.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 按原始文件名生成转换产物的下载名称。 */
export function markdownDownloadFilename(originalFilename: string): string {
    const filename = originalFilename.trim() || 'download'
    const dot = filename.lastIndexOf('.')
    const base = dot > 0 ? filename.slice(0, dot) : filename
    return `${base}.md`
}
