import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type {
    DatabaseService,
    FileMetadata,
    ImageCompressionLevel,
    ImageProcessingService,
    ListFilesOptions,
    StorageObject,
    StorageObjectMetadata,
    StorageRange,
    StorageService,
    StorageWriteMetadata,
} from '../../common/services';

export class CloudflareR2Service implements StorageService {
    private bucket: R2Bucket;
    private prefix: string;

    constructor(bucket: R2Bucket, prefix: string = '') {
        this.bucket = bucket;
        this.prefix = prefix;
    }

    private getFullKey(key: string): string {
        let fullKey = key;
        if (this.prefix) {
            const p = this.prefix.endsWith('/') ? this.prefix : `${this.prefix}/`;
            const k = key.startsWith('/') ? key.substring(1) : key;
            fullKey = `${p}${k}`;
        }
        return fullKey.replace(/\/\/+/g, '/'); // Normalize multiple slashes
    }

    async put(key: string, data: ReadableStream | ArrayBuffer | Blob, metadata?: StorageWriteMetadata): Promise<{ etag?: string }> {
        const httpMetadata: Record<string, string> = {};
        if (metadata?.contentType) {
            httpMetadata.contentType = metadata.contentType;
        }

        const result = await this.bucket.put(this.getFullKey(key), data as Parameters<R2Bucket['put']>[1], {
            httpMetadata,
            customMetadata: metadata?.customMetadata,
            sha256: metadata?.sha256,
        });

        return {
            etag: result.etag
        };
    }

    async get(key: string, range?: StorageRange): Promise<StorageObject | null> {
        const object = await this.bucket.get(this.getFullKey(key), range ? { range } : undefined);
        if (object === null) {
            return null;
        }
        return {
            body: object.body as unknown as StorageObject['body'],
            metadata: {
                contentType: object.httpMetadata?.contentType,
                contentLength: object.size,
                etag: object.httpEtag,
                customMetadata: object.customMetadata,
            },
        };
    }

    async head(key: string): Promise<StorageObjectMetadata | null> {
        const object = await this.bucket.head(this.getFullKey(key));
        if (!object) {
            return null;
        }
        return {
            contentType: object.httpMetadata?.contentType,
            contentLength: object.size,
            etag: object.httpEtag,
            sha256: object.checksums?.toJSON().sha256,
            customMetadata: object.customMetadata,
        };
    }

    async delete(key: string): Promise<void> {
        await this.bucket.delete(this.getFullKey(key));
    }
}

export class CloudflareD1Service implements DatabaseService {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async saveFile(record: FileMetadata): Promise<void> {
        const stmt = this.db.prepare(
            `INSERT INTO files (filename, title, description, mime_type, size, uploaded_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (filename) DO UPDATE SET
                title = excluded.title,
                description = excluded.description,
                mime_type = excluded.mime_type,
                size = excluded.size,
                uploaded_at = excluded.uploaded_at`
        );
        await stmt.bind(
            record.filename,
            record.title || null,
            record.description || null,
            record.mime_type,
            record.size,
            record.uploaded_at
        ).run();
    }

    async getFile(filename: string): Promise<FileMetadata | null> {
        const stmt = this.db.prepare('SELECT * FROM files WHERE filename = ?');
        const result = await stmt.bind(filename).first<FileMetadata | undefined>();
        return result || null;
    }

    async deleteFile(filename: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM files WHERE filename = ?');
        await stmt.bind(filename).run();
    }

    async listFiles(options?: ListFilesOptions): Promise<FileMetadata[]> {
        let query = 'SELECT * FROM files';
        const { clause, params } = this.buildFilters(options);
        query += clause;

        // Add ORDER BY
        if (options?.sort_by) {
            const sortColumn = options.sort_by === 'uploaded_at' ? 'uploaded_at' : 'size';
            const sortOrder = options.sort === 'desc' ? 'DESC' : 'ASC';
            query += ` ORDER BY ${sortColumn} ${sortOrder}`;
        } else {
            // Default sort by upload time, newest first
            query += ' ORDER BY uploaded_at DESC';
        }

        // Add LIMIT and OFFSET for pagination
        if (options?.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);

            if (options?.offset) {
                query += ' OFFSET ?';
                params.push(options.offset);
            }
        }

        const stmt = this.db.prepare(query);
        const result = await stmt.bind(...params).all<FileMetadata>();
        return result.results || [];
    }

    async countFiles(options?: ListFilesOptions): Promise<number> {
        const { clause, params } = this.buildFilters(options);
        const result = await this.db
            .prepare(`SELECT COUNT(*) AS count FROM files${clause}`)
            .bind(...params)
            .first<{ count: number }>();
        return result?.count ?? 0;
    }

    private buildFilters(options?: ListFilesOptions): { clause: string; params: unknown[] } {
        const params: unknown[] = [];
        const conditions: string[] = [];

        if (options?.mime_type) {
            const mimeTypes = options.mime_type.split(',').map((value) => value.trim()).filter(Boolean);
            if (mimeTypes.length > 0) {
                conditions.push(`(${mimeTypes.map(() => 'mime_type LIKE ?').join(' OR ')})`);
                params.push(...mimeTypes.map((mimeType) => `${mimeType}%`));
            }
        }

        if (options?.search) {
            conditions.push('(filename LIKE ? OR title LIKE ? OR description LIKE ?)');
            const searchPattern = `%${options.search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        return {
            clause: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '',
            params,
        };
    }
}

export class CloudflareImageService implements ImageProcessingService {
    private imagesBinding: ImagesBinding;

    constructor(imagesBinding: ImagesBinding) {
        this.imagesBinding = imagesBinding;
    }

    async compress(imageData: ArrayBuffer, level: ImageCompressionLevel): Promise<{ data: ArrayBuffer, mimeType: string } | null> {
        try {
            // Convert ArrayBuffer to ReadableStream for Images API
            const imageStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(imageData));
                    controller.close();
                }
            });

            // Get transformation parameters based on compression level
            const transformParams = this.getTransformParams(level);

            // Transform image using Cloudflare Images API
            const transformedImageResponse = (
                await this.imagesBinding.input(imageStream)
                    .transform(transformParams.transform)
                    .output(transformParams.output)
            ).response();

            const transformedImageData = await transformedImageResponse.arrayBuffer();
            return {
                data: transformedImageData,
                mimeType: transformedImageResponse.headers.get('content-type') || transformParams.output.format,
            };

        } catch (error) {
            console.error('CloudFlare Images compression failed:', error);
            return null;
        }
    }

    private getTransformParams(level: ImageCompressionLevel): { transform: ImageTransform, output: ImageOutputOptions } {
        switch (level) {
            case 'low':
                return {
                    transform: {
                        width: 720,
                        height: 720,
                        fit: 'scale-down',
                    },
                    output: {
                        format: 'image/jpeg',
                        quality: 24,
                    },
                };
            case 'mid':
                return {
                    transform: {
                        width: 1080,
                        height: 1080,
                        fit: 'scale-down',
                    },
                    output: {
                        format: 'image/jpeg',
                        quality: 42,
                    },
                };
            default:
                return {
                    transform: {
                        width: 2160,
                        height: 2160,
                        fit: 'scale-down',
                    },
                    output: {
                        format: 'image/jpeg',
                        quality: 84,
                    },
                };
        }
    }
}
