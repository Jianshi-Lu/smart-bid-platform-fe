/** BE Result<T> 信封。code=200 业务成功,400=参数错,404=不存在,500=服务器错。
 * HTTP 状态几乎总是 200。
 */
export interface Result<T> {
    code: number
    message: string
    data: T
}

/**
 * BE Diff<T> DTO。PATCH 端点返回"更新前后对比"。
 * 镜像 io.gitee.lujianshi.bidwinningbackend.dto.common.Diff<T>。
 */
export interface Diff<T> {
    before: T
    after: T
}

/**
 * PageHelper 分页响应(3 个 list 端点共享: invitation-for-bid / bid-handler-info / bid-record)。
 *
 * 字段来源: com.github.pagehelper.PageInfo<T> (pagehelper 6.1.1)
 *           + com.github.pagehelper.PageSerializable<T>。
 * fastjson2 按 getter 名序列化,字段名严格对齐 BE 返回的 JSON 键名。
 *
 * 17 字段 1:1 镜像(BE 字段增删时 TS 立刻报错提醒)。
 *
 * 命名注意:
 *   - isIsFirstPage / isHasPreviousPage 等双 is 前缀,getter 去掉 is 后
 *     仍保留 is → JSON 键仍是 isFirstPage / hasPreviousPage(不是 firstPage / previousPage)
 *   - getNavigatepageNums 的 "page" 在 getter 中**保持小写**,
 *     JSON 键为 navigatepageNums (不是 navigatePageNums)
 *
 * ─── Class hierarchy ───
 *   export interface Result<T>     { code, message, data: T }       // BE 业务信封
 *   export interface Diff<T>       { before: T, after: T }          // PATCH 对比
 *   export interface PageResult<T> { 17 字段(见下) }                 // PageHelper 分页
 *
 * 关系:
 *   - api/* 函数:  http.post<Result<InvitationForBid>>(url) → resp.data.data
 *   - view layer: await listFn() → PageResult<InvitationForBid> (envelope 已拆)
 *   - 不被 view 直接 import (中间层 api/* 已拆 envelope)
 *
 * 泛型约束:
 *   - Result<T>    的 T 通常是 entity(InvitationForBid) 或 PageResult<Entity>
 *   - Diff<T>      的 T 是 entity(目前仅 InvitationForBid 使用)
 *   - PageResult<T> 的 T 是 entity list(分页项类型)
 */
export interface PageResult<T> {
    // ——— 来自 PageSerializable<T> (父类) ———
    /** 总记录数 */
    total: number
    /** 当前页数据 */
    list: T[]

    // ——— 来自 PageInfo<T> (子类) ———
    /** 当前页 */
    pageNum: number
    /** 每页大小 */
    pageSize: number
    /** 当前页实际条数 */
    size: number
    /** DB 行号起(从 1 开始) */
    startRow: number
    /** DB 行号止 */
    endRow: number
    /** 总页数 */
    pages: number
    /** 上一页页号(0 表示无) */
    prePage: number
    /** 下一页页号(0 表示无) */
    nextPage: number
    /** 是否第一页 */
    isFirstPage: boolean
    /** 是否最后一页 */
    isLastPage: boolean
    /** 是否有上一页 */
    hasPreviousPage: boolean
    /** 是否有下一页 */
    hasNextPage: boolean
    /** 导航页码数 */
    navigatePages: number
    /** 所有导航页号(注意 page 小写) */
    navigatepageNums: number[]
    /** 导航条上的第一页 */
    navigateFirstPage: number
    /** 导航条上的最后一页 */
    navigateLastPage: number
}