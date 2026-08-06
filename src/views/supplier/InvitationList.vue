<script setup lang="ts">
/**
 * 投标方可投项目分页列表。
 *
 * 与招标方复用公告查询 API 和 usePagedList，但只暴露查看与“我要投标”。
 * onBid 通过 query 传递 invitationId，投标录入页负责校验并加载公告详情。
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { listInvitationForBids } from '@/api/invitation-for-bid'
import PageHeader from '@/shared/components/PageHeader.vue'
import DetailDialog, { type DetailField } from '@/shared/components/DetailDialog.vue'
import { usePagedList } from '@/shared/composables/usePagedList'
import { getErrorMessage } from '@/shared/utils/error'
import {
    BID_NOTICE_STATUS_DESC,
    BID_NOTICE_STATUS_LABEL,
    PLATFORM_CATEGORY_LABEL,
    PURCHASE_METHOD_LABEL,
    TENDER_PROCESS_LABEL,
    boolLabel,
    dictLabel,
} from '@/shared/utils/dict'
import type { BidNoticeStatus, InvitationForBid } from '@/types/invitation-for-bid'
import { BID_NOTICE_STATUS_TYPE } from '@/shared/utils/el-tag'
import { formatTime } from '@/shared/utils/format'

const router = useRouter()

const { rows, total, currentPage, pageSize, loading, load } = usePagedList<InvitationForBid>({
  fetchPage: listInvitationForBids,
  sort: 'invitation_id desc',
  onError: (error) => ElMessage.error(getErrorMessage(error)),
})

// ——— 行详情弹窗 ———
const detailVisible = ref(false)
const detailRow = ref<InvitationForBid | null>(null)
const statusLegend: Array<[BidNoticeStatus, string]> =
    Object.entries(BID_NOTICE_STATUS_LABEL) as Array<[BidNoticeStatus, string]>

function openDetail(row: InvitationForBid) {
  detailRow.value = row
  detailVisible.value = true
}

function detailFields(row: InvitationForBid): DetailField[] {
  return [
    { label: '公告 ID', value: row.invitationId },
    { label: '项目编号', value: row.projectNo },
    { label: '采购任务编号', value: row.purchaseTaskNo },
    { label: '平台类别', value: dictLabel(PLATFORM_CATEGORY_LABEL, row.platformCategory) },
    { label: '采购方式', value: dictLabel(PURCHASE_METHOD_LABEL, row.purchaseMethod) },
    { label: '招标流程', value: dictLabel(TENDER_PROCESS_LABEL, row.tenderProcess) },
    { label: '是否固定价格', value: boolLabel(row.isFixedPrice) },
    { label: '是否收取文件费', value: boolLabel(row.hasDocumentFee) },
    { label: '保证金', value: row.deposit },
    { label: '要求信用报告', value: boolLabel(row.creditReportRequired) },
    { label: '报名截止时间', value: formatTime(row.registrationDeadline) },
    { label: '技术标截止时间', value: formatTime(row.technicalTenderDeadline) },
    { label: '商务标截止时间', value: formatTime(row.businessTenderDeadline) },
    { label: '采购公司', value: row.purchaseCompany },
    { label: '采购部门', value: row.purchaseDepartment },
    { label: '招标主体', value: row.tenderingParty },
    { label: '状态', value: row.status ? (BID_NOTICE_STATUS_LABEL[row.status] ?? row.status) : '-' },
    { label: '备注', value: row.notes },
    { label: '创建时间', value: formatTime(row.createdAt) },
  ]
}

onMounted(() => {
  void load()
})

// ——— 行内操作:跳转到投标录入(query 传 invitationId) ———
function onBid(row: InvitationForBid) {
  router.push({
    path: '/supplier/bid-record/create',
    query: { invitationId: String(row.invitationId) },
  })
}
</script>

<template>
  <div class="page">
    <PageHeader title="投标项目列表" back-to="/supplier" back-label="返回投标方入口" />

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
        <el-empty description="暂无招标项目" />
      </template>

      <!--声明每一列从行数据里取哪个字段-->
      <el-table-column prop="invitationId" label="ID" width="80" />
      <el-table-column prop="projectNo" label="项目编号" min-width="140" show-overflow-tooltip />
      <el-table-column prop="purchaseTaskNo" label="采购任务编号" min-width="140" show-overflow-tooltip />

      <el-table-column prop="status" width="120" align="center">
        <template #header>
            <div class="column-header">
                状态
                <el-popover placement="bottom" :width="240" trigger="click">
                    <template #reference>
                        <el-icon class="header-help"><QuestionFilled /></el-icon>
                    </template>
                    <div class="header-legend">
                        <div class="header-legend-title">状态说明</div>
                        <div class="header-legend-items">
                            <template v-for="[value, label] in statusLegend" :key="value">
                                <div class="legend-entry">
                                    <el-tag
                                        size="small"
                                        :type="BID_NOTICE_STATUS_TYPE[value] ?? 'info'"
                                        disable-transitions
                                    >
                                        {{ label }}
                                    </el-tag>
                                    <span>：{{ BID_NOTICE_STATUS_DESC[value] }}</span>
                                </div>
                            </template>
                        </div>
                    </div>
                </el-popover>
            </div>
        </template>
        <template #default="{ row }: { row: InvitationForBid }">
          <el-tag v-if="row.status" :type="BID_NOTICE_STATUS_TYPE[row.status] ?? 'info'" disable-transitions>
            {{ BID_NOTICE_STATUS_LABEL[row.status] ?? row.status }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column prop="purchaseCompany" label="采购公司" min-width="160" show-overflow-tooltip />
      <el-table-column prop="tenderingParty" label="招标主体" min-width="160" show-overflow-tooltip />

      <el-table-column label="创建时间" width="160">
        <template #default="{ row }: { row: InvitationForBid }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>

      <!--操作列:行末"我要投标"按钮-->
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }: { row: InvitationForBid }">
          <el-button
            type="primary"
            size="small"
            @click.stop="onBid(row)"
          >
            我要投标
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

    <!-- 行详情弹窗 -->
    <DetailDialog
        v-model="detailVisible"
        :title="`招标公告详情 #${detailRow?.invitationId ?? ''}`"
        :fields="detailRow ? detailFields(detailRow) : []"
    />
  </div>
</template>
