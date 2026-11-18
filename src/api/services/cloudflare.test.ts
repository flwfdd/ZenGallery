import type { D1Database, R2Bucket, R2PutOptions } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';

import { CloudflareD1Service, CloudflareR2Service } from './cloudflare';

describe('CloudflareD1Service filters', () => {
  it('binds multiple MIME prefixes and searches filenames', async () => {
    let preparedQuery = '';
    let boundValues: unknown[] = [];
    const database = {
      prepare(query: string) {
        preparedQuery = query;
        const statement = {
          bind(...values: unknown[]) {
            boundValues = values;
            return statement;
          },
          async all() {
            return { results: [] };
          },
        };
        return statement;
      },
    } as unknown as D1Database;

    const service = new CloudflareD1Service(database);
    await service.listFiles({
      limit: 20,
      offset: 0,
      sort: 'desc',
      sort_by: 'uploaded_at',
      mime_type: 'application/zip,application/gzip',
      search: 'archive',
    });

    expect(preparedQuery).toContain('(mime_type LIKE ? OR mime_type LIKE ?)');
    expect(preparedQuery).toContain('filename LIKE ?');
    expect(boundValues).toEqual([
      'application/zip%',
      'application/gzip%',
      '%archive%',
      '%archive%',
      '%archive%',
      20,
    ]);
  });
});

describe('CloudflareR2Service writes', () => {
  it('passes the expected SHA-256 checksum to R2', async () => {
    let options: R2PutOptions | undefined;
    const bucket = {
      async put(_key: string, _data: unknown, writeOptions: R2PutOptions) {
        options = writeOptions;
        return { etag: 'etag' };
      },
    } as unknown as R2Bucket;
    const service = new CloudflareR2Service(bucket, 'files');
    const sha256 = 'a'.repeat(64);

    await service.put('key', new ArrayBuffer(1), { sha256 });

    expect(options?.sha256).toBe(sha256);
  });
});
