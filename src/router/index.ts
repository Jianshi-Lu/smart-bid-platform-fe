/**
 * vue-router 配置(hash 模式)。
 *
 * 模式选择: hash (createWebHashHistory) 而非 history。原因:
 *   - dev/prod 都无需服务器 fallback 配置
 *   - URL 形如 /#/list,部署到任意静态托管即可
 *   - 未来若需 history 模式,改 createWebHistory() 即可
 *
 * 路由表(3 条 + 1 通配):
 *   /                  → redirect /list
 *   /list              → 招标公告列表 (InvitationForBid/List.vue)
 *   /create            → 创建公告   (InvitationForBid/Create.vue)
 *   /:pathMatch(.*)*   → redirect /list (兜底)
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    { path: '/', redirect: '/list' },
    {
        path: '/list',
        name: 'list',
        component: () => import('@/views/InvitationForBid/List.vue'),
        meta: { title: '公告列表' },
    },
    {
        path: '/create',
        name: 'create',
        component: () => import('@/views/InvitationForBid/Create.vue'),
        meta: { title: '创建公告' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/list' },
]

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
})