import { describe, expect, it } from 'vitest';

import { getFileKey } from './files';

describe('getFileKey', () => {
  it('uses a normalized hash and safe lowercase extension', () => {
    const hash = 'A'.repeat(64);
    expect(getFileKey('Photo.JPEG', hash)).toBe(`${'a'.repeat(64)}.jpeg`);
  });

  it('drops unsafe or missing extensions', () => {
    const hash = 'b'.repeat(64);
    expect(getFileKey('README', hash)).toBe(hash);
    expect(getFileKey('archive.extension-is-too-long', hash)).toBe(hash);
  });
});
