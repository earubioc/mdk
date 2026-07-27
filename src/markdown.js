/**
 * Minimal, dependency-free Markdown -> HTML renderer for MDK.
 * Covers the subset needed by the editor: headings, bold/italic, inline code,
 * fenced code blocks, blockquotes, ordered/unordered lists, links, hr, tables (simple), paragraphs.
 * Exposed as a global `MDKMarkdown.render(src)` for use from a plain <script> tag (no bundler).
 */
(function (global) {
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderInline(text) {
    let out = escapeHtml(text);
    // inline code first so its contents are not touched by other rules
    out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
    // bold
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // italic
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/(^|[^\w])_([^_]+)_(?!\w)/g, '$1<em>$2</em>');
    // links [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, txt, url) => {
      const safeUrl = url.replace(/"/g, '%22');
      return `<a href="${safeUrl}" target="_blank" rel="noopener">${txt}</a>`;
    });
    return out;
  }

  function render(src) {
    const lines = (src || '').replace(/\r\n/g, '\n').split('\n');
    const html = [];
    let i = 0;
    let inCodeBlock = false;
    let codeLines = [];
    let listStack = null; // { type: 'ul'|'ol', items: [] }
    let paragraphLines = [];

    function flushParagraph() {
      if (paragraphLines.length) {
        html.push('<p>' + renderInline(paragraphLines.join(' ')) + '</p>');
        paragraphLines = [];
      }
    }

    function flushList() {
      if (listStack) {
        const tag = listStack.type;
        html.push(`<${tag}>` + listStack.items.map((it) => `<li>${renderInline(it)}</li>`).join('') + `</${tag}>`);
        listStack = null;
      }
    }

    while (i < lines.length) {
      const line = lines[i];

      // fenced code block
      const fenceMatch = line.match(/^```(.*)$/);
      if (fenceMatch) {
        if (!inCodeBlock) {
          flushParagraph();
          flushList();
          inCodeBlock = true;
          codeLines = [];
        } else {
          html.push('<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
          inCodeBlock = false;
        }
        i++;
        continue;
      }
      if (inCodeBlock) {
        codeLines.push(line);
        i++;
        continue;
      }

      // blank line
      if (/^\s*$/.test(line)) {
        flushParagraph();
        flushList();
        i++;
        continue;
      }

      // headings
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = headingMatch[1].length;
        html.push(`<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`);
        i++;
        continue;
      }

      // horizontal rule
      if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
        flushParagraph();
        flushList();
        html.push('<hr>');
        i++;
        continue;
      }

      // blockquote
      if (/^>\s?/.test(line)) {
        flushParagraph();
        flushList();
        const quoteLines = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        html.push('<blockquote>' + quoteLines.map((l) => renderInline(l)).join('<br>') + '</blockquote>');
        continue;
      }

      // unordered list
      const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ulMatch) {
        if (!listStack || listStack.type !== 'ul') {
          flushParagraph();
          flushList();
          listStack = { type: 'ul', items: [] };
        }
        listStack.items.push(ulMatch[1]);
        i++;
        continue;
      }

      // ordered list
      const olMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (olMatch) {
        if (!listStack || listStack.type !== 'ol') {
          flushParagraph();
          flushList();
          listStack = { type: 'ol', items: [] };
        }
        listStack.items.push(olMatch[1]);
        i++;
        continue;
      }

      // plain paragraph text
      flushList();
      paragraphLines.push(line.trim());
      i++;
    }

    if (inCodeBlock) {
      html.push('<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
    }
    flushParagraph();
    flushList();

    return html.join('\n');
  }

  global.MDKMarkdown = { render };
})(window);
