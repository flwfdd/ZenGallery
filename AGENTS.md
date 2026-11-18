# ZenGallery Agent 工作纲领

更新时间：2026-11-18

## 项目定位

ZenGallery 是供 Space、旧博客和其他工具共用的文件与媒体服务，提供上传、去重、公开分享、基础元数据和按需图片压缩。网页管理端是辅助界面，Agent 主要通过 HTTP API 使用服务。

公开文件与管理页面同源是当前接受的方案，不要未经讨论单独改变域名或下载策略。

## 工作原则

- **如无必要勿增实体。**能用现有状态表达时，不新增字段、表、接口或抽象组件。
- 先确认实际重复和收益，再提取公共逻辑。不要仅为了消除模板或 Tailwind 类名重复而制造抽象层。
- 保持实现、README 和 `docs/` 一致。改变架构、上传、权限或部署约定时同步更新对应文档。
- 不把密钥写入仓库、文档或聊天。Cloudflare 操作优先使用 CLI/API。
- 部署、远程迁移、密钥修改和线上数据删除都需要用户明确确认。

## 交付要求

- 改动后运行并通过 `corepack pnpm check`。
- 行为变化要补相应测试。上传、分片或存储逻辑变化后，还要在本地 Worker 发真实 HTTP 请求，不能只依赖单元测试。
- 不提交 `.dev.vars`、`node_modules`、`dist`、`.wrangler` 或测试过程产物。
- 完成生产验证或状态变化后更新 `docs/status.md`，不要把过期状态留给后续 Agent。

## 提交规范

所有提交统一使用：

```text
feat(<scope>): <中文描述>
```

- `scope` 使用简短小写英文，如 `upload`、`client`、`docs`、`deploy`。
- 一个提交只表达一个目的，描述写清实际变化，结尾不加句号。
- 新提交统一使用 `feat`，不混用 `fix`、`chore` 或 `docs`；已有历史不因本规范改写。

## 文档索引

- `docs/architecture.md`：代码结构、上传去重、权限和图片转换约定。
- `docs/development.md`：工具链、本地开发、测试和验证要求。
- `docs/deployment.md`：Cloudflare Builds、运行时密钥、迁移和发布规则。
- `docs/status.md`：当前线上状态、已验证范围和下一步。
