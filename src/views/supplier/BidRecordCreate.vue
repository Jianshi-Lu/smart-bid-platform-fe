<script setup lang="ts">
/**
 * 投标录入页(/supplier/bid-record/create?invitationId=N)。
 *
 * invitationId 必须来自路由 query 且为正数，页面先加载并只读展示目标公告，
 * 提交时固定使用该 ID，避免用户把投标记录写到其他公告。
 * 创建成功后使用响应中的 bidRecordId 解锁资信材料上传，并锁定投标表单，
 * 避免重复创建投标记录后造成文件批次与投标记录错配。
 * 报价的空 UI 状态在提交前回落为 0，字段与业务校验仍以后端为准。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getInvitationForBid } from '@/api/invitation-for-bid'
import { createBidderBidRecord } from '@/api/bidder-bid-record'
import CredentialFileUpload from '@/shared/components/CredentialFileUpload.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { getErrorMessage } from '@/shared/utils/error'
import type { InvitationForBid } from '@/types/invitation-for-bid'
import type { AddRequest, BidRecord } from '@/types/bid-record'
import { BID_NOTICE_STATUS_TYPE } from '@/shared/utils/el-tag'
import { formatTime, displayOrDash, yesNo } from '@/shared/utils/format'

const route = useRoute()
const router = useRouter()

type BidRecordForm = Omit<AddRequest, 'quotePrice' | 'credentials'> & {
  quotePrice?: number
}

// ——— 选中的公告基本信息(只读展示) ———
const selectedInvitation = ref<InvitationForBid | null>(null)
const loadingInvitation = ref(false)

// ——— 从 query 解析 invitationId,无效则跳列表 ———
const invitationId = computed<number | null>(() => {
  const raw = route.query.invitationId
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
})

// ——— 投标表单 ———
const form = reactive<BidRecordForm>({
  invitationId: null as unknown as number,
  bidderName: '',
  quotePrice: undefined,
  bidderContact: '',
})

const submitting = ref(false)
const created = ref<BidRecord | null>(null)
const createdBidRecordId = computed<number | null>(() => {
  const id = created.value?.bidRecordId
  return Number.isInteger(id) && Number(id) > 0 ? Number(id) : null
})
const canUploadCredentials = computed(
  () => createdBidRecordId.value !== null && !submitting.value
)

// ——— 生命周期 ———
onMounted(async () => {
  if (invitationId.value === null) {
    ElMessage.error('缺少有效的邀请 ID')
    router.replace('/supplier/invitation/list')
    return
  }
  form.invitationId = invitationId.value
  loadingInvitation.value = true
  try {
    selectedInvitation.value = await getInvitationForBid(invitationId.value)
  } catch (e) {
    const msg = getErrorMessage(e)
    ElMessage.error(`加载邀请详情失败: ${msg}`)
  } finally {
    loadingInvitation.value = false
  }
})

// ——— 提交 ———
async function onSubmit() {
  if (submitting.value || createdBidRecordId.value !== null) return

  if (invitationId.value === null) {
    ElMessage.error('缺少有效的邀请 ID')
    router.replace('/supplier/invitation/list')
    return
  }
  submitting.value = true
  created.value = null
  try {
    const entity = await createBidderBidRecord({
      ...form,
      invitationId: invitationId.value,
      quotePrice: form.quotePrice ?? 0,
    })
    if (!Number.isInteger(entity.bidRecordId) || entity.bidRecordId <= 0) {
      throw new Error('投标响应缺少有效的投标记录 ID')
    }
    created.value = entity
    ElMessage.success(
      `投标成功 ID=${entity.bidRecordId} 投标次序=${entity.bidNo}`
    )
  } catch (e) {
    const msg = getErrorMessage(e)
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader
      title="投标录入"
      back-to="/supplier/invitation/list"
      back-label="返回项目列表"
    />

    <!--
      el-card #1: 选中的邀请基本信息(只读,投标方确认目标项目)
      v-loading 复用 loadingInvitation 状态
    -->
    <el-card v-loading="loadingInvitation" class="invitation-card page-card">
      <template #header>
        <strong>本次投标目标项目</strong>
      </template>
      <div v-if="selectedInvitation" class="invitation-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="项目编号">{{ selectedInvitation.projectNo }}</el-descriptions-item>
          <el-descriptions-item label="采购任务编号">{{ selectedInvitation.purchaseTaskNo }}</el-descriptions-item>
          <el-descriptions-item label="采购公司">{{ displayOrDash(selectedInvitation.purchaseCompany) }}</el-descriptions-item>
          <el-descriptions-item label="招标主体">{{ displayOrDash(selectedInvitation.tenderingParty) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="selectedInvitation.status" :type="BID_NOTICE_STATUS_TYPE[selectedInvitation.status] ?? 'info'">
              {{ selectedInvitation.status }}
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(selectedInvitation.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="报名截止">{{ formatTime(selectedInvitation.registrationDeadline) }}</el-descriptions-item>
          <el-descriptions-item label="技术投标截止">{{ formatTime(selectedInvitation.technicalTenderDeadline) }}</el-descriptions-item>
          <el-descriptions-item label="商务投标截止">{{ formatTime(selectedInvitation.businessTenderDeadline) }}</el-descriptions-item>
          <el-descriptions-item label="是否固定价">{{ yesNo(selectedInvitation.isFixedPrice) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <el-empty v-else-if="!loadingInvitation" description="无法加载项目信息" />
    </el-card>

    <!--
      el-card #2: 投标表单(el-form,严格对齐 BidRecord/Create.vue 字段)
      invitationId 通过 form.invitationId + :disabled 显示固定值
    -->
    <el-card class="bid-form-card page-card">
      <template #header>
        <strong>投标信息</strong>
      </template>
      <el-form
        :model="form"
        :disabled="submitting || createdBidRecordId !== null"
        label-width="120px"
      >
        <el-form-item label="招标公告 ID" required>
          <!-- :min="1" + :disabled: BE @NotNull 校验要求 > 0,且不可修改 -->
          <el-input-number v-model="form.invitationId" :min="1" :disabled="true" />
        </el-form-item>
        <el-form-item label="投标人名称" required>
          <el-input v-model="form.bidderName" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="报价" required>
          <!-- :precision="2" :step="0.01" 强制 2 位小数,匹配 BE BigDecimal -->
          <el-input-number v-model="form.quotePrice" :min="0" :precision="2" :step="0.01" />
        </el-form-item>
        <el-form-item label="联系方式" required>
          <el-input v-model="form.bidderContact" maxlength="255" show-word-limit />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" native-type="button" @click="onSubmit">
            {{ createdBidRecordId !== null ? '投标已提交' : submitting ? '提交中...' : '提交投标' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card
      class="credential-card page-card"
      :class="{ 'is-locked': !canUploadCredentials }"
    >
      <template #header>
        <div class="card-header">
          <strong>资信材料</strong>
          <el-tag :type="canUploadCredentials ? 'success' : 'info'" size="small">
            {{ canUploadCredentials ? '可上传' : '待提交投标' }}
          </el-tag>
        </div>
      </template>
      <CredentialFileUpload
        :bid-record-id="createdBidRecordId"
        :disabled="!canUploadCredentials"
        bidder-mode
      />
    </el-card>
  </div>
</template>

<style scoped>
.invitation-card {
  max-width: 960px;
  margin: 0 auto 16px;
}

.bid-form-card {
  max-width: 720px;
  margin: 0 auto;
}

.credential-card {
  max-width: 720px;
  margin: 16px auto 0;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.credential-card.is-locked {
  background: var(--lc-surface-muted);
  border-color: var(--lc-border-strong);
}

.credential-card.is-locked :deep(.el-card__header),
.credential-card.is-locked :deep(.el-card__body) {
  background: var(--lc-surface-muted);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
