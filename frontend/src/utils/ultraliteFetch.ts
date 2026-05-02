// UltraLite text fetcher — uses r.jina.ai as a server-side rendering proxy.
// r.jina.ai (free, no auth) accepts ANY URL and returns clean markdown of just
// the article/page text — typically 5-30 KB instead of the original 1+ MB.
// We then convert the markdown to a small HTML document with a B&W stylesheet
// and render it in the WebView via source={{ html, baseUrl }}.
//
// Why not fetch + parse the original HTML ourselves?
//   On a 64 kbps link the original HTML alone takes 30-120 s to download. Doing
//   the heavy lifting on jina's CDN (which is fast & cached) means we only ever
//   pull a small text payload — the whole point of an Opera-Mini-like browser.

const PROXY_PREFIX = 'https://r.jina.ai/';

// Login / auth URL patterns — these need real JS + cookies, so skip the proxy.
const LOGIN_RE =
  /\/(login|signin|sign-in|signup|sign-up|register|accounts\/login|accounts\/signup|auth|oauth|sso|identity|checkpoint|challenge|two_factor|verify|recover)(\/|$|\?|#)|login\.live\.com|accounts\.google\.com|\.facebook\.com\/login|\.instagram\.com\/accounts\/|passport\.|auth\./i;

export function isLoginUrl(url: string): boolean {
  if (!url) return false;
  return LOGIN_RE.test(url);
}

const BW_HEAD = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body { background:#fff; color:#000; margin:0; padding:0; }
  body { font-family: Georgia, serif; font-size:17px; line-height:1.55; padding:14px; max-width:100%; word-wrap:break-word; overflow-wrap:break-word; }
  h1,h2,h3,h4,h5,h6 { color:#000; margin:14px 0 6px; font-weight:700; }
  h1{font-size:22px;} h2{font-size:19px;} h3,h4{font-size:17px;}
  p { margin: 6px 0; }
  a, a:link { color:#000; text-decoration:underline; word-break:break-all; }
  a:visited { color:#555; }
  ul,ol { padding-left:22px; margin:6px 0; }
  li { margin:3px 0; }
  hr { border:0; border-top:1px solid #000; margin:12px 0; }
  blockquote { border-left:3px solid #000; padding-left:10px; margin:8px 0; color:#222; }
  code { font-family: monospace; background:#eee; padding:1px 4px; border-radius:2px; font-size:15px; }
  pre { background:#f4f4f4; padding:8px; overflow-x:auto; border-left:3px solid #000; font-size:14px; }
  pre code { background:transparent; padding:0; }
  table { border-collapse:collapse; margin:6px 0; }
  td, th { border:1px solid #000; padding:3px 6px; }
  .__ul_xbox { display:inline-block; width:38px; height:38px; border:1px solid #000; text-align:center; line-height:34px; color:#000; background:#fff; font-size:22px; vertical-align:middle; margin:2px; font-weight:700; text-decoration:none; }
  .__ul_meta { color:#666; font-size:13px; padding:8px 0; border-bottom:1px solid #ddd; margin-bottom:10px; }
  .__ul_actions { padding:10px 0; border-top:1px solid #ddd; margin-top:14px; font-size:14px; color:#444; }
  .__ul_actions a { display:inline-block; padding:4px 10px; border:1px solid #000; margin-right:6px; }
</style>
</head>
<body>
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Tiny markdown → HTML converter. Handles the subset r.jina.ai actually emits.
function md2html(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inCode = false;
  let codeLang = '';
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inlineMd(para.join(' '))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (inList && listType) {
      out.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  };

  for (let raw of lines) {
    if (inCode) {
      if (/^```/.test(raw)) {
        out.push('</code></pre>');
        inCode = false;
        codeLang = '';
        continue;
      }
      out.push(escapeHtml(raw));
      continue;
    }
    const line = raw.trim();
    // Code fence
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      flushPara();
      flushList();
      codeLang = fence[1] || '';
      out.push(`<pre><code data-lang="${codeLang}">`);
      inCode = true;
      continue;
    }
    // Empty line → paragraph break
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    // Heading
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      flushPara();
      flushList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`);
      continue;
    }
    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushPara();
      flushList();
      out.push('<hr>');
      continue;
    }
    // Blockquote
    if (line.startsWith('>')) {
      flushPara();
      flushList();
      out.push(
        `<blockquote>${inlineMd(line.replace(/^>\s?/, ''))}</blockquote>`
      );
      continue;
    }
    // Unordered list
    const ul = line.match(/^[-*+]\s+(.+)$/);
    if (ul) {
      flushPara();
      if (!inList || listType !== 'ul') {
        flushList();
        out.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      out.push(`<li>${inlineMd(ul[1])}</li>`);
      continue;
    }
    // Ordered list
    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      flushPara();
      if (!inList || listType !== 'ol') {
        flushList();
        out.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      out.push(`<li>${inlineMd(ol[1])}</li>`);
      continue;
    }
    // Default → paragraph accumulator
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

// Inline markdown: bold, italic, code, links, images.
function inlineMd(s: string): string {
  // Escape first, then re-introduce markdown tokens.
  let html = escapeHtml(s);
  // Images: ![alt](url) → X-box (we skip the actual image for bandwidth)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt) => {
    const safeAlt = String(alt).slice(0, 60);
    return `<span class="__ul_xbox" title="${safeAlt}">×</span>`;
  });
  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, txt, href) => `<a href="${href}">${txt}</a>`
  );
  // Bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text* (avoid clashing with already-converted strong)
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  return html;
}

/**
 * Fetch a URL via r.jina.ai (text-only proxy) and return a styled B&W HTML
 * document ready for source={{ html, baseUrl }}. Falls back gracefully on
 * proxy failure with a user-actionable error page.
 */
export async function fetchCleanHtml(url: string): Promise<string> {
  const proxied = `${PROXY_PREFIX}${url}`;
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 12000);
  let body = '';
  let title = '';
  try {
    const res = await fetch(proxied, {
      signal: ctrl.signal,
      headers: {
        Accept: 'text/plain, text/markdown, */*',
        'X-Return-Format': 'markdown',
      },
    });
    if (!res.ok) {
      throw new Error(`Proxy returned ${res.status}`);
    }
    const md = await res.text();
    // r.jina.ai output convention: starts with "Title:" / "URL Source:" headers.
    const titleMatch = md.match(/^Title:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1].trim();
    // Strip the leading meta block (Title:, URL Source:, Markdown Content:).
    const stripped = md
      .replace(/^Title:.*$/m, '')
      .replace(/^URL Source:.*$/m, '')
      .replace(/^Markdown Content:\s*/m, '')
      .replace(/^Published Time:.*$/m, '')
      .trim();
    body = md2html(stripped);
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Request timed out' : e?.message || 'Proxy error';
    body = `
      <h2>Couldn't load this page in UltraLite</h2>
      <p>${escapeHtml(msg)} — the lite proxy didn't respond fast enough.</p>
      <p><a href="${escapeHtml(url)}">Open ${escapeHtml(url)}</a> in this same window (UltraLite will retry), or switch to <strong>Normal mode</strong> from the toggle at the top.</p>
    `;
  } finally {
    clearTimeout(tm);
  }
  const titleHtml = title ? `<h1>${escapeHtml(title)}</h1>` : '';
  const meta = `<div class="__ul_meta">UltraLite mode · ${escapeHtml(
    new URL(url).hostname
  )}</div>`;
  const footer = `<div class="__ul_actions"><a href="${escapeHtml(
    url
  )}">Open original</a> Switch to Normal mode for full version.</div>`;
  return `${BW_HEAD}${meta}${titleHtml}${body}${footer}</body></html>`;
}
