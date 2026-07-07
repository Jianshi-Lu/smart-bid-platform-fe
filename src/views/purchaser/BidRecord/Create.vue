<script setup lang="ts">
/**
 * 创建投标记录表单(Element Plus 版)。
 *
 * 数据流转 11 步链:
 *   ① <script setup>: reactive<AddRequest>(form) 创建内存对象,5 字段(4 必填 + 1 可选)
 *   ② <template>: 每个 el-form-item 用 el-input v-model="form.xxx" 双向绑定
 *   ③ 用户在 el-input-number(invitationId/quotePrice) / el-input(bidderName/bidderContact) / el-input type="textarea"(credentials) 中输入
 *   ④ v-model 自动把输入写入 form.xxx(form 响应式 Proxy 触发更新)
 *   ⑤ 用户点击 <el-button @click="onSubmit">
 *   ⑥ 触发 onSubmit(): 置 submitting=true, 清 created
 *   ⑦ onSubmit 内 { ...form, invitationId ?? 0 } 读取并组装请求体
 *   ⑧ 调用 createBidRecord(form) → modules/bid-record/api.ts
 *        的 http.post<Result<BidRecord>>('/bid-record/add', data)
 *   ⑨ http 实例经 Vite 代理把 JSON 发到 BE 8080,BE @Valid 校验 + 写库
 *        + 自动算 bidNo(同 invitationId+bidderName 下 max+1)与 bidAt(CURRENT_TIMESTAMP)
 *   ⑩ BE 返回 Result<BidRecord>(含 bidNo/bidAt),响应拦截器拆 envelope → Promise resolve(entity)
 *   ⑪ created.value = entity → ElMessage.success(`创建成功 ID=${id} 投标次序=${bidNo}`) + <el-card> 展示 JSON
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 * 校验: 全部交给 BE (@NotNull/@NotBlank), FE 不重复。
 *
 * 模块特有: bidNo 与 bidAt 由 BE 在 add 时自动算,AddRequest 不包含,form 无对应输入框,创建后从返回 entity 看到;
 * quotePrice(BigDecimal)用 el-input-number :precision="2" :step="0.01";
 * credentials(资信材料)可选,BE @Size(max=500)。
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
