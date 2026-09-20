# 验证、诊断与交付

## 命令

| 目的     | 命令                                     | 备注                                           |
| -------- | ---------------------------------------- | ---------------------------------------------- |
| 开发     | `pnpm dev`（test 模式）/ `pnpm dev:prod` |                                                |
| 构建     | `pnpm build`（prod）/ `pnpm build:test`  | 会重写 `src/typings/components.d.ts`           |
| 预览     | `pnpm preview`                           |                                                |
| 类型检查 | `pnpm typecheck`                         | `vue-tsc --noEmit --skipLibCheck`              |
| lint     | `pnpm lint`                              | `oxlint --fix && eslint --fix .` —— **改文件** |
| 格式化   | `pnpm fmt`                               | `oxfmt` —— **改文件**                          |
| 路由生成 | `pnpm gen-route`                         | `sa gen-route`                                 |
| 提交     | `pnpm commit` / `pnpm commit:zh`         | `sa git-commit`                                |
| 发布     | `pnpm release`                           | `sa release`（bumpp + 生成 CHANGELOG）         |
| 清理     | `pnpm cleanup`                           | `sa cleanup`                                   |
| 更新依赖 | `pnpm update-pkg`                        | `sa update-pkg`                                |
| 文档自检 | `pnpm agents-check`                      | 校验约束文档本身；CI 会跑，见下节              |

**只读等价物**（取证或审计时用这些，不要改工作区）：

```
oxlint                                  # 不带 --fix
eslint .                                # 不带 --fix
oxfmt --check
vue-tsc --noEmit --skipLibCheck
```

`pnpm lint` 与 `pnpm fmt` 默认带 `--fix` / 直接写盘，跑完工作区就变了 —— 需要「只检查」就用上面的形式。

## 约束文档自检

`pnpm agents-check`（`scripts/check-agents-md.mjs`，零依赖，CI 里不需要 `pnpm install`）只查三件**会静默过期**的事：

| 检查                                 | 为什么                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| 相对链接是否可达                     | 指针指向不存在的文件，没有任何工具会报错                                                  |
| 文档提到的 `pnpm <cmd>` 是否真实存在 | 命令改名后文档会照着说谎（比对 `package.json` 的 scripts + 各包 `bin` + pnpm 内置子命令） |
| 有没有章节号指针                     | 用编号引用 `AGENTS.md` 的某一节——根文件一重排就静默失效（实测踩过 4 处）                  |

检查范围是约束体系自己维护的文件（根 `AGENTS.md`、`packages/AGENTS.md`、`CONTEXT.md`、`docs/**`），**不含** README（上游的）、`CHANGELOG*`（生成物）、`docs/v3.md`（外部草案，路径指向未实现的结构）。

新增或改动约束文档后跑一次；只改代码不用跑。

### 它防不住什么（重要）

`agents-check` **只覆盖指针型腐烂**。实测验过：在文档里写三句假话（状态写 PASS 实则 FAIL、要求与配置矛盾、事实写错），三项检查**全绿**。它**防不住**：

- 状态描述失真（文档说「typecheck 应通过」而它 FAIL）→ 所以诊断节写成「症状 → 根因 → 处置」，不写「当前 PASS/FAIL」
- 规则与配置矛盾 → 所以配置是唯一事实源，文档只指路
- **缺失型**：新增了 Gate / 包 / 事实源却没人登记 → 靠下面的漂移提醒 + 「改 X 时同步 Y」清单（如 [`types.md`](./types.md) 的同步表）
- 事实写错 → 靠写作时回仓库取证

**检查通过 ≠ 文档健康**，只等于「指针型问题没有」。这和「全仓 lint 0 error 不代表边界规则生效」是同一类错觉。

### 漂移提醒（PR 级）

`.github/workflows/agents-md-drift.yml` 治上面那条「缺失型」：watchlist 文件（`package.json`、lock、`pnpm-workspace.yaml`、`eslint.config.js`、`.oxlintrc.json`、`.oxfmtrc.json`、`tsconfig*.json`、`vite.config.ts`、`uno.config.ts`、`.env*`，以及 `packages/*/{package,tsconfig}.json`）变了、而整个 PR 没改任何 `AGENTS.md` 时，在 PR 上留言列出「改了什么 → 回来复核哪份文档」。

它**只提醒、不阻断合入**（逼出来的空改动比不提醒更糟）；评论带 marker，补上文档后自动删除。判定逻辑有 12 条真值用例（含包内源码变动不该触发、`packages/AGENTS.md` 也算数）——这类脚本不测就等于没写。

## 钩子

`package.json` 的 `simple-git-hooks`：

```
pre-commit : pnpm typecheck && pnpm lint && pnpm fmt && git diff --exit-code
commit-msg : pnpm sa git-commit-verify
```

因为 `lint` / `fmt` 会改文件，而 `git diff --exit-code` 要求工作区干净：**先把 `pnpm lint && pnpm fmt` 跑完并 `git add`，再提交**。否则改动留在未暂存区，钩子会失败。

提交信息格式 `type(scope): subject` 由 `sa git-commit` 交互生成；`commit-msg` 钩子会校验。

## CI 实际跑什么

| workflow                                          | 触发                                                                            | 内容                                                                                                                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/linter.yml`                    | PR → `main`、push → `main`、`schedule`（每周一 09:00 UTC）、`workflow_dispatch` | `github/super-linter`，`VALIDATE_ALL_CODEBASE: false`（只查改动），排除 `docs` 与 `.github`，且 `VALIDATE_MARKDOWN: false`。**`schedule` 触发时这个 job 会被跳过**（`if: github.event_name != 'schedule'`），每周那次只跑零依赖的 `agents-md` job |
| `.github/workflows/release.yml`                   | push tag `v*`                                                                   | `npx githublogen` 生成 release notes                                                                                                                                                                                                              |
| `.github/workflows/opencode.yml`                  | 评论含 `/oc` 或 `/opencode`                                                     | 调 `anomalyco/opencode` agent                                                                                                                                                                                                                     |
| `.github/workflows/agents-md-drift.yml`           | PR → `main`                                                                     | 漂移提醒：改了 watchlist 文件（`package.json` / lock / `*.config.*` / `tsconfig*` / `.env*` / `pnpm-workspace.yaml`）却没改任何 `AGENTS.md` 时，在 PR 上留言；补上文档后自动删除该评论                                                            |
| `.github/workflows/linter.yml`（`agents-md` job） | PR → `main` · 每周一 · 手动触发                                                 | `node scripts/check-agents-md.mjs`——约束文档本身的门禁。**定期复核（防腐第 ④ 层）就是这个 job**：腐烂也会发生在文件没改的时候（命令被改名、目录被移走）                                                                                           |

**CI 不跑 typecheck、不跑 build、不跑测试。** 本地 Gate 是唯一防线，别指望 CI 兜。

## 约束的三层

按「违反后谁会发现」分，三层缺一不可：

| 层  | 谁在管                   | 违反时               | 落点                                                                                                                                                                                                                                              |
| --- | ------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 一  | **机器**                 | 命令失败、提交被拒   | `tsconfig.json`（`strict`）· `packages/*/tsconfig.json`（再加 `noUnusedLocals`）· `oxlint`（141 条规则 + 2 条 `no-restricted-imports` 边界）· `eslint`（仅 `**/*.vue`）· `oxfmt` · `simple-git-hooks`                                             |
| 二  | **人**（代码评审与自律） | **没有任何信号**     | 根 `AGENTS.md` 的 5 条铁律 · [`api.md`](./api.md#请求内核的不变量) 与 [`auth-security.md`](./auth-security.md#登录与登出的不变量) 的不变量 · [`types.md`](./types.md#类型源与新增一个-x-要同步哪几处) 的同步表 · [`../adr/`](../adr/) 的 3 条决策 |
| 三  | **事实验证**             | 只有实际跑一遍才知道 | [`../v2-regression-checklist.md`](../v2-regression-checklist.md) 的 15 项 · 交付自检报告                                                                                                                                                          |

**第一层的条目数远多于文档里写的**（141 条 lint 规则，而 guides 只列了你会写到的 14 条）——这是有意的：环境能表达的就不写进文档，文档只装机器装不下的那部分。想知道会被什么拦住，读配置文件并跑一遍 Gate。

**新增约束时从上往下试**：类型 → lint 规则 → 运行时断言 → 根文件铁律（每个任务都要守）→ guides（只有某类任务才守）→ 注释（仅当机器表达不了**且**违反后果严重，并同时登记进下面的契约索引）。

## 覆盖盲区（知道这些，才不会误判「都过了」）

- `eslint` **只覆盖 `**/\*.vue`**；`.ts`只有`oxlint`+`vue-tsc` 在管
- `oxlint` 启用的是 `correctness` + `suspicious` 两类，不是全量规则
- 没有测试体系（见 [ADR-0002](../adr/0002-no-test-framework.md)），`test` 一项恒为 `NOT AVAILABLE`

## 诊断：症状 → 根因 → 处置

**症状 A**：`pnpm typecheck` 报 `Cannot find module 'axios'` / `'@unocss/core'` / `'@unocss/preset-mini'`，而该包在别的包内能解析。

- 根因一：**pnpm < 11**。非 auth / registry 的设置只从 `pnpm-workspace.yaml` 读，pnpm 10 只读其中的 `packages`，`shamefullyHoist` 被静默忽略 → 根 `node_modules` 没有传递依赖。详见 [ADR-0001](../adr/0001-pnpm-version-and-explicit-dependencies.md)
- 根因二：**依赖安装不完整**。`ls node_modules/<pkg>` 是空目录，而 `node_modules/.pnpm/<pkg>@*/node_modules/<pkg>` 里有真包 —— 这是安装被中断留下的断链
- 处置：先 `pnpm --version` 确认 ≥ 11；再 `node -e "console.log(require('fs').existsSync('node_modules/<pkg>/package.json'))"` 判断是「缺声明」还是「装坏了」。后者重跑 `pnpm install`，**不要**改 `package.json` 或 eslint 配置

**症状 B**：`eslint .` 报一整片 `Parsing error: Cannot find module '@typescript-eslint/parser'`。

- 根因：与 A 同源，解析器包目录为空壳。**不是代码问题，也不是 eslint 配置问题**
- 处置：重跑 `pnpm install`，然后重测

**症状 C**：`Cannot find module` 之外还跟着一堆 `'xxx' is of type 'unknown'` / `Property 'x' does not exist on type '{}'`。

- 根因：通常是**同一个根因的连带**。一个 `import type` 解析失败会让泛型推断退化（`ResponseData` 推成 `unknown`），下游成片报错
- 处置：先修掉 `Cannot find module`，再重跑看剩余错误。**不要逐条改下游代码**

## 改动范围

- 只改任务需要的文件；不做无关重构，不对无关文件跑格式化
- 不升级依赖版本；不改 `packages/*/package.json` 的 `exports` 与对外类型签名
- 不手改生成物（清单见 [`architecture.md`](./architecture.md#生成物)）
- 需要扩大范围时，先说明原因再动手
- 依赖声明、Gate 配置、`.env*`、生成物与发布这四类改动**先问维护者**（见根 `AGENTS.md`）

## 契约索引

下面每条不变量都只有一个主场，本表只做索引；**规则本身以链接的文件为准**。

| 不变量                                                                            | 主场                                                                    |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 模块边界（视图不直连 HTTP、页面不互引）                                           | [`architecture.md`](./architecture.md#模块边界)                         |
| 生成物清单与重新生成方式                                                          | [`architecture.md`](./architecture.md#生成物)                           |
| 常量路由清单改动即改鉴权前提                                                      | [`auth-security.md`](./auth-security.md#路由守卫流程)                   |
| `refreshToken` 不得返回过期码（否则死循环）                                       | [`api.md`](./api.md#请求内核的不变量)                                   |
| 刷新单飞 + 1s 置空、错误消息去重 + 5s 清栈                                        | [`api.md`](./api.md#请求内核的不变量)                                   |
| 跨用户登录清页签、`resetStore` 的顺序                                             | [`auth-security.md`](./auth-security.md#登录与登出的不变量)             |
| `SetupStoreId` 登记（漏登记用不了 `$reset`）                                      | [`types.md`](./types.md#类型源与新增一个-x-要同步哪几处)                |
| i18n 中英双向满足 `App.I18n.Schema`                                               | [`types.md`](./types.md#类型源与新增一个-x-要同步哪几处)                |
| 布局模式穷尽 `Record`                                                             | [`types.md`](./types.md#几个必须知道的类型事实)                         |
| `VITE_BASE_URL` 子目录以 `/` 结尾、`VITE_ICON_LOCAL_PREFIX` 含 `VITE_ICON_PREFIX` | `.env` 的变量注释；前缀关系见 [`conventions.md`](./conventions.md#图标) |

## 人工回归

没有自动化测试，用户可见行为的改动要人工验证：清单与逐项验证方法见 [`../v2-regression-checklist.md`](../v2-regression-checklist.md)。标 `仅 prod 构建` 的项必须在 `pnpm build` + `pnpm preview` 上验。

## 交付自检报告

改动完成后按这个格式报告：

```
Validation
- fmt:       PASS / FAIL / NOT AVAILABLE
- lint:      PASS / FAIL / NOT AVAILABLE
- typecheck: PASS / FAIL / NOT AVAILABLE
- test:      NOT AVAILABLE（本仓库无测试体系）
- build:     PASS / FAIL / NOT AVAILABLE
```

- 每个 `FAIL` 必须带**归因**：代码问题 / 环境问题 / 配置问题（判定方法见上面的诊断三节）
- 命令不存在就写 `NOT AVAILABLE`，**不要虚构**
- 没能验证的部分显式声明「未验证」，不要用「应该没问题」代替
