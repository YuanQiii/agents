# 接口与数据契约

## 响应包

后端响应统一是 `{ code, msg, data }`（`App.Service.Response<T>`，声明在 `src/typings/app.d.ts`）：

```ts
type Response<T = unknown> = {
  code: string; // 业务码，字符串，与 VITE_SERVICE_SUCCESS_CODE 比对
  msg: string; // 错误消息，透传到 $message / $dialog
  data: T; // 业务数据
};
```

另有 `App.Service.DemoResponse<T>` 形状（`{ status, message, result }`），只用于 `demoRequest`（`VITE_OTHER_SERVICE_BASE_URL` 指向的演示服务）。

**没有运行时结构校验** —— 没有 zod / valibot / yup，DTO 声明是唯一契约。理由与后果见 [ADR-0003](../adr/0003-types-are-the-only-contract.md)。

## 四类业务码（来自 `.env*`）

`src/service/request/index.ts` 的 hook 按这四类分派：

| env 变量                           | 当前值           | 命中后行为                                                             |
| ---------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| `VITE_SERVICE_SUCCESS_CODE`        | `0000`           | 判定成功，走 `transform`                                               |
| `VITE_SERVICE_LOGOUT_CODES`        | `8888,8889`      | 静默登出                                                               |
| `VITE_SERVICE_MODAL_LOGOUT_CODES`  | `7777,7778`      | 弹不可关闭的 `$dialog`，用户点击前阻止刷新（`beforeunload`），点后登出 |
| `VITE_SERVICE_EXPIRED_TOKEN_CODES` | `9999,9998,3333` | 刷新 token 后重放原请求                                                |

新增业务码改 `.env*`（属「改动前先问维护者」的一类），并在 `src/typings/vite-env.d.ts` 里已有对应声明。

## 两种请求实例

`@sa/axios` 提供两个工厂，本仓库两个都用：

| 工厂                | 返回                        | 失败时                   | 本仓库用法                      |
| ------------------- | --------------------------- | ------------------------ | ------------------------------- |
| `createFlatRequest` | `{ data, error, response }` | **不抛错**，`error` 有值 | `request` —— 默认用它           |
| `createRequest`     | `data`                      | **抛错**                 | 只在 `demoRequest` 这类特殊场景 |

**业务代码默认用 `request`（flat）**：调用处写 `const { data, error } = await fetchXxx()`，判 `if (!error)` —— 不要用 `try/catch` 包它。

hook 契约（`packages/axios/src/type.ts` 的 `RequestOption`）：

- `transform(response)` —— 把 `AxiosResponse` 转成 API 数据。本仓库固定返回 `response.data.data`（`src/service/request/index.ts`）
- `onRequest(config)` —— 加 `Authorization` 头
- `isBackendSuccess(response)` —— 判成功
- `onBackendFail(response, instance)` —— 判失败并决定是否重放；返回 `null` 表示已处理
- `onError(error)` —— 统一错误展示；`error.code === BACKEND_ERROR_CODE` 时才有后端 `msg` / `code`

> `transformBackendResponse` 在 `packages/axios/src/type.ts` 中已标 `@deprecated`（v3 移除）。新代码写 `transform`。

## 新增一个接口

1. 在 `src/typings/api/<模块>.d.ts` 的 `declare namespace Api` 下声明 DTO（新模块需同步命名空间）
2. 在 `src/service/api/<模块>.ts` 加 `fetchXxx`，用 `request<Api.<模块>.<DTO>>({ url, method, data })` 把 DTO 挂上泛型
3. 该模块若首次出现，在 `src/service/api/index.ts` 补 `export * from './<模块>'`

`request` 的泛型 `T` 就是 `transform` 之后的数据类型（即 `response.data.data` 的类型），不是整个响应包。

## 分页契约

列表接口的 DTO 用 `Api.Common.PaginatingQueryRecord<T>`：请求参数 `{ current, size }`（`Api.Common.CommonSearchParams`），响应含 `{ records, current, size, total }`。

前端用 `defaultTransform`（见 [`conventions.md`](./conventions.md#表格范式)）转成 naive-ui 的分页数据。但它**会吞掉错误**：`error` 非空时返回空列表 + `total: 0`。需要区分「空数据」与「请求失败」时，不要用它。

## 请求内核的不变量

`src/service/request/shared.ts` 与 `index.ts` 里有 4 条改动时最容易破坏的语义：

| 不变量                                                | 位置                                            | 破坏后的后果                      |
| ----------------------------------------------------- | ----------------------------------------------- | --------------------------------- |
| `refreshToken` 接口**不得**返回 `expiredTokenCodes`   | `index.ts` 的注释与 `onBackendFail` 分支        | 刷新失败 → 再触发刷新，**死循环** |
| 刷新是**单飞**的：并发过期请求只调一次 `refreshToken` | `handleExpiredRequest` 的 `refreshTokenPromise` | 并发刷新，token 互相覆盖          |
| 刷新 Promise 在 **1 秒**后置空                        | 同上（`setTimeout(…, 1000)`）                   | 立即置空会让同批请求各自发起刷新  |
| 同一错误消息**去重**，离开后 5 秒清空栈               | `showErrorMsg` 的 `errMsgStack`                 | 同时多个请求报同一错误时刷屏      |

## 多服务与代理

`VITE_OTHER_SERVICE_BASE_URL` 是 **json5 字符串**，解析出 `{ key: baseURL }`（`src/utils/service.ts`）。

- 主服务：dev 且有 `VITE_HTTP_PROXY=Y` 时 baseURL 用 `/proxy-default`，否则用 `VITE_SERVICE_BASE_URL`
- 其他服务：同理用 `/proxy-${key}`

代理规则本体在 `build/config/proxy.ts`。新增其他服务时，`App.Service.OtherBaseURLKey`（`src/typings/app.d.ts`）要同步加 key。

## 未发现明确约定

- **没有** OpenAPI / Swagger / 接口版本化 / 向后兼容策略
- **没有**全局错误处理器（`app.config.errorHandler`）或错误上报 SDK；异常页由 `src/components/common/exception-base.vue` + `src/views/_builtin/*` 呈现
- **没有**请求取消的统一用法（`@sa/axios` 提供 `cancelAllRequest` 与 `AbortController` 复用，本仓库业务代码未使用）
