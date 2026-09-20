#!/usr/bin/env node
/**
 * check-agents-md.mjs —— 约束文档的自检
 *
 * 零依赖，CI 里直接 `node scripts/check-agents-md.mjs`，不需要 pnpm install。
 * 只做三件「会静默过期、且我们已经真的踩过」的事：
 *
 *   1. 相对链接可达      —— 指针指向不存在的文件，没有任何工具会报错
 *   2. 文档里的 pnpm 命令真实存在 —— 命令改名后文档会静默说谎
 *   3. 不留章节号指针    —— `AGENTS.md §5` 这类锚点会随根文件重排静默失效（实测踩过 4 处）
 *
 * 检查范围：约束体系自己维护的文件。故意不含 README / CHANGELOG（上游的、生成的）
 * 与 docs/v3.md（外部草案，其路径指向未实现的结构）。
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const REPO = process.cwd();

/** docs/ 下不检查的文件（附理由） */
const EXCLUDED_DOCS = new Set(['docs/v3.md']);

/** pnpm 自身的子命令，不是本仓库的 script */
const PNPM_BUILTINS = new Set([
  'add',
  'bin',
  'config',
  'dedupe',
  'deploy',
  'dlx',
  'doctor',
  'env',
  'exec',
  'fetch',
  'help',
  'import',
  'init',
  'install',
  'licenses',
  'link',
  'list',
  'ls',
  'outdated',
  'pack',
  'patch',
  'prune',
  'publish',
  'rebuild',
  'recursive',
  'remove',
  'root',
  'run',
  'server',
  'setup',
  'start',
  'state',
  'store',
  'test',
  'unlink',
  'update',
  'up',
  'why'
]);

const failures = [];
const fail = (check, file, line, message) => failures.push({ check, file, line, message });

/** 收集要检查的文件 */
function collectFiles() {
  const files = ['AGENTS.md', 'CONTEXT.md'];

  const walk = dir => {
    for (const entry of readdirSync(join(REPO, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith('.md') && !EXCLUDED_DOCS.has(rel)) files.push(rel);
    }
  };
  walk('docs');

  // 任意层级的 AGENTS.md（目录级）
  const findNested = dir => {
    for (const entry of readdirSync(join(REPO, dir), { withFileTypes: true })) {
      if (!entry.isDirectory() || ['node_modules', '.git', 'dist'].includes(entry.name)) continue;
      const rel = `${dir}/${entry.name}`;
      if (entry.name === 'AGENTS.md') files.push(rel);
      else findNested(rel);
    }
  };
  findNested('packages');

  return [...new Set(files)].filter(f => existsSync(join(REPO, f)));
}

/** 允许的 pnpm 目标：所有 package.json 的 scripts / bin，加上 pnpm 内置子命令 */
function allowedPnpmTargets() {
  const allowed = new Set(PNPM_BUILTINS);

  const readPkg = path => {
    try {
      return JSON.parse(readFileSync(join(REPO, path), 'utf8'));
    } catch {
      return null;
    }
  };

  const add = pkg => {
    if (!pkg) return;
    Object.keys(pkg.scripts || {}).forEach(s => allowed.add(s));
    Object.values(pkg.bin || {}).forEach(b => allowed.add(b.replace(/^\.\//, '')));
    if (pkg.name) allowed.add(pkg.name);
    if (pkg.name?.startsWith('@')) allowed.add(pkg.name.split('/')[1]);
  };

  add(readPkg('package.json'));
  for (const entry of readdirSync(join(REPO, 'packages'), { withFileTypes: true })) {
    if (entry.isDirectory()) add(readPkg(`packages/${entry.name}/package.json`));
  }

  return allowed;
}

const files = collectFiles();
const allowed = allowedPnpmTargets();

// ── 1. 相对链接可达 ──────────────────────────────────────────────
for (const file of files) {
  const lines = readFileSync(join(REPO, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#|\/)/.test(target)) continue;
      const path = target.split('#')[0];
      if (!path) continue;
      if (!existsSync(resolve(REPO, dirname(file), path))) {
        fail('link', file, i + 1, `相对链接不可达：${target}`);
      }
    }
  });
}

// ── 2. 文档里的 pnpm 命令真实存在 ─────────────────────────────────
for (const file of files) {
  const lines = readFileSync(join(REPO, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/`pnpm ([a-z][\w:-]*)`/g)) {
      if (!allowed.has(m[1])) {
        fail(
          'command',
          file,
          i + 1,
          `文档提到 \`pnpm ${m[1]}\`，但 package.json 里没有这个 script（也不是 bin 或 pnpm 内置命令）`
        );
      }
    }
  });
}

// ── 3. 不留章节号指针 ────────────────────────────────────────────
// 判据：`AGENTS.md` 之后（20 字符内）出现 §。**单向判定是有意的**——若改成「双向」或
// 「本行同时含 § 与 AGENTS」，会误伤 `docs/v3.md §5.9`（同一行恰好也提到 AGENTS.md）这类合法写法。
// 这类误报会让检查被人关掉，比漏报更糟。
const SECTION_ANCHOR = /AGENTS\.md[^\n]{0,20}§/;

for (const file of files) {
  const isAgents = file.endsWith('AGENTS.md');
  const lines = readFileSync(join(REPO, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    const hit = isAgents ? line.includes('§') : SECTION_ANCHOR.test(line);
    if (hit) {
      fail('anchor', file, i + 1, '出现章节号指针（§）——根文件重排后会静默失效，请改指文件或语义小标题');
    }
  });
}

// ── 报告 ────────────────────────────────────────────────────────
const checks = [
  ['link', '相对链接可达'],
  ['command', '文档命令与 package.json 一致'],
  ['anchor', '无章节号指针']
];

console.log(`check-agents-md: 检查 ${files.length} 个文件\n`);

let failed = 0;
for (const [key, label] of checks) {
  const hits = failures.filter(f => f.check === key);
  if (hits.length === 0) {
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}（${hits.length} 处）`);
    for (const h of hits) console.log(`          ${h.file}:${h.line}  ${h.message}`);
  }
}

console.log('');
if (failed > 0) {
  console.log(`${failed} 项未通过`);
  process.exit(1);
}
console.log('全部通过');
