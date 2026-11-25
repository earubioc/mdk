// Conversor HTML -> Markdown para pegar desde Word, Google Docs y páginas web.
// Sin dependencias. Se carga en el renderer (window.MDKHtmlMd) y también como
// módulo de Node para pruebas (se le pasa un DOMParser, p. ej. el de jsdom).
(function (root) {
  'use strict';

  var BLOCK = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DD|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HR|LI|MAIN|NAV|OL|P|PRE|SECTION|TABLE|UL)$/;
  var SKIP = /^(SCRIPT|STYLE|META|LINK|TITLE|HEAD|IMG|SVG|CANVAS|NOSCRIPT|O:P|XML)$/;

  // ¿Vale la pena convertir? Solo si el HTML trae estructura real (encabezados,
  // listas, tablas, o viene de Word/Docs). Así pegar código desde un editor no se altera.
  function shouldConvert(html) {
    return /<h[1-6][\s>]|<table[\s>]|<ul[\s>]|<ol[\s>]|MsoHeading|MsoTitle|MsoListParagraph|mso-list:|docs-internal-guid/i.test(String(html || ''));
  }

  function styleOf(el) { return (el.getAttribute && el.getAttribute('style') || '').toLowerCase().replace(/\s+/g, ''); }
  function isBoldStyle(s) { return /font-weight:(bold|[6-9]00)/.test(s); }
  function isNotBoldStyle(s) { return /font-weight:(normal|[1-5]00)/.test(s); }
  function isItalicStyle(s) { return /font-style:italic/.test(s); }

  // Pone los marcadores pegados al texto y deja los espacios fuera: "** a **" -> " **a** ".
  function wrap(inner, mark) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
    if (!m[2]) return inner;
    return m[1] + mark + m[2] + mark + m[3];
  }

  function inlineOf(node, o) {
    o = o || {};
    var out = '';
    for (var c = node.firstChild; c; c = c.nextSibling) out += inlineNode(c, o);
    return out;
  }

  function inlineNode(n, o) {
    if (n.nodeType === 3) return n.nodeValue.replace(/[\s ]+/g, ' ');
    if (n.nodeType !== 1) return '';
    var tag = n.nodeName.toUpperCase();
    if (SKIP.test(tag)) return '';
    var st = styleOf(n);
    if (/mso-list:ignore/.test(st)) return '';
    if (tag === 'BR') return o.plain ? ' ' : '  \n';
    var inner = inlineOf(n, o);
    if (o.plain) return inner;   // encabezados: sin negrita/cursiva internas
    if (tag === 'STRONG' || tag === 'B') return isNotBoldStyle(st) ? inner : wrap(inner, '**');
    if (tag === 'EM' || tag === 'I') return wrap(inner, '*');
    if (tag === 'CODE' || tag === 'TT' || tag === 'KBD' || tag === 'SAMP') return wrap(inner, '`');
    if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') return wrap(inner, '~~');
    if (tag === 'A') {
      var href = n.getAttribute('href') || '';
      var txt = inner.trim();
      if (!href || href.charAt(0) === '#' || !txt) return inner;
      return '[' + txt + '](' + href + ')';
    }
    if (tag === 'SPAN') {
      var r = inner;
      if (isItalicStyle(st)) r = wrap(r, '*');
      if (isBoldStyle(st)) r = wrap(r, '**');
      return r;
    }
    return inner;
  }

  function listBulletInfo(p) {
    // Word: <span style="mso-list:Ignore">·</span> o "1." delante del texto
    var spans = p.getElementsByTagName('span');
    for (var i = 0; i < spans.length; i++) {
      if (/mso-list:ignore/.test(styleOf(spans[i]))) {
        var t = (spans[i].textContent || '').replace(/[\s ]+/g, '');
        return { ordered: /^([0-9]+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)]$/.test(t) };
      }
    }
    return { ordered: false };
  }

  // ---- bloques ----
  function Blocks() { this.items = []; }
  Blocks.prototype.para = function (s) { s = s.trim(); if (s) this.items.push({ k: 'p', s: s }); };
  Blocks.prototype.list = function (s) { this.items.push({ k: 'l', s: s, o: /^\d+\. /.test(s), top: !/^ /.test(s) }); };
  Blocks.prototype.toString = function () {
    var out = '', prev = null, lastTop = null;
    this.items.forEach(function (it) {
      if (prev) {
        var same = prev.k === 'l' && it.k === 'l' && !(it.top && lastTop && lastTop.o !== it.o);
        out += same ? '\n' : '\n\n';
      }
      out += it.s; prev = it;
      if (it.k === 'l' && it.top) lastTop = it; else if (it.k !== 'l') lastTop = null;
    });
    return out;
  };

  function walkBlocks(el, bl, depth) {
    var buf = '';
    function flush() { bl.para(buf); buf = ''; }
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { buf += c.nodeValue.replace(/[\s ]+/g, ' '); continue; }
      if (c.nodeType !== 1) continue;
      var tag = c.nodeName.toUpperCase();
      if (SKIP.test(tag)) continue;
      if (!BLOCK.test(tag)) {
        // Word a veces mete <a name> o <span> con bloques dentro
        if (c.querySelector && c.querySelector('h1,h2,h3,h4,h5,h6,p,ul,ol,table,div')) { flush(); walkBlocks(c, bl, depth); }
        else buf += inlineNode(c, {});
        continue;
      }
      flush();
      block(c, bl, depth);
    }
    flush();
  }

  function block(el, bl, depth) {
    var tag = el.nodeName.toUpperCase();
    var m = /^H([1-6])$/.exec(tag);
    if (m) { var h = inlineOf(el, { plain: true }).replace(/\s+/g, ' ').trim(); if (h) bl.para(new Array(+m[1] + 1).join('#') + ' ' + h); return; }
    if (tag === 'HR') { bl.para('---'); return; }
    if (tag === 'PRE') { var code = (el.textContent || '').replace(/\s+$/, ''); if (code) bl.para('```\n' + code + '\n```'); return; }
    if (tag === 'UL' || tag === 'OL') { listBlock(el, bl, 0); return; }
    if (tag === 'TABLE') { tableBlock(el, bl); return; }
    if (tag === 'BLOCKQUOTE') {
      var inner = new Blocks(); walkBlocks(el, inner, depth);
      var q = inner.toString(); if (q) bl.para(q.split('\n').map(function (l) { return '> ' + l; }).join('\n'));
      return;
    }
    if (tag === 'P' || tag === 'DIV' || tag === 'LI' || tag === 'DD' || tag === 'DT' || tag === 'FIGCAPTION') {
      var cls = el.getAttribute('class') || '';
      var st = styleOf(el);
      var hm = /MsoHeading(\d)/i.exec(cls);
      if (hm) { var ht = inlineOf(el, { plain: true }).replace(/\s+/g, ' ').trim(); if (ht) bl.para(new Array(Math.min(6, +hm[1]) + 1).join('#') + ' ' + ht); return; }
      if (/^MsoTitle$/i.test(cls)) { var tt = inlineOf(el, { plain: true }).replace(/\s+/g, ' ').trim(); if (tt) bl.para('# ' + tt); return; }
      if (/MsoListParagraph/i.test(cls) || /mso-list:(?!ignore)/.test(st)) {
        var lv = /level(\d+)/.exec(st); var level = lv ? Math.max(1, +lv[1]) : 1;
        var info = listBulletInfo(el);
        var txt = inlineOf(el, {}).replace(/\s+/g, ' ').trim();
        if (txt) bl.list(new Array(level).join('  ') + (info.ordered ? '1. ' : '- ') + txt);
        return;
      }
      // contenedor con bloques dentro -> recursivo; si no, párrafo
      if (el.querySelector('h1,h2,h3,h4,h5,h6,p,ul,ol,table,pre,blockquote,div')) { walkBlocks(el, bl, depth); return; }
      bl.para(inlineOf(el, {}));
      return;
    }
    walkBlocks(el, bl, depth);
  }

  function listBlock(list, bl, level) {
    var ordered = list.nodeName.toUpperCase() === 'OL';
    for (var li = list.firstChild; li; li = li.nextSibling) {
      if (li.nodeType !== 1 || li.nodeName.toUpperCase() !== 'LI') continue;
      var text = '';
      var nested = [];
      for (var c = li.firstChild; c; c = c.nextSibling) {
        var tg = c.nodeType === 1 ? c.nodeName.toUpperCase() : '';
        if (tg === 'UL' || tg === 'OL') nested.push(c);
        else if (tg === 'P' || tg === 'DIV') text += ' ' + inlineOf(c, {});
        else text += inlineNode(c, {});
      }
      text = text.replace(/\s+/g, ' ').trim();
      if (text) bl.list(new Array(level + 1).join('  ') + (ordered ? '1. ' : '- ') + text);
      nested.forEach(function (n) { listBlock(n, bl, level + 1); });
    }
  }

  function tableBlock(tbl, bl) {
    var rows = [];
    var trs = tbl.getElementsByTagName('tr');
    for (var i = 0; i < trs.length; i++) {
      var cells = [];
      for (var c = trs[i].firstChild; c; c = c.nextSibling) {
        if (c.nodeType !== 1) continue;
        var tg = c.nodeName.toUpperCase();
        if (tg !== 'TD' && tg !== 'TH') continue;
        cells.push(inlineOf(c, {}).replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim());
      }
      if (cells.length) rows.push(cells);
    }
    if (!rows.length) return;
    var cols = rows.reduce(function (a, r) { return Math.max(a, r.length); }, 0);
    rows = rows.map(function (r) { while (r.length < cols) r.push(''); return r; });
    var line = function (r) { return '| ' + r.join(' | ') + ' |'; };
    var sep = '| ' + rows[0].map(function () { return '---'; }).join(' | ') + ' |';
    bl.para([line(rows[0]), sep].concat(rows.slice(1).map(line)).join('\n'));
  }

  function convert(html, ParserImpl) {
    var P = ParserImpl || (typeof DOMParser !== 'undefined' ? DOMParser : null);
    if (!P) throw new Error('DOMParser no disponible');
    var doc = new P().parseFromString(String(html || ''), 'text/html');
    var bl = new Blocks();
    walkBlocks(doc.body, bl, 0);
    return bl.toString().replace(/\*\*\*\*/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  var api = { convert: convert, shouldConvert: shouldConvert };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MDKHtmlMd = api;
})(typeof window !== 'undefined' ? window : this);
