/**
 * vue-router 配置(hash 模式)。
 *
 * 模式选择: hash (createWebHashHistory) 而非 history。原因:
 *   - dev/prod 都无需服务器 fallback 配置
 *   - URL 形如 /#/bid-inviter/invitation/list,部署到任意静态托管即可
 *   - 未来若需 history 模式,改 createWebHistory() 即可
 *
 * 路由结构(角色入口分层):
 *   /                              → 角色选择器 (RoleSelector.vue)
 *   /bid-inviter                     → 招标方首页 (BidInviterHome.vue)
 *   /bid-inviter/invitation/*        → 招标公告 (InvitationForBid/*.vue)
 *   /bid-inviter/bid-handler-info/*  → 招标经办人 (BidHandlerInfo/*.vue)
 *   /bid-inviter/bid-record/*        → 投标记录 (BidRecord/*.vue)
 *   /bid-inviter/risk-analysis/list   → 风险分析 (RiskAnalysis/List.vue,只读)
 *   /supplier                      → 投标方首页 (Supplier/Home.vue,1 卡片)
 *   /:pathMatch(.*)*               → 404 页面  (NotFound.vue,不是 redirect)
 *
 * 命名规则:
 *   - URL 前缀对齐角色:bid-inviter(招标方) / supplier(投标方),业务子路径跟在角色下
 *   - 业务子路径对齐模块目录名(kebab-case):
 *     * /bid-inviter/invitation/*      对齐 src/views/bid-inviter/InvitationForBid/ + BE V18 InvitationForBid 实体名
 *     * /bid-inviter/bid-handler-info/* 对齐 src/views/bid-inviter/BidHandlerInfo/
 *     * /bid-inviter/bid-record/*       对齐 src/views/bid-inviter/BidRecord/
 *     * /bid-inviter/risk-analysis/*    对齐 src/views/bid-inviter/RiskAnalysis/
 *
 * 通配路由选择 404 组件而非 redirect 的原因:
 *   - 明确告知用户"资源不存在",而不是假装没事跳到首页
 *   - 显示访问路径方便定位
 *   - 单一出口"返回首页"按钮(品牌跳 / 角色选择器)
 *
 * 未来加投标方业务的姿势: 在 routes 数组追加 /supplier/xxx 路径,
 * Supplier/Home.vue 也可改成嵌套布局(layout + 子路由)。
 *
 * ─── Class hierarchy ───
 *   const routes: RouteRecordRaw[]   // 16 条路由(15 个明确入口 + 1 通配 404)
 *   export const router = createRouter({ history, routes })
 *
 * 关系:
 *   - 路由表 1:1 映射 view 组件:
 *     /                                → common/RoleSelector.vue
 *     /bid-inviter                       → bid-inviter/Home.vue
 *     /bid-inviter/login                 → bid-inviter/Login.vue
 *     /bid-inviter/invitation/{list,create,edit/:id}  → 3 个 view
 *     /bid-inviter/bid-handler-info/{list,create}     → 2 个 view
 *     /bid-inviter/bid-record/list                    → 1 个 view
 *     /bid-inviter/risk-analysis/list                 → 1 个 view
 *     /supplier                           → supplier/Home.vue
 *     /supplier/login                     → supplier/Login.vue
 *     /supplier/invitation/list           → supplier/InvitationList.vue
 *     /supplier/bid-record/create         → supplier/BidRecordCreate.vue
 *     /supplier/my-bids                   → supplier/MyBids.vue
 *     /:pathMatch(.*)*                → common/NotFound.vue
 *
 *   - meta.title: 浏览器 tab 标题(未接入 document.title,保留)
 *   - 路由名: kebab-case,前缀对齐角色
 *
 * 命名约束:
 *   - URL 前缀对齐角色:bid-inviter / supplier
 *   - 业务子路径对齐模块目录名(kebab-case):
 *     /bid-inviter/invitation/*        (URL) ↔  InvitationForBid (BE entity)
 *     /bid-inviter/bid-handler-info/*  ↔  bid-handler-info
 *     /bid-inviter/bid-record/*        ↔  bid-record
 *     /bid-inviter/risk-analysis/*     ↔  risk-analysis
 *
 * 启动入口: src/main.ts → app.use(router)
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'role-selector',
        component: () => import('@/views/common/RoleSelector.vue'),
        meta: { title: '角色选择', breadcrumb: [] },
    },
    {
        path: '/bid-inviter',
        name: 'bid-inviter-home',
        component: () => import('@/views/bid-inviter/Home.vue'),
        meta: {
            title: '招标方首页',
            breadcrumb: [{ label: '招标方入口' }],
        },
    },
    {
        path: '/bid-inviter/login',
        name: 'bid-inviter-login',
        component: () => import('@/views/bid-inviter/Login.vue'),
        meta: {
            title: '招标方登录',
            breadcrumb: [{ label: '招标方入口', path: '/bid-inviter' }],
        },
    },
    {
        path: '/bid-inviter/invitation/list',
        name: 'bid-inviter-invitation-list',
        component: () => import('@/views/bid-inviter/InvitationForBid/List.vue'),
        meta: {
            title: '公告列表',
            breadcrumb: [
                { label: '招标方入口', path: '/bid-inviter' },
                { label: '公告列表' },
            ],
        },
    },
    {
        path: '/bid-inviter/invitation/create',
        name: 'bid-inviter-invitation-create',
        component: () => import('@/views/bid-inviter/InvitationForBid/Create.vue'),
        meta: {
            title: '创建公告',
            breadcrumb: [
                { label: '招标方入口', path: '/bid-inviter' },
                { label: '公告列表', path: '/bid-inviter/invitation/list' },
                { label: '创建公告' },
            ],
        },
    },
    {
        path: '/bid-inviter/invitation/edit/:id',
        name: 'bid-inviter-invitation-edit',
        component: () => import('@/views/bid-inviter/InvitationForBid/Edit.vue'),
        meta: {
            title: '编辑公告',
            breadcrumb: [
                { label: '招标方入口', path: '/bid-inviter' },
                { label: '公告列表', path: '/bid-inviter/invitation/list' },
                { label: '编辑公告' },
            ],
        },
    },
    {
        path: '/bid-inviter/bid-handler-info/list',
        name: 'bid-inviter-bid-handler-info-list',
        component: () => import('@/views/bid-inviter/BidHandlerInfo/List.vue'),
        meta: {
            title: '经办人列表',
            breadcrumb: [
                { label: '招标方入口', path: '/bid-inviter' },
                { label: '经办人列表' },
            ],
        },
    },
    {
        path: '/bid-inviter/bid-handler-info/create',
        name: 'bid-inviter-bid-handler-info-create',
        component: () => import('@/views/bid-inviter/BidHandlerInfo/Create.vue'),
        meta: {
            title: '新建经办人',
            breadcrumb: [
                { label: '招标方入口', path: '/bid-inviter' },
                { label: '经办人列表', path: '/bid-inviter/bid-handler-info/list' },
                { label: '新建经办人' },
            ],
        },
    },
    {
        path: '/bid-inviter/bid-record/list',
        name: 'bid-inviter-bid-record-list',
        component: () => import('@/views/bid-inviter/BidRecord/List.vue'),
        meta: {
            title: '投标列表',
            breadcrumb: [
                { label: '招标方入口', path: '/bid-inviter' },
                { label: '投标列表' },
            ],
        },
    },
    {
        path: '/bid-inviter/risk-analysis/list',
        name: 'bid-inviter-risk-analysis-list',
        component: () => import('@/views/bid-inviter/RiskAnalysis/List.vue'),
        meta: {
            title: '风险分析列表',
            breadcrumb: [
                { label: '招标方入口', path: '/bid-inviter' },
                { label: '风险分析列表' },
            ],
        },
    },
    {
        path: '/supplier',
        name: 'supplier-home',
        component: () => import('@/views/supplier/Home.vue'),
        meta: {
            title: '投标方首页',
            breadcrumb: [{ label: '投标方入口' }],
        },
    },
    {
        path: '/supplier/login',
        name: 'supplier-login',
        component: () => import('@/views/supplier/Login.vue'),
        meta: {
            title: '投标方登录',
            breadcrumb: [{ label: '投标方入口', path: '/supplier' }],
        },
    },
    {
        path: '/supplier/invitation/list',
        name: 'supplier-invitation-list',
        component: () => import('@/views/supplier/InvitationList.vue'),
        meta: {
            title: '项目列表',
            breadcrumb: [
                { label: '投标方入口', path: '/supplier' },
                { label: '项目列表' },
            ],
        },
    },
    {
        path: '/supplier/bid-record/create',
        name: 'supplier-bid-record-create',
        component: () => import('@/views/supplier/BidRecordCreate.vue'),
        meta: {
            title: '投标录入',
            requiresAuth: true,
            breadcrumb: [
                { label: '投标方入口', path: '/supplier' },
                { label: '投标录入' },
            ],
        },
    },
    {
        path: '/supplier/my-bids',
        name: 'supplier-my-bids',
        component: () => import('@/views/supplier/MyBids.vue'),
        meta: {
            title: '我的投标',
            requiresAuth: true,
            breadcrumb: [
                { label: '投标方入口', path: '/supplier' },
                { label: '我的投标' },
            ],
        },
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/common/NotFound.vue'),
        meta: {
            title: '页面不存在',
            breadcrumb: [{ label: '页面不存在' }],
        },
    },
]

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
})

/**
 * 角色路由守卫：
 *  - 招标方页面（/bid-inviter/*，登录页除外）未登录跳 /bid-inviter/login；
 *  - 投标方页面（/supplier/*，登录页除外）未登录跳 /supplier/login；
 *  - 已登录访问对应登录页时直接进入角色首页。
 */
router.beforeEach((to) => {
    const isBidInviterRoute =
        to.path.startsWith('/bid-inviter') && to.path !== '/bid-inviter/login'
    const isSupplierRoute =
        to.path.startsWith('/supplier') && to.path !== '/supplier/login'

    if (isBidInviterRoute && !localStorage.getItem('bidInviterCredentials')) {
        return {
            path: '/bid-inviter/login',
            query: { redirect: to.fullPath },
        }
    }
    if (isSupplierRoute && !localStorage.getItem('bidderCredentials')) {
        return {
            path: '/supplier/login',
            query: { redirect: to.fullPath },
        }
    }
    if (to.path === '/supplier/login'
        && localStorage.getItem('bidderCredentials')) {
        return { path: '/supplier/my-bids' }
    }
    if (to.path === '/bid-inviter/login'
        && localStorage.getItem('bidInviterCredentials')) {
        return { path: '/bid-inviter' }
    }
    return true
})
