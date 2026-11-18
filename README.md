# 🪟 ZenGallery

一个极简优雅的文件服务应用，支持文件上传、管理和分享，可用作图床，支持自动压缩和缓存。

基于无服务器架构，使用 Cloudflare 全栈技术构建<del>白嫖免费额度和全球流量</del>，支持一键部署。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/flwfdd/ZenGallery)

## ✨ ZenGallery 功能亮点

### 🚀 极致性能体验
- **全球边缘节点**：基于 Cloudflare CDN，文件访问速度超快
- **大文件分片上传**：支持超大文件上传，自动分片上传
- **智能图片压缩**：首次访问时按需生成高/中/低三种 JPEG 版本，并缓存复用
- **极速响应**：Serverless 架构，冷启动时间接近零

### 💡 简单而强大
- **媒体预览**：支持图片、视频、音频预览
- **智能去重**：智能哈希检测，避免重复存储
- **一键分享**：一键生成链接，轻松分享给他人
- **管理访问密钥**：文件列表、上传、编辑和删除需要密钥，分享链接保持公开

### 🎯 精心设计的用户体验
- **极简界面**：从手绘图纸中汲取灵感
- **灵动交互**：可爱小动画无处不在
- **深色模式**：支持浅色/深色/跟随系统三种主题
- **国际化**：内置中英双语界面

### 💰 经济实惠的解决方案
- **免费额度充足**：Cloudflare 慷慨的免费额度足够个人使用
- **无服务器成本**：只为实际使用付费，闲置零成本
- **一键部署**：无需复杂配置，3分钟完成部署

## 🎪 功能特性一览

| 功能 | 描述 | 状态 |
|------|------|------|
| 📁 **文件上传** | 拖拽上传，支持多文件、大文件分片上传，上传进度实时显示 | ✅ |
| 🖼️ **智能压缩** | 首次访问时生成高中低三档 JPEG 并缓存 | ✅ |
| 🔍 **搜索筛选** | 按文件名、类型、大小等多维度搜索 | ✅ |
| 🔗 **链接分享** | 生成永久访问链接 | ✅ |
| 🌍 **国际化** | 中英双语界面切换 | ✅ |
| 🌙 **主题模式** | 浅色/深色/跟随系统 | ✅ |
| 🔒 **安全保护** | 管理接口密钥认证，公开链接独立分享 | ✅ |

## 🚀 快速开始

### 1. 一键部署（推荐）

点击下方按钮，一键部署到 Cloudflare：

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/flwfdd/ZenGallery)

### 2. 手动部署

如果你想自定义配置，可以选择手动部署：

```bash
# 克隆仓库
git clone https://github.com/flwfdd/ZenGallery.git
cd ZenGallery

# 安装依赖
pnpm install

# 配置 Cloudflare
# 编辑 wrangler.jsonc，设置你的域名和资源名称

# 设置管理密钥（不会写入仓库）
pnpm wrangler secret put SECRET_KEY

# 构建
pnpm build

# 部署
pnpm deploy
```

使用 Cloudflare Builds 时，构建命令为 `pnpm run build`，部署命令为 `npx wrangler deploy`。

### 3. 本地开发

```bash
# 安装依赖
pnpm install

# 配置本地管理密钥
cp .dev.vars.example .dev.vars
# 然后修改 .dev.vars 中的 SECRET_KEY

# 执行本地数据库迁移
pnpm wrangler d1 migrations apply DB --local

# 启动开发服务器
pnpm dev
pnpm preview
```

## 🔐 权限边界

- `/api/files` 及上传、分片上传、编辑、删除接口需要通过 `SECRET_KEY` 登录。
- `/share/*` 是公开图片详情页，复用文件哈希和元数据，无需创建分享记录。
- `/files/*` 与 `/r2/*` 是公开文件链接，不携带管理密钥也可以访问。
- 未配置 `SECRET_KEY` 时管理接口会返回 `503`，不会退化为匿名管理模式。
- 管理接口统一使用 `Authorization: Bearer <SECRET_KEY>`，包括登录接口；前端只在内存中保存密钥，不写入 localStorage。
- Agent 使用指南位于 `/llms.txt`，首页和分享页通过 `rel="describedby"` 暴露入口。

线上密钥使用 `wrangler secret put SECRET_KEY` 设置，本地密钥放在不会提交到 Git 的 `.dev.vars` 中。

## ✅ 质量检查

```bash
pnpm typecheck  # Vue + TypeScript 类型检查
pnpm test       # 单元测试与 API 故障恢复测试
pnpm lint       # ESLint
pnpm build      # 前端与 Worker 生产构建
pnpm check      # 依次执行以上全部检查
```

## 🎨 界面预览

![主界面](./docs/images/main-light.jpeg)

## 🛠️ 技术架构

### 前端技术栈

Vue 3 + TypeScript + Tailwind CSS

- **Vue 3 Composition API** - 现代化的响应式框架
- **TypeScript** - 类型安全，开发体验更佳
- **Tailwind CSS 4.0** - 原子化 CSS，界面一致性强

### 后端技术栈

Hono + Cloudflare Workers + R2 + D1

- **Hono** - 轻量级 Web 框架，专为边缘计算优化
- **Cloudflare Workers** - 全球分布式计算平台
- **Cloudflare R2** - 对象存储，兼容 S3 API
- **Cloudflare D1** - 边缘数据库，基于 SQLite

浏览器先分块计算 SHA-256，再通过 `/api/files/check` 预检，重复文件不会上传。单文件上限为 10GB，超过 50MB 时自动使用 R2 分片上传。实际写入时，R2 原生校验单文件的 SHA-256，分片完成后由服务端流式复算；验证通过后才写入 D1。R2 有对象但 D1 缺少记录时会复核并补建。上传和删除流程均可安全重试：R2 与 D1 发生部分失败时，后续请求会自动补全或清理状态。

---

如果这个项目对你有帮助，请给我们一个 ⭐️！

<div align="center">
  <sub>Powered by <a href="https://github.com/flwfdd">flwfdd</a> with ❤️</sub>
</div>
