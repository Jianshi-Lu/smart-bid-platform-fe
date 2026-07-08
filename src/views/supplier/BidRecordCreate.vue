<script setup lang="ts">
/**
 * 投标录入页(/supplier/bid-record/create?invitationId=N)。
 *
 * 文件职责: 投标方在选中的招标公告下录入投标信息,提交后落库 bid_record。
 *
 * 依赖关系:
 *   - invitation-for-bid/api.ts: getInvitationForBid(加载选中公告详情)
 *   - invitation-for-bid/types.ts: InvitationForBid
 *   - bid-record/api.ts: createBidRecord(提交投标)
 *   - bid-record/types.ts: AddRequest, BidRecord
 *   - http.ts: ApiError
 *   - element-plus: el-form / el-card / el-descriptions / el-tag / el-input-number
 *
 * 数据承接载体(本组件 ↔ api ↔ BE):
 *   - 选中公告加载: query.invitationId (string) → number → getInvitationForBid(id) → InvitationForBid
 *   - 投标提交: AddRequest(invitationId 固定 + 4 字段) → createBidRecord → BidRecord
 *
 * 数据流转链(进入页面):
 *   ① 用户从 /supplier/invitation/list 点击"我要投标" → 跳 /supplier/bid-record/create?invitationId=N
 *   ② <script setup> 解析 route.query.invitationId 为 number,无效则跳列表
 *   ③ onMounted 调 getInvitationForBid(invitationId) → selectedInvitation 加载选中公告
 *   ④ 渲染 el-descriptions 显示选中公告基本信息(只读,投标方确认目标项目)
 *
 * 数据流转链(提交投标):
 *   ① 用户填表 bidderName / quotePrice / bidderContact / (credentials 可选)
 *   ② v-model 自动写入 form 对应字段(响应式 Proxy)
 *   ③ 用户点击提交按钮 → onSubmit()
 *   ④ 置 submitting=true,清 created
 *   ⑤ 读 form,组装请求体 { ...form, invitationId: fixedId }
 *   ⑥ 调用 createBidRecord → bid-record/api.ts 的 http.post<Result<BidRecord>>('/bid-record/add', data)
 *   ⑦ http 实例经 Vite 代理发到 BE 8080
 *   ⑧ BE @Valid 校验 + 写库(bidNo 与 bidAt BE 自动算)
 *   ⑨ BE 返回 Result<BidRecord>,响应拦截器拆 envelope → Promise resolve(entity)
 *   ⑩ created.value = entity → ElMessage.success(`投标成功 ID=${id} 投标次序=${bidNo}`)
 *   ⑪ 留在当前页面(可继续投其他项目)
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 *
 * 字段说明(严格对齐 BidRecord 实体字段):
 *   - invitationId: 从 query 读取,disabled,不可修改
 *   - bidderName: 投标人名称(必填, BE @Size(max=100))
 *   - quotePrice: 报价(BigDecimal,必填, el-input-number :precision=2 :step=0.01)
 *   - bidderContact: 联系方式(必填, BE @Size(max=255))
 *   - credentials: 资信材料(可选, BE @Size(max=500))
 *
 * 校验: 全部交给 BE (@NotNull/@NotBlank/@Size), FE 不重复。
 *
 * ─── Class hierarchy ───
 *   const route = useRoute();  const router = useRouter()
 *   const invitationId       = computed<number|null>(...)  // 从 query 解析,无效 → 跳列表
 *   const selectedInvitation = ref<InvitationForBid|null>(null)  // 选中公告详情(async 加载)
 *   const loadingInvitation  = ref(false)                      // 选中公告加载中
 *   const form: reactive<AddRequest>                           // 4 字段 + invitationId 占位
 *   const submitting = ref(false)
 *   const created    = ref<BidRecord|null>(null)
 *   onMounted → loadSelected()                                 // 选公告 + 校验 id
 *   async function onSubmit()                                  // 提交 → 留本页
 *   - exports: 无
 *   - props: 无
 *   - api 依赖: getInvitationForBid + createBidRecord           // 跨模块
 *   - 路由: useRoute() 取 query.invitationId; useRouter() 跳列表
 *   - 共享常量: BID_NOTICE_STATUS_TYPE (src/shared/utils/el-tag.ts)
 *   - 共享工具: formatTime / displayOrDash / yesNo (src/shared/utils/format.ts)
 *
 * ─── Style dependencies ───
 *   - global (style.css): .page / .page-header / .page-title / .page-actions / .page-card / .form-actions
 *   - scoped (本文件 owns):
 *     .invitation-card / .bid-form-card / .create-result-card
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { getInvitationForBid } from '@/api/invitation-for-bid'
import { createBidRecord } from '@/api/bid-record'
import type { InvitationForBid } from '@/types/invitation-for-bid'
import type { AddRequest, BidRecord } from '@/types/bid-record'
import { BID_NOTICE_STATUS_TYPE } from '@/shared/utils/el-tag'
import { formatTime, displayOrDash, yesNo } from '@/shared/utils/format'

const route = useRoute()
const router = useRouter()

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
const form = reactive<AddRequest>({
  invitationId: null as unknown as number,
  bidderName: '',
  quotePrice: undefined,
  bidderContact: '',
  credentials: '',
})

const submitting = ref(false)
const created = ref<BidRecord | null>(null)

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
    const msg = e instanceof ApiError
        ? `[${e.code}] ${e.message}`
        : `请求失败: ${(e as Error)?.message ?? String(e)}`
    ElMessage.error(`加载邀请详情失败: ${msg}`)
  } finally {
    loadingInvitation.value = false
  }
})

// ——— 提交 ———
async function onSubmit() {
  if (invitationId.value === null) {
    ElMessage.error('缺少有效的邀请 ID')
    router.replace('/supplier/invitation/list')
    return
  }
  submitting.value = true
  created.value = null
  try {
    const entity = await createBidRecord({
      ...form,
      invitationId: invitationId.value,
    })
    created.value = entity
    ElMessage.success(
      `投标成功 ID=${entity.bidRecordId} 投标次序=${entity.bidNo}`
    )
  } catch (e) {
    const msg = e instanceof ApiError
        ? `[${e.code}] ${e.message}`
        : `请求失败: ${(e as Error)?.message ?? String(e)}`
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">投标录入</h2>
      <div class="page-actions">
        <el-button @click="router.push('/supplier/invitation/list')">← 返回项目列表</el-button>
      </div>
    </div>

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
      <el-form :model="form" label-width="120px">
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
        <el-form-item label="资信材料">
          <!-- 可选,BE @Size(max=500) -->
          <el-input v-model="form.credentials" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" native-type="submit" @click="onSubmit">
            {{ submitting ? '提交中...' : '提交投标' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="created" class="create-result-card">
      <template #header>
        <strong>BE 返回实体</strong>
      </template>
      <pre style="margin: 0;">{{ JSON.stringify(created, null, 2) }}</pre>
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

.create-result-card {
  max-width: 720px;
  margin: 16px auto 0;
}
</style>