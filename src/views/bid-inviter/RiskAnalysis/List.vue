<script setup lang="ts">
/**
 * 风险分析历史结果的只读分页列表。
 *
 * usePagedList 负责按 analysis_id 倒序加载。rawResponse 不在列表展示；
 * 风险分析的生成入口仍位于投标记录列表，本页不触发分析或修改记录。
 */
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { listRiskAnalyses } from '@/api/risk-analysis'
import PageHeader from '@/shared/components/PageHeader.vue'
import DetailDialog, { type DetailField } from '@/shared/components/DetailDialog.vue'
import { usePagedList } from '@/shared/composables/usePagedList'
import { getErrorMessage } from '@/shared/utils/error'
import { RISK_LEVEL_DESC, RISK_LEVEL_LABEL } from '@/shared/utils/dict'
import type { RiskAnalysis, RiskLevel } from '@/types/risk-analysis'
import { RISK_LEVEL_TAG_CLASS, RISK_LEVEL_TYPE } from '@/shared/utils/el-tag'
import { formatTime } from '@/shared/utils/format'

const { rows, total, currentPage, pageSize, loading, load } = usePagedList<RiskAnalysis>({
  fetchPage: listRiskAnalyses,
  sort: 'analysis_id desc',
  onError: (error) => ElMessage.error(getErrorMessage(error)),
})

// ——— 行详情弹窗 ———
const detailVisible = ref(false)
const detailRow = ref<RiskAnalysis | null>(null)
const riskLegend: Array<[RiskLevel, string]> =
    Object.entries(RISK_LEVEL_LABEL) as Array<[RiskLevel, string]>

function openDetail(row: RiskAnalysis) {
  detailRow.value = row
  detailVisible.value = true
}

function detailFields(row: RiskAnalysis): DetailField[] {
  return [
    { label: '分析 ID', value: row.analysisId },
    { label: '投标记录 ID', value: row.bidRecordId },
    { label: '投标人', value: row.bidderName },
    { label: '风险等级', value: RISK_LEVEL_LABEL[row.riskLevel] ?? row.riskLevel },
    { label: '风险摘要', value: row.summary },
    { label: '建议', value: row.suggestions },
    { label: '分析时间', value: formatTime(row.analyzedAt) },
  ]
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="page">
    <PageHeader title="风险分析列表" back-to="/bid-inviter" back-label="返回招标方入口" />

    <!--声明整张表的数据来源-->
    <el-table
        v-loading="loading"
        :data="rows"
        border
        stripe
        class="clickable-table"
        @row-click="openDetail"
        style="width: 100%"
    >
      <template #empty>
        <el-empty description="暂无风险分析记录" />
      </template>
      <!--声明每一列从行数据里取哪个字段-->
      <el-table-column prop="analysisId" label="ID" width="80" />
      <el-table-column prop="bidRecordId" label="投标记录 ID" width="120" />
      <el-table-column prop="bidderName" label="投标人" min-width="160" show-overflow-tooltip />
      <el-table-column prop="riskLevel" width="120" align="center">
        <template #header>
            <div class="column-header">
                风险等级
                <el-popover placement="bottom" :width="240" trigger="click">
                    <template #reference>
                        <el-icon class="header-help"><QuestionFilled /></el-icon>
                    </template>
                    <div class="header-legend">
                        <div class="header-legend-title">风险等级说明</div>
                        <div class="header-legend-items">
                            <template v-for="[value, label] in riskLegend" :key="value">
                                <div class="legend-entry">
                                    <el-tag
                                        size="small"
                                        :type="RISK_LEVEL_TYPE[value] ?? 'info'"
                                        :class="RISK_LEVEL_TAG_CLASS[value] ?? ''"
                                        disable-transitions
                                    >
                                        {{ label }}
                                    </el-tag>
                                    <span>：{{ RISK_LEVEL_DESC[value] }}</span>
                                </div>
                            </template>
                        </div>
                    </div>
                </el-popover>
            </div>
        </template>
        <template #default="{ row }: { row: RiskAnalysis }">
          <el-tag
            v-if="row.riskLevel"
            :type="RISK_LEVEL_TYPE[row.riskLevel] ?? 'info'"
            :class="RISK_LEVEL_TAG_CLASS[row.riskLevel] ?? ''"
            disable-transitions
          >
            {{ RISK_LEVEL_LABEL[row.riskLevel] ?? row.riskLevel }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="summary" label="风险摘要" min-width="220" show-overflow-tooltip />
      <el-table-column prop="suggestions" label="建议" min-width="220" show-overflow-tooltip />
      <el-table-column label="分析时间" width="160">
        <template #default="{ row }: { row: RiskAnalysis }">
          {{ formatTime(row.analyzedAt) }}
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

    <!-- 行详情弹窗 -->
    <DetailDialog
        v-model="detailVisible"
        :title="`风险分析详情 #${detailRow?.analysisId ?? ''}`"
        :fields="detailRow ? detailFields(detailRow) : []"
    />
  </div>
</template>
