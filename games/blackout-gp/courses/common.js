// ================= 코스 만들기 =================
let world = null, colliders = [];
function noiseTex(base, specks, size = 256, streak = false) { // 아스팔트·모래 알갱이 무늬 (흐르는 게 보여야 속도가 느껴짐)
  const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let k = 0; k < size * 6; k++) { const [col, a] = specks[k % specks.length]; g.fillStyle = col; g.globalAlpha = a; const w = streak ? 1 + Math.random() * 3 : 1 + Math.random() * 2.5, h = streak ? 4 + Math.random() * 14 : w; g.fillRect(Math.random() * size, Math.random() * size, w, h); }
  g.globalAlpha = 1;
  for (let k = 0; k < 5; k++) { g.fillStyle = specks[0][0]; g.globalAlpha = 0.25; g.fillRect(0, Math.random() * size, size, 2 + Math.random() * 3); } // 가로 이음매 (진행 방향으로 지나감)
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
const TEX = {};
function ribbon(lat0, lat1, dy, color, opt = {}) {
  const v = [], uv = [], idx = [], step = opt.step || 1, cnt = Math.ceil(N / step);
  for (let j = 0; j <= cnt; j++) {
    const i = (j * step) % N, t = TRK[i];
    const m0 = mapLat(t, lat0), m1 = mapLat(t, lat1), la0 = opt.inner ? innerClamp(t, m0) : m0, la1 = opt.inner ? innerClamp(t, m1) : m1;
    const y0 = (opt.y0 ? opt.y0(t, la0) : surfH(t.s, la0, opt.noRamp)) + dy, y1 = (opt.y1 ? opt.y1(t, la1) : surfH(t.s, la1, opt.noRamp)) + dy;
    v.push(t.x + nx(t) * la0, y0, t.z + nz(t) * la0, t.x + nx(t) * la1, y1, t.z + nz(t) * la1);
    const sv = j * step * L / N; uv.push(la0 / (opt.uvU || 8), sv / (opt.uvV || 8), la1 / (opt.uvU || 8), sv / (opt.uvV || 8));
  }
  for (let j = 0; j < cnt; j++) {
    const i = j * step;
    if (opt.dash && (Math.floor(i / opt.dash) % 2)) continue;
    if (opt.only && !opt.only(TRK[i])) continue;
    if (RAMP && !opt.noRamp && TRK[i].s < RAMP.s1 && TRK[(i + step) % N].s >= RAMP.s1) continue;
    if (GAP && TRK[(i + step) % N].s > GAP[0] && TRK[i].s < GAP[1]) continue;
    const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const mat = opt.mat || (opt.tex ? toon(color, { map: opt.tex }) : toon(color)); mat.side = THREE.DoubleSide;
  // 코스 전체가 한 덩어리면 화면 밖까지 다 그려서 폰이 느려짐 → 약 300m씩 잘라서 보이는 것만 그림 (꼭짓점 버퍼는 같이 씀)
  const CH = Math.max(128, Math.round(520 / step)), pos = g.attributes.position, byChunk = new Map();
  for (let k = 0; k < idx.length; k += 6) { const c = Math.floor(idx[k] / 2 / CH); let a = byChunk.get(c); if (!a) byChunk.set(c, a = []); for (let q = 0; q < 6; q++) a.push(idx[k + q]); }
  let first = null; const P_ = new THREE.Vector3();
  for (const a of byChunk.values()) { const cg = new THREE.BufferGeometry(); cg.setAttribute("position", pos); cg.setAttribute("uv", g.attributes.uv); cg.setAttribute("normal", g.attributes.normal); cg.setIndex(a);
    const bb = new THREE.Box3(); for (const ii of a) bb.expandByPoint(P_.fromBufferAttribute(pos, ii)); cg.boundingBox = bb; cg.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(cg, mat); m.receiveShadow = true; world.add(m); if (!first) first = m; }
  return first;
}
function innerClamp(t, lat) { // 곡률 중심 쪽(안쪽)으로는 반지름보다 멀리 뻗지 않게
  if (Math.sign(lat) === -t.kside && t.kmx > 1e-4) { const lim = Math.max(t.hw + 0.5, 0.7 / t.kmx); if (Math.abs(lat) > lim) return Math.sign(lat) * lim; }
  return lat;
}
function terrain(bands, tex) { // bands: [[lat0, lat1, color], ...] 바깥쪽 지형
  for (const sd of [-1, 1]) for (const [a, b, col] of bands)
    ribbon(sd * a, sd * b, -0.12, col, { step: 2, noRamp: true, inner: true, tex, uvU: 9, uvV: 9, y0: (t, l) => surfH(t.s, sd * Math.max(Math.abs(l), t.hw + 0.01), true), y1: (t, l) => surfH(t.s, sd * Math.max(Math.abs(l), t.hw + 0.01), true) });
}
function placeOnTrack(obj, s, lat, yOff = 0) { const t = TRK[idxAtS(s)]; lat = mapLat(t, lat); obj.position.set(t.x + nx(t) * lat, surfH(s, lat) + yOff, t.z + nz(t) * lat); obj.rotation.y = Math.atan2(t.tx, t.tz); world.add(obj); return obj; }
function startGate(color, signTex) {
  const t = TRK[0], gate = new THREE.Group(), w = HALF * 2 + 8;
  for (const sd of [-1, 1]) { const p = outlined(new THREE.BoxGeometry(2, 16, 2), 0x1a1a1a, 0.1); p.position.set(sd * w / 2, 8, 0); gate.add(p); }
  const beam = outlined(new THREE.BoxGeometry(w + 2, 4, 1.6), 0x111111, 0.12); beam.position.y = 16; gate.add(beam);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 3.2), new THREE.MeshBasicMaterial({ map: signTex })); sign.position.set(0, 16, -0.85); sign.rotation.y = Math.PI; gate.add(sign);
  const sign2 = sign.clone(); sign2.position.z = 0.85; sign2.rotation.y = 0; gate.add(sign2);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.3, 1.7), glow(color)); strip.position.y = 13.9; gate.add(strip);
  placeOnTrack(gate, 0, 0, 0); gate.position.y = surfH(0, 0);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 16; c++) {
    if ((r + c) % 2) continue;
    const q = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 / 16, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    q.rotation.x = -Math.PI / 2; q.rotation.z = Math.atan2(t.tx, t.tz);
    const lane = -HALF + HALF / 16 + c * HALF * 2 / 16, along = r * 1.6;
    q.position.set(t.x + nx(t) * lane + t.tx * along, surfH(along, lane) + 0.04, t.z + nz(t) * lane + t.tz * along); world.add(q);
  }
}
