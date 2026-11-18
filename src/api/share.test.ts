import { describe, expect, it } from 'vitest';

import type { FileMetadata } from '../common/services';
import { renderSharePage } from './share';

const file: FileMetadata = {
  filename: `${'a'.repeat(64)}.jpeg`,
  title: '<Mountain & "Lake">',
  description: 'A <script>alert(1)</script>',
  mime_type: 'image/jpeg',
  size: 12345,
  uploaded_at: '2026-11-18T00:00:00.000Z',
};

describe('renderSharePage', () => {
  it('renders the share URL, image, metadata and social preview', () => {
    const html = renderSharePage(file, 'http://localhost');
    expect(html).toContain(`http://localhost/share/${file.filename}`);
    expect(html).toContain(`http://localhost/files/${file.filename}?level=mid`);
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('/static/assets/style.css');
    expect(html).toContain('/static/client.js');
    expect(html).toContain('window.__ZEN_GALLERY_SHARE__');
  });

  it('escapes user-editable metadata', () => {
    const html = renderSharePage(file, 'http://localhost');
    expect(html).toContain('&lt;Mountain &amp; &quot;Lake&quot;&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
