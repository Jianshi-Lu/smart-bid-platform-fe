<script setup lang="ts">
/**
 * 创建招标经办人表单。
 *
 * 四个字段按 AddRequest 原样提交，长度限制与后端 DTO 对齐；必填校验仍以后端为准。
 * 创建成功后展示返回实体，后端通知邮件异步发送，不影响本页成功状态。
 * 请求异常统一交给 getErrorMessage 转换为可展示文案。
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createBidHandlerInfo } from '@/api/bid-handler-info'
import PageHeader from '@/shared/components/PageHeader.vue'
import { getErrorMessage } from '@/shared/utils/error'
import type { AddRequest, BidHandlerInfo } from '@/types/bid-handler-info'

const form = reactive<AddRequest>({
  handlerName: '',
  companyName: '',
  departmentName: '',
  targetEmail: '',
})

const submitting = ref(false)
const created = ref<BidHandlerInfo | null>(null)

async function onSubmit() {
  submitting.value = true
  created.value = null
  try {
    const entity = await createBidHandlerInfo({ ...form })
    created.value = entity
    ElMessage.success(`创建成功 ID=${entity.bidHandlerId}`)
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
    <PageHeader title="创建招标经办人" back-to="/purchaser" back-label="返回招标方入口" />

    <el-card class="create-form-card page-card">
      <el-form :model="form" label-width="120px" @submit.prevent="onSubmit">
        <el-form-item label="经办人姓名" required>
          <el-input v-model="form.handlerName" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="所属公司" required>
          <el-input v-model="form.companyName" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="所属部门" required>
          <el-input v-model="form.departmentName" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="通知邮箱" required>
          <el-input v-model="form.targetEmail" maxlength="255" show-word-limit />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" native-type="submit">
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
  max-width: 720px;
  margin: 0 auto;
}

.create-result-card {
  max-width: 720px;
  margin: 16px auto 0;
}
</style>
