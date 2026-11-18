'use strict';
/* Гамид и Ума · 26.11.26 */
const CONFIG = {
  // куда приходят ответы гостей: номер WhatsApp без «+»
  rsvpPhone: '79673948080',
  mapQuery: 'Махачкала, улица Хаджи Булача, 10, Рамина Холл',
};

/* ---------- открыть занавес ---------- */
const cover = document.getElementById('cover');
let opened = false;
function openCurtain() {
  if (opened) return;
  opened = true;
  cover.classList.add('open');
  // шторы на обложке начинают «отходить» вместе с занавесом
  setTimeout(() => document.body.classList.add('play'), 250);
  setTimeout(() => {
    cover.classList.add('gone');
    document.body.classList.remove('locked');
  }, 2000);
}
document.getElementById('open').addEventListener('click', openCurtain);
cover.addEventListener('click', (e) => { if (e.target.closest('.drape')) openCurtain(); });

/* ---------- появление блоков при прокрутке ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: .2, rootMargin: '0px 0px -30px 0px' });
document.querySelectorAll('.rv, .orn').forEach((el) => io.observe(el));

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
    if (t <= 0) { box.hidden = true; box.previousElementSibling.hidden = true; return; } // после свадьбы прячем
    const v = { d: Math.floor(t / 1440), h: Math.floor(t % 1440 / 60), m: t % 60 };
    for (const u of ['d', 'h', 'm']) {
      const b = box.querySelector(`[data-u="${u}"]`);
      b.textContent = v[u];
      b.nextElementSibling.textContent = word(v[u], labels[u]);
    }
  }
  tick();
  setInterval(tick, 15000);
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
