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