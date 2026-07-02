<script setup lang="ts">
/**
 * 创建投标记录表单(Element Plus 版)。
 *
 * 数据流转:
 *   el-form v-model -> form.* -> submit() -> createBidRecord(form)
 *        -> http.post -> BE -> resp.data.data
 *        -> ElMessage.success + created.value -> el-card 展示 JSON
 *
 * 错误: 拦截器包装 ApiError, ElMessage.error。
 * 校验: 全部交给 BE (@NotNull/@NotBlank), FE 不重复。
 *
 * 重要:
 *   - bidNo 与 bidAt 由 BE 在 add 时自动算(同 invitationId+bidderName 下 bidNo 递增),
 *     FE 表单不显示输入框,创建后从返回 entity 看到 bidNo
 *   - credentials(资信材料)可选,无 required
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { createBidRecord } from '@/modules/bid-record/api'
import type { AddRequest, BidRecord } from '@/modules/bid-record/types'

// el-input-number 对 0 展示"空",所以用 null 占位,提交时 ?? 0 兜底
const form = reactive<AddRequest>({
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
    })
    created.value = entity
    ElMessage.success(
      `创建成功 ID=${entity.bidRecordId} 投标次序=${entity.bidNo}`
    )
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
      <h2 class="page-title">创建投标记录</h2>
      <div class="page-actions">
        <el-button @click="$router.push('/')">← 返回首页</el-button>
      </div>
    </div>

    <el-card class="create-form-card page-card">
      <el-form :model="form" label-width="120px" @submit.prevent="onSubmit">
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
