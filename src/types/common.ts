/** BE Result<T> 统一响应信封。
 * 新版成功响应为 success=true、code=SUCCESS；code 允许保留 number
 * 以兼容仍使用旧版 code=200 的接口。
 */
export interface Result<T> {
    success: boolean
    code: string | number
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

/** 所有 PageHelper 列表端点共享的查询参数。 */
export interface PageRequest {
    /** 页号,从 1 开始。 */
    page?: number
    /** 每页条数。 */
    pageSize?: number
    /** 后端允许的 SQL 排序表达式,例如 `created_at desc`。 */
    sort?: string
}

/**
 * PageHelper 分页响应(所有分页 list 端点共享: invitation-for-bid / bid-handler-info / bid-record / risk-analysis)。
 *
 * 字段来源: com.github.pagehelper.PageInfo<T> (pagehelper 6.1.1)
 *           + com.github.pagehelper.PageSerializable<T>。
 * fastjson2 按 getter 名序列化,字段名严格对齐 BE 返回的 JSON 键名。
 *
 * 18 字段 1:1 镜像(BE 字段增删时 TS 立刻报错提醒)。
 *
 * 命名注意:
 *   - isIsFirstPage / isHasPreviousPage 等双 is 前缀,getter 去掉 is 后
 *     仍保留 is → JSON 键仍是 isFirstPage / hasPreviousPage(不是 firstPage / previousPage)
 *   - getNavigatepageNums 的 "page" 在 getter 中**保持小写**,
 *     JSON 键为 navigatepageNums (不是 navigatePageNums)
 *
 * ─── Class hierarchy ───
 *   export interface Result<T>     { success, code, message, data: T } // BE 业务信封
 *   export interface Diff<T>       { before: T, after: T }          // PATCH 对比
 *   export interface PageRequest   { page?, pageSize?, sort? }       // PageHelper 查询
 *   export interface PageResult<T> { 18 字段(见下) }                 // PageHelper 响应
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
