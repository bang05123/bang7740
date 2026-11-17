// ================= 화면 왜곡 (속도감 후처리) =================
const POST = { on: true, blur: 0, warp: 0, ca: 0 };
POST.rt = new THREE.WebGLRenderTarget(4, 4, { samples: isTouch ? 2 : 4 }); // 멀티샘플이어야 깊이 정밀도가 24비트 (폰에서 땅이 도로를 덮는 문제 방지)
POST.scene = new THREE.Scene(); POST.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
POST.mat = new THREE.ShaderMaterial({
  uniforms: { lite: { value: 0 }, tAO: { value: null }, aoK: { value: 0 }, tD: { value: POST.rt.texture }, tB: { value: null }, bloom: { value: 0 }, vig: { value: 0 }, blur: { value: 0 }, warp: { value: 0 }, ca: { value: 0 }, ctr: { value: new THREE.Vector2(0.5, 0.47) }, aspect: { value: 1 }, px: { value: new THREE.Vector2(1 / 1280, 1 / 720) }, hatch: { value: 1 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: `uniform sampler2D tD, tB, tAO; uniform float bloom, vig, lite, aoK; uniform float blur, warp, ca, aspect; uniform vec2 ctr, px; uniform float hatch; varying vec2 vUv;
    float lum(vec2 p){ vec3 c = texture2D(tD, p).rgb; return dot(c, vec3(0.299, 0.587, 0.114)); }
    float lumS(vec2 p){ return (lum(p + px * vec2(0.5, 0.5)) + lum(p + px * vec2(-0.5, 0.5)) + lum(p + px * vec2(0.5, -0.5)) + lum(p + px * vec2(-0.5, -0.5))) * 0.25; } // 2x2 평균 (잔무늬 무시)
    void main(){
      vec2 d = vUv - ctr; vec2 da = d; da.x *= aspect; float r2 = dot(da, da);
      vec2 uv = ctr + d * (1.0 - warp * r2);          // 가장자리를 바깥으로 끌어당기는 배럴 왜곡
      vec2 dir = uv - ctr; float edge = smoothstep(0.04, 0.45, length(da));
      vec2 caOff = dir * ca * 0.02 * edge;             // 가장자리 색 번짐
      vec3 col = vec3(0.0); float tot = 0.0;
      if (lite > 0.5 || blur < 0.002) { col = vec3(texture2D(tD, uv + caOff).r, texture2D(tD, uv).g, texture2D(tD, uv - caOff).b); tot = 1.0; } // 가벼운 경로: 방사형 흐림 생략
      else for (int i = 0; i < 7; i++) { float t = float(i) / 6.0, w = 1.0 - t * 0.55; vec2 o = dir * blur * t * edge;   // 중심으로 빨려드는 방사형 흐림
        col.r += texture2D(tD, uv - o + caOff).r * w; col.g += texture2D(tD, uv - o).g * w; col.b += texture2D(tD, uv - o - caOff).b * w; tot += w; }
      col /= tot;
      // 잉크 윤곽선: 밝기가 확 바뀌는 경계를 검게
      float gx, gy; if (lite > 0.5) { gx = lum(uv + vec2(px.x * 1.5, 0.0)) - lum(uv - vec2(px.x * 1.5, 0.0)); gy = lum(uv + vec2(0.0, px.y * 1.5)) - lum(uv - vec2(0.0, px.y * 1.5)); }
      else { gx = lumS(uv + vec2(px.x * 1.5, 0.0)) - lumS(uv - vec2(px.x * 1.5, 0.0)); gy = lumS(uv + vec2(0.0, px.y * 1.5)) - lumS(uv - vec2(0.0, px.y * 1.5)); }
      float ink = smoothstep(0.3, 0.6, length(vec2(gx, gy)));
      col *= 1.0 - ink * 0.4;
      // 빗금: 어두운 면에 사선, 더 어두우면 교차 빗금
      float L = dot(col, vec3(0.299, 0.587, 0.114)), sc = 5.0 * max(1.0, 1.0 / (px.y * 720.0));
      float h1 = step(0.55, fract((gl_FragCoord.x + gl_FragCoord.y) / sc)), h2 = step(0.55, fract((gl_FragCoord.x - gl_FragCoord.y) / sc));
      float dark = smoothstep(0.30, 0.12, L), vdark = smoothstep(0.14, 0.05, L);
      // (빗금은 움직일 때 화면에 줄처럼 남아 보여서 뺌)
      if (aoK > 0.0) col *= mix(1.0, texture2D(tAO, uv).r, aoK); // 구석 그늘
      if (bloom > 0.0) { vec3 b = texture2D(tB, uv).rgb; col += b * bloom; col = col / (1.0 + max(vec3(0.0), col - 1.0) * 0.6); } // 빛 번짐: 밝은 곳 주변이 은은하게 빛남
      col *= 1.0 - vig * smoothstep(0.25, 0.85, length(da)); // 부스트 때 가장자리 어둡게
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthTest: false, depthWrite: false
});
// 블룸: 화면을 1/4 크기로 줄여 아주 밝은 곳만 골라 흐리게 번지게 한 뒤 위에 더함
const BLOOM = { a: new THREE.WebGLRenderTarget(4, 4), b: new THREE.WebGLRenderTarget(4, 4), scene: new THREE.Scene(), px: new THREE.Vector2() };
BLOOM.bright = new THREE.ShaderMaterial({ uniforms: { tD: { value: POST.rt.texture }, th: { value: 0.93 } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: "uniform sampler2D tD; uniform float th; varying vec2 vUv; void main(){ vec3 c = texture2D(tD, vUv).rgb; float m = max(c.r, max(c.g, c.b)); float k = smoothstep(th, 1.0, m); float sat = m - min(c.r, min(c.g, c.b)); gl_FragColor = vec4(c * k * (0.08 + sat * 1.6), 1.0); }", depthTest: false, depthWrite: false }); // 채도 높은 빛(불꽃·네온·부스트)일수록 많이 번짐
BLOOM.blur = new THREE.ShaderMaterial({ uniforms: { tD: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: "uniform sampler2D tD; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 c = texture2D(tD, vUv).rgb * 0.227; c += (texture2D(tD, vUv + dir * 1.385).rgb + texture2D(tD, vUv - dir * 1.385).rgb) * 0.316; c += (texture2D(tD, vUv + dir * 3.231).rgb + texture2D(tD, vUv - dir * 3.231).rgb) * 0.070; gl_FragColor = vec4(c, 1.0); }", depthTest: false, depthWrite: false });
BLOOM.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), BLOOM.bright); BLOOM.scene.add(BLOOM.quad); POST.mat.uniforms.tB.value = BLOOM.a.texture;
function bloomResize(w, h) { const bw = Math.max(4, Math.floor(w / 4)), bh = Math.max(4, Math.floor(h / 4)); BLOOM.a.setSize(bw, bh); BLOOM.b.setSize(bw, bh); BLOOM.px.set(1 / bw, 1 / bh); }
function bloomRender() {
  BLOOM.quad.material = BLOOM.bright; renderer.setRenderTarget(BLOOM.a); renderer.render(BLOOM.scene, POST.cam);
  BLOOM.quad.material = BLOOM.blur; for (const r of [1, 2.2]) { // 가로·세로 두 번씩 (두 번째는 더 넓게)
    BLOOM.blur.uniforms.tD.value = BLOOM.a.texture; BLOOM.blur.uniforms.dir.value.set(BLOOM.px.x * r, 0); renderer.setRenderTarget(BLOOM.b); renderer.render(BLOOM.scene, POST.cam);
    BLOOM.blur.uniforms.tD.value = BLOOM.b.texture; BLOOM.blur.uniforms.dir.value.set(0, BLOOM.px.y * r); renderer.setRenderTarget(BLOOM.a); renderer.render(BLOOM.scene, POST.cam); }
}
POST.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), POST.mat));
// 구석 그늘(SSAO): 반 해상도로 깊이만 한 번 더 그려서, 주변이 앞을 막고 있으면 어둡게
const AO = { depth: new THREE.WebGLRenderTarget(4, 4), a: new THREE.WebGLRenderTarget(4, 4), b: new THREE.WebGLRenderTarget(4, 4), px: new THREE.Vector2(), scene: new THREE.Scene(), t: 0 };
AO.depthMat = new THREE.ShaderMaterial({ uniforms: { far: { value: 9000 } }, side: THREE.DoubleSide,
  vertexShader: `#include <common>
    #include <logdepthbuf_pars_vertex>
    varying float vZ;
    void main(){
      #include <begin_vertex>
      #include <project_vertex>
      #include <logdepthbuf_vertex>
      vZ = -mvPosition.z; }`,
  fragmentShader: `#include <packing>
    #include <logdepthbuf_pars_fragment>
    uniform float far; varying float vZ;
    void main(){
      #include <logdepthbuf_fragment>
      gl_FragColor = packDepthToRGBA(clamp(vZ / far, 0.0, 0.9999)); }` });
AO.mat = new THREE.ShaderMaterial({ uniforms: { tDep: { value: AO.depth.texture }, far: { value: 9000 }, tanF: { value: new THREE.Vector2(1, 1) }, px: { value: new THREE.Vector2() } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: `#include <packing>
    uniform sampler2D tDep; uniform float far; uniform vec2 tanF, px; varying vec2 vUv;
    vec3 vpos(vec2 uv){ float z = unpackRGBAToDepth(texture2D(tDep, uv)) * far; return vec3((uv * 2.0 - 1.0) * tanF * z, -z); }
    void main(){
      vec3 P = vpos(vUv); float z = -P.z; if (z > far * 0.6) { gl_FragColor = vec4(1.0); return; }
      vec3 N = normalize(cross(vpos(vUv + vec2(px.x, 0.0)) - P, vpos(vUv + vec2(0.0, px.y)) - P));
      float R = 2.3, occ = 0.0; float rpx = clamp(R / (z * tanF.y) * 0.5, 2.0 * px.y, 0.08);
      for (int i = 0; i < 10; i++) { float fi = float(i), a = fi * 2.399 + fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5) * 6.283, r = sqrt((fi + 0.5) / 10.0);
        vec2 o = vec2(cos(a), sin(a)) * r * rpx * vec2(px.x / px.y, 1.0); vec3 S = vpos(vUv + o), d = S - P; float dl = length(d);
        occ += max(0.0, dot(N, d) / (dl + 0.0001) - 0.15) * smoothstep(R * 2.5, R * 0.6, dl); }
      float ao = clamp(1.0 - occ / 10.0 * 3.4, 0.0, 1.0); gl_FragColor = vec4(vec3(ao * ao), 1.0); }`, depthTest: false, depthWrite: false });
AO.blur = new THREE.ShaderMaterial({ uniforms: { tD: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: "uniform sampler2D tD; uniform vec2 dir; varying vec2 vUv; void main(){ float c = texture2D(tD, vUv).r * 0.36; c += (texture2D(tD, vUv + dir).r + texture2D(tD, vUv - dir).r) * 0.24; c += (texture2D(tD, vUv + dir * 2.0).r + texture2D(tD, vUv - dir * 2.0).r) * 0.08; gl_FragColor = vec4(vec3(c), 1.0); }", depthTest: false, depthWrite: false });
AO.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), AO.mat); AO.scene.add(AO.quad); POST.mat.uniforms.tAO.value = AO.a.texture;
camera.layers.enable(1); // 1번 층: 투명한 것(파티클·구름·그림자 판 등) → 깊이 패스에서 뺌
function aoTagTransparent() { scene.traverse(o => { if (o.isSprite || o.isPoints || o.isLine || (o.material && (o.material.transparent || o.material.blending === THREE.AdditiveBlending))) { if (!o.layers.isEnabled(1) || o.layers.isEnabled(0)) { o.layers.set(1); } } }); }
function aoResize(w, h) { const aw = Math.max(4, Math.floor(w / 2)), ah = Math.max(4, Math.floor(h / 2)); AO.depth.setSize(aw, ah); AO.a.setSize(aw, ah); AO.b.setSize(aw, ah); AO.px.set(1 / aw, 1 / ah); }
const _aoCol = new THREE.Color();
function aoRender() {
  if ((AO.t++ % 15) === 0) aoTagTransparent();
  const oldBg = scene.background, oldFog = scene.fog, oldMask = camera.layers.mask; renderer.getClearColor(_aoCol); const oldA = renderer.getClearAlpha();
  scene.overrideMaterial = AO.depthMat; AO.depthMat.uniforms.far.value = camera.far; scene.fog = null; camera.layers.set(0); renderer.setClearColor(0xffffff, 1);
  const sm = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(AO.depth); renderer.clear(); renderer.render(scene, camera);
  renderer.shadowMap.autoUpdate = sm; scene.overrideMaterial = null; scene.fog = oldFog; camera.layers.mask = oldMask; renderer.setClearColor(_aoCol, oldA);
  const tY = Math.tan(camera.fov * Math.PI / 360); AO.mat.uniforms.tanF.value.set(tY * camera.aspect, tY); AO.mat.uniforms.far.value = camera.far; AO.mat.uniforms.px.value.copy(AO.px);
  AO.quad.material = AO.mat; renderer.setRenderTarget(AO.a); renderer.render(AO.scene, POST.cam);
  AO.quad.material = AO.blur; AO.blur.uniforms.tD.value = AO.a.texture; AO.blur.uniforms.dir.value.set(AO.px.x * 1.5, 0); renderer.setRenderTarget(AO.b); renderer.render(AO.scene, POST.cam);
  AO.blur.uniforms.tD.value = AO.b.texture; AO.blur.uniforms.dir.value.set(0, AO.px.y * 1.5); renderer.setRenderTarget(AO.a); renderer.render(AO.scene, POST.cam);
}
POST.rt2 = new THREE.WebGLRenderTarget(4, 4); POST.fxScene = new THREE.Scene();
POST.fxaa = new THREE.ShaderMaterial({ uniforms: { tD: { value: POST.rt2.texture }, px: { value: new THREE.Vector2(1 / 1280, 1 / 720) } }, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
  fragmentShader: `uniform sampler2D tD; uniform vec2 px; varying vec2 vUv;
    float L(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main(){ // FXAA (가장자리 방향을 찾아 그 방향으로 살짝 섞음)
      vec3 cM = texture2D(tD, vUv).rgb, cNW = texture2D(tD, vUv + vec2(-1.0, -1.0) * px).rgb, cNE = texture2D(tD, vUv + vec2(1.0, -1.0) * px).rgb, cSW = texture2D(tD, vUv + vec2(-1.0, 1.0) * px).rgb, cSE = texture2D(tD, vUv + vec2(1.0, 1.0) * px).rgb;
      float lM = L(cM), lNW = L(cNW), lNE = L(cNE), lSW = L(cSW), lSE = L(cSE), lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(0.04, lMax * 0.12)) { gl_FragColor = vec4(cM, 1.0); return; }
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
      float red = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125), rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
      dir = clamp(dir * rcp, -8.0, 8.0) * px;
      vec3 a = 0.5 * (texture2D(tD, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tD, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
      vec3 b = a * 0.5 + 0.25 * (texture2D(tD, vUv - dir * 0.5).rgb + texture2D(tD, vUv + dir * 0.5).rgb);
      float lB = L(b); gl_FragColor = vec4((lB < lMin || lB > lMax) ? a : b, 1.0); }`, depthTest: false, depthWrite: false });
POST.fxScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), POST.fxaa)); POST.mat.uniforms.hatch.value = courseId === "circuit" ? 0.15 : 1;
function postResize() { const v = new THREE.Vector2(); renderer.getDrawingBufferSize(v); POST.rt.setSize(Math.max(4, v.x), Math.max(4, v.y)); POST.rt2.setSize(Math.max(4, v.x), Math.max(4, v.y)); aoResize(v.x, v.y); POST.fxaa.uniforms.px.value.set(1 / Math.max(1, v.x), 1 / Math.max(1, v.y)); bloomResize(v.x, v.y); POST.mat.uniforms.aspect.value = v.x / Math.max(1, v.y); POST.mat.uniforms.px.value.set(1 / Math.max(1, v.x), 1 / Math.max(1, v.y)); }
postResize(); addEventListener("resize", postResize); try { new ResizeObserver(postResize).observe(document.documentElement); } catch (e) {}
const _shR = new THREE.Vector3(), _shU = new THREE.Vector3(), _shP = new THREE.Vector3();
// 부스트 화면 늘림: 고무줄 같은 스프링 (켜는 순간 확 늘어났다 살짝 튕기며 자리 잡고, 끌 때는 툭 줄어듦)
const STRETCH = { x: 0, v: 0, was: false, sc: 1 };
function stretchTick(dt) {
  const on = state === "race" && player.boostT > 0 && !player.dead && !SPEC.on && !REPLAY.on; STRETCH.sc = Math.max(0.3, SET.shake);
  if (on && !STRETCH.was) STRETCH.v += 9; if (!on && STRETCH.was) STRETCH.v -= 4.5; STRETCH.was = on;
  const target = on ? 0.15 : 0, h = Math.min(dt, 1 / 30); STRETCH.v += ((target - STRETCH.x) * 70 - STRETCH.v * 9) * h; STRETCH.x += STRETCH.v * h; STRETCH.x = clamp(STRETCH.x, -0.45, 1.3);
}
const DYN = { t: 0, n: 0, sum: 0, pr: 0 };
function dynRes(realDt) {
  if (!isTouch || state !== "race") return; DYN.sum += realDt; DYN.n++; DYN.t += realDt; if (DYN.t < 2) return;
  const avg = DYN.sum / DYN.n * 1000, base = SET.gfx === "low" ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 1.5); DYN.t = 0; DYN.n = 0; DYN.sum = 0;
  if (!DYN.pr) DYN.pr = renderer.getPixelRatio();
  let pr = DYN.pr; const floor = Math.max(0.7, base * 0.75); if (avg > 30) pr = Math.max(floor, pr - 0.05); else if (avg < 22) pr = Math.min(base, pr + 0.1); // 너무 흐려지지 않게 최소 75%까지만 낮춤
  if (Math.abs(pr - DYN.pr) > 0.001) { DYN.pr = pr; renderer.setPixelRatio(pr); resize(); postResize(); }
}
function renderMain(dt) {
  if ((renderMain.n = (renderMain.n || 0) + 1) % 6 === 0) distCull();
  if (renderMain.n % 3 === 0) carLod();
  if (FEST.time) FEST.time.value += dt; for (const h of FEST.turbines) h.rotation.z += dt * 0.9; for (const f of FEST.anims) f(dt);
  sky.position.copy(camera.position); ground.position.x = camera.position.x; ground.position.z = camera.position.z;
  const sr = clamp(Math.abs(player.vf) / P.top, 0, 1.6), boost = player.boostT > 0 ? 1 : 0, active = (state === "race" || state === "end") && !SPEC.on && !REPLAY.on && !DEMO.on; /* 관전·리플레이·데모에선 내 차 속도로 화면이 흐려지지 않게 */
  const tBlur = active ? (Math.max(0, sr - 0.45) * 0.07 + boost * 0.06) * SET.blur + (slowT > 0 ? 0.03 : 0) : 0; // 설정의 '속도 흐림'으로 조절 (기본 약하게)
  const tWarp = active ? Math.max(0, sr - 0.3) * 0.13 + boost * 0.13 : 0;
  const tCa = active ? Math.max(0, sr - 0.6) * 0.4 + boost * 0.6 + Math.min(1, shake) * 0.3 : 0;
  const k = 1 - Math.exp(-5 * dt); POST.blur += (tBlur - POST.blur) * k; POST.warp += (tWarp - POST.warp) * k; POST.ca += (tCa - POST.ca) * k;
  stretchTick(dt); const stx = STRETCH.x * STRETCH.sc;
  const u = POST.mat.uniforms; u.blur.value = POST.blur + Math.max(0, stx) * 0.04 * SET.blur; u.warp.value = POST.warp + stx * 0.42; u.ca.value = POST.ca + Math.abs(stx) * 0.5; // 가장자리만 늘어나고 가운데는 선명 (줄어들 땐 반대로 오므라듦)
  const bloomOn = SET.gfx !== "low"; u.lite.value = SET.gfx === "low" ? 1 : 0; u.aoK.value = SET.gfx === "low" ? 0 : 0.8; u.bloom.value = bloomOn ? (courseId === "circuit" ? 1.2 : 0.38) + boost * 0.25 : 0; BLOOM.bright.uniforms.th.value = courseId === "circuit" ? 0.93 : 0.965; // 낮 코스는 하늘·모래가 뿌옇게 번지지 않게 약하게 // 밤 서킷은 더 세게, 폰(그래픽 낮음)은 끔
  POST.vig = (POST.vig || 0) + ((active ? boost * 0.45 + Math.max(0, sr - 0.7) * 0.25 : 0) - (POST.vig || 0)) * k; u.vig.value = POST.vig;
  { const f = SUN_DIR, r = _shR.set(0, 1, 0).cross(f); if (r.lengthSq() < 1e-6) r.set(1, 0, 0); r.normalize(); const up = _shU.copy(f).cross(r), tex = 90 / sun.shadow.mapSize.x, P0 = _shP.set(player.x, player.y, player.z); // 그림자 픽셀 격자에 맞춰 스냅
    const a = Math.round(P0.dot(r) / tex) * tex, b = Math.round(P0.dot(up) / tex) * tex, c = P0.dot(f); P0.copy(r).multiplyScalar(a).addScaledVector(up, b).addScaledVector(f, c);
    sun.target.position.copy(P0); sun.position.copy(P0).addScaledVector(f, 120); } // 그림자 범위가 플레이어를 따라감
  if (POST.on) {
    if (POST.mat.uniforms.aoK.value > 0) aoRender();
    renderer.setRenderTarget(POST.rt); renderer.render(scene, camera); if (POST.mat.uniforms.bloom.value > 0) bloomRender(); if (SET.gfx === "low") { renderer.setRenderTarget(null); renderer.render(POST.scene, POST.cam); } else { renderer.setRenderTarget(POST.rt2); renderer.render(POST.scene, POST.cam); renderer.setRenderTarget(null); renderer.render(POST.fxScene, POST.cam); } // 폰은 FXAA 생략 (MSAA로 충분)
  } else renderer.render(scene, camera);
}

// ================= 백미러 =================
const mirrorEl = document.getElementById("mirror");
const mirrorCam = new THREE.PerspectiveCamera(42, 3.4, 0.5, 9000); mirrorCam.layers.enableAll();
const mirrorRT = new THREE.WebGLRenderTarget(512, 150);
mirrorRT.texture.wrapS = THREE.RepeatWrapping; mirrorRT.texture.repeat.set(-1, 1); mirrorRT.texture.offset.set(1, 0); // 좌우 반전 (거울처럼)
const mirrorScene = new THREE.Scene(), mirrorOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
mirrorScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: mirrorRT.texture, depthTest: false })));
let mirrorTick = 0;
