import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Bindings } from './index';
import app from './index';

const SECRET_KEY = 'correct-horse-battery-staple';

interface DatabaseMock {
  database: D1Database;
  queries: string[];
}

const createDatabaseMock = (): DatabaseMock => {
  const queries: string[] = [];
  const database = {
    prepare(query: string) {
      let values: unknown[] = [];
      const statement = {
        bind(...boundValues: unknown[]) {
          values = boundValues;
          return statement;
        },
        async first() {
          if (query.startsWith('SELECT COUNT')) return { count: 0 };
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          queries.push(`${query}\n${JSON.stringify(values)}`);
          return { success: true };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
  return { database, queries };
};

const createBucketMock = (objectExists = false) => {
  const deleteMock = vi.fn(async () => undefined);
  const bucket = {
    async head() {
      if (!objectExists) return null;
      return {
        size: 5,
        httpEtag: '"etag"',
        httpMetadata: { contentType: 'text/plain' },
        customMetadata: { uploadedAt: '2026-08-27T00:00:00.000Z' },
      };
    },
    delete: deleteMock,
  } as unknown as R2Bucket;
  return { bucket, deleteMock };
};

const createBindings = (options: { secret?: string; objectExists?: boolean } = {}) => {
  const database = createDatabaseMock();
  const bucket = createBucketMock(options.objectExists);
  const bindings: Bindings = {
    SECRET_KEY: options.secret,
    DB: database.database,
    BUCKET: bucket.bucket,
    IMAGES: {} as ImagesBinding,
  };
  return { bindings, database, bucket };
};

describe('management authentication', () => {
  it('fails closed when SECRET_KEY is missing', async () => {
    const { bindings } = createBindings();
    const response = await app.request('/api/files', {}, bindings);
    expect(response.status).toBe(503);
  });

  it('sets an HttpOnly, strict same-site cookie after login', async () => {
    const { bindings } = createBindings({ secret: SECRET_KEY });
    const response = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_key: SECRET_KEY }),
    }, bindings);

    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(response.headers.get('Set-Cookie')).toContain('SameSite=Strict');
  });
});

describe('storage consistency recovery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recreates a missing D1 record when the R2 object already exists', async () => {
    const { bindings, database } = createBindings({ secret: SECRET_KEY, objectExists: true });
    const form = new FormData();
    form.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }));
    form.append('hash', 'a'.repeat(64));

    const response = await app.request('/api/files', {
      method: 'POST',
      headers: { Cookie: `secret-key=${SECRET_KEY}` },
      body: form,
    }, bindings);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ exists: true });
    expect(database.queries.some((query) => query.includes('INSERT INTO files'))).toBe(true);
  });

  it('makes deletion idempotent across the original and cached objects', async () => {
    const { bindings, database, bucket } = createBindings({ secret: SECRET_KEY });
    const response = await app.request(`/api/files/${'a'.repeat(64)}`, {
      method: 'DELETE',
      headers: { Cookie: `secret-key=${SECRET_KEY}` },
    }, bindings);

    expect(response.status).toBe(200);
    expect(bucket.deleteMock).toHaveBeenCalledTimes(4);
    expect(database.queries.some((query) => query.includes('DELETE FROM files'))).toBe(true);
  });
});
