<script setup lang="ts">
/**
 * 投标记录列表页(PageHelper 分页 + 行内风险分析触发)。
 *
 * 文件职责: 表格展示 + 翻页 + 行末"风险分析"按钮触发 AI 分析。
 *
 * 依赖关系:
 *   - api.ts: listBidRecords(列表加载) + analyzeRisk(行内分析)
 *   - types.ts: BidRecord(行类型) + RiskAnalysis(分析结果类型) + ListRequest
 *   - http.ts: ApiError(统一错误类型)
 *   - element-plus: el-table / el-pagination / el-button / el-dialog / el-form / el-tag
 *
 * 数据承接载体(本组件 ↔ api ↔ BE):
 *   - 列表加载: ListRequest({page, pageSize, sort}) → PageResult<BidRecord>
 *       其中 rows.value = data.list, currentPage.value = data.pageNum
 *   - 风险分析: BidRecord.bidRecordId → RiskAnalysis 实体 → 弹窗展示
 *
 * 数据流转 11 步链(列表加载):
 *   ① <script setup>: 声明状态 rows / total / currentPage / pageSize(=10) / loading
 *   ② onMounted() → load(currentPage.value) 初始化第 1 页
 *   ③ load(page) 置 loading=true → <el-table v-loading> 转圈
 *   ④ 调用 listBidRecords({page, pageSize, sort:'bid_record_id desc'})
 *        → modules/bid-record/api.ts 的 http.get<Result<PageResult<BidRecord>>>
 *   ⑤ http 实例经 Vite 代理发到 BE 8080,BE PageHelper 查分页
 *   ⑥ BE 返回 Result<PageResult<BidRecord>>,响应拦截器拆 envelope
 *   ⑦ rows.value / total.value / currentPage.value = data.{list, total, pageNum}
 *   ⑧ loading=false → <el-table> 渲染 8 列 + 1 操作列 + <el-pagination :total>
 *   ⑨ 用户点击 <el-pagination> 跳页
 *   ⑩ @current-change → onPageChange(page) → load(page)
 *   ⑪ 回到 ③ 循环
 *
 * 风险分析触发链(行内操作):
 *   ① 用户点击行末"风险分析"按钮
 *   ② 触发 onAnalyzeRisk(row),置 analyzingId = row.bidRecordId
 *   ③ UI 反馈: 按钮文本变"分析中..." + :loading 转圈 + 其他行按钮 :disabled
 *   ④ 调用 analyzeRisk(row.bidRecordId) → modules/bid-record/api.ts 的
 *        http.post<Result<RiskAnalysis>>(`/bid-record/analyze-risk/${id}`)
 *   ⑤ http 实例经 Vite 代理发到 BE 8080
 *   ⑥ BE 同步调用 DeepSeek → 解析 JSON → 落库 risk_analysis 表 → 返回最新 RiskAnalysis
 *   ⑦ 拦截器拆 envelope → Promise resolve(analysis 实体)
 *   ⑧ analyzingId 置 null → 按钮恢复
 *   ⑨ ElMessage.success 显示风险等级
 *   ⑩ currentAnalysis = analysis + riskDialogVisible = true
 *   ⑪ el-dialog 弹窗展示 8 字段(分析ID/记录ID/投标人/等级/摘要/建议/版本/时间)
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 *                      + analyzingId 置 null → 按钮恢复
 * 并发控制: 同一时刻只能分析一行(analyzingId !== null 时其他行按钮 disabled)
 *          ,避免结果混淆 / 多个并发 DeepSeek 请求
 *
 * 模块特有: 8 列 + 1 操作列;
 * quotePrice 用 inline formatPrice 兜 2 位小数(避免 JS 浮点尾巴);
 * bidAt 用 inline formatTime 处理 ISO-8601;
 * credentials 是"资信材料链接",最长 500 字符,
 * 列用 show-overflow-tooltip 截断 + hover 弹完整内容;
 * 新增 riskLevel 颜色映射(LOW/MEDIUM/HIGH/CRITICAL → success/warning/danger/danger)。
 */
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { listBidRecords, analyzeRisk } from '@/modules/bid-record/api'
import type { BidRecord, RiskAnalysis } from '@/modules/bid-record/types'

// ——— 列表状态机 ———
const rows = ref<BidRecord[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 10                 // 固定,不开放
const loading = ref(false)

// ——— 风险分析状态 ———
const analyzingId = ref<number | null>(null)        // 当前正在分析的 bidRecordId,null 表示无
const riskDialogVisible = ref(false)                 // 弹窗可见
const currentAnalysis = ref<RiskAnalysis | null>(null) // 当前展示的分析结果

// ——— 生命周期 ———
onMounted(() => {
  load(currentPage.value)
})

// ——— 列表加载 ———
async function load(page: number) {
  loading.value = true
  try {
    // 从后端返回获取data字段(包含对应行的数据)
    const data = await listBidRecords({
      page,
      pageSize,
      sort: 'bid_record_id desc',
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

// ——— 风险分析触发(行内操作) ———
async function onAnalyzeRisk(row: BidRecord) {
  // ② 置 analyzingId → UI 反馈"分析中..." + 其他行 disabled
  analyzingId.value = row.bidRecordId
  try {
    // ④ 调用 api.ts 的 analyzeRisk(数据载体: row.bidRecordId)
    const result = await analyzeRisk(row.bidRecordId)
    // ⑦ Promise resolve,result 即 RiskAnalysis 实体
    // ⑩ 装填弹窗状态
    currentAnalysis.value = result
    riskDialogVisible.value = true
    // ⑨ UI 反馈分析完成
    ElMessage.success(`风险分析完成,等级=${result.riskLevel}`)
  } catch (e) {
    // 错误链: ApiError → ElMessage.error
    const msg = e instanceof ApiError
        ? `[${e.code}] ${e.message}`
        : `请求失败: ${(e as Error)?.message ?? String(e)}`
    ElMessage.error(msg)
  } finally {
    // ⑧ analyzingId 置 null → 按钮恢复
    analyzingId.value = null
  }
}

// ——— 风险等级 → el-tag 颜色映射 ———
const riskLevelType: Record<string, '' | 'info' | 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
}

// ——— 报价格式化(inline,等出现第 2 处重复再抽 shared/) ———
function formatPrice(price: number | undefined): string {
  return price != null ? price.toFixed(2) : '-'
}

// ——— 时间格式化(inline,不引 dayjs) ———
function formatTime(iso?: string): string {
  return iso ? iso.replace('T', ' ').substring(0, 16) : '-'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">投标记录列表</h2>
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
        <el-empty description="暂无投标记录" />
      </template>
      <!--声明每一列从行数据里取哪个字段-->
      <el-table-column prop="bidRecordId" label="ID" width="80" />
      <el-table-column prop="invitationId" label="公告 ID" width="100" />
      <el-table-column prop="bidderName" label="投标人" min-width="160" show-overflow-tooltip />
      <el-table-column label="报价" width="140">
        <template #default="{ row }: { row: BidRecord }">
          {{ formatPrice(row.quotePrice) }}
        </template>
      </el-table-column>
      <el-table-column prop="bidNo" label="投标次序" width="100" align="center" />
      <el-table-column label="投标时间" width="160">
        <template #default="{ row }: { row: BidRecord }">
          {{ formatTime(row.bidAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="bidderContact" label="联系方式" min-width="180" show-overflow-tooltip />
      <el-table-column prop="credentials" label="资信材料" min-width="200" show-overflow-tooltip />
      <!--
        操作列(行末按钮):
          ① 用户点击 → onAnalyzeRisk(row)
          ② ③ UI 反馈通过 :loading + :disabled + 文本切换实现
          analyzingId === row.bidRecordId 表示当前行正在分析
          analyzingId !== null 且不匹配表示其他行分析中 → 本行 disabled
      -->
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }: { row: BidRecord }">
          <el-button
            type="primary"
            size="small"
            :loading="analyzingId === row.bidRecordId"
            :disabled="analyzingId !== null && analyzingId !== row.bidRecordId"
            @click="onAnalyzeRisk(row)"
          >
            {{ analyzingId === row.bidRecordId ? '分析中...' : '风险分析' }}
          </el-button>
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

    <!--
      ⑩⑪ 风险分析结果弹窗
      currentAnalysis 即 ⑦ 拿到的 RiskAnalysis 实体
      字段: analysisId / bidRecordId / bidderName / riskLevel / summary / suggestions / promptVersion / analyzedAt
      rawResponse 默认不展示(长度大)
    -->
    <el-dialog
      v-model="riskDialogVisible"
      title="风险分析结果"
      width="600px"
    >
      <div v-if="currentAnalysis" class="risk-result">
        <el-form label-width="100px">
          <el-form-item label="分析 ID">{{ currentAnalysis.analysisId }}</el-form-item>
          <el-form-item label="投标记录 ID">{{ currentAnalysis.bidRecordId }}</el-form-item>
          <el-form-item label="投标人">{{ currentAnalysis.bidderName }}</el-form-item>
          <el-form-item label="风险等级">
            <el-tag :type="riskLevelType[currentAnalysis.riskLevel] ?? 'info'">
              {{ currentAnalysis.riskLevel }}
            </el-tag>
          </el-form-item>
          <el-form-item label="风险摘要">
            <div class="risk-text">{{ currentAnalysis.summary }}</div>
          </el-form-item>
          <el-form-item label="建议">
            <div class="risk-text">{{ currentAnalysis.suggestions }}</div>
          </el-form-item>
          <el-form-item v-if="currentAnalysis.promptVersion" label="提示词版本">
            {{ currentAnalysis.promptVersion }}
          </el-form-item>
          <el-form-item label="分析时间">{{ formatTime(currentAnalysis.analyzedAt) }}</el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.risk-text {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  line-height: 1.6;
}
</style>