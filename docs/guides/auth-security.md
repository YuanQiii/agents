# 鉴权与安全

## 三处出场

| 层       | 文件                              | 职责                                                            |
| -------- | --------------------------------- | --------------------------------------------------------------- |
| 路由守卫 | `src/router/guard/route.ts`       | 初始化常量 / 鉴权路由，判登录、判权限，处理 `meta.href`         |
| 状态     | `src/store/modules/auth/index.ts` | `token` / `userInfo` / `isStaticSuper` / `login` / `resetStore` |
| 权限判断 | `src/hooks/business/auth.ts`      | `hasAuth(codes)` —— 按钮级权限                                  |

## 凭据与存储

- `token` / `refreshToken` 存 **localStorage**（`localStg`，key 前缀 `VITE_STORAGE_PREFIX`，当前 `SOY_`）
- 请求头由 `request` 的 `onRequest` hook 加上：`Authorization: Bearer <token>`（`src/service/request/index.ts`）
- `localStg.remove('token')` 与 `authStore.token` 是**两个**状态；判断是否登录两处都要看（守卫用 localStorage，UI 用 store）

存储 key 的类型源是 `src/typings/storage.d.ts` 的 `StorageType.Local` / `Session`。

## 路由守卫流程

`createRouteGuard` 每次导航先 `initRoute(to)`：

1. 常量路由未初始化 → `routeStore.initConstantRoute()`，然后 **replace 回原地址**（首帧会被 `not-found` 捕获，这是预期行为）
2. 未登录且目标是常量路由（且非 `not-found`）→ 放行
3. 未登录且目标非常量路由 → 跳 `login`，带 `redirect` query
4. 已登录但鉴权路由未初始化 → `routeStore.initAuthRoute()`；若当前是 `not-found`，替换回原地址
5. 已登录、目标是 `not-found` 且路由确实存在 → 跳 `403`

**常量路由清单硬编码在 `build/plugins/router.ts` 的 `onRouteMetaGen`**，当前 `['login','403','404','500']`。它同时是「未登录可访问」的判据（`to.meta.constant`），改它等于改鉴权前提。

登录成功时若目标是 `login` 路由，会被重定向到 `root`。`meta.href` 的路由会 `window.open` 并 replace 回原路由（`handleRouteSwitch`）。

## 权限模型

路由级：`to.meta.roles` 与 `authStore.userInfo.roles` 取交集。

```ts
const hasAuth = authStore.isStaticSuper || !routeRoles.length || hasRole;
```

三档优先级：**静态超级角色**（`VITE_AUTH_ROUTE_MODE === 'static'` 且 roles 含 `VITE_STATIC_SUPER_ROLE`，当前 `R_SUPER`）→ 路由未声明 `roles`（人人可进）→ 角色有交集。

按钮级：`useAuth().hasAuth(codes)` 判 `userInfo.buttons`，传字符串判单个、传数组判「任一命中」。

**没有**后端下发的菜单 / 按钮过滤（`VITE_AUTH_ROUTE_MODE` 当前为 `static`）；`dynamic` 模式的实现在 `src/store/modules/route`，本仓库未启用。

## 登录与登出的不变量

`useAuthStore` 里三处顺序与分支是有意义的，改动时最容易踩：

| 不变量                                                                                                                                        | 位置                              | 破坏后的后果                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------- |
| `resetStore` 先 `recordUserId()` → `clearAuthStorage()` → `$reset()` → `toLogin()`（非常量路由时）→ `cacheTabs()` + `routeStore.resetStore()` | `store/modules/auth/index.ts`     | 顺序颠倒会丢「上一个用户」记录或残留鉴权路由  |
| 登录成功后 `checkTabClear()` 返回 `true` 时**不**按 `redirect` 跳转                                                                           | 同上（`login` 的 `needRedirect`） | 换用户登录后跳到上一个用户的页面              |
| 跨用户判定用 `lastLoginUserId`，比对后**立即 remove**                                                                                         | `checkTabClear`                   | 残留该 key 会让下次登录误判                   |
| 登出要同时清 localStorage 与 `authStore.$reset()`                                                                                             | `resetStore` / `clearAuthStorage` | 只清一处会出现「看似登出但仍能带 token 请求」 |

`resetStore` 由三处触发：登出、登录失败、`initUserInfo` 拉取用户信息失败。

## 用户输入边界

- 表单校验走 `useFormRules`（见 [`conventions.md`](./conventions.md#表单范式)），正则源在 `src/constants/reg`
- HTML 注入面很小：`src/` 下**没有 `v-html`**，唯一的 `innerHTML` 是 `src/plugins/loading.ts:56` 写入首屏 loading 的**静态常量字符串**。新增 `v-html` 或把外部数据写进 `innerHTML` 时，需要明确论证来源可信

## 环境变量

`.env*` 里全部是 `VITE_` 前缀变量，会被**打进前端产物**。密钥、私钥、后端凭证放服务端，不要放这里。变量的类型声明与同步要求见 [`types.md`](./types.md)。
