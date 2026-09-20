# AGENTS.md

soybean-admin v2.2.0 —— 纯前端 SPA（Vue 3 + Vite + TypeScript + Naive UI + UnoCSS）的 pnpm workspace monorepo：根应用 + `packages/*` 8 个内部包。

> `docs/v3.md` 是**未实现的** v3 重构草案，它提到的 `ubean` / `vite-plus` / `SoybeanUI` / Drizzle / `src/pages/` / `#/` 别名在本仓库都不存在。以代码与下面指向的文档为准。

## 铁律

这 5 条即使不读任何其他文档也必须遵守。

1. **生成物只经生成命令更新**：`src/router/elegant/*`、`src/typings/elegant-router.d.ts`、`src/typings/components.d.ts`、`CHANGELOG*.md`、各包 `version`。路由改动走 `pnpm gen-route`，版本与 changelog 走 `pnpm release`。跑过 `dev` / `build` 后检查 `git status`——它会重写 `components.d.ts` 并可能丢条目。
2. **合入前 Gate 全过，且不用 `--no-verify` 绕过**：`pnpm typecheck && pnpm lint && pnpm fmt && git diff --exit-code`。任一失败先归因（代码 / 环境 / 配置，判定方法见 [`docs/guides/workflow-validation.md`](docs/guides/workflow-validation.md) 的「诊断：症状 → 根因 → 处置」），再修根因——不要按表面错误数量报告。
3. **这四类改动先问维护者**：① 依赖声明（任何 `package.json` 的 deps / devDeps、`pnpm-lock.yaml`）② Gate 配置（`.oxlintrc.json`、`eslint.config.js`、`tsconfig*.json`、`.oxfmtrc.json`）③ `.env*` 变量 ④ 生成物与发布（`CHANGELOG*.md`、各包 `version`、`pnpm-workspace.yaml`）。其余（业务代码、`src/`、`docs/`）可自主。
4. **pnpm ≥ 11，且包内直接 import 的包要在该包自己的 `package.json` 声明**：pnpm 的非 auth / registry 设置只从 `pnpm-workspace.yaml` 读（camelCase），pnpm 10 只读其中的 `packages`、其余静默忽略；workspace 包不会被 hoist。违反的表现是与真因无关的 `Cannot find module`。
5. **最小改动**：不顺手重构、不升级依赖版本、不改公共 API 形状与 `packages/*` 的 `exports`。要扩大范围先说明原因。

## 指令优先级

`可执行 Gate（lint / typecheck / CI）` › `配置文件` › `packages/AGENTS.md` › `本文件` › `docs/` 说明性材料。

冲突时按此顺序，并指出冲突位置。

## 按任务读文档

| 你要做什么                                      | 读                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| 新增 / 改页面、路由、布局                       | [`docs/guides/architecture.md`](docs/guides/architecture.md)               |
| 新增 / 改接口、调后端                           | [`docs/guides/api.md`](docs/guides/api.md)                                 |
| 登录、鉴权、权限、用户输入边界                  | [`docs/guides/auth-security.md`](docs/guides/auth-security.md)             |
| 改类型，或新增 env / storage / i18n key / store | [`docs/guides/types.md`](docs/guides/types.md)                             |
| 写组件 / hook / 样式，或有命名疑问              | [`docs/guides/conventions.md`](docs/guides/conventions.md)                 |
| 跑验证、判断改动范围、交付                      | [`docs/guides/workflow-validation.md`](docs/guides/workflow-validation.md) |
| 改动 `packages/*`                               | [`packages/AGENTS.md`](packages/AGENTS.md)                                 |
| 人工回归（本仓库无自动化测试）                  | [`docs/v2-regression-checklist.md`](docs/v2-regression-checklist.md)       |
| 维护 / 扩展约束体系本身（防腐层、自检脚本）     | [`docs/anti-rot-plan.md`](docs/anti-rot-plan.md)                           |

## 核心事实源

| 事实                               | 唯一来源                             |
| ---------------------------------- | ------------------------------------ |
| 请求内核契约、业务码、新增接口三步 | `docs/guides/api.md`                 |
| 鉴权模型与路由守卫                 | `docs/guides/auth-security.md`       |
| 类型源清单与同步要求               | `docs/guides/types.md`               |
| 验证命令、CI 覆盖、故障诊断        | `docs/guides/workflow-validation.md` |
| 为什么这样设计（决策记录）         | `docs/adr/`                          |
| 目录 / 分层 / 生成物               | `docs/guides/architecture.md`        |
| 项目专属词汇的含义                 | `CONTEXT.md`                         |

## 合入门禁

```bash
pnpm typecheck && pnpm lint && pnpm fmt && git diff --exit-code
```

`pre-commit` 跑的就是这一串。因为 `lint` / `fmt` 会改文件，先跑完并 `git add` 再提交，否则最后一步 `git diff --exit-code` 会失败。

CI（`.github/workflows/linter.yml`）另跑 `node scripts/check-agents-md.mjs`（等同 `pnpm agents-check`；用 `node` 直跑是为了 CI 不必先 `pnpm install`）——校验**约束文档本身**：相对链接是否可达、文档里提到的命令是否真实存在、有没有留下会腐烂的章节号指针。同一个 job 还每周一自动跑一次（`schedule`，也可在 Actions 页面手动触发）——**腐烂也会发生在文件一个字没改的时候**。

还有一条 PR 级漂移提醒：`package.json` / lock / `pnpm-workspace.yaml` / `tsconfig*.json` / `*.config.*` / `.env*` 变了、而这个 PR 没改任何 `AGENTS.md` 时，会在 PR 上留言提示回来复核（**只提醒，不阻断**）。

交付时按 [`docs/guides/workflow-validation.md`](docs/guides/workflow-validation.md) 的格式给出 Validation 报告：每个 FAIL 带归因（代码 / 环境 / 配置），仓库没有的命令写 `NOT AVAILABLE`（`test` 恒为 `NOT AVAILABLE`），未验证的部分显式声明。
