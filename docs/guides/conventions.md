# 编码约定

## 格式化与 lint 的实际覆盖面

| 工具                    | 覆盖                                   | 说明                                                               |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `oxlint`（`pnpm lint`） | `.ts` / `.tsx` / `.vue`                | 启用 `correctness` + `suspicious` 两类，均 error 级                |
| `eslint`（`pnpm lint`） | **只有 `**/\*.vue`\*\*                 | 共享配置 `@soybeanjs/eslint-config-vue` 挂在 `files: ["**/*.vue"]` |
| `oxfmt`（`pnpm fmt`）   | 全仓（`.oxfmtrc.json` 的 ignore 除外） | 直接改文件，不是 `--check`                                         |

**`eslint . ` 对 `.ts` 文件是空转**：`eslint src/main.ts` 会返回 `File ignored because no matching configuration was supplied`。所以「lint 通过」不等于 TS 侧的风格已检查 —— `.ts` 的质量只由 `oxlint` + `vue-tsc`（`pnpm typecheck`）守。

格式化参数（`printWidth: 120`、单引号、无尾逗号、箭头函数单参不加括号、`package.json` 的 scripts 排序）由 `.oxfmtrc.json` 表达，**改参数改配置文件**，本文件不复制。

> **本节与下一节的取值都是「抄」来的**（`.oxlintrc.json`、`eslint.config.js`、`.oxfmtrc.json`，以及第三方共享配置 `@soybeanjs/eslint-config-vue`）。社区的做法是「指配置、不抄规则」；这里抄，是因为那些取值躺在 `node_modules` 里、让 agent 去读不现实。
> **代价说清**：这些是**本文件里唯一会随配置或依赖升级而失真**的部分。改动上述配置、或升级 `@soybeanjs/eslint-config-vue` 之后，回来复核本节与下一节。

## 命名

- 组件名 PascalCase，模板里也按 PascalCase 使用（`vue/component-name-in-template-casing`，`icon-` 前缀的除外）
- props camelCase，自定义事件 camelCase
- 未使用的变量 / 参数用 `_` 前缀
- 枚举走 `src/enum/index.ts` 的 `SetupStoreId` 一类常量对象，不散落字符串字面量

## SFC 写法（这些是 eslint 强制或告警的，不是风格偏好）

| 规则                                         | 要求                                                       |
| -------------------------------------------- | ---------------------------------------------------------- |
| `vue/block-order`                            | 块顺序 `script` → `template` → `style`                     |
| `vue/component-api-style`                    | 只用 `<script setup>`                                      |
| `vue/define-props-declaration`               | props 用 **type-based** 声明（`defineProps<Props>()`）     |
| `vue/define-emits-declaration`               | emits 用 **type-based** 声明                               |
| `vue/require-macro-variable-name`            | 宏固定接收变量名：`props` / `emit` / `slots` / `attrs`     |
| `vue/component-options-name-casing`          | `defineOptions({ name })` 用 PascalCase                    |
| `vue/prefer-define-options`                  | 组件选项经 `defineOptions` 声明                            |
| `vue/define-macros-order`                    | `defineOptions` → `defineProps` → `defineEmits` → …        |
| `vue/next-tick-style`                        | `await nextTick()`，不用回调形式                           |
| `vue/no-template-target-blank`（**error**）  | `target="_blank"` 的链接必须有 `rel="noopener noreferrer"` |
| `vue/padding-line-between-blocks`            | 块之间留空行                                               |
| `@typescript-eslint/consistent-type-imports` | 类型导入用 `import type`（**只在 `.vue` 内强制**）         |
| `@typescript-eslint/no-use-before-define`    | 先定义后使用                                               |

## 文案

界面文案一律走 `$t('...')`（`src/locales` 导出），中英两套必须同步 —— 类型源与同步要求见 [`types.md`](./types.md)。

## 目录组织

- 页面私有子组件放同级 `modules/`（例：`src/views/home/modules/`、`src/views/_builtin/login/modules/`）
- 可跨页复用的组件放 `src/components/`（`common/` 通用、`custom/` 业务定制、`advanced/` 复合），或上提到 `packages/`
- 页面之间不互相 import（见 [`architecture.md`](./architecture.md#模块边界)）
- 通用 hook 放 `src/hooks/common/`，业务 hook 放 `src/hooks/business/`
- 内部包的导出风格跟随所在包，见 [`../../packages/AGENTS.md`](../../packages/AGENTS.md)

## 图标

`SvgIcon`（`src/components/custom/svg-icon.vue`）同时支持 Iconify 图标与本地 svg：`icon` 传 Iconify 名（`mdi:menu` 这种），`localIcon` 传本地 svg 名；同时传时 `localIcon` 优先。本地图标最终渲染成 `#${VITE_ICON_LOCAL_PREFIX}-${localIcon}`，所以 `VITE_ICON_LOCAL_PREFIX` 必须以 `VITE_ICON_PREFIX` 打头（见 [`types.md`](./types.md)）。本地 svg 源文件放 `src/assets/svg-icon/`。

## 表格范式

统一走 `src/hooks/common/table.ts`，不自己拼 naive-ui 的 `DataTable` 状态：

- `useNaiveTable` —— 不分页列表
- `useNaivePaginatedTable` —— 分页列表（含 `pagination` / `mobilePagination` / `getDataByPage`）
- `useTableOperate` —— 增删改抽屉状态（`drawerVisible` / `handleAdd` / `handleEdit` / `editingData` / `checkedRowKeys`）
- `defaultTransform` —— 后端分页响应 → `PaginationData` 的默认转换器（`{ records, current, size, total }` → `{ data, pageNum, pageSize, total }`）

`src/hooks/common/table.ts` 会 `watch(appStore.locale)` 重建列，所以列定义里的文案要经 `$t`，不要提前求值成常量。

## 表单范式

统一走 `src/hooks/common/form.ts`：

- `useNaiveForm` —— `formRef` / `validate` / `restoreValidation`
- `useFormRules` —— `patternRules`（`REG_*` 正则来自 `src/constants/reg`）、`formRules`（必填 + 模式）、`createRequiredRule`、`createConfirmPwdRule`

新增校验规则时用 `satisfies Record<string, App.Global.FormRule>` 保持键的完备性。
