<script setup lang="ts">
/**
 * 投标记录列表页(PageHelper 分页)。
 *
 * 数据流转 11 步链:
 *   ① <script setup>: 声明状态 rows / total / currentPage / pageSize(=10) / loading
 *   ② onMounted() → load(currentPage.value) 初始化第 1 页
 *   ③ load(page) 置 loading=true → <el-table v-loading> 转圈
 *   ④ 调用 listBidRecords({page, pageSize, sort:'bid_record_id desc'})
 *        → modules/bid-record/api.ts 的 http.get<Result<PageResult<BidRecord>>>
 *   ⑤ http 实例经 Vite 代理发到 BE 8080,BE PageHelper 查分页
 *   ⑥ BE 返回 Result<PageResult<BidRecord>>,响应拦截器拆 envelope
 *   ⑦ rows.value / total.value / currentPage.value = data.{list, total, pageNum}
 *   ⑧ loading=false → <el-table> 渲染 7 列 + <el-pagination :total>
 *   ⑨ 用户点击 <el-pagination> 跳页
 *   ⑩ @current-change → onPageChange(page) → load(page)
 *   ⑪ 回到 ③ 循环
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 *
 * 模块特有: 8 列(ID/公告ID/投标人/报价/次序/时间/联系方式/资信材料);
 * quotePrice 用 inline formatPrice 兜 2 位小数(避免 JS 浮点尾巴);
 * bidAt 用 inline formatTime 处理 ISO-8601;
 * credentials 是"资信材料链接",最长 500 字符,
 * 列用 show-overflow-tooltip 截断 + hover 弹完整内容。
 */
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { listBidRecords } from '@/modules/bid-record/api'
import type { BidRecord } from '@/modules/bid-record/types'

// ——— 状态机 ———
const rows = ref<BidRecord[]>([])
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
    // 从后端返回获取data字段（包含对应行的数据）
    const data = await listBidRecords({
      page,
      pageSize,
      sort: 'bid_record_id desc',
    })
    // 将数据赋值到rows——供显示组件使用
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

// ——— 报价格式化(inline,等出现第 2 处重复再抽 shared/) ———
function formatPrice(price: number | undefined): string {
  return price != null ? price.toFixed(2) : '-'
}

// ——— 时间格式化(inline,不引 dayjs) ———
function formatTime(iso?: string): string {
  return iso ? iso.replace('T', ' ').substring(0, 16) : '-'
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">投标记录列表</h2>
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
        <el-empty description="暂无投标记录" />
      </template>

      <el-table-column prop="bidRecordId" label="ID" width="80" />
      <el-table-column prop="invitationId" label="公告 ID" width="100" />
      <el-table-column prop="bidderName" label="投标人" min-width="160" show-overflow-tooltip />
      <el-table-column label="报价" width="140">
        <template #default="{ row }: { row: BidRecord }">
          {{ formatPrice(row.quotePrice) }}
        </template>
      </el-table-column>
      <el-table-column prop="bidNo" label="投标次序" width="100" align="center" />
      <el-table-column label="投标时间" width="160">
        <template #default="{ row }: { row: BidRecord }">
          {{ formatTime(row.bidAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="bidderContact" label="联系方式" min-width="180" show-overflow-tooltip />
      <el-table-column prop="credentials" label="资信材料" min-width="200" show-overflow-tooltip />
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
