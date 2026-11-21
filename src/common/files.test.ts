import { describe, expect, it } from 'vitest';

import { getFileKey, getImageVariantKey } from './files';

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

describe('getImageVariantKey', () => {
  it('uses a WebP extension regardless of the original extension', () => {
    const hash = 'a'.repeat(64);
    expect(getImageVariantKey(`${hash}.jpeg`)).toBe(`${hash}.webp`);
    expect(getImageVariantKey(hash)).toBe(`${hash}.webp`);
  });
});
