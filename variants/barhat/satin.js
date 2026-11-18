'use strict';
/* Занавес заставки на WebGL из двух фотографий полотен (cover-left/right.webp).
   Пока закрыт, левое полотно чуть заходит на правое и бросает на него тень.
   uOpen 0..1 разводит полотна к краям: та же ткань сжимается в узкую полосу, складки густеют,
   низ отстаёт от верха. От нажатия по ткани бежит рябь. Вне ткани холст прозрачный.
   Без WebGL create() возвращает null, страница показывает те же полотна в CSS. */
window.Satin = (function () {
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uNow, uOpen, uDpr;
uniform vec4 uRip[4];
uniform sampler2D uL, uR;
uniform vec2 uFitL, uFitR;    /* x: ширина ткани в долях экрана при закрытом занавесе, y: масштаб по высоте */

float ripples(vec2 p){
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 r = uRip[i];
    float age = uNow - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 4.5) continue;
    vec2 d = p - r.xy * vec2(uRes.x / uRes.y, 1.0);
    float x = length(d) - age * 0.55;
    h += r.w * sin(x * 30.0) * exp(-x * x * 55.0) * exp(-age * 0.9);
  }
  return h;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float x = uv.x, y = 1.0 - uv.y;            /* y = 0 сверху */
  float aspect = uRes.x / uRes.y;
  float o = uOpen;
  float px = 1.0 / uRes.x;

  /* края полотен: закрытые чуть заходят друг на друга, при открытии уходят за экран */
  float g = o * 0.6;
  float lag = 0.1 * sin(3.14159 * o) * y;
  float sway = 0.003 * sin(y * 3.0 + uTime * 0.7) * (1.0 - o);
  float edgeL = 0.512 - g + lag + sway;
  float edgeR = 0.488 + g - lag + sway;

  /* рябь: смещает выборку и подсвечивает гребни */
  vec2 p = vec2(x * aspect, y);
  float e = 0.004;
  float r0 = ripples(p);
  float rx = ripples(p + vec2(e, 0.0)) - r0;
  float ry = ripples(p + vec2(0.0, e)) - r0;
  vec2 disp = vec2(rx, ry) / e * 0.0025;

  vec4 col = vec4(0.0);
  /* правое полотно (под левым) */
  if (x > edgeR - px) {
    float u = (x - edgeR) / max(1.0 - edgeR, 0.001);          /* 0 у шва, 1 у края экрана */
    float tx = clamp(u * uFitR.x + disp.x, 0.0, 1.0);
    float ty = clamp(y / uFitR.y + disp.y, 0.0, 1.0);
    vec3 c = texture2D(uR, vec2(tx, ty)).rgb;
    float squeeze = 1.0 - (1.0 - edgeR) / 0.512;               /* насколько сжато полотно */
    c *= 1.0 - 0.16 * squeeze * (0.5 + 0.5 * sin(u * 60.0));   /* густые складки при сборке */
    c *= 1.0 + r0 * 0.5;
    /* тень от левого полотна, пока они перекрываются */
    float dl = (x - edgeL) * uRes.x / uDpr;
    c *= 1.0 - 0.42 * exp(-max(dl, 0.0) / 9.0) * step(0.0, dl);
    float a = clamp((x - edgeR) / px + 0.5, 0.0, 1.0);
    col = vec4(c * a, a);
  }
  /* левое полотно сверху */
  if (x < edgeL + px) {
    float u = x / max(edgeL, 0.001);                            /* 0 у края экрана, 1 у шва */
    float tx = clamp(1.0 - (1.0 - u) * uFitL.x + disp.x, 0.0, 1.0);
    float ty = clamp(y / uFitL.y + disp.y, 0.0, 1.0);
    vec3 c = texture2D(uL, vec2(tx, ty)).rgb;
    float squeeze = 1.0 - edgeL / 0.512;
    c *= 1.0 - 0.16 * squeeze * (0.5 + 0.5 * sin(u * 60.0));
    c *= 1.0 + r0 * 0.5;
    float a = clamp((edgeL - x) / px + 0.5, 0.0, 1.0);
    col = vec4(c * a, a) + col * (1.0 - a);
  }
  /* мягкая тень от полотен на сцене, пока они расходятся */
  float dist = min(abs(x - edgeL), abs(x - edgeR)) * aspect;
  float out_ = step(edgeL, x) * step(x, edgeR);
  float sh = 0.24 * exp(-dist * 14.0) * out_ * smoothstep(0.0, 0.08, o) * (1.0 - smoothstep(0.85, 1.0, o));
  col.a = col.a + sh * (1.0 - col.a);
  /* тёплый верхний свет и лёгкая виньетка */
  col.rgb *= 0.9 + 0.12 * (1.0 - y) - 0.08 * length(uv - vec2(0.5, 0.5));
  gl_FragColor = col;
}`;

  function load(src) {
    return new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }

  function create(canvas, opts) {
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
    for (const n of ['uRes', 'uTime', 'uNow', 'uOpen', 'uDpr', 'uRip', 'uL', 'uR', 'uFitL', 'uFitR']) U[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(U.uL, 0); gl.uniform1i(U.uR, 1);

    const tex = [null, null];
    const size = [[1, 1], [1, 1]];
    let ready = false;
    const whenReady = Promise.all([load(opts.left), load(opts.right)]).then((ims) => {
      ims.forEach((im, i) => {
        const t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
        tex[i] = t; size[i] = [im.naturalWidth, im.naturalHeight];
      });
      ready = true;
    });

    const rip = new Float32Array(16);
    let ripIdx = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    }
    /* как background-size: cover для половины экрана, прижато к шву и к верху */
    function fit(i, panel) {
      const [tw, th] = size[i];
      const W = canvas.width, H = canvas.height;
      const s = Math.max(1, (panel * W) / (tw * H / th));  /* во сколько раз увеличить, чтобы ткань закрыла половину */
      const fabricW = (tw * H / th) * s / W;               /* ширина ткани в долях экрана */
      return [Math.min(1, panel / fabricW), s];
    }
    resize();
    return {
      whenReady,
      resize,
      ripple(clientX, clientY, strength) {
        const r = canvas.getBoundingClientRect();
        rip[ripIdx * 4] = (clientX - r.left) / r.width;
        rip[ripIdx * 4 + 1] = (clientY - r.top) / r.height;
        rip[ripIdx * 4 + 2] = performance.now() / 1000;
        rip[ripIdx * 4 + 3] = strength;
        ripIdx = (ripIdx + 1) % 4;
      },
      draw(st) {
        if (!ready) return false;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[0]);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[1]);
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uDpr, dpr);
        gl.uniform1f(U.uTime, (st.time || 0) % 1000);
        gl.uniform1f(U.uNow, performance.now() / 1000);
        gl.uniform1f(U.uOpen, st.open || 0);
        gl.uniform2fv(U.uFitL, fit(0, .512));
        gl.uniform2fv(U.uFitR, fit(1, .512));
        gl.uniform4fv(U.uRip, rip);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return true;
      },
      destroy() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
    };
  }
  return { create };
})();
