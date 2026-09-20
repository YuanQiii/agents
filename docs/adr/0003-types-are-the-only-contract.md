# 类型即唯一契约：不引入运行时 Schema 校验

**状态**：accepted

后端契约只以 TypeScript 声明存在：请求响应用统一包装 `{ code, msg, data }`，各模块 DTO 写在 `src/typings/api/*.d.ts` 的 `declare namespace Api` 下，业务函数用 `request<T>` 的泛型 `T` 承载它。仓库**没有** zod / valibot / yup 之类运行时校验库，也不对响应做结构校验。这是有意的取舍：DTO 声明已经给了编辑器与 `vue-tsc` 完整的静态契约，再叠一层运行时 schema 会要求同一份结构维护两遍，而收益（捕获后端结构漂移）在模板场景下低频；同时它避免了把校验库塞进下游产物。

## Consequences

- 后端返回结构发生漂移时**不会被运行时捕获**，错误会在使用处才显现（可能表现为 `undefined`）。
- 因此接口契约变更必须同时做三件事：更新 `src/typings/api/*.d.ts` 的 DTO、（如新增接口）在 `src/service/api/*.ts` 增加 `fetchXxx`、在交付说明中列出受影响的调用点。
- 反过来，只要 DTO 声明与后端一致，业务代码就不需要写防御性类型判断 —— 这是本决策换来的简洁性，也是改动时必须维持的前提。
