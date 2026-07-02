<script setup lang="ts">
/**
 * 创建招标公告表单。
 *
 * 数据流转链条:
 *   View -> v-model -> reactive(form) -> createInvitationForBid(form)
 *        -> http.post(JSON.stringify) -> HTTP -> BE
 *        -> resp.data(JSON.parse) -> created.value / successMsg -> View
 *
 * 关键约定:
 *   - 业务成功判定已下沉到 src/api/http.ts 拦截器,组件不再判 code
 *   - 必填字段 (bidHandlerId / projectNo / purchaseTaskNo) 由 BE @NotNull/@NotBlank 校验
 *   - 错误统一由拦截器包装为 ApiError 抛出,组件用 instanceof ApiError 区分
 */
import { reactive, ref } from 'vue'
import { createInvitationForBid } from '@/api/invitation-for-bid'
import { ApiError } from '@/api/http'
import type { AddRequest, InvitationForBid } from '@/types/invitation-for-bid'

// 整个表单状态:reactive 把对象包成 Proxy,字段改 Vue 自动通知 v-model 更新
const form = reactive<AddRequest>({
  bidHandlerId: 0,
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
  notes: ''
})

// 状态锁:防止用户连点提交导致重复请求,绑定到按钮 :disabled
const submitting = ref(false)
const successMsg = ref('')
const errorMsg = ref('')
const created = ref<InvitationForBid | null>(null)

async function onSubmit() {
  submitting.value = true
  successMsg.value = ''
  errorMsg.value = ''
  created.value = null
  try {
    const entity = await createInvitationForBid(form)
    created.value = entity
    successMsg.value = `创建成功, ID=${entity.invitationId}, 状态=${entity.status}`
  } catch (e) {
    if (e instanceof ApiError) {
      errorMsg.value = `[${e.code}] ${e.message}`
    } else {
      errorMsg.value = `请求失败: ${(e as Error)?.message ?? String(e)}`
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit" style="max-width: 720px; padding: 16px;">
    <!-- .prevent 阻止表单默认提交导致的整页刷新,这是 SPA 的致命操作 -->
    <h2>创建招标公告</h2>

    <fieldset style="margin-bottom: 16px;">
      <legend>基本信息</legend>

      <div style="margin-bottom: 8px;">
        <label>经办人 ID *:&nbsp;</label>
        <!-- .number 把 input 字符串转 number,否则 axios 发出的 JSON 里 bidHandlerId 是 "123" 而非 123,BE 反序列化会失败 -->
        <input v-model.number="form.bidHandlerId" type="number" required />
      </div>

      <div style="margin-bottom: 8px;">
        <label>项目编号 *:&nbsp;</label>
        <input v-model="form.projectNo" type="text" required maxlength="50" />
      </div>

      <div style="margin-bottom: 8px;">
        <label>采购任务编号 *:&nbsp;</label>
        <input v-model="form.purchaseTaskNo" type="text" required maxlength="50" />
      </div>
    </fieldset>

    <fieldset style="margin-bottom: 16px;">
      <legend>流程信息</legend>

      <div style="margin-bottom: 8px;">
        <label>平台采购类别:&nbsp;</label>
        <input v-model="form.platformCategory" type="text" maxlength="50" />
      </div>

      <div style="margin-bottom: 8px;">
        <label>招标流程:&nbsp;</label>
        <input v-model="form.tenderProcess" type="text" maxlength="50" />
      </div>

      <div style="margin-bottom: 8px;">
        <label>招标方式:&nbsp;</label>
        <input v-model="form.tenderMethod" type="text" maxlength="50" />
      </div>

      <div style="margin-bottom: 8px;">
        <label>采购方式:&nbsp;</label>
        <input v-model="form.purchaseMethod" type="text" maxlength="50" />
      </div>
    </fieldset>

    <fieldset style="margin-bottom: 16px;">
      <legend>费用与规则</legend>

      <div style="margin-bottom: 8px;">
        <label><input v-model="form.isFixedPrice" type="checkbox" />&nbsp;是否固定价</label>
      </div>

      <div style="margin-bottom: 8px;">
        <label><input v-model="form.hasDocumentFee" type="checkbox" />&nbsp;是否有文件费</label>
      </div>

      <div style="margin-bottom: 8px;">
        <label>保证金:&nbsp;</label>
        <input v-model.number="form.deposit" type="number" step="0.01" />
      </div>

      <div style="margin-bottom: 8px;">
        <label><input v-model="form.creditReportRequired" type="checkbox" />&nbsp;是否需要资信报告</label>
      </div>
    </fieldset>

    <fieldset style="margin-bottom: 16px;">
      <legend>时间节点</legend>

      <div style="margin-bottom: 8px;">
        <label>报名截止时间:&nbsp;</label>
        <input v-model="form.registrationDeadline" type="datetime-local" />
      </div>

      <div style="margin-bottom: 8px;">
        <label>技术投标截止时间:&nbsp;</label>
        <input v-model="form.technicalTenderDeadline" type="datetime-local" />
      </div>

      <div style="margin-bottom: 8px;">
        <label>商务投标截止时间:&nbsp;</label>
        <input v-model="form.businessTenderDeadline" type="datetime-local" />
      </div>
    </fieldset>

    <fieldset style="margin-bottom: 16px;">
      <legend>采购方信息</legend>

      <div style="margin-bottom: 8px;">
        <label>采购公司:&nbsp;</label>
        <input v-model="form.purchaseCompany" type="text" maxlength="100" />
      </div>

      <div style="margin-bottom: 8px;">
        <label>采购部门:&nbsp;</label>
        <input v-model="form.purchaseDepartment" type="text" maxlength="100" />
      </div>

      <div style="margin-bottom: 8px;">
        <label>招标主体:&nbsp;</label>
        <input v-model="form.tenderingParty" type="text" maxlength="100" />
      </div>
    </fieldset>

    <fieldset style="margin-bottom: 16px;">
      <legend>备注</legend>
      <textarea v-model="form.notes" rows="3" style="width: 100%;"></textarea>
    </fieldset>

    <button type="submit" :disabled="submitting">
      {{ submitting ? '提交中...' : '提交' }}
    </button>

    <div v-if="successMsg" style="margin-top: 16px; color: green;">
      {{ successMsg }}
    </div>
    <div v-if="errorMsg" style="margin-top: 16px; color: red;">
      {{ errorMsg }}
    </div>

    <pre v-if="created" style="margin-top: 16px; background: #f5f5f5; padding: 8px;">
{{ JSON.stringify(created, null, 2) }}
    </pre>
  </form>
</template>
