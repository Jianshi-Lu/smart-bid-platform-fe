<script setup lang="ts">
/**
 * 创建招标经办人表单。
 *
 * 四个字段按 AddRequest 原样提交，长度限制与后端 DTO 对齐；必填校验仍以后端为准。
 * 首次提交创建经办人并保留其 ID，随后在同页切换为修改，避免重复点击创建出多条记录。
 * 编辑路由复用本表单：先按 ID 加载，再走 PATCH；不展示后端实体 JSON。
 * 后端创建通知邮件异步发送，不影响本页成功状态。
 * 请求异常统一交给 getErrorMessage 转换为可展示文案。
 */
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  createBidHandlerInfo,
  getBidHandlerInfo,
  updateBidHandlerInfo,
} from '@/api/bid-handler-info'
import PageHeader from '@/shared/components/PageHeader.vue'
import { getErrorMessage } from '@/shared/utils/error'
import type { AddRequest } from '@/types/bid-handler-info'

const route = useRoute()
const router = useRouter()

const form = reactive<AddRequest>({
  handlerName: '',
  companyName: '',
  departmentName: '',
  targetEmail: '',
})

const submitting = ref(false)
const loading = ref(false)
const bidHandlerId = ref<number | null>(parseBidHandlerId(route.params.id))

function parseBidHandlerId(value: unknown): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function loadForEdit() {
  if (bidHandlerId.value === null) return
  loading.value = true
  try {
    const entity = await getBidHandlerInfo(bidHandlerId.value)
    form.handlerName = entity.handlerName
    form.companyName = entity.companyName
    form.departmentName = entity.departmentName
    form.targetEmail = entity.targetEmail
  } catch (e) {
    ElMessage.error(`加载经办人失败: ${getErrorMessage(e)}`)
    await router.replace('/bid-inviter/bid-handler-info/list')
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (submitting.value || loading.value) return
  submitting.value = true
  try {
    if (bidHandlerId.value === null) {
      const entity = await createBidHandlerInfo({ ...form })
      bidHandlerId.value = entity.bidHandlerId
      await router.replace(`/bid-inviter/bid-handler-info/edit/${entity.bidHandlerId}`)
      ElMessage.success('创建成功，现在可继续修改。')
    } else {
      await updateBidHandlerInfo(bidHandlerId.value, { ...form })
      ElMessage.success('修改成功')
    }
  } catch (e) {
    const msg = getErrorMessage(e)
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadForEdit()
})
</script>

<template>
  <div class="page">
    <PageHeader
        :title="bidHandlerId ? `编辑招标经办人 #${bidHandlerId}` : '创建招标经办人'"
        back-to="/bid-inviter/bid-handler-info/list"
        back-label="返回经办人列表"
    />

    <el-card v-loading="loading" class="create-form-card page-card">
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
            {{ submitting ? '提交中...' : bidHandlerId ? '修改' : '提交' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

  </div>
</template>

<style scoped>
.create-form-card {
  max-width: 720px;
  margin: 0 auto;
}

</style>
