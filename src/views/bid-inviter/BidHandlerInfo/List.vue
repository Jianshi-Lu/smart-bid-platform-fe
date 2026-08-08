<script setup lang="ts">
/**
 * 招标经办人分页列表。
 *
 * usePagedList 统一维护分页、加载和错误状态，当前页按 bid_handler_id 倒序；
 * 前端固定 pageSize=10，覆盖后端默认值 3。页面只负责五列业务字段的展示。
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CaretBottom, CaretTop, Plus } from '@element-plus/icons-vue'
import { listBidHandlers } from '@/api/bid-handler-info'
import PageHeader from '@/shared/components/PageHeader.vue'
import DetailDialog, { type DetailField } from '@/shared/components/DetailDialog.vue'
import { usePagedList } from '@/shared/composables/usePagedList'
import { usePersistedSort } from '@/shared/composables/usePersistedSort'
import { getErrorMessage } from '@/shared/utils/error'
import type { BidHandlerInfo } from '@/types/bid-handler-info'

const router = useRouter()

/** ID 列排序方向：desc 倒序（默认）/ asc 正序。 */
const sortDirection = usePersistedSort('sort:bid-inviter:bid-handler-info:id')

function toggleSort() {
  sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
  void load(1)
}

const { rows, total, currentPage, pageSize, loading, load } = usePagedList<BidHandlerInfo>({
  fetchPage: listBidHandlers,
  sort: () => `bid_handler_id ${sortDirection.value}`,
  onError: (error) => ElMessage.error(getErrorMessage(error)),
})

// ——— 行详情弹窗 ———
const detailVisible = ref(false)
const detailRow = ref<BidHandlerInfo | null>(null)

function openDetail(row: BidHandlerInfo) {
  detailRow.value = row
  detailVisible.value = true
}

// ——— 新建经办人:从列表底部进入创建页 ———
function goCreate() {
  router.push('/bid-inviter/bid-handler-info/create')
}

function detailFields(row: BidHandlerInfo): DetailField[] {
  return [
    { label: '经办人 ID', value: row.bidHandlerId },
    { label: '经办人姓名', value: row.handlerName },
    { label: '所属公司', value: row.companyName },
    { label: '所属部门', value: row.departmentName },
    { label: '通知邮箱', value: row.targetEmail },
  ]
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="page">
    <PageHeader title="招标经办人列表" back-to="/bid-inviter" back-label="返回招标方入口" />

    <el-table
        v-loading="loading"
        :data="rows"
        border
        stripe
        class="clickable-table"
        @row-click="openDetail"
        style="width: 100%"
    >
      <template #empty>
        <el-empty description="暂无经办人数据" />
      </template>

      <el-table-column prop="bidHandlerId" width="80">
        <template #header>
          <div class="column-header">
            ID
            <el-button
              class="sort-toggle"
              text
              size="small"
              :icon="sortDirection === 'desc' ? CaretBottom : CaretTop"
              :title="sortDirection === 'desc' ? '当前倒序，点击切换正序' : '当前正序，点击切换倒序'"
              @click.stop="toggleSort"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="handlerName" label="经办人姓名" min-width="120" show-overflow-tooltip />
      <el-table-column prop="companyName" label="所属公司" min-width="180" show-overflow-tooltip />
      <el-table-column prop="departmentName" label="所属部门" min-width="160" show-overflow-tooltip />
      <el-table-column prop="targetEmail" label="通知邮箱" min-width="220" show-overflow-tooltip />
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

    <div class="list-bottom-actions">
      <el-button type="primary" :icon="Plus" @click="goCreate">
        新建经办人
      </el-button>
    </div>

    <!-- 行详情弹窗 -->
    <DetailDialog
        v-model="detailVisible"
        :title="`经办人详情 #${detailRow?.bidHandlerId ?? ''}`"
        :fields="detailRow ? detailFields(detailRow) : []"
    />
  </div>
</template>

<style scoped>
.list-bottom-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
