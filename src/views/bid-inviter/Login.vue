<script setup lang="ts">
/**
 * 招标方登录/注册页(/bid-inviter/login)。
 *
 * 与投标方登录页对称：登录成功后保存会话并跳转 redirect 参数指定页面（默认招标方首页）。
 * 初始管理员账号由后端预置：admin / admin。
 */
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import {
    loginBidInviterAccount,
    registerBidInviterAccount,
} from '@/api/bid-inviter-account'
import { useBidInviterAuth } from '@/composables/useBidInviterAuth'
import { getErrorMessage } from '@/shared/utils/error'

const route = useRoute()
const router = useRouter()
const { setSession } = useBidInviterAuth()

type Mode = 'login' | 'register'

const mode = ref<Mode>('login')
const submitting = ref(false)

const form = reactive({
    username: '',
    password: '',
    phone: '',
    displayName: '',
})

function toggleMode(next: Mode) {
    mode.value = next
}

function resolveRedirect(): string {
    const redirect = route.query.redirect
    return typeof redirect === 'string' && redirect.startsWith('/bid-inviter')
        ? redirect
        : '/bid-inviter'
}

async function onSubmit() {
    if (submitting.value) return
    const username = form.username.trim()
    if (!username || !form.password) {
        ElMessage.warning('请输入账号和密码')
        return
    }
    if (mode.value === 'register' && form.password.length < 6) {
        ElMessage.warning('密码长度至少 6 位')
        return
    }

    submitting.value = true
    try {
        if (mode.value === 'register') {
            await registerBidInviterAccount({
                username,
                password: form.password,
                phone: form.phone.trim() || undefined,
                displayName: form.displayName.trim() || undefined,
            })
            ElMessage.success('注册成功，请登录')
            mode.value = 'login'
            form.password = ''
            return
        }

        const session = await loginBidInviterAccount({
            username,
            password: form.password,
        })
        setSession(session, form.password)
        ElMessage.success('登录成功')
        await router.replace(resolveRedirect())
    } catch (error) {
        ElMessage.error(getErrorMessage(error, '操作失败'))
    } finally {
        submitting.value = false
    }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <div class="login-header">
        <h2>{{ mode === 'login' ? '招标方登录' : '注册招标方账号' }}</h2>
        <p class="login-subtitle">
          {{ mode === 'login' ? '登录后管理公告、投标记录与风险分析' : '初始管理员账号：admin / admin' }}
        </p>
      </div>

      <el-form
        :model="form"
        label-position="top"
        @submit.prevent="onSubmit"
      >
        <el-form-item label="账号名" required>
          <el-input
            v-model="form.username"
            :prefix-icon="User"
            placeholder="请输入账号名"
            maxlength="64"
            autocomplete="username"
          />
        </el-form-item>

        <el-form-item v-if="mode === 'register'" label="显示名称（可选）">
          <el-input
            v-model="form.displayName"
            placeholder="例如：平台管理员"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item v-if="mode === 'register'" label="手机号（可选）">
          <el-input
            v-model="form.phone"
            placeholder="用于联系管理员"
            maxlength="20"
          />
        </el-form-item>

        <el-form-item label="密码" required>
          <el-input
            v-model="form.password"
            :prefix-icon="Lock"
            type="password"
            show-password
            :placeholder="mode === 'register' ? '至少 6 位' : '请输入密码'"
            maxlength="64"
            autocomplete="current-password"
            @keyup.enter="onSubmit"
          />
        </el-form-item>

        <el-button
          class="login-submit"
          type="primary"
          :loading="submitting"
          @click="onSubmit"
        >
          {{ mode === 'login' ? '登录' : '注册' }}
        </el-button>
      </el-form>

      <div class="login-switch">
        <el-button
          v-if="mode === 'login'"
          link
          type="primary"
          @click="toggleMode('register')"
        >
          没有账号？注册
        </el-button>
        <el-button
          v-else
          link
          type="primary"
          @click="toggleMode('login')"
        >
          已有账号？登录
        </el-button>
      </div>
    </el-card>

    <div class="login-back">
      <el-button link @click="router.push('/')">
        返回角色选择
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  max-width: 420px;
  margin: 0 auto;
  padding: 48px 16px 32px;
}
.login-card {
  border: 1px solid var(--lc-border);
  border-radius: var(--lc-radius-xl);
  background: var(--lc-surface);
  box-shadow: var(--lc-shadow-md);
}
.login-header {
  margin-bottom: 20px;
  text-align: center;
}
.login-header h2 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 650;
  color: var(--lc-text);
}
.login-subtitle {
  margin: 0;
  color: var(--lc-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
.login-submit {
  width: 100%;
  margin-top: 4px;
}
.login-switch {
  margin-top: 12px;
  text-align: center;
}
.login-back {
  margin-top: 16px;
  text-align: center;
}
</style>
