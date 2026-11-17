'use strict';
/* Гамид & Ума · 26.11.2026 */
const CONFIG = {
  // куда приходят ответы гостей: номер WhatsApp без «+»
  rsvpPhone: '79673948080',
  weddingAt: '2026-11-26T16:00:00+03:00',
  mapQuery: 'Махачкала, улица Хаджи Булача, 10, Рамина Холл',
};

/* ---------- кисти на занавесе (рисуем серебряными нитями) ---------- */
function tasselSVG() {
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const strands = (cx, top, len, wTop, wBot) => {
    let out = '';
    for (let i = 0; i < 46; i++) {
      const t = i / 45;
      const x0 = cx - wTop / 2 + t * wTop + (rnd() - .5) * 1.2;
      const x1 = cx - wBot / 2 + t * wBot + (rnd() - .5) * 3;
      const l = len - rnd() * 14;
      const c = rnd() < .22 ? '#dcdee0' : rnd() < .5 ? '#9a9ea3' : '#b4b7bb';
      out += `<path d="M${x0.toFixed(1)} ${top} C ${x0.toFixed(1)} ${top + l * .4}, ${x1.toFixed(1)} ${top + l * .7}, ${x1.toFixed(1)} ${(top + l).toFixed(1)}" stroke="${c}" stroke-width="${(.55 + rnd() * .5).toFixed(2)}" fill="none" opacity="${(.75 + rnd() * .25).toFixed(2)}"/>`;
    }
    return out;
  };
  const one = (cx, len) => `
    <path d="M${cx - 9} 108 L${cx - 13} ${108 + len} L${cx + 13} ${108 + len} L${cx + 9} 108 Z" fill="url(#body)" opacity=".85"/>
    ${strands(cx, 106, len, 16, 26)}
    <path d="M${cx - 8} 104 C ${cx - 10} 86, ${cx - 6} 76, ${cx} 74 C ${cx + 6} 76, ${cx + 10} 86, ${cx + 8} 104 Z" fill="url(#cap)"/>
    <rect x="${cx - 9}" y="101" width="18" height="6" rx="3" fill="url(#ring)"/>
    <path d="M${cx - 6} 90 Q ${cx} 86 ${cx + 6} 90 M${cx - 7} 96 Q ${cx} 92 ${cx + 7} 96" stroke="#8a8e93" stroke-width=".7" fill="none"/>`;
  return `<svg viewBox="0 0 100 330" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e3e5"/><stop offset=".55" stop-color="#b3b6ba"/><stop offset="1" stop-color="#8b8f94"/></linearGradient>
      <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8d9196"/><stop offset=".4" stop-color="#e3e4e6"/><stop offset="1" stop-color="#9a9ea3"/></linearGradient>
      <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f8388"/><stop offset=".5" stop-color="#d9dbdd"/><stop offset="1" stop-color="#7f8388"/></linearGradient>
      <linearGradient id="body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e9297"/><stop offset=".5" stop-color="#c3c6c9"/><stop offset="1" stop-color="#8e9297"/></linearGradient>
      <pattern id="weave" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 4 Q2 0 4 4 T8 4" stroke="#f4f4f5" stroke-width=".9" fill="none" opacity=".8"/></pattern>
    </defs>
    <path d="M38 40 C 36 52, 40 62, 38 76 M62 40 C 64 52, 60 62, 62 76" stroke="#a7abaf" stroke-width="2.2" fill="none"/>
    <rect x="20" y="2" width="60" height="42" rx="7" fill="url(#band)"/>
    <rect x="20" y="2" width="60" height="42" rx="7" fill="url(#weave)"/>
    <path d="M30 23 C 34 12, 44 12, 46 22 C 48 32, 58 32, 62 22 C 64 15, 70 16, 70 23" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".9"/>
    <rect x="20" y="2" width="60" height="42" rx="7" fill="none" stroke="#868a8f" stroke-width="1"/>
    ${one(38, 210)}
    ${one(62, 196)}
  </svg>`;
}
document.querySelectorAll('.tieback').forEach((el) => { el.innerHTML = tasselSVG(); });

/* ---------- открыть занавес ---------- */
const stage = document.getElementById('stage');
let opened = false;
function openCurtain() {
  if (opened) return;
  opened = true;
  stage.classList.add('open');
  setTimeout(() => {
    stage.classList.add('gone');
    document.body.classList.remove('locked');
    document.querySelectorAll('.hero .reveal').forEach((el, i) => setTimeout(() => el.classList.add('in'), i * 140));
  }, 1650);
}
document.getElementById('open').addEventListener('click', openCurtain);
stage.addEventListener('click', (e) => { if (e.target.closest('.curtain')) openCurtain(); });

/* ---------- появление блоков при прокрутке ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });

/* ---------- календарь ноября 2026, 26-е обведено ---------- */
(function calendar() {
  const box = document.getElementById('cal');
  const year = 2026, month = 10, hit = 26;
  const first = (new Date(year, month, 1).getDay() + 6) % 7; // понедельник = 0
  const days = new Date(year, month + 1, 0).getDate();
  let html = '<div class="cal-h">Ноябрь 2026</div><div class="cal-grid">';
  html += ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((d) => `<div class="wd">${d}</div>`).join('');
  for (let i = 0; i < first; i++) html += '<div class="d off">.</div>';
  for (let d = 1; d <= days; d++) {
    const wd = (first + d - 1) % 7;
    const ring = d === hit
      ? '<svg viewBox="0 0 50 44" preserveAspectRatio="none"><path d="M10 15 C 16 4, 38 2, 45 14 C 51 26, 40 40, 24 40 C 8 40, 1 30, 5 20 C 7 14, 14 9, 22 8"/></svg>' : '';
    html += `<div class="d${wd >= 5 ? ' we' : ''}${d === hit ? ' hit' : ''}">${ring}<span>${d}</span></div>`;
  }
  box.innerHTML = html + '</div>';
})();

/* ---------- карта ---------- */
document.getElementById('map').href = 'https://yandex.ru/maps/?text=' + encodeURIComponent(CONFIG.mapQuery);

/* ---------- обратный отсчёт ---------- */
(function countdown() {
  const target = Date.parse(CONFIG.weddingAt);
  const el = (u) => document.querySelector(`#cd [data-u="${u}"]`);
  const word = (n, f) => f[(n % 100 > 10 && n % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][Math.min(n % 10, 5)]];
  const labels = { d: ['день', 'дня', 'дней'], h: ['час', 'часа', 'часов'], m: ['минута', 'минуты', 'минут'], s: ['секунда', 'секунды', 'секунд'] };
  function tick() {
    let t = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const v = { d: Math.floor(t / 86400), h: Math.floor(t % 86400 / 3600), m: Math.floor(t % 3600 / 60), s: t % 60 };
    for (const u of ['d', 'h', 'm', 's']) {
      const b = el(u);
      if (b.textContent !== String(v[u])) b.textContent = v[u];
      b.nextElementSibling.textContent = word(v[u], labels[u]);
    }
  }
  tick();
  setInterval(tick, 1000);
})();

/* ---------- анкета гостя: ответ уходит сообщением в WhatsApp ---------- */
(function rsvp() {
  const form = document.getElementById('rsvp-form');
  const thanks = document.querySelector('.thanks');
  const guests = form.querySelector('.guests');
  const out = form.querySelector('output[name="count"]');
  const err = form.querySelector('.form-error');
  let count = 1;
  form.addEventListener('change', (e) => {
    if (e.target.name === 'go') guests.classList.toggle('hidden', e.target.value !== 'yes');
  });
  form.querySelectorAll('.stepper button').forEach((b) => b.addEventListener('click', () => {
    count = Math.min(10, Math.max(1, count + Number(b.dataset.d)));
    out.textContent = count;
  }));
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
    if (!name) { err.textContent = 'Напишите, пожалуйста, ваше имя'; err.hidden = false; return; }
    if (!go) { err.textContent = 'Отметьте, придёте ли вы'; err.hidden = false; return; }
    const note = String(f.get('note') || '').trim();
    const lines = [
      'Здравствуйте! Ответ на приглашение на свадьбу Гамида и Умы (26.11.2026).',
      `Имя: ${name}`,
      go === 'yes' ? `Приду: да, нас будет ${count}` : 'К сожалению, не смогу прийти',
    ];
    if (note) lines.push(`Пожелание: ${note}`);
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
