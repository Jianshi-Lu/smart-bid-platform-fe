/**
 * 风险分析记录模块 API。
 *
 * 文件职责: 封装 risk-analysis 模块的 BE 调用,通过 http 实例自动应用拦截器。
 *
 * 依赖关系:
 *   - 上游(被依赖): types/common.ts (Result<T>)、risk-analysis/types.ts (类型定义)
 *   - 下游(依赖): api/http.ts (http 实例 + ApiError + 拦截器)
 *
 * 数据承接载体(view ↔ api ↔ http ↔ BE):
 *   - listRiskAnalyses: ListRequest (page/pageSize/sort) → PageResult<RiskAnalysis>
 *
 * 对应后端调用入口(RiskAnalysisController.java):
 *   - GET /risk-analysis?page=&pageSize=&sort= → listRiskAnalysis (PageHelper 分页)
 *
 * 业务边界:
 *   - BE 端 RiskAnalysisController 仅为敏感风险数据提供前端只读入口
 *   - 不暴露 DELETE / PATCH / POST 写端点,新增与删除走数据库手工操作
 *   - AI 触发分析走 BidRecordController.analyzeRisk(副作用为 RiskAnalysisService.persist)
 *
 * 错误处理: 拦截器统一包装 ApiError,调用方通过 getErrorMessage 展示异常。
 *
 * ─── Class hierarchy ───
 *   export function listRiskAnalyses(query: ListRequest): Promise<PageResult<RiskAnalysis>>
 *
 * 关系:1 个函数一对一映射 BE RiskAnalysisController 的 1 个端点:
 *   listRiskAnalyses  ↔ GET /risk-analysis
 *
 * 调用方(view):
 *   - bid-inviter/RiskAnalysis/List.vue → listRiskAnalyses
 *
 * 注意: 写入由 BidRecordController.analyzeRisk 副作用落库完成,
 *       本模块不暴露 POST/PATCH/DELETE,前端模块边界与 BE 严格对齐。
 */
import { http } from '@/api/http'

import type { Result, PageResult } from '@/types/common'

import type { ListRequest, RiskAnalysis } from '@/types/risk-analysis'


/**
 * GET /risk-analysis 分页查询全部历史风险分析记录(PageHelper)。
 *
 * 走 Vite 代理(http://localhost:8080/risk-analysis?page=&pageSize=&sort=),
 * 返回值已拆 envelope,直接拿到 PageResult<RiskAnalysis>。
 *
 * BE 端点 @RequestParam 默认值: page=1, pageSize=10, sort="analysis_id desc"。
 */
export function listRiskAnalyses(
    query: ListRequest = {}
): Promise<PageResult<RiskAnalysis>> {
    return http
        .get<Result<PageResult<RiskAnalysis>>>('/risk-analysis', { params: query })
        .then((resp) => resp.data.data)
}
