<script setup lang="ts">
/**
 * 编辑招标公告表单(Element Plus 版)。
 *
 * 数据流转:
 *   ① onMounted → loadEntity(): 无效 id → 提示并跳转列表;否则 getInvitationForBid(id) 回填 form
 *   ② 用户在 el-input / el-input-number / el-switch / el-date-picker 中修改
 *   ③ v-model 自动把输入写入 form.xxx
 *   ④ 用户点击 <el-button @click="onSubmit">
 *   ⑤ onSubmit → updateInvitationForBid(id, form) → 提示成功 → goBack()
 *   ⑥ goBack() → router.push('/purchaser/invitation/list')
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 * 校验: 全部交给 BE (@NotNull/@NotBlank), FE 不重复。
 *
 * ─── Class hierarchy ───
 *   const id = computed<number|null>(...)   // URL 参数解析,无效时返回 null
 *   const form: reactive<UpdateRequest>     // 18 字段,全部可选
 *     - bidHandlerId: undefined (PATCH 语义:undefined=该字段不出现在 body → BE 保留原值)
 *   const loading  = ref(false)             // 回填时转圈
 *   const submitting = ref(false)           // 提交按钮 loading
 *   onMounted → loadEntity()                // ① id 校验 + 回填
 *   async function onSubmit()               // ② PATCH 提交
 *   function goBack()                       // 返回列表(供模板按钮 + onSubmit 复用)
 *   - exports: 无
 *   - props: 无
 *   - api 依赖: getInvitationForBid(id) + updateInvitationForBid(id, form)
 *   - 路由: useRoute() 拿 :id; useRouter() 跳回列表
 *
 * ─── Style dependencies ───
 *   - global (style.css): .page / .page-header / .page-title / .page-actions / .page-card / .form-actions
 *   - scoped (本文件 owns):
 *     .edit-form-card   (max-width: 860px; 居中)
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { getInvitationForBid, updateInvitationForBid } from '@/api/invitation-for-bid'
import type { UpdateRequest } from '@/types/invitation-for-bid'

const route = useRoute()
const router = useRouter()

// ——— id 校验:route.params.id 必须为正整数,否则返回 null 触发重定向 ———
const id = computed<number | null>(() => {
  const raw = Number(route.params.id)
  return Number.isFinite(raw) && raw > 0 ? raw : null
})

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

// ——— 返回列表(模板按钮 + onSubmit 成功共用) ———
function goBack() {
  router.push('/purchaser/invitation/list')
}

async function loadEntity() {
  if (id.value === null) {
    ElMessage.error('无效的公告 ID')
    goBack()
    return
  }
  const numericId: number = id.value
  loading.value = true
  try {
    const entity = await getInvitationForBid(numericId)
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
}

onMounted(loadEntity)

async function onSubmit() {
  if (id.value === null) {
    ElMessage.error('无效的公告 ID')
    return
  }
  const numericId: number = id.value
  submitting.value = true
  try {
    const diff = await updateInvitationForBid(numericId, {
      ...form,
      bidHandlerId: form.bidHandlerId ?? undefined,
    })
    ElMessage.success(`更新成功 ID=${diff.after.invitationId}`)
    goBack()
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
        <el-button @click="goBack">← 返回列表</el-button>
      </div>
    </div>

    <el-card v-loading="loading" class="edit-form-card page-card">
      <el-form :model="form" label-width="120px">
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