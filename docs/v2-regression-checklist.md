# v2 人工回归清单（隐形能力）

本仓库**没有自动化测试**（见 [ADR-0002](./adr/0002-no-test-framework.md)），因此行为改动只能靠人工回归。本文件把「容易在重构中被无声破坏、且不会被类型检查发现」的能力列成可执行的检查项，作为改动后的验证依据。

- **来源**：`docs/v3.md` §5.9「必须保留的隐形能力清单」。注意 `docs/v3.md` 本身是**未实现**的 v3 重构草案，但该清单列出的都是 **v2 现存能力**，故抽取到本文件独立维护。
- **用法**：改动涉及某一行时，按「怎么验」跑一遍，并把结果写进交付说明；未验证的项要显式声明「未验证」。
- 标注 `仅 prod 构建` 的项必须在 `pnpm build` + `pnpm preview` 上验证，`pnpm dev` 下不成立。

| #   | 能力                         | 实现位置                                                                                            | 怎么验                                                                                                                           |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 版本更新检测                 | `src/plugins/app.ts` `setupAppVersionNotification`                                                  | 仅 prod 构建：部署新构建后停留在旧页面，应出现版本更新通知；点击刷新后加载新版本                                                 |
| 2   | 跨用户登录清页签             | `src/store/modules/auth/index.ts` `checkTabClear` / `recordUserId`                                  | 用 A 登录并打开多个页签 → 退出 → 用 B 登录：页签应被清空，且不按 redirect 跳转                                                   |
| 3   | 主题设置生产缓存 + 版本覆盖  | `src/store/modules/theme/shared.ts` `initThemeSettings`                                             | 仅 prod 构建：改主题设置后刷新应保持；再修改 `src/theme/settings.ts` 的 `overrideThemeSettings` 并重新构建，本地设置应被覆盖一次 |
| 4   | 错误消息去重                 | `src/service/request/shared.ts` `showErrorMsg`                                                      | 让多个请求同时返回**相同**错误消息：只应弹出一条 `$message`；消息消失 5s 后可再次弹出                                            |
| 5   | token 刷新并发去重           | `src/service/request/shared.ts` `handleExpiredRequest`                                              | 让 token 过期后并发发起多个请求：`refreshToken` 接口只应被调用一次，其余请求在刷新后重放成功                                     |
| 6   | 移动端布局备份与恢复         | `src/store/modules/theme`（`backupThemeSettingBeforeIsMobile`）/ `src/store/modules/app` `isMobile` | 桌面端设为 `vertical-mix` → 窗口缩到移动宽度（布局切为移动版）→ 恢复宽度：应还原为 `vertical-mix`                                |
| 7   | 水印定时器按需运行           | `src/store/modules/theme/index.ts` `pauseWatermarkTime` / `resumeWatermarkTime`                     | 水印仅用静态文本（不启用时间）时，定时器应暂停；启用时间后水印内容随时间刷新                                                     |
| 8   | 页签滚轮横滚与中键关闭       | `src/constants/app.ts` `GLOBAL_TAB_WHEEL_SPEED_RATIO` / 主题设置 `tab.closeTabByMiddleClick`        | 页签溢出时滚轮应横向滚动（速度为默认的 0.3 倍量级）；鼠标中键点击页签应关闭（该开关关闭时不生效）                                |
| 9   | `isDev` 路由                 | `src/store/modules/route/shared.ts` `filterRoutesByDev`；`RouteMeta.isDev`                          | `meta.isDev` 的路由只在 `import.meta.env.DEV` 下出现，prod 构建后应消失                                                          |
| 10  | meta 语义：`href`            | `src/router/guard/route.ts` `handleRouteSwitch`                                                     | 带 `meta.href` 的路由点击后开新窗口，且当前路由不发生跳转                                                                        |
| 11  | meta 语义：`activeMenu`      | `src/layouts/modules/global-menu/context`                                                           | 不在菜单中的路由（如详情页）进入后，左侧菜单应高亮 `activeMenu` 指定的菜单项                                                     |
| 12  | meta 语义：`multiTab`        | `src/store/modules/tab/shared.ts`                                                                   | 同一路由带不同 query 时：未开启 `multiTab` 复用同一页签，开启后产生多个页签                                                      |
| 13  | meta 语义：`fixedIndexInTab` | `src/store/modules/tab/shared.ts`                                                                   | 设置了 `fixedIndexInTab` 的页签固定在页签栏且不可关闭，顺序与数值一致                                                            |
| 14  | 首屏 loading 主题色联动      | `src/plugins/loading.ts` + `VITE_STORAGE_PREFIX` 下的 `themeColor`                                  | 改主题色后刷新页面：首屏 loading 的背景色应跟随新主题色，而非闪回默认色                                                          |
| 15  | 登录成功通知                 | `src/store/modules/auth/index.ts` `login` → `window.$notification`                                  | 成功登录后应出现成功通知，且内容包含当前用户名                                                                                   |

## 相关不变量

以下能力已由类型系统或配置强制，不需要人工回归，但改动时容易连带破坏，详见 [`docs/guides/types.md`](./guides/types.md#类型源与新增一个-x-要同步哪几处)：i18n 中英双向满足 `App.I18n.Schema`、布局模式穷尽 `Record`、env / storage / route-meta 的类型声明源、`SetupStoreId` 与 `$reset`。
