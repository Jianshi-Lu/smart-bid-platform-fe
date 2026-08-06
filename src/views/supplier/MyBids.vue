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
import { Delete, Edit, FolderOpened, View } from '@element-plus/icons-vue'
import {
    deleteBidderBidRecord,
    getBidderBidRecord,
    listMyBidRecords,
    updateBidderBidRecord,
} from '@/api/bidder-bid-record'
import { useBidderAuth } from '@/composables/useBidderAuth'
import PageHeader from '@/shared/components/PageHeader.vue'
import CredentialFileUpload from '@/shared/components/CredentialFileUpload.vue'
import { getErrorMessage } from '@/shared/utils/error'
import { formatTime, displayOrDash } from '@/shared/utils/format'
import type { BidRecord } from '@/types/bid-record'

const router = useRouter()
const { account, logout } = useBidderAuth()

const records = ref<BidRecord[]>([])
const loading = ref(false)

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
    if (!editForm.bidderName.trim() || editForm.quotePrice === undefined) {
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
        :data="records"
        empty-text="还没有投标记录，去投标项目列表投标吧"
        stripe
      >
        <el-table-column prop="bidRecordId" label="记录 ID" width="90" />
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
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" @click="openDetail(row)">
              详情
            </el-button>
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)">
              修改
            </el-button>
            <el-button link type="danger" :icon="Delete" @click="remove(row)">
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
          <el-input-number
            v-model="editForm.quotePrice"
            :min="0"
            :precision="2"
            :step="1000"
            controls-position="right"
            style="width: 100%"
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
      width="640px"
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
          <el-icon><FolderOpened /></el-icon>
          资信材料
        </div>
        <CredentialFileUpload
          :bid-record-id="detailRecord.bidRecordId"
          bidder-mode
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html"
        />
      </div>
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
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--lc-border);
}
.credential-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--lc-text);
}
</style>
