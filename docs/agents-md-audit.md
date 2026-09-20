# AGENTS.md Audit Report

> **状态：一次性审计记录（2026-09-18），不是长期有效的现状描述。**
> 报告中的结论与「已应用修复」在当时已完成；后续的结构调整（根文件精简、目录级 `AGENTS.md` 下沉、`CONTEXT.md` 与 ADR 的引入）见 [`docs/adr/`](./adr/)。阅读当前约束请以根 `AGENTS.md` 为准，不要以本文件的状态表为准。

> 审计对象：仓库根 `AGENTS.md`（**修订前**版本，392 行 / 34.5 KB）
> 审计基线：`soybean-admin v2.2.0` 当前工作区
> 审计方法：每条规则回到代码 / 配置 / CI 取证，不以 `AGENTS.md` 自身为判断依据
> 本报告 §8 记录本次审计后已应用的修复；§4–§7 描述的是修订前的判定结果

---

## 1. Summary

这份 `AGENTS.md` 的**骨架是健康的**：分层与调用方向、生成物清单、业务码契约、验证命令全部有据可查，且对 `docs/v3.md`（未实现草案）的防幻觉提示、合同类型「未发现明确约定 / 不存在」的写法是本文件最有价值的部分。但**存在 6 处必须修复的问题**：1 处对仓库事实的**错误陈述**（`packages` 包间依赖清单）、1 处**与事实相反的规范**（导出风格）、1 处**覆盖范围被夸大的规范**（SFC 单根元素）、1 个**永久失败的 Gate 未给出处置规则**（`typecheck`）、**未说明 ESLint 只覆盖 `.vue`**，以及**未定义指令优先级**。此外有多处机器已强制的细节被重复抄写（formatter 参数、npm scripts），以及 6 条重要工程约束缺失。

---

## 2. Critical Issues

### C1 — `§5 Module Boundaries` 的包间依赖清单与仓库事实不符 `UNSUPPORTED`

原文：

```
- `@sa/materials` → `@sa/color`
- 其余包当前无包间依赖
```

实测 `packages/*/package.json`：

| 声明                        | 实际情况                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@sa/materials → @sa/color` | **未声明**。`@sa/materials` 的 dependencies 只有 `@sa/utils` + `simplebar-vue`；`@sa/color` 是 `packages/materials/src/libs/page-tab/shared.ts:1` 的**未声明引用**（幽灵依赖） |
| 「其余包无包间依赖」        | **错误**。`@sa/alova → @sa/utils`、`@sa/color → @sa/utils`、`@sa/materials → @sa/utils` 均已声明                                                                               |

**影响**：Agent 会基于错误的依赖图做「能不能引用」的判断，并把一个真实的幽灵依赖当成合法声明。
**修复**：改为准确的「已声明依赖」表，并把幽灵依赖单独标注（已应用，见 §8）。

---

### C2 — `typecheck` Gate 永久失败，但缺少处置规则 `PARTIALLY_SUPPORTED`

现状：`pnpm typecheck` → exit 2；而 `pre-commit` = `pnpm typecheck && pnpm lint && pnpm fmt && git diff --exit-code`，**第一步即中止，等于所有提交都被拒绝**。

原 `AGENTS.md` 只在状态表里记录了 FAIL，却没有任何行为约束，Agent 可能：(a) 误报「验证全部通过」；(b) 用 `--no-verify` 绕过；(c) 自行改 `package.json` 修依赖（越界）。

**修复**：明确「禁止 `--no-verify`」「Gate 失败先区分是本次改动还是仓库既有状态」「修 `package.json` 属需用户确认的独立任务」「不得声称验证通过」（已应用）。

---

### C3 — `§6` 「导出优先具名导出」与仓库事实相反 `UNSUPPORTED`

原文：「导出优先具名导出；`index.ts` 用 `export * from './xxx'` 汇总」。

实测：`export default` 是 `packages/hooks`（`useBoolean` / `useTable` / `useLoading` / `useContext` / `useCountDown` / `useSvgIconRender` / `use-request`）、`packages/materials`（`AdminLayout` / `PageTab` / `SimpleScrollbar`）、`packages/uno-preset`（`presetSoybeanAdmin`）、`packages/alova`（`adapterFetch`）的**主流导出方式**；且 `packages/hooks/src/index.ts` 用的是 `export { ... }` 具名重导出，而非 `export * from`（`export * from` 只在 `packages/utils`、`src/service/api`、`src/plugins` 等处以汇总形式出现）。

**影响**：Agent 若照此规则「统一导出风格」，会大面积改造既有文件（同时违反 §13 最小改动）。
**修复**：改为「跟随所在目录既有风格，不为统一风格改造既有文件」，并如实描述三种并存风格（已应用）。

---

### C4 — `§6` 「页面 SFC 只允许单个根元素」覆盖范围被夸大 `PARTIALLY_SUPPORTED`

用 `@vue/compiler-sfc` 实测 `src/` + `packages/` 共 90 个 `.vue`：**20 个模板为多根**（`svg-icon.vue` = 2 根、`global-settings.vue` = 3 根），全部位于 `src/components/` 与 `src/layouts/`。

该规则的真实来源与机制是：`.vscode/vue3.code-snippets` 的注释（「page only one root element」）+ `vite-plugin-vue-transition-root-validator`（捕获 **`<Transition>` 子节点**的多根警告，见其 package.json description）。它并非对全部 SFC 生效的 Vue 限制。

**修复**：限定为「`src/views/**` 的页面」，并注明真实机制与「组件/布局不受此约束」（已应用）。

---

### C5 — 未说明 ESLint 只覆盖 `**/*.vue`，导致规则强度误判 `UNSUPPORTED`

实测 `eslint src/main.ts` →

```
0:0  warning  File ignored because no matching configuration was supplied
```

`@soybeanjs/eslint-config-vue` 导出的配置只在 `files: ["**/*.vue"]` 上挂规则；`.ts` / `.tsx` 完全由 `oxlint`（`correctness` + `suspicious`）覆盖。

**影响**：原 `§6` 把 `import type` 等写成全局约定，Agent 会误以为 `.ts` 文件里违反了会被拦住（实际不会），也会误判「lint 通过」等于「TS 风格没问题」。
**修复**：在 §6 与 §12 都写明覆盖范围（已应用）。

---

### C6 — 未定义指令优先级，`§15`「以配置文件为准」与开篇「最高层级入口」冲突 `AMBIGUOUS`

开篇称本文件是「整个仓库的最高层级 AI 编程工程约束入口」，§15 又称「以配置文件为准」。同时仓库内还存在 `.workbuddy/memory/*`、`docs/v3.md`、`README.md` 等文本，均未给出相对优先级。

**修复**：新增显式优先级链 `可执行 Gate > 项目配置 > 目录级 AGENTS > 根 AGENTS > 通用材料`，并说明 `.workbuddy/memory/*` 不构成规则（已应用）。

---

## 3. Findings by Phase

### Phase 6 — Duplication（`WARN`）

机器已可靠表达的细节被抄进文档，违反审计原则 3：

| 位置                                                              | 重复对象                                                    | 处置建议                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| `§6` 格式参数表（2 空格 / 120 / 单引号 / 无尾逗号 / arrowParens） | `.oxfmtrc.json` + `.editorconfig`（且 `pnpm fmt` 会自动改） | 改为「交给 oxfmt，不要手写相悖格式」一句 + 指向配置 |
| `§12` 全量 npm scripts 表                                         | `package.json`                                              | 保留「只用真实存在的命令」约束，表体可精简          |
| `§1` 技术栈版本号                                                 | `package.json`（且会随升级腐化）                            | 改为分类描述，不写版本号                            |
| `§14` 登出时序 / 刷新单飞                                         | 与 `§9` 重复                                                | 去重，§14 只留不变量                                |
| `§16` 自检清单                                                    | 与 `§13` 范围检查重叠                                       | 合并或交叉引用                                      |

已处理：格式表、版本号、§14/§16 去重、§12 表体（见 §8）。

### Phase 7 — Contradiction（`WARN`）

| #   | 冲突                                                                            | 位置             | 处置                                               |
| --- | ------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------- |
| 1   | §7「`any` 未被禁止（可用）」↔ §16「是否破坏类型安全（新增 `any`）」             | 同一行为两种判定 | 统一为「仅允许泛型/边界场景 + 交付说明给出理由」   |
| 2   | §11「改动必须人工验证（`pnpm dev` 后走通受影响路径）」↔ §12 `typecheck` 必失败  | 操作层冲突       | C2 处置 + 给出可判定的最小验证标准                 |
| 3   | §3.4「不改生成物」↔ §12「build 会改写 `components.d.ts`，完成后确认保留或还原」 | 未给出明确动作   | 明确「无关差异应 `git checkout` 还原，不顺手提交」 |
| 4   | §13「不重排 import」↔ §12「`pnpm fmt` / `lint --fix` 会改文件」                 | 潜在冲突         | 补充「执行前确认工作区干净，执行后检查 diff 越界」 |

无 **Scope 冲突**（未出现「最小改动」与「同步更新所有相关模块」并存的表述）、无 **Tooling 冲突**（pnpm 与 `engines` + README 一致，未出现 npm/yarn 混用描述）。

### Phase 8 — AI Executability（`WARN`）

可执行性整体较好（几乎每条规则都锚定了文件或命令），但仍有 7 处无判定标准：

| 原文                                 | 问题           | 建议改写                                                                            |
| ------------------------------------ | -------------- | ----------------------------------------------------------------------------------- |
| 「引入 `any` 需要理由」              | 「理由」无标准 | 「只允许出现在泛型边界/第三方类型适配处，并在交付说明写出该处为什么无法精确类型化」 |
| 「不做无关重构」                     | 无阈值         | 「无直接关联的重命名、格式、目录搬迁一律不做」                                      |
| 「非平凡逻辑写 JSDoc」               | 非平凡无定义   | 「导出的函数/组合式 API 必须有 JSDoc 且含 `@param`」                                |
| 「`pnpm dev` 启动后走通受影响路径」  | 「走通」无标准 | 见 Phase 8 修订后的 5 条最小判定标准                                                |
| 「避免引入只有本地才成立的特殊逻辑」 | 无判定标准     | 「涉及本地路径 / 本地服务 / 个人偏好的改动不提交」                                  |
| 「确认生成物差异是否需要保留或还原」 | 无决策规则     | 「与本次任务无关的生成物差异一律还原」                                              |
| 「是否引入新的技术债」               | 类别未枚举     | 枚举为「注释掉的代码 / 遗留调试输出 / 越界 TODO」                                   |

### Phase 9 — Constraint Strength（`WARN`）

`HARD`（有机器验证）覆盖的规则：`script setup` 块顺序、components 名 PascalCase、props/emits 类型式声明、宏变量名、`import type`（仅 `.vue`）、`_` 未使用前缀、`nextTick` promise、`target="_blank"` 的 `rel`、`no-use-before-define`、env/storage/route-meta 的类型同步、i18n 双向 Schema、`SetupStoreId` 与 `$reset`、布局模式穷尽 `Record`。

**问题**：这些 HARD 规则中，有 **9 条要求原文件完全没有提到**，另有 **4 条原文件只写成「约定」而实为 ESLint 强制/告警**（`vue/block-order`、`vue/component-api-style`、`vue/component-options-name-casing` + `vue/prefer-define-options`、`@typescript-eslint/consistent-type-imports`），而文件里大量篇幅用于描述 SOFT 约定。

`SOFT`（纯约定、无机制）且值得转化的候选：

- 「视图层不直接发起 HTTP」→ 可用 `eslint` 的 `no-restricted-imports` 或 oxlint 自定义规则；当前无机制，**建议保留为约定但标明 SOFT**（已应用）。
- 「页面互不引用」→ 同上。
- 「`refreshToken` 不得返回过期码」→ 无法静态检查，**建议在 `onBackendFail` 加运行时断言或 dev 期警告**，把文档约束升级为运行时可观测。

### Phase 10 — Engineering Contract（`PASS`）

`§14` 是原文件质量最高的一节：15 条不变量均给出文件级位置，且明确「不要为普通函数批量添加 `// CONTRACT:` 注释」。符合审计原则「Contract 不应全部依赖注释」。

可提升项：多数 Contract 的保障机制仍是**文档**。建议按「能否机器化」二次分流：

- 可机器化：常量路由清单（可用类型或单测）、布局模式穷尽 `Record`（已由类型保障）、i18n 同步（已由类型保障）→ 标注为 Gate 即可。
- 不可静态化：`refreshToken` 死循环、主题缓存 `BUILD_TIME` 覆盖 → 保留文档 + 建议加 dev 期断言。

### Phase 11 — Instruction Priority（`WARN`）

- 其他 AI 指令文件：**不存在**（无 `CLAUDE.md` / `.cursorrules` / `.github/instructions` / 子目录 `AGENTS.md`）→ 无文件级冲突。
- 潜在冲突面：`README.md`（已过时描述「集成 eslint, prettier」）、`docs/v3.md`（未实现方案）、`.workbuddy/memory/*`（工作区笔记）→ 均已在 §3 用优先级链覆盖（已应用）。
- 与 CI 冲突：CI 只跑 super-linter，不跑 `typecheck` / `build`，因此本文件的 Gate 严于 CI —— 这是合理的，但需说明「CI 不代表本地 Gate」。（建议补，未强制）

### Phase 12 — Token Efficiency（`WARN`）

修订前：392 行 / 34.5 KB，约 9.6 K tokens。最大块：§2 树(50) + §12(41) + §8(36) + §6(31) + §16(29) + §15(26)。

`LOW-VALUE CONTEXT` 认定：

- §1 技术栈版本号逐项罗列（`package.json` 可读，且会腐化）
- §6 格式参数表（oxfmt 已强制）
- §12 全量 scripts 表（`package.json` 可读）
- §16 清单（与 §13 重叠）
- §10「`localStorage` 无 XSS 防护」（通用知识，非仓库特定）
- §11 的 `docs/v3.md §5.9` 隐形能力长清单（来源是未实现草案）

**修订后实测：398 行 / 37.2 KB**——篇幅**未下降**，原因是本次补入了 6 条缺失约束（含 8 条 lint 强制项）与幽灵依赖表，增量大于压缩量。坦白说这是一次「内容密度提升、体量持平」的修订。若以根文件精简为目标，下一步应做**下沉**而非继续压缩（见 §9）。

---

## 4. Rule Verdict Index

按节的整体判定（SUPPORTED 项未逐条列出）：

| 节                        | 判定                  | 主要依据                                                                                                                           |
| ------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| §1 Project Overview       | `PARTIALLY_SUPPORTED` | 版本表可 `package.json` 验证；「文档语言」表述原为歧义（README 双语、locale 中文、注释英文）；`docs/v3.md` 警告 SUPPORTED 且高价值 |
| §2 Repository Structure   | `SUPPORTED`           | 生成物三件套属实；「不存在」清单逐项核实为空；**遗漏 `CHANGELOG*.md` 生成物**                                                      |
| §3 Development Principles | `PARTIALLY_SUPPORTED` | 依赖精确版本属实；「模板即脚手架」无判定标准；原缺幽灵依赖原则与优先级链                                                           |
| §4 Architecture           | `SUPPORTED`           | 入口顺序、守卫链顺序、6 种布局模式、5 个 store 均与代码一致                                                                        |
| §5 Module Boundaries      | `UNSUPPORTED`         | 包间依赖清单错误（C1）；「未发现强制」的判断正确                                                                                   |
| §6 Coding Conventions     | `UNSUPPORTED`         | 导出风格（C3）、单根元素（C4）、`import type` 范围（C5）；漏 8 条 lint 强制项                                                      |
| §7 Type Safety            | `PARTIALLY_SUPPORTED` | `packages` 全为 `noUnusedLocals: true`（8/8 核实）；「`any` 只在 3 处」实为 4 处/3 文件；`any` 措辞与 §16 冲突                     |
| §8 API and Data Contracts | `SUPPORTED`           | `{code,msg,data}`、四类业务码、flat request、新增接口三步、代理前缀、json5 均与代码一致                                            |
| §9 Error Handling         | `SUPPORTED`           | `onBackendFail` 顺序、`errMsgStack`、单飞刷新、空 catch 先例均可验证                                                               |
| §10 Security              | `PARTIALLY_SUPPORTED` | 鉴权三处、无 `v-auth`、apifoxToken 提示属实；「先在 PR 中说明威胁模型」属**本文件自加要求**（PR 模板无此栏）；含通用知识           |
| §11 Testing               | `SUPPORTED`           | 无框架 / 无文件 / CI 不跑 test 全部核实；`v3.md §5.9` 清单来源偏弱                                                                 |
| §12 Validation Commands   | `PARTIALLY_SUPPORTED` | 命令与钩子属实（含实测状态）；缺 ESLint 覆盖范围；状态表时间敏感                                                                   |
| §13 Change Scope          | `SUPPORTED`           | 与 Gate 的张力需一句消歧                                                                                                           |
| §14 Engineering Contracts | `SUPPORTED`           | 15 条不变量全部有文件级出处；与 §9 有重复                                                                                          |
| §15 AI Agent Workflow     | `SUPPORTED`           | 与仓库实际命令一致；「禁止看到问题立即修改」为口号，可执行部分在 7 步中                                                            |
| §16 Final Verification    | `PARTIALLY_SUPPORTED` | 报告格式清晰；「技术债」等 2 项不可判定                                                                                            |

无 `SUPPORTED` 之外的**幻觉项**（编造的 script / 目录 / 测试框架 / CI / 数据库 / 工具 / 依赖 / 命名规范）——经 Phase 3 逐项比对，未发现任何不存在的命令或路径。

---

## 5. Missing Constraints（Phase 13）

按「仓库存在证据」筛选，以下 6 项重要约束原文件未覆盖：

1. **`CHANGELOG.md` / `CHANGELOG.zh_CN.md` 是生成物**。证据：`packages/scripts/src/commands/changelog.ts` 调用 `@soybeanjs/changelog`；`.github/workflows/release.yml` 在 tag `v*` 时执行 `npx githublogen`；文件结构为自动生成格式。→ 应进禁改清单。
2. **各包 `version` 由 `sa release` 统一升级**。证据：`release.ts` 中 `versionBump({ files: ['**/package.json', ...], tag: true, commit: 'chore(projects): release v%s' })`。→ 不应手改单体版本号。
3. **ESLint 覆盖范围 = 仅 `**/\*.vue`\*\*（C5）。
4. **原文完全未提及的 ESLint 强制/告警项（9 条要求 / 10 个规则）**：`vue/define-props-declaration` / `vue/define-emits-declaration`（`type-based`）、`vue/require-macro-variable-name`（`props` / `emit` / `slots` / `attrs`）、`vue/custom-event-name-casing`、`vue/prop-name-casing`、`vue/next-tick-style`、`vue/no-template-target-blank`（error）、`vue/padding-line-between-blocks`、`@typescript-eslint/no-unused-vars` 的 `^_` 前缀、`@typescript-eslint/no-use-before-define`。另有 4 条原文提及但应升级为 Gate 标注（`vue/block-order`、`vue/component-api-style`、`vue/component-options-name-casing` + `vue/prefer-define-options`、`@typescript-eslint/consistent-type-imports`）。
5. **`sa` CLI 的配置扩展点**：`packages/scripts/src/config/index.ts` 用 c12 `loadConfig({ name: 'soybean' })`，根目录可放 `soybean.config.ts`（当前不存在）覆盖 `cleanupDirs` / `gitCommitVerifyIgnores` 等默认行为。
6. **`.env` 中两条硬约束**（注释明确写出，未进文档）：`VITE_BASE_URL` 子目录必须以 `/` 结尾；`VITE_ICON_LOCAL_PREFIX` 必须包含 `VITE_ICON_PREFIX`。

另有 2 项**低优先**：

- 未使用的 `console` 约定：`src/utils/service.ts:15` 有 `// eslint-disable-next-line no-console`，说明存在「不随意 `console`」的意图，但无规则强制、且 `no-console` 未启用 → 建议写「无明确约定」而非新造规则。
- 浏览器支持范围（README：Chrome / Edge / FF / Safari 最近两版）→ 影响可用 JS/CSS 特性，可作为 KNOWLEDGE 提示。

全部 6 项主要约束已在本次修订中补入。

---

## 6. Score

| Dimension                | Result |
| ------------------------ | ------ |
| Repository Accuracy      | WARN   |
| Scope                    | WARN   |
| Clarity                  | WARN   |
| Duplication              | WARN   |
| Contradiction            | WARN   |
| Executability            | PASS   |
| Architecture Constraints | WARN   |
| Contract Coverage        | PASS   |
| Validation               | WARN   |
| Token Efficiency         | WARN   |

**评分说明**

- **Repository Accuracy = WARN**：C1/C3/C4 三处事实性偏差；其余内容准确度高，且「不存在」清单可有效防幻觉。
- **Scope = WARN**：根文件包含可下沉内容（§2 树、§12 表、§11 长清单、§8 细节）；但未出现「单个模块业务规则」「Skill 执行步骤」「大量教程」等典型越界。
- **Clarity = WARN**：7 处无判定标准的表达（Phase 8）。
- **Duplication = WARN**：5 处与机器已表达的配置重复（Phase 6），未到 FAIL（未整节复述 README / Schema）。
- **Contradiction = WARN**：4 处内部张力，无 Scope / Tooling 冲突。
- **Executability = PASS**：规则几乎全部锚定具体文件或命令，改写建议属优化而非缺失。
- **Architecture Constraints = WARN**：边界判断诚实（自陈「未发现强制」），但 C1 的错误清单会直接误导；且可机器化的边界仍未转化。
- **Contract Coverage = PASS**：15 条不变量 + 明确反对形式化注释，显著优于常见水平；机制层可再提升。
- **Validation = WARN**：命令真实且状态实测，但 Gate 永久失败未给处置规则、覆盖范围未说明、状态表会腐化。
- **Token Efficiency = WARN**：篇幅持平未降（见 Phase 12），但章节导航成本低。

---

## 7. Applied Fixes（本次已改动，不改变审计结论的事实层）

| #   | 对应问题       | 修复                                                                                                                                                                  |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | C1             | §5 换成实测的「已声明依赖」表（8 个包全覆盖），并单列「已知未声明跨包引用」：`@sa/materials → @sa/color`                                                              |
| 2   | C2             | §12 新增「禁止 `--no-verify`」；Gate 失败须区分本次改动 vs 仓库既有状态；不得声称验证通过；`typecheck` 失败标注为需用户决策的独立任务                                 |
| 3   | C3             | §6 如实描述三种并存导出风格，改为「跟随所在目录既有风格，不为统一风格改造既有文件」                                                                                   |
| 4   | C4             | §6 单根元素限定为 `src/views/**`，注明真实机制（`vite-plugin-vue-transition-root-validator`）与实测数据（90 个 `.vue` 中 20 个多根，均在 `components/` / `layouts/`） |
| 5   | C5             | §6、§12 两处写明 ESLint 仅覆盖 `**/*.vue`，`.ts` 由 oxlint 覆盖                                                                                                       |
| 6   | C6             | §3 新增显式优先级链（Gate > 配置 > 目录级 > 根 > 通用材料），并说明 `.workbuddy/memory/*` 不构成规则                                                                  |
| 7   | §5 Missing 1/2 | §2 禁改清单补 `CHANGELOG*.md`；§13/§14 补「版本由 `sa release` 统一升级」                                                                                             |
| 8   | §5 Missing 4   | §6 新增「受 ESLint / oxlint 强制或告警的项」小节（含 9 条原文缺失的 Gate，并把 4 条约定升级为 Gate 标注）                                                             |
| 9   | §5 Missing 5/6 | §14 补「CLI 配置扩展 `soybean.config.ts`」；§8 补 `VITE_BASE_URL` 尾斜杠与 `VITE_ICON_LOCAL_PREFIX` 约束                                                              |
| 10  | Phase 6 去重   | §1 去掉逐项版本号；§6 格式表改为一句 + 指向配置；§14 去掉与 §9 重复的条目；§16 去重 §13                                                                               |
| 11  | Phase 7 冲突   | 统一 `any` 措辞；明确生成物差异「一律还原」；补 `--fix` 越界 diff 的处理                                                                                              |
| 12  | Phase 8 歧义   | 7 处模糊表达改写为可判定标准（含 §11 的 5 条最小人工验证标准）                                                                                                        |
| 13  | Phase 9        | 「视图层不直接发 HTTP」「页面互不引用」明确标注为 SOFT 约定而非 Gate；`refreshToken` 契约建议加 dev 期断言                                                            |
| 14  | Phase 10/11    | 新增 §3.4「直接 import 的包必须显式声明依赖」原则；§10 自加要求显式标注为「本文件新增的流程要求」                                                                     |

**未改动业务代码**；未创建子目录 `AGENTS.md`（仅在文末给出建议）。

---

## 8. 下一步建议（未执行）

> **后续修订（2026-09-18）**：本条建议的「下沉」方案最终**只保留了 `packages/AGENTS.md` 一个子文件**。
> `src/service/`、`src/views/`、`build/` 的内容已折回根文件并删除重复表述——理由：这三处的内容对多数 `src/` 读者都是必需的（尤其「加一个接口」是本模板最高频任务），下沉到需要被指路才能读到的文件反而降低可发现性，并引入跨文件漂移风险。
> 根文件最终 274 行（未达 200 行目标，差额是新增的 lint 强制项与契约表），两文件合计 315 行，低于原单文件的 392 行。

按收益排序：

1. ~~**下沉**（解决 Scope / Token Efficiency 的根本手段）：
   - `packages/AGENTS.md`（含依赖表与幽灵依赖规则）、`src/service/AGENTS.md`（含业务码表）、`src/views/AGENTS.md`（含表格/表单范式）——根文件可退回 200 行内。
   - `§11` 的 `v3.md §5.9` 长清单移入 `docs/`，根文件只留链接。~~
     **已被上述修订取代**：只保留 `packages/AGENTS.md`；v3 清单仍按原建议移入 `docs/v2-regression-checklist.md`。
2. **把可机器化的边界转成 Gate**：为「视图不直连 HTTP」「页面互不引用」加 `no-restricted-imports`；为「常量路由清单」加一个最小单测（需先与用户确认测试框架，见 §11）。
3. **消除幽灵依赖**：`@sa/uno-preset` 声明 `@unocss/core` / `@unocss/preset-mini`，`@sa/materials` 声明 `@sa/color`；顺带修 `src/service/request/index.ts` 的 `axios` 类型导入。修好后 `pnpm typecheck` 与 `pre-commit` 才能恢复为可用 Gate —— **需用户确认后再动 `package.json`**。
4. **让状态信息不腐化**：把 §12 的「已知失败」改为「症状 → 根因 → 处置」的诊断条目（已部分应用），不要把一次性实测结果当作长期事实。
5. **CI 对齐**：`.github/workflows/linter.yml` 目前不跑 `typecheck` / `build`，建议补一条 `pnpm typecheck && pnpm build`（当前因幽灵依赖会失败，需先做第 3 项）。
