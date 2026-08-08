<script setup lang="ts">
/**
 * 创建招标公告表单。
 *
 * 表单字段对齐 AddRequest；bidHandlerId 的空 UI 状态在提交前回落为 0，
 * 三个日期字段按 ISO-8601 字符串发送，金额保留两位小数。
 * 必填与业务校验以后端 DTO 为准，请求异常统一交给 getErrorMessage 展示。
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listBidHandlers } from '@/api/bid-handler-info'
import { createInvitationForBid } from '@/api/invitation-for-bid'
import AmountInput from '@/shared/components/AmountInput.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { getErrorMessage } from '@/shared/utils/error'
import { enumLabel, enumOptions } from '@/shared/utils/dict'
import type { BidHandlerInfo } from '@/types/bid-handler-info'
import type { AddRequest, InvitationForBid } from '@/types/invitation-for-bid'

// 保证金用 AmountInput 键盘输入,空值以 undefined 占位,提交时 ?? 0 兜底
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
const handlers = ref<BidHandlerInfo[]>([])
const handlersLoading = ref(false)

// 下拉选项只做展示映射，表单仍提交英文枚举值。
const platformCategoryOptions = enumOptions('platformCategory')
const tenderProcessOptions = enumOptions('tenderProcess')
const tenderMethodOptions = enumOptions('tenderMethod')
const purchaseMethodOptions = enumOptions('purchaseMethod')

async function loadHandlers() {
  handlersLoading.value = true
  try {
    const result = await listBidHandlers({
      page: 1,
      pageSize: 100,
      sort: 'bid_handler_id asc',
    })
    handlers.value = result.list
  } catch (e) {
    ElMessage.error(`加载经办人列表失败: ${getErrorMessage(e, '')}`)
  } finally {
    handlersLoading.value = false
  }
}

onMounted(loadHandlers)

async function onSubmit() {
  submitting.value = true
  created.value = null
  try {
    const entity = await createInvitationForBid({
      ...form,
      bidHandlerId: form.bidHandlerId ?? 0,
    })
    created.value = entity
    ElMessage.success(
        `创建成功，状态：${enumLabel('bidNoticeStatus', entity.status)}`,
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
        title="创建招标公告"
        back-to="/bid-inviter/invitation/list"
        back-label="返回公告列表"
    />

    <el-card class="create-form-card page-card">
      <el-form :model="form" label-width="120px">
      <el-divider content-position="left">基本信息</el-divider>

            <el-form-item label="经办人" required>
                <el-select
                    v-model="form.bidHandlerId"
                    filterable
                    :loading="handlersLoading"
                    placeholder="请选择经办人"
                    style="width: 100%"
                >
                    <el-option
                        v-for="handler in handlers"
                        :key="handler.bidHandlerId"
                        :value="handler.bidHandlerId"
                        :label="`${handler.bidHandlerId} ${handler.handlerName}（${handler.companyName} / ${handler.departmentName}）`"
                    />
                </el-select>
            </el-form-item>
      <el-form-item label="项目编号" required>
        <el-input v-model="form.projectNo" maxlength="50" show-word-limit />
      </el-form-item>
      <el-form-item label="采购任务编号" required>
        <el-input v-model="form.purchaseTaskNo" maxlength="50" show-word-limit />
      </el-form-item>

      <el-divider content-position="left">流程信息</el-divider>

      <el-form-item label="平台采购类别">
        <el-select
            v-model="form.platformCategory"
            placeholder="请选择平台采购类别"
            clearable
            style="width: 100%"
        >
          <el-option
              v-for="[value, label] in platformCategoryOptions"
              :key="value"
              :value="value"
              :label="label"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="招标流程">
        <el-select
            v-model="form.tenderProcess"
            placeholder="请选择招标流程"
            clearable
            style="width: 100%"
        >
          <el-option
              v-for="[value, label] in tenderProcessOptions"
              :key="value"
              :value="value"
              :label="label"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="招标方式">
        <el-select
            v-model="form.tenderMethod"
            placeholder="请选择招标方式"
            clearable
            style="width: 100%"
        >
          <el-option
              v-for="[value, label] in tenderMethodOptions"
              :key="value"
              :value="value"
              :label="label"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="采购方式">
        <el-select
            v-model="form.purchaseMethod"
            placeholder="请选择采购方式"
            clearable
            style="width: 100%"
        >
          <el-option
              v-for="[value, label] in purchaseMethodOptions"
              :key="value"
              :value="value"
              :label="label"
          />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">费用与规则</el-divider>

      <el-form-item label="是否固定价">
        <el-switch v-model="form.isFixedPrice" />
      </el-form-item>
      <el-form-item label="是否有文件费">
        <el-switch v-model="form.hasDocumentFee" />
      </el-form-item>
      <el-form-item label="保证金">
        <AmountInput v-model="form.deposit" placeholder="请输入保证金金额" />
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
.create-form-card {
  max-width: 860px;
  margin: 0 auto;
}

.create-result-card {
  max-width: 860px;
  margin: 16px auto 0;
}
</style>
