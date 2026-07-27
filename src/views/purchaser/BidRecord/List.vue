<script setup lang="ts">
/**
 * 投标记录分页列表，并提供行内风险分析入口。
 *
 * usePagedList 负责分页请求；onAnalyzeRisk 以 bidRecordId 调用同步分析接口，
 * 同一时刻只允许分析一行，成功结果写入 currentAnalysis 后由弹窗展示。
 * 报价和时间仅在展示层格式化，不修改 API 返回实体。
 */
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listBidRecords, analyzeRisk } from '@/api/bid-record'
import PageHeader from '@/shared/components/PageHeader.vue'
import { usePagedList } from '@/shared/composables/usePagedList'
import { getErrorMessage } from '@/shared/utils/error'
import type { BidRecord } from '@/types/bid-record'
import type { RiskAnalysis } from '@/types/risk-analysis'
import { RISK_LEVEL_TYPE } from '@/shared/utils/el-tag'
import { formatPrice, formatTime } from '@/shared/utils/format'

const { rows, total, currentPage, pageSize, loading, load } = usePagedList<BidRecord>({
  fetchPage: listBidRecords,
  sort: 'bid_record_id desc',
  onError: (error) => ElMessage.error(getErrorMessage(error)),
})

// ——— 风险分析状态 ———
const analyzingId = ref<number | null>(null)        // 当前正在分析的 bidRecordId,null 表示无
const riskDialogVisible = ref(false)                 // 弹窗可见
const currentAnalysis = ref<RiskAnalysis | null>(null) // 当前展示的分析结果

onMounted(() => {
  void load()
})

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
    // 分析接口异常沿用统一展示文案。
    const msg = getErrorMessage(e)
    ElMessage.error(msg)
  } finally {
    // ⑧ analyzingId 置 null → 按钮恢复
    analyzingId.value = null
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="投标记录列表" back-to="/purchaser" back-label="返回招标方入口" />

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

    <div class="page-pagination">
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
          @current-change="load"
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
            <el-tag :type="RISK_LEVEL_TYPE[currentAnalysis.riskLevel] ?? 'info'">
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
