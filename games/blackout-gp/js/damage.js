// ================= 파손 =================
// 내구도 100. 세게 맞을수록 확 깎임. 맞은 쪽 부품이 떨어져 길에 남고(밟으면 튐), 속 프레임이 드러나고, 찌그러지고, 0이 되면 폭발·리타이어
const wreckG = new THREE.Group(); scene.add(wreckG);
const WRECK = []; // 떨어진 부품들 (치우지 않음)
const smokeD = makeParticles(420, 0x24201c, 2.4, false, 0.55), fireP = makeParticles(700, 0xff7a22, 1.4, true);
const dmgFromDv = dv => dv < 5 ? 0 : Math.min(25, (dv - 5) * 0.8 + (dv - 5) ** 2 * 0.02); // 차끼리: 내가 받은 속도 변화 (한 방에 끝나진 않게 상한)
const dmgWall = vn => vn < 8 ? 0 : (vn - 8) * 1.0 + (vn - 8) ** 2 * 0.02;          // 벽·바위: 정면으로 박는 속도
const FRAME_M = () => toon(0x8a8e96), FRAME_D = () => toon(0x34363c);
function ensureDmg(c) {
  const m = c.mesh, u = m.userData; if (u.dmg) return u.dmg;
  const body = u.body; body.updateMatrix(); const bb = new THREE.Box3(), tmp = new THREE.Box3();
  const info = u.parts.map(pt => { pt.updateMatrix(); const mesh = pt.children[1] || pt.children[0], g = mesh.geometry; g.computeBoundingBox(); tmp.copy(g.boundingBox).applyMatrix4(pt.matrix); bb.union(tmp); const c0 = new THREE.Vector3(), sz = new THREE.Vector3(); tmp.getCenter(c0); tmp.getSize(sz); return { pt, c: c0, sz, vol: sz.x * sz.y * sz.z }; });
  const C0 = new THREE.Vector3(), S = new THREE.Vector3(); bb.getCenter(C0); bb.getSize(S);
  const zoneOf = (x, z) => { const uu = (z - C0.z) / (S.z / 2), vv = (x - C0.x) / (S.x / 2); return Math.abs(uu) * 0.8 > Math.abs(vv) ? (uu > 0 ? "F" : "B") : (vv > 0 ? "P" : "N"); };
  const total = S.x * S.y * S.z, det = { F: [], B: [], P: [], N: [] };
  const ADJ = u.adj, rootSet = new Set(ADJ ? [...ADJ.roots].map(i => ADJ.nodes[i]) : []);
  if (ADJ) for (const n of ADJ.nodes) if (!n.userData.orig) n.userData.orig = { p: n.position.clone(), q: n.quaternion.clone(), s: n.scale.clone() };
  for (const it of info) { it.pt.userData.orig = { p: it.pt.position.clone(), q: it.pt.quaternion.clone(), s: it.pt.scale.clone() }; if (it.vol < total * 0.16 && !rootSet.has(it.pt)) { const z = zoneOf(it.c.x, it.c.z); it.out = z === "F" || z === "B" ? Math.abs(it.c.z - C0.z) : Math.abs(it.c.x - C0.x); det[z].push(it.pt); it.pt.userData.out = it.out; } }
  for (const k in det) det[k].sort((a, b) => b.userData.out - a.userData.out); // 바깥쪽 부품부터 떨어짐
  u.wheels.forEach(w => w.userData.orig = { p: w.position.clone(), q: w.quaternion.clone(), s: w.scale.clone() });
  // 속 프레임 (처음엔 숨겨두고, 그쪽 부품이 떨어지면 드러남)
  const fr = { F: new THREE.Group(), B: new THREE.Group(), P: new THREE.Group(), N: new THREE.Group(), C: new THREE.Group() };
  const W = S.x, H = S.y, L_ = S.z, x0 = C0.x, y0 = bb.min.y, z0 = C0.z, mM = FRAME_M(), mD = FRAME_D(), mR = toon(0xb8322a), mY = toon(0xd8a23a);
  const tube = (gr, a, b, r = 0.045, mat = mM) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length(); const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat); t.position.copy(A).add(B).multiplyScalar(0.5); t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); gr.add(t); };
  const box = (gr, w, h, d, x, y, z, mat = mD, ol = true) => { const g_ = ol ? outlined(new THREE.BoxGeometry(w, h, d), 0x34363c, 0.03) : new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); if (ol) g_.children[1].material = mat; g_.position.set(x, y, z); gr.add(g_); return g_; };
  const sx = W * 0.36, yb = y0 + H * 0.18, yt = y0 + H * 0.82, zf = z0 + L_ * 0.4, zr = z0 - L_ * 0.4, zcF = z0 + L_ * 0.14, zcB = z0 - L_ * 0.14;
  const st = body.scale, wb = u.wheelPos.map(([wx, wz]) => [wx / CS / st.x, wz / CS / st.z]), wy = u.wheels[0] ? u.wheels[0].userData.baseY / CS / st.y : 0.4;
  // 바닥 프레임: 세로 레일 두 줄 + 가로대
  for (const sd of [-1, 1]) tube(fr.C, [x0 + sd * W * 0.2, yb, zr], [x0 + sd * W * 0.2, yb, zf], 0.06, mD);
  for (const z of [zr, zcB, zcF, zf]) tube(fr.C, [x0 - W * 0.2, yb, z], [x0 + W * 0.2, yb, z], 0.05, mD);
  // 운전석: 시트, 핸들, 롤바 윗부분
  box(fr.C, W * 0.22, H * 0.35, L_ * 0.08, x0 - W * 0.08, yb + H * 0.2, z0 - L_ * 0.02, toon(0x1a1a1e));
  { const sw = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 14), mD); sw.position.set(x0 - W * 0.08, yb + H * 0.42, z0 + L_ * 0.07); fr.C.add(sw); }
  tube(fr.C, [x0 - sx * 0.8, yt, zcF - L_ * 0.06], [x0 + sx * 0.8, yt, zcF - L_ * 0.06]); tube(fr.C, [x0 - sx * 0.8, yt, zcB + L_ * 0.03], [x0 + sx * 0.8, yt, zcB + L_ * 0.03]);
  tube(fr.C, [x0 - sx * 0.8, yt, zcF - L_ * 0.06], [x0 + sx * 0.8, yt, zcB + L_ * 0.03], 0.035);
  // 옆: 롤케이지 기둥, 문짝 X바, 사이드 레일
  for (const [gr, sd] of [[fr.P, 1], [fr.N, -1]]) {
    const X = x0 + sd * sx;
    tube(gr, [X, yb, zcF], [x0 + sd * sx * 0.8, yt, zcF - L_ * 0.06]); tube(gr, [X, yb, zcB], [x0 + sd * sx * 0.8, yt, zcB + L_ * 0.03]);
    tube(gr, [X, yb, zcF], [X, yb + H * 0.4, zcB]); tube(gr, [X, yb, zcB], [X, yb + H * 0.4, zcF]);
    tube(gr, [X, yb + H * 0.4, zcB], [X, yb + H * 0.4, zcF]); tube(gr, [X, yb, zr + L_ * 0.05], [X, yb, zf - L_ * 0.05], 0.05, mD);
  }
  // 앞: 라디에이터, 엔진 블록(헤드커버·흡기), 앞 서스펜션 암
  box(fr.F, W * 0.5, H * 0.32, 0.12, x0, yb + H * 0.18, zf - L_ * 0.02, toon(0x50545c));
  for (let k = 0; k < 6; k++) box(fr.F, W * 0.5, 0.015, 0.13, x0, yb + H * 0.05 + k * H * 0.05, zf - L_ * 0.02 + 0.005, mD, false);
  const ez = z0 + L_ * 0.25; box(fr.F, W * 0.34, H * 0.3, L_ * 0.16, x0, yb + H * 0.2, ez, toon(0x5a5e66));
  for (const sd of [-1, 1]) { box(fr.F, W * 0.07, H * 0.06, L_ * 0.14, x0 + sd * W * 0.1, yb + H * 0.38, ez, mR); for (let k = 0; k < 3; k++) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, H * 0.14, 8), toon(0xc8c8c8)); tr.position.set(x0 + sd * W * 0.05, yb + H * 0.46, ez - L_ * 0.05 + k * L_ * 0.05); fr.F.add(tr); } }
  // 뒤: 연료 탱크, 기어박스, 배기 매니폴드, 뒤 충격 빔
  box(fr.B, W * 0.36, H * 0.22, L_ * 0.09, x0, yb + H * 0.12, z0 - L_ * 0.2, mY);
  box(fr.B, W * 0.2, H * 0.2, L_ * 0.1, x0, yb + H * 0.1, zr + L_ * 0.08, toon(0x4a4e56));
  tube(fr.B, [x0 - W * 0.3, yb + H * 0.1, zr], [x0 + W * 0.3, yb + H * 0.1, zr], 0.06, mD);
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) tube(fr.B, [x0 + sd * W * 0.12, yb + H * 0.3, ez - L_ * 0.05 + k * L_ * 0.05], [x0 + sd * W * 0.14, yb + H * 0.06, zr + L_ * 0.02], 0.035, toon(0xb06a3a));
  // 서스펜션 암 (바퀴 쪽으로)
  for (const [wx, wz] of wb) { const gr = wz > z0 ? fr.F : fr.B, sd = Math.sign(wx) || 1; tube(gr, [x0 + sd * W * 0.18, wy + 0.08, wz + 0.25], [wx * 0.92, wy, wz], 0.04); tube(gr, [x0 + sd * W * 0.18, wy + 0.08, wz - 0.25], [wx * 0.92, wy, wz], 0.04); tube(gr, [x0 + sd * W * 0.18, wy + 0.35, wz], [wx * 0.88, wy + 0.15, wz], 0.05, mR); }
  for (const k in fr) { fr[k].visible = false; body.add(fr[k]); }
  return u.dmg = { C0, S, zoneOf, det, fr, info, gone: [], dents: [], chars: [] };
}
function repairCar(c) {
  const d = ensureDmg(c), u = c.mesh.userData;
  for (const it of d.gone) { wreckG.remove(it); const o = it.userData.orig; it.position.copy(o.p); it.quaternion.copy(o.q); it.scale.copy(o.s); (it.userData.isWheel ? c.mesh : u.body).add(it); }
  d.gone = []; for (const t of d.dents) { t.mesh.geometry = t.geo0; if (t.ol) t.ol.geometry = t.geo0; t.pt.userData.dented = false; } d.dents = [];
  for (const [mesh, mat] of d.chars) mesh.material = mat; d.chars = [];
  for (const k in d.fr) d.fr[k].visible = false; u.body.position.y = 0;
  d.det = { F: [], B: [], P: [], N: [] }; for (const it of d.info) if (it.out !== undefined) d.det[d.zoneOf(it.c.x, it.c.z)].push(it.pt); for (const k in d.det) d.det[k].sort((a, b) => b.userData.out - a.userData.out);
  mergeCar(c.mesh); /* 다 고쳤으면 다시 한 덩어리 */
  Object.assign(c, { tumble: false, rolls: 0, hp: 100, hpMul: 1, zoneD: { F: 0, B: 0, P: 0, N: 0 }, dead: false, deadT: 0, camRetT: 0, lastHit: null, dmgFxT: 0 });
}
function repairAll() { for (const w of WRECK) if (!w.obj.userData.orig) wreckG.remove(w.obj); WRECK.length = 0; resetProps(); for (const c of [player, ...ais]) repairCar(c); }
function hitLocal(c, dx, dz) { // 월드 방향(차 중심→맞은 곳)을 차체 좌표의 맞은 지점으로
  const d = ensureDmg(c), st = c.mesh.userData.body.scale, fx = Math.sin(c.h), fz = Math.cos(c.h), lx = (dx * Math.cos(c.h) - dz * Math.sin(c.h)) / st.x, lz = (dx * fx + dz * fz) / st.z;
  const k = 1 / Math.max(Math.abs(lx) / (d.S.x / 2), Math.abs(lz) / (d.S.z / 2), 1e-4);
  return new THREE.Vector3(d.C0.x + lx * k, d.C0.y, d.C0.z + lz * k);
}
function applyDamage(c, amt, loc, by, src) {
  if (!(amt > 0.15) || c.dead || state !== "race" || c.done) return;
  if (c !== player && by !== player) amt *= 0.6; // 라이벌끼리·혼자 입는 피해는 줄여서 판이 너무 일찍 비지 않게 (나와 엮인 피해는 그대로)
  if (window.__dlog) window.__dlog.push([c.name.split(' ')[0], Math.round(amt), src, Math.round(c.prog)]);
  if (by === player && c !== player) { const big = src !== "gun"; HITFX.mark = 0.18; if (big) HITFX.big = 0.4; if (HITFX.tickCd <= 0 || big) { sndTick(big); HITFX.tickCd = 0.06; } }
  if (c === player && amt >= 0.2) { const src2 = by && by !== player ? by : null, ang = src2 ? Math.atan2(src2.x - player.x, src2.z - player.z) : (loc ? Math.atan2(loc.x - (ensureDmg(c).C0.x), loc.z - ensureDmg(c).C0.z) + player.h : null);
    if (ang !== null) { HITFX.hurt.push({ ang, t: 0.6, k: Math.min(1, 0.25 + amt / 15) }); if (HITFX.hurt.length > 8) HITFX.hurt.shift(); } if (amt >= 1.5 || src === "gun") sndHurt(Math.min(1, 0.3 + amt / 20)); }
  if (amt >= 9) recEvent("hit", c, amt >= 16);
  const d = ensureDmg(c); c.hp -= amt; if (by) c.lastHit = { by, t: raceT };
  c.hpMul = 1 - 0.1 * clamp((40 - c.hp) / 40, 0, 1);
  if (loc) {
    const z = d.zoneOf(loc.x, loc.z); c.zoneD[z] += amt;
    let n = 0; while (c.zoneD[z] >= 11 * (d.gone.filter(g => g.userData.zone === z).length + 1) && d.det[z].length && n++ < 4) detachPart(c, d.det[z].shift(), z, 1);
    if (amt > 2) dentAt(c, loc, Math.min(0.55, amt * 0.022) * (c.hp < 40 ? 1.5 : 1));
  }
  if (c.hp < 40) d.fr.C.visible = true;
  if (c === player && amt > 6) setMsg(c.hp < 15 ? "위험! 차가 버티지 못함" : c.hp < 40 ? "심한 파손!" : "파손!", 0.9);
  if (c.hp <= 0) explode(c);
}
const _wbb = new THREE.Box3(), _wv = new THREE.Vector3();
function pivotize(obj) { // 부품 모양의 한가운데를 회전 중심으로 (원점이 차 중심에 있어서 엉뚱한 점을 축으로 돌고 공중에 떠 보이던 문제)
  obj.updateMatrixWorld(true); _wbb.setFromObject(obj); const cen = _wbb.getCenter(new THREE.Vector3());
  const g = new THREE.Group(); g.userData.pivot = true; g.position.copy(cen); wreckG.add(g); obj.position.sub(cen); g.add(obj); return g;
}
function cascadeParts(c) { // 받쳐주던 부품이 떨어지면, 차체와 더는 이어지지 않는 부품도 같이 떨어짐 (공중에 떠 있지 않게)
  const u = c.mesh.userData, A = u.adj, d = u.dmg; if (!A || !d || d.casc) return; d.casc = true;
  const on = i => A.nodes[i].parent === u.body, reach = new Set(), st = []; for (const r of A.roots) if (on(r)) { reach.add(r); st.push(r); }
  while (st.length) { const i = st.pop(); for (const j of A.adj[i]) if (!reach.has(j) && on(j)) { reach.add(j); st.push(j); } }
  for (let i = 0; i < A.nodes.length; i++) if (on(i) && !reach.has(i)) { const n = A.nodes[i], z = d.zoneOf(A.cen[i].x, A.cen[i].z); for (const k in d.det) { const ix = d.det[k].indexOf(n); if (ix >= 0) d.det[k].splice(ix, 1); } detachPart(c, n, z, 0.5); }
  d.casc = false;
}
function detachPart(c, pt, zone, power) {
  unmergeCar(c.mesh); const d = ensureDmg(c), u = c.mesh.userData; c.mesh.updateMatrixWorld(true); pt.updateMatrixWorld(true);
  const P_ = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(); pt.matrixWorld.decompose(P_, Q, Sc);
  pt.parent.remove(pt); wreckG.add(pt); pt.position.copy(P_); pt.quaternion.copy(Q); pt.scale.copy(Sc); pt.userData.zone = zone; d.gone.push(pt);
  if (zone && d.fr[zone]) d.fr[zone].visible = true;
  const ox = P_.x - c.x, oz = P_.z - c.z, ol = Math.hypot(ox, oz) || 1, kick = (3 + Math.random() * 6) * power;
  const bs = new THREE.Box3().setFromObject(pt), r = Math.max(0.35, bs.getSize(new THREE.Vector3()).length() * 0.35);
  const pg_ = pivotize(pt);
  WRECK.push({ obj: pg_, x: pg_.position.x, y: pg_.position.y, z: pg_.position.z, vx: c.vx * 0.8 + ox / ol * kick, vy: 3 + Math.random() * 5 * power, vz: c.vz * 0.8 + oz / ol * kick, wx: (Math.random() - 0.5) * 12, wy: (Math.random() - 0.5) * 12, wz: (Math.random() - 0.5) * 12, r, idx: c.idx, rest: false, hitT: 0.6, wheel: !!pt.userData.isWheel });
  recWreck(WRECK[WRECK.length - 1], c);
  if (!pt.userData.isWheel) cascadeParts(c);
  sndClank(1, P_.x, P_.z);
  if (viewD(c.x, c.z) < 300) for (let k = 0; k < 8; k++) emit(sparks, P_.x, P_.y, P_.z, (Math.random() - 0.5) * 10 + c.vx * 0.5, Math.random() * 6, (Math.random() - 0.5) * 10 + c.vz * 0.5, 0.4);
}
function dentAt(c, loc, depth) { // 맞은 자리 근처 꼭짓점을 안쪽으로 밀어 찌그러뜨림
  unmergeCar(c.mesh); const d = ensureDmg(c), R = Math.max(0.9, d.S.x * 0.55), dir = new THREE.Vector3(d.C0.x - loc.x, 0, d.C0.z - loc.z).normalize(), inv = new THREE.Matrix4(), pL = new THREE.Vector3(), dL = new THREE.Vector3();
  for (const it of d.info) {
    const pt = it.pt; if (pt.parent !== c.mesh.userData.body) continue;
    if (Math.abs(it.c.x - loc.x) > R + it.sz.x / 2 || Math.abs(it.c.z - loc.z) > R + it.sz.z / 2) continue;
    const mesh = pt.children[1] || pt.children[0], ol = pt.children[1] ? pt.children[0] : null;
    if (!pt.userData.dented) { const g0 = mesh.geometry, g1 = g0.clone(); mesh.geometry = g1; if (ol) ol.geometry = g1; d.dents.push({ pt, mesh, ol, geo0: g0 }); pt.userData.dented = true; }
    inv.copy(pt.matrix).invert(); pL.copy(loc).applyMatrix4(inv); dL.copy(dir).transformDirection(inv);
    const pos = mesh.geometry.attributes.position, v = new THREE.Vector3(); let moved = false;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const dd = v.distanceTo(pL); if (dd < R) { const f = (1 - dd / R) ** 2 * depth * (0.7 + 0.6 * Math.sin(i * 1.7) ** 2); v.addScaledVector(dL, f); v.y -= f * 0.25; pos.setXYZ(i, v.x, v.y, v.z); moved = true; } }
    if (moved) { pos.needsUpdate = true; mesh.geometry.computeVertexNormals(); }
  }
}
function explode(c) {
  recEvent("boom", c, true); unmergeCar(c.mesh);
  const d = ensureDmg(c), u = c.mesh.userData; c.dead = true; c.hp = 0; c.deadT = 0; c.boostT = 0;
  for (const z of ["F", "B", "P", "N"]) while (d.det[z].length) detachPart(c, d.det[z].shift(), z, 2.2);
  for (const w of u.wheels) { w.userData.isWheel = true; detachPart(c, w, null, 1.6); }
  for (const k in d.fr) d.fr[k].visible = true; u.body.position.y = -0.32;
  (window.__tlog && window.__tlog.push("explode")), enterTumble(c, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, 7 + Math.random() * 5);
  u.body.traverse(o => { if (o.isMesh && o.material && o.material !== outlineMat && (o.material.isMeshToonMaterial || o.material.isMeshStandardMaterial)) { d.chars.push([o, o.material]); const m2 = o.material.clone(); m2.color.lerp(new THREE.Color(0x1a1612), 0.85); if (m2.emissive) m2.emissive.setHex(0); if (m2.isMeshStandardMaterial) { m2.metalness = 0.1; m2.roughness = 0.95; m2.envMapIntensity = 0.08; } o.material = m2; } });
  for (const f of u.flames) f.visible = false;
  const near = viewD(c.x, c.z);
  if (near < 400 && QFX) { QFX.boom(c.x, c.y, c.z, 1); for (let k = 0; k < 40; k++) emit(boostFire, c.x, c.y + 1, c.z, (Math.random() - 0.5) * 20 + c.vx * 0.4, Math.random() * 10, (Math.random() - 0.5) * 20 + c.vz * 0.4, 0.6); }
  if (near < 400 && !QFX) { for (let k = 0; k < 160; k++) emit(boostFire, c.x, c.y + 1, c.z, (Math.random() - 0.5) * 30 + c.vx * 0.4, Math.random() * 16, (Math.random() - 0.5) * 30 + c.vz * 0.4, 0.9); for (let k = 0; k < 60; k++) emit(smokeD, c.x, c.y + 1.5, c.z, (Math.random() - 0.5) * 8, 2 + Math.random() * 6, (Math.random() - 0.5) * 8, 2.5); for (let k = 0; k < 40; k++) emit(sparks, c.x, c.y + 1, c.z, (Math.random() - 0.5) * 30, Math.random() * 15, (Math.random() - 0.5) * 30, 0.7); sndExplode(c.x, c.z); shake = Math.max(shake, Math.min(1.4, 120 / (near + 30))); }
  if (c === player && !DEMO.on) { setMsg("RETIRED", 4); flashT = 0.6; clearTimeout(endTimer); endTimer = setTimeout(showEnd, 4800); }
  if (c.lastHit && c.lastHit.by && c.lastHit.by !== c && raceT - c.lastHit.t < 4) kos.set(c.lastHit.by, (kos.get(c.lastHit.by) || 0) + 1);
  if (c !== player) { const mine = c.lastHit && c.lastHit.by === player && raceT - c.lastHit.t < 4; setMsg(mine ? `${c.name} 격파!` : `${c.name} 리타이어!`, 1.6); }
}
function stepWreck(dt) {
  const cars = [player, ...ais], q = new THREE.Quaternion(), ax = new THREE.Vector3();
  for (const w of WRECK) {
    w.hitT = Math.max(0, w.hitT - dt);
    if (w.hitT <= 0) for (const c of cars) { // 차가 밟거나 치면 튕겨나가고, 차도 출렁
      if (c.dead || Math.abs(c.y - w.y) > 2.5) continue;
      const dx = w.x - c.x, dz = w.z - c.z; if (dx * dx + dz * dz > (c.mesh.userData.hl + w.r + 2) ** 2) continue;
      const fx = Math.sin(c.h), fz = Math.cos(c.h), lz = dx * fx + dz * fz, lx = dx * Math.cos(c.h) - dz * Math.sin(c.h);
      if (Math.abs(lz) > c.mesh.userData.hl + w.r || Math.abs(lx) > c.mesh.userData.hwd + w.r) continue;
      const sp = Math.hypot(c.vx, c.vz); if (sp < 4) continue;
      const k = 0.9 + Math.random() * 0.5; w.vx = c.vx * k + (Math.random() - 0.5) * 8; w.vz = c.vz * k + (Math.random() - 0.5) * 8; w.vy = 4 + Math.random() * 6 + Math.min(8, sp * 0.05); w.wx = (Math.random() - 0.5) * 25; w.wy = (Math.random() - 0.5) * 25; w.wz = (Math.random() - 0.5) * 25; w.rest = false; w.hitT = 0.5;
      const big = Math.min(1.6, w.r), spf = Math.min(1, sp / 60); c.kickT = 1.2;
      c.vy = (c.vy || 0) + big * 3.5 * spf; c.ry += (Math.random() - 0.5) * big * 0.4 * spf; c.kSrc = "debris"; c.kSrcT = raceT;
      if (!c.tumble && big > 1.1 && sp > 60 && Math.random() < 0.12) (window.__tlog && window.__tlog.push("debris")), enterTumble(c, (Math.random() - 0.5) * big * 3, (Math.random() - 0.5) * big * 3, big * 4); c.vf *= 1 - Math.min(0.06, big * 0.03); toWorld(c);
      applyDamage(c, big * 0.8 * spf, hitLocal(c, fx, fz), null, 'debris');
      if (c === player) shake = Math.max(shake, 0.25 + big * 0.3); sndClank(0.6 + big * 0.4, w.x, w.z); sndImpact(6 + big * 6, w.x, w.z, 0.5);
      for (let j = 0; j < 6; j++) emit(sparks, w.x, w.y + 0.3, w.z, (Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8, 0.3);
    }
    if (w.rest) continue;
    w.vy -= 26 * dt; w.x += w.vx * dt; w.y += w.vy * dt; w.z += w.vz * dt;
    w.idx = nearest(w.x, w.z, w.idx); const t = TRK[w.idx], lat = (w.x - t.x) * nx(t) + (w.z - t.z) * nz(t), g0 = surfH(t.s, lat);
    const o = w.obj; o.position.set(w.x, w.y, w.z); const wl = Math.hypot(w.wx, w.wy, w.wz); if (wl > 0.01) { ax.set(w.wx / wl, w.wy / wl, w.wz / wl); q.setFromAxisAngle(ax, wl * dt); o.quaternion.premultiply(q); }
    o.updateMatrixWorld(true); _wbb.setFromObject(o); const low = _wbb.min.y; w.gy = w.y - low + g0; // 모양의 가장 낮은 점이 땅에 닿게
    if (low < g0) { w.y += g0 - low; o.position.y = w.y; if (w.vy < -3) sndClank(Math.min(1, -w.vy / 10), w.x, w.z); if (w.vy < 0) w.vy = -w.vy * (w.wheel ? 0.45 : 0.28); const fr = Math.exp(-(w.wheel ? 0.8 : 3.2) * dt); w.vx *= fr; w.vz *= fr; w.wx *= Math.exp(-4 * dt); w.wy *= Math.exp(-4 * dt); w.wz *= Math.exp(-4 * dt);
      if (Math.hypot(w.vx, w.vz) < 0.6 && Math.abs(w.vy) < 1.2) w.rest = true; }
  }
}
function stepDamageFx(dt) { // 연기·불꽃 (가까운 차만)
  for (const c of [player, ...ais]) {
    if (c.hp === undefined || c.hp >= 70) continue;
    if (viewD(c.x, c.z) > 350) continue;
    c.dmgFxT = (c.dmgFxT || 0) + dt; if (c.dead) c.deadT += dt;
    const fx = Math.sin(c.h), fz = Math.cos(c.h), hl = c.mesh.userData.hl, ex = c.x + fx * hl * 0.35, ez = c.z + fz * hl * 0.35, ey = c.y + 1.3;
    const rate = c.dead ? 30 : c.hp < 15 ? 40 : c.hp < 40 ? 22 : 8 + (70 - c.hp) * 0.3;
    while (c.dmgFxT > 1 / rate) { c.dmgFxT -= 1 / rate;
      const vx = c.vx * 0.3 + (Math.random() - 0.5) * 2, vz = c.vz * 0.3 + (Math.random() - 0.5) * 2;
      if (c.hp < 40) emit(smokeD, ex, ey, ez, vx, 2 + Math.random() * 2, vz, c.dead ? 3 : 2); else emit(smoke, ex, ey, ez, vx, 1.5 + Math.random(), vz, 1.4);
      if (c.hp < 15 && (!c.dead || c.deadT < 40)) for (let k = 0; k < 2; k++) emit(fireP, ex + (Math.random() - 0.5) * 1.2, ey - 0.3, ez + (Math.random() - 0.5) * 1.2, vx * 0.6, 2 + Math.random() * 4, vz * 0.6, 0.45);
      if (c.hp < 40 && !c.dead && Math.abs(c.vf) > 20 && Math.random() < 0.3) emit(sparks, c.x - fx * hl, c.y + 0.15, c.z - fz * hl, -c.vx * 0.2 + (Math.random() - 0.5) * 6, Math.random() * 3, -c.vz * 0.2 + (Math.random() - 0.5) * 6, 0.3);
    }
  }
}



