/**
 * vue-router 配置(hash 模式)。
 *
 * 模式选择: hash (createWebHashHistory) 而非 history。原因:
 *   - dev/prod 都无需服务器 fallback 配置
 *   - URL 形如 /#/purchaser/invitation/list,部署到任意静态托管即可
 *   - 未来若需 history 模式,改 createWebHistory() 即可
 *
 * 路由结构(角色入口分层):
 *   /                              → 角色选择器 (RoleSelector.vue)
 *   /purchaser                     → 招标方首页 (PurchaserHome.vue)
 *   /purchaser/invitation/*        → 招标公告 (InvitationForBid/*.vue)
 *   /purchaser/bid-handler-info/*  → 招标经办人 (BidHandlerInfo/*.vue)
 *   /purchaser/bid-record/*        → 投标记录 (BidRecord/*.vue)
 *   /purchaser/risk-analysis/list   → 风险分析 (RiskAnalysis/List.vue,只读)
 *   /supplier                      → 投标方首页 (Supplier/Home.vue,1 卡片)
 *   /:pathMatch(.*)*               → 404 页面  (NotFound.vue,不是 redirect)
 *
 * 命名规则:
 *   - URL 前缀对齐角色:purchaser(招标方) / supplier(投标方),业务子路径跟在角色下
 *   - 业务子路径对齐模块目录名(kebab-case):
 *     * /purchaser/invitation/*      对齐 src/views/purchaser/InvitationForBid/ + BE V18 InvitationForBid 实体名
 *     * /purchaser/bid-handler-info/* 对齐 src/views/purchaser/BidHandlerInfo/
 *     * /purchaser/bid-record/*       对齐 src/views/purchaser/BidRecord/
 *     * /purchaser/risk-analysis/*    对齐 src/views/purchaser/RiskAnalysis/
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
 *   const routes: RouteRecordRaw[]   // 14 条路由(13 个明确入口 + 1 通配 404)
 *   export const router = createRouter({ history, routes })
 *
 * 关系:
 *   - 路由表 1:1 映射 view 组件:
 *     /                                → common/RoleSelector.vue
 *     /purchaser                       → purchaser/Home.vue
 *     /purchaser/invitation/{list,create,edit/:id}  → 3 个 view
 *     /purchaser/bid-handler-info/{list,create}     → 2 个 view
 *     /purchaser/bid-record/{list,create}           → 2 个 view
 *     /purchaser/risk-analysis/list                 → 1 个 view
 *     /supplier                       → supplier/Home.vue
 *     /supplier/invitation/list       → supplier/InvitationList.vue
 *     /supplier/bid-record/create     → supplier/BidRecordCreate.vue
 *     /:pathMatch(.*)*                → common/NotFound.vue
 *
 *   - meta.title: 浏览器 tab 标题(未接入 document.title,保留)
 *   - 路由名: kebab-case,前缀对齐角色
 *
 * 命名约束:
 *   - URL 前缀对齐角色:purchaser / supplier
 *   - 业务子路径对齐模块目录名(kebab-case):
 *     /purchaser/invitation/*        (URL) ↔  InvitationForBid (BE entity)
 *     /purchaser/bid-handler-info/*  ↔  bid-handler-info
 *     /purchaser/bid-record/*        ↔  bid-record
 *     /purchaser/risk-analysis/*     ↔  risk-analysis
 *
 * 启动入口: src/main.ts → app.use(router)
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'role-selector',
        component: () => import('@/views/common/RoleSelector.vue'),
        meta: { title: '角色选择' },
    },
    {
        path: '/purchaser',
        name: 'purchaser-home',
        component: () => import('@/views/purchaser/Home.vue'),
        meta: { title: '招标方首页' },
    },
    {
        path: '/purchaser/invitation/list',
        name: 'purchaser-invitation-list',
        component: () => import('@/views/purchaser/InvitationForBid/List.vue'),
        meta: { title: '公告列表' },
    },
    {
        path: '/purchaser/invitation/create',
        name: 'purchaser-invitation-create',
        component: () => import('@/views/purchaser/InvitationForBid/Create.vue'),
        meta: { title: '创建公告' },
    },
    {
        path: '/purchaser/invitation/edit/:id',
        name: 'purchaser-invitation-edit',
        component: () => import('@/views/purchaser/InvitationForBid/Edit.vue'),
        meta: { title: '编辑公告' },
    },
    {
        path: '/purchaser/bid-handler-info/list',
        name: 'purchaser-bid-handler-info-list',
        component: () => import('@/views/purchaser/BidHandlerInfo/List.vue'),
        meta: { title: '经办人列表' },
    },
    {
        path: '/purchaser/bid-handler-info/create',
        name: 'purchaser-bid-handler-info-create',
        component: () => import('@/views/purchaser/BidHandlerInfo/Create.vue'),
        meta: { title: '新建经办人' },
    },
    {
        path: '/purchaser/bid-record/list',
        name: 'purchaser-bid-record-list',
        component: () => import('@/views/purchaser/BidRecord/List.vue'),
        meta: { title: '投标列表' },
    },
    {
        path: '/purchaser/bid-record/create',
        name: 'purchaser-bid-record-create',
        component: () => import('@/views/purchaser/BidRecord/Create.vue'),
        meta: { title: '新建投标' },
    },
    {
        path: '/purchaser/risk-analysis/list',
        name: 'purchaser-risk-analysis-list',
        component: () => import('@/views/purchaser/RiskAnalysis/List.vue'),
        meta: { title: '风险分析列表' },
    },
    {
        path: '/supplier',
        name: 'supplier-home',
        component: () => import('@/views/supplier/Home.vue'),
        meta: { title: '投标方首页' },
    },
    {
        path: '/supplier/invitation/list',
        name: 'supplier-invitation-list',
        component: () => import('@/views/supplier/InvitationList.vue'),
        meta: { title: '投标项目列表' },
    },
    {
        path: '/supplier/bid-record/create',
        name: 'supplier-bid-record-create',
        component: () => import('@/views/supplier/BidRecordCreate.vue'),
        meta: { title: '投标录入' },
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/common/NotFound.vue'),
        meta: { title: '页面不存在' },
    },
]

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
})
