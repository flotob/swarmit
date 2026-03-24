/**
 * Conservative markdown→HTML renderer.
 * Escape-first: all HTML is escaped, then a whitelist of markdown patterns is applied.
 * No raw HTML passthrough.
 */

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/**
 * Render a markdown body to an HTML string.
 * Whitelist: bold, italic, links, inline code, code blocks, paragraphs, line breaks.
 * @param {string} text - Raw markdown text
 * @returns {string} Safe HTML string
 */
export function renderMarkdown(text) {
  if (!text) return '';

  const escaped = escapeHtml(text);

  // Code blocks (``` ... ```)
  let html = escaped.replace(/```([\s\S]*?)```/g, (_m, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold (**...**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (*...*)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links [text](url) — only allow http/https/bzz URLs
  html = html.replace(/\[([^\]]+)\]\(((https?|bzz):\/\/[^)]+)\)/g,
    '<a href="$2" rel="noopener noreferrer">$1</a>'
  );

  // Paragraphs (double newline)
  html = html.split(/\n\n+/).map((p) => {
    p = p.trim();
    if (!p) return '';
    // Don't wrap pre blocks in paragraphs
    if (p.startsWith('<pre>')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

/**
 * Create a DOM element with rendered markdown content.
 * @param {string} text - Raw markdown text
 * @returns {HTMLElement}
 */
export function createMarkdownElement(text) {
  const div = document.createElement('div');
  div.className = 'markdown-body';
  div.innerHTML = renderMarkdown(text);
  return div;
}
