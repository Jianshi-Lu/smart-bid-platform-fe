<script setup lang="ts">
/**
 * 招标公告列表页(PageHelper 分页)。
 *
 * 数据流转 11 步链:
 *   ① <script setup>: 声明状态 rows / total / currentPage / pageSize(=10) / loading
 *   ② onMounted() → load(currentPage.value) 初始化第 1 页
 *   ③ load(page) 置 loading=true → <el-table v-loading> 转圈
 *   ④ 调用 listInvitationForBids({page, pageSize, sort:'invitation_id desc'})
 *        → api/invitation-for-bid.ts 的 http.get<Result<PageResult<InvitationForBid>>>
 *   ⑤ http 实例经 Vite 代理发到 BE 8080,BE PageHelper 查分页
 *   ⑥ BE 返回 Result<PageResult<InvitationForBid>>,响应拦截器拆 envelope
 *   ⑦ rows.value / total.value / currentPage.value = data.{list, total, pageNum}
 *   ⑧ loading=false → <el-table> 渲染 7 列 + <el-pagination :total>
 *   ⑨ 用户点击 <el-pagination> 跳页
 *   ⑩ @current-change → 直接绑 load(page) 触发请求
 *   ⑪ 回到 ③ 循环
 *
 * 错误链(任一步骤抛错): ApiError(code,msg) → catch → ElMessage.error(`[${code}] ${msg}`)
 *
 * 模块特有: 7 列展示(含 status 用 el-tag 按 BidNoticeStatus 映射颜色);
 * createdAt 用 formatTime 处理 ISO-8601 字符串;
 * pageSize=10 固定(覆盖 BE 默认)。
 *
 * ─── Class hierarchy ───
 *   const rows        = ref<InvitationForBid[]>([])         // 当前页数据
 *   const total       = ref(0)                              // 总记录数
 *   const currentPage = ref(1)                              // 当前页号
 *   const pageSize    = 10                                  // 常量(不开放)
 *   const loading     = ref(false)                          // v-loading 状态
 *   const statusDialogVisible = ref(false)                  // 状态修改弹窗开关
 *   const statusTarget        = ref<InvitationForBid|null>(null)  // 当前编辑目标行
 *   const selectedStatus      = ref<BidNoticeStatus>('DRAFT') // 弹窗内下拉选中值
 *   const statusSubmitting    = ref(false)                  // 弹窗提交中标志
 *   const allStatuses: BidNoticeStatus[]                     // 弹窗下拉枚举项
 *   function load(page)             // 触发分页请求(直接绑 el-pagination)
 *   function onEdit(row)            // 跳转编辑页
 *   function onChangeStatus(row)    // 打开状态修改弹窗(填入目标与初始值)
 *   function onStatusCancel()       // 关闭弹窗并清理
 *   function onStatusConfirm()      // 提交新状态,关闭并 reload 当前页
 *   - exports: 无
 *   - props: 无
 *   - api 依赖: listInvitationForBids(query), updateInvitationForBidStatus(id, status)
 *   - 跨组件导航: useRouter().push() (返回首页 + 跳转编辑页)
 *   - 共享常量: BID_NOTICE_STATUS_TYPE (src/shared/utils/el-tag.ts)
 *   - 共享工具: formatTime (src/shared/utils/format.ts)
 *
 * ─── Style dependencies ───
 *   - global (style.css): .page / .page-header / .page-title / .page-actions / .page-pagination
 *   - scoped (本文件 owns): 无
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api/http'
import { listInvitationForBids, updateInvitationForBidStatus } from '@/api/invitation-for-bid'
import type { BidNoticeStatus, InvitationForBid } from '@/types/invitation-for-bid'
import { BID_NOTICE_STATUS_TYPE } from '@/shared/utils/el-tag'
import { formatTime } from '@/shared/utils/format'

const router = useRouter()

// ——— 状态机 ———
const rows = ref<InvitationForBid[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 10                 // 固定,不开放
const loading = ref(false)

// ——— 状态修改弹窗 ———
const statusDialogVisible = ref(false)
const statusTarget = ref<InvitationForBid | null>(null)
const selectedStatus = ref<BidNoticeStatus>('DRAFT')
const statusSubmitting = ref(false)

// 全部可选状态(用于下拉)
const allStatuses: BidNoticeStatus[] = ['DRAFT', 'PUBLISHED', 'CLOSED', 'AWARDED', 'CANCELLED']

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

// ——— 编辑按钮:跳转到编辑页 ———
function onEdit(row: InvitationForBid) {
  router.push(`/purchaser/invitation/edit/${row.invitationId}`)
}

// ——— 修改状态按钮:打开弹窗 ———
function onChangeStatus(row: InvitationForBid) {
  statusTarget.value = row
  selectedStatus.value = row.status ?? 'DRAFT'
  statusDialogVisible.value = true
}

// ——— 状态弹窗取消 ———
function onStatusCancel() {
  statusDialogVisible.value = false
  statusTarget.value = null
}

// ——— 状态弹窗确认 ———
async function onStatusConfirm() {
  if (!statusTarget.value) return
  const targetId = statusTarget.value.invitationId
  const newStatus = selectedStatus.value
  statusSubmitting.value = true
  try {
    await updateInvitationForBidStatus(targetId, newStatus)
    ElMessage.success(`ID=${targetId} 状态已更新为 ${newStatus}`)
    statusDialogVisible.value = false
    statusTarget.value = null
    // 刷新当前页
    await load(currentPage.value)
  } catch (e) {
    const msg = e instanceof ApiError
        ? `[${e.code}] ${e.message}`
        : `请求失败: ${(e as Error)?.message ?? String(e)}`
    ElMessage.error(msg)
  } finally {
    statusSubmitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">招标公告列表</h2>
      <div class="page-actions">
        <el-button @click="router.push('/')">← 返回首页</el-button>
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
          <el-tag v-if="row.status" :type="BID_NOTICE_STATUS_TYPE[row.status] ?? 'info'" disable-transitions>
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

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }: { row: InvitationForBid }">
          <el-button size="small" type="primary" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="warning" @click="onChangeStatus(row)">修改状态</el-button>
        </template>
      </el-table-column>
    </el-table>

        <div class="page-pagination">
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
                @current-change="load"
            />
        </div>

        <!-- 状态修改弹窗 -->
        <el-dialog
            v-model="statusDialogVisible"
            title="修改公告状态"
            width="420px"
            @close="onStatusCancel"
        >
            <div v-if="statusTarget" style="padding: 0 8px;">
                <p style="margin: 0 0 12px; color: #606266;">
                    公告 ID: <strong>{{ statusTarget.invitationId }}</strong>
                    ，项目编号: <strong>{{ statusTarget.projectNo }}</strong>
                </p>
                <el-form label-width="80px">
                    <el-form-item label="当前状态">
                        <el-tag v-if="statusTarget.status" :type="BID_NOTICE_STATUS_TYPE[statusTarget.status] ?? 'info'" disable-transitions>
                            {{ statusTarget.status }}
                        </el-tag>
                    </el-form-item>
                    <el-form-item label="新状态">
                        <el-select v-model="selectedStatus" style="width: 100%;">
                            <el-option
                                v-for="s in allStatuses"
                                :key="s"
                                :label="s"
                                :value="s"
                            />
                        </el-select>
                    </el-form-item>
                </el-form>
            </div>
            <template #footer>
                <el-button @click="onStatusCancel">取消</el-button>
                <el-button type="primary" :loading="statusSubmitting" @click="onStatusConfirm">
                    {{ statusSubmitting ? '提交中...' : '确认' }}
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>
