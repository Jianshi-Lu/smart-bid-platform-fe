<script setup lang="ts">
/**
 * 创建/修改招标公告表单。
 *
 * 首次提交调用创建接口并保存后端生成的 invitationId；随后留在当前页，
 * 同一按钮改为调用 PATCH 更新该 ID，避免重复点击产生重复公告。
 * 页面不展示后端实体 JSON，成功提示只反馈用户可理解的结果。
 */
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listBidHandlers } from '@/api/bid-handler-info'
import { createInvitationForBid, updateInvitationForBid } from '@/api/invitation-for-bid'
import AmountInput from '@/shared/components/AmountInput.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { getErrorMessage } from '@/shared/utils/error'
import { enumLabel, enumOptions } from '@/shared/utils/dict'
import type { BidHandlerInfo } from '@/types/bid-handler-info'
import type { AddRequest } from '@/types/invitation-for-bid'

// 保证金用 AmountInput 键盘输入；空值保持 undefined，由后端决定是否存值。
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
/** 首次创建成功后保存后端主键，后续提交改为更新这个公告。 */
const invitationId = ref<number | null>(null)
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
  if (submitting.value) return
  if (!Number.isInteger(form.bidHandlerId) || form.bidHandlerId <= 0) {
    ElMessage.error('请选择经办人')
    return
  }

  submitting.value = true
  try {
    if (invitationId.value === null) {
      const entity = await createInvitationForBid({
        ...form,
        bidHandlerId: form.bidHandlerId,
      })
      invitationId.value = entity.invitationId
      ElMessage.success(
          `创建成功，状态：${enumLabel('bidNoticeStatus', entity.status)}；现在可继续修改。`,
      )
    } else {
      await updateInvitationForBid(invitationId.value, {
        ...form,
        bidHandlerId: form.bidHandlerId,
      })
      ElMessage.success('修改成功')
    }
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
        :title="invitationId ? `编辑招标公告 #${invitationId}` : '创建招标公告'"
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
        <el-button type="primary" :loading="submitting" native-type="button" @click="onSubmit">
          {{ submitting ? '提交中...' : invitationId ? '修改' : '提交' }}
        </el-button>
      </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.create-form-card {
  max-width: 860px;
  margin: 0 auto;
}

</style>
