# MEMORY.md — 项目长期约定

> 只留**环境查不到、且跨会话仍成立**的东西；能写进仓库文档的一律只放指针。仓库文档才是约束的事实源。

## 项目

soybean-admin v2.2.0，纯前端 SPA（Vue 3 + Vite + TS + Naive UI + UnoCSS），pnpm monorepo = 根应用 + `packages/*` 8 个 `@sa/*` 包。
`docs/v3.md` 是**未实现**的 v3 草案，不是改动依据。

## 依赖与 pnpm（最高频的坑）

- **要求 pnpm ≥ 11**（`packageManager: pnpm@11.26.0`）。非 auth / registry 设置只从 `pnpm-workspace.yaml` 读（camelCase），
  **pnpm 10 只读其中的 `packages`、其余静默忽略**（实测 `pnpm config get shamefullyHoist`：10.6.2 → `undefined`；11.26.0 → `true`）。
  → 见到 `Cannot find module` **先查 pnpm 版本**，不要改业务代码。原委见 `docs/adr/0001`。
- **包内直接 import 的包必须在该包自己的 `package.json` 声明**（workspace 包不会被 hoist）。
  已声明 7 条 / 5 个包——用 `node <技能目录>/scripts/scan.mjs --root .` 重新枚举，别凭印象写。
- **安装中断的症状**：根直接依赖完好，**被 hoist 的传递依赖层变成 0 条目空壳**。
  判定 `fs.existsSync('node_modules/<pkg>/package.json') === false`；`.pnpm/` 里包是好的。处置：重跑 `pnpm install`。
  **它会派生一串假错误**（一个 `Cannot find module` 带出十几个类型错误）→ 先归因再报告。
- 完整的「症状 → 根因 → 处置」见 `docs/guides/workflow-validation.md`。

## 先问用户才能改的四类

① 依赖声明（任何 `package.json` 的 deps / devDeps、`pnpm-lock.yaml`）；② Gate 配置（`.oxlintrc.json`、`eslint.config.js`、
`tsconfig*.json`、`.oxfmtrc.json`、`.github/workflows/*`）；③ `.env*` 变量增删改；④ 生成物与发布（`CHANGELOG*.md`、
各包 `version`、`pnpm-workspace.yaml`）。其余（业务代码、`src/`、`docs/`、`scripts/`）可自主。

## 指令文件布局

根 `AGENTS.md` = 概览 + 5 条铁律 + 指令优先级 + 场景路由表 + 核心事实源表 + 合入门禁。形态抄自 unibest。
**不要写死它的行数 / 常读占比**（这类状态会腐烂）。

- `docs/guides/` 6 篇按需读，**每篇是各自场景的唯一事实源**。**不叫 `rules/`**——根文件已有「铁律」这个更高层级的概念，
  再叫 rules 会混为一谈；目录内也不要放 `README.md` 索引（索引就是根文件的表）。
- 收录判据是**「环境能不能表达」**：配置 / 类型能表达的（格式化参数、scripts 全表、目录树）一律不写（抄一遍就是缓存）；
  表达不了的规范与事实才写。
- `packages/AGENTS.md` 是**唯一**的目录级文件。**不要再按目录拆**：试过 5 个文件，总量反涨 15% 且规则重复。
- 其余：`CONTEXT.md`（术语表，主场是 `domain-modeling` 技能）、`docs/adr/`（新增门槛＝难回退 + 不看会困惑 + 真实取舍）、
  `docs/v2-regression-checklist.md`、`docs/anti-rot-plan.md`、`docs/agents-md-audit.md`（**一次性记录，别当现状**）。

**三条纪律**：① 每条规则只住一个文件，其余只放指针（唯一例外是 `workflow-validation.md` 的契约表——它是带「位置」列的索引）；
② 铁律 inline 且可独立执行；③ 指针指向**文件 + 语义小标题**，不指向章节号——`§5` 会随重排静默失效（实测踩过 4 处）。

## 约束体系的自检与防腐

- `pnpm agents-check` → `scripts/check-agents-md.mjs`（零依赖，CI 里不需要 `pnpm install`）：查相对链接可达 ·
  文档里的命令真实存在 · 无章节号指针。CI 四种触发：PR / push main / 每周一 `schedule` / `workflow_dispatch`。
- **它只防「指针型」腐烂**。防不了：状态描述失真 · 规则与配置矛盾 · **缺失型**（新增了东西却没人登记，最阴）·
  事实写错。那几类靠**写作纪律**。**检查通过 ≠ 文档健康。**
- **五层防腐的规范定义、`agents-lint` 的完整实测数据与结论都在 `docs/anti-rot-plan.md`**。
  摘要：①写作纪律 ②PR 漂移检测 ③内容检查 ④定期复核（已落地）⑤代理级验证（未做）；
  `agents-lint@0.5.0` **已评估、结论不采纳**（对本语料 18 个 error **18/18 全误报**）。**别再重跑一遍评估。**

## Lint 覆盖的真实边界

- `oxlint`（`correctness` + `suspicious`，141 规则）覆盖 `.ts` / `.tsx` / `.vue`；**`eslint .` 只匹配 `**/*.vue`**（`.ts` 无 ESLint）。
- **`.oxlintrc.json` 的 `overrides` 不是合并、是覆盖**：同一文件命中两条时**后一条整体覆盖前一条**。
  曾因此让「视图不直连 HTTP」在 `src/views/**` 下静默失效，而全仓仍是 0 error、毫无信号。
  → **给某目录加规则要写进它已有的那条**，加完用临时文件实测触发。
- 具体规则清单见 `docs/guides/conventions.md`（那张表是本仓库唯一会随第三方配置升级而失真的地方）。

## 生成物与同步项

- 禁改生成物：`src/router/elegant/*`、`src/typings/elegant-router.d.ts`、`src/typings/components.d.ts`、`CHANGELOG*.md`。
  `vite dev` / `vite build` 会重写 `components.d.ts`（实测会丢条目）——跑完检查 `git status`。
- 同步项：新增 env → `.env*` + `src/typings/vite-env.d.ts`；storage key → `src/typings/storage.d.ts`；
  i18n key → `zh-cn.ts` + **`en-us.ts`**（小写）；store → 登记 `SetupStoreId`。
- `.workbuddy/` 已在 `.oxfmtrc.json` 的 `ignorePatterns` 里。

## 远端与分支保护

- `origin` = `https://github.com/YuanQiii/agents.git`，**公开仓库**（2026-09-20 由私有转公开）；`main` **已开分支保护**
  （要求 PR + 1 个 code owner 审批、禁 force push 与删除分支；**`enforce_admins: false`，管理员可直推**）。
  配置在 GitHub 仓库设置里、仓库内查不到——核对 `GET /repos/{owner}/{repo}/branches/main/protection`。
  **私有仓库开保护需 GitHub Pro**（branch protection 与 rulesets 都是）。
- `.github/CODEOWNERS` 覆盖约束文档与门禁配置，是防腐**第 ① 层的人工过目**机制——
  **不替代 Gate**（拦不住管理员，也不检查内容质量）。见 `docs/anti-rot-plan.md` 第 ① 层。

## 环境与状态的坑（跨项目细节见用户级 MEMORY）

- **本工作区 `.git` 有异常**（`git switch -c` 建不出分支 ref；`.git` 曾整个变空）→
  **不要在这里建本地分支**，远程分支走 GitHub API；每次提交后立刻推送。`.git` 重建后 git 钩子会丢，用 `npx simple-git-hooks` 补回。
- **提交顺序必须是 `pnpm fmt` → `git add` → commit**：钩子末步是 `git diff --exit-code`（要求工作区与索引一致），
  而 `oxfmt` 会重排 markdown 表格列宽。
- 本机无 SSH key、无 `gh` CLI；GitHub 传输只能走代理 **7897**（环境变量里的 4780 是坏的）。

## 待决事项

- **依赖声明欠账 2 处**（`@sa/uno-preset` 缺 `@unocss/core` + `@unocss/preset-mini`；根 `src/service/request/index.ts` 缺 `axios`）
  ——**用户 2026-09-20 明确指示先不用管**。
- 防腐第 ⑤ 层（代理级验证）未做，理由见 `docs/anti-rot-plan.md`。

## 工具教训

- 同一文件连续多处 `Edit` 时，可能**报告成功但未落盘** → 改完必须逐条 `grep -cF` 核对
  （用 `grep -F`，且注意反引号写在双引号里会被 shell 当命令替换，会得到假的「未命中」）。
- Windows 上不能直接 `execFileSync` 跑 `node_modules/.bin/*.CMD`（`EINVAL`）→ 用 `execSync(..., {shell:true})`。
