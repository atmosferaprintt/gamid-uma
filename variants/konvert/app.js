'use strict';
/* Гамид и Ума · 26.11.26 · вариант «Письмо с сургучом» */
const CONFIG = {
  // куда приходят ответы гостей: номер WhatsApp без «+»
  rsvpPhone: '79673948080',
  mapQuery: 'Махачкала, улица Хаджи Булача, 10, Рамина Холл',
  start: '2026-11-26T16:00:00+03:00',
};

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IO = 'cubic-bezier(0.77, 0, 0.175, 1)';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* =====================================================================
   Акварель: один WebGL-контекст рисует разводы в маленькие 2D-канвасы.
   Каждое пятно «распускается» один раз, потом картинка неподвижна,
   так что при прокрутке видеокарта не работает.
   ===================================================================== */
const Watercolor = (() => {
  // ?lowres только для проверки в медленном тестовом браузере
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5) * (/[?&]lowres/.test(location.search) ? .3 : 1);
  const TONES = {
    peach: [[0.95, 0.66, 0.55], [0.82, 0.36, 0.23]],
    coral: [[0.91, 0.52, 0.40], [0.77, 0.29, 0.18]],
  };
  const items = [];
  let gl = null, glc = null, U = {}, raf = 0, hiddenAt = 0;

  const VS = 'attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
  const FS = `
precision highp float;
varying vec2 v;
uniform vec2 uRes; uniform float uP, uT, uSeed, uAmt, uPx; uniform vec3 uA, uB;
float h(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
const mat2 R=mat2(.8,.6,-.6,.8);
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p=R*p*2.03+3.1;a*=.5;}return s;}
void main(){
  vec2 asp=vec2(uRes.x/uRes.y,1.);
  vec2 p=(v-.5)*asp*2.;
  vec2 s=p*1.05+uSeed*7.31;
  float w=.05*uT;
  vec2 q=vec2(fbm(s+w),fbm(s+vec2(5.2,1.3)-w));
  vec2 r=vec2(fbm(s*1.6+q*2.4+vec2(1.7,9.2)),fbm(s*1.6+q*2.4+vec2(8.3,2.8)));
  float g=1.-pow(1.-uP,3.);
  float gB=1.-pow(1.-clamp(uP*1.3-.2,0.,1.),3.);
  vec2 e=p/vec2(asp.x*.7,.7);
  float aa=3./uRes.y;
  float flow=fbm(s*2.2+r*2.);
  // A: заливка по-мокрому, край мягкий и рваный
  vec2 ea=e+(r-.5)*.9+(q-.5)*.35;
  float dA=length(ea*vec2(.95,1.15))-mix(.08,.92,g)+(fbm(s*6.+3.)-.5)*.28;
  float iA=smoothstep(.22,-.2,dA);
  // B: мазок по сухому сверху, чёткий край с тонкой каймой пигмента
  vec2 cB=vec2(cos(uSeed*3.1),sin(uSeed*2.3))*vec2(.36,.2);
  vec2 eb=(e-cB)+(r.yx-.5)*.95;
  float dB=length(eb*vec2(.95,1.15))-mix(.02,.46,gB)+(fbm(s*4.6+q*1.5)-.5)*.26;
  float iB=smoothstep(aa,-aa,dB);
  float rimB=exp(-max(-dB,0.)*30.)*iB;
  float dens=iA*(.2+.42*smoothstep(.2,.85,flow));
  dens+=iB*(.12+.17*flow)+rimB*.17*gB;
  vec2 gp=gl_FragCoord.xy/uPx;
  float gr=n(gp*.9+uSeed*31.)*.5+n(gp*.23+11.)*.5;
  dens*=.64+.62*gr;
  vec2 b=smoothstep(vec2(1.),vec2(.7),abs(v-.5)*2.);
  dens*=b.x*b.y;
  float k=clamp(rimB*.8+iB*.35+(r.y-.45)*1.2,0.,1.);
  vec3 pig=mix(uA,uB,k);
  dens=clamp(dens*uAmt*(.55+.45*g),0.,.85);
  gl_FragColor=vec4(1.-dens*(1.-pig),1.);
}`;

  try {
    glc = document.createElement('canvas');
    gl = glc.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    if (gl) {
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const k of ['uRes', 'uP', 'uT', 'uSeed', 'uAmt', 'uPx', 'uA', 'uB']) U[k] = gl.getUniformLocation(prog, k);
      glc.width = 64; glc.height = 64;
    }
  } catch (e) { console.warn('Акварель без WebGL:', e.message); gl = null; }

  function fit(it) {
    const w = Math.max(2, Math.round(it.el.clientWidth * DPR * it.res));
    const h = Math.max(2, Math.round(it.el.clientHeight * DPR * it.res));
    if (it.cv.width === w && it.cv.height === h) return false;
    it.cv.width = w; it.cv.height = h;
    return true;
  }
  function draw(it, p, t) {
    const w = it.cv.width, h = it.cv.height;
    if (glc.width < w || glc.height < h) { glc.width = Math.max(glc.width, w); glc.height = Math.max(glc.height, h); }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h);
    gl.uniform1f(U.uP, p);
    gl.uniform1f(U.uT, t);
    gl.uniform1f(U.uSeed, it.seed);
    gl.uniform1f(U.uAmt, it.amt);
    gl.uniform1f(U.uPx, DPR * it.res);
    gl.uniform3fv(U.uA, it.tone[0]);
    gl.uniform3fv(U.uB, it.tone[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    it.ctx.clearRect(0, 0, w, h);
    it.ctx.drawImage(glc, 0, glc.height - h, w, h, 0, 0, w, h);
  }
  function frame(now) {
    raf = 0;
    let active = false;
    for (const it of items) {
      if (!it.running) continue;
      const p = Math.min(1, (now - it.t0) / it.dur);
      draw(it, p, Math.min(now - it.t0, it.dur) / 1000);
      if (p >= 1) { it.running = false; it.done = true; } else active = true;
    }
    if (active) raf = requestAnimationFrame(frame);
  }
  function start(it) {
    if (it.running || it.done) return;
    if (!gl) { it.el.classList.add('on'); it.done = true; return; }
    fit(it);
    if (reduce) { draw(it, 1, it.dur / 1000); it.done = true; return; }
    it.t0 = performance.now();
    it.running = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { const it = items.find((i) => i.el === e.target); if (it) start(it); io.unobserve(e.target); }
  }, { threshold: .35 });

  for (const el of $$('.bloom')) {
    const it = {
      el,
      seed: +(el.dataset.seed || 1),
      amt: +(el.dataset.amt || .6),
      dur: +(el.dataset.dur || 2000),
      res: +(el.dataset.res || 1),
      tone: TONES[el.dataset.tone] || TONES.peach,
    };
    if (gl) { it.cv = document.createElement('canvas'); it.ctx = it.cv.getContext('2d'); el.appendChild(it.cv); }
    else el.classList.add('css');
    items.push(it);
    if (!('manual' in el.dataset)) io.observe(el);
  }

  // при смене ширины перерисовать готовые пятна
  let rt = 0, lastW = innerWidth;
  addEventListener('resize', () => {
    if (!gl || innerWidth === lastW) return;
    lastW = innerWidth;
    clearTimeout(rt);
    rt = setTimeout(() => { for (const it of items) if (it.done && fit(it)) draw(it, 1, it.dur / 1000); }, 200);
  });
  // на скрытой вкладке время пятна не идёт
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = performance.now(); return; }
    const dt = performance.now() - hiddenAt;
    for (const it of items) if (it.running) it.t0 += dt;
  });

  return {
    start: (el) => { const it = items.find((i) => i.el === el); if (it) start(it); },
    instant() { for (const it of items) { if (!gl) { it.el.classList.add('on'); continue; } fit(it); draw(it, 1, it.dur / 1000); it.done = true; it.running = false; } },
  };
})();

/* ---------- рваный край открытки календаря ---------- */
function deckle(el, seed = 3) {
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646);
  const w = el.offsetWidth, h = el.offsetHeight, a = 1.8, st = 4;
  const pts = [];
  for (let x = 0; x < w; x += st) pts.push(`${x}px ${(r() * a).toFixed(1)}px`);
  for (let y = 0; y < h; y += st) pts.push(`${(w - r() * a).toFixed(1)}px ${y}px`);
  for (let x = w; x > 0; x -= st) pts.push(`${x}px ${(h - r() * a).toFixed(1)}px`);
  for (let y = h; y > 0; y -= st) pts.push(`${(r() * a).toFixed(1)}px ${y}px`);
  el.style.clipPath = `polygon(${pts.join(',')})`;
}
const calCard = $('.cal-card');
const redeckle = () => deckle(calCard);
redeckle();
addEventListener('resize', () => { clearTimeout(redeckle.t); redeckle.t = setTimeout(redeckle, 150); });
if (document.fonts) document.fonts.ready.then(redeckle);

/* ---------- порядок прорисовки линий ---------- */
for (const svg of $$('svg.ink')) $$('[pathLength]', svg).forEach((p, i) => { if (!p.style.getPropertyValue('--i')) p.style.setProperty('--i', i); });

/* ---------- появление при прокрутке ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: .25, rootMargin: '0px 0px -40px 0px' });
$$('.rv, .page .ink, .dress-note').forEach((el) => {
  if (el.closest('.hero') || el.closest('.stop')) return;
  io.observe(el);
});

/* ---------- открыть конверт ---------- */
const cover = $('#cover');
let opened = false;
function revealPage() {
  if (document.body.classList.contains('play')) return;
  document.body.classList.add('play');
  $('.hero .garland').classList.add('in');
  Watercolor.start($('.hero-bloom'));
}
function finish() {
  cover.classList.add('gone');
  document.body.classList.remove('locked');
  const h1 = $('.hero .names');
  h1.setAttribute('tabindex', '-1');
  h1.focus({ preventScroll: true });
}
// вся сцена считается сразу при нажатии, поэтому шаги не зависят от таймеров
function openLetter() {
  if (opened) return;
  opened = true;
  cover.classList.add('opening');
  if (reduce) {
    revealPage();
    cover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease', fill: 'forwards' }).finished.then(finish);
    return;
  }
  const env = $('#env');
  const H = env.offsetHeight;
  const seal = $('#open');
  const [hl, hr] = $$('.seal-half', seal);
  const letter = $('.letter', env);
  const topHalf = $('.half.top', letter);
  const vw = innerWidth, vh = innerHeight;
  const r0 = letter.getBoundingClientRect();
  const c0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
  const ln = $('.half.bottom .l-names', letter).getBoundingClientRect();
  const hn = $('.hero .names').getBoundingClientRect();
  const outY = -0.92 * H;
  const s1 = Math.min(vw * .86 / r0.width, vh * .8 / r0.height, 1.5);
  const tx1 = vw / 2 - c0.x, ty1 = vh / 2 - c0.y;
  const s2 = Math.max(hn.height / ln.height, s1 * 1.2);
  const p = { x: ln.left + ln.width / 2 - c0.x, y: ln.top + ln.height / 2 - c0.y };
  const tx2 = hn.left + hn.width / 2 - c0.x - s2 * p.x;
  const ty2 = hn.top + hn.height / 2 - c0.y - s2 * p.y;
  const T = { crack: 150, flap: 330, swap: 700, top: 760, slide: 900, slideEnd: 1560, drop: 1520, center: 1560, centerEnd: 2400, unfold: 1720, zoom: 2900, fade: 3300, end: 3750 };
  const A = (el, kf, o) => el.animate(kf, { fill: 'both', ...o });

  // 1. печать: нажатие, трещина, половинки отлетают
  A(seal, [
    { transform: 'translate(-50%, -50%) scale(1)' },
    { transform: 'translate(-50%, -50%) scale(.92)' },
    { transform: 'translate(-50%, -50%) scale(1)' },
  ], { duration: 240, easing: EASE_OUT });
  A($('.cover-hint'), [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
  const fly = { duration: 950, delay: T.crack, easing: 'cubic-bezier(.3, 0, .7, 1)' };
  A(hl, [
    { transform: 'none', opacity: 1 },
    { transform: 'translate(-16%, -10%) rotate(-12deg)', opacity: 1, offset: .2 },
    { transform: 'translate(-90%, 260%) rotate(-62deg)', opacity: 0 },
  ], fly);
  A(hr, [
    { transform: 'none', opacity: 1 },
    { transform: 'translate(18%, -8%) rotate(14deg)', opacity: 1, offset: .2 },
    { transform: 'translate(95%, 300%) rotate(70deg)', opacity: 0 },
  ], fly);

  // 2. клапан поднимается к нам и откидывается назад, за письмо
  A($('.flap-shadow'), [{ opacity: .55 }, { opacity: 0 }], { duration: 260, delay: T.flap });
  A($('.flap'), [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(180deg)' }], { duration: 760, delay: T.flap, easing: EASE_IO });
  A($('.flap-holder'), [{ zIndex: 4 }, { zIndex: 1 }], { duration: 1, delay: T.swap, easing: 'step-end' });

  // 3. подпись над конвертом уходит, письмо выезжает
  A($('.cover-top'), [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-20px)' }], { duration: 420, delay: T.top, easing: EASE_OUT });
  // письмо: три отрезка пути, у каждого своё смягчение
  const seg = (from, to, t0, t1, easing, op = [1, 1]) => A(letter, [
    { transform: from, opacity: op[0] }, { transform: to, opacity: op[1] },
  ], { duration: t1 - t0, delay: t0, easing, fill: t0 === T.slide ? 'backwards' : 'forwards' });
  const P0 = 'translate(0px, 0px) scale(1)';
  const P1 = `translate(0px, ${outY}px) scale(1)`;
  const P2 = `translate(${tx1}px, ${ty1}px) scale(${s1})`;
  const P3 = `translate(${tx2}px, ${ty2}px) scale(${s2})`;
  seg(P0, P1, T.slide, T.slideEnd, EASE_OUT);
  seg(P1, P2, T.center, T.centerEnd, EASE_IO);
  seg(P2, P3, T.zoom, T.end, EASE_IO);

  // 4. конверт падает вниз, письмо раскрывается
  for (const el of $$('.env-body, .flap-holder', env)) A(el, [{ transform: 'none', opacity: 1 }, { transform: `translateY(${vh * .7}px) rotate(4deg)`, opacity: 0 }], { duration: 820, delay: T.drop, easing: EASE_IO });
  A(topHalf, [{ transform: 'rotateX(-180deg)' }, { transform: 'rotateX(0deg)' }], { duration: 920, delay: T.unfold, easing: EASE_IO });
  A($('.fold-shade', topHalf), [{ opacity: .9 }, { opacity: 0 }], { duration: 920, delay: T.unfold, easing: 'ease-out' });

  // 5. письмо становится страницей
  const last = A(cover, [{ opacity: 1 }, { opacity: 0 }], { duration: T.end - T.fade, delay: T.fade, easing: 'ease-out' });
  setTimeout(() => { document.body.classList.add('from-letter'); revealPage(); }, T.fade);
  last.finished.then(finish);
}
$('#open').addEventListener('click', openLetter);
// проверка: ?skip сразу покажет готовую страницу, ?t=1800 остановит открытие на 1,8 с
const qs = new URLSearchParams(location.search);
if (qs.has('skip')) {
  addEventListener('load', () => {
    opened = true;
    revealPage();
    finish();
    $$('.rv, .ink, .dress-note, .sign').forEach((el) => el.classList.add('in'));
    Watercolor.instant();
  });
}
const seek = qs.get('t');
if (seek !== null) {
  addEventListener('load', () => {
    openLetter();
    const t = +seek;
    for (const an of document.getAnimations()) { an.pause(); an.currentTime = t; }
    if (t >= 3300) { document.body.classList.add('from-letter'); revealPage(); }
  });
}

/* ---------- карта ---------- */
$('#map').href = 'https://yandex.ru/maps/?text=' + encodeURIComponent(CONFIG.mapQuery);

/* ---------- отсчёт до торжества ---------- */
(function countdown() {
  const box = $('#countdown');
  const target = new Date(CONFIG.start).getTime();
  const forms = { d: ['день', 'дня', 'дней'], h: ['час', 'часа', 'часов'], m: ['минута', 'минуты', 'минут'] };
  const plural = (n, f) => { const a = n % 10, b = n % 100; return f[a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? 1 : 2]; };
  let timer = 0;
  function tick() {
    const ms = target - Date.now();
    if (ms <= 0) { box.hidden = true; clearInterval(timer); return; }
    const v = { d: Math.floor(ms / 864e5), h: Math.floor((ms % 864e5) / 36e5), m: Math.floor((ms % 36e5) / 6e4) };
    for (const k of ['d', 'h', 'm']) {
      const b = $(`[data-u="${k}"]`, box);
      b.textContent = v[k];
      b.nextElementSibling.textContent = plural(v[k], forms[k]);
    }
  }
  tick();
  timer = setInterval(tick, 15000);
})();

/* ---------- дорожка к месту: линия рисуется за сердцем при прокрутке ---------- */
(function trail() {
  const box = $('#trail');
  const line = $('#tl-line');
  const heart = $('#tl-heart');
  const L = line.getTotalLength();
  line.style.strokeDasharray = `${L} ${L + 10}`;
  function set(p) {
    line.style.strokeDashoffset = L * (1 - p);
    const pt = line.getPointAtLength(L * p);
    heart.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})${p >= 1 ? ' scale(1.25)' : ''}`);
  }
  if (reduce) { set(1); return; }
  let queued = false;
  function update() {
    queued = false;
    const r = box.getBoundingClientRect();
    const p = (innerHeight * .7 - r.top) / (r.height + innerHeight * .12);
    set(Math.min(1, Math.max(0, p)));
  }
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  new IntersectionObserver((es) => {
    for (const e of es) {
      if (e.isIntersecting) addEventListener('scroll', onScroll, { passive: true });
      else removeEventListener('scroll', onScroll);
      onScroll();
    }
  }, { rootMargin: '30% 0px 30% 0px' }).observe(box);
  set(0);
})();

/* ---------- анкета гостя: ответ уходит сообщением в WhatsApp ---------- */
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
    show(answer);
    const w = window.open(url, '_blank');
    if (!w) location.href = url;
  });

  document.getElementById('again').addEventListener('click', () => { thanks.hidden = true; form.hidden = false; });
  try { const saved = JSON.parse(localStorage.getItem('rsvp') || 'null'); if (saved && saved.name) show(saved); } catch { /* пусто */ }
})();
