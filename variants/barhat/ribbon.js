'use strict';
/* Атласная лента под «местом и временем»: широкая полоса шёлка с волнистыми краями,
   подвёрнутой каймой и мягкими диагональными складками. uReveal 0..1 разворачивает её слева направо,
   uTime тихо колышет складки. Вне ленты холст прозрачный, под нижним краем лёгкая тень. */
window.Ribbon = (function () {
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uReveal, uDpr;
uniform vec3 uDeep, uBase, uHi;

float hash(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
/* складки атласа: длинные диагонали, изогнутые волной вдоль себя */
float silkH(vec2 p, float t){
  float n = noise(p * 0.55 + vec2(t * 0.04, -t * 0.03));
  float a = dot(p, vec2(0.92, 0.38));
  float b = dot(p, vec2(-0.38, 0.92));
  float h = sin(a * 2.6 + 2.1 * sin(b * 1.4 + t * 0.22 + n * 2.0) + t * 0.12);
  h += 0.38 * sin(a * 5.3 - 1.5 * sin(b * 1.9 - t * 0.18) + 1.7 + n * 3.0);
  return h;
}
/* края ленты: сверху волна, правый край уходит вверх, снизу встречная волна */
float topEdge(float x, float t){ return 0.2 + 0.055 * sin(x * 3.3 + 0.5 + t * 0.15) + 0.018 * sin(x * 8.0 - t * 0.3) - 0.11 * smoothstep(0.5, 1.05, x); }
float botEdge(float x, float t){ return 0.8 + 0.05 * sin(x * 2.8 + 2.3 - t * 0.12) + 0.016 * sin(x * 7.0 + t * 0.25 + 1.0) - 0.04 * smoothstep(0.65, 1.05, x); }

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / uRes;
  float x = uv.x, y = 1.0 - uv.y;
  float t = uTime;
  float aspect = uRes.x / uRes.y;
  float yt = topEdge(x, t), yb = botEdge(x, t);
  float dTop = (y - yt) * uRes.y / uDpr;            /* css-пиксели от верхнего края внутрь */
  float dBot = (yb - y) * uRes.y / uDpr;
  float inside = clamp(min(dTop, dBot) / 1.1 + 0.5, 0.0, 1.0);

  /* разворот слева направо с мягким волнистым фронтом */
  float front = uReveal * 1.2 - 0.1 + 0.025 * sin(y * 9.0 + t);
  float rm = 1.0 - smoothstep(front - 0.06, front + 0.02, x);

  vec2 p = vec2(x * aspect, y) * 2.0;
  float e = 0.012;
  float h = silkH(p, t), hx = silkH(p + vec2(e, 0.0), t), hy = silkH(p + vec2(0.0, e), t);
  /* у фронта разворота ткань ещё свёрнута: сильнее изгиб */
  float curl = exp(-pow((x - front) * 14.0, 2.0)) * (1.0 - smoothstep(0.98, 1.0, uReveal));
  vec3 n = normalize(vec3(-(hx - h) / e * 0.3 - curl * 1.4, -(hy - h) / e * 0.3, 1.0));
  vec3 L = normalize(vec3(-0.5, 0.62, 0.72));
  float dif = clamp(dot(n, L), 0.0, 1.0);
  float nh = clamp(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0, 1.0);

  vec3 deep = uDeep, base = uBase, hi = uHi;
  vec3 col = mix(deep, base, smoothstep(0.2, 0.95, dif));
  col = mix(col, hi, pow(nh, 5.0) * 0.4);
  col += hi * pow(nh, 60.0) * 0.04;
  /* подвёрнутая кайма: светлая полоска у края и тень от неё чуть глубже */
  float rimT = exp(-pow((dTop - 5.0) / 3.6, 2.0)), rimB = exp(-pow((dBot - 5.0) / 3.6, 2.0));
  float shT = exp(-pow((dTop - 13.0) / 7.0, 2.0)), shB = exp(-pow((dBot - 13.0) / 7.0, 2.0));
  col = mix(col, hi, (rimT + rimB) * 0.6);
  col *= 1.0 - (shT + shB) * 0.09;
  col *= 0.95 + 0.07 * (1.0 - y);
  col += (hash(fc) - 0.5) / 255.0 * 2.0;

  float a = inside * rm;
  /* тень на странице под нижним краем */
  float below = max(-dBot, 0.0);
  float sh = 0.12 * exp(-below / 7.0) * step(0.0, -dBot) * rm;
  gl_FragColor = vec4(col * a, a + sh * (1.0 - a));
}`;

  const PALETTES = {
    grey: [[.68, .65, .615], [.865, .84, .805], [.99, .98, .965]],
    coral: [[.56, .19, .11], [.8, .35, .24], [1, .76, .64]],
  };
  function create(canvas, palette) {
    let gl;
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(type, src) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    const vs = sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}');
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    for (const n of ['uRes', 'uTime', 'uReveal', 'uDpr', 'uDeep', 'uBase', 'uHi']) U[n] = gl.getUniformLocation(prog, n);
    const pal = PALETTES[palette] || PALETTES.grey;
    gl.uniform3fv(U.uDeep, pal[0]); gl.uniform3fv(U.uBase, pal[1]); gl.uniform3fv(U.uHi, pal[2]);
    let dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    }
    resize();
    return {
      resize,
      draw(st) {
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uDpr, dpr);
        gl.uniform1f(U.uTime, (st.time || 0) % 1000);
        gl.uniform1f(U.uReveal, st.reveal || 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  }
  return { create };
})();
