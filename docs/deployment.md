# 构建与部署

更新时间：2026-11-18

## Cloudflare Builds

GitHub `main` 已连接 Cloudflare Builds，推送后自动构建和部署：

- 构建命令：`pnpm run build`
- 部署命令：`npx wrangler deploy`

只有真实 D1 schema 变化时才需要迁移。执行远程迁移前必须得到用户明确确认，命令为 `corepack pnpm db:migrate`。

## 运行时密钥

`SECRET_KEY` 在 Cloudflare Dashboard 的 **Settings → Variables and Secrets** 中按 **Secret** 配置，供 Worker 运行时读取。

Build variables and secrets 只服务构建过程，不能代替运行时密钥。不要把密钥写入仓库、文档或聊天，也不要为保留 Secret 添加 `keep_vars`。

本机 Wrangler 使用 OAuth 登录，可用 `corepack pnpm exec wrangler whoami` 核对账号和权限。Cloudflare 操作优先使用 CLI/API。部署、远程迁移、密钥修改和线上数据删除都需要用户明确确认。
