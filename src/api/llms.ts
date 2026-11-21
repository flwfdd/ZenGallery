export const renderLlmsTxt = (origin: string): string => `# ZenGallery

> ZenGallery 是文件与图片 HTTP 服务，支持上传、去重、下载、元数据、图片压缩和公开分享。

Base URL: \`${origin}\`

## Authentication

所有 \`/api/*\` 管理请求都使用以下请求头：

\`\`\`http
Authorization: Bearer <SECRET_KEY>
\`\`\`

\`POST /api/auth/login\` 使用同一请求头验证密钥，返回 \`{"authenticated":true}\`，不设置 Cookie。

\`/share/*\`、\`/files/*\` 和 \`/r2/*\` 无需认证。不要把真实密钥写入 URL、日志或文档。

## File identity and sharing

客户端先计算文件的 SHA-256。文件标识 \`filename\` 是由哈希和安全扩展名组成的字符串。

- 原文件：\`GET /files/{filename}\`
- 压缩图片：\`GET /files/{filename}?level=low\`、\`mid\` 或 \`high\`
- 图片分享页：\`GET /share/{filename}\`

不超过 20 MB 的图片按需生成 \`.webp\` 派生文件；超过 20 MB 时返回原始文件。分享链接直接按上述路径构造，无需创建分享记录。修改标题或描述不会改变链接；删除文件后链接失效。

## Management endpoints

- \`POST /api/auth/login\`：验证 Bearer 密钥。
- \`GET /api/files\`：文件列表，支持 \`limit\`、\`offset\`、\`sort_by\`、\`sort\`、\`mime_type\`、\`search\`。
- \`GET /api/files/{filename}\`：单个文件元数据。
- \`POST /api/files/check\`：上传前检查重复文件。
- \`POST /api/files\`：上传不超过 50 MiB 的文件，使用 multipart form 的 \`file\` 和 \`hash\` 字段。
- \`PUT /api/files/{filename}\`：用 JSON 修改 \`title\` 和 \`description\`。
- \`DELETE /api/files/{filename}\`：删除文件及图片缓存。
- \`POST /api/files/multipart/create\`：创建分片上传。
- \`PUT /api/files/multipart/upload\`：上传一个分片。
- \`POST /api/files/multipart/complete\`：合并分片。
- \`DELETE /api/files/multipart/abort\`：放弃分片上传。

## Parameters

通用文件字段：

- \`filename\`：字符串，原始文件名，1–512 字符。
- \`hash\`：64 位 SHA-256 十六进制字符串。
- \`mime_type\`：字符串，例如 \`image/jpeg\`；省略时为 \`application/octet-stream\`。
- \`size\`：正整数，单位为字节，单文件最大 10 GiB。
- 元数据包含 \`filename\`、\`title\`、\`description\`、\`mime_type\`、\`size\`、\`uploaded_at\`（ISO 8601 时间）。

文件列表默认 \`limit=20\`（最大 100）、\`offset=0\`、\`sort_by=uploaded_at\`、\`sort=desc\`。

预检和分片创建使用相同 JSON：

\`\`\`json
{
  "filename": "example.jpg",
  "hash": "<64 位 SHA-256>",
  "mime_type": "image/jpeg",
  "size": 123456
}
\`\`\`

预检响应中 \`exists=true\` 表示可以直接复用 \`url\` 和 \`metadata\`。

上传单个分片时，请求路径为 \`/api/files/multipart/upload?upload_id=<id>&key=<key>&part_number=1\`：

- \`upload_id\` 和 \`key\` 来自 create 响应。
- \`part_number\` 是从 1 开始的整数，每片最大 25 MiB。
- 请求正文是该分片的原始字节，成功响应包含 \`partNumber\` 和 \`etag\`。

完成分片上传时，\`parts\` 的每个元素都是 \`{"partNumber":1,"etag":"<对应分片返回的 etag>"}\`，完整 JSON 为：

\`\`\`json
{
  "filename": "example.jpg",
  "hash": "<64 位 SHA-256>",
  "upload_id": "<create 返回的 upload_id>",
  "parts": [{"partNumber": 1, "etag": "<etag>"}],
  "mime_type": "image/jpeg",
  "size": 123456
}
\`\`\`

放弃分片上传使用 \`/api/files/multipart/abort?upload_id=<id>&key=<key>\`，参数同样来自 create 响应。

## Upload workflow

1. 计算文件 SHA-256。
2. 调用 \`POST /api/files/check\`，JSON 包含 \`filename\`、\`hash\`、\`mime_type\`、\`size\`。
3. 如果 \`exists=true\`，使用返回的 URL 和元数据，不上传文件。
4. 如果需要上传，50 MiB 以内调用 \`POST /api/files\`；更大的文件使用分片接口，每片 25 MiB。
5. 分片流程：创建任务，逐片上传并取得 \`partNumber\` 和 \`etag\`，最后调用 complete，传入 \`filename\`、\`hash\`、\`upload_id\`、\`parts\`、\`mime_type\`、\`size\`。

## Responses and errors

成功响应使用 JSON，公开文件和分享页除外。错误响应通常为 \`{"error":"说明"}\`，校验错误还可能包含 \`issues\`。

- \`400\`：参数或格式错误。
- \`401\`：缺少或错误凭据。
- \`404\`：文件不存在。
- \`409\`：文件大小、内容哈希或已有对象冲突。
- \`500\`：服务端处理失败。
- \`503\`：服务端未配置 \`SECRET_KEY\`。
`;
