/**
 * vue-router 配置(hash 模式)。
 *
 * 模式选择: hash (createWebHashHistory) 而非 history。原因:
 *   - dev/prod 都无需服务器 fallback 配置
 *   - URL 形如 /#/invitation/list,部署到任意静态托管即可
 *   - 未来若需 history 模式,改 createWebHistory() 即可
 *
 * 路由表(8 条 + 1 通配):
 *   /                              → 首页       (Home.vue)
 *   /invitation/list               → 公告列表   (InvitationForBid/List.vue)
 *   /invitation/create             → 创建公告   (InvitationForBid/Create.vue)
 *   /bid-handler-info/list         → 经办人列表 (BidHandlerInfo/List.vue)
 *   /bid-handler-info/create       → 新建经办人 (BidHandlerInfo/Create.vue)
 *   /bid-record/list               → 投标列表   (BidRecord/List.vue)
 *   /bid-record/create             → 新建投标   (BidRecord/Create.vue)
 *   /risk-analysis/list            → 风险分析列表 (RiskAnalysis/List.vue,只读)
 *   /:pathMatch(.*)*               → 404 页面  (NotFound.vue,不是 redirect)
 *
 * 命名规则: 每个模块的 URL 前缀对齐模块目录名(kebab-case):
 *   - invitation: 对齐 BE V18 实体名 InvitationForBid
 *   - bid-handler-info: 对齐 src/modules/bid-handler-info/ 目录名
 *   - bid-record: 对齐 src/modules/bid-record/ 目录名
 *   - risk-analysis: 对齐 BE 独立 RiskAnalysisController,只读入口(无 create/edit/delete)
 *
 * 通配路由选择 404 组件而非 redirect 的原因:
 *   - 明确告知用户"资源不存在",而不是假装没事跳到首页
 *   - 显示访问路径方便定位
 *   - 单一出口"返回首页"按钮
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' },
    },
    {
        path: '/invitation/list',
        name: 'invitation-list',
        component: () => import('@/views/InvitationForBid/List.vue'),
        meta: { title: '公告列表' },
    },
    {
        path: '/invitation/create',
        name: 'invitation-create',
        component: () => import('@/views/InvitationForBid/Create.vue'),
        meta: { title: '创建公告' },
    },
    {
        path: '/bid-handler-info/list',
        name: 'bid-handler-info-list',
        component: () => import('@/views/BidHandlerInfo/List.vue'),
        meta: { title: '经办人列表' },
    },
    {
        path: '/bid-handler-info/create',
        name: 'bid-handler-info-create',
        component: () => import('@/views/BidHandlerInfo/Create.vue'),
        meta: { title: '新建经办人' },
    },
    {
        path: '/bid-record/list',
        name: 'bid-record-list',
        component: () => import('@/views/BidRecord/List.vue'),
        meta: { title: '投标列表' },
    },
    {
        path: '/bid-record/create',
        name: 'bid-record-create',
        component: () => import('@/views/BidRecord/Create.vue'),
        meta: { title: '新建投标' },
    },
    {
        path: '/risk-analysis/list',
        name: 'risk-analysis-list',
        component: () => import('@/views/RiskAnalysis/List.vue'),
        meta: { title: '风险分析列表' },
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFound.vue'),
        meta: { title: '页面不存在' },
    },
]

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
})
