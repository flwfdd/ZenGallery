import { describe, expect, it } from 'vitest';

import type { StorageObject, StorageService } from '../common/services';
import { storedObjectMatchesHash } from './hash';

const HELLO_HASH = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

const storageWithBody = (body: StorageObject['body']): StorageService => ({
  async get() {
    return { body, metadata: { contentLength: 5 } };
  },
  async put() {
    return {};
  },
  async delete() {},
  async head() {
    return null;
  },
});

describe('storedObjectMatchesHash', () => {
  it('hashes a stored object stream without trusting the client key', async () => {
    const storage = storageWithBody(new Response('hello').body);
    await expect(storedObjectMatchesHash(storage, 'key', { contentLength: 5 }, HELLO_HASH)).resolves.toBe(true);
  });

  it('rejects content whose actual hash differs from the claimed key', async () => {
    const storage = storageWithBody(new Response('hello').body);
    await expect(storedObjectMatchesHash(storage, 'key', { contentLength: 5 }, 'a'.repeat(64))).resolves.toBe(false);
  });
});
