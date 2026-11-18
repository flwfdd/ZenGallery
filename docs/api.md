# ZenGallery API 使用指南

更新时间：2026-11-18

## 基础地址与认证

基础地址通过环境变量 `ZENGALLERY_BASE_URL` 指定，例如生产环境可设为 `https://gallery.0u0.fun`，本地预览可设为 `http://localhost:8799`。

管理接口统一使用：

```http
Authorization: Bearer <SECRET_KEY>
```

`POST /api/auth/login` 也使用同一请求头，可用来验证密钥。不会设置 Cookie。`/share/*`、`/files/*` 和 `/r2/*` 无需认证。

## 接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| POST | `/api/auth/login` | 验证 Bearer 密钥 |
| GET | `/api/files` | 文件列表、搜索、筛选、排序和分页 |
| GET | `/api/files/:filename` | 单个文件的元数据 |
| POST | `/api/files/check` | 上传前检查重复文件 |
| POST | `/api/files` | 上传不超过 50 MiB 的文件 |
| POST | `/api/files/multipart/create` | 创建分片上传 |
| PUT | `/api/files/multipart/upload` | 上传一个分片 |
| POST | `/api/files/multipart/complete` | 合并分片 |
| DELETE | `/api/files/multipart/abort` | 放弃分片上传 |
| PUT | `/api/files/:filename` | 修改标题和描述 |
| DELETE | `/api/files/:filename` | 删除文件及图片缓存 |
| GET | `/files/:filename` | 公开原文件，图片支持 `level=low|mid|high` |
| GET | `/share/:filename` | 公开图片详情页 |

## 常用调用

以下示例用环境变量保存密钥，不要把它写入命令历史、文档或日志。

### 验证密钥

```bash
curl -X POST $ZENGALLERY_BASE_URL/api/auth/login \
  -H "Authorization: Bearer $ZENGALLERY_SECRET_KEY"
```

### 文件列表与单个元数据

```bash
curl $ZENGALLERY_BASE_URL/api/files?limit=20&offset=0 \
  -H "Authorization: Bearer $ZENGALLERY_SECRET_KEY"

curl $ZENGALLERY_BASE_URL/api/files/<filename> \
  -H "Authorization: Bearer $ZENGALLERY_SECRET_KEY"
```

列表参数包括 `limit`、`offset`、`sort_by=uploaded_at|size`、`sort=asc|desc`、`mime_type` 和 `search`。默认 `limit=20`（最大 100）、`offset=0`、`sort_by=uploaded_at`、`sort=desc`。

### 上传前去重

客户端先计算文件 SHA-256，再发送文件描述：

```json
{
  "filename": "example.jpg",
  "hash": "<64 位 SHA-256>",
  "mime_type": "image/jpeg",
  "size": 123456
}
```

```bash
curl -X POST $ZENGALLERY_BASE_URL/api/files/check \
  -H "Authorization: Bearer $ZENGALLERY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filename":"example.jpg","hash":"<64 位 SHA-256>","mime_type":"image/jpeg","size":123456}'
```

`exists=true` 时直接复用返回的 URL 和元数据，不再发送文件正文。

### 单文件上传

```bash
curl -X POST $ZENGALLERY_BASE_URL/api/files \
  -H "Authorization: Bearer $ZENGALLERY_SECRET_KEY" \
  -F "file=@example.jpg" \
  -F "hash=<64 位 SHA-256>"
```

### 分片上传

大于 50 MiB 的文件使用 25 MiB 分片：

1. `POST /api/files/multipart/create`，参数与预检相同，取得 `upload_id` 和 `key`。
2. `PUT /api/files/multipart/upload?upload_id=<id>&key=<key>&part_number=1`，正文为分片字节，取得 `partNumber` 和 `etag`。
3. 全部分片上传后调用 `POST /api/files/multipart/complete`：

```json
{
  "filename": "example.jpg",
  "hash": "<64 位 SHA-256>",
  "upload_id": "<upload_id>",
  "parts": [{ "partNumber": 1, "etag": "<etag>" }],
  "mime_type": "image/jpeg",
  "size": 123456
}
```

失败时可调用 `DELETE /api/files/multipart/abort?upload_id=<id>&key=<key>` 清理。

### 编辑、删除和分享

```bash
curl -X PUT $ZENGALLERY_BASE_URL/api/files/<filename> \
  -H "Authorization: Bearer $ZENGALLERY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"新标题","description":"新描述"}'

curl -X DELETE $ZENGALLERY_BASE_URL/api/files/<filename> \
  -H "Authorization: Bearer $ZENGALLERY_SECRET_KEY"
```

图片分享页按 `/share/<filename>` 构造，无需创建分享记录。原图为 `/files/<filename>`，压缩版本为 `/files/<filename>?level=low|mid|high`。

## 错误

错误响应通常为 `{"error":"说明"}`，参数校验错误还可能包含 `issues`。

- `400`：参数或格式错误。
- `401`：缺少或错误凭据。
- `404`：文件不存在。
- `409`：文件大小、内容哈希或已有对象冲突。
- `500`：服务端处理失败。
- `503`：服务端未配置 `SECRET_KEY`。
