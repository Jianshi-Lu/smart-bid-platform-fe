/** BE Result<T> 信封。code=200 业务成功,400=参数错,404=不存在,500=服务器错。HTTP 状态几乎总是 200。 */
interface Result<T> {
    code: number
    message: string
    data: T
}

export type { Result }