<script setup lang="ts">
/**
 * 创建招标公告表单(Element Plus 版)。
 *
 * 数据流转 11 步链:
 *   ① <script setup>: reactive<AddRequest>(form) 创建内存对象,18 字段
 *   ② <template>: 每个 el-form-item 用 el-input v-model="form.xxx" 双向绑定
 *   ③ 用户在 el-input / el-input-number / el-switch / el-date-picker 中输入
 *   ④ v-model 自动把输入写入 form.xxx(form 响应式 Proxy 触发更新)
 *   ⑤ 用户点击 <el-button @click="onSubmit">
 *   ⑥ 触发 onSubmit(): 置 submitting=true, 清 created
 *   ⑦ onSubmit 内 { ...form, bidHandlerId ?? 0 } 读取并组装请求体
 *   ⑧ 调用 createInvitationForBid(form) → api/invitation-for-bid.ts
 *        的 http.post<Result<InvitationForBid>>('/invitation-for-bid/add', data)
 *   ⑨ http 实例经 Vite 代理把 JSON 发到 BE 8080,BE @Valid 校验 + 写库
 *   ⑩ BE 返回 Result<InvitationForBid>,响应拦截器拆 envelope → Promise resolve(entity)
 *   ⑪ created.value = entity → ElMessage.success + <el-card> 展示 JSON
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 * 校验: 全部交给 BE (@NotNull/@NotBlank), FE 不重复。
 *
 * 模块特有: 3 必填(bidHandlerId/projectNo/purchaseTaskNo) + 15 可选;
 * 含 3 个 el-date-picker,value-format="YYYY-MM-DDTHH:mm:ss" 匹配 BE ISO-8601;
 * deposit(BigDecimal)用 el-input-number :precision="2" :step="0.01"。
 *
 * ─── Class hierarchy ───
 *   const form: reactive<AddRequest>    // 18 字段绑定到 v-model
 *     - bidHandlerId: null 占位,提交时 ?? 0 (el-input-number 对 0 展示"空")
 *   const submitting = ref(false)        // 提交按钮 loading
 *   const created    = ref<InvitationForBid | null>(null)  // BE 返回实体展示
 *   async function onSubmit()            // 1) 置 submitting 2) 调 api 3) 提示/展示
 *   - exports: 无
 *   - props: 无
 *   - api 依赖: createInvitationForBid(data)
 *   - 跨组件导航: useRouter().push() (返回首页按钮)
 *
 * ─── Style dependencies ───
 *   - global (style.css): .page / .page-header / .page-title / .page-actions / .page-card / .form-actions
 *   - scoped (本文件 owns):
 *     .create-form-card    (max-width: 860px; 居中)
 *     .create-result-card  (max-width: 860px; margin-top: 16px)
 */
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { createInvitationForBid } from '@/api/invitation-for-bid'
import type { AddRequest, InvitationForBid } from '@/types/invitation-for-bid'

const router = useRouter()

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
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">创建招标公告</h2>
      <div class="page-actions">
        <el-button @click="router.push('/')">← 返回首页</el-button>
      </div>
    </div>

    <el-card class="create-form-card page-card">
      <el-form :model="form" label-width="120px">
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
