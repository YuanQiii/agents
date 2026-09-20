# 不引入测试框架

**状态**：accepted

本仓库是给下游复用的管理后台模板。当前 `package.json` 没有 `test` 脚本、没有任何测试框架依赖、`src/` 与 `packages/` 下没有 `*.spec.*` / `*.test.*` 文件，CI（`.github/workflows/linter.yml`）也只跑 super-linter。这是**有意的**，不是遗漏：模板的价值在于「开箱即用的脚手架内核」，引入 vitest 会让每个下游用户继承一套他们没有要求的测试栈，并让 `AGENTS.md` 从此为它长期背书；而本仓库大多数真正重要的不变量已经由类型系统守住（i18n 中英双向满足 `App.I18n.Schema`、布局模式是穷尽的 `Record<UnionKey.ThemeLayoutMode, ...>`、env / storage / route-meta 都有类型声明源），少数无法静态化的（如 `refreshToken` 不得返回过期码）用人工回归清单兜住比建整套测试栈更划算。

## Considered Options

- **引入 vitest，只覆盖 `packages/utils` 纯函数 + 1 条不变量测试**：拒绝。收益不足以换取下游的测试栈与长期维护成本，且会制造「有测试」的错觉 —— 覆盖面窄到无法承担回归职责。
- **引入 vitest + `@vue/test-utils` 覆盖组件**：拒绝。成本更高，且模板组件以样式与布局为主，单测收益低。

## Consequences

- 没有自动化回归。用户可见行为的改动必须人工验证（清单见 [`../v2-regression-checklist.md`](../v2-regression-checklist.md)，交付格式见 [`../guides/workflow-validation.md`](../guides/workflow-validation.md)），并在交付说明中写明步骤与结果；无法验证的部分必须显式声明「未验证」。
- AI Agent **禁止虚构测试命令或测试目录**；`Validation` 报告中 `test` 一项固定为 `NOT AVAILABLE`。
- 未来若要引入测试框架，属于新增依赖，须先与维护者确认。
