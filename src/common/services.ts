import { z } from 'zod';

export interface FileMetadata {
    filename: string;
    title?: string | null;
    description?: string | null;
    mime_type: string;
    size: number;
    uploaded_at: string;
}

export interface StorageObjectMetadata {
    contentType?: string;
    contentLength: number;
    etag?: string;
    sha256?: string;
    customMetadata?: Record<string, string>;
}

export interface StorageObject {
    body: ReadableStream<Uint8Array> | ArrayBuffer | null;
    metadata: StorageObjectMetadata;
}

export interface StorageWriteMetadata {
    contentType?: string;
    customMetadata?: Record<string, string>;
    sha256?: string;
}

export interface StorageRange {
    offset: number;
    length: number;
}

export interface StorageService {
    put(key: string, data: ReadableStream | ArrayBuffer | Blob, metadata?: StorageWriteMetadata): Promise<{ etag?: string }>;
    get(key: string, range?: StorageRange): Promise<StorageObject | null>;
    delete(key: string): Promise<void>;
    head(key: string): Promise<StorageObjectMetadata | null>;
}

export const ListFilesOptionsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    sort: z.enum(['asc', 'desc']).default('desc'),
    sort_by: z.enum(['uploaded_at', 'size']).default('uploaded_at'),
    mime_type: z.string().max(255).optional(),
    search: z.string().trim().max(200).optional(),
});
export type ListFilesOptions = z.infer<typeof ListFilesOptionsSchema>;

export interface DatabaseService {
    saveFile(record: FileMetadata): Promise<void>;
    getFile(filename: string): Promise<FileMetadata | null>;
    deleteFile(filename: string): Promise<void>;
    listFiles(options?: ListFilesOptions): Promise<FileMetadata[]>;
    countFiles(options?: ListFilesOptions): Promise<number>;
}

export const ImageCompressionLevelSchema = z.enum(['low', 'mid', 'high']);
export type ImageCompressionLevel = z.infer<typeof ImageCompressionLevelSchema>;

export interface ImageProcessingService {
    compress(imageData: ArrayBuffer, level: ImageCompressionLevel): Promise<{ data: ArrayBuffer, mimeType: string } | null>;
}
