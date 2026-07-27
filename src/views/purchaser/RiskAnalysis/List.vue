<script setup lang="ts">
/**
 * 风险分析历史结果的只读分页列表。
 *
 * usePagedList 负责按 analysis_id 倒序加载。rawResponse 不在列表展示；
 * 风险分析的生成入口仍位于投标记录列表，本页不触发分析或修改记录。
 */
import { onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listRiskAnalyses } from '@/api/risk-analysis'
import PageHeader from '@/shared/components/PageHeader.vue'
import { usePagedList } from '@/shared/composables/usePagedList'
import { getErrorMessage } from '@/shared/utils/error'
import type { RiskAnalysis } from '@/types/risk-analysis'
import { RISK_LEVEL_TYPE } from '@/shared/utils/el-tag'
import { formatTime } from '@/shared/utils/format'

const { rows, total, currentPage, pageSize, loading, load } = usePagedList<RiskAnalysis>({
  fetchPage: listRiskAnalyses,
  sort: 'analysis_id desc',
  onError: (error) => ElMessage.error(getErrorMessage(error)),
})

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="page">
    <PageHeader title="风险分析列表" back-to="/purchaser" back-label="返回招标方入口" />

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
          <el-tag v-if="row.riskLevel" :type="RISK_LEVEL_TYPE[row.riskLevel] ?? 'info'" disable-transitions>
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
  </div>
</template>
