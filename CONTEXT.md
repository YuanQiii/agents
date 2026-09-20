# SoybeanAdmin 领域词汇

本仓库专属词汇的**术语表**。用途是让读代码的人与 AI Agent 对同一个词有同一个理解——尤其适用于那些「代码里是这个意思、日常语境里是另一个意思」的词。

本文件只是术语表：不含实现细节、不是规格、不记录决策（决策在 [`docs/adr/`](./docs/adr/)）。工程约束见根 [`AGENTS.md`](./AGENTS.md)。

## 路由

**Route Key**：
路由在代码中的标识，等于 vue-router 的 `name`（如 `home`）。它是标识，不是地址。
_Avoid_：路由名、route name

**Route Path**：
Route Key 映射出的 URL 路径。二者不等价，混用会歧义。
_Avoid_：路由、路由地址

**Last Level Route Key**：
带页面文件的末端路由的 Route Key。只有这类路由能作为页签、首页与菜单项的目标。

**Constant Route**：
`meta.constant` 为真的路由，未登录即可访问。清单由构建配置定义，**不是**「代码里写死的常量」。
_Avoid_：静态路由

**Auth Route**：
Constant Route 之外的路由：需要登录，且权限由 `meta.roles` 与用户角色取交集判定。

**Auth Route Mode**：
鉴权路由的来源。`static` = 前端生成，`dynamic` = 后端下发。本仓库用 `static`。
_Avoid_：路由模式

**Route Home**：
static 模式下登录后的默认落地页，取值是一个 Last Level Route Key。

## 数据获取

**Flat Request**：
`createFlatRequest` 的产物（本仓库导出的 `request`）。失败时**不抛错**，返回 `{ data, error, response }`。业务代码默认用它。
_Avoid_：安全请求、非异常请求

**Request**：
`createRequest` 的产物。失败时**抛错**。本仓库只用于演示服务。
_Avoid_：axios 实例（它已被包装）

**Other Service**：
主后端之外的第二个后端服务，其 baseURL 从 `VITE_OTHER_SERVICE_BASE_URL` 解析。
_Avoid_：外部服务、第三方接口

**Proxy Pattern**：
dev 环境下的代理前缀：主服务 `/proxy-default`，其他服务 `/proxy-${key}`。
_Avoid_：代理地址、proxy url

## 布局与导航

**Layout Mode**：
页面骨架的六种形态之一。`mix` 指双列左菜单，`hybrid` 指顶部与侧边混合；`sidebar-first` / `header-first` 说明一级菜单落在哪一区。
_Avoid_：布局、layout

**Page Tab**：
应用内的页签，不是浏览器标签页。
_Avoid_：tab（在讨论浏览器时）

**Multi Tab**：
置 `meta.multiTab` 后，同一 Route Path 因 query 不同而开成不同页签的行为。

**Fixed Index In Tab**：
页签固定（置顶）时的排序值。
_Avoid_：pinned、钉住（界面文案用词）

**Menu**：
导航树的一项。隐藏路由可用 `meta.activeMenu` 挂靠到某个菜单项上，使其保持高亮。
_Avoid_：nav、菜单项

**Search Menu**：
Menu 的扁平派生列表，供全局搜索使用。

## 主题

**Theme Scheme**：
用户对明暗的**意图**设置，三值 `light` / `dark` / `auto`。

**Dark Mode**：
Theme Scheme **解析后的布尔结果**，决定是否给根节点加 `dark` 类。
_Avoid_：用 dark mode 指代用户设置（那是 Theme Scheme）、深色模式设置

## 图标

**Iconify Icon**：
来自 Iconify 图标集的图标，以集合前缀书写（如 `mdi:menu`）。

**Local Icon**：
放在 `src/assets/svg-icon/` 的本地 svg 图标，按名字引用；渲染时由 `VITE_ICON_LOCAL_PREFIX` 加前缀，该前缀必须包含 `VITE_ICON_PREFIX`。
_Avoid_：svg icon、本地图标
