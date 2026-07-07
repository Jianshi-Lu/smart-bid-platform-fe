<script setup lang="ts">
/**
 * 招标公告列表页(PageHelper 分页)。
 *
 * 数据流转 11 步链:
 *   ① <script setup>: 声明状态 rows / total / currentPage / pageSize(=10) / loading
 *   ② onMounted() → load(currentPage.value) 初始化第 1 页
 *   ③ load(page) 置 loading=true → <el-table v-loading> 转圈
 *   ④ 调用 listInvitationForBids({page, pageSize, sort:'invitation_id desc'})
 *        → modules/invitation-for-bid/api.ts 的 http.get<Result<PageResult<InvitationForBid>>>
 *   ⑤ http 实例经 Vite 代理发到 BE 8080,BE PageHelper 查分页
 *   ⑥ BE 返回 Result<PageResult<InvitationForBid>>,响应拦截器拆 envelope
 *   ⑦ rows.value / total.value / currentPage.value = data.{list, total, pageNum}
 *   ⑧ loading=false → <el-table> 渲染 7 列 + <el-pagination :total>
 *   ⑨ 用户点击 <el-pagination> 跳页
 *   ⑩ @current-change → onPageChange(page) → load(page)
 *   ⑪ 回到 ③ 循环
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 *
 * 模块特有: 7 列展示(含 status 用 el-tag 按 BidNoticeStatus 映射颜色);
 * createdAt 用 inline formatTime 处理 ISO-8601 字符串;
 * pageSize=10 固定(覆盖 BE 默认)。
 */
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { listInvitationForBids } from '@/modules/invitation-for-bid/api'
import type { BidNoticeStatus, InvitationForBid } from '@/modules/invitation-for-bid/types'

// ——— 状态机 ———
const rows = ref<InvitationForBid[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 10                 // 固定,不开放
const loading = ref(false)

// ——— 生命周期 ———
onMounted(() => {
  load(currentPage.value)
})

// ——— 数据加载 ———
async function load(page: number) {
  loading.value = true
  try {
    const data = await listInvitationForBids({
      page,
      pageSize,
      sort: 'invitation_id desc',
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
  load(page)
}

// ——— 状态 tag 颜色映射 ———
const statusType: Record<BidNoticeStatus, '' | 'info' | 'primary' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'info',
  PUBLISHED: 'primary',
  CLOSED: 'warning',
  AWARDED: 'success',
  CANCELLED: 'danger',
}

// ——— 时间格式化(inline,不引 dayjs) ———
function formatTime(iso?: string): string {
  return iso ? iso.replace('T', ' ').substring(0, 16) : '-'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">招标公告列表</h2>
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
        <el-empty description="暂无公告数据" />
      </template>

      <el-table-column prop="invitationId" label="ID" width="80" />
      <el-table-column prop="projectNo" label="项目编号" min-width="140" show-overflow-tooltip />
      <el-table-column prop="purchaseTaskNo" label="采购任务编号" min-width="140" show-overflow-tooltip />

      <el-table-column prop="status" label="状态" width="110">
        <template #default="{ row }: { row: InvitationForBid }">
          <el-tag v-if="row.status" :type="statusType[row.status]" disable-transitions>
            {{ row.status }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column prop="purchaseCompany" label="采购公司" min-width="160" show-overflow-tooltip />
      <el-table-column prop="tenderingParty" label="招标主体" min-width="160" show-overflow-tooltip />

      <el-table-column label="创建时间" width="160">
        <template #default="{ row }: { row: InvitationForBid }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>

        <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
            <!--
                v-model:current-page + @current-change 看似重复触发,
                实际: v-model 只更新 currentPage.value,@current-change 才会发请求。
                若只用 v-model 去掉 @current-change,翻页不会触发 load;
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
