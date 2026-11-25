// Lógica de la ventana del teleprompter. El texto llega como bloques planos y se
// pinta con textContent (nunca innerHTML). El desplazamiento usa transform para que
// las velocidades lentas no se "atasquen" por el redondeo de scrollTop.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var vp = $('vp'), txt = $('txt'), guide = $('guide'), warn = $('warn');

  var S = { mode: 'auto', speed: 12, scale: 1, fit: true, mirror: false, hidden: true };
  var L = {};
  var pos = 0, target = 0, playing = true, last = 0, shortcutsOk = true, warnTimer = null, saveTimer = null;

  function $c(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; e.textContent = text; return e; }

  function fontPx() {
    var base = S.fit ? window.innerWidth * 0.045 : 30;
    return Math.max(12, Math.min(220, base * S.scale));
  }
  function maxPos() { return Math.max(0, txt.offsetHeight - vp.clientHeight); }
  function clamp(v) { return Math.max(0, Math.min(maxPos(), v)); }

  function layout() {
    txt.style.fontSize = fontPx() + 'px';
    var padTop = Math.max(34, Math.round(vp.clientHeight * 0.3));
    txt.style.paddingTop = padTop + 'px';
    txt.style.paddingBottom = Math.round(vp.clientHeight * 0.7) + 'px';
    guide.style.top = padTop + 'px';
    pos = clamp(pos); target = clamp(target);
    draw();
  }
  function draw() {
    txt.style.transform = 'scaleX(' + (S.mirror ? -1 : 1) + ') translateY(' + (-pos).toFixed(2) + 'px)';
  }
  function pxPerSec() { return S.speed * 1.2 * (fontPx() / 30); }

  function scrollBy(dy) {
    target = clamp(target + dy);
    if (S.mode === 'auto' && playing) pos = target;
  }

  function frame(ts) {
    if (!last) last = ts;
    var dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    if (S.mode === 'auto' && playing) {
      pos += pxPerSec() * dt;
      if (pos >= maxPos()) { pos = maxPos(); playing = false; syncUi(); }
      target = pos;
      draw();
    } else if (Math.abs(target - pos) > 0.3) {
      pos += (target - pos) * Math.min(1, dt * 12);
      draw();
    }
    requestAnimationFrame(frame);
  }

  function savePrefs() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { window.tp.savePrefs(S); }, 400);
  }

  function showWarn(msg) {
    warn.textContent = msg; warn.hidden = false;
    clearTimeout(warnTimer);
    warnTimer = setTimeout(function () { warn.hidden = true; }, 12000);
  }
  warn.addEventListener('click', function () { warn.hidden = true; });

  function syncUi() {
    $('mAuto').classList.toggle('on', S.mode === 'auto');
    $('mManual').classList.toggle('on', S.mode === 'manual');
    $('speedWrap').style.display = S.mode === 'auto' ? 'inline-flex' : 'none';
    $('play').style.display = S.mode === 'auto' ? '' : 'none';
    $('play').textContent = playing ? '⏸' : '▶';
    $('play').title = playing ? L.pause : L.play;
    $('speed').value = S.speed;
    $('speedVal').textContent = S.speed;
    $('fitBtn').classList.toggle('on', S.fit);
    $('mirrorBtn').classList.toggle('on', S.mirror);
    $('hideBtn').classList.toggle('on', S.hidden);
    $('hideBtn').title = S.hidden ? L.hideOn : L.hideOff;
  }

  function setMode(m) {
    if (S.mode === m) return;
    S.mode = m;
    playing = false;   // el teleprompter siempre arranca en pausa: tú pulsas reproducir
    target = pos;
    if (m === 'manual') showWarn(L.warnManual + (shortcutsOk ? '' : ' ' + L.warnShortcut));
    else warn.hidden = true;
    syncUi(); savePrefs();
  }

  function zoom(f) { S.scale = Math.max(0.3, Math.min(6, S.scale * f)); layout(); savePrefs(); }

  function onCmd(c) {
    var step = fontPx() * 2.9;
    if (c === 'up') scrollBy(-step);
    else if (c === 'down') scrollBy(step);
    else if (c === 'toggle' && S.mode === 'auto') { playing = !playing; if (playing && pos >= maxPos() - 1) { pos = 0; target = 0; } syncUi(); }
  }

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if ((e.ctrlKey || e.metaKey) && (k === 'w' || k === 'W')) { window.tp.close(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'ArrowDown') { onCmd('down'); e.preventDefault(); }
    else if (k === 'ArrowUp') { onCmd('up'); e.preventDefault(); }
    else if (k === 'PageDown') { scrollBy(vp.clientHeight * 0.8); e.preventDefault(); }
    else if (k === 'PageUp') { scrollBy(-vp.clientHeight * 0.8); e.preventDefault(); }
    else if (k === 'Home') { target = 0; if (S.mode === 'auto') pos = 0; e.preventDefault(); }
    else if (k === 'End') { target = maxPos(); e.preventDefault(); }
    else if (k === ' ') { if (S.mode === 'auto') { onCmd('toggle'); } else { scrollBy(vp.clientHeight * 0.8); } e.preventDefault(); }
    else if (k === 'ArrowRight' && S.mode === 'auto') { S.speed = Math.min(60, S.speed + 2); syncUi(); savePrefs(); e.preventDefault(); }
    else if (k === 'ArrowLeft' && S.mode === 'auto') { S.speed = Math.max(1, S.speed - 2); syncUi(); savePrefs(); e.preventDefault(); }
    else if (k === '+' || k === '=') { zoom(1.1); }
    else if (k === '-' || k === '_') { zoom(1 / 1.1); }
  });
  document.addEventListener('wheel', function (e) { scrollBy(e.deltaY); }, { passive: true });
  window.addEventListener('resize', layout);

  $('mAuto').addEventListener('click', function () { setMode('auto'); });
  $('mManual').addEventListener('click', function () { setMode('manual'); });
  $('play').addEventListener('click', function () { onCmd('toggle'); });
  $('speed').addEventListener('input', function () { S.speed = Number(this.value) || 12; syncUi(); savePrefs(); });
  $('plus').addEventListener('click', function () { zoom(1.1); });
  $('minus').addEventListener('click', function () { zoom(1 / 1.1); });
  $('fitBtn').addEventListener('click', function () { S.fit = !S.fit; layout(); syncUi(); savePrefs(); });
  $('mirrorBtn').addEventListener('click', function () { S.mirror = !S.mirror; draw(); syncUi(); savePrefs(); });
  $('hideBtn').addEventListener('click', function () {
    S.hidden = !S.hidden; syncUi(); savePrefs();
    window.tp.setHidden(S.hidden);
  });
  $('closeBtn').addEventListener('click', function () { window.tp.close(); });

  window.tp.onCmd(onCmd);
  window.tp.onInit(function (p) {
    L = p.strings || {};
    shortcutsOk = p.shortcutsOk !== false;
    var pr = p.prefs || {};
    S.mode = pr.mode === 'manual' ? 'manual' : 'auto';
    S.speed = Math.min(60, Math.max(1, Number(pr.speed) || 12));
    S.scale = Number(pr.scale) || 1;
    S.fit = pr.fit !== false; S.mirror = !!pr.mirror; S.hidden = pr.hidden !== false;
    document.title = (L.title || 'Teleprompter') + (p.name ? ' · ' + p.name : '');

    txt.textContent = '';
    (p.blocks || []).forEach(function (b) {
      if (b.k === 'h') txt.appendChild($c('div', 'h h' + b.l, b.t));
      else if (b.k === 'note') txt.appendChild($c('div', 'note', b.t));
      else txt.appendChild($c('div', 'p', b.t));
    });

    $('mAuto').textContent = L.auto; $('mManual').textContent = L.manual;
    $('speed').title = L.speed;
    $('fitBtn').title = L.fit; $('mirrorBtn').title = L.mirror; $('closeBtn').title = L.close;
    $('plus').title = L.bigger; $('minus').title = L.smaller;

    playing = false;
    layout(); syncUi();
    if (S.mode === 'manual') showWarn(L.warnManual + (shortcutsOk ? '' : ' ' + L.warnShortcut));
    requestAnimationFrame(frame);
  });
})();
