<script setup lang="ts">
/**
 * 创建招标经办人表单(Element Plus 版)。
 *
 * 数据流转 11 步链:
 *   ① <script setup>: reactive<AddRequest>(form) 创建内存对象,4 字段
 *   ② <template>: 每个 el-form-item 用 el-input v-model="form.xxx" 双向绑定
 *   ③ 用户在 el-input 中输入内容
 *   ④ v-model 自动把输入写入 form.xxx(form 响应式 Proxy 触发更新)
 *   ⑤ 用户点击 <el-button @click="onSubmit">
 *   ⑥ 触发 onSubmit(): 置 submitting=true, 清 created
 *   ⑦ onSubmit 内 { ...form } 读取并组装请求体(全必填,无数字兜底)
 *   ⑧ 调用 createBidHandlerInfo(form) → modules/bid-handler-info/api.ts
 *        的 http.post<Result<BidHandlerInfo>>('/bid-handler-info/add', data)
 *   ⑨ http 实例经 Vite 代理把 JSON 发到 BE 8080,BE @Valid 校验 + 写库
 *        + 异步发送通知邮件到 targetEmail
 *   ⑩ BE 返回 Result<BidHandlerInfo>,响应拦截器拆 envelope → Promise resolve(entity)
 *   ⑪ created.value = entity → ElMessage.success + <el-card> 展示 JSON
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 * 校验: 全部交给 BE (@NotBlank), FE 不重复。
 *
 * 模块特有: 4 字段全必填,无日期/无数字字段;
 * maxlength 对齐 BE @Size(handlerName:50 / companyName:100 / departmentName:100 / targetEmail:255);
 * 创建后 BE 异步发邮件到 targetEmail,失败不影响创建结果。
 *
 * ─── Class hierarchy ───
 *   const form: reactive<AddRequest>    // 4 字段(全必填)
 *   const submitting = ref(false)
 *   const created    = ref<BidHandlerInfo | null>(null)
 *   async function onSubmit()
 *   - exports: 无
 *   - props: 无
 *   - api 依赖: createBidHandlerInfo(data)
 *   - 跨组件导航: $router.push('/') (返回首页按钮)
 *
 * ─── Style dependencies ───
 *   - global (style.css): .page / .page-header / .page-title / .page-actions / .page-card
 *   - scoped (本文件 owns): .create-form-card / .create-result-card
 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { createBidHandlerInfo } from '@/api/bid-handler-info'
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
