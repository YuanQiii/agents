# 架构

## 这是什么

纯前端 SPA：Vue 3 + Vite + TypeScript + Naive UI + UnoCSS。pnpm workspace monorepo —— 根应用 + `packages/*` 8 个内部包，包内源码即产物。没有后端、没有 SSR、没有 Docker / K8s、没有数据库。

**`docs/v3.md` 是未实现的 v3 重构草案。** 它提到的 `ubean` / `vite-plus` / `SoybeanUI` / Drizzle / `src/pages/` / `#/` 别名在本仓库**都不存在**。以本文件与代码为准。

## 分层与调用方向

```
src/views · src/layouts → src/hooks · src/store → src/service/api → src/service/request → @sa/axios → HTTP
        ↘________________ src/plugins · src/locales · src/theme · src/utils · src/constants ________________↗
```

- `src/service/api/*.ts` 是接口的唯一出口，`src/service/request` 是唯一的请求内核
- `packages/*` 被 `src/` 与彼此引用；内部包不反向依赖 `src/`

## 应用启动

`src/main.ts` 的调用顺序是约定：

```
setupLoading → setupNProgress → setupIconifyOffline → setupDayjs → createApp(App)
  → setupStore → await setupRouter → setupI18n → setupAppVersionNotification
  → setupVueRootValidator → app.mount('#app')
```

`setupRouter` 里的 `await router.isReady()` 是必需的：路由守卫在首次导航中初始化常量路由，去掉它会导致首屏落进 `not-found`。

## 文件即路由

路由由 `@elegant-router/vue` 从 `src/views/**` 的目录结构 + `build/plugins/router.ts` 的配置生成：

- 目录 / 文件名映射为路由；`index.vue` 表示该层自身；`[url].vue` 表示动态段；`_` 前缀目录（如 `_builtin`）不进路由
- 生成物：`src/router/elegant/{routes,imports,transform}.ts`、`src/typings/elegant-router.d.ts`。改视图目录后用 `pnpm gen-route` 重新生成，生成物本身保持不动
- **常量路由清单硬编码在 `build/plugins/router.ts` 的 `onRouteMetaGen`**（当前为 `['login','403','404','500']`）。它决定哪些路由不经登录即可访问，改它等于改鉴权前提
- 布局映射同在 `build/plugins/router.ts`：`base` → `src/layouts/base-layout/index.vue`，`blank` → `src/layouts/blank-layout/index.vue`
- `login` 路由的 path 被 `routePathTransformer` 改写成 `/login/:module(pwd-login|code-login|register|reset-pwd|bind-wechat)?`

## 构建期插件

`build/plugins/index.ts` 的装配顺序有意义：

```
vue → vueJsx → devtools → elegant-router → unocss → unplugin → progress → html → vueRootValidator
```

elegant-router 必须排在 unplugin 之前，否则自动导入拿不到生成的路由类型。

`vite-plugin-vue-transition-root-validator` 只校验 `<Transition>` 的子节点数量，**不是**「所有 SFC 必须单根」—— `src/components/` 与 `src/layouts/` 下存在多根模板。

## 模块边界

| 边界                                                       | 强制方式                                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/views/**`、`src/layouts/**` 经 `@/service/api` 发请求 | `.oxlintrc.json` 的 `no-restricted-imports` 禁止 import `axios` / `@sa/axios`（error 级）                 |
| `src/views/**` 之间不互相 import                           | 同上，`patterns` 分支禁止 `@/views/*`；复用逻辑上提到 `src/components/` 或 `packages/`                    |
| 包内直接 import 的包在其 `package.json` 显式声明           | 约定 + `pnpm typecheck`（workspace 包不被 hoist，见 [`../packages/AGENTS.md`](../../packages/AGENTS.md)） |

除此之外的边界（例如「store 不调 API」）**未发现明确约定**。

> **新增边界规则时注意**：`.oxlintrc.json` 的 `overrides` **不是合并**——同一个文件命中两条 override 时，**后一条整体覆盖前一条**（实测：`src/views/**` 曾同时命中两条，于是丢掉 `paths` 里的 axios 限制，而 `oxlint` 全仓仍是 0 error，毫无信号）。所以**每个文件只能命中一条 override**：给某个目录加规则，就写进它**已有**的那条；加完用临时文件实测一次，确认报错真的出现。

## 生成物

| 生成物                                    | 来源                         | 重新生成             |
| ----------------------------------------- | ---------------------------- | -------------------- |
| `src/router/elegant/*`                    | `@elegant-router/vue`        | `pnpm gen-route`     |
| `src/typings/elegant-router.d.ts`         | 同上                         | 同上                 |
| `src/typings/components.d.ts`             | `unplugin-vue-components`    | `pnpm dev` / `build` |
| `CHANGELOG.md` / `CHANGELOG.zh_CN.md`     | `@soybeanjs/changelog`       | `pnpm release`       |
| 各 `packages/*/package.json` 的 `version` | `bumpp`（`sa release` 调用） | `pnpm release`       |

前两项已被 `.oxfmtrc.json` 的 `ignorePatterns` 排除。`pnpm dev` / `pnpm build` 会重写 `src/typings/components.d.ts`，实测可能丢条目（如 `IconLocalLogo`）—— 跑完先看 `git status`，该文件出现非预期改动时用 `git checkout -- src/typings/components.d.ts` 还原。
