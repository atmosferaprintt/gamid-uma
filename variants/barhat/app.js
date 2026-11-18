'use strict';
/* Гамид и Ума · 26.11.26 · вариант «Бархатный театр» */
const CONFIG = {
  // куда приходят ответы гостей: номер WhatsApp без «+»
  rsvpPhone: '79673948080',
  mapQuery: 'Махачкала, улица Хаджи Булача, 10, Рамина Холл',
};
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* cubic-bezier как в CSS: для движения занавеса берём тот же --ease-curtain */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (t) => ((ax * t + bx) * t + cx) * t;
  const fy = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) { const d = (3 * ax * t + 2 * bx) * t + cx; if (Math.abs(d) < 1e-6) break; t -= (fx(t) - x) / d; }
    return fy(Math.min(1, Math.max(0, t)));
  };
}
const easeCurtain = bezier(.62, .04, .22, 1);

/* ---------- заставка: имена на атласном занавесе ---------- */
(function cover() {
  const cover = document.getElementById('cover');
  const canvas = document.getElementById('curtain-gl');
  const btn = document.getElementById('open');
  const theme = document.querySelector('meta[name="theme-color"]');
  const gl = window.Satin && Satin.create(canvas, { left: 'cover-left.webp', right: 'cover-right.webp' });
  if (!gl) { cover.classList.add('nogl'); canvas.remove(); }
  const st = { time: 11, open: 0 };
  let glOn = false;
  const paint = () => { if (gl.draw(st) && !glOn) { glOn = true; cover.classList.add('gl-on'); } };

  // буквы имён и даты: каждая в своей маске, выезжают по очереди
  let n = 0;
  cover.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    el.textContent = '';
    for (const c of text) {
      const outer = document.createElement('span');
      outer.className = 'ch'; outer.setAttribute('aria-hidden', 'true'); outer.style.setProperty('--i', n++);
      const inner = document.createElement('span'); inner.textContent = c;
      outer.appendChild(inner); el.appendChild(outer);
    }
  });
  let readied = false;
  const ready = () => { if (readied) return; readied = true; requestAnimationFrame(() => cover.classList.add('ready')); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready);
  setTimeout(ready, 1400);

  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const DUR = 2300;
  let opened = false, raf = 0, last = 0, start = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (!opened && now - last < 32) return; // пока ждём нажатия, хватает 30 кадров в секунду
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016);
    last = now;
    st.time += dt;
    if (opened) {
      const p = Math.min(1, Math.max(0, (now - start) / DUR));
      st.open = easeInOut(p);
      if (p >= 1) { finish(); return; }
    }
    paint();
  }
  if (gl) {
    if (reduce) gl.whenReady.then(paint); else raf = requestAnimationFrame(frame);
    window.addEventListener('resize', () => { gl.resize(); if (reduce) paint(); });
  }

  function finish() {
    cancelAnimationFrame(raf); raf = 0;
    cover.classList.add('gone');
    setTimeout(() => { if (gl) gl.destroy(); cover.remove(); }, 600);
  }

  function open(e) {
    if (opened) return;
    opened = true;
    cover.classList.add('open');
    theme.content = '#F3EEE6';
    setTimeout(() => document.body.classList.remove('locked'), reduce ? 0 : 1300);
    if (!gl || reduce) {
      setTimeout(() => document.body.classList.add('play'), reduce ? 0 : 250);
      setTimeout(startReveals, reduce ? 0 : 1200);
      setTimeout(finish, reduce ? 500 : 2000);
      return;
    }
    start = performance.now();
    // от точки нажатия по ткани бежит волна, следом вторая из центра
    const b = document.getElementById('seal').getBoundingClientRect();
    const x = e && e.clientX ? e.clientX : b.left + b.width / 2;
    const y = e && e.clientY ? e.clientY : b.top + b.height / 2;
    gl.ripple(x, y, .7);
    setTimeout(() => gl.ripple(innerWidth / 2, innerHeight * .42, .35), 320);
    setTimeout(() => document.body.classList.add('play'), 450);
    setTimeout(startReveals, 1900);
  }
  btn.addEventListener('click', (e) => { e.stopPropagation(); open(e); });
  document.getElementById('seal').addEventListener('click', (e) => { e.stopPropagation(); open(e); });
  cover.addEventListener('click', open);
})();

/* ---------- атласные ленты: разворачиваются при появлении, потом тихо струятся ---------- */
document.querySelectorAll('.ribbon').forEach((box) => {
  const canvas = box.querySelector('.ribbon-gl');
  const gl = window.Ribbon && Ribbon.create(canvas, box.dataset.palette);
  if (!gl) { box.classList.add('nogl'); canvas.remove(); }
  const st = { time: Math.random() * 20, reveal: reduce ? 1 : 0 };
  let raf = 0, last = 0, start = 0, shown = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < 33) return; // 30 кадров достаточно для медленной ткани
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016);
    last = now;
    st.time += dt;
    if (shown) { const p = Math.min(1, (now - start) / 1800); st.reveal = 1 - Math.pow(1 - p, 3); }
    gl.draw(st);
  }
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && !shown) { shown = true; start = performance.now(); box.classList.add('in'); if (gl) gl.resize(); }
    if (!gl) return;
    if (reduce) { gl.resize(); gl.draw(st); return; }
    if (en.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    else if (!en.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: .3 }).observe(box);
  window.addEventListener('resize', () => { if (gl) { gl.resize(); gl.draw(st); } });
});

/* ---------- панель выбора: шрифты и дресс-код, выбор сохраняется в ссылке ---------- */
(function chooser() {
  const panel = document.querySelector('.chooser');
  if (!panel) return;
  const q = new URLSearchParams(location.search);
  const state = { type: q.get('t') || document.body.dataset.type, dress: q.get('d') || document.body.dataset.dress };
  function apply() {
    document.body.dataset.type = state.type;
    document.body.dataset.dress = state.dress;
    panel.querySelectorAll('[data-k]').forEach((b) => b.setAttribute('aria-pressed', String(state[b.dataset.k] === b.dataset.v)));
    const u = new URL(location.href); u.searchParams.set('t', state.type); u.searchParams.set('d', state.dress);
    history.replaceState(null, '', u);
    window.dispatchEvent(new Event('resize')); // ленты в показанном варианте пересчитают размер
  }
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('ch-close')) { panel.classList.add('off'); return; }
    state[b.dataset.k] = b.dataset.v; apply();
  });
  apply();
})();

/* ---------- пылинки в луче над сценой ---------- */
(function dust() {
  const c = document.querySelector('.hero .dust');
  if (!c || reduce) { if (c) c.remove(); return; }
  const ctx = c.getContext('2d');
  let w = 0, h = 0, dpr = 1, raf = 0, seen = false, last = 0;
  const P = [];
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = c.clientWidth; h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(p, anywhere) {
    p.y = anywhere ? Math.random() * h : h * (.75 + Math.random() * .25);
    const cone = .12 + .38 * (p.y / h);                     // луч расширяется книзу
    p.x = w / 2 + (Math.random() * 2 - 1) * cone * w;
    p.r = .5 + Math.random() * 1.4;
    p.vy = 4 + Math.random() * 9;
    p.ph = Math.random() * 6.28; p.tw = .6 + Math.random() * 1.6;
    p.a = .25 + Math.random() * .5;
    return p;
  }
  size();
  for (let i = 0; i < 38; i++) P.push(spawn({}, true));
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
    ctx.clearRect(0, 0, w, h);
    const t = now / 1000;
    for (const p of P) {
      p.y -= p.vy * dt;
      p.x += Math.sin(t * .4 + p.ph) * 3 * dt;
      if (p.y < -4) spawn(p, false);
      const fadeTop = Math.min(1, p.y / (h * .15));
      const a = p.a * (.55 + .45 * Math.sin(t * p.tw + p.ph)) * fadeTop;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      g.addColorStop(0, `rgba(255, 238, 214, ${a})`);
      g.addColorStop(1, 'rgba(255, 238, 214, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
    }
  }
  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    if (seen && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    if (!seen && raf) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(c);
  window.addEventListener('resize', size);
})();

/* ---------- появление при прокрутке ---------- */
document.querySelectorAll('.cal .days > *').forEach((d, i) => d.style.setProperty('--i', i));
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: .18, rootMargin: '0px 0px -40px 0px' });
// блоки начинают появляться только когда занавес открыт, иначе всё проиграется под ним
function startReveals() { document.querySelectorAll('.rv').forEach((el) => io.observe(el)); }

/* ---------- арка: контур рисуется двумя половинами снизу вверх и встречается в замке ---------- */
(function arch() {
  const box = document.querySelector('.arch');
  const svg = box.querySelector('.arch-line');
  const [l, r] = svg.querySelectorAll('path');
  function build() {
    const W = box.clientWidth, H = box.clientHeight, d = 11, R = W / 2;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    l.setAttribute('d', `M${d} ${H - d}V${R}A${R - d} ${R - d} 0 0 1 ${W / 2} ${d}`);
    r.setAttribute('d', `M${W - d} ${H - d}V${R}A${R - d} ${R - d} 0 0 0 ${W / 2} ${d}`);
  }
  build();
  new ResizeObserver(build).observe(box);
})();

/* ---------- карта ---------- */
document.getElementById('map').href = 'https://yandex.ru/maps/?text=' + encodeURIComponent(CONFIG.mapQuery);

/* ---------- обратный отсчёт: дни, часы, минуты ---------- */
(function countdown() {
  const target = Date.parse('2026-11-26T16:00:00+03:00');
  const box = document.getElementById('countdown');
  const word = (n, f) => f[(n % 100 > 10 && n % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)]];
  const labels = { d: ['день', 'дня', 'дней'], h: ['час', 'часа', 'часов'], m: ['минута', 'минуты', 'минут'] };
  function tick() {
    const t = Math.floor((target - Date.now()) / 60000);
    if (t <= 0) { box.hidden = true; return; } // после свадьбы отсчёт не нужен
    const v = { d: Math.floor(t / 1440), h: Math.floor(t % 1440 / 60), m: t % 60 };
    for (const u of ['d', 'h', 'm']) {
      const b = box.querySelector(`[data-u="${u}"]`);
      const s = String(v[u]);
      if (b.textContent !== s) {
        const first = b.dataset.set !== '1';
        b.textContent = s; b.dataset.set = '1';
        if (!first && !reduce && b.animate) b.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      }
      b.nextElementSibling.textContent = word(v[u], labels[u]);
    }
  }
  tick();
  setInterval(tick, 15000);
})();

/* ---------- бархат под анкетой ---------- */
(function velvetBlock() {
  const sec = document.querySelector('.rsvp.velvet');
  const canvas = sec.querySelector('.velvet-gl');
  let gl = null, raf = 0, last = 0, tried = false;
  const st = { time: 3, open: 0, vel: 0, light: .2 };
  function draw(now) {
    raf = requestAnimationFrame(draw);
    if (now - last < 33) return; // 30 кадров в секунду достаточно для медленного света
    const dt = last ? Math.min(.1, (now - last) / 1000) : .016; last = now;
    st.time += dt;
    const r = sec.getBoundingClientRect();
    // свет прожектора скользит по ткани вместе с прокруткой
    st.light = Math.min(.75, Math.max(.05, (window.innerHeight * .4 - r.top) / r.height));
    gl.draw(st);
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      if (!tried) {
        tried = true;
        gl = window.Velvet && Velvet.create(canvas, { mode: 1, base: [.46, .13, .09], sheen: [.62, .26, .19], maxDpr: 1.25 });
        if (!gl) { canvas.remove(); sec.classList.add('nogl'); return; }
        window.addEventListener('resize', () => { gl.resize(); gl.draw(st); });
        new ResizeObserver(() => { gl.resize(); gl.draw(st); }).observe(canvas);
        sec.classList.add('gl-on');
      }
      if (!gl) return;
      if (reduce) { gl.draw(st); return; }
      if (!raf) { last = 0; raf = requestAnimationFrame(draw); }
    } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: '200px 0px' }).observe(sec);
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
