<script setup lang="ts">
/**
 * 投标方"我的投标"页(/supplier/my-bids)。
 *
 * 展示当前登录账号的全部投标记录；支持查看详情、编辑、删除，
 * 详情弹窗内可继续上传资信材料（走登录鉴权接口，归属自动校验）。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    CaretBottom,
    CaretTop,
    Delete,
    Edit,
    FolderOpened,
} from '@element-plus/icons-vue'
import {
    deleteBidderBidRecord,
    getBidderBidRecord,
    listMyBidRecords,
    updateBidderBidRecord,
} from '@/api/bidder-bid-record'
import { useBidderAuth } from '@/composables/useBidderAuth'
import AmountInput from '@/shared/components/AmountInput.vue'
import PageHeader from '@/shared/components/PageHeader.vue'
import { usePersistedSort } from '@/shared/composables/usePersistedSort'
import { getErrorMessage } from '@/shared/utils/error'
import { formatTime, displayOrDash } from '@/shared/utils/format'
import type { BidRecord } from '@/types/bid-record'
import CredentialFileUploadPanel from '@/views/supplier/components/CredentialFileUploadPanel.vue'

const router = useRouter()
const { account, logout } = useBidderAuth()

const records = ref<BidRecord[]>([])
const loading = ref(false)
/** 记录 ID 列排序方向：desc 倒序（默认）/ asc 正序。 */
const sortDirection = usePersistedSort('sort:supplier:my-bids:record-id')

const sortedRecords = computed(() =>
    [...records.value].sort((left, right) =>
        sortDirection.value === 'desc'
            ? right.bidRecordId - left.bidRecordId
            : left.bidRecordId - right.bidRecordId,
    ),
)

function toggleSort() {
    sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
}

// ——— 编辑弹窗 ———
const editVisible = ref(false)
const editSaving = ref(false)
const editingId = ref<number | null>(null)
const editForm = reactive({
    bidderName: '',
    quotePrice: undefined as number | undefined,
    bidderContact: '',
})

// ——— 详情/资信上传弹窗 ———
const detailVisible = ref(false)
const detailRecord = ref<BidRecord | null>(null)

const accountLabel = computed(() => {
    const acc = account.value
    if (!acc) return ''
    return acc.displayName || acc.username
})

async function loadRecords() {
    loading.value = true
    try {
        records.value = await listMyBidRecords()
    } catch (error) {
        ElMessage.error(`加载我的投标失败: ${getErrorMessage(error, '')}`)
    } finally {
        loading.value = false
    }
}

async function onLogout() {
    await logout()
    ElMessage.success('已退出登录')
    await router.replace('/supplier')
}

function openEdit(record: BidRecord) {
    editingId.value = record.bidRecordId
    editForm.bidderName = record.bidderName
    editForm.quotePrice = Number(record.quotePrice)
    editForm.bidderContact = record.bidderContact
    editVisible.value = true
}

async function saveEdit() {
    if (editingId.value === null || editSaving.value) return
    if (!editForm.bidderName.trim() || editForm.quotePrice == null) {
        ElMessage.warning('投标人名称和报价不能为空')
        return
    }
    editSaving.value = true
    try {
        await updateBidderBidRecord(editingId.value, {
            bidderName: editForm.bidderName.trim(),
            quotePrice: editForm.quotePrice,
            bidderContact: editForm.bidderContact.trim(),
        })
        ElMessage.success('修改成功')
        editVisible.value = false
        await loadRecords()
    } catch (error) {
        ElMessage.error(`修改失败: ${getErrorMessage(error, '')}`)
    } finally {
        editSaving.value = false
    }
}

async function openDetail(record: BidRecord) {
    try {
        detailRecord.value = await getBidderBidRecord(record.bidRecordId)
        detailVisible.value = true
    } catch (error) {
        ElMessage.error(`加载详情失败: ${getErrorMessage(error, '')}`)
    }
}

function openEditFromDetail() {
    if (!detailRecord.value) return
    detailVisible.value = false
    openEdit(detailRecord.value)
}

async function remove(record: BidRecord) {
    try {
        await ElMessageBox.confirm(
            `确定删除“${record.bidderName}”的投标记录吗？删除后无法恢复。`,
            '删除投标记录',
            {
                type: 'warning',
                confirmButtonText: '删除',
                cancelButtonText: '取消',
            }
        )
    } catch {
        return
    }
    try {
        await deleteBidderBidRecord(record.bidRecordId)
        ElMessage.success('删除成功')
        await loadRecords()
    } catch (error) {
        ElMessage.error(`删除失败: ${getErrorMessage(error, '')}`)
    }
}

onMounted(loadRecords)
</script>

<template>
  <div class="page">
    <PageHeader title="我的投标" :back-to="'/supplier'" back-label="返回首页">
      <template #actions>
        <span class="account-badge">{{ accountLabel }}</span>
        <el-button @click="onLogout">退出登录</el-button>
      </template>
    </PageHeader>

    <el-card class="page-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="sortedRecords"
        empty-text="还没有投标记录，去项目列表投标吧"
        stripe
        class="clickable-table"
        @row-click="openDetail"
      >
        <el-table-column prop="bidRecordId" width="90">
          <template #header>
            <div class="column-header">
              记录 ID
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
        <el-table-column prop="invitationId" label="公告 ID" width="90" />
        <el-table-column prop="bidNo" label="投标次序" width="90" />
        <el-table-column prop="bidderName" label="投标人名称" min-width="160" />
        <el-table-column label="报价" width="120">
          <template #default="{ row }">
            ¥{{ Number(row.quotePrice).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="投标时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.bidAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" :icon="Delete" @click.stop="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 修改弹窗 -->
    <el-dialog
      v-model="editVisible"
      title="修改投标记录"
      width="480px"
      destroy-on-close
    >
      <el-form :model="editForm" label-position="top">
        <el-form-item label="投标人名称" required>
          <el-input v-model="editForm.bidderName" maxlength="100" />
        </el-form-item>
        <el-form-item label="报价" required>
          <AmountInput
            v-model="editForm.quotePrice"
            placeholder="请输入报价"
          />
        </el-form-item>
        <el-form-item label="联系方式" required>
          <el-input v-model="editForm.bidderContact" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="saveEdit">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情 + 资信材料弹窗 -->
    <el-dialog
      v-model="detailVisible"
      :title="`投标详情（记录 ${detailRecord?.bidRecordId ?? ''}）`"
      width="860px"
      top="0"
      destroy-on-close
    >
      <el-descriptions v-if="detailRecord" :column="2" border>
        <el-descriptions-item label="投标人名称">
          {{ detailRecord.bidderName }}
        </el-descriptions-item>
        <el-descriptions-item label="投标次序">
          {{ detailRecord.bidNo }}
        </el-descriptions-item>
        <el-descriptions-item label="报价">
          ¥{{ Number(detailRecord.quotePrice).toLocaleString() }}
        </el-descriptions-item>
        <el-descriptions-item label="投标时间">
          {{ formatTime(detailRecord.bidAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="联系方式" :span="2">
          {{ displayOrDash(detailRecord.bidderContact) }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="detailRecord" class="credential-section">
        <div class="credential-title">
          <span class="credential-title-icon">
            <el-icon><FolderOpened /></el-icon>
          </span>
          资信材料
        </div>
        <CredentialFileUploadPanel
          :bid-record-id="detailRecord.bidRecordId"
          embedded
        />
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" :icon="Edit" @click="openEditFromDetail">
          修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.account-badge {
  margin-right: 8px;
  color: var(--lc-text-secondary);
  font-size: 13px;
}
.credential-section {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--lc-border);
}

.credential-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 650;
  color: var(--lc-text);
}

.credential-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--lc-accent-soft);
  color: var(--lc-accent);
  font-size: 16px;
  flex-shrink: 0;
}
</style>
