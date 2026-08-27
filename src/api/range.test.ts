import { describe, expect, it } from 'vitest';

import { parseRangeHeader } from './range';

describe('parseRangeHeader', () => {
  it('parses an explicit byte range', () => {
    expect(parseRangeHeader('bytes=10-19', 100)).toEqual({
      valid: true,
      range: { offset: 10, length: 10 },
    });
  });

  it('clamps an open-ended range to the object size', () => {
    expect(parseRangeHeader('bytes=90-', 100)).toEqual({
      valid: true,
      range: { offset: 90, length: 10 },
    });
  });

  it('returns the requested suffix instead of the first bytes', () => {
    expect(parseRangeHeader('bytes=-20', 100)).toEqual({
      valid: true,
      range: { offset: 80, length: 20 },
    });
  });

  it.each(['bytes=100-101', 'bytes=20-10', 'bytes=-0', 'bytes=0-1,3-4', 'items=0-1'])(
    'rejects invalid range %s',
    (range) => expect(parseRangeHeader(range, 100)).toEqual({ valid: false }),
  );
});
