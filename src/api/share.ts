import type { FileMetadata } from '../common/services';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character] ?? character));

export const renderSharePage = (file: FileMetadata, origin: string): string => {
  const title = file.title || file.filename;
  const description = file.description || 'ZenGallery 图片分享';
  const shareUrl = `${origin}/share/${file.filename}`;
  const imageUrl = `${origin}/files/${file.filename}?level=mid`;
  const shareData = JSON.stringify(file)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · ZenGallery</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(shareUrl)}">
    <link rel="icon" href="/favicon.ico">
    <link rel="stylesheet" href="/static/assets/style.css">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="ZenGallery">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(shareUrl)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta name="twitter:card" content="summary_large_image">
    <script>
      document.documentElement.classList.toggle(
        'dark',
        localStorage.theme === 'dark' ||
          (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
      window.__ZEN_GALLERY_SHARE__ = ${shareData};
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/static/client.js"></script>
  </body>
</html>`;
};
