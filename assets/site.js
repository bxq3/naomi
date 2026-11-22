// KORTEX — промо-сайт. Без библиотек: тема, фон с линиями высот, версия из релиза, анимации и демо редактора.
(() => {
  'use strict';

  const LATEST_JSON = 'https://github.com/kortexgg/launcher/releases/latest/download/latest.json';
  const LATEST_API = 'https://api.github.com/repos/kortexgg/launcher/releases/latest';

  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const mm = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} });
  const mqReduce = mm('(prefers-reduced-motion: reduce)');
  const mqLight = mm('(prefers-color-scheme: light)');
  const mqHover = mm('(hover: hover) and (pointer: fine)');
  const mqWide = mm('(min-width: 921px)');
  const reduce = () => mqReduce.matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const onMq = (q, fn) => (q.addEventListener ? q.addEventListener('change', fn) : q.addListener && q.addListener(fn));
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* приватный режим — просто не запоминаем */ } },
  };

  /* ---------- Линии высот, как в программе (src/bg.js): медленно перетекают, рисует видеокарта.
     Без WebGL или с «меньше анимаций» — неподвижная картинка. ---------- */
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const noise = (x, y) => {
    const xi = Math.floor(x); const yi = Math.floor(y);
    const u = smooth(x - xi); const v = smooth(y - yi);
    const a = hash(xi, yi); const b = hash(xi + 1, yi); const c = hash(xi, yi + 1); const d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x, y) => noise(x, y) * 0.6 + noise(x * 2.1 + 17, y * 2.1 + 9) * 0.28 + noise(x * 4.3 + 41, y * 4.3 + 3) * 0.12;


  const TOPO_VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  // Симплекс-шум 3D — Ashima Arts / Stefan Gustavson (MIT, github.com/ashima/webgl-noise).
  const TOPO_FS = `#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform float uT; uniform float uDpr; uniform vec3 uInk; uniform vec2 uA;
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
void main(){
  vec2 q = gl_FragCoord.xy / (430.0 * uDpr);
  float t = uT;
  float h = snoise(vec3(q + vec2(t * 0.18, 0.0), t)) * 0.66
          + snoise(vec3(q * 2.0 + 17.0, t * 1.25 + 5.0)) * 0.25
          + snoise(vec3(q * 3.9 + 41.0, t * 1.6 + 11.0)) * 0.09;
  float v = h * 9.0;
  // расстояние до ближайшей линии в пикселях; каждая пятая линия — чуть ярче и толще
  float dist = (0.5 - abs(fract(v) - 0.5)) / max(fwidth(v), 1e-5);
  float major = step(mod(floor(v + 0.5), 5.0), 0.5);
  float w = mix(0.5, 0.65, major) * uDpr;
  float a = (1.0 - smoothstep(w - 0.7, w + 0.7, dist)) * mix(uA.x, uA.y, major);
  gl_FragColor = vec4(uInk * a, a);
}`;
  function liveTopo(cv) {
    let gl = null;
    try { gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl || !gl.getExtension('OES_standard_derivatives')) return null;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg && /swiftshader|software|llvmpipe|basic render/i.test(String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)))) return null;
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; };
    const vs = sh(gl.VERTEX_SHADER, TOPO_VS); const fsh = sh(gl.FRAGMENT_SHADER, TOPO_FS);
    if (!vs || !fsh) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fsh); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(pr, n);
    const uT = U('uT'); const uDpr = U('uDpr'); const uInk = U('uInk'); const uA = U('uA');
    let dpr = 1; let tt = 20; let last = 0; let raf = 0; let dead = false;
    const resize = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      cv.width = Math.round((r.width || window.innerWidth) * dpr); cv.height = Math.round((r.height || window.innerHeight) * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
    };
    const ink = () => {
      const c = (getComputedStyle(root).getPropertyValue('--topo-ink').trim() || '255 255 255').split(/[\s,]+/).map(Number);
      const light = root.getAttribute('data-theme') === 'light';
      gl.uniform3f(uInk, c[0] / 255, c[1] / 255, c[2] / 255);
      gl.uniform2f(uA, light ? 0.075 : 0.085, light ? 0.15 : 0.16);
    };
    const frame = (now) => {
      raf = 0;
      if (dead) return;
      const on = !document.hidden;
      if (on && last) tt += Math.min(0.1, (now - last) / 1000) * 0.05;
      last = on ? now : 0;
      gl.uniform1f(uT, tt); gl.uniform1f(uDpr, dpr);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (on) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };
    resize(); ink();
    let tm = null;
    window.addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => { resize(); kick(); }, 60); });
    document.addEventListener('visibilitychange', kick);
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); dead = true; cv.style.display = 'none'; });
    kick();
    return { paint() { ink(); kick(); } };
  }

  const topo = (() => {
    let base = $('#topo');
    if (!base || !base.getContext) return { paint() {} };
    const live = reduce() ? null : liveTopo(base);
    if (live) return live;
    if (typeof Path2D === 'undefined') return { paint() {} };
    // Программный рендер: WebGL уже занял этот canvas, 2D на нём не получить — берём чистую копию.
    if (!base.getContext('2d')) { const c = base.cloneNode(false); base.replaceWith(c); base = c; }
    let geo = null;

    function build(w, h) {
      const S = 9; const F = 1 / 520;
      const nx = Math.ceil(w / S) + 1; const ny = Math.ceil(h / S) + 1;
      const f = new Float32Array(nx * ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f[j * nx + i] = fbm(i * S * F + 3.7, j * S * F + 1.3);
      const minor = new Path2D(); const major = new Path2D();
      let k = 0;
      for (let lv = 0.16; lv < 0.9; lv += 0.034, k++) {
        const p = k % 5 === 2 ? major : minor;
        for (let j = 0; j < ny - 1; j++) {
          for (let i = 0; i < nx - 1; i++) {
            const a = f[j * nx + i]; const b = f[j * nx + i + 1]; const c = f[(j + 1) * nx + i + 1]; const d = f[(j + 1) * nx + i];
            const idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const x = i * S; const y = j * S;
            const t = (q, r) => (lv - q) / (r - q || 1e-6);
            const top = [x + S * t(a, b), y]; const right = [x + S, y + S * t(b, c)];
            const bottom = [x + S * t(d, c), y + S]; const left = [x, y + S * t(a, d)];
            const seg = (m, n) => { p.moveTo(m[0], m[1]); p.lineTo(n[0], n[1]); };
            switch (idx) {
              case 1: case 14: seg(left, bottom); break;
              case 2: case 13: seg(bottom, right); break;
              case 3: case 12: seg(left, right); break;
              case 4: case 11: seg(top, right); break;
              case 6: case 9: seg(top, bottom); break;
              case 7: case 8: seg(left, top); break;
              case 5: seg(left, top); seg(bottom, right); break;
              case 10: seg(top, right); seg(left, bottom); break;
              default: break;
            }
          }
        }
      }
      return { w, h, minor, major };
    }

    function draw(cv, ink, aMin, aMaj) {
      if (!cv) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(geo.w * dpr); cv.height = Math.round(geo.h * dpr);
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, geo.w, geo.h);
      g.lineWidth = 0.9; g.strokeStyle = `rgba(${ink}, ${aMin})`; g.stroke(geo.minor);
      g.lineWidth = 1.15; g.strokeStyle = `rgba(${ink}, ${aMaj})`; g.stroke(geo.major);
    }

    function paint(force) {
      const rect = base.getBoundingClientRect();
      const w = Math.ceil(rect.width || window.innerWidth); const h = Math.ceil(Math.max(rect.height, window.innerHeight));
      const resized = !geo || geo.w !== w || geo.h < h;
      if (!resized && !force) return;
      if (resized) geo = build(w, h);
      const ink = (getComputedStyle(root).getPropertyValue('--topo-ink').trim() || '255 255 255').split(/\s+/).join(', ');
      const light = root.getAttribute('data-theme') === 'light';
      draw(base, ink, light ? 0.07 : 0.055, light ? 0.13 : 0.12);
    }

    let tm = null;
    window.addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(() => paint(false), 250); });

    return { paint };
  })();

  /* ---------- Тема ---------- */
  const metaTheme = $('meta[name="theme-color"]');
  let themeTimer = null;
  function setTheme(t, opts = {}) {
    if (opts.animate && !reduce()) {
      root.classList.add('theme-anim');
      clearTimeout(themeTimer);
      themeTimer = setTimeout(() => root.classList.remove('theme-anim'), 450);
    }
    root.setAttribute('data-theme', t);
    if (opts.save) store.set('naomi-theme', t);
    if (metaTheme) metaTheme.setAttribute('content', t === 'light' ? '#eceef1' : '#0d0e10');
    $$('[data-theme-toggle]').forEach((b) => {
      const label = t === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему';
      b.setAttribute('aria-label', label);
      b.title = label;
    });
    topo.paint(true);
  }
  setTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
    setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', { animate: true, save: true });
  }));
  onMq(mqLight, (e) => { if (!store.get('naomi-theme')) setTheme(e.matches ? 'light' : 'dark', { animate: true }); });

  /* ---------- Шапка и меню ---------- */
  const head = $('.site-head');
  const nav = $('#nav');
  const menuBtn = $('.menu-btn');
  const closeMenu = () => { if (!nav) return; nav.classList.remove('open'); menuBtn && menuBtn.setAttribute('aria-expanded', 'false'); };
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('click', (e) => { if (!e.target.closest('#nav')) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    onMq(mqWide, closeMenu);
  }

  /* ---------- Версия из последнего релиза ---------- */
  const fmtSize = (b) => {
    if (!b) return '';
    const u = ['Б', 'КБ', 'МБ', 'ГБ'];
    let i = 0; let n = b;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return `${n < 10 && i ? n.toFixed(1).replace('.', ',') : Math.round(n)} ${u[i]}`;
  };
  const fmtDate = (s) => {
    if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return '';
    const d = new Date(`${s.slice(0, 10)}T12:00:00`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };
  const getJson = async (url, headers) => {
    const ctl = 'AbortController' in window ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), 7000) : null;
    try {
      const r = await fetch(url, { headers, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      return r.ok ? await r.json() : null;
    } catch (e) {
      return null;
    } finally { clearTimeout(t); }
  };
  async function loadVersion() {
    if (!window.fetch) return;
    let info = null;
    // Файлы релиза github.com браузеру не отдаёт (нет CORS), поэтому сначала API GitHub —
    // там те же версия, размер установщика, дата и текст релиза. latest.json — запасной путь
    // (сработает, если его положат рядом с сайтом или на хост с CORS).
    const r = await getJson(LATEST_API, { Accept: 'application/vnd.github+json' });
    if (r && r.tag_name) {
      const a = (r.assets || []).find((x) => x.name === 'KORTEX-Setup.exe');
      info = { version: String(r.tag_name).replace(/^v/i, ''), size: a ? a.size : 0, date: String(r.published_at || '').slice(0, 10) };
    }
    if (!info) {
      const j = await getJson(LATEST_JSON);
      if (j && j.version) info = j;
    }
    if (!info || !/^[\w.+-]{1,24}$/.test(String(info.version))) return;
    const parts = [`Версия ${info.version}`];
    const size = fmtSize(Number(info.size) || 0);
    if (size) parts.push(size);
    const date = fmtDate(String(info.date || ''));
    if (date) parts.push(`от ${date}`);
    parts.push('Windows 10 и 11');
    $$('[data-ver-meta]').forEach((el) => { el.textContent = parts.join(' · '); });
  }
  loadVersion();

  /* ---------- Появление при прокрутке, счётчики ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce()) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !reduce()) {
    counters.forEach((el) => { el.textContent = '0'; });
    const run = (el) => {
      const to = Number(el.getAttribute('data-count')) || 0;
      const dur = to < 5 ? 500 : 1400;
      const t0 = performance.now();
      const step = (now) => {
        const p = clamp((now - t0) / dur, 0, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(to * e));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        run(en.target);
        io2.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => io2.observe(el));
  }

  /* ---------- Макет окна на первом экране: масштаб и наклон ---------- */
  const shotStage = $('.shot-stage');
  const shot = $('.shot');
  const fitShot = () => { if (shot) shot.style.setProperty('--k', Math.min(1, shot.clientWidth / 1100).toFixed(4)); };
  fitShot();
  if ('ResizeObserver' in window && shot) new ResizeObserver(fitShot).observe(shot);
  else window.addEventListener('resize', fitShot);

  /* ---------- Шаги «как это работает» ---------- */
  const how = $('.how');
  const steps = $$('.how-step');
  function updateHow() {
    if (!how) return;
    const vh = window.innerHeight;
    if (mqWide.matches) {
      const r = how.getBoundingClientRect();
      const f = clamp((vh * 0.82 - r.top) / (vh * 0.45), 0, 1);
      how.style.setProperty('--fill', f.toFixed(3));
      const n = steps.length;
      steps.forEach((s, i) => s.classList.toggle('lit', f >= Math.max(0.02, ((i + 0.5) / n - 0.12) / 0.76 - 0.03)));
    } else {
      steps.forEach((s) => s.classList.toggle('lit', s.getBoundingClientRect().top < vh * 0.72));
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (head) head.classList.toggle('scrolled', window.scrollY > 8);
      if (shotStage) {
        if (reduce()) shotStage.style.setProperty('--p', '1');
        else {
          const r = shotStage.getBoundingClientRect();
          const vh = window.innerHeight;
          shotStage.style.setProperty('--p', clamp((vh * 0.95 - r.top) / (vh * 0.7), 0, 1).toFixed(3));
        }
      }
      updateHow();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onMq(mqReduce, onScroll);
  onScroll();

  /* ---------- Подсветка карточек под курсором ---------- */
  $$('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      if (!mqHover.matches) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--x', `${e.clientX - r.left}px`);
      card.style.setProperty('--y', `${e.clientY - r.top}px`);
    }, { passive: true });
  });

  /* ---------- Демо редактора ---------- */
  const tabs = $$('.ed-tabs [role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
    if (focus) tab.focus({ preventScroll: true });
    const strip = tab.parentElement;
    if (strip && strip.scrollWidth > strip.clientWidth + 2) {
      const left = strip.scrollLeft + tab.getBoundingClientRect().left - strip.getBoundingClientRect().left - 12;
      strip.scrollTo({ left, behavior: reduce() ? 'auto' : 'smooth' });
    }
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      let j = null;
      if (e.key in keys) j = (i + keys[e.key] + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j === null) return;
      e.preventDefault();
      selectTab(tabs[j], true);
    });
  });

  const pressOne = (group, btn) => $$('button', group).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  const stageOf = (el) => { const p = el.closest('.ed-panel'); return p ? $('.stage', p) : null; };

  // Прицел
  const xh = { shape: 'crossdot', color: '#ffffff', gap: 5, len: 12, th: 3 };
  function drawXh() {
    const svg = $('.xh');
    if (!svg) return;
    const c = 100; const { gap, len, th, color } = xh;
    const seg = (dx, dy) => `M${(c + dx * gap).toFixed(1)} ${(c + dy * gap).toFixed(1)}L${(c + dx * (gap + len)).toFixed(1)} ${(c + dy * (gap + len)).toFixed(1)}`;
    const D = 0.7071;
    const arms = {
      cross: [[0, -1], [0, 1], [-1, 0], [1, 0]],
      t: [[-1, 0], [1, 0], [0, 1]],
      x: [[-D, -D], [D, -D], [-D, D], [D, D]],
    };
    let d = ''; let dot = false; let ring = 0;
    switch (xh.shape) {
      case 'dot': dot = true; break;
      case 'cross': d = arms.cross.map((a) => seg(a[0], a[1])).join(''); break;
      case 'crossdot': d = arms.cross.map((a) => seg(a[0], a[1])).join(''); dot = true; break;
      case 'circle': ring = gap + len * 0.75; dot = true; break;
      case 't': d = arms.t.map((a) => seg(a[0], a[1])).join(''); break;
      case 'x': d = arms.x.map((a) => seg(a[0], a[1])).join(''); break;
      default: break;
    }
    let s = '';
    if (d) s += `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="${th + 2}" stroke-linecap="square"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${th}" stroke-linecap="square"/>`;
    if (ring) s += `<circle cx="100" cy="100" r="${ring}" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="${th + 1.5}"/><circle cx="100" cy="100" r="${ring}" fill="none" stroke="${color}" stroke-width="${th - 0.5}"/>`;
    if (dot) s += `<circle cx="100" cy="100" r="${th / 2 + 1.6}" fill="${color}" stroke="#000" stroke-opacity=".55" stroke-width="1.2"/>`;
    const hm = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => `M${100 + x * 10} ${100 + y * 10}L${100 + x * 19} ${100 + y * 19}`).join('');
    s += `<path class="hm" d="${hm}" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>`;
    svg.innerHTML = s;
  }
  drawXh();
  const flash = (stage) => { if (!stage) return; stage.classList.remove('hit'); void stage.offsetWidth; stage.classList.add('hit'); };
  const xhStage = $('.st-xh');
  if (xhStage) {
    xhStage.addEventListener('click', () => flash(xhStage));
    xhStage.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flash(xhStage); } });
  }
  const hitBtn = $('.hit-btn');
  if (hitBtn) hitBtn.addEventListener('click', () => flash(hitBtn.closest('.stage')));

  // Состав: что получится при каждом старте
  const COMP = {
    game: [['layers', 'Основа', 'Как сейчас в игре — Graphite Redux', 'основа'], ['wrench', 'Мои правки', 'всё, что сделано в разделах', 'последний']],
    clean: [['box', 'Основа', 'Чистая игра — оригинальные файлы', 'основа'], ['wrench', 'Мои правки', 'всё, что сделано в разделах', 'последний']],
    lib: [['grid', 'Основа', 'Night Drive — сохранится как «моя версия»', 'основа'], ['wrench', 'Мои правки', 'оригинал редукса не меняется', 'последний']],
    parts: [['cloud', 'Графика', 'из Graphite Redux · update.rpf', 'часть'], ['crosshair', 'Оружие', 'из Silver Line GP', 'часть'], ['file', 'Звуки', 'свои файлы с диска', 'файлы'], ['wrench', 'Мои правки', 'всегда ставятся поверх', 'последний']],
  };
  function renderComp(v) {
    const ol = $('.comp-list');
    if (!ol || !COMP[v]) return;
    ol.textContent = '';
    COMP[v].forEach(([ic, title, sub, tag], i, arr) => {
      const li = document.createElement('li');
      if (i === arr.length - 1) li.className = 'last';
      li.innerHTML = `<span class="n">${i + 1}</span><span class="ci"><svg class="ic"><use href="#i-${ic}"/></svg></span><span><b></b><small></small></span><em></em>`;
      $('b', li).textContent = title;
      $('small', li).textContent = sub;
      $('em', li).textContent = tag;
      ol.appendChild(li);
    });
  }
  renderComp('parts');

  function fxCount(stage, group) {
    const n = $$('button[aria-pressed="true"]', group).filter((b) => b.dataset.v !== 'clear').length;
    const tag = $('.fx-tag', stage);
    if (tag) tag.innerHTML = n ? `Эффектов на экране: <b>${n}</b>` : '<b>Чистая картинка</b>';
  }

  $$('.chips[data-group], .tex-grid[data-group]').forEach((group) => {
    const kind = group.dataset.group;
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !group.contains(btn)) return;
      const v = btn.dataset.v;
      const stage = stageOf(group);
      switch (kind) {
        case 'gun': {
          pressOne(group, btn);
          const fill = $('.gun-fill');
          if (fill) fill.setAttribute('fill', `url(#pt-${v})`);
          break;
        }
        case 'trc': {
          pressOne(group, btn);
          if (!stage) break;
          stage.classList.toggle('off', v === 'none');
          if (v !== 'none') stage.style.setProperty('--tr', v);
          const tag = $('.trc-name', stage);
          if (tag) tag.textContent = btn.dataset.name || btn.textContent.trim();
          break;
        }
        case 'set': {
          pressOne(group, btn);
          if (stage) stage.setAttribute(`data-${group.dataset.key}`, v);
          const rd = stage && $('.rd-tag', stage);
          if (rd) rd.textContent = v === 'game' ? 'было / станет' : `станет: ${btn.textContent.trim().toLowerCase()}`;
          break;
        }
        case 'xh-shape': pressOne(group, btn); xh.shape = v; drawXh(); break;
        case 'xh-color': pressOne(group, btn); xh.color = v; drawXh(); break;
        case 'fx': {
          if (!stage) break;
          if (v === 'clear') {
            $$('button', group).forEach((b) => { if (b.dataset.v !== 'clear') { b.setAttribute('aria-pressed', 'false'); stage.classList.remove(b.dataset.v); } });
          } else {
            const on = btn.getAttribute('aria-pressed') !== 'true';
            btn.setAttribute('aria-pressed', String(on));
            stage.classList.toggle(v, on);
          }
          fxCount(stage, group);
          break;
        }
        case 'comp': pressOne(group, btn); renderComp(v); break;
        case 'tex': pressOne(group, btn); break;
        default: break;
      }
    });
  });

  $$('input[type="range"][data-var]').forEach((inp) => {
    const apply = () => { const st = stageOf(inp); if (st) st.style.setProperty(inp.dataset.var, `${inp.value}${inp.dataset.unit || ''}`); };
    inp.addEventListener('input', apply);
    apply();
  });
  $$('input[type="range"][data-xh]').forEach((inp) => {
    inp.addEventListener('input', () => { xh[inp.dataset.xh] = Number(inp.value); drawXh(); });
  });

  /* ---------- Окно на первом экране поворачивается к курсору ---------- */
  if (shotStage && shot) {
    const look = { tx: 0, ty: 0, x: 0, y: 0, raf: 0 };
    let near = true;
    const put = () => {
      const s = shotStage.style;
      s.setProperty('--ry', `${(look.x * 11).toFixed(2)}deg`);
      s.setProperty('--rx', `${(-look.y * 8).toFixed(2)}deg`);
      s.setProperty('--nx', look.x.toFixed(3));
      s.setProperty('--ny', look.y.toFixed(3));
    };
    const loop = () => {
      look.x += (look.tx - look.x) * 0.09;
      look.y += (look.ty - look.y) * 0.09;
      put();
      look.raf = Math.abs(look.tx - look.x) + Math.abs(look.ty - look.y) > 0.002 ? requestAnimationFrame(loop) : 0;
    };
    const aim = (tx, ty) => { look.tx = tx; look.ty = ty; if (!look.raf) look.raf = requestAnimationFrame(loop); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { near = en[0].isIntersecting; if (!near) aim(0, 0); }).observe(shotStage);
    }
    window.addEventListener('pointermove', (e) => {
      if (!near || !mqHover.matches || e.pointerType !== 'mouse' || reduce()) return;
      const r = shot.getBoundingClientRect();
      const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
      aim(clamp((e.clientX - cx) / (window.innerWidth / 2), -1, 1), clamp((e.clientY - cy) / (window.innerHeight / 2), -1, 1));
    }, { passive: true });
    document.addEventListener('mouseleave', () => aim(0, 0));
    onMq(mqReduce, () => aim(0, 0));
  }

  /* ---------- Ленты: едут навстречу, от прокрутки ускоряются и меняют направление ---------- */
  const tapes = $$('.tape').map((el) => ({
    el,
    track: $('.tape-track', el),
    set: $('.tape-set', el),
    dir: Number(el.dataset.dir) || -1,
    x: 0, w: 0, slow: 1,
  }));
  const fillTapes = () => {
    tapes.forEach((t) => {
      if (!t.set) return;
      t.w = t.set.getBoundingClientRect().width;
      if (!t.w) return;
      const need = Math.ceil((t.el.clientWidth * 1.3) / t.w) + 1;
      $$('.tape-set', t.track).slice(1).forEach((n) => n.remove());
      for (let i = 1; i < need; i++) {
        const c = t.set.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        t.track.appendChild(c);
      }
      if (t.dir > 0) t.x = -t.w;
    });
  };
  if (tapes.length) {
    fillTapes();
    let tmT = null;
    window.addEventListener('resize', () => { clearTimeout(tmT); tmT = setTimeout(fillTapes, 200); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fillTapes);
    tapes.forEach((t) => {
      t.el.addEventListener('pointerenter', () => { t.slow = 0.25; });
      t.el.addEventListener('pointerleave', () => { t.slow = 1; });
    });
    let visible = false; let raf = 0; let last = 0; let lastY = window.scrollY; let boost = 0; let sdir = 1; let spin = 0;
    const frame = (now) => {
      const dt = last ? Math.min(50, now - last) / 16.67 : 1;
      last = now;
      const y = window.scrollY; const dy = y - lastY; lastY = y;
      if (dy) sdir = dy > 0 ? 1 : -1;
      boost += (Math.min(Math.abs(dy) * 0.45, 22) - boost) * 0.12;
      const v = (0.7 + boost) * sdir * dt;
      spin += v * 1.6;
      tapes.forEach((t) => {
        if (!t.w) return;
        t.x += v * t.dir * t.slow;
        if (t.x <= -t.w) t.x += t.w;
        if (t.x > 0) t.x -= t.w;
        t.track.style.transform = `translate3d(${t.x.toFixed(2)}px,0,0)`;
        t.el.style.setProperty('--spin', `${(spin * t.dir).toFixed(1)}deg`);
      });
      raf = visible && !reduce() ? requestAnimationFrame(frame) : 0;
    };
    const start = () => { if (!raf && visible && !reduce()) { last = 0; lastY = window.scrollY; raf = requestAnimationFrame(frame); } };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { visible = en[0].isIntersecting; start(); }, { rootMargin: '100px 0px' }).observe($('.tapes'));
    }
    onMq(mqReduce, start);
  }

  /* ---------- Мелочи ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();

/* ---------- Подсказка «браузер или Windows ругаются»: свои шаги под каждый браузер.
   Открывается сама после нажатия «Скачать» (скачивание при этом идёт как обычно) и по кнопке «Как скачать». ---------- */
(() => {
  'use strict';
  const dlg = document.getElementById('dl-guide');
  if (!dlg) return;
  const ua = navigator.userAgent || '';
  const detect = () => (/YaBrowser|YaSearchBrowser/i.test(ua) ? 'yandex'
    : /OPR\/|Opera|OPX\//i.test(ua) ? 'opera'
    : /Edg(A|iOS)?\//i.test(ua) ? 'edge'
    : /Firefox\/|FxiOS/i.test(ua) ? 'firefox'
    : 'chrome');
  const k = (s) => '<kbd>' + s + '</kbd>';
  const OPEN_DL = 'Открой загрузки — значок ⤓ справа вверху или ' + k('Ctrl') + '+' + k('J') + '.';
  const BR = {
    chrome: {
      place: 'Загрузки', warn: 'Файл скачивается редко',
      steps: [OPEN_DL, 'Рядом с <b>KORTEX-Setup.exe</b> нажми стрелку <b>›</b>, затем <b>«Всё равно скачать»</b>.'],
      note: 'В некоторых версиях Chrome кнопка называется «Сохранить».',
      seq: ['›', 'Всё равно скачать'],
    },
    yandex: {
      place: 'Загрузки', warn: 'Файл скачивается редко',
      steps: [OPEN_DL, 'Под файлом нажми <b>«Скачать»</b> или <b>«Всё равно скачать»</b>.'],
      note: 'Если Protect пишет, что файл может быть опасен, — это то же предупреждение о редком файле.',
      seq: ['Скачать'],
    },
    edge: {
      place: 'Скачанные файлы', warn: 'Файл обычно не скачивается',
      steps: ['В панели загрузок наведи на файл и нажми <b>«…»</b>.', 'Выбери <b>«Сохранить»</b>, затем <b>«Показать больше»</b> → <b>«Всё равно сохранить»</b>.'],
      note: 'Панель загрузок закрылась — открой её снова: ' + k('Ctrl') + '+' + k('J') + '.',
      seq: ['…', 'Сохранить', 'Показать больше', 'Всё равно сохранить'],
    },
    opera: {
      place: 'Загрузки', warn: 'Файл скачивается редко',
      steps: [OPEN_DL, 'Рядом с файлом нажми <b>«Сохранить»</b> или <b>«Всё равно скачать»</b>.'],
      note: '',
      seq: ['Сохранить'],
    },
    firefox: {
      place: 'Загрузки', warn: 'Этот файл редко загружают',
      steps: ['Открой загрузки — стрелка ⤓ на панели или ' + k('Ctrl') + '+' + k('Shift') + '+' + k('Y') + '.', 'Нажми на файл <b>правой кнопкой</b> → <b>«Разрешить загрузку»</b>.'],
      note: '',
      seq: ['Правая кнопка', 'Разрешить загрузку'],
    },
  };
  const mine = detect();
  let cur = mine;
  const $ = (s) => dlg.querySelector(s);
  const tabs = Array.from(dlg.querySelectorAll('[data-br]'));
  tabs.forEach((b) => b.classList.toggle('mine', b.dataset.br === mine));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const render = () => {
    const b = BR[cur];
    tabs.forEach((t) => { const on = t.dataset.br === cur; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    $('[data-br-steps]').innerHTML = b.steps.map((s) => '<li>' + s + '</li>').join('');
    $('[data-br-note]').innerHTML = b.note;
    $('[data-br-place]').textContent = b.place;
    $('[data-br-warn]').textContent = b.warn;
    $('[data-br-seq]').innerHTML = b.seq.map((s, i) => '<span class="mk-chip' + (i === b.seq.length - 1 ? ' hot' : '') + '">' + esc(s) + '</span>').join('<i>→</i>');
  };
  render();
  const open = () => {
    if (dlg.open) return;
    render();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  };
  const close = () => { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };
  tabs.forEach((t) => t.addEventListener('click', () => { cur = t.dataset.br; render(); }));
  // Стрелки влево/вправо по вкладкам браузеров.
  dlg.querySelector('.dlg-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.dataset.br === cur);
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    cur = n.dataset.br; render(); n.focus(); e.preventDefault();
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-dlg-close]')) close(); });
  let shown = false; // сама подсказка всплывает только после первого скачивания, дальше — по кнопке
  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest('[data-dl-help]')) { e.preventDefault(); open(); return; }
    if (!shown && t.closest('a[href*="KORTEX-Setup.exe"]')) { shown = true; setTimeout(open, 900); }
  });
})();
