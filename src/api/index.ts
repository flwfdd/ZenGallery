import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { zValidator } from '@hono/zod-validator';
import type { Context, MiddlewareHandler } from 'hono';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { validator } from 'hono/validator';
import { z } from 'zod';

import { FILE_HASH_PATTERN, FILE_KEY_PATTERN, getFileKey, MAX_SINGLE_UPLOAD_SIZE, MAX_UPLOAD_SIZE, MULTIPART_CHUNK_SIZE } from '../common/files';
import type { DatabaseService, FileMetadata, ImageCompressionLevel, StorageObjectMetadata, StorageService } from '../common/services';
import { ImageCompressionLevelSchema, ListFilesOptionsSchema } from '../common/services';
import { isHashMismatchError, storedObjectMatchesHash } from './hash';
import { parseRangeHeader } from './range';
import { CloudflareD1Service, CloudflareImageService, CloudflareR2Service } from './services/cloudflare';
import { renderSharePage } from './share';

export interface Bindings {
  BUCKET: R2Bucket;
  DB: D1Database;
  IMAGES: ImagesBinding;
  SECRET_KEY?: string;
}

const SESSION_COOKIE = 'secret-key';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const htmlShell = (clientScriptPath: string, stylePath: string, faviconPath: string) => `
  <!doctype html>
  <html lang="zh">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ZenGallery</title>
      <link href="${stylePath}" rel="stylesheet">
      <link href="${faviconPath}" rel="icon">
    </head>
    <body>
      <div id="app"></div>
      <script type="module" src="${clientScriptPath}"></script>
    </body>
  </html>
`;

const hashSecret = async (value: string): Promise<Uint8Array> => {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
};

const secretsMatch = async (provided: string, expected: string): Promise<boolean> => {
  const [providedHash, expectedHash] = await Promise.all([hashSecret(provided), hashSecret(expected)]);
  let mismatch = 0;
  for (let index = 0; index < expectedHash.length; index += 1) {
    mismatch |= providedHash[index] ^ expectedHash[index];
  }
  return mismatch === 0;
};

const authMiddleware: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  const secretKey = c.env.SECRET_KEY;
  if (!secretKey) {
    return c.json({ error: 'SECRET_KEY is not configured' }, 503);
  }

  const providedKey = getCookie(c, SESSION_COOKIE);
  if (!providedKey || !(await secretsMatch(providedKey, secretKey))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
};

const fileHashSchema = z.string().regex(FILE_HASH_PATTERN, 'A SHA-256 hash is required');
const fileKeySchema = z.string().regex(FILE_KEY_PATTERN, 'Invalid file key');
const filenameSchema = z.string().trim().min(1).max(512);
const mimeTypeSchema = z.string().trim().min(1).max(255).default('application/octet-stream');
const fileSizeSchema = z.number().int().positive().max(MAX_UPLOAD_SIZE);

const authSchema = z.object({
  secret_key: z.string().min(1).max(4096),
});

const fileUploadFormSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' })
    .refine((file) => file.size > 0, 'File cannot be empty')
    .refine((file) => file.size <= MAX_SINGLE_UPLOAD_SIZE, 'File requires multipart upload'),
  hash: fileHashSchema,
});

const fileDescriptorSchema = z.object({
  filename: filenameSchema,
  hash: fileHashSchema,
  mime_type: mimeTypeSchema,
  size: fileSizeSchema,
});

const multipartQuerySchema = z.object({
  upload_id: z.string().min(1).max(1024),
  key: fileKeySchema,
  part_number: z.coerce.number().int().min(1).max(10000),
});

const multipartAbortSchema = multipartQuerySchema.omit({ part_number: true });

const multipartCompleteSchema = z.object({
  filename: filenameSchema,
  hash: fileHashSchema,
  upload_id: z.string().min(1).max(1024),
  parts: z.array(z.object({
    partNumber: z.number().int().min(1).max(10000),
    etag: z.string().min(1),
  })).min(1).max(10000).superRefine((parts, context) => {
    const partNumbers = new Set<number>();
    for (const part of parts) {
      if (partNumbers.has(part.partNumber)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate part number' });
        return;
      }
      partNumbers.add(part.partNumber);
    }
  }),
  mime_type: mimeTypeSchema,
  size: fileSizeSchema,
});

const fileUpdateSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(4000).optional(),
});

const buildFileMetadata = (
  key: string,
  title: string,
  mimeType: string,
  size: number,
  uploadedAt = new Date().toISOString(),
): FileMetadata => ({
  filename: key,
  title,
  description: '',
  mime_type: mimeType || 'application/octet-stream',
  size,
  uploaded_at: uploadedAt,
});

const metadataFromObject = (
  key: string,
  title: string,
  fallbackMimeType: string,
  object: StorageObjectMetadata,
): FileMetadata => buildFileMetadata(
  key,
  title,
  object.contentType || fallbackMimeType,
  object.contentLength,
  object.customMetadata?.uploadedAt,
);

interface ExistingFileOptions {
  storage: StorageService;
  db: DatabaseService;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  hash: string;
  storedObject: StorageObjectMetadata;
  databaseRecord: FileMetadata | null;
}

const resolveExistingFile = async ({
  storage, db, key, filename, mimeType, size, hash, storedObject, databaseRecord,
}: ExistingFileOptions): Promise<{ metadata?: FileMetadata; error?: string }> => {
  if (storedObject.contentLength !== size) {
    return { error: 'Hash collision or invalid file hash' };
  }
  if (databaseRecord) return { metadata: databaseRecord };
  if (!(await storedObjectMatchesHash(storage, key, storedObject, hash))) {
    return { error: 'Stored object content does not match its SHA-256 key' };
  }

  const metadata = metadataFromObject(key, filename, mimeType, storedObject);
  await db.saveFile(metadata);
  return { metadata };
};

const app = new Hono<{ Bindings: Bindings }>();

export const route = app
  .get('/', (c) => c.html(htmlShell('/static/client.js', '/static/assets/style.css', '/favicon.ico')))
  .post(
    '/api/auth/login',
    zValidator('json', authSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid credentials' }, 400);
      }
    }),
    async (c) => {
      const secretKey = c.env.SECRET_KEY;
      if (!secretKey) {
        return c.json({ error: 'SECRET_KEY is not configured' }, 503);
      }

      const { secret_key: providedKey } = c.req.valid('json');
      if (!(await secretsMatch(providedKey, secretKey))) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      setCookie(c, SESSION_COOKIE, providedKey, {
        httpOnly: true,
        secure: new URL(c.req.url).protocol === 'https:',
        sameSite: 'Strict',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      });
      return c.json({ authenticated: true });
    },
  )
  .get(
    '/api/files',
    authMiddleware,
    zValidator('query', ListFilesOptionsSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid query parameters', issues: result.error.issues }, 400);
      }
    }),
    async (c) => {
      const db = new CloudflareD1Service(c.env.DB);
      try {
        const options = c.req.valid('query');
        const [files, count] = await Promise.all([
          db.listFiles(options),
          db.countFiles(options),
        ]);
        return c.json({
          files,
          count,
          pagination: {
            limit: options.limit,
            offset: options.offset,
            hasMore: options.offset + files.length < count,
          },
        });
      } catch (error) {
        console.error('Error listing files:', error);
        return c.json({ error: 'Failed to list files' }, 500);
      }
    },
  )
  .post(
    '/api/files/check',
    authMiddleware,
    zValidator('json', fileDescriptorSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid JSON data', issues: result.error.issues }, 400);
      }
    }),
    async (c) => {
      const storage = new CloudflareR2Service(c.env.BUCKET, 'files');
      const db = new CloudflareD1Service(c.env.DB);
      try {
        const { filename, hash, mime_type, size } = c.req.valid('json');
        const key = getFileKey(filename, hash);
        const [storedObject, databaseRecord] = await Promise.all([
          storage.head(key),
          db.getFile(key),
        ]);

        if (!storedObject) {
          if (databaseRecord) await db.deleteFile(key);
          return c.json({ exists: false });
        }

        const { metadata, error } = await resolveExistingFile({
          storage, db, key, filename, mimeType: mime_type, size, hash, storedObject, databaseRecord,
        });
        if (error) return c.json({ error }, 409);
        return c.json({ message: 'File already exists', exists: true, url: `/files/${key}`, metadata });
      } catch (error) {
        console.error('Check file error:', error);
        return c.json({ error: 'Failed to check file' }, 500);
      }
    },
  )
  .post(
    '/api/files',
    authMiddleware,
    zValidator('form', fileUploadFormSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid form data', issues: result.error.issues }, 400);
      }
    }),
    async (c) => {
      const storage = new CloudflareR2Service(c.env.BUCKET, 'files');
      const db = new CloudflareD1Service(c.env.DB);
      try {
        const { file, hash } = c.req.valid('form');
        const key = getFileKey(file.name, hash);
        const [storedObject, databaseRecord] = await Promise.all([
          storage.head(key),
          db.getFile(key),
        ]);

        if (storedObject) {
          const { metadata, error } = await resolveExistingFile({
            storage, db, key, filename: file.name, mimeType: file.type, size: file.size, hash, storedObject, databaseRecord,
          });
          if (error) return c.json({ error }, 409);
          return c.json({ message: 'File already exists', exists: true, url: `/files/${key}`, metadata });
        }

        const uploadedAt = new Date().toISOString();
        await storage.put(key, file.stream(), {
          contentType: file.type || 'application/octet-stream',
          customMetadata: { uploadedAt },
          sha256: hash,
        });

        const metadata = buildFileMetadata(key, file.name, file.type, file.size, uploadedAt);
        await db.saveFile(metadata);
        return c.json({ message: 'File uploaded successfully', exists: false, url: `/files/${key}`, metadata });
      } catch (error) {
        if (isHashMismatchError(error)) {
          return c.json({ error: 'Uploaded content does not match its SHA-256 hash' }, 409);
        }
        console.error('Upload error:', error);
        return c.json({ error: 'Upload failed' }, 500);
      }
    },
  )
  .post(
    '/api/files/multipart/create',
    authMiddleware,
    zValidator('json', fileDescriptorSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid JSON data', issues: result.error.issues }, 400);
      }
    }),
    async (c) => {
      const storage = new CloudflareR2Service(c.env.BUCKET, 'files');
      const db = new CloudflareD1Service(c.env.DB);
      try {
        const { filename, hash, mime_type, size } = c.req.valid('json');
        const key = getFileKey(filename, hash);
        const [storedObject, databaseRecord] = await Promise.all([
          storage.head(key),
          db.getFile(key),
        ]);

        if (storedObject) {
          const { metadata, error } = await resolveExistingFile({
            storage, db, key, filename, mimeType: mime_type, size, hash, storedObject, databaseRecord,
          });
          if (error) return c.json({ error }, 409);
          return c.json({ message: 'File already exists', exists: true, url: `/files/${key}`, metadata });
        }

        if (databaseRecord) {
          await db.deleteFile(key);
        }

        const uploadedAt = new Date().toISOString();
        const upload = await c.env.BUCKET.createMultipartUpload(`files/${key}`, {
          httpMetadata: { contentType: mime_type },
          customMetadata: { uploadedAt, expectedSize: String(size) },
        });
        return c.json({ upload_id: upload.uploadId, key });
      } catch (error) {
        console.error('Create multipart upload error:', error);
        return c.json({ error: 'Failed to create multipart upload' }, 500);
      }
    },
  )
  .put(
    '/api/files/multipart/upload',
    authMiddleware,
    zValidator('query', multipartQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid multipart query', issues: result.error.issues }, 400);
      }
    }),
    async (c) => {
      try {
        const { upload_id, key, part_number } = c.req.valid('query');
        const body = c.req.raw.body;
        if (!body) {
          return c.json({ error: 'No request body provided' }, 400);
        }
        const contentLength = Number(c.req.header('Content-Length'));
        if (Number.isFinite(contentLength) && contentLength > MULTIPART_CHUNK_SIZE) {
          return c.json({ error: 'Multipart chunk is too large' }, 413);
        }

        const upload = c.env.BUCKET.resumeMultipartUpload(`files/${key}`, upload_id);
        const uploadBody = body as unknown as Parameters<typeof upload.uploadPart>[1];
        const part = await upload.uploadPart(part_number, uploadBody);
        return c.json({ partNumber: part_number, etag: part.etag });
      } catch (error) {
        console.error('Part upload error:', error);
        return c.json({ error: 'Failed to upload part' }, 500);
      }
    },
  )
  .post(
    '/api/files/multipart/complete',
    authMiddleware,
    zValidator('json', multipartCompleteSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid JSON data', issues: result.error.issues }, 400);
      }
    }),
    async (c) => {
      const storage = new CloudflareR2Service(c.env.BUCKET, 'files');
      const db = new CloudflareD1Service(c.env.DB);
      try {
        const { upload_id, parts, mime_type, filename, hash, size } = c.req.valid('json');
        const key = getFileKey(filename, hash);
        const [storedObject, databaseRecord] = await Promise.all([
          storage.head(key),
          db.getFile(key),
        ]);

        if (storedObject) {
          const { metadata, error } = await resolveExistingFile({
            storage, db, key, filename, mimeType: mime_type, size, hash, storedObject, databaseRecord,
          });
          if (error) return c.json({ error }, 409);
          return c.json({ message: 'File already exists', exists: true, url: `/files/${key}`, metadata });
        }

        if (databaseRecord) {
          await db.deleteFile(key);
        }

        const upload = c.env.BUCKET.resumeMultipartUpload(`files/${key}`, upload_id);
        await upload.complete([...parts].sort((left, right) => left.partNumber - right.partNumber));
        const completedObject = await storage.head(key);
        if (!completedObject) {
          throw new Error('Completed object is unavailable');
        }
        if (completedObject.contentLength !== size) {
          await storage.delete(key);
          return c.json({ error: 'Completed object size does not match the upload' }, 409);
        }
        if (!(await storedObjectMatchesHash(storage, key, completedObject, hash))) {
          await storage.delete(key);
          return c.json({ error: 'Completed object content does not match its SHA-256 hash' }, 409);
        }

        const metadata = metadataFromObject(key, filename, mime_type, completedObject);
        await db.saveFile(metadata);
        return c.json({ message: 'File uploaded successfully', exists: false, url: `/files/${key}`, metadata });
      } catch (error) {
        console.error('Complete multipart upload error:', error);
        return c.json({ error: 'Failed to complete multipart upload' }, 500);
      }
    },
  )
  .delete(
    '/api/files/multipart/abort',
    authMiddleware,
    zValidator('query', multipartAbortSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid multipart query', issues: result.error.issues }, 400);
      }
    }),
    async (c) => {
      try {
        const { upload_id, key } = c.req.valid('query');
        const upload = c.env.BUCKET.resumeMultipartUpload(`files/${key}`, upload_id);
        await upload.abort();
        return c.json({ message: 'Multipart upload aborted successfully' });
      } catch (error) {
        console.error('Abort multipart upload error:', error);
        return c.json({ error: 'Failed to abort multipart upload' }, 500);
      }
    },
  )
  .get('/share/:filename', async (c) => {
    const { filename } = c.req.param();
    const db = new CloudflareD1Service(c.env.DB);
    try {
      const fileRecord = await db.getFile(filename);
      if (!fileRecord) {
        return c.json({ error: 'File not found' }, 404);
      }
      if (!fileRecord.mime_type.startsWith('image/')) {
        return c.redirect(`/files/${filename}`, 302);
      }

      c.header('Cache-Control', 'public, max-age=60');
      return c.html(renderSharePage(fileRecord, new URL(c.req.url).origin));
    } catch (error) {
      console.error(`Error rendering share page ${filename}:`, error);
      return c.json({ error: 'Failed to render share page' }, 500);
    }
  })
  .get('/files/:filename', async (c) => {
    const { filename } = c.req.param();
    const level = c.req.query('level') as ImageCompressionLevel | undefined;
    const db = new CloudflareD1Service(c.env.DB);
    const originalStorage = new CloudflareR2Service(c.env.BUCKET, 'files');

    try {
      const fileRecord = await db.getFile(filename);
      if (!fileRecord) {
        return c.json({ error: 'File not found' }, 404);
      }

      if (!fileRecord.mime_type.startsWith('image/') || !level || fileRecord.size > 10 * 1024 * 1024) {
        return c.redirect(`/r2/files/${filename}`, 302);
      }

      const parsedLevel = ImageCompressionLevelSchema.safeParse(level);
      if (!parsedLevel.success) {
        return c.redirect(`/r2/files/${filename}`, 302);
      }

      const validLevel = parsedLevel.data;
      const cacheStorage = new CloudflareR2Service(c.env.BUCKET, `cache/${validLevel}`);
      if (await cacheStorage.head(filename)) {
        return c.redirect(`/r2/cache/${validLevel}/${filename}`, 302);
      }

      const originalObject = await originalStorage.get(filename);
      if (!originalObject?.body) {
        return c.json({ error: 'Original file not found' }, 404);
      }
      if (originalObject.metadata.contentLength > 10 * 1024 * 1024) {
        return c.redirect(`/r2/files/${filename}`, 302);
      }

      try {
        const imageData = await new Response(originalObject.body).arrayBuffer();
        const imageService = new CloudflareImageService(c.env.IMAGES);
        const compressed = await imageService.compress(imageData, validLevel);
        if (!compressed) {
          throw new Error('Image compression failed');
        }
        await cacheStorage.put(filename, compressed.data, { contentType: compressed.mimeType });
        return c.redirect(`/r2/cache/${validLevel}/${filename}`, 302);
      } catch (error) {
        console.error(`Failed to compress ${filename}:`, error);
        return c.redirect(`/r2/files/${filename}`, 302);
      }
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
      return c.json({ error: 'Failed to process file' }, 500);
    }
  })
  .put(
    '/api/files/:filename',
    authMiddleware,
    zValidator('json', fileUpdateSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'Invalid JSON data', issues: result.error.issues }, 400);
      }
    }),
    async (c) => {
      const { filename } = c.req.param();
      const db = new CloudflareD1Service(c.env.DB);
      try {
        const fileRecord = await db.getFile(filename);
        if (!fileRecord) {
          return c.json({ error: 'File not found' }, 404);
        }

        const { title, description } = c.req.valid('json');
        const updatedRecord: FileMetadata = {
          ...fileRecord,
          title: title ?? fileRecord.title,
          description: description ?? fileRecord.description,
        };
        await db.saveFile(updatedRecord);
        return c.json({ message: 'File information updated successfully', info: updatedRecord });
      } catch (error) {
        console.error(`Error updating file ${filename}:`, error);
        return c.json({ error: 'Failed to update file information' }, 500);
      }
    },
  )
  .delete('/api/files/:filename', authMiddleware, async (c) => {
    const { filename } = c.req.param();
    const db = new CloudflareD1Service(c.env.DB);
    const originalStorage = new CloudflareR2Service(c.env.BUCKET, 'files');

    try {
      const cacheDeletions = ImageCompressionLevelSchema.options.map((level) => (
        new CloudflareR2Service(c.env.BUCKET, `cache/${level}`).delete(filename)
      ));
      await Promise.all([originalStorage.delete(filename), ...cacheDeletions]);
      await db.deleteFile(filename);
      return c.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error(`Error deleting file ${filename}:`, error);
      return c.json({ error: 'Failed to delete file' }, 500);
    }
  })
  .get('/r2/files/:filename', async (c) => {
    const storage = new CloudflareR2Service(c.env.BUCKET, 'files');
    return streamR2Object(c, storage, c.req.param('filename'));
  })
  .get(
    '/r2/cache/:level/:filename',
    validator('param', (value, c) => {
      const level = ImageCompressionLevelSchema.safeParse(value.level);
      if (!level.success) {
        return c.text('Invalid compression level', 400);
      }
      return { level: level.data, filename: value.filename };
    }),
    async (c) => {
      const { level, filename } = c.req.valid('param');
      const storage = new CloudflareR2Service(c.env.BUCKET, `cache/${level}`);
      return streamR2Object(c, storage, filename);
    },
  );

const buildObjectHeaders = (
  metadata: StorageObjectMetadata,
  contentLength: number,
): Headers => {
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Cache-Control': IMMUTABLE_CACHE_CONTROL,
    'Content-Length': String(contentLength),
    'X-Content-Type-Options': 'nosniff',
  });
  if (metadata.contentType) {
    headers.set('Content-Type', metadata.contentType);
  }
  if (metadata.etag) {
    headers.set('ETag', metadata.etag);
  }
  return headers;
};

async function streamR2Object(c: Context, storage: StorageService, key: string): Promise<Response> {
  try {
    const rangeHeader = c.req.header('Range');
    if (rangeHeader) {
      const metadata = await storage.head(key);
      if (!metadata) {
        return c.json({ error: 'Object not found' }, 404);
      }

      const parsedRange = parseRangeHeader(rangeHeader, metadata.contentLength);
      if (!parsedRange.valid) {
        return new Response('Range Not Satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${metadata.contentLength}` },
        });
      }

      const object = await storage.get(key, parsedRange.range);
      if (!object?.body) {
        return c.json({ error: 'Object not found' }, 404);
      }

      const headers = buildObjectHeaders(metadata, parsedRange.range.length);
      const end = parsedRange.range.offset + parsedRange.range.length - 1;
      headers.set('Content-Range', `bytes ${parsedRange.range.offset}-${end}/${metadata.contentLength}`);
      return new Response(object.body, { status: 206, headers });
    }

    const object = await storage.get(key);
    if (!object?.body) {
      return c.json({ error: 'Object not found' }, 404);
    }
    return new Response(object.body, {
      headers: buildObjectHeaders(object.metadata, object.metadata.contentLength),
    });
  } catch (error) {
    console.error(`Failed to retrieve ${key} from R2:`, error);
    return c.json({ error: 'Failed to retrieve file' }, 500);
  }
}

export default app;
export type AppType = typeof route;
