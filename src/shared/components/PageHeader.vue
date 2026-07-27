<script setup lang="ts">
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  title: string
  backTo?: RouteLocationRaw
  backLabel?: string
}>(), {
  backLabel: '返回',
})

const router = useRouter()

function goBack() {
  if (props.backTo) void router.push(props.backTo)
}
</script>

<template>
  <header class="page-header">
    <h2 class="page-title">{{ title }}</h2>
    <div class="page-actions">
      <slot name="actions" />
      <el-button v-if="backTo" :icon="ArrowLeft" @click="goBack">
        {{ backLabel }}
      </el-button>
    </div>
  </header>
</template>
