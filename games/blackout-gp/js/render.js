// ================= 렌더러와 장면 =================
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true }); // 멀리서 면이 겹쳐 깜빡이는 것 방지
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xeccb98, 350, 2700);
const camera = new THREE.PerspectiveCamera(68, 1, 0.3, 9000);
const skyGeo = new THREE.SphereGeometry(7000, 24, 12);
skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); scene.add(sky);
function makeCloudTex(type, seed) { // 테두리 없이 2단 명암: 햇빛 받은 흰 윗면 + 푸르스름한 그늘 아랫면
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d"); let sd = seed; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const path = new Path2D(), add = (x, y, rx, ry) => path.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  let base = 200;
  if (type === "cumulus") { // 위로 솟은 뭉게구름: 바닥은 평평, 가운데가 높게
    const n = 10 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) { const u = i / (n - 1), x = 60 + u * 390 + (r() - 0.5) * 30, hump = Math.sin(u * Math.PI), rr = 22 + hump * (45 + r() * 35) + r() * 12; add(x, base - rr * (0.4 + r() * 0.5) - hump * 25, rr * (1 + r() * 0.3), rr); }
    for (let i = 0; i < 6; i++) { const x = 120 + r() * 270, rr = 28 + r() * 30; add(x, base - 70 - r() * 60, rr, rr * 0.9); }
    path.rect(70, base - 25, 370, 25);
  } else if (type === "stratus") { // 옆으로 길게 깔린 구름
    base = 170; const n = 18; for (let i = 0; i < n; i++) { const x = 20 + i / (n - 1) * 470 + (r() - 0.5) * 20, rr = 10 + r() * 18 + Math.sin(i / (n - 1) * Math.PI) * 10; add(x, base - rr * 0.6, rr * (2 + r()), rr); }
  } else { // 얇게 흩어진 새털구름
    for (let i = 0; i < 7; i++) { const x = 60 + r() * 380, y = 80 + r() * 100; add(x, y, 50 + r() * 90, 5 + r() * 7); }
  }
  g.fillStyle = "#ffffff"; g.globalAlpha = type === "wisp" ? 0.75 : 1; g.fill(path);
  g.save(); g.clip(path); // 아래쪽 그늘: 물결진 경계로 딱 끊김
  g.fillStyle = type === "wisp" ? "#d8e2f0" : "#b8c6dc"; g.beginPath(); const cut = type === "cumulus" ? base - 48 : type === "stratus" ? base - 8 : 999;
  g.moveTo(0, 256); for (let x = 0; x <= 512; x += 16) g.lineTo(x, cut + Math.sin(x * 0.045 + seed) * 7 + Math.sin(x * 0.11) * 4); g.lineTo(512, 256); g.closePath(); g.fill();
  if (type === "cumulus") { g.fillStyle = "#9fb0ca"; g.beginPath(); g.moveTo(0, 256); for (let x = 0; x <= 512; x += 16) g.lineTo(x, base - 14 + Math.sin(x * 0.07 + seed) * 4); g.lineTo(512, 256); g.closePath(); g.fill(); }
  g.restore();
  return new THREE.CanvasTexture(c);
}
const CLOUD_TEX = { cumulus: [1, 2, 3, 4].map(k => makeCloudTex("cumulus", k * 97)), stratus: [1, 2, 3].map(k => makeCloudTex("stratus", k * 53)), wisp: [1, 2].map(k => makeCloudTex("wisp", k * 31)) };
const clouds = new THREE.Group(); sky.add(clouds);
function setClouds(on) { clouds.clear(); if (!on) return; let sd = 5; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const put = (tex, a, R, y, w, h, op) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true, opacity: op })); sp.scale.set(w, h, 1); sp.position.set(Math.cos(a) * R, y, Math.sin(a) * R); clouds.add(sp); };
  for (let i = 0; i < 16; i++) put(CLOUD_TEX.stratus[i % 3], r() * Math.PI * 2, 5600, 180 + r() * 260, 1600 + r() * 1400, 260 + r() * 140, 0.7 + r() * 0.2); // 지평선에 낮게 깔린 띠
  for (let i = 0; i < 11; i++) { const big = r(); put(CLOUD_TEX.cumulus[i % 4], r() * Math.PI * 2, 4600 + r() * 900, 700 + r() * 1500, 1000 + big * 1500, (1000 + big * 1500) * 0.5, 1); } // 크고 작은 뭉게구름
  for (let i = 0; i < 6; i++) put(CLOUD_TEX.wisp[i % 2], r() * Math.PI * 2, 4200, 2400 + r() * 1000, 2200 + r() * 1200, 700, 0.55); // 높은 새털구름
}
function paintSky([top, mid, hor]) {
  const T = new THREE.Color(top), M = new THREE.Color(mid), H = new THREE.Color(hor), pos = skyGeo.attributes.position, col = skyGeo.attributes.color;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 7000, c = y > 0.2 ? M.clone().lerp(T, (y - 0.2) / 0.8) : H.clone().lerp(M, Math.max(0, y) / 0.2); col.setXYZ(i, c.r, c.g, c.b); }
  col.needsUpdate = true;
}
const grad = new THREE.DataTexture(new Uint8Array([0, 255]), 2, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
let METAL = false, carEnv = null; const metalMats = [];
// 차 표면 때·상처: 패널 이음선, 리벳, 긁힘, 얼룩, 아래쪽 흙먼지 (UV 없이 부품 좌표로 세 방향에서 투영)
const WEAR_TEX = (() => { const S = 512, c = document.createElement("canvas"); c.width = c.height = S; const g = c.getContext("2d"); let sd = 11; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  g.fillStyle = "rgb(255,0,0)"; g.fillRect(0, 0, S, S); // R: 밝기 배율(255=깨끗), G: 때 가중, B: 반짝 긁힘
  for (let k = 0; k < 70; k++) { const x = R() * S, y = R() * S, r = 20 + R() * 70, gr = g.createRadialGradient(x, y, 0, x, y, r); const a = 0.05 + R() * 0.12; gr.addColorStop(0, `rgba(150,${Math.round(120 + R() * 120)},0,${a})`); gr.addColorStop(1, "rgba(150,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } // 얼룩
  g.strokeStyle = "rgba(60,0,0,0.85)"; g.lineWidth = 2.2; for (const v of [0.18, 0.47, 0.78]) { g.beginPath(); g.moveTo(v * S, 0); g.lineTo(v * S, S); g.stroke(); } for (const v of [0.33, 0.71]) { g.beginPath(); g.moveTo(0, v * S); g.lineTo(S, v * S); g.stroke(); } // 패널 이음선
  g.fillStyle = "rgba(70,0,0,0.9)"; for (const v of [0.18, 0.47, 0.78]) for (let y = 6; y < S; y += 22) { g.beginPath(); g.arc(v * S + 7, y, 1.6, 0, 7); g.fill(); } // 리벳
  for (let k = 0; k < 140; k++) { const x = R() * S, y = R() * S, l = 6 + R() * 40, a = R() * Math.PI; g.strokeStyle = R() < 0.5 ? `rgba(90,0,0,${0.3 + R() * 0.4})` : `rgba(255,0,255,${0.25 + R() * 0.35})`; g.lineWidth = 0.6 + R() * 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } // 긁힘 (어두운 것 / 금속 드러난 반짝이)
  for (let k = 0; k < 18; k++) { const x = R() * S, y = R() * S * 0.6; g.strokeStyle = "rgba(40,180,0,0.18)"; g.lineWidth = 2 + R() * 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 8, y + 20 + R() * 70); g.stroke(); } // 흘러내린 기름 자국
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; })();
function applyWear(body, dirtCol) { // 부품 재질에 때·상처를 입힘
  body.traverse(o => { if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial || o.material.transparent || o.material.userData.wear) return; const m = o.material; m.userData.wear = true; m.userData.dirt = dirtCol || 0x6a5238;
    m.onBeforeCompile = wearCompile(m.userData.dirt, "#include <map_fragment>");
    m.customProgramCacheKey = () => "wear"; m.needsUpdate = true; });
}
function wearCompile(dirtCol, anchor) { const dc = new THREE.Color(dirtCol);
  return sh => { sh.uniforms.wearMap = { value: WEAR_TEX }; sh.uniforms.dirtCol = { value: dc };
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vOP; varying vec3 vON;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvOP = position; vON = normal;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D wearMap; uniform vec3 dirtCol; varying vec3 vOP; varying vec3 vON;").replace(anchor, anchor + `
        { vec3 bw = pow(abs(normalize(vON)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z + 1e-4); vec3 p = vOP * 0.36;
          vec3 w = texture2D(wearMap, p.zy).rgb * bw.x + texture2D(wearMap, p.xz).rgb * bw.y + texture2D(wearMap, p.xy).rgb * bw.z;
          float dirt = smoothstep(1.05, 0.2, vOP.y) * 0.55 + w.g * 0.35;
          diffuseColor.rgb *= mix(0.2, 1.0, w.r);
          diffuseColor.rgb = mix(diffuseColor.rgb, dirtCol * 0.6, clamp(dirt, 0.0, 0.7));
          diffuseColor.rgb += w.b * 0.26; }`); };
}
// 차 만들 때만 금속 재질 (어두운 색은 타이어·고무처럼 덜 반짝이게)
const toon = (c, extra) => {
  if (METAL) { const col = new THREE.Color(c), dark = col.r + col.g + col.b < 0.3;
    const m = new THREE.MeshStandardMaterial({ color: c, metalness: dark ? 0.3 : 0.55, roughness: dark ? 0.65 : 0.45, envMap: carEnv, envMapIntensity: 0.6 }); metalMats.push(m); return m; }
  return new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...(extra || {}) }); };
const pmrem = new THREE.PMREMGenerator(renderer);
function makeEnv() {
  const es = new THREE.Scene(); es.add(new THREE.Mesh(skyGeo, sky.material));
  const gnd = new THREE.Mesh(new THREE.CircleGeometry(2500, 32), new THREE.MeshBasicMaterial({ color: C.ground })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -2; es.add(gnd);
  const sd = new THREE.Mesh(new THREE.SphereGeometry(180, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); sd.position.set(C.sun[2][0] * 1500, C.sun[2][1] * 1500, C.sun[2][2] * 1500); es.add(sd);
  if (carEnv) carEnv.dispose();
  carEnv = pmrem.fromScene(es, 0, 0.1, 5000).texture;
  for (const m of metalMats) { m.envMap = carEnv; m.envMapIntensity = courseId === "circuit" ? 1.1 : 0.6; m.needsUpdate = true; }
}
const glow = c => new THREE.MeshBasicMaterial({ color: c });
const sun = new THREE.DirectionalLight(0xffffff, 1.2); scene.add(sun); scene.add(sun.target);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap; // 부드럽지 않은 딱딱한 그림자
sun.castShadow = true; sun.shadow.mapSize.set(matchMedia("(pointer: coarse)").matches ? 1024 : 2048, matchMedia("(pointer: coarse)").matches ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 }); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.04; // 그림자가 차에서 떨어져 보이지 않게
let SUN_DIR = new THREE.Vector3(0, 1, 0);
const amb = new THREE.AmbientLight(0xffffff, 0.1); scene.add(amb);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000), toon(0xd9a066)); ground.rotation.x = -Math.PI / 2; ground.position.y = -4; scene.add(ground);
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
const carOlMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }); /* 차 외곽선 전용 (폰에서 배경 외곽선만 끌 수 있게) */
function partGraph(body, parts, flames, tol) { // 부품끼리 실제로 맞닿았는지(면 가까이 있거나 박혀 있는지) 그래프로
  tol = tol || 0.06;
  const pset = new Set(parts), fl = new Set(flames || []);
  const nodes = [...parts, ...body.children.filter(o => !pset.has(o) && !fl.has(o) && o.visible !== false && (o.isMesh || o.children.some(ch => ch.isMesh)))];
  const u = { parts };
  body.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(body.matrixWorld).invert();
  const geo = nodes.map(n => { const V = [], T = [], box = new THREE.Box3(); n.updateMatrixWorld(true);
    n.traverse(o => { if (!o.isMesh || o.material && o.material.side === THREE.BackSide) return; const M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), pos = o.geometry.attributes.position, idx = o.geometry.index; const base = V.length;
      for (let i = 0; i < pos.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(M); V.push(v); box.expandByPoint(v); }
      const n3 = idx ? idx.count : pos.count; for (let i = 0; i < n3; i += 3) { const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, cc = idx ? idx.getX(i + 2) : i + 2; T.push(new THREE.Triangle(V[base + a], V[base + b], V[base + cc])); } });
    // 정점이 너무 많으면 솎아냄
    const Vs = V.length > 400 ? V.filter((_, i) => i % Math.ceil(V.length / 400) === 0) : V;
    return { V: Vs, T, box }; });
  const ray = new THREE.Ray(), hit = new THREE.Vector3(), dir = new THREE.Vector3();
  const near = (A, B) => { const tp = new THREE.Vector3(); const bb = B.box.clone().expandByScalar(tol);
    for (const v of A.V) { if (!bb.containsPoint(v)) continue; for (const t of B.T) { t.closestPointToPoint(v, tp); if (tp.distanceToSquared(v) < tol * tol) return true; } }
    for (const ta of A.T) { const es = [[ta.a, ta.b], [ta.b, ta.c], [ta.c, ta.a]]; // 모서리가 상대 면을 뚫고 지나가면(박혀 있으면) 붙은 것
      for (const [p, q] of es) { if (!bb.containsPoint(p) && !bb.containsPoint(q)) continue; dir.subVectors(q, p); const len = dir.length(); if (len < 1e-6) continue; dir.divideScalar(len); ray.set(p, dir);
        for (const t of B.T) { if (ray.intersectTriangle(t.a, t.b, t.c, false, hit) && hit.distanceTo(p) <= len) return true; } } }
    return false; };
  const adj = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    if (!geo[i].box.clone().expandByScalar(tol).intersectsBox(geo[j].box)) continue;
    if (near(geo[i], geo[j]) || near(geo[j], geo[i])) { adj[i].push(j); adj[j].push(i); } }
  // 뿌리: 큰 부품(전체 부피 16% 이상), 없으면 제일 큰 것
  const all = new THREE.Box3(); geo.slice(0, u.parts.length).forEach(g => all.union(g.box)); const S = all.getSize(new THREE.Vector3()), total = S.x * S.y * S.z;
  const vol = b => { const s = b.getSize(new THREE.Vector3()); return s.x * s.y * s.z; };
  const roots = new Set(); u.parts.forEach((p, i) => { if (vol(geo[i].box) >= total * 0.16) roots.add(i); });
  if (!roots.size) { let bi = 0; for (let i = 0; i < u.parts.length; i++) if (vol(geo[i].box) > vol(geo[bi].box)) bi = i; roots.add(bi); }
  return { nodes, adj, roots, nParts: u.parts.length, geo };
}

function autoBrackets(K) { // 차체에 안 붙고 떠 있는 부품 덩어리를 찾아, 가장 가까운 곳에 받침대를 세워 연결
  K.g.updateMatrixWorld(true);
  for (let pass = 0; pass < 4; pass++) {
    const A = partGraph(K.body, K.parts, K.flames), P = A.nParts, vol = b => { const z = b.getSize(new THREE.Vector3()); return z.x * z.y * z.z; };
    const comp = new Array(P).fill(-1); let nc = 0;
    for (let i = 0; i < P; i++) { if (comp[i] >= 0) continue; const st = [i]; comp[i] = nc; while (st.length) { const a = st.pop(); for (const b of A.adj[a]) if (b < P && comp[b] < 0) { comp[b] = nc; st.push(b); } } nc++; }
    if (nc <= 1) return;
    const cv = new Array(nc).fill(0); for (let i = 0; i < P; i++) cv[comp[i]] += vol(A.geo[i].box); const main = cv.indexOf(Math.max(...cv));
    const mainT = []; for (let i = 0; i < P; i++) if (comp[i] === main) mainT.push(...A.geo[i].T);
    for (let k = 0; k < nc; k++) { if (k === main) continue;
      const V = [], CT = [], box = new THREE.Box3(); for (let i = 0; i < P; i++) if (comp[i] === k) { V.push(...A.geo[i].V); CT.push(...A.geo[i].T); box.union(A.geo[i].box); }
      const w = box.max.x - box.min.x, cx = (box.max.x + box.min.x) / 2, spots = w > 1.2 ? [cx - w * 0.3, cx + w * 0.3] : [null];
      for (const xs of spots) {
        let best = null, bd = 1e9; const tp = new THREE.Vector3();
        let cand = V; if (xs !== null) { cand = []; const q = new THREE.Vector3(), tq = new THREE.Vector3(); // 넓은 부품(윙)은 양쪽에 하나씩: 그 위치의 아랫면 점들을 표면에 붙여서 후보로
          for (let zi = 0; zi <= 6; zi++) { q.set(xs, box.min.y - 0.5, box.min.z + (box.max.z - box.min.z) * zi / 6); let bd2 = 1e9, bp = null; for (const t of CT) { t.closestPointToPoint(q, tq); const d2 = tq.distanceToSquared(q); if (d2 < bd2) { bd2 = d2; bp = tq.clone(); } } if (bp) cand.push(bp); } }
        for (const v of cand) { for (const t of mainT) { t.closestPointToPoint(v, tp); const d = tp.distanceToSquared(v); if (d < bd) { bd = d; best = [v.clone(), tp.clone()]; } } }
        if (!best) continue; const [a, b] = best, dir = b.clone().sub(a), len = dir.length(); if (len < 1e-4) continue; dir.normalize();
        const th = clamp(0.09 + len * 0.04, 0.09, 0.16), L_ = len + 0.16, geo = new THREE.BoxGeometry(th, L_, th);
        const m = K.part("받침대", geo, 0x3a3c42, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, 0.03); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); m.userData.bracket = true;
      } }
    K.g.updateMatrixWorld(true);
  }
}
function outlined(geo, color, thick = 0.06, parent) {
  const g = new THREE.Group(), m = new THREE.Mesh(geo, toon(color)), o = new THREE.Mesh(geo, outlineMat);
  geo.computeBoundingBox(); const sz = new THREE.Vector3(); geo.boundingBox.getSize(sz);
  o.scale.set(1 + thick * 2 / Math.max(sz.x, 0.01), 1 + thick * 2 / Math.max(sz.y, 0.01), 1 + thick * 2 / Math.max(sz.z, 0.01));
  const ct = new THREE.Vector3(); geo.boundingBox.getCenter(ct); o.position.set(ct.x * (1 - o.scale.x), ct.y * (1 - o.scale.y), ct.z * (1 - o.scale.z)); // 형태의 가운데를 기준으로 키움 (안 그러면 외곽선이 떠 보임)
  g.add(o, m); if (parent) parent.add(g); return g;
}
function textTex(str, bg, fg, w = 512, h = 128) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `900 italic ${h * 0.62}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(str, w / 2, h * 0.54);
  return new THREE.CanvasTexture(c);
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

