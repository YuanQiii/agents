# 要求 pnpm ≥ 11，并让每个包显式声明自己直接 import 的依赖

**状态**：accepted

本仓库是 pnpm workspace monorepo，配置写在 `pnpm-workspace.yaml`（camelCase，含 `shamefullyHoist: true`）。pnpm 只从 `pnpm-workspace.yaml` 读取非 auth / registry 设置，而 **pnpm 10 只读其中的 `packages` 字段，其余设置被静默忽略**；pnpm 11 起才完整读取。因此在 pnpm 10 下 `shamefullyHoist` 不生效，根 `node_modules` 不含传递依赖，`vue-tsc` 会以 `Cannot find module 'axios'` / `'@unocss/core'` 这类与真实原因无关的报错失败 —— 上游 v2.2.0 的 CHANGELOG 已写明「update pnpm from v10 to v11」，本决策只是把该要求落到文件里：`packageManager` 钉 `pnpm@11.26.0`，`engines.pnpm` 收紧为 `>=11.0.0`。

同时决定：**不把 hoist 当作依赖可解析的唯一保障**。凡是被直接 `import` 的包，必须在声明该 import 的那个 `package.json` 里显式声明（workspace 包不会被 hoist，这一条对它尤其必要）。

## Considered Options

- **在 pnpm 10 下补显式依赖声明了事**：拒绝。那会让同一份清单在 pnpm 11 下变成冗余声明，且掩盖了「工具链版本不匹配」这个真实原因；后续还会重复踩。
- **把 `shamefully-hoist=true` 搬进 `.npmrc`**：拒绝。pnpm 11+ 只从 `pnpm-workspace.yaml` 读该设置，搬移会产生两个来源并让 yaml 中的现有配置变成死配置。
- **使用 pnpm 12**：暂不做。上游尚未迁移，13→12 的跨度超出本仓库当前意图。

## Consequences

- 在 pnpm 10（或更旧）下执行 `pnpm typecheck` 会失败，且错误信息不指向真实原因。遇到 `Cannot find module` 且包确实存在于其他包内时，**先确认 pnpm 版本**，不要急着改 `package.json`。
- 显式声明依赖成为硬约束（见 [`packages/AGENTS.md`](../../packages/AGENTS.md#依赖声明) 与根 `AGENTS.md` 的铁律 4）。
