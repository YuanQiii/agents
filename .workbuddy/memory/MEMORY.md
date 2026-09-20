# MEMORY.md — 项目长期约定

## 项目

soybean-admin v2.2.0（纯前端 SPA 模板：Vue 3 + Vite + TS + Naive UI + UnoCSS）。pnpm monorepo = 根应用 + `packages/*` 8 个 `@sa/*` 包。
`docs/v3.md` 是**未实现**的 v3 草案，不是改动依据。

## 依赖与 pnpm 版本（最高频的坑）

- **要求 pnpm ≥ 11**：`packageManager: pnpm@11.26.0`、`engines.pnpm >= 11.0.0`。
  非 auth/registry 的设置只能写在 `pnpm-workspace.yaml`（camelCase），**pnpm 10 只读其中的 `packages`、其余静默忽略**
  （实测 `pnpm config get shamefullyHoist`：10.6.2 → `undefined`；11.26.0 → `true`）。原委见 `docs/adr/0001`。
  所以 `Cannot find module` 这类报错**先查 pnpm 版本**，不要改业务代码。
- **包内直接 import 的包必须在该包自己的 `package.json` 声明**（workspace 包不会被 hoist）。
  已声明包间依赖 **7 条 / 5 个包**——用 `node <技能目录>/scripts/scan.mjs --root .` 可随时重新枚举，别凭印象写。
- **安装中断的症状**：根 `node_modules` 直接依赖完好，**被 hoist 的传递依赖层出现大量 0 条目空壳**。
  判定 `fs.existsSync('node_modules/<pkg>/package.json') === false`；`.pnpm/` 里包是好的。处置：重跑 `pnpm install`。
  **它会派生一串假错误**（一个 `Cannot find module` 可带出十几个类型错误）——**先归因再报告**，不要逐条当代码问题。
- 诊断方法（症状 → 根因 → 处置）见 `docs/guides/workflow-validation.md`。

## 需要先问用户才能改的四类文件

① 依赖声明（任何 `package.json` 的 deps / devDeps、`pnpm-lock.yaml`）；② Gate 配置（`.oxlintrc.json`、`eslint.config.js`、
`tsconfig*.json`、`.oxfmtrc.json`、`.github/workflows/*`）；③ `.env*` 变量增删改；④ 生成物与发布
（`CHANGELOG*.md`、各包 `version`、`pnpm-workspace.yaml`）。其余（业务代码、`src/`、`docs/`、`scripts/`）可自主。

## 指令文件布局：根文件是路由器

根 `AGENTS.md` = 概览 + 5 条铁律 + 指令优先级 + 场景路由表 + 核心事实源表 + 合入门禁；形态抄自 unibest。**不要写死它的行数/占比**（会腐烂）。

- `docs/guides/` 6 篇按需读，**每篇是各自场景的唯一事实源**。**刻意不叫 `rules/`**——根文件已有「铁律」这个更高层级的概念。
  也不要往目录里放 `README.md` 索引（索引就是根文件的表）。
- 收录判据不是「规范还是事实」，而是**「环境能不能表达」**：配置/类型能表达的（格式化参数、scripts 全表、目录树）一律不写
  （抄一遍就是缓存）；表达不了的规范与事实才写。
- `packages/AGENTS.md` 是**唯一**的目录级文件。**不要再按目录拆**：试过 5 个文件，总量反涨 15% 且规则重复。
- 其余：`CONTEXT.md`（术语表，主场是 `domain-modeling` 技能）、`docs/adr/`（决策记录；新增门槛＝难回退 + 不看会困惑 + 真实取舍）、
  `docs/v2-regression-checklist.md`、`docs/anti-rot-plan.md`（防腐方案与实测）、
  `docs/agents-md-audit.md`（**一次性审计记录，别当现状**）。

**两条维护纪律**：① 每条规则只住一个文件，其余只放指针（唯一例外是 `workflow-validation.md` 的契约表——它是带「位置」列的索引）；
② 铁律 inline 且可独立执行。
**锚点纪律**：指针指向**文件 + 语义小标题**，不指向章节号——`§5` 会随重排静默失效（实测踩过 4 处）。

## 约束体系的自检与防腐

- **`pnpm agents-check`** → `scripts/check-agents-md.mjs`（零依赖，CI 里不需要 `pnpm install`）：查相对链接可达 ·
  文档里的命令真实存在 · 无章节号指针。CI 已接（`linter.yml` 的 `agents-md` job，
  PR / push main / 每周一 `schedule` / `workflow_dispatch` 四种触发）。
- **它只防「指针型」腐烂**。防不了：状态描述失真 · 规则与配置矛盾 · **缺失型**（新增了东西却没人登记，最阴）·
  事实写错 · 环境与瞬时状态。那几类靠**写作纪律**：环境能表达的不抄 / 会变的状态写成「症状→根因→处置」/
  每条规则只住一处。**检查通过 ≠ 文档健康**。
- **五层防腐的规范定义、`agents-lint` 的完整实测数据与结论都在 `docs/anti-rot-plan.md`**。
  摘要：①写作纪律 ②PR 漂移检测（`agents-md-drift.yml`）③内容检查 ④定期复核（已落地）⑤代理级验证（未做）。
  `agents-lint@0.5.0` **已评估、结论不采纳**——对本语料 18 个 error **18/18 全误报**。**别再重跑一遍评估。**

## Lint / 格式化真实覆盖范围

- `oxlint`（`correctness` + `suspicious` = error，141 规则）覆盖 `.ts` / `.tsx` / `.vue`。
- **`eslint .` 只匹配 `**/*.vue`**：`eslint src/main.ts` → `File ignored because no matching configuration was supplied`。
  它强制/告警的写法见 `docs/guides/conventions.md`（该表取值来自第三方共享配置，是本仓库唯一会随依赖升级失真的地方）。
- **`.oxlintrc.json` 的 `overrides` 不是合并、是覆盖**：同一文件命中两条时**后一条整体覆盖前一条**。
  曾因此让「视图不直连 HTTP」在 `src/views/**` 下静默失效，而全仓仍是 0 error、毫无信号。
  **给某目录加规则要写进它已有的那条**，加完用临时文件实测触发。

## 生成物与同步项

- 生成物禁改：`src/router/elegant/*`、`src/typings/elegant-router.d.ts`、`src/typings/components.d.ts`、`CHANGELOG*.md`。
- `vite build` / `vite dev` 会重写 `components.d.ts`（实测会丢条目）——跑完检查 `git status`，必要时 `git checkout --` 还原。
- 同步项：新增 env → `.env*` + `src/typings/vite-env.d.ts`；storage key → `src/typings/storage.d.ts`；
  i18n key → `zh-cn.ts` + **`en-us.ts`**（小写；`App.I18n.Schema` 是类型源）；store → 登记 `SetupStoreId`。
- `.workbuddy/` 已在 `.oxfmtrc.json` 的 `ignorePatterns` 里（`pnpm fmt` 不再重写记忆文件）。

## 契约的落点顺序

代码里**没有任何 `// CONTRACT:` 标记**。新增契约按此序落，能用上面就别用下面：
**类型**（最常用）→ **lint 规则** → **运行时断言**（现有 8 处）→ **注释**（仅 1 处：`src/service/request/index.ts:87` 的
refreshToken 死循环警告；只在「机器表达不了**且**违反后果严重」时成立，且必须同时登记进 guides 的不变量表）。
根文件的铁律与 guides 的不变量表都是**摘要 + 位置**，契约本体仍在代码里。

## 环境与状态的坑（跨项目，详见用户级 MEMORY）

- **本工作区 `.git` 有异常**：`git switch -c` 会建出「未出生分支」；`.git` 曾整个变空。
  **不要在这个工作区建本地分支**，需要远程分支就用 GitHub API；每次提交后立刻推送。
- **`.git` 被重建后 git 钩子会丢**（钩子由 `pnpm install` 的 `prepare` 装）→ `npx simple-git-hooks` 补回。
- **提交前必须先 `pnpm fmt` 再 `git add`**：钩子末步是 `git diff --exit-code`，而 `oxfmt` 会重排 markdown 表格。
- 本机无 SSH key、无 `gh` CLI；代理端口只有 **7897** 可用。跑法见用户级 MEMORY。

## 待决事项

- **依赖声明欠账 2 处**（`@sa/uno-preset` 缺 `@unocss/core` + `@unocss/preset-mini`；根 `src/service/request/index.ts` 缺 `axios`）
  ——**用户 2026-09-20 明确指示先不用管**。
- 防腐第 ⑤ 层（代理级验证）未做，理由见 `docs/anti-rot-plan.md`。

## 远端与分支保护

- `origin` = `https://github.com/YuanQiii/agents.git`，**公开仓库**（2026-09-20 由私有转公开）。
- `main` **已开启分支保护**：要求 PR + 1 个 code owner 审批、禁 force push 与删除分支；**`enforce_admins: false`（管理员可直推）**。
  配置在 GitHub 仓库设置里，仓库内查不到当前值——核对：`GET /repos/{owner}/{repo}/branches/main/protection`。
  **转公开的原因**：私有仓库上 branch protection 与 rulesets 都要求 GitHub Pro（两个接口原本都返回 403）。
- `.github/CODEOWNERS` 覆盖约束文档与门禁配置。它是防腐**第 ① 层的人工过目**机制，**不替代 Gate**——
  见 `docs/anti-rot-plan.md` 第 ① 层与 `docs/guides/workflow-validation.md` 的「分支保护」。
- 本机无 SSH key，push 走 HTTPS + 凭据管理器；GitHub 传输一律经代理 **7897**。

## 工具教训

- 同一文件连续多处 `Edit` 时，可能**报告成功但未落盘**（读到旧版本）→ 先整读、再整体 `Write`，最后 grep 逐条核对。
