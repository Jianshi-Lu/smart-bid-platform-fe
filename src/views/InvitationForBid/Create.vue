<script setup lang="ts">
/**
 * 创建招标公告表单(Element Plus 版)。
 *
 * 数据流转:
 *   el-form v-model -> form.* -> submit() -> createInvitationForBid(form)
 *        -> http.post -> BE -> resp.data.data
 *        -> ElMessage.success + created.value -> el-card 展示 JSON
 *
 * 错误: 拦截器包装 ApiError, ElMessage.error。
 * 校验: 全部交给 BE (@NotNull/@NotBlank), FE 不重复。
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { createInvitationForBid } from '@/modules/invitation-for-bid/api'
import type { AddRequest, InvitationForBid } from '@/modules/invitation-for-bid/types'

// el-input-number 对 0 展示"空",所以用 null 占位,提交时 ?? 0 兜底
const form = reactive<AddRequest>({
  bidHandlerId: null as unknown as number,
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

const submitting = ref(false)
const created = ref<InvitationForBid | null>(null)

async function onSubmit() {
  submitting.value = true
  created.value = null
  try {
    const entity = await createInvitationForBid({
      ...form,
      bidHandlerId: form.bidHandlerId ?? 0,
    })
    created.value = entity
    ElMessage.success(`创建成功 ID=${entity.invitationId} 状态=${entity.status}`)
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
  <div style="max-width: 800px; padding: 16px;">
    <h2>创建招标公告</h2>

    <el-form :model="form" label-width="120px" @submit.prevent="onSubmit">
      <el-divider content-position="left">基本信息</el-divider>

            <el-form-item label="经办人 ID" required>
                <!-- :min="1" 排除 0/负数:BE @NotNull 校验要求 > 0 -->
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
                <!-- value-format="YYYY-MM-DDTHH:mm:ss" 匹配 BE ISO-8601(去掉 T 和时区) -->
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

    <el-card v-if="created" style="margin-top: 16px;">
      <template #header>
        <strong>BE 返回实体</strong>
      </template>
      <pre style="margin: 0;">{{ JSON.stringify(created, null, 2) }}</pre>
    </el-card>
  </div>
</template>
