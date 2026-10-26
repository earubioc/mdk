/**
 * Conversor propio LaTeX (subconjunto) -> MathML para MDK. Sin dependencias.
 * Expone MDKMath.toMathML(tex, display) -> string HTML (<math>...</math>) o
 * null si la fórmula no se pudo interpretar (el llamador muestra el texto
 * original). Chromium/Electron renderiza MathML de forma nativa.
 *
 * Soporta: letras/números/operadores, griegas, ^ _ (sub/superíndices, primas),
 * \frac \dfrac \tfrac \binom, \sqrt[n]{}, \sum \prod \int \lim con límites,
 * \left..\right, \text \mathrm \mathbf \mathbb \mathcal, acentos (\hat \bar
 * \vec \dot \tilde \overline \underline), funciones (\sin \log ...), espacios,
 * entornos matrix/pmatrix/bmatrix/vmatrix/cases/aligned.
 */
(function (global) {
  const GREEK = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η',
    theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
    varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'ϕ',
    varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ',
    Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω'
  };
  const SYMBOLS = {
    times: '×', cdot: '⋅', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆', circ: '∘', bullet: '•',
    leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', sim: '∼', simeq: '≃',
    equiv: '≡', propto: '∝', ll: '≪', gg: '≫', cong: '≅',
    to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔', Rightarrow: '⇒', Leftarrow: '⇐',
    Leftrightarrow: '⇔', implies: '⟹', iff: '⟺', mapsto: '↦', uparrow: '↑', downarrow: '↓',
    in: '∈', notin: '∉', ni: '∋', subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇',
    cup: '∪', cap: '∩', setminus: '∖', emptyset: '∅', varnothing: '∅',
    forall: '∀', exists: '∃', nexists: '∄', neg: '¬', lnot: '¬', land: '∧', wedge: '∧', lor: '∨', vee: '∨',
    infty: '∞', partial: '∂', nabla: '∇', angle: '∠', perp: '⊥', parallel: '∥', degree: '°',
    ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', prime: '′', hbar: 'ℏ', ell: 'ℓ',
    Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ', therefore: '∴', because: '∵', oplus: '⊕', otimes: '⊗',
    langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉'
  };
  const FUNCS = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
    'log', 'ln', 'lg', 'exp', 'det', 'dim', 'gcd', 'ker', 'deg', 'arg', 'min', 'max', 'sup', 'inf', 'lim', 'mod'];
  const LIMIT_OPS = { sum: '∑', prod: '∏', coprod: '∐', bigcup: '⋃', bigcap: '⋂' };
  const INT_OPS = { int: '∫', iint: '∬', iiint: '∭', oint: '∮' };
  const LIMIT_FUNCS = ['lim', 'min', 'max', 'sup', 'inf', 'det', 'gcd'];
  const SPACES = { ',': '0.17em', ':': '0.22em', ';': '0.28em', '!': '-0.17em', quad: '1em', qquad: '2em', ' ': '0.28em' };
  const DOUBLE = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ', P: 'ℙ', H: 'ℍ' };
  const ACCENTS = { hat: '^', widehat: '^', bar: '¯', overline: '¯', vec: '→', dot: '˙', ddot: '¨', tilde: '˜', widetilde: '˜', overrightarrow: '→' };
  const OPERATOR_CHARS = '+-=<>*/!|:;,.?()[]\'';
  const DELIMS = { '(': '(', ')': ')', '[': '[', ']': ']', '|': '|', '.': '', '/': '/', '<': '⟨', '>': '⟩' };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  const mi = (s) => `<mi>${esc(s)}</mi>`;
  const mn = (s) => `<mn>${esc(s)}</mn>`;
  const mo = (s, attrs) => `<mo${attrs || ''}>${esc(s)}</mo>`;
  const mrow = (arr) => (arr.length === 1 ? arr[0] : `<mrow>${arr.join('')}</mrow>`);

  function tokenize(src) {
    const re = /\\[a-zA-Z]+|\\[^a-zA-Z]|\d+(?:\.\d+)?|[a-zA-Z]|\s+|[\s\S]/g;
    const out = [], pos = [];
    let m;
    while ((m = re.exec(src)) !== null) {
      if (/^\s+$/.test(m[0])) continue;
      out.push(m[0]);
      pos.push(m.index);
    }
    return { out, pos };
  }

  function Parser(src) {
    const tk = tokenize(src);
    this.src = src;
    this.t = tk.out;
    this.pos = tk.pos;
    this.p = 0;
    this._limits = false;
  }
  Parser.prototype.peek = function () { return this.t[this.p]; };
  Parser.prototype.next = function () { return this.t[this.p++]; };
  Parser.prototype.fail = function (msg) { throw new Error(msg); };

  // Secuencia hasta un token de cierre (no consumido): '}', '&', '\\\\', '\\right', '\\end'
  Parser.prototype.parseSeq = function () {
    const nodes = [];
    while (this.p < this.t.length) {
      const tk = this.peek();
      if (tk === '}' || tk === '&' || tk === '\\\\' || tk === '\\right' || tk === '\\end') break;
      nodes.push(this.parseScripted());
    }
    return nodes;
  };

  Parser.prototype.parseGroupArg = function () {
    const tk = this.peek();
    if (tk === undefined) this.fail('arg');
    if (tk === '{') {
      this.next();
      const nodes = this.parseSeq();
      if (this.next() !== '}') this.fail('close');
      return nodes.length ? mrow(nodes) : '<mrow></mrow>';
    }
    // LaTeX toma un solo dígito como argumento: \frac12 = 1/2, x^23 = x^2 3
    if (/^\d{2,}/.test(tk)) {
      this.t[this.p] = tk.slice(1);
      return mn(tk.charAt(0));
    }
    return this.parseAtom();
  };

  Parser.prototype.parseScripted = function () {
    this._limits = false;
    const base = this.parseAtom();
    const limitMode = this._limits;
    this._limits = false;
    let sub = null, sup = null;
    for (;;) {
      const tk = this.peek();
      if (tk === '^') { this.next(); if (sup !== null) this.fail('dsup'); sup = this.parseGroupArg(); }
      else if (tk === '_') { this.next(); if (sub !== null) this.fail('dsub'); sub = this.parseGroupArg(); }
      else if (tk === "'") { this.next(); if (sup === null) sup = mo('′'); }
      else break;
    }
    if (sub === null && sup === null) return base;
    if (limitMode) {
      if (sub !== null && sup !== null) return `<munderover>${base}${sub}${sup}</munderover>`;
      if (sub !== null) return `<munder>${base}${sub}</munder>`;
      return `<mover>${base}${sup}</mover>`;
    }
    if (sub !== null && sup !== null) return `<msubsup>${base}${sub}${sup}</msubsup>`;
    if (sub !== null) return `<msub>${base}${sub}</msub>`;
    return `<msup>${base}${sup}</msup>`;
  };

  Parser.prototype.styled = function (variant) {
    const arg = this.parseGroupArg();
    return `<mstyle mathvariant="${variant}">${arg}</mstyle>`;
  };

  Parser.prototype.readRawGroup = function () {
    // lee {texto} crudo (para \text y nombres de entorno)
    if (this.next() !== '{') this.fail('raw');
    const start = this.pos[this.p - 1] + 1;
    let depth = 1;
    while (this.p < this.t.length) {
      const tk = this.next();
      if (tk === '{') depth++;
      if (tk === '}') { depth--; if (depth === 0) return this.src.slice(start, this.pos[this.p - 1]); }
    }
    return this.fail('raw-close');
  };

  Parser.prototype.parseDelim = function () {
    const tk = this.next();
    if (tk === undefined) this.fail('delim');
    if (tk.charAt(0) === '\\') {
      const name = tk.slice(1);
      if (name === '{' ) return '{';
      if (name === '}') return '}';
      if (name === '|' ) return '‖';
      if (SYMBOLS[name]) return SYMBOLS[name];
      if (name === 'lbrace') return '{';
      if (name === 'rbrace') return '}';
      this.fail('delim');
    }
    if (tk in DELIMS) return DELIMS[tk];
    return this.fail('delim');
  };

  Parser.prototype.parseMatrix = function (env) {
    const rows = [];
    let cells = [];
    let cell = [];
    const endRow = () => { cells.push(cell); rows.push(cells); cells = []; cell = []; };
    for (;;) {
      if (this.p >= this.t.length) this.fail('env-open');
      const tk = this.peek();
      if (tk === '\\end') break;
      if (tk === '&') { this.next(); cells.push(cell); cell = []; continue; }
      if (tk === '\\\\') { this.next(); endRow(); continue; }
      if (tk === '}' || tk === '\\right') this.fail('env-stray');
      cell.push(this.parseScripted());
    }
    if (cell.length || cells.length) endRow();
    this.next(); // \end
    const name = this.readRawGroup().trim();
    if (name !== env) this.fail('env-mismatch');
    const align = env === 'cases' ? ' columnalign="left left"' : (env === 'aligned' || env === 'align' ? ' columnalign="right left"' : '');
    const body = rows.map((r) => `<mtr>${r.map((c) => `<mtd>${c.length ? mrow(c) : ''}</mtd>`).join('')}</mtr>`).join('');
    const table = `<mtable${align}>${body}</mtable>`;
    const wrap = { pmatrix: ['(', ')'], bmatrix: ['[', ']'], Bmatrix: ['{', '}'], vmatrix: ['|', '|'], Vmatrix: ['‖', '‖'], cases: ['{', ''] }[env];
    if (!wrap) return table;
    return `<mrow>${mo(wrap[0], ' stretchy="true"')}${table}${wrap[1] ? mo(wrap[1], ' stretchy="true"') : ''}</mrow>`;
  };

  Parser.prototype.parseAtom = function () {
    const tk = this.next();
    if (tk === undefined) this.fail('eof');
    if (tk === '{') {
      const nodes = this.parseSeq();
      if (this.next() !== '}') this.fail('close');
      return nodes.length ? mrow(nodes) : '<mrow></mrow>';
    }
    if (tk === '}' || tk === '^' || tk === '_' || tk === '&') this.fail('stray ' + tk);
    if (/^\d/.test(tk)) return mn(tk);
    if (/^[a-zA-Z]$/.test(tk)) return mi(tk);
    if (tk.charAt(0) !== '\\') {
      if (tk === '~') return mo(' ');
      if (tk === '-') return mo('−');
      return mo(tk);
    }

    const name = tk.slice(1);
    if (GREEK[name]) return mi(GREEK[name]);
    if (SYMBOLS[name] !== undefined) return mo(SYMBOLS[name]);
    if (LIMIT_OPS[name]) { this._limits = true; return mo(LIMIT_OPS[name], ' largeop="true" movablelimits="true"'); }
    if (INT_OPS[name]) return mo(INT_OPS[name], ' largeop="true"');
    if (FUNCS.indexOf(name) !== -1) {
      if (LIMIT_FUNCS.indexOf(name) !== -1) { this._limits = true; return `<mi mathvariant="normal">${name}</mi>`; }
      return `<mrow><mi mathvariant="normal">${name}</mi><mo>⁡</mo></mrow>`;
    }
    if (SPACES[name]) return `<mspace width="${SPACES[name]}"></mspace>`;
    if (name.length === 1 && SPACES[name]) return `<mspace width="${SPACES[name]}"></mspace>`;

    switch (name) {
      case '{': case '}': case '%': case '$': case '#': case '&': case '_':
        return mo(name);
      case '|': return mo('‖');
      case 'lbrace': return mo('{');
      case 'rbrace': return mo('}');
      case 'frac': case 'dfrac': case 'tfrac': {
        const a = this.parseGroupArg();
        const b = this.parseGroupArg();
        return `<mfrac>${a}${b}</mfrac>`;
      }
      case 'binom': {
        const a = this.parseGroupArg();
        const b = this.parseGroupArg();
        return `<mrow>${mo('(', ' stretchy="true"')}<mfrac linethickness="0">${a}${b}</mfrac>${mo(')', ' stretchy="true"')}</mrow>`;
      }
      case 'sqrt': {
        if (this.peek() === '[') {
          this.next();
          const idx = [];
          while (this.peek() !== ']') {
            if (this.p >= this.t.length) this.fail('sqrt-idx');
            idx.push(this.parseScripted());
          }
          this.next();
          const rad = this.parseGroupArg();
          return `<mroot>${rad}${mrow(idx)}</mroot>`;
        }
        return `<msqrt>${this.parseGroupArg()}</msqrt>`;
      }
      case 'text': case 'textrm': case 'mbox': case 'operatorname': {
        const raw = this.readRawGroup().replace(/\s+/g, ' ').trim();
        return `<mtext>${esc(raw)}</mtext>`;
      }
      case 'mathrm': return this.styled('normal');
      case 'mathbf': case 'boldsymbol': case 'bm': return this.styled('bold');
      case 'mathit': return this.styled('italic');
      case 'mathsf': return this.styled('sans-serif');
      case 'mathtt': return this.styled('monospace');
      case 'mathcal': case 'mathscr': return this.styled('script');
      case 'mathfrak': return this.styled('fraktur');
      case 'mathbb': {
        const raw = this.readRawGroup().replace(/\s+/g, '');
        return mi(DOUBLE[raw] || raw);
      }
      case 'underline': return `<munder>${this.parseGroupArg()}${mo('_')}</munder>`;
      case 'left': {
        const open = this.parseDelim();
        const inner = this.parseSeq();
        if (this.next() !== '\\right') this.fail('right');
        const close = this.parseDelim();
        const parts = [];
        if (open) parts.push(mo(open, ' stretchy="true"'));
        parts.push(...inner);
        if (close) parts.push(mo(close, ' stretchy="true"'));
        return `<mrow>${parts.join('')}</mrow>`;
      }
      case 'begin': {
        const env = this.readRawGroup().trim();
        if (['matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'cases', 'aligned', 'align', 'array'].indexOf(env) === -1) this.fail('env');
        if (env === 'array' && this.peek() === '{') this.readRawGroup();
        return this.parseMatrix(env);
      }
      default:
        if (ACCENTS[name]) {
          return `<mover accent="true">${this.parseGroupArg()}${mo(ACCENTS[name])}</mover>`;
        }
        return this.fail('cmd ' + name);
    }
  };

  function toMathML(tex, display) {
    try {
      const p = new Parser(String(tex));
      const nodes = p.parseSeq();
      if (p.p < p.t.length) return null; // sobró algo sin consumir (llave sin abrir, etc.)
      if (!nodes.length) return null;
      return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${display ? 'block' : 'inline'}">${mrow(nodes)}</math>`;
    } catch (e) {
      return null;
    }
  }

  const api = { toMathML };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.MDKMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
