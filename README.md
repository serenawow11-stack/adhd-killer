# 回到此刻 · ADHD Killer

四模块时间与意图管理原型：意图窗、时间之路、进度书、语音舞台。

## 技术栈

React 19 + Vite 7 + TypeScript（strict）+ Tailwind CSS 4。使用自封装组件，无 Vue、无旧 DOM 应用壳。技术规范见 [.git-instruction.md](.git-instruction.md)。iOS Swift 原型独立在 `ios/`，本次网页迁移未修改它。

## 本地运行

需要 Node.js 24 和 pnpm 11.19.0。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的地址（默认 http://127.0.0.1:5173/）。加 `?demo=1` 体验示例的一天；示例与真实数据完全隔离。原来 `python3 -m http.server` 直接运行源码的方式不再适用。

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`dist/` 为可部署构建产物，不提交到 Git。生产 PWA 的 service worker 由构建生成并缓存带哈希的资源；新版本不会强制刷新正在计时的页面，关闭所有旧标签再打开生效。

## 目录

- `src/components/`：四模块、自封装 Button/Modal/Field、任务与作息编辑。
- `src/lib/`：类型、规则排程、时间计算、状态和旧数据迁移。
- `src/styles.css`：Tailwind 与窗/门/书/舞台的自定义场景样式。
- `public/`：PWA manifest 与图标。
- `tests/`：Vitest 业务规则测试。
- `.github/workflows/pages.yml`：测试、构建和 Pages 发布。

## 已实现与边界

保留临时意图倒计时/延长，主任务开始/暂停，仅当前小时换任务，小时历史展开，投入时长进度及校正/撤销，健康日/放纵日作息，复盘原文保存，规则排程草稿及确认，录音/回听和导出。

任务投入 2h / 预计 3h 显示 67%，不等同于成果完成。跨小时停止当前任务计时，重开浏览器未结束记录需确认。旧 `adhd-killer:v1` 保留，迁移后继续使用 `adhd-killer:v3`，不会清空已有 V3 记录。

ASR 与 LLM 仍待 API 配置。本地录音不上传；规则排程不是 AI，支持每行“任务 60分钟”或“任务 2小时”，保留 20% 空闲预算并校验作息冲突。复杂自然语言、多端同步和原生锁屏联动未接入。

## GitHub Pages

迁移在独立分支验证，不直接覆盖现有线上站点。合并至 main 前，在仓库 Settings → Pages 将 Source 设为 **GitHub Actions**。合并后工作流安装锁定依赖、测试、构建 `dist` 并发布。相对 base 支持 `/adhd-killer/` 子路径。

不要继续用 `main / (root)` 直接发布 Vite 源码，否则浏览器无法运行 TypeScript。

## 回滚

- `2875888`：迁移前四模块原生网页的完整检查点。
- `c8e94d6`：最初版本。

迁移提交独立保存。已推送的迁移需要撤回时，使用 `git revert <迁移提交号>` 并创建修复提交，不强推、不清空历史。恢复到旧静态网页后，Pages 发布方式也需恢复为旧分支根目录；本地回滚代码并不会自动恢复 GitHub 设置。

如只想对比旧版，可在单独目录创建 worktree，不影响当前工作：

```sh
git worktree add --detach ../adhd-before-react 2875888
```
