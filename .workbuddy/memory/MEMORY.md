# MEMORY.md — 项目长期约定

## 项目

soybean-admin v2.2.0（纯前端 SPA 模板：Vue 3 + Vite + TS + Naive UI + UnoCSS）。pnpm monorepo = 根应用 + `packages/*` 8 个 `@sa/*` 包。
`docs/v3.md` 是**未实现**的 v3 草案，不是改动依据。

## 依赖与 pnpm 版本（最高频的坑）

- **要求 pnpm ≥ 11**：`packageManager: pnpm@11.26.0`、`engines.pnpm >= 11.0.0`。
  非 auth/registry 的设置只能写在 `pnpm-workspace.yaml`（camelCase），**pnpm 10 只读其中的 `packages`、其余静默忽略**
  （实测 `pnpm config get shamefullyHoist`：10.6.2 → `undefined`；11.26.0 → `true`）。原委见 `docs/adr/0001`。
- 所以 `Cannot find module 'axios'` / `'@unocss/core'` 这类报错**先查 pnpm 版本**，不要改业务代码。
- **包内直接 import 的包必须在该包自己的 `package.json` 声明**（workspace 包不会被 hoist）。
  已声明包间依赖 **7 条 / 5 个包**——用技能自带脚本可随时重新枚举（`node <技能目录>/scripts/scan.mjs --root .`），别凭印象写。
- **已知欠账**（补齐属依赖变更，须先问）：`@sa/uno-preset` 缺 `@unocss/core` + `@unocss/preset-mini`；
  根 `src/service/request/index.ts` 缺 `axios` 声明。
- **安装中断的症状**：根 `node_modules` 直接依赖完好，**被 hoist 的传递依赖层出现大量 0 条目空壳**（实测 643 个）。
  判定：`node -e "console.log(require('fs').existsSync('node_modules/<pkg>/package.json'))"` → false 即断链；
  `.pnpm/<pkg>@*/node_modules/<pkg>/` 里包是好的。处置：重跑 `pnpm install`（本机跑法见用户级 MEMORY）。
- **这类故障会报出一串假错误**：`Cannot find module 'axios'` 会让泛型退化，派生出一批「`response.data` 是 `unknown`」式的类型错误。
  **先归因再报告，不要逐条当代码问题**——2026-09-20 依赖修好后，`typecheck`（13 个错误）与 `eslint`（90 个错误）**同时转 PASS**，
  证实了归因。判定方法见 `docs/guides/workflow-validation.md` 的诊断节。

## 需要先问用户才能改的四类文件

① 依赖声明（任何 `package.json` 的 deps / devDeps、`pnpm-lock.yaml`）；② Gate 配置（`.oxlintrc.json`、`eslint.config.js`、
`tsconfig*.json`、`.oxfmtrc.json`、`.github/workflows/*`）；③ `.env*` 变量增删改；④ 生成物与发布
（`CHANGELOG*.md`、各包 `version`、`pnpm-workspace.yaml`）。其余（业务代码、`src/`、`docs/`、`scripts/`）可自主。

## 指令文件布局：根文件是路由器

根 `AGENTS.md`（61 行 / 5.7KB，常读占比 10.1%）= 概览 + 5 条铁律 + 指令优先级 + 场景路由表 + 核心事实源表 + 合入门禁。
形态抄自 unibest（`feige996/unibest` base 分支）。

- `docs/guides/` 6 篇按需读，**每篇是各自场景的唯一事实源**。**刻意不叫 `rules/`**——根文件已有「铁律」这个更高层级的概念，
  再叫 rules 会让人混为一谈；也不要往目录里放 `README.md` 索引（索引就是根文件的表）。
- 收录判据不是「规范还是事实」，而是**「环境能不能表达」**：配置/类型能表达的（格式化参数、scripts 全表、目录树）一律不写
  （抄一遍就是缓存）；表达不了的规范（先问维护者、最小改动）与事实（为何要 pnpm ≥ 11、eslint 只管 `.vue`）才写。
- `packages/AGENTS.md` 是**唯一**的目录级文件（改动 `packages/` 时才读）。**不要再按目录拆**：试过 5 个文件，总量反涨 15% 且规则重复。
- 其余：`CONTEXT.md`（术语表，主场是 `domain-modeling` 技能）、`docs/adr/`（决策记录；新增门槛＝难回退 + 不看会困惑 + 真实取舍）、
  `docs/v2-regression-checklist.md`（人工回归）、`docs/anti-rot-plan.md`（防腐层方案与实测）、
  `docs/agents-md-audit.md`（**一次性审计记录，别当现状**）。

**两条维护纪律**：① 每条规则只住一个文件，其余只放指针（唯一例外是 `workflow-validation.md` 的契约表——它是带「位置」列的索引）；
② 铁律 inline 且可独立执行。
**锚点纪律**：指针指向**文件 + 语义小标题**，不指向章节号——`§5` 这类锚点会随重排静默失效（实测踩过 4 处，均已改）。

## 约束体系的自检与防腐

- **`pnpm agents-check`** → `scripts/check-agents-md.mjs`（零依赖，CI 里不需要 `pnpm install`）：查相对链接可达 ·
  文档里的命令真实存在 · 无章节号指针。CI 已接（`.github/workflows/linter.yml` 的 `agents-md` job）。
  注意原始 `lint` job 的 `FILTER_REGEX_EXCLUDE: (docs|.github)` + `VALIDATE_MARKDOWN: false` 意味着
  **docs 完全不在 super-linter 范围内**——这个 job 是约束文档唯一的门禁。
- **它只防「指针型」腐烂**（链接失效、命令改名、锚点失效）。**防不了**：状态描述失真 · 规则与配置矛盾 ·
  **缺失型**（新增了东西却没人登记，最阴）· 事实本身写错 · 环境与瞬时状态。那几类靠**写作纪律**：
  环境能表达的不抄 / 会变的状态写成「症状→根因→处置」而不是「当前 PASS/FAIL」/ 每条规则只住一处。
  **检查通过 ≠ 文档健康**——与「全仓 lint 0 error 不代表边界规则生效」是同一类错觉。
- **五层防腐的规范定义、`agents-lint` 的完整实测数据与结论都在 `docs/anti-rot-plan.md`**。
  摘要：①写作纪律 ②PR 级漂移检测（`agents-md-drift.yml`）③内容检查（`agents-check`）④定期复核（**已落地**：`linter.yml` 加 `schedule` 每周一 + `workflow_dispatch`）⑤代理级验证（未做）；
  `agents-lint@0.5.0` **已评估、结论不采纳**——对本语料 18 个 error **18/18 全误报**，根 `AGENTS.md` 被它评 `65/100 (D)`
  （**得分衡量「符合它默认假设的程度」，不是准确度**）。别再重跑一遍评估。

## Lint / 格式化真实覆盖范围

- `oxlint`（`correctness` + `suspicious` = error，141 规则）覆盖 `.ts` / `.tsx` / `.vue`。
- **`eslint .` 只匹配 `**/*.vue`**：`eslint src/main.ts` → `File ignored because no matching configuration was supplied`，`.ts` 无 ESLint。
  它强制/告警的写法（type-based props/emits、宏变量固定名、块顺序、`target="_blank"` 必带 `rel` 等）见 `docs/guides/conventions.md`。
- **`.oxlintrc.json` 的 `overrides` 不是合并、是覆盖**：同一文件命中两条时**后一条整体覆盖前一条**。
  曾因此让「视图不直连 HTTP」在 `src/views/**` 下静默失效，而全仓仍是 0 error、毫无信号。
  **给某目录加规则要写进它已有的那条**，加完用临时文件实测触发。
- `@typescript-eslint/no-explicit-any` 为 **off**（`src/` 非生成文件仅 3 处 / 2 文件）。

## 生成物与同步项

- 生成物禁改：`src/router/elegant/*`、`src/typings/elegant-router.d.ts`、`src/typings/components.d.ts`、`CHANGELOG*.md`。
- `vite build` / `vite dev` 会重写 `components.d.ts`（实测会丢条目）——跑完检查 `git status`，必要时 `git checkout --` 还原。
- 新增 env → 同步 `.env*` + `src/typings/vite-env.d.ts`；storage key → `src/typings/storage.d.ts`；
  i18n key → `zh-cn.ts` + **`en-us.ts`**（小写；`App.I18n.Schema` 是类型源）；store → 登记 `SetupStoreId`。
- `.workbuddy/` 已加入 `.oxfmtrc.json` 的 `ignorePatterns`（`pnpm fmt` 不再重写记忆文件）。

## 契约的落点顺序

本仓库代码里**没有任何 `// CONTRACT:` 标记**。新增契约按这个顺序落，能用上面就别用下面：
**类型**（最常用）→ **lint 规则** → **运行时断言**（现有 8 处）→ **注释**（仅 1 处：`src/service/request/index.ts:87` 的
refreshToken 死循环警告；只在「机器表达不了**且**违反后果严重」时成立，且必须同时登记进 `docs/guides` 的不变量表）。
根 `AGENTS.md` 的铁律与 guides 的不变量表都是**摘要 + 位置**，契约本体仍在代码里。

## 已知欠账

- 依赖声明的欠账见上「依赖与 pnpm 版本」一节（属依赖变更，须先问）。
- 防腐第 ⑤ 层（代理级验证 / proof loop）未做，理由见 `docs/anti-rot-plan.md`。
- `docs/anti-rot-plan.md` 是**方案文档**，它的实施状态以文档开头那一行为准。
- 远端：`origin` = `https://github.com/YuanQiii/agents.git`（**私有**）。本机无 SSH key，所以 fetch/push 都走 HTTPS + 凭据管理器；
  加了 key 之后可改回 `git@github.com:YuanQiii/agents.git`。
- **本工作区的 `.git` 有异常**（`git switch -c` 会建出「未出生分支」；`.git` 曾整个变空）——
  处置与恢复流程见用户级 MEMORY，**不要在这个工作区建本地分支**，需要远程分支就用 GitHub API。

## 工具教训

- 同一文件连续多处 `Edit` 时，可能**报告成功但未落盘**（读到旧版本）→ 先整读、再整体 `Write`，最后 grep 逐条核对。
- Windows 上 `node_modules/.bin/*.CMD` 不能直接 `execFileSync`（`EINVAL`）→ 用 `execSync(..., {shell:true})`。
