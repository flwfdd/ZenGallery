# 开发与验证

更新时间：2026-11-18

## 工具链

项目锁定 `pnpm@12.21.0`，优先通过 Corepack 使用项目版本：

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm audit --prod
```

`check` 包含类型检查、测试、ESLint 和生产构建，改动后必须通过。行为变化要补相应测试，不能只检查能否编译。

TypeScript 使用 `~6.0.3`。`vue-tsc` 和 `typescript-eslint` 当前不支持 TypeScript 7，不要盲目升级。

## 本地 Worker

本地使用模拟 D1 和 R2，不接触生产数据：

```bash
cp .dev.vars.example .dev.vars
# 在 .dev.vars 中设置本地测试密钥，不使用生产密钥
corepack pnpm exec wrangler d1 migrations apply DB --local
corepack pnpm dev
```

需要显式传入测试变量时，Wrangler 使用冒号：

```bash
corepack pnpm exec wrangler dev --local --var SECRET_KEY:review-secret
```

上传、分片或存储逻辑变化后，除 `check` 外还要在本地 Worker 发真实 HTTP 请求。Node 测试无法发现所有 Workers 运行时问题，例如动态 WASM 编译限制。测试结束后清理本地 `.wrangler` 状态。

## 修改与复核

- 先确认真实重复和收益，再提取公共逻辑。
- 不为统一外观或假想需求新增字段、表、接口或抽象组件。
- 保持 README 和相关文档与实际行为一致。
- 不提交 `.dev.vars`、密钥、`node_modules`、`dist`、`.wrangler` 或测试过程产物。
