import type { D1Database } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';

import { CloudflareD1Service } from './cloudflare';

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
