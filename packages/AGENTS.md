# packages/ —— 内部包

只在改动 `packages/*` 时读本文件。全局约束在[根 `AGENTS.md`](../AGENTS.md)。

## 形态：源码即产物

8 个包的 `package.json` 都是同一形态：

```json
"exports": { ".": "./src/index.ts" },
"typesVersions": { "*": { "*": ["./src/*"] } }
```

**没有构建步骤**、没有 `main`、没有 `files`。`src/` 里的 `.ts` 就是发布产物，所以：

- 改动立即对引用方生效，不需要 build
- 不要往 `src/` 里放只能被构建处理的东西（`.scss` 例外，见 `materials`）

`@sa/alova` 是唯一有多个子路径的包：`.`, `./fetch`, `./client`, `./mock`。

## tsconfig 比根工程严

每个包都有自己的 `tsconfig.json`，`compilerOptions` 全部一致且**都比根工程严**：

| 范围         | `strict` | `noUnusedLocals` |
| ------------ | -------- | ---------------- |
| 根工程       | `true`   | `false`          |
| `packages/*` | `true`   | **`true`**       |

包内留下未使用的局部变量会**直接让 `pnpm typecheck` 失败**，根工程不会。包内不使用 `@/*` 别名。

## 依赖声明

规则本身见根 [`AGENTS.md`](../AGENTS.md) 的铁律 ④，机理与取舍见 [ADR-0001](../docs/adr/0001-pnpm-version-and-explicit-dependencies.md)。本节只记本仓库的**清单**——不重述规则（嵌套文件只放增量）。

当前已声明的包间依赖（5 个包、7 条 —— `packages/*/node_modules/@sa/` 下能直接看到这些链接）：

| 包              | 依赖                     |
| --------------- | ------------------------ |
| `@sa/hooks`     | `@sa/axios`、`@sa/utils` |
| `@sa/materials` | `@sa/color`、`@sa/utils` |
| `@sa/alova`     | `@sa/utils`              |
| `@sa/axios`     | `@sa/utils`              |
| `@sa/color`     | `@sa/utils`              |

**已知欠账（补齐属依赖变更，先问维护者）**：

- `@sa/uno-preset/src/index.ts` 直接 `import type` 了 `@unocss/core` 与 `@unocss/preset-mini`，但该包 `package.json` 没有 `dependencies`。它当前靠 `unocss` 把这些包提升到根 `node_modules` 才解析成功
- 根工程的 `src/service/request/index.ts` 直接 `import type { AxiosResponse } from 'axios'`，而根 `package.json` 未声明 `axios`，同样靠提升

两处都只在 `shamefullyHoist` 生效（即 pnpm ≥ 11）时成立。

## 导出风格

`index.ts` 一律做**具名导出**；单个实现文件的风格按包而异，跟随既有写法即可：

| 包                                      | `index.ts` 汇总方式                                 | 实现文件         |
| --------------------------------------- | --------------------------------------------------- | ---------------- |
| `@sa/hooks`、`@sa/materials`            | 具名导出（`import X from './x'` 后 `export { X }`） | `export default` |
| `@sa/utils`、`@sa/color`                | `export * from './xxx'`（color 另加具名）           | 具名             |
| `@sa/axios`、`@sa/alova`、`@sa/scripts` | 具名导出                                            | 具名             |
| `@sa/uno-preset`                        | 具名 + `export default`                             | —                |

改包内导出时同步 `index.ts`，改完跑 `pnpm typecheck`（Gate 清单见[根 `AGENTS.md`](../AGENTS.md#合入门禁)）。

## 各包职责

| 包               | 职责                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `@sa/axios`      | 请求内核：`createRequest`（抛错）/ `createFlatRequest`（返 `{ data, error }`）、`BACKEND_ERROR_CODE`     |
| `@sa/alova`      | alova 版请求封装（本仓库业务代码未使用，保留为备选）                                                     |
| `@sa/color`      | 基于 `colord` 的调色板与主题色计算（`ColorPaletteNumber` 等）                                            |
| `@sa/hooks`      | 通用 hook：`useBoolean` / `useLoading` / `useCountDown` / `useContext` / `useSvgIconRender` / `useTable` |
| `@sa/materials`  | 布局与滚动组件：`AdminLayout`、`PageTab`、`SimpleScrollbar` 及 `LayoutScrollMode` / `PageTabMode` 类型   |
| `@sa/scripts`    | `sa` CLI 本体（`gen-route` / `git-commit` / `release` / `changelog` / `cleanup` / `update-pkg`）         |
| `@sa/uno-preset` | UnoCSS 预设 `presetSoybeanAdmin`（shortcuts）                                                            |
| `@sa/utils`      | 通用工具：crypto / storage / nanoid / klona                                                              |

`@sa/scripts` 的 CLI 可用 c12 配置：根目录放 `soybean.config.ts` 即可覆盖默认行为（当前不存在该文件）。
