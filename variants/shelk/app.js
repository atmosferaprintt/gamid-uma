'use strict';
/* Гамид и Ума · 26.11.26 · вариант «Шёлк» */
const CONFIG = {
  // куда приходят ответы гостей: номер WhatsApp без «+»
  rsvpPhone: '79673948080',
  mapQuery: 'Махачкала, улица Хаджи Булача, 10, Рамина Холл',
  weddingAt: '2026-11-26T16:00:00+03:00',
};

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SMALL = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* =====================================================================
   Шёлк: полноэкранный шейдер. Карта высот атласа -> нормали -> свет.
   Пока приглашение закрыто, поверх фона рисуется коралловый занавес,
   который при открытии расходится к краям (низ чуть отстаёт от верха).
   ===================================================================== */
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uNow, uTone, uOpen, uFade, uCurtain;
uniform vec4 uRip[6];

float hash(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

/* кольца ряби от касаний: волновой пакет бежит от точки и гаснет */
float ripples(vec2 p, float k){
  float h = 0.0;
  for (int i = 0; i < 6; i++) {
    vec4 r = uRip[i];
    float age = uNow - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 4.5) continue;
    vec2 c = r.xy * uRes / k;
    float d = length(p - c);
    float front = age * 0.62;
    float x = d - front;
    h += r.w * sin(x * 26.0) * exp(-x * x * 40.0) * exp(-age * 0.85);
  }
  return h;
}

/* атлас: длинные диагональные складки, изогнутые волной вдоль себя */
float silkH(vec2 p, float t){
  float n = noise(p * 0.55 + vec2(t * 0.04, -t * 0.03));
  float a = dot(p, vec2(0.86, 0.5));
  float b = dot(p, vec2(-0.5, 0.86));
  float h = sin(a * 3.4 + 2.3 * sin(b * 1.25 + t * 0.2 + n * 2.0) + t * 0.15);
  h += 0.42 * sin(a * 6.1 - 1.7 * sin(b * 1.8 - t * 0.17) + 1.7 + n * 3.0);
  h += 0.10 * sin(b * 4.6 + a * 2.0 + t * 0.3);
  return h;
}

/* занавес: вертикальные складки на полотне шириной в одну панель.
   u = 0 у внешнего края экрана, 1 у шва. При сборке панель сужается,
   а число складок то же, поэтому они сжимаются, как настоящая ткань */
float curtainAt(vec2 uv, float edgeL, float edgeR, float leftSide, float t, float pleats){
  float u = leftSide > 0.5 ? uv.x / max(edgeL, 0.001) : (1.0 - uv.x) / max(1.0 - edgeR, 0.001);
  float y = uv.y * 2.2;
  float x = u * 6.2832 * pleats
    + 0.9 * sin(y * 1.6 + t * 0.35 + u * 2.5) * (1.0 - 0.5 * uOpen)
    + 1.4 * noise(vec2(u * 3.0 + leftSide * 7.0, y * 0.5 + t * 0.04));
  return sin(x) + 0.22 * sin(x * 2.03 + 1.1);
}

vec3 shade(float h, float hx, float hy, float e, float depth, vec3 cDeep, vec3 cBase, vec3 cHi, float specK, float sheenP){
  vec3 n = normalize(vec3(-(hx - h) / e * depth, -(hy - h) / e * depth, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.55, 0.78));
  float dif = clamp(dot(n, L), 0.0, 1.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float nh = clamp(dot(n, H), 0.0, 1.0);
  float sheen = pow(nh, sheenP);
  float spec = pow(nh, 70.0);
  vec3 col = mix(cDeep, cBase, smoothstep(0.25, 0.97, dif));
  col = mix(col, cHi, sheen * 0.6);
  col += cHi * spec * specK;
  return col;
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  float k = min(uRes.x, uRes.y) / 1.15;
  vec2 p = frag / k;
  float t = uTime;
  float e = 0.012;

  /* палитры: 0 крем, 1 персик, 2 глубокий коралл */
  float tone = clamp(uTone + (1.0 - uv.y) * 0.12, 0.0, 2.0);
  vec3 d0 = vec3(0.900, 0.852, 0.800), b0 = vec3(0.953, 0.933, 0.902), h0 = vec3(1.0, 0.992, 0.976);
  vec3 d1 = vec3(0.902, 0.690, 0.580), b1 = vec3(0.965, 0.858, 0.792), h1 = vec3(1.0, 0.955, 0.925);
  vec3 d2 = vec3(0.330, 0.098, 0.055), b2 = vec3(0.600, 0.212, 0.122), h2 = vec3(0.900, 0.520, 0.390);
  float s1 = clamp(tone, 0.0, 1.0), s2 = clamp(tone - 1.0, 0.0, 1.0);
  vec3 cD = mix(mix(d0, d1, s1), d2, s2);
  vec3 cB = mix(mix(b0, b1, s1), b2, s2);
  vec3 cH = mix(mix(h0, h1, s1), h2, s2);
  float depth = mix(mix(0.22, 0.30, s1), 0.46, s2);
  float specK = mix(mix(0.035, 0.06, s1), 0.16, s2);
  float sheenP = mix(3.2, 5.0, s2);

  float r0 = ripples(p, k), rx = ripples(p + vec2(e, 0.0), k), ry = ripples(p + vec2(0.0, e), k);
  float hb = silkH(p, t) + r0;
  float hbx = silkH(p + vec2(e, 0.0), t) + rx;
  float hby = silkH(p + vec2(0.0, e), t) + ry;
  vec3 col = shade(hb, hbx, hby, e, depth, cD, cB, cH, specK, sheenP);

  if (uCurtain > 0.5) {
    float o = uOpen;
    float g = o * 0.58;
    float lag = 0.11 * sin(3.14159 * o) * (1.0 - uv.y);
    float edgeL = 0.5 - g + lag;
    float edgeR = 0.5 + g - lag;
    float aspect = uRes.x / uRes.y;
    float px = 1.25 / uRes.x;
    float inL = 1.0 - smoothstep(edgeL - px, edgeL + px, uv.x);
    float inR = smoothstep(edgeR - px, edgeR + px, uv.x);
    float inside = max(inL, inR);
    float leftSide = uv.x < 0.5 ? 1.0 : 0.0;
    float pleats = 3.4 + 2.6 * aspect;
    vec2 dx = vec2(e * k / uRes.x, 0.0), dy = vec2(0.0, e * k / uRes.y);
    float ch = curtainAt(uv, edgeL, edgeR, leftSide, t, pleats) + r0 * 0.6;
    float chx = curtainAt(uv + dx, edgeL, edgeR, leftSide, t, pleats) + rx * 0.6;
    float chy = curtainAt(uv + dy, edgeL, edgeR, leftSide, t, pleats) + ry * 0.6;
    vec3 cc = shade(ch, chx, chy, e, 0.06, vec3(0.470, 0.135, 0.065), vec3(0.785, 0.315, 0.198), vec3(0.990, 0.700, 0.560), 0.12, 4.5);
    /* подшитый край у шва */
    float u = leftSide > 0.5 ? uv.x / max(edgeL, 0.001) : (1.0 - uv.x) / max(1.0 - edgeR, 0.001);
    cc *= mix(1.0, 0.66, smoothstep(0.965, 1.0, u));
    cc += vec3(0.22, 0.10, 0.07) * smoothstep(0.92, 0.955, u) * (1.0 - smoothstep(0.955, 0.98, u));
    cc *= 0.92 + 0.08 * uv.y;
    /* мягкая тень от занавеса на светлом шёлке */
    float dist = min(abs(uv.x - edgeL), abs(uv.x - edgeR)) * aspect;
    col *= 1.0 - 0.26 * exp(-dist * 14.0) * (1.0 - inside) * smoothstep(0.0, 0.08, o) * (1.0 - smoothstep(0.85, 1.0, o));
    col = mix(col, cc, inside * (1.0 - uFade));
  }

  col *= 1.0 - 0.07 * length(uv - vec2(0.5, 0.55));
  col += (hash(frag + fract(uNow)) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(col, 1.0);
}`;

const Silk = (() => {
  const canvas = document.getElementById('silk');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
  const fail = () => { document.documentElement.classList.add('no-gl'); return null; };
  if (!gl) return fail();

  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }');
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return fail();
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fail();
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uRes', 'uTime', 'uNow', 'uTone', 'uOpen', 'uFade', 'uCurtain', 'uRip'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const state = { time: 11, tone: 0, toneTarget: 0, open: 0, fade: 0, curtain: 1, flow: 1 };
  const rip = new Float32Array(24);
  let ripIdx = 0;
  let lost = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const scale = SMALL ? 0.5 : 0.62;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  function ripple(clientX, clientY, strength) {
    if (REDUCE) return;
    const r = canvas.getBoundingClientRect();
    rip[ripIdx * 4] = (clientX - r.left) / r.width;
    rip[ripIdx * 4 + 1] = 1 - (clientY - r.top) / r.height;
    rip[ripIdx * 4 + 2] = performance.now() / 1000;
    rip[ripIdx * 4 + 3] = strength;
    ripIdx = (ripIdx + 1) % 6;
  }
  function render() {
    if (lost) return;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, state.time % 1000);
    gl.uniform1f(U.uNow, performance.now() / 1000);
    gl.uniform1f(U.uTone, state.tone);
    gl.uniform1f(U.uOpen, state.open);
    gl.uniform1f(U.uFade, state.fade);
    gl.uniform1f(U.uCurtain, state.curtain);
    gl.uniform4fv(U.uRip, rip);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; document.documentElement.classList.add('no-gl'); });
  resize();
  return { state, resize, ripple, render };
})();

/* =====================================================================
   Буквы имён: каждая выезжает из-под маски по очереди
   ===================================================================== */
(function splitLetters() {
  let i = 0;
  document.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    for (const c of text) {
      const outer = document.createElement('span');
      outer.className = 'ch';
      outer.setAttribute('aria-hidden', 'true');
      outer.style.setProperty('--i', i++);
      const inner = document.createElement('span');
      inner.textContent = c;
      outer.appendChild(inner);
      el.appendChild(outer);
    }
  });
})();
let readied = false;
function ready() { if (readied) return; readied = true; requestAnimationFrame(() => document.body.classList.add('ready')); }
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready);
setTimeout(ready, 1400);

/* =====================================================================
   Открыть приглашение
   ===================================================================== */
const hero = document.querySelector('.hero');
const openBtn = document.getElementById('open');
let opened = false, openStart = 0;
let lenis = null;
function openInvite(e) {
  if (opened) return;
  opened = true;
  openStart = performance.now();
  const b = openBtn.getBoundingClientRect();
  const x = e && e.clientX ? e.clientX : b.left + b.width / 2;
  const y = e && e.clientY ? e.clientY : b.top + b.height / 2;
  if (Silk) { Silk.ripple(x, y, .7); setTimeout(() => Silk.ripple(innerWidth / 2, innerHeight * .42, .35), 320); }
  document.body.classList.add('opening');
  setTimeout(() => {
    document.body.classList.remove('locked');
    document.querySelector('meta[name="theme-color"]').content = '#F3EEE6';
    if (lenis) lenis.start();
  }, REDUCE ? 300 : 1300);
  setTimeout(() => document.body.classList.add('opened'), REDUCE ? 400 : 2400);
}
openBtn.addEventListener('click', openInvite);
hero.addEventListener('click', (e) => { if (!opened && e.target !== openBtn && !openBtn.contains(e.target)) openInvite(e); });

/* рябь от касаний и движения мыши */
let lastRipple = 0, lastRx = 0, lastRy = 0;
window.addEventListener('pointerdown', (e) => { if (Silk && opened) Silk.ripple(e.clientX, e.clientY, .55); }, { passive: true });
window.addEventListener('pointermove', (e) => {
  if (!Silk || e.pointerType !== 'mouse') return;
  const now = performance.now();
  if (now - lastRipple < 140 || Math.hypot(e.clientX - lastRx, e.clientY - lastRy) < 60) return;
  lastRipple = now; lastRx = e.clientX; lastRy = e.clientY;
  Silk.ripple(e.clientX, e.clientY, .22);
}, { passive: true });

/* =====================================================================
   Цвет шёлка по блокам: берём самый верхний блок, пересекающий середину экрана
   ===================================================================== */
const toneEls = [...document.querySelectorAll('[data-tone]')];
const toneOn = new Set();
const toneIO = new IntersectionObserver((entries) => {
  for (const en of entries) en.isIntersecting ? toneOn.add(en.target) : toneOn.delete(en.target);
  let active = null;
  for (const el of toneEls) if (toneOn.has(el)) active = el;
  if (active && Silk) Silk.state.toneTarget = parseFloat(active.dataset.tone);
}, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
toneEls.forEach((el) => toneIO.observe(el));

/* =====================================================================
   Появление при прокрутке
   ===================================================================== */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: .25, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.rv').forEach((el) => io.observe(el));
const cardIO = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); cardIO.unobserve(e.target); onCardIn(e.target); }
}, { threshold: .55 });
document.querySelectorAll('.card').forEach((el) => cardIO.observe(el));

/* =====================================================================
   Лента с именами: бежит сама и ускоряется от прокрутки
   ===================================================================== */
const track = document.querySelector('.ribbon-track');
(function fillRibbon() {
  const unit = 'Гамид и Ума · 26.11.2026 · ';
  const one = document.createElement('div');
  one.style.display = 'flex';
  for (let k = 0; k < 4; k++) { const s = document.createElement('span'); s.textContent = unit; one.appendChild(s); }
  track.appendChild(one);
  track.appendChild(one.cloneNode(true));
})();
let ribbonX = 0;

/* =====================================================================
   Стопка карточек и параллакс: считаем в одном кадре с шейдером
   ===================================================================== */
const cards = [...document.querySelectorAll('.card')];
const dateBreak = document.querySelector('.datebreak');
const n1 = document.querySelector('.big .n1');
const n2 = document.querySelector('.big .n2');
const namesEl = document.querySelector('.names');
let stickBase = 84;

function layoutStack() {
  stickBase = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stick')) || 84;
  cards.forEach((c, i) => {
    const top = Math.min(stickBase + i * 10, innerHeight - c.offsetHeight - 12);
    c.style.setProperty('--top', top + 'px');
    c.dataset.top = top;
  });
}
function scrollFx() {
  const vh = innerHeight;
  // параллакс большой даты: цифры съезжаются навстречу
  const r = dateBreak.getBoundingClientRect();
  if (r.bottom > 0 && r.top < vh) {
    const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
    n1.style.transform = `translate3d(${lerp(-34, 8, p)}vw,0,0)`;
    n2.style.transform = `translate3d(${lerp(34, -8, p)}vw,0,0)`;
  }
  // карточки: чем больше легло сверху, тем глубже и темнее
  const arrive = cards.map((c, i) => {
    if (i === 0) return 1;
    const top = c.getBoundingClientRect().top;
    const stop = +c.dataset.top;
    return clamp((vh - top) / (vh - stop), 0, 1);
  });
  cards.forEach((c, i) => {
    let depth = 0;
    for (let j = i + 1; j < cards.length; j++) depth += arrive[j];
    depth = Math.min(depth, 3);
    c.style.setProperty('--s', (1 - depth * 0.045).toFixed(4));
    c.style.setProperty('--dim', (depth * 0.09).toFixed(3));
  });
  // имена уходят вверх медленнее страницы
  const y = scrollY;
  if (y < vh * 1.2) {
    namesEl.style.transform = `translate3d(0,${(y * 0.22).toFixed(1)}px,0)`;
    namesEl.style.opacity = clamp(1 - y / (vh * 0.9), 0, 1).toFixed(3);
  }
}

/* =====================================================================
   Главный цикл
   ===================================================================== */
let last = performance.now(), lastY = -1, vel = 0, lastRender = 0, dirty = true;
let renderedTone = -1;
const frameGap = SMALL ? 1000 / 32 : 0;
function tick(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (lenis) lenis.raf(now);
  const y = scrollY;
  const dy = lastY < 0 ? 0 : y - lastY;
  if (y !== lastY || dirty) { scrollFx(); dirty = false; }
  lastY = y;
  vel = lerp(vel, Math.abs(dy) / Math.max(dt, 1e-3), .1);

  // лента
  if (!REDUCE) {
    ribbonX -= dt * (38 + Math.min(vel, 2400) * .12);
    const half = track.scrollWidth / 2;
    if (half > 0 && -ribbonX > half) ribbonX += half;
    track.style.transform = `translate3d(${ribbonX.toFixed(1)}px,0,0)`;
  }

  if (Silk && document.visibilityState === 'visible') {
    const s = Silk.state;
    s.flow = lerp(s.flow, 1 + Math.min(vel / 700, 3.5), .05);
    if (!REDUCE) s.time += dt * s.flow;
    s.tone = lerp(s.tone, s.toneTarget, 1 - Math.exp(-dt * 2.4));
    if (opened) {
      const p = clamp((now - openStart) / (REDUCE ? 450 : 2300), 0, 1);
      if (REDUCE) s.fade = p; else s.open = easeInOut(p);
      if (p >= 1) s.curtain = 0;
    }
    const busy = !REDUCE || Math.abs(s.tone - renderedTone) > .002 || (opened && s.curtain > 0) || dirty;
    if (busy && now - lastRender >= frameGap) { Silk.render(); lastRender = now; renderedTone = s.tone; }
  }
  requestAnimationFrame(tick);
}

function onResize() { if (Silk) Silk.resize(); layoutStack(); dirty = true; }
let rzT = 0;
window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(onResize, 120); });

/* =====================================================================
   Календарь ноября 2026 с сердцем на 26
   ===================================================================== */
(function calendar() {
  const grid = document.getElementById('cal');
  const html = [];
  ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].forEach((w) => html.push(`<div class="wd" aria-hidden="true">${w}</div>`));
  const offset = (new Date(2026, 10, 1).getDay() + 6) % 7;
  for (let k = 0; k < offset; k++) html.push('<div class="d" aria-hidden="true"></div>');
  for (let d = 1; d <= 30; d++) {
    const wd = (offset + d - 1) % 7;
    const cls = ['d', wd >= 5 ? 'we' : '', d === 26 ? 'on' : ''].join(' ').trim();
    const heart = d === 26
      ? '<svg class="heart" viewBox="0 0 60 54" aria-hidden="true"><path pathLength="1" d="M30 50.5C14.5 40 4.5 30.5 5 18.5 5.4 10.2 11.5 4.6 18.6 4.8 24 5 27.8 8.6 30 13.2 32.2 8.6 36 5 41.4 4.8 48.5 4.6 54.6 10.2 55 18.5 55.5 30.5 45.5 40 30 50.5Z"/></svg>'
      : '';
    html.push(`<div class="${cls}" aria-hidden="true">${heart}<span>${d}</span></div>`);
  }
  grid.innerHTML = html.join('');
  grid.setAttribute('role', 'img');
})();

/* =====================================================================
   Отсчёт: цифры прокручиваются, как в механическом счётчике
   ===================================================================== */
const plural = (n, f) => f[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2];
const FORMS = { d: ['день', 'дня', 'дней'], h: ['час', 'часа', 'часов'], m: ['минута', 'минуты', 'минут'] };
const odos = {};
document.querySelectorAll('.odo').forEach((el) => { odos[el.dataset.u] = el; });
function makeCol() {
  const col = document.createElement('span');
  col.className = 'dg'; col.setAttribute('aria-hidden', 'true');
  const strip = document.createElement('span');
  strip.className = 'strip';
  for (let k = 0; k < 10; k++) { const s = document.createElement('span'); s.textContent = k; strip.appendChild(s); }
  col.appendChild(strip);
  return col;
}
function setOdo(el, val, pad, stagger) {
  const s = String(val).padStart(pad, '0');
  while (el.children.length < s.length) el.insertBefore(makeCol(), el.firstChild);
  while (el.children.length > s.length) el.removeChild(el.firstChild);
  [...el.children].forEach((col, i) => {
    const strip = col.firstChild;
    strip.style.transitionDelay = stagger ? `${(s.length - 1 - i) * 120 + stagger}ms` : '0ms';
    strip.style.transform = `translateY(${-(+s[i]) * 10}%)`;
  });
  el.setAttribute('aria-label', s);
}
const cdBox = document.getElementById('countdown');
const target = new Date(CONFIG.weddingAt).getTime();
let cdShown = false;
function cdValues() {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const min = Math.floor(ms / 60000);
  return { d: Math.floor(min / 1440), h: Math.floor((min % 1440) / 60), m: min % 60 };
}
function cdUpdate(stagger) {
  const v = cdValues();
  if (!v) { cdBox.hidden = true; return; }
  setOdo(odos.d, v.d, 1, stagger ? 0 : 0);
  setOdo(odos.h, v.h, 2, stagger ? 250 : 0);
  setOdo(odos.m, v.m, 2, stagger ? 500 : 0);
  for (const u of ['d', 'h', 'm']) document.querySelector(`[data-l="${u}"]`).textContent = plural(v[u], FORMS[u]);
}
(function cdInit() {
  const v = cdValues();
  if (!v) { cdBox.hidden = true; return; }
  // сначала нули без анимации, при появлении карточки прокрутятся к значениям
  for (const u of ['d', 'h', 'm']) { odos[u].classList.add('instant'); setOdo(odos[u], 0, u === 'd' ? String(v.d).length : 2, 0); }
  for (const u of ['d', 'h', 'm']) document.querySelector(`[data-l="${u}"]`).textContent = plural(v[u], FORMS[u]);
  setInterval(() => { if (cdShown) cdUpdate(false); }, 15000);
})();
function onCardIn(card) {
  if (card.classList.contains('card-cal') && !cdShown) {
    cdShown = true;
    for (const u of ['d', 'h', 'm']) { void odos[u].offsetWidth; odos[u].classList.remove('instant'); }
    requestAnimationFrame(() => cdUpdate(true));
  }
}

/* =====================================================================
   Карта
   ===================================================================== */
document.getElementById('map').href = 'https://yandex.ru/maps/?text=' + encodeURIComponent(CONFIG.mapQuery);

/* =====================================================================
   Анкета гостя: ответ уходит сообщением в WhatsApp
   ===================================================================== */
(function rsvp() {
  const form = document.getElementById('rsvp-form');
  const thanks = document.querySelector('.thanks');
  const countBox = form.querySelector('.count');
  const out = form.querySelector('output[name="count"]');
  const err = form.querySelector('.form-error');
  let count = 1;

  form.addEventListener('change', (e) => {
    if (e.target.name !== 'go') return;
    const yes = e.target.value === 'yes';
    countBox.classList.toggle('show', yes);
    countBox.setAttribute('aria-hidden', String(!yes));
    err.hidden = true;
  });
  form.querySelectorAll('.stepper button').forEach((b) => b.addEventListener('click', () => {
    count = Math.min(10, Math.max(1, count + Number(b.dataset.d)));
    out.textContent = count;
  }));

  function fail(text) {
    err.textContent = text;
    err.hidden = false;
    err.classList.remove('shake');
    void err.offsetWidth; // перезапуск анимации
    err.classList.add('shake');
  }
  function show(answer) {
    form.hidden = true;
    thanks.hidden = false;
    thanks.querySelector('p').textContent = (answer.go === 'yes'
      ? `${answer.name}, ждём вас 26 ноября!`
      : `${answer.name}, жаль, что не получится. Спасибо, что ответили!`)
      + ' Чтобы ответ дошёл, отправьте сообщение в WhatsApp. Если он не открылся сам, нажмите кнопку ниже.';
    document.getElementById('wa-again').href = answer.url || '#';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const name = String(f.get('name') || '').trim();
    const go = f.get('go');
    err.hidden = true;
    if (!name) { fail('Напишите, пожалуйста, ваше имя'); form.elements.name.focus(); return; }
    if (!go) { fail('Отметьте, придёте ли вы'); return; }
    const lines = [
      'Здравствуйте! Ответ на приглашение на свадьбу Гамида и Умы (26.11.2026).',
      `Имя: ${name}`,
      go === 'yes' ? `Приду: да, нас будет ${count}` : 'К сожалению, не смогу прийти',
    ];
    const url = `https://wa.me/${CONFIG.rsvpPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
    const answer = { name, go, count, url };
    try { localStorage.setItem('rsvp', JSON.stringify(answer)); } catch { /* приватный режим */ }
    if (Silk) {
      const b = form.querySelector('[type="submit"]').getBoundingClientRect();
      Silk.ripple(b.left + b.width / 2, b.top + b.height / 2, .9);
    }
    show(answer);
    const w = window.open(url, '_blank');
    if (!w) location.href = url;
  });

  document.getElementById('again').addEventListener('click', () => { thanks.hidden = true; form.hidden = false; });
  try { const saved = JSON.parse(localStorage.getItem('rsvp') || 'null'); if (saved && saved.name) show(saved); } catch { /* пусто */ }
})();

/* =====================================================================
   Старт
   ===================================================================== */
if (!SMALL && !REDUCE && window.Lenis) {
  lenis = new window.Lenis({ lerp: .1, smoothWheel: true });
  lenis.stop();
}
layoutStack();
requestAnimationFrame(tick);
