<script setup lang="ts">
/**
 * 招标经办人分页列表。
 *
 * usePagedList 统一维护分页、加载和错误状态，当前页按 bid_handler_id 倒序；
 * 前端固定 pageSize=10，覆盖后端默认值 3。页面只负责五列业务字段的展示。
 */
import { onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listBidHandlers } from '@/api/bid-handler-info'
import PageHeader from '@/shared/components/PageHeader.vue'
import { usePagedList } from '@/shared/composables/usePagedList'
import { getErrorMessage } from '@/shared/utils/error'
import type { BidHandlerInfo } from '@/types/bid-handler-info'

const { rows, total, currentPage, pageSize, loading, load } = usePagedList<BidHandlerInfo>({
  fetchPage: listBidHandlers,
  sort: 'bid_handler_id desc',
  onError: (error) => ElMessage.error(getErrorMessage(error)),
})

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="page">
    <PageHeader title="招标经办人列表" back-to="/purchaser" back-label="返回招标方入口" />

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
  </div>
</template>
