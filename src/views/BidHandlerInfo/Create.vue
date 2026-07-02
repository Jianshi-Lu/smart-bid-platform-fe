<script setup lang="ts">
/**
 * 创建招标经办人表单(Element Plus 版)。
 *
 * 数据流转:
 *   el-form v-model -> form.* -> submit() -> createBidHandlerInfo(form)
 *        -> http.post -> BE -> resp.data.data
 *        -> ElMessage.success + created.value -> el-card 展示 JSON
 *
 * 错误: 拦截器包装 ApiError, ElMessage.error。
 * 校验: 全部交给 BE (@NotBlank), FE 不重复。
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { createBidHandlerInfo } from '@/modules/bid-handler-info/api'
import type { AddRequest, BidHandlerInfo } from '@/modules/bid-handler-info/types'

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
      <h2 class="page-title">创建招标经办人</h2>
      <div class="page-actions">
        <el-button @click="$router.push('/')">← 返回首页</el-button>
      </div>
    </div>

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
  max-width: 720px;
  margin: 0 auto;
}

.create-result-card {
  max-width: 720px;
  margin: 16px auto 0;
}
</style>
