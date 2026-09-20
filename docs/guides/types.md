# 类型

## tsconfig

根工程 `strict: true`、`noUnusedLocals: false`。**`packages/*` 用的是另一套值**，见 [`packages/AGENTS.md`](../../packages/AGENTS.md#tsconfig-比根工程严)。

路径别名：根工程 `@/*` → `./src/*`、`~/*` → `./*`；包内不用别名。

## any 的处理

`@typescript-eslint/no-explicit-any` 在共享 eslint 配置里是 **off**，所以没有机器闸。实际约定是从现状反推的：`src/` 下非生成文件的显式 `any` 只有 **3 处**（`hooks/common/table.ts` 2 处泛型约束、`service/request/index.ts` 1 处响应泛型）。

新增类型用精确类型或 `unknown` + 收窄。确实需要 `any` 时（第三方库的泛型约束、渐进迁移）保持局部，不要扩散到导出的签名。

## 契约只有类型

**没有** zod / valibot / yup 一类的运行时校验，DTO 声明就是全部契约。取舍与后果见 [ADR-0003](../adr/0003-types-are-the-only-contract.md)。

## 类型源与「新增一个 X 要同步哪几处」

这是本仓库最容易漏改的地方：多数核心概念都有一个**类型源**，实际数据写在别处，两边必须同时改，且**类型系统会替你把关**（漏改通常直接 `pnpm typecheck` 失败）。

| 新增什么              | 类型源                                                       | 还要同步                                                                       |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| env 变量              | `src/typings/vite-env.d.ts` → `Env.ImportMeta`               | `.env`、`.env.test`、`.env.prod`（至少三者之一声明该变量）                     |
| storage key           | `src/typings/storage.d.ts` → `StorageType.Local` / `Session` | 使用处经 `localStg` / `sessionStg`                                             |
| i18n key              | `src/typings/app.d.ts` → `App.I18n.Schema`（类型源）         | `src/locales/langs/zh-cn.ts` **和** `en-us.ts` —— 只改一种过不了类型检查       |
| 路由 meta 字段        | `src/typings/router.d.ts` → `RouteMeta` 模块扩展             | 生成路由的 `build/plugins/router.ts` `onRouteMetaGen`（若需默认值）            |
| union 枚举            | `src/typings/union-key.d.ts` → `UnionKey.*`                  | 对应的 `Record<UnionKey.X, …>` 映射（穷尽性由类型保证）                        |
| store                 | `src/enum/index.ts` → `SetupStoreId`                         | `defineStore(SetupStoreId.X, …)`；**漏登记会用不了 `$reset`**                  |
| 接口 DTO              | `src/typings/api/<模块>.d.ts` → `declare namespace Api`      | `src/service/api/<模块>.ts` 的 `fetchXxx`；新模块还要进 `service/api/index.ts` |
| `window` 挂载         | `src/typings/global.d.ts`                                    | 挂载点（`src/plugins/*`）                                                      |
| 自动导入的组件 / 图标 | `src/typings/components.d.ts`（**生成物**）                  | 不手改；跑一次 `pnpm dev` 或 `build` 会自动补                                  |

## 几个必须知道的类型事实

- 语言只有两种：`App.I18n.LangType = 'en-US' | 'zh-CN'`；语言文件是 `src/locales/langs/zh-cn.ts` 与 `en-us.ts`
- 布局模式是**穷尽的**：`Record<UnionKey.ThemeLayoutMode, …>`（`src/constants/app.ts`）。给布局加模式时所有这类 Record 与 i18n 的 `Record<UnionKey.ThemeLayoutMode, string>` 都会报错，这是有意的
- `RouteKey` 就是 vue-router 的 `name`，不是 path；`RoutePath` / `RouteMap` 同样来自 `@elegant-router/types`（生成物）
- `RouteMeta` 是模块扩展（`src/typings/router.d.ts`），字段清单以该文件为准 —— 它同时是「页面能配什么」的唯一事实源
- `window.$message` / `$dialog` / `$notification` / `$loadingBar` 是可选挂载（`src/typings/global.d.ts`），调用处一律用 `?.`
- `BUILD_TIME` 是构建期注入的全局常量（`vite.config.ts` define），不是运行时变量
