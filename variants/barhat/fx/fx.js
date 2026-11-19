'use strict';
/* Варианты мерцания для приглашения. FX.run(canvas, тип) рисует эффект на холсте поверх страницы.
   Типы: dust — пылинки, stars — звёздочки, glitter — блёстки, bokeh — боке, snow — золотой снег. */
window.FX = (function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // тёплая точка: светлая сердцевина видна на бархате, золотистый ореол — на креме
  function glow(ctx, x, y, r, a, halo) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, `rgba(255, 246, 228, ${a})`);
    g.addColorStop(.35, `rgba(214, 176, 116, ${a * halo})`);
    g.addColorStop(1, 'rgba(214, 176, 116, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  }
  // четырёхлучевая звёздочка
  function star(ctx, x, y, r, a, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    glow(ctx, 0, 0, r * .55, a * .8, .7);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const an = i * Math.PI / 2;
      ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
      ctx.lineTo(Math.cos(an + Math.PI / 4) * r * .2, Math.sin(an + Math.PI / 4) * r * .2);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(255, 255, 255, ${a})`);
    g.addColorStop(.45, `rgba(250, 228, 178, ${a})`);
    g.addColorStop(1, `rgba(214, 166, 76, ${a * .7})`);
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  }

  const KINDS = {
    // 1. пылинки: медленно плывут вверх, мягко мерцают (как в луче на сцене)
    dust: {
      n: (w, h) => Math.round(w * h / 6500),
      spawn(p, w, h, any) { p.x = rnd(0, w); p.y = any ? rnd(0, h) : h + 6; p.r = rnd(.9, 2.5); p.vy = rnd(3, 10); p.ph = rnd(0, 6.28); p.tw = rnd(.5, 1.9); p.a = rnd(.4, .85); },
      step(p, dt, t, w, h, ctx) {
        p.y -= p.vy * dt; p.x += Math.sin(t * .4 + p.ph) * 3 * dt;
        if (p.y < -6) this.spawn(p, w, h, false);
        glow(ctx, p.x, p.y, p.r, Math.min(1, p.a * (.45 + .55 * Math.sin(t * p.tw + p.ph))), .6);
      },
    },
    // 2. звёздочки: то тут, то там вспыхивают и гаснут, слегка поворачиваясь
    stars: {
      n: (w, h) => Math.round(w * h / 16000),
      spawn(p, w, h, any) { p.x = rnd(0, w); p.y = rnd(0, h); p.r = rnd(5, 10); p.life = rnd(2.2, 4); p.t = any ? rnd(-4, p.life) : rnd(-3, 0); p.rot = rnd(0, 1); },
      step(p, dt, t, w, h, ctx) {
        p.t += dt;
        if (p.t > p.life) this.spawn(p, w, h, false);
        if (p.t < 0) return;
        const k = Math.sin(Math.PI * p.t / p.life);
        star(ctx, p.x, p.y, p.r * (.3 + .7 * k), k * .95, p.rot + p.t * .35);
      },
    },
    // 3. блёстки: крошечные точки коротко вспыхивают тонким крестиком, как на ткани с люрексом
    glitter: {
      n: (w, h) => Math.round(w * h / 3500),
      spawn(p, w, h, any) { p.x = rnd(0, w); p.y = rnd(0, h); p.life = rnd(.35, .8); p.t = any ? rnd(-6, 0) : rnd(-7, -1); p.r = rnd(2.5, 6); },
      step(p, dt, t, w, h, ctx) {
        p.t += dt;
        if (p.t > p.life) this.spawn(p, w, h, false);
        if (p.t < 0) return;
        const k = Math.sin(Math.PI * p.t / p.life), a = k * .95;
        glow(ctx, p.x, p.y, .9, a, .8);
        const cross = (col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(p.x - p.r * k, p.y); ctx.lineTo(p.x + p.r * k, p.y); ctx.moveTo(p.x, p.y - p.r * k); ctx.lineTo(p.x, p.y + p.r * k); ctx.stroke(); };
        cross(`rgba(205, 160, 80, ${a * .75})`, 1.4);   // золотистый, виден на креме
        cross(`rgba(255, 248, 230, ${a})`, .6);          // светлая середина, видна на бархате
      },
    },
    // 4. боке: большие мягкие пятна света, еле видные, медленно плывут и дышат
    bokeh: {
      n: (w, h) => Math.max(6, Math.round(w * h / 26000)),
      spawn(p, w, h, any) { p.x = rnd(0, w); p.y = any ? rnd(0, h) : h + 70; p.r = rnd(18, 54); p.vy = rnd(2, 6); p.vx = rnd(-3, 3); p.ph = rnd(0, 6.28); p.a = rnd(.11, .22); },
      step(p, dt, t, w, h, ctx) {
        p.y -= p.vy * dt; p.x += p.vx * dt;
        if (p.y < -70) this.spawn(p, w, h, false);
        const a = p.a * (.6 + .4 * Math.sin(t * .5 + p.ph));
        const g = ctx.createRadialGradient(p.x, p.y, p.r * .2, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(255, 236, 196, ${a})`);
        g.addColorStop(.8, `rgba(232, 196, 130, ${a * .7})`);
        g.addColorStop(1, 'rgba(232, 196, 130, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      },
    },
    // 5. золотой снег: золотистая пыль медленно оседает вниз, покачиваясь
    snow: {
      n: (w, h) => Math.round(w * h / 6000),
      spawn(p, w, h, any) { p.x = rnd(0, w); p.y = any ? rnd(0, h) : -6; p.r = rnd(.8, 2.2); p.vy = rnd(6, 16); p.ph = rnd(0, 6.28); p.sw = rnd(6, 14); p.a = rnd(.45, .9); p.tw = rnd(.6, 1.8); },
      step(p, dt, t, w, h, ctx) {
        p.y += p.vy * dt; p.x += Math.sin(t * .7 + p.ph) * p.sw * dt;
        if (p.y > h + 6) this.spawn(p, w, h, false);
        glow(ctx, p.x, p.y, p.r, Math.min(1, p.a * (.6 + .4 * Math.sin(t * p.tw + p.ph))), .75);
      },
    },
  };

  function run(canvas, type) {
    const K = KINDS[type];
    if (!K || reduce) return () => {};
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf = 0, last = 0, on = true;
    const P = [];
    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = K.n(w, h);
      while (P.length < n) { const p = {}; K.spawn(p, w, h, true); P.push(p); }
      P.length = n;
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!on || document.hidden || now - last < 33) return;
      const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      for (const p of P) K.step(p, dt, t, w, h, ctx);
    }
    size();
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }
  return { run, kinds: Object.keys(KINDS) };
})();
