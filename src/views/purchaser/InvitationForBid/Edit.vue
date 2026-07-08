<script setup lang="ts">
/**
 * 编辑招标公告表单(Element Plus 版)。
 *
 * 数据流转:
 *   ① onMounted → getInvitationForBid(id) 回填 form
 *   ② 用户在 el-input / el-input-number / el-switch / el-date-picker 中修改
 *   ③ v-model 自动把输入写入 form.xxx
 *   ④ 用户点击 <el-button @click="onSubmit">
 *   ⑤ onSubmit → updateInvitationForBid(id, form)
 *   ⑥ BE 返回 Result<InvitationForBid> → 提示成功 → 跳转回列表
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 * 校验: 全部交给 BE (@NotNull/@NotBlank), FE 不重复。
 *
 * ─── Class hierarchy ───
 *   const id            = Number(route.params.id)   // URL 参数解析
 *   const form: reactive<UpdateRequest>             // 18 字段,全部可选
 *     - bidHandlerId: undefined (PATCH null=不修改,显式不传)
 *   const loading  = ref(true)                       // onMounted 时回填
 *   const submitting = ref(false)
 *   const updated  = ref<Diff<InvitationForBid> | null>(null)  // BE 返回 Diff
 *   onMounted → load() → getInvitationForBid(id)  // ① 回填 form
 *   async function onSubmit()                        // ② PATCH 提交
 *   async function goBack()                         // 提交成功/取消返回列表
 *   - exports: 无
 *   - props: 无
 *   - api 依赖: getInvitationForBid(id) + updateInvitationForBid(id, form)
 *   - 路由: useRoute() 拿 :id; useRouter() 跳回列表
 *
 * ─── Style dependencies ───
 *   - global (style.css): .page / .page-header / .page-title / .page-actions / .page-card
 *   - scoped (本文件 owns):
 *     .edit-form-card   (max-width: 860px)
 *     .edit-result-card (max-width: 860px; margin-top: 16px)
 *     .diff-section     (Diff 对比展示块)
 */
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { getInvitationForBid, updateInvitationForBid } from '@/api/invitation-for-bid'
import type { UpdateRequest } from '@/types/invitation-for-bid'

const route = useRoute()
const router = useRouter()

const id = Number(route.params.id)

const form = reactive<UpdateRequest>({
  bidHandlerId: undefined,
  projectNo: '',
  purchaseTaskNo: '',
  platformCategory: '',
  tenderProcess: '',
  tenderMethod: '',
  purchaseMethod: '',
  isFixedPrice: false,
  hasDocumentFee: false,
  deposit: undefined,
  creditReportRequired: false,
  registrationDeadline: '',
  technicalTenderDeadline: '',
  businessTenderDeadline: '',
  purchaseCompany: '',
  purchaseDepartment: '',
  tenderingParty: '',
  notes: '',
})

const loading = ref(false)
const submitting = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const entity = await getInvitationForBid(id)
    Object.assign(form, {
      bidHandlerId: entity.bidHandlerId,
      projectNo: entity.projectNo,
      purchaseTaskNo: entity.purchaseTaskNo,
      platformCategory: entity.platformCategory ?? '',
      tenderProcess: entity.tenderProcess ?? '',
      tenderMethod: entity.tenderMethod ?? '',
      purchaseMethod: entity.purchaseMethod ?? '',
      isFixedPrice: entity.isFixedPrice ?? false,
      hasDocumentFee: entity.hasDocumentFee ?? false,
      deposit: entity.deposit,
      creditReportRequired: entity.creditReportRequired ?? false,
      registrationDeadline: entity.registrationDeadline ?? '',
      technicalTenderDeadline: entity.technicalTenderDeadline ?? '',
      businessTenderDeadline: entity.businessTenderDeadline ?? '',
      purchaseCompany: entity.purchaseCompany ?? '',
      purchaseDepartment: entity.purchaseDepartment ?? '',
      tenderingParty: entity.tenderingParty ?? '',
      notes: entity.notes ?? '',
    })
  } catch (e) {
    const msg = e instanceof ApiError
        ? `[${e.code}] ${e.message}`
        : `请求失败: ${(e as Error)?.message ?? String(e)}`
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
})

async function onSubmit() {
  submitting.value = true
  try {
    const diff = await updateInvitationForBid(id, {
      ...form,
      bidHandlerId: form.bidHandlerId ?? undefined,
    })
    ElMessage.success(`更新成功 ID=${diff.after.invitationId}`)
    router.push('/purchaser/invitation/list')
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
      <h2 class="page-title">编辑招标公告</h2>
      <div class="page-actions">
        <el-button @click="router.push('/purchaser/invitation/list')">← 返回列表</el-button>
      </div>
    </div>

    <el-card v-loading="loading" class="edit-form-card page-card">
      <el-form :model="form" label-width="120px" @submit.prevent="onSubmit">
        <el-divider content-position="left">基本信息</el-divider>

        <el-form-item label="经办人 ID" required>
          <el-input-number v-model="form.bidHandlerId" :min="1" />
        </el-form-item>
        <el-form-item label="项目编号" required>
          <el-input v-model="form.projectNo" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="采购任务编号" required>
          <el-input v-model="form.purchaseTaskNo" maxlength="50" show-word-limit />
        </el-form-item>

        <el-divider content-position="left">流程信息</el-divider>

        <el-form-item label="平台采购类别">
          <el-input v-model="form.platformCategory" maxlength="50" />
        </el-form-item>
        <el-form-item label="招标流程">
          <el-input v-model="form.tenderProcess" maxlength="50" />
        </el-form-item>
        <el-form-item label="招标方式">
          <el-input v-model="form.tenderMethod" maxlength="50" />
        </el-form-item>
        <el-form-item label="采购方式">
          <el-input v-model="form.purchaseMethod" maxlength="50" />
        </el-form-item>

        <el-divider content-position="left">费用与规则</el-divider>

        <el-form-item label="是否固定价">
          <el-switch v-model="form.isFixedPrice" />
        </el-form-item>
        <el-form-item label="是否有文件费">
          <el-switch v-model="form.hasDocumentFee" />
        </el-form-item>
        <el-form-item label="保证金">
          <el-input-number v-model="form.deposit" :min="0" :precision="2" :step="0.01" />
        </el-form-item>
        <el-form-item label="需要资信报告">
          <el-switch v-model="form.creditReportRequired" />
        </el-form-item>

        <el-divider content-position="left">时间节点</el-divider>

        <el-form-item label="报名截止">
          <el-date-picker
              v-model="form.registrationDeadline"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              placeholder="选择日期时间"
          />
        </el-form-item>
        <el-form-item label="技术投标截止">
          <el-date-picker
              v-model="form.technicalTenderDeadline"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              placeholder="选择日期时间"
          />
        </el-form-item>
        <el-form-item label="商务投标截止">
          <el-date-picker
              v-model="form.businessTenderDeadline"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              placeholder="选择日期时间"
          />
        </el-form-item>

        <el-divider content-position="left">采购方信息</el-divider>

        <el-form-item label="采购公司">
          <el-input v-model="form.purchaseCompany" maxlength="100" />
        </el-form-item>
        <el-form-item label="采购部门">
          <el-input v-model="form.purchaseDepartment" maxlength="100" />
        </el-form-item>
        <el-form-item label="招标主体">
          <el-input v-model="form.tenderingParty" maxlength="100" />
        </el-form-item>

        <el-divider content-position="left">备注</el-divider>

        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" native-type="submit" @click="onSubmit">
            {{ submitting ? '提交中...' : '提交' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.edit-form-card {
  max-width: 860px;
  margin: 0 auto;
}
</style>