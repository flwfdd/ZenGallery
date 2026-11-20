# 架构与核心约定

更新时间：2026-11-18

## 技术结构

- Vue 3 + TypeScript：网页端。
- Hono + Cloudflare Workers：HTTP API。
- R2：原图和压缩缓存。
- D1：文件元数据。
- Images binding：按需图片转换。

主要文件：

- `src/api/index.ts`：认证、预检、上传、分片、元数据、删除、公开下载和首页。
- `src/api/hash.ts`：Workers 可运行的流式 SHA-256，使用 `@noble/hashes`，不要改回动态加载 WASM。
- `src/api/services/cloudflare.ts`：R2、D1 和 Images 的适配层。
- `src/common/files.ts`：文件大小、分片大小和文件键规则。
- `src/common/services.ts`：共享类型和 Zod schema。
- `src/client/components/FileUpload.vue`：客户端哈希、预检、单文件上传和分片上传。
- `src/client/utils/`：跨组件共用的格式化与 HTTP 错误解析。
- `migrations/`：真实的 D1 schema 变更，目前只有 `0001_create_files_table.sql`。

## 上传与去重

以下不变量不能被破坏：

1. 客户端先计算 SHA-256，再调用 `POST /api/files/check`。重复文件不发送文件正文。
2. D1 有记录且 R2 对象存在，表示文件已经验证并入库，直接按重复文件返回。
3. R2 有对象但 D1 没记录，属于不一致状态。服务端复核对象哈希后补建 D1 记录。
4. 新的小文件由 R2 原生 SHA-256 校验。分片合并后由服务端流式复算，验证通过才写入 D1。
5. 预检之后仍保留服务端去重判断，处理其他请求抢先上传的竞态。
6. 文件键由真实内容哈希和安全的扩展名组成，不能只凭客户端声明接受错误内容。

不要给正常 D1 记录增加“已验证”字段；D1 记录本身就是验证完成的证据。

## 权限与公开链接

- 管理接口统一使用 `Authorization: Bearer <SECRET_KEY>`，`POST /api/auth/login` 也用同一请求头验证密钥，不设置 Cookie。
- `SECRET_KEY` 未配置时管理接口返回 `503`；配置后，匿名或错误凭据返回 `401`。
- `/files/*` 和 `/r2/*` 是公开链接，不需要管理密钥。
- 单文件图片首次访问 `?level=low|mid|high` 时才生成 WebP 并写入 R2 缓存，后续请求复用缓存。

## 图片分享

`GET /share/:filename` 是公开的图片详情页，直接复用现有文件键和 D1 元数据，不创建分享记录，也不需要创建接口。

- 服务端返回包含文件数据和 Open Graph 信息的 HTML 外壳，Vue 使用 `SharePage` 和 `AppHeader` 渲染页面。
- `FileDetailsContent` 同时用于管理端详情弹窗和公开分享页。容器较窄时上下排列，超过 900px 时自动变为两列：图片和文件信息在左，分享链接在右，不设置布局模式。
- 详情弹窗中的“分享页”入口仅负责拼接并复制 URL。
- 非图片文件重定向到 `/files/:filename`，未知记录返回 `404`，删除文件后分享页失效。
- 标题和描述在服务端转义。链接难以猜测，但任何拿到链接的人都可以访问。

## 构建关系

Vite 只生成 `dist/` 下的前端资产，Wrangler 直接从 `src/api/index.ts` 打包 Worker。不要再增加 `dist-server` 构建。
