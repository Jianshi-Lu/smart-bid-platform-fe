# smart-bid-platform-fe Agent Guide

## 1. 项目定位与边界

这是政府采购/中标管理平台的 Vue 3 前端 SPA，负责角色入口、页面交互、表单、分页列表、资信文件选择上传和风险分析结果展示。

前端不是业务事实源，也不直接连接 MySQL、MinIO 或 Python 服务：

```text
浏览器
  ↓
Vue 页面 / API 模块
  ↓ Vite 开发代理
Java 后端 http://localhost:8080
  ├── MySQL
  ├── Local/MinIO 文件存储
  ├── Python 文件转换/知识采集服务
  └── OpenAI 兼容模型服务
```

当前使用演示级 HTTP Basic 鉴权：浏览器按角色把账号凭据保存在 localStorage，请求由
`src/api/http.ts` 注入 Authorization，Java 后端仍是最终鉴权边界。没有租户隔离、RBAC
或 Pinia 全局状态。不要在前端自行复制后端业务规则；尤其不要自行生成 `bidNo`、`bidAt`、文件路径或风险分析结果。

## 2. 技术栈与开发命令

以 `package.json` 和锁文件为准：

| 技术 | 当前版本/用途 |
|---|---|
| Vue | `^3.5.39`，SFC 与响应式 UI |
| TypeScript | `~6.0.2` |
| Vite | `^8.1.1`，开发服务器、HMR、生产构建 |
| vue-router | `^5.1.0`，Hash History |
| Axios | `^1.18.1`，统一 HTTP 实例在 `src/api/http.ts` |
| Element Plus | `^2.14.2`，全局注册 |
| Vitest | `^4.1.10`，测试运行器 |

```bash
npm install                 # 按 package-lock.json 安装
npm run dev                 # Vite 开发服务器，默认 http://localhost:5173
npm run build               # vue-tsc -b 通过后执行 vite build，产物 dist/
npm run preview             # 预览 dist/
npm test                    # vitest run
```

当前工作区没有测试文件，`npm test` 会因 `No test files found` 返回失败；新增测试后再恢复为有效校验入口。`npm run build` 当前可以通过，但 Vite/Rolldown 可能对第三方依赖的 pure annotation 和大 chunk 输出警告，这些不是业务代码错误。

构建规则来自：

- `tsconfig.json`：项目入口，references `tsconfig.app.json` 和 `tsconfig.node.json`。
- `tsconfig.app.json`：校验 `src/**/*.ts`、`src/**/*.vue`；使用 `@/* -> src/*`，开启未使用变量、未使用参数和 switch fallthrough 检查。
- `tsconfig.node.json`：校验 `vite.config.ts`。
- `vite.config.ts`：Vite 插件、`@` 别名、开发端口和后端代理。

## 3. 目录职责与依赖方向

```text
src/
├── api/                       HTTP 基础设施和业务 API 封装
│   ├── http.ts                Axios 实例、响应错误归一化
│   ├── invitation-for-bid.ts  招标公告 API
│   ├── bid-handler-info.ts    招标经办人 API
│   ├── bid-record.ts          投标记录 CRUD/风险分析触发 API
│   ├── risk-analysis.ts       风险分析历史查询 API
│   ├── bidder-bid-record.ts   投标方记录 CRUD 与资信上传 API
│   └── credential-file.ts     资信文件列表/删除/下载/SSE API
├── types/                     与 Java DTO/响应字段对齐的 TypeScript 类型
├── views/
│   ├── common/                角色选择、404
│   ├── bid-inviter/           招标方登录、首页及业务模块
│   └── supplier/              投标方首页、项目列表、投标录入
├── shared/
│   ├── components/            PageHeader、FileUploadPanel 等通用组件
│   ├── errors/                ApiError
│   └── utils/                 错误文案、格式化、Element Plus 标签颜色
├── composables/               登录状态与 usePagedList
├── router/index.ts            Hash History 路由表
├── main.ts                    应用启动、插件注册、挂载
├── App.vue                    顶部品牌栏和 router-view
└── style.css                  reset 与 .page* 页面布局类
```

正常依赖方向：

```text
views → api/{module} + types/{module}
      → shared/components / composables / errors / utils
api/{module} → api/http.ts → shared/errors/api-error.ts
```

`api/` 不得引用 `views/`；共享层不得反向依赖具体页面。新增业务页面优先复用 `PageHeader`、`usePagedList`、`getErrorMessage` 和格式化工具，不要在每个页面重新实现分页、HTTP 错误解析或统一布局。

## 4. 路由与角色入口

路由使用 `createWebHashHistory()`，当前 16 条记录：15 个明确入口 + 1 个通配 404。

| 路径 | 页面/职责 |
|---|---|
| `/` | `views/common/RoleSelector.vue`，选择招标方或投标方 |
| `/bid-inviter` / `/bid-inviter/login` | 招标方首页与登录 |
| `/bid-inviter/invitation/{list,create,edit/:id}` | 招标公告页面 |
| `/bid-inviter/bid-handler-info/{list,create}` | 经办人页面 |
| `/bid-inviter/bid-record/list` | 投标记录分页列表，含详情与风险分析入口 |
| `/bid-inviter/risk-analysis/list` | 风险分析历史分页列表，只读 |
| `/supplier` | 投标方首页 |
| `/supplier/login` | 投标方登录 |
| `/supplier/invitation/list` | 投标方查看招标项目并选择投标 |
| `/supplier/bid-record/create?invitationId=N` | 投标方录入投标并在成功后上传资信材料 |
| `/supplier/my-bids` | 当前账号的投标记录与资信材料详情 |
| `/:pathMatch(.*)*` | `NotFound.vue` |

页面采用懒加载 import。固定导航使用 `router-link`，带参数或条件的跳转使用 `useRouter().push/replace`。路由守卫只做本地登录态引导，后端仍需逐请求鉴权。新增角色业务应挂到对应 `/supplier/*` 或 `/bid-inviter/*` 前缀下。

## 5. Java 后端契约与 API 模块

当前前端 API 层按业务、登录、SSE 和下载能力分组；这不是 Java 后端的全部端点。

| 前端模块 | API 函数/端点 | 页面调用方 |
|---|---|---|
| 招标公告 | 创建、分页查询、按 ID 查询、PATCH 部分更新、状态变更，共 5 个：`/invitation-for-bid/*` | 招标方公告页面；投标方项目列表和投标录入复用查询 |
| 招标经办人 | 创建、分页查询，共 2 个：`/bid-handler-info/*` | 招标方经办人页面 |
| 投标记录 | 创建、按 ID 查询、分页查询、`POST /bid-record/analyze-risk/{id}`，共 4 个 | 招标方投标页面；投标方录入复用创建 |
| 风险分析 | `GET /risk-analysis` 分页查询历史，共 1 个 | 招标方风险分析列表 |
| 登录 | `/bidder/auth/*`、`/bid-inviter/auth/*` | 两个登录页和对应 auth composable |
| 资信文件 | `GET/POST /bidder/bid-records/{id}/credential-files`、删除、下载和 SSE | `CredentialFileUploadPanel.vue`（投标录入和我的投标详情共用） |
| 知识文件 | `/knowledge-files` 上传、列表、重试、删除、下载和 SSE | `KnowledgeFileUploadPanel.vue` |
| chat-agent | 会话创建/改名/删除、消息查询和 `POST /chat-agent/chat` | `ChatAgentPanel.vue` |

风险分析按钮位于投标记录 API/页面，但 Java 当前实际由 `RiskAnalysisController` 承载风险分析入口；前端只把它视为同步 HTTP 操作，不直接参与转换、Markdown 汇总或模型调用。

Vite 开发代理把以下前缀转发到 `http://localhost:8080`，浏览器不直接跨域调用后端：

```text
/invitation-for-bid
/bid-handler-info
/bid-record
/risk-analysis
/bidder
/bid-inviter
/credential-files
/knowledge-files
/chat-agent
/service-status
```

生产环境地址、代理部署方式和后端鉴权方式当前未在本仓库配置，属于待确认项。

## 6. 通用响应与错误处理

业务 API 使用 `src/api/http.ts` 导出的 Axios 实例；业务 API 只返回 `Result.data`，页面不需要重复拆 envelope。

当前类型：

```ts
interface Result<T> {
  success: boolean
  code: string | number
  message: string
  data: T
}
```

`http.ts` 的处理顺序：

1. HTTP 2xx 响应若是新版 `Result` 且 `success !== true`，抛出 `ApiError`。
2. 为兼容旧接口，没有 `success` 时把 `code === 200` 或 `code === 'SUCCESS'` 视为成功。
3. HTTP 4xx/5xx 若响应体有 `code/message`，优先使用后端业务码；否则使用 HTTP status 创建 `ApiError`。
4. 网络错误、CORS、超时等没有 `response` 时保留原始异常。

页面和 composable 统一调用：

```ts
catch (error) {
  ElMessage.error(getErrorMessage(error))
}
```

`getErrorMessage` 对 `ApiError` 保留 `[code] message`；普通 `Error` 默认加 `请求失败:`，上传组件可传空前缀避免重复上下文。不要在各页面重新判断 HTTP status 或拼接错误文案。

## 7. 核心数据类型与数据库边界

本仓库没有 SQL、DDL、Mapper 或数据库连接配置。数据库表和实体由 Java 后端维护，前端通过 `src/types/` 镜像后端 DTO/JSON 字段。

| 类型文件 | 关键实体/约束 |
|---|---|
| `types/invitation-for-bid.ts` | `InvitationForBid`；状态为 `DRAFT/PUBLISHED/CLOSED/AWARDED/CANCELLED`；状态变更走独立端点，PATCH 不修改 status |
| `types/bid-handler-info.ts` | `BidHandlerInfo`；字段为经办人姓名、公司、部门、通知邮箱 |
| `types/bid-record.ts` | `BidRecord`；`bidNo`、`bidAt` 由后端生成，创建请求不传；`credentials` 为可选后端管理字段，前端不得拼接路径 |
| `types/credential-file.ts` | 上传批次响应和文件元数据；`convertStatus` 保留字符串，以兼容后端状态扩展 |
| `types/risk-analysis.ts` | `RiskAnalysis`；风险等级 `LOW/MEDIUM/HIGH/CRITICAL`；包含摘要、建议、可选 rawResponse/promptVersion 和分析时间 |
| `types/common.ts` | `Result<T>`、`Diff<T>`、`PageRequest`、PageHelper 的 `PageResult<T>` |

分页请求的 `sort` 使用后端 SQL 列名和方向，例如 `invitation_id desc`、`bid_record_id desc`，不是 TypeScript 属性名。PageHelper 响应按后端实际 JSON 键镜像，特别注意 `navigatepageNums` 的小写 `page`。

## 8. 关键业务流程

### 8.1 招标方 CRUD 与分页

创建/编辑页面用 `reactive` 保存表单，调用对应 `api` 函数；成功后显示后端返回实体或 Diff。前端只做基本 UI 状态和展示格式，字段合法性、状态机、并发冲突由 Java 后端校验。

所有分页页面使用：

```text
onMounted → usePagedList.load()
          → api list function
          → http 拆 Result.data
          → rows / total / currentPage
```

`usePagedList` 为每次请求分配递增 request id。较慢的旧请求返回后不会覆盖新页；只有最新请求可以更新 loading、rows、total 和 currentPage。

### 8.2 投标方投标与资信文件上传

```text
/supplier/invitation/list
  → 选择项目
  → /supplier/bid-record/create?invitationId=N
  → GET /invitation-for-bid/N 加载公告详情
  → POST /bidder/bid-records 创建投标记录
  → 从响应取得 bidRecordId
  → 挂载 CredentialFileUploadPanel.vue
  → POST /bidder/bid-records/{id}/credential-files (multipart)
```

`BidRecordCreate.vue` 在创建成功前不挂载资信上传组件，并在成功后锁定投标表单，避免投标记录 ID 尚未存在或重复创建导致文件归属错误。

`shared/components/FileUploadPanel.vue` 是中性的文件上传与生命周期组件：多选后统一点击
“上传文件”批量提交，每行仅以 X 图标移除尚未上传的文件；列表、详情、下载、可选重试、
删除和 SSE 刷新均由适配器 Props 注入。它不得导入知识文件或资信文件 API，也不得包含
角色、投标记录或知识库业务判断。

业务差异只保留在两个页面级薄适配器中：

- `views/bid-inviter/components/KnowledgeFileUploadPanel.vue` 映射知识文件 API、状态和文案；
- `views/supplier/components/CredentialFileUploadPanel.vue` 映射资信文件 API、投标记录上下文、状态和文案，并同时供 `BidRecordCreate.vue` 与 `MyBids.vue` 使用。

上传 API 仍使用原生 `File[]` 和浏览器生成的 multipart boundary；完整文件元数据必须从列表接口回读。前端不读取绝对路径、不调用 Python，也不假设后端对象存储、转换、向量化或删除的内部实现。

### 8.3 风险分析

```text
招标方投标记录列表点击“风险分析”
  → POST /bid-record/analyze-risk/{bidRecordId}
  → Java 校验投标记录、批次和文件；必要时自动转换
  → Java 汇总 converted Markdown 并调用 OpenAI 兼容模型
  → Java 落库 risk_analysis，返回 RiskAnalysis
  → currentAnalysis → ElDialog 展示
```

前端只负责同步按钮状态和结果展示：

- `analyzingId` 非空时，当前行 loading，其他行 disabled，避免同一页面并行触发多个请求。
- 成功后打开结果弹窗；失败时用统一错误适配器提示，并恢复按钮。
- `rawResponse` 因内容可能较大，列表和结果弹窗默认不展示。
- `RiskAnalysis/List.vue` 只查询历史，不触发分析、不修改记录。

## 9. 重要工程约束

1. 所有后端请求必须经 `src/api/http.ts`，不要在视图中直接创建 Axios 实例。
2. 所有列表优先复用 `usePagedList`；不要复制分页 loading、错误和旧请求保护逻辑。
3. 页面统一使用 `PageHeader` 和 `src/style.css` 的 `.page`、`.page-header`、`.page-card`、`.page-pagination`、`.form-actions` 等布局类；局部样式使用 `<style scoped>`。
4. 使用 `@/` 路径别名，不要用深层相对路径。
5. 后端是字段和校验的唯一信任源。新增或修改 DTO 字段时，先确认 Java DTO/响应，再同步 `src/types/` 和 API 调用。
6. 金额使用 JSON number；时间使用后端 ISO-8601 字符串，展示时通过 `formatTime`/`formatPrice`，不要在 API 层修改实体。
7. `credentials`、`originalFilePath`、`markdownFilePath` 等文件字段只展示或传递后端值；前端不得自行拼接本地绝对路径或假设 MinIO bucket 结构。
8. 资信文件上传必须在有效正整数 `bidRecordId` 已生成后进行；不要在创建投标记录前启用上传组件。
9. 风险等级和公告状态使用联合类型及 `Record<Union, ElementTagType>` 映射；新增后端枚举值时必须同步类型和标签颜色映射，并保留未知值的 UI 兜底。
10. 路由页面使用懒加载；新增路由必须同时更新页面导航、路由 meta title 和相关架构文档。
11. `main.ts` 只负责启动：创建 App、注册 router/Element Plus、加载样式和 mount；不要把业务请求或状态放进去。
12. 不要把后端密码、API Key、Token、邮箱授权码或绝对路径写入前端代码、文档或 `.env` 示例。

## 10. 当前已实现与未完成事项

已实现：

- 招标方角色入口、招标公告 CRUD/状态变更页面。
- 招标经办人创建和分页列表。
- 招标方投标记录创建/分页列表及风险分析按钮。
- 投标方项目分页列表、公告详情确认、投标记录创建。
- 投标记录创建成功后资信文件多选、批量上传、追加批次和删除调用。
- 风险分析历史只读分页列表。
- 统一分页 composable、错误适配、格式化工具和 Element Plus 状态标签。

已知限制/待确认：

- 当前是演示级 Basic Auth；前端路由守卫只做导航，Java 后端才是实际安全边界。没有租户隔离或 RBAC。
- 投标方已具备“我的投标”列表，后端按当前投标方账号过滤。
- 投标方风险分析列表尚未实现。
- 项目列表当前未由前端强制只显示 `PUBLISHED`，也没有列头排序交互，列表排序值通常写死为 ID 倒序。
- 主数据详情页、删除操作集成、经办人/投标记录字段下拉选择尚未完整实现。
- 生产 API 基地址、静态服务器部署、后端鉴权和 CORS/代理生产方案待确认；当前只有 Vite 开发代理到 `localhost:8080`。
- 本仓库没有数据库定义；涉及表结构、状态迁移、文件物理存储、Python 转换或大模型配置时必须查 Java/Python 对应项目，不能仅依据前端类型推断。
- 当前测试目录为空，新增业务逻辑时应补 Vitest 测试，至少覆盖共享 composable、错误归一化和关键表单状态。

## 11. 参考文件

- `docs/架构说明.md`：前端调用链、目录职责、页面结构和当前覆盖范围。
- `docs/package-说明.md`：依赖、构建流水线和配置文件说明。
- `docs/frontend-architecture.drawio`：前端分层和后端边界图。
- `src/router/index.ts`：路由事实源。
- `src/api/*.ts`：前端 HTTP 契约事实源。
- `src/types/*.ts`：前端 DTO 镜像事实源；遇到冲突以运行时代码和后端实际响应为准。
