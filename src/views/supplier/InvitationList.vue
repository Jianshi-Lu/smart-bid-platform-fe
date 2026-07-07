<script setup lang="ts">
/**
 * 投标项目列表页(/supplier/invitation/list)。
 *
 * 文件职责: 投标方查看所有招标公告,选择项目进行投标。
 *
 * 依赖关系:
 *   - api.ts: listInvitationForBids(列表加载)
 *   - types.ts: InvitationForBid(行类型) + BidNoticeStatus(状态枚举) + ListRequest
 *   - http.ts: ApiError(统一错误类型)
 *   - element-plus: el-table / el-pagination / el-button / el-tag
 *
 * 数据承接载体(本组件 ↔ api ↔ BE):
 *   - 列表加载: ListRequest({page, pageSize, sort}) → PageResult<InvitationForBid>
 *       其中 rows.value = data.list, currentPage.value = data.pageNum
 *
 * 数据流转 11 步链(列表加载):
 *   ① <script setup>: 声明状态 rows / total / currentPage / pageSize(=10) / loading
 *   ② onMounted() → load(currentPage.value) 初始化第 1 页
 *   ③ load(page) 置 loading=true → <el-table v-loading> 转圈
 *   ④ 调用 listInvitationForBids({page, pageSize, sort:'invitation_id desc'})
 *        → modules/invitation-for-bid/api.ts 的 http.get<Result<PageResult<InvitationForBid>>>
 *   ⑤ http 实例经 Vite 代理发到 BE 8080,BE PageHelper 查分页
 *   ⑥ BE 返回 Result<PageResult<InvitationForBid>>,响应拦截器拆 envelope
 *   ⑦ rows.value / total.value / currentPage.value = data.{list, total, pageNum}
 *   ⑧ loading=false → <el-table> 渲染 7 列 + 1 操作列 + <el-pagination :total>
 *   ⑨ 用户点击 <el-pagination> 跳页
 *   ⑩ @current-change → onPageChange(page) → load(page)
 *   ⑪ 回到 ③ 循环
 *
 * 行内操作链(投标跳转):
 *   ① 用户点击行末"我要投标"按钮
 *   ② onBid(row) → $router.push('/supplier/bid-record/create?invitationId=' + row.invitationId)
 *   ③ SupplierBidRecordCreate.vue 从 query 读 invitationId,展示选中公告 + 录入表单
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 *
 * 模块特有: 7 列 + 1 操作列(行末"我要投标"按钮);
 *          状态展示用 el-tag 颜色映射(同 InvitationForBid/List);
 *          不过滤状态(与招标方列表一致,所有状态都展示,前端无变更状态的入口);
 *          操作按钮点击后跳录入页,通过 query 传 invitationId。
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { listInvitationForBids } from '@/api/invitation-for-bid'
import type { BidNoticeStatus, InvitationForBid } from '@/types/invitation-for-bid'

// ——— 状态机 ———
const rows = ref<InvitationForBid[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 10                 // 固定,不开放
const loading = ref(false)

const router = useRouter()

// ——— 生命周期 ———
onMounted(() => {
  load(currentPage.value)
})

// ——— 列表加载 ———
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

// ——— 行内操作:跳转到投标录入 ———
function onBid(row: InvitationForBid) {
  router.push({
    path: '/supplier/bid-record/create',
    query: { invitationId: String(row.invitationId) },
  })
}

// ——— 状态 tag 颜色映射(与 InvitationForBid/List 对齐) ———
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
      <h2 class="page-title">投标项目列表</h2>
      <div class="page-actions">
        <el-button @click="$router.push('/supplier')">← 返回投标方入口</el-button>
      </div>
    </div>

    <!--声明整张表的数据来源-->
    <el-table
        v-loading="loading"
        :data="rows"
        border
        stripe
        style="width: 100%"
    >
      <template #empty>
        <el-empty description="暂无招标项目" />
      </template>

      <!--声明每一列从行数据里取哪个字段-->
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

      <!--操作列:行末"我要投标"按钮-->
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }: { row: InvitationForBid }">
          <el-button
            type="primary"
            size="small"
            @click="onBid(row)"
          >
            我要投标
          </el-button>
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