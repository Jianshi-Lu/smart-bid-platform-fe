<script setup lang="ts">
/**
 * 招标公告分页列表。
 *
 * usePagedList 负责按 invitation_id 倒序加载；页面保留编辑跳转和状态修改业务。
 * 状态更新成功后重新加载当前页，避免只修改前端行对象造成服务端状态不一致。
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { listInvitationForBids, updateInvitationForBidStatus } from '@/api/invitation-for-bid'
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

// ——— 状态修改弹窗 ———
const statusDialogVisible = ref(false)
const statusTarget = ref<InvitationForBid | null>(null)
const selectedStatus = ref<BidNoticeStatus>('DRAFT')
const statusSubmitting = ref(false)

// ——— 行详情弹窗 ———
const detailVisible = ref(false)
const detailRow = ref<InvitationForBid | null>(null)

// 全部可选状态(用于下拉)
const allStatuses: BidNoticeStatus[] = ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED']
const statusLegend: Array<[BidNoticeStatus, string]> =
    Object.entries(BID_NOTICE_STATUS_LABEL) as Array<[BidNoticeStatus, string]>

onMounted(() => {
  void load()
})

// ——— 编辑按钮:跳转到编辑页 ———
function onEdit(row: InvitationForBid) {
  router.push(`/bid-inviter/invitation/edit/${row.invitationId}`)
}

// ——— 修改状态按钮:打开弹窗 ———
function onChangeStatus(row: InvitationForBid) {
  statusTarget.value = row
  selectedStatus.value = row.status ?? 'DRAFT'
  statusDialogVisible.value = true
}

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

// ——— 状态弹窗取消 ———
function onStatusCancel() {
  statusDialogVisible.value = false
  statusTarget.value = null
}

// ——— 状态弹窗确认 ———
async function onStatusConfirm() {
  if (!statusTarget.value) return
  const targetId = statusTarget.value.invitationId
  const newStatus = selectedStatus.value
  statusSubmitting.value = true
  try {
    await updateInvitationForBidStatus(targetId, newStatus)
    ElMessage.success(`ID=${targetId} 状态已更新为 ${newStatus}`)
    statusDialogVisible.value = false
    statusTarget.value = null
    // 刷新当前页
    await load(currentPage.value)
  } catch (e) {
    const msg = getErrorMessage(e)
    ElMessage.error(msg)
  } finally {
    statusSubmitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="招标公告列表" back-to="/bid-inviter" back-label="返回招标方入口" />

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
        <el-empty description="暂无公告数据" />
      </template>

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

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }: { row: InvitationForBid }">
          <el-button size="small" type="primary" @click.stop="onEdit(row)">编辑</el-button>
          <el-button size="small" type="warning" @click.stop="onChangeStatus(row)">修改状态</el-button>
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

        <!-- 状态修改弹窗 -->
        <el-dialog
            v-model="statusDialogVisible"
            title="修改公告状态"
            width="420px"
            @close="onStatusCancel"
        >
            <div v-if="statusTarget" style="padding: 0 8px;">
                <p style="margin: 0 0 12px; color: var(--lc-text-secondary);">
                    公告 ID: <strong>{{ statusTarget.invitationId }}</strong>
                    ，项目编号: <strong>{{ statusTarget.projectNo }}</strong>
                </p>
                <el-form label-width="80px">
                    <el-form-item label="当前状态">
                        <el-tag v-if="statusTarget.status" :type="BID_NOTICE_STATUS_TYPE[statusTarget.status] ?? 'info'" disable-transitions>
                            {{ statusTarget.status }}
                        </el-tag>
                    </el-form-item>
                    <el-form-item label="新状态">
                        <el-select v-model="selectedStatus" style="width: 100%;">
                            <el-option
                                v-for="s in allStatuses"
                                :key="s"
                                :label="s"
                                :value="s"
                            />
                        </el-select>
                    </el-form-item>
                </el-form>
            </div>
            <template #footer>
                <el-button @click="onStatusCancel">取消</el-button>
                <el-button type="primary" :loading="statusSubmitting" @click="onStatusConfirm">
                    {{ statusSubmitting ? '提交中...' : '确认' }}
                </el-button>
            </template>
        </el-dialog>

        <!-- 行详情弹窗 -->
        <DetailDialog
            v-model="detailVisible"
            :title="`公告详情 #${detailRow?.invitationId ?? ''}`"
            :fields="detailRow ? detailFields(detailRow) : []"
        />
    </div>
</template>
