<script setup lang="ts">
/**
 * 招标经办人列表页(PageHelper 分页)。
 *
 * 数据流转 11 步链:
 *   ① <script setup>: 声明状态 rows / total / currentPage / pageSize(=10) / loading
 *   ② onMounted() → reload(currentPage.value) 初始化第 1 页
 *   ③ reload(page) 置 loading=true → <el-table v-loading> 转圈
 *   ④ 调用 listBidHandlers({page, pageSize, sort:'bid_handler_id desc'})
 *        → modules/bid-handler-info/api.ts 的 http.get<Result<PageResult<BidHandlerInfo>>>
 *   ⑤ http 实例经 Vite 代理发到 BE 8080,BE PageHelper 查分页
 *   ⑥ BE 返回 Result<PageResult<BidHandlerInfo>>,响应拦截器拆 envelope
 *   ⑦ rows.value / total.value / currentPage.value = data.{list, total, pageNum}
 *   ⑧ loading=false → <el-table> 渲染 5 列 + <el-pagination :total>
 *   ⑨ 用户点击 <el-pagination> 跳页
 *   ⑩ @current-change → onPageChange(page) → reload(page)
 *   ⑪ 回到 ③ 循环
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 *
 * 模块特有: 5 列(ID/姓名/公司/部门/邮箱);
 * pageSize=10 固定,显式覆盖 BE 默认的 3(让 3 模块列表行为一致)。
 */
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { listBidHandlers } from '@/modules/bid-handler-info/api'
import type { BidHandlerInfo } from '@/modules/bid-handler-info/types'

// ——— 状态机 ———
const rows = ref<BidHandlerInfo[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 10                 // 固定,不开放;FE 显式覆盖 BE 默认的 3
const loading = ref(false)

// ——— 生命周期 ———
onMounted(() => {
  reload(currentPage.value)
})

// ——— 数据加载 ———
async function reload(page: number) {
  loading.value = true
  try {
    const data = await listBidHandlers({
      page,
      pageSize,
      sort: 'bid_handler_id desc',
    })
    rows.value = data.list
    total.value = data.total
    currentPage.value = data.pageNum
  } catch (e) {
    const msg = e instanceof ApiError
        ? `[${e.code}] ${e.message}`
        : `请求失败: ${(e as Error)?.message ?? String(e)}`
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

// ——— 翻页 ———
function onPageChange(page: number) {
  reload(page)
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">招标经办人列表</h2>
      <div class="page-actions">
        <el-button @click="$router.push('/')">← 返回首页</el-button>
      </div>
    </div>

    <el-table
        v-loading="loading"
        :data="rows"
        border
        stripe
        style="width: 100%"
    >
      <template #empty>
        <el-empty description="暂无经办人数据" />
      </template>

      <el-table-column prop="bidHandlerId" label="ID" width="80" />
      <el-table-column prop="handlerName" label="经办人姓名" min-width="120" show-overflow-tooltip />
      <el-table-column prop="companyName" label="所属公司" min-width="180" show-overflow-tooltip />
      <el-table-column prop="departmentName" label="所属部门" min-width="160" show-overflow-tooltip />
      <el-table-column prop="targetEmail" label="通知邮箱" min-width="220" show-overflow-tooltip />
    </el-table>

    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <!--
          v-model:current-page + @current-change 看似重复触发,
          实际: v-model 只更新 currentPage.value,@current-change 才会发请求。
          若只用 v-model 去掉 @current-change,翻页不会触发 reload;
          若只用 @current-change 去掉 v-model,pagination 显示会滞后。
      -->
      <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next, jumper"
          background
          @current-change="onPageChange"
      />
    </div>
  </div>
</template>
