<script setup lang="ts">
/**
 * 风险分析记录列表页(PageHelper 分页,只读)。
 *
 * 文件职责: 展示所有 AI 风险分析历史结果,支持分页查询。
 *
 * 依赖关系:
 *   - api.ts: listRiskAnalyses(列表加载)
 *   - types.ts: RiskAnalysis(行类型) + ListRequest
 *   - http.ts: ApiError(统一错误类型)
 *   - element-plus: el-table / el-pagination / el-tag
 *
 * 数据承接载体(本组件 ↔ api ↔ BE):
 *   - 列表加载: ListRequest({page, pageSize, sort}) → PageResult<RiskAnalysis>
 *       其中 rows.value = data.list, currentPage.value = data.pageNum
 *
 * 数据流转 11 步链(列表加载):
 *   ① <script setup>: 声明状态 rows / total / currentPage / pageSize(=10) / loading
 *   ② onMounted() → load(currentPage.value) 初始化第 1 页
 *   ③ load(page) 置 loading=true → <el-table v-loading> 转圈
 *   ④ 调用 listRiskAnalyses({page, pageSize, sort:'analysis_id desc'})
 *        → modules/risk-analysis/api.ts 的 http.get<Result<PageResult<RiskAnalysis>>>
 *   ⑤ http 实例经 Vite 代理发到 BE 8080,BE PageHelper 查分页
 *   ⑥ BE 返回 Result<PageResult<RiskAnalysis>>,响应拦截器拆 envelope
 *   ⑦ rows.value / total.value / currentPage.value = data.{list, total, pageNum}
 *   ⑧ loading=false → <el-table> 渲染 8 列 + <el-pagination :total>
 *   ⑨ 用户点击 <el-pagination> 跳页
 *   ⑩ @current-change → onPageChange(page) → load(page)
 *   ⑪ 回到 ③ 循环
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 *
 * 模块特有: 8 列展示(含 riskLevel 用 el-tag 颜色映射);
 * summary / suggestions / promptVersion 用 show-overflow-tooltip 截断;
 * analyzedAt 用 inline formatTime 处理 ISO-8601;
 * rawResponse 不展示(长度大,UI 不友好);
 * 本模块为只读,无 create/edit/delete;
 * AI 触发分析见 BidRecord 列表的"风险分析"按钮(行内操作)。
 */
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { listRiskAnalyses } from '@/api/risk-analysis'
import type { RiskAnalysis } from '@/types/risk-analysis'

// ——— 状态机 ———
const rows = ref<RiskAnalysis[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 10                 // 固定,不开放
const loading = ref(false)

// ——— 生命周期 ———
onMounted(() => {
  load(currentPage.value)
})

// ——— 列表加载 ———
async function load(page: number) {
  loading.value = true
  try {
    // 从后端返回获取data字段(包含对应行的数据)
    const data = await listRiskAnalyses({
      page,
      pageSize,
      sort: 'analysis_id desc',
    })
    // 将数据赋值到rows——供显示组件使用
    rows.value = data.list
    total.value = data.total
    currentPage.value = data.pageNum
  } catch (e) {
    const msg = e instanceof ApiError
        ? `[${e.code}] ${e.message}`
        : `请求失败: ${(e as Error)?.message ?? String(e)}`
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

// ——— 翻页 ———
function onPageChange(page: number) {
  load(page)
}

// ——— 风险等级 → el-tag 颜色映射 ———
const riskLevelType: Record<string, '' | 'info' | 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
}

// ——— 时间格式化(inline,不引 dayjs) ———
function formatTime(iso?: string): string {
  return iso ? iso.replace('T', ' ').substring(0, 16) : '-'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">风险分析列表</h2>
      <div class="page-actions">
        <el-button @click="$router.push('/')">← 返回首页</el-button>
      </div>
    </div>

    <!--声明整张表的数据来源-->
    <el-table
        v-loading="loading"
        :data="rows"
        border
        stripe
        style="width: 100%"
    >
      <template #empty>
        <el-empty description="暂无风险分析记录" />
      </template>
      <!--声明每一列从行数据里取哪个字段-->
      <el-table-column prop="analysisId" label="ID" width="80" />
      <el-table-column prop="bidRecordId" label="投标记录 ID" width="120" />
      <el-table-column prop="bidderName" label="投标人" min-width="160" show-overflow-tooltip />
      <el-table-column prop="riskLevel" label="风险等级" width="110">
        <template #default="{ row }: { row: RiskAnalysis }">
          <el-tag v-if="row.riskLevel" :type="riskLevelType[row.riskLevel] ?? 'info'" disable-transitions>
            {{ row.riskLevel }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="summary" label="风险摘要" min-width="220" show-overflow-tooltip />
      <el-table-column prop="suggestions" label="建议" min-width="220" show-overflow-tooltip />
      <el-table-column prop="promptVersion" label="提示词版本" min-width="120" show-overflow-tooltip />
      <el-table-column label="分析时间" width="160">
        <template #default="{ row }: { row: RiskAnalysis }">
          {{ formatTime(row.analyzedAt) }}
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <!--
          v-model:current-page + @current-change 看似重复触发,
          实际: v-model 只更新 currentPage.value,@current-change 才会发请求。
          若只用 v-model 去掉 @current-change,翻页不会触发 load;
          若只用 @current-change 去掉 v-model,pagination 显示会滞后。
      -->
      <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next, jumper"
          background
          @current-change="onPageChange"
      />
    </div>
  </div>
</template>