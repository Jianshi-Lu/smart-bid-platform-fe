/**
 * vue-router 配置(hash 模式)。
 *
 * 模式选择: hash (createWebHashHistory) 而非 history。原因:
 *   - dev/prod 都无需服务器 fallback 配置
 *   - URL 形如 /#/list,部署到任意静态托管即可
 *   - 未来若需 history 模式,改 createWebHistory() 即可
 *
 * 路由表(3 条 + 1 通配):
 *   /                  → 首页       (Home.vue)
 *   /list              → 公告列表   (InvitationForBid/List.vue)
 *   /create            → 创建公告   (InvitationForBid/Create.vue)
 *   /:pathMatch(.*)*   → 404 页面  (NotFound.vue,不是 redirect)
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
