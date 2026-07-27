<script setup lang="ts">
/**
 * 投标方可投项目分页列表。
 *
 * 与招标方复用公告查询 API 和 usePagedList，但只暴露查看与“我要投标”。
 * onBid 通过 query 传递 invitationId，投标录入页负责校验并加载公告详情。
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listInvitationForBids } from '@/api/invitation-for-bid'
import PageHeader from '@/shared/components/PageHeader.vue'
import { usePagedList } from '@/shared/composables/usePagedList'
import { getErrorMessage } from '@/shared/utils/error'
import type { InvitationForBid } from '@/types/invitation-for-bid'
import { BID_NOTICE_STATUS_TYPE } from '@/shared/utils/el-tag'
import { formatTime } from '@/shared/utils/format'

const router = useRouter()

const { rows, total, currentPage, pageSize, loading, load } = usePagedList<InvitationForBid>({
  fetchPage: listInvitationForBids,
  sort: 'invitation_id desc',
  onError: (error) => ElMessage.error(getErrorMessage(error)),
})

onMounted(() => {
  void load()
})

// ——— 行内操作:跳转到投标录入(query 传 invitationId) ———
function onBid(row: InvitationForBid) {
  router.push({
    path: '/supplier/bid-record/create',
    query: { invitationId: String(row.invitationId) },
  })
}
</script>

<template>
  <div class="page">
    <PageHeader title="投标项目列表" back-to="/supplier" back-label="返回投标方入口" />

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
