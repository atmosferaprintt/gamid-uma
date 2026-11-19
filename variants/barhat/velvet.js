'use strict';
/* Бархат на WebGL: один шейдер на две роли.
   mode 0 — занавес заставки: две половины, расходятся по uOpen, луч прожектора и пылинки;
   mode 1 — фон блока анкеты: сплошное тёмно-коралловое полотно.
   Без WebGL возвращает null, страница показывает CSS-запасной вариант. */
window.Velvet = (function () {
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uOpen, uVel, uN, uMode, uDpr, uLight;
uniform vec3 uBase, uSheen;
const float TAU = 6.2831853;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

float n1(float x, float seed) { float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(hash(vec2(i, seed)), hash(vec2(i + 1., seed)), f); }

/* профиль ткани: круглые «трубы» складок с узкими глубокими впадинами, шаг неровный.
   Сверху складки ровные (собраны на карнизе), книзу гуляют */
float fabric(float s, float y, float n, float seed, float wave) {
  float loose = y * y;
  float p = s * n;
  p += .6 * (n1(s * n * .42 + seed * 13., seed) - .5);
  p += .22 * sin(y * 2.1 + seed * 5.) * loose + wave;
  float t = fract(p);
  float tube = pow(sin(3.14159 * t), .6);
  float amp = .62 + .38 * n1(p * .5 + seed * 3., seed + 1.);
  float h = tube * amp;
  h += .14 * sin(TAU * (s * n * 2.3 + .7 + seed) + y * 1.3);
  h += .3 * sin(TAU * (s * n * .31 + seed * 2.) + y * .8);
  return h;
}

void main() {
  vec2 px = gl_FragCoord.xy / uDpr;                 /* CSS-пиксели */
  vec2 res = uRes / uDpr;
  float x = gl_FragCoord.x / uRes.x;
  float y = 1. - gl_FragCoord.y / uRes.y;           /* 0 сверху */
  float aspect = uRes.x / uRes.y;
  float o = uOpen;

  float side = step(.5, x);
  float xm = mix(x, 1. - x, side);                  /* 0 у внешнего края, .5 в центре */
  float seed = side * .37;

  float xo, xi, hemY, s, W;
  if (uMode < .5) {
    /* края полотна: внутренний уходит к краю экрана, низ отстаёт по инерции и колышется */
    xo = mix(0., -.11, o * o);
    xi = mix(.503, -.025, o);
    xi += uVel * .075 * y * y;
    xi += .012 * sin(y * 3.1 + uTime * 1.7 + seed * 9.) * min(abs(uVel) * 3., 1.);
    W = max(xi - xo, .001);
    s = clamp((xm - xo) / W, 0., 1.);
    /* подол приподнимается, сильнее у внутреннего угла */
    float lift = (.035 * o + .1 * sin(3.14159 * o)) * (.2 + .8 * s * s);
    hemY = 1.012 - lift;
  } else {
    xo = 0.; xi = 2.; W = 1.; s = x; hemY = 2.; seed = 0.;
  }

  /* у внешнего края ткань сжата сильнее */
  float s2 = pow(s, mix(1., .78, o));
  float wave = .3 * uVel * sin(y * 7. - uTime * 6. + seed * 4.) * s + .02 * sin(uTime * .35 + seed * 6. + y * 1.5);
  float e = .6 / max(W * res.x, 1.);                 /* полпикселя в координатах ткани */
  float h0 = fabric(s2, y, uN, seed, wave);
  float hp = fabric(min(s2 + e, 1.), y, uN, seed, wave);
  float hm = fabric(max(s2 - e, 0.), y, uN, seed, wave);
  float depth = mix(1., 1.25, o);
  float slope = .022 * depth * (hp - hm) / (2. * e * W * uN) * uN;
  slope *= mix(1., -1., side);
  vec3 N = normalize(vec3(-slope, .06 * sin(y * 9. + s * 20.) * .3, 1.));

  /* свет: прожектор сверху по центру */
  vec3 L = normalize(vec3((.5 - x) * 1.3, .55, 1.));
  float diff = clamp(dot(N, L), 0., 1.);
  float ndv = N.z;
  float sheen = pow(1. - ndv, 1.25);
  float spot = exp(-pow((x - .5) * aspect * 1.25, 2.) * 1.6 - pow(y - .18, 2.) * 1.5);
  if (uMode > .5) spot = exp(-pow((x - .5) * 1.4, 2.) - pow(y - uLight, 2.) * 2.2);

  /* мятый бархат и ворс */
  float cn = vnoise(vec2(s2 * uN * 1.3 + seed * 7., y * 4.2)) * .55 + vnoise(vec2(s2 * uN * 3.1 + 3., y * 11.)) * .45;
  cn = smoothstep(.2, .85, cn);
  float pile = hash(floor(px * 1.5) + seed * 31.) - .5;

  float ao = .45 + .55 * smoothstep(-.1, .75, h0);
  vec3 col = uBase * (.55 + .45 * diff) * ao * (.86 + .28 * cn);
  col += uSheen * sheen * ao * (.55 + .9 * spot) * (.35 + 1.15 * cn);
  col += uSheen * pow(diff, 10.) * .1 * spot;
  col *= .78 + .55 * spot;
  col *= 1. + pile * .1;

  float alpha = 1.;
  if (uMode < .5) {
    /* тень от карниза, свёрнутый внутренний край, тяжёлый подол */
    col *= mix(.55, 1., smoothstep(0., .1, y));
    float ed = (xi - xm) * res.x;                    /* расстояние до внутреннего края, px */
    col *= 1. - .45 * exp(-ed * ed / 30.);
    col += uSheen * .25 * exp(-pow(ed - 7., 2.) / 10.);
    float hd = (hemY - y) * res.y;
    col *= 1. - .35 * exp(-hd * hd / 60.);
    col += uSheen * .18 * exp(-pow(hd - 6., 2.) / 8.);
    alpha = clamp(ed / 1.2, 0., 1.) * clamp(hd / 1.2, 0., 1.);
    /* мягкая тень полотна на сцене за ним */
    float sh = .32 * exp(-max(-ed, 0.) / 26.) * (1. - alpha) * smoothstep(1.03, .8, y);
    sh *= 1. - smoothstep(.75, 1., o);
    vec3 outc = col * alpha;
    float outa = alpha + sh;

    /* луч прожектора и пылинки поверх всего */
    float bx = (x - .5) * aspect;
    float cone = .08 + y * .42;
    float beam = smoothstep(cone, cone * .35, abs(bx)) * smoothstep(1.05, .05, y) * (1. - o * .85);
    vec2 g = vec2(px.x + sin(uTime * .3 + px.y * .01) * 8., px.y + uTime * 9.) / 38.;
    vec2 cell = floor(g), fr = fract(g) - .5;
    float h1 = hash(cell), h2 = hash(cell + 7.1);
    vec2 pos = vec2(h1, h2) - .5;
    float r = length((fr - pos * .7) * 38.);
    float mote = step(.62, hash(cell + 3.3)) * smoothstep(1.6 + h1, 0., r) * (.5 + .5 * sin(uTime * (1. + h2 * 2.) + h1 * 20.));
    float light = beam * .12 + mote * beam * 1.3;
    vec3 warm = vec3(1., .9, .78);
    outc = outc * (1. - light) + warm * light;
    outa = outa * (1. - light) + light;
    gl_FragColor = vec4(outc, clamp(outa, 0., 1.));
  } else {
    float v = 1. - .55 * pow(abs(x - .5) * 2., 2.5);
    col *= v;
    gl_FragColor = vec4(col, 1.);
  }
}`;

  function create(canvas, opts) {
    let gl;
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(type, src) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    for (const n of ['uRes', 'uTime', 'uOpen', 'uVel', 'uN', 'uMode', 'uDpr', 'uLight', 'uBase', 'uSheen']) U[n] = gl.getUniformLocation(prog, n);
    gl.uniform1f(U.uMode, opts.mode || 0);
    gl.uniform3fv(U.uBase, opts.base);
    gl.uniform3fv(U.uSheen, opts.sheen);

    let dpr = 1, w = 0, h = 0;
    function resize() {
      dpr = Math.min(opts.maxDpr || 1.5, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    }
    resize();
    return {
      resize,
      setColors(base, sheen) { gl.uniform3fv(U.uBase, base); gl.uniform3fv(U.uSheen, sheen); },
      draw(st) {
        gl.uniform2f(U.uRes, w, h);
        gl.uniform1f(U.uDpr, dpr);
        gl.uniform1f(U.uTime, st.time || 0);
        gl.uniform1f(U.uOpen, st.open || 0);
        gl.uniform1f(U.uVel, st.vel || 0);
        gl.uniform1f(U.uLight, st.light == null ? .2 : st.light);
        /* складка примерно каждые 30 css-пикселей полотна, но в разумных пределах */
        const panel = (opts.mode ? 1 : .5) * w / dpr;
        gl.uniform1f(U.uN, Math.min(opts.mode ? 11 : 8, Math.max(opts.mode ? 5 : 4, panel / (opts.mode ? 52 : 44))));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      destroy() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
    };
  }
  return { create };
})();
