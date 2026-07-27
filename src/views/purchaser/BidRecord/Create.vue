<script setup lang="ts">
/**
 * 招标方创建投标记录表单。
 *
 * UI 表单态允许报价为空，提交前回落为 0，以满足 AddRequest 的 number 契约。
 * bidNo 与 bidAt 由后端生成；credentials 是管理端保留的可选字符串字段，
 * 与后续独立的资信文件上传流程不是同一职责。
 * 请求异常统一交给 getErrorMessage 转换为可展示文案。
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createBidRecord } from '@/api/bid-record'
import PageHeader from '@/shared/components/PageHeader.vue'
import { getErrorMessage } from '@/shared/utils/error'
import type { AddRequest, BidRecord } from '@/types/bid-record'

type BidRecordForm = Omit<AddRequest, 'quotePrice'> & {
  quotePrice?: number
}

// el-input-number 对 0 展示"空",所以用 null 占位,提交时 ?? 0 兜底
const form = reactive<BidRecordForm>({
  invitationId: null as unknown as number,
  bidderName: '',
  quotePrice: undefined,
  bidderContact: '',
  credentials: '',
})

const submitting = ref(false)
const created = ref<BidRecord | null>(null)

async function onSubmit() {
  submitting.value = true
  created.value = null
  try {
    const entity = await createBidRecord({
      ...form,
      invitationId: form.invitationId ?? 0,
      quotePrice: form.quotePrice ?? 0,
    })
    created.value = entity
    ElMessage.success(
      `创建成功 ID=${entity.bidRecordId} 投标次序=${entity.bidNo}`
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
    <PageHeader title="创建投标记录" back-to="/purchaser" back-label="返回招标方入口" />

    <el-card class="create-form-card page-card">
      <el-form :model="form" label-width="120px">
        <el-form-item label="招标公告 ID" required>
          <!-- :min="1" 排除 0/负数:BE @NotNull 校验要求 > 0 -->
          <el-input-number v-model="form.invitationId" :min="1" />
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
