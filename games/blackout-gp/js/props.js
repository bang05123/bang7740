// ================= 길가 오브젝트 (부서짐) =================
// 반사봉·선인장·전봇대·광고판·바위·조명탑 등: 차로 박거나 총·미사일에 맞으면 부서져 날아가고, 잔해는 길에 남음
const PROP_KIND = {
  post: { r: 0.45, hp: 1, slow: 0.997, dmg: 0, h: 1.3 }, bush: { r: 1.1, hp: 1, slow: 0.993, dmg: 0, h: 1.2 }, cactus: { r: 0.8, hp: 3, slow: 0.985, dmg: 0.5, h: 4 },
  rock: { r: 1.2, hp: 8, slow: 0.95, dmg: 3, h: 2 }, pole: { r: 0.7, hp: 14, slow: 0.9, dmg: 3, h: 11 }, board: { r: 6, hp: 30, slow: 0.86, dmg: 4, h: 12 },
  adboard: { r: 6.5, hp: 10, slow: 0.95, dmg: 1, h: 5 }, lamp: { r: 1.0, hp: 20, slow: 0.88, dmg: 3, h: 34 }, bale: { r: 1.4, hp: 4, slow: 0.94, dmg: 1, h: 2 }
};
let PROPS = [], PGRID = new Map(); const PCELL = 40, pkey = (x, z) => (Math.floor(x / PCELL) + 5000) * 100000 + (Math.floor(z / PCELL) + 5000);
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
function addProp(pr) { const K = PROP_KIND[pr.kind]; pr.r = pr.r ?? K.r; pr.h = pr.h ?? K.h; pr.hp = pr.hp0 = K.hp; pr.broken = false; PROPS.push(pr); const k = pkey(pr.x, pr.z); if (!PGRID.has(k)) PGRID.set(k, []); PGRID.get(k).push(pr); return pr; }
function propInst(im, i, kind, om, extra) { const m = new THREE.Matrix4(); im.getMatrixAt(i, m); const P_ = new THREE.Vector3().setFromMatrixPosition(m); return addProp(Object.assign({ kind, x: P_.x, y: P_.y - 0.5, z: P_.z, inst: { im, om, i, m } }, extra || {})); }
function propObj(obj, kind, extra) { obj.updateMatrixWorld(true); const P_ = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld); return addProp(Object.assign({ kind, x: P_.x, y: P_.y - (extra && extra.yOff || 0), z: P_.z, obj }, extra || {})); }
function linkedProp(pr) { const K = PROP_KIND[pr.kind]; pr.hp = pr.hp0 = K.hp; pr.broken = false; pr.r = pr.r ?? K.r; pr.h = pr.h ?? K.h; PROPS.push(pr); return pr; } // 같이 부서지기만 하는 부품 (직접 맞지는 않음)
function propsNear(x, z, rad) { const out = [], n = Math.ceil(rad / PCELL); const cx = Math.floor(x / PCELL), cz = Math.floor(z / PCELL);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const a = PGRID.get((cx + i + 5000) * 100000 + (cz + j + 5000)); if (a) for (const pr of a) if (!pr.broken) out.push(pr); } return out; }
function breakProp(pr, vx, vy, vz, quiet) {
  if (pr.broken) return; pr.broken = true; let mesh;
  if (pr.inst) { const { im, om, i, m } = pr.inst; let mat = im.material; if (im.instanceColor) { mat = im.material.clone(); const c = new THREE.Color(); im.getColorAt(i, c); mat.color.copy(c); }
    mesh = new THREE.Mesh(im.geometry, mat); m.decompose(mesh.position, mesh.quaternion, mesh.scale); im.setMatrixAt(i, ZERO_M); im.instanceMatrix.needsUpdate = true; if (om) { om.setMatrixAt(i, ZERO_M); om.instanceMatrix.needsUpdate = true; } }
  else { const o = pr.obj; o.updateMatrixWorld(true); if (!o.userData.propOrig) o.userData.propOrig = { parent: o.parent, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }; const P_ = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(); o.matrixWorld.decompose(P_, Q, Sc); o.parent.remove(o); o.position.copy(P_); o.quaternion.copy(Q); o.scale.copy(Sc); mesh = o; }
  wreckG.add(mesh);
  const big = pr.kind === "board" || pr.kind === "lamp" || pr.kind === "pole";
  const pm_ = pivotize(mesh);
  WRECK.push({ obj: pm_, x: pm_.position.x, y: pm_.position.y, z: pm_.position.z, vx, vy, vz, wx: (Math.random() - 0.5) * (big ? 4 : 14), wy: (Math.random() - 0.5) * 8, wz: (Math.random() - 0.5) * (big ? 4 : 14), r: Math.min(1.6, Math.max(0.35, pr.r * 0.5)), idx: fullNearest(pm_.position.x, pm_.position.z), rest: false, hitT: 0.5, prop: true });
  recWreck(WRECK[WRECK.length - 1], null);
  if (!quiet && viewD(pr.x, pr.z) < 260) { for (let k = 0; k < 8; k++) emit(pr.kind === "bush" || pr.kind === "cactus" ? dust : sparks, pr.x, pr.y + 1, pr.z, (Math.random() - 0.5) * 8 + vx * 0.3, Math.random() * 5, (Math.random() - 0.5) * 8 + vz * 0.3, 0.5); { const dv = distVol(pr.x, pr.z), soft = pr.kind === "bush" || pr.kind === "cactus" || pr.kind === "bale" || pr.kind === "post" || pr.kind === "board"; if (!(SFX.ready && sfx(soft ? pick("wood", 2) : pr.kind === "lamp" ? "glass1" : pick("clank", 4), dv * (big ? 0.9 : 0.6), 0.85 + Math.random() * 0.3))) sndClank(big ? 1 : 0.6, pr.x, pr.z); } if (big) sndImpact(14, pr.x, pr.z); /* 부서지는 오브젝트 재질에 맞는 소리 */ }
  if (pr.link) for (const q of pr.link) breakProp(q, vx * 0.8, vy + 2, vz * 0.8, true);
}
function damageProp(pr, amt, dx, dz, push) { if (pr.broken) return; pr.hp -= amt; if (viewD(pr.x, pr.z) < 220) emit(sparks, pr.x, pr.y + 1, pr.z, (Math.random() - 0.5) * 6 - dx * 3, Math.random() * 4, (Math.random() - 0.5) * 6 - dz * 3, 0.25); if (pr.hp <= 0) breakProp(pr, dx * push, 3 + Math.random() * 4, dz * push); }
function rayProp(ox, oz, dx, dz, maxL, y) { // 정면 선에 처음 걸리는 오브젝트
  let best = null, bl = maxL; const seen = new Set();
  for (let d = 0; d <= maxL + PCELL; d += PCELL * 0.8) for (const pr of propsNear(ox + dx * d, oz + dz * d, PCELL * 0.6)) { if (seen.has(pr)) continue; seen.add(pr); const rx = pr.x - ox, rz = pr.z - oz, al = rx * dx + rz * dz; if (al < 0 || al > bl) continue; if (Math.abs(rx * dz - rz * dx) > pr.r * 0.7) continue; if (y !== undefined && (y < pr.y - 1 || y > pr.y + pr.h + 1)) continue; bl = al; best = pr; }
  return best ? [best, bl] : null;
}
function stepProps() { // 차가 들이받으면 부숴짐
  for (const c of [player, ...ais]) {
    const sp = Math.hypot(c.vx, c.vz); if (sp < 2) continue; const hw = c.mesh.userData.hwd, hl = c.mesh.userData.hl;
    for (const pr of propsNear(c.x, c.z, hl + 8)) {
      const dx = pr.x - c.x, dz = pr.z - c.z, fx = Math.sin(c.h), fz = Math.cos(c.h), lz = dx * fx + dz * fz, lx = dx * Math.cos(c.h) - dz * Math.sin(c.h);
      if (Math.abs(lz) > hl + pr.r * 0.6 || Math.abs(lx) > hw + pr.r * 0.6) continue; if (c.y > pr.y + pr.h + 0.5 || c.y < pr.y - 3) continue;
      const K = PROP_KIND[pr.kind]; breakProp(pr, c.vx * (1.05 + Math.random() * 0.3) + (Math.random() - 0.5) * 6, 3 + Math.random() * 5 + sp * 0.04, c.vz * (1.05 + Math.random() * 0.3) + (Math.random() - 0.5) * 6);
      if (c.tumble) { c.tv.multiplyScalar(K.slow); continue; }
      c.vf *= K.slow; c.vl *= K.slow; toWorld(c); c.kSrc = "prop:" + pr.kind; c.kSrcT = raceT; if (K.dmg) { applyDamage(c, K.dmg * Math.min(1, sp / 50), hitLocal(c, fx, fz), null, "prop"); c.ry += (Math.random() - 0.5) * 0.4 * (1 - K.slow) * 10; c.kickT = 1; }
      if (c === player) shake = Math.max(shake, (1 - K.slow) * 4 + 0.08);
    }
  }
}
function resetProps() {
  for (const pr of PROPS) { if (!pr.broken) continue; pr.broken = false; pr.hp = pr.hp0;
    if (pr.inst) { const { im, om, i, m } = pr.inst; im.setMatrixAt(i, m); im.instanceMatrix.needsUpdate = true; if (om) { const M = m.clone(); if (om.userData.sc) M.multiply(om.userData.sc); om.setMatrixAt(i, M); om.instanceMatrix.needsUpdate = true; } }
    else { const o = pr.obj, O = o.userData.propOrig; if (O) { if (o.parent) o.parent.remove(o); o.position.copy(O.p); o.quaternion.copy(O.q); o.scale.copy(O.s); O.parent.add(o); } } }
}


// ================= 단단한 구조물 (집·관중석·나무·가드레일 등) =================
// 안 부서지는 대신, 세게 들이받으면 차가 박살남
let SOLIDS = [], SGRID = new Map(); const SMASH = 1.8; // 벽보다 더 아프게
function addSolid(x, z, ang, hx, hz, y0 = -50, y1 = 500) { const so = { x, z, ang, c: Math.cos(ang), s: Math.sin(ang), hx, hz, y0, y1 }; SOLIDS.push(so); const R = Math.hypot(hx, hz);
  for (let i = Math.floor((x - R) / PCELL); i <= Math.floor((x + R) / PCELL); i++) for (let j = Math.floor((z - R) / PCELL); j <= Math.floor((z + R) / PCELL); j++) { const k = (i + 5000) * 100000 + (j + 5000); if (!SGRID.has(k)) SGRID.set(k, []); SGRID.get(k).push(so); } }
function solidFromMatrix(m, pad = 0) { const P_ = new THREE.Vector3(), Q = new THREE.Quaternion(), S_ = new THREE.Vector3(); m.decompose(P_, Q, S_); const e = new THREE.Euler().setFromQuaternion(Q, "YXZ"); addSolid(P_.x, P_.z, e.y, S_.x / 2 + pad, S_.z / 2 + pad, P_.y - S_.y / 2, P_.y + S_.y / 2); }
function solidFromObj(o, hx, hz, lx = 0, lz = 0, h = 30) { o.updateMatrixWorld(true); const P_ = new THREE.Vector3(lx, 0, lz).applyMatrix4(o.matrixWorld), e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(o.matrixWorld), "YXZ"); addSolid(P_.x, P_.z, e.y, hx, hz, P_.y - 2, P_.y + h); }
function solidHit(p, px, pz, rad, y) { // 원(차의 한 부분)과 상자 충돌 → [밀어낼 x, z, 법선 x, z] 또는 null
  const k = (Math.floor(px / PCELL) + 5000) * 100000 + (Math.floor(pz / PCELL) + 5000), arr = SGRID.get(k); if (!arr) return null; let best = null;
  for (const so of arr) { if (y < so.y0 - 1 || y > so.y1) continue; const dx = px - so.x, dz = pz - so.z, lx = dx * so.c - dz * so.s, lz = dx * so.s + dz * so.c;
    const cx = clamp(lx, -so.hx, so.hx), cz = clamp(lz, -so.hz, so.hz); let ex = lx - cx, ez = lz - cz, d = Math.hypot(ex, ez), pen;
    if (d < 1e-4) { const ox = so.hx - Math.abs(lx), oz = so.hz - Math.abs(lz); if (ox < oz) { ex = Math.sign(lx) || 1; ez = 0; pen = ox + rad; } else { ex = 0; ez = Math.sign(lz) || 1; pen = oz + rad; } d = 1; } else { pen = rad - d; if (pen <= 0) continue; }
    const nlx = ex / d, nlz = ez / d, nx_ = nlx * so.c + nlz * so.s, nz_ = -nlx * so.s + nlz * so.c; // 상자 좌표 → 월드
    if (!best || pen > best[2]) best = [nx_, nz_, pen]; }
  return best;
}
function raySolid(ox, oz, dx, dz, maxL, y) { // 선이 처음 닿는 구조물까지 거리 (없으면 null)
  let best = maxL, hit = false; const seen = new Set();
  for (let d = 0; d <= maxL + PCELL; d += PCELL * 0.7) { const k = (Math.floor((ox + dx * d) / PCELL) + 5000) * 100000 + (Math.floor((oz + dz * d) / PCELL) + 5000), arr = SGRID.get(k); if (!arr) continue;
    for (const so of arr) { if (seen.has(so)) continue; seen.add(so); if (y !== undefined && (y < so.y0 - 0.5 || y > so.y1 + 0.5)) continue;
      const rx = ox - so.x, rz = oz - so.z, lx = rx * so.c - rz * so.s, lz = rx * so.s + rz * so.c, ldx = dx * so.c - dz * so.s, ldz = dx * so.s + dz * so.c;
      let t0 = 0, t1 = best; for (const [o, v, h] of [[lx, ldx, so.hx], [lz, ldz, so.hz]]) { if (Math.abs(v) < 1e-9) { if (Math.abs(o) > h) { t0 = 1; t1 = 0; } continue; } let a = (-h - o) / v, b = (h - o) / v; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
      if (t0 <= t1 && t0 < best) { best = t0; hit = true; } } }
  return hit ? best : null;
}
function collideSolids(p, tumble) { // 차 앞·가운데·뒤 세 원으로 검사
  const u = p.mesh.userData, rad = u.hwd * 0.95, fx = Math.sin(p.h), fz = Math.cos(p.h), isP = p === player;
  for (const o of [u.hl * 0.65, 0, -u.hl * 0.65]) {
    const px = p.x + fx * o, pz = p.z + fz * o, hit = solidHit(p, px, pz, rad, p.y + 0.8); if (!hit) continue;
    const [nx_, nz_, pen] = hit;
    if (tumble) { p.tc.x += nx_ * pen; p.tc.z += nz_ * pen; const vn = p.tv.x * nx_ + p.tv.z * nz_; if (vn < 0) { p.tv.x -= nx_ * vn * 1.3; p.tv.z -= nz_ * vn * 1.3; if (-vn > 8) applyDamage(p, dmgWall(-vn) * SMASH, hitLocal(p, -nx_, -nz_), null, "solid"); if (-vn > 4) sndImpact(-vn, p.x, p.z); } p.x = p.tc.x; p.z = p.tc.z; continue; }
    p.x += nx_ * pen; p.z += nz_ * pen; const vn = p.vx * nx_ + p.vz * nz_;
    if (vn < 0) { p.kSrc = "wall"; p.kSrcT = raceT; p.vx -= nx_ * vn * 1.25; p.vz -= nz_ * vn * 1.25; p.vx *= 0.9; p.vz *= 0.9; fromWorld(p); p.ry *= 0.5; p.ry += (o > 0 ? 1 : o < 0 ? -1 : 0) * Math.min(2, -vn * 0.04) * (Math.random() < 0.5 ? 1 : -1); // 모서리를 박으면 휙 돎
      if (-vn > 8) applyDamage(p, dmgWall(-vn) * SMASH, hitLocal(p, -nx_, -nz_), null, "solid");
      if (-vn > 26 && !p.dead) { const rr = vn * 0.12; enterTumble(p, -nz_ * rr, nx_ * rr, -vn * 0.2); }
      if (-vn > 4) sndImpact(-vn * 1.1, p.x, p.z); if (isP) shake = Math.max(shake, Math.min(1.2, -vn / 18));
      if (-vn > 6 && viewD(p.x, p.z) < 250) for (let k = 0; k < Math.min(20, -vn); k++) emit(sparks, px - nx_ * rad, p.y + 0.8, pz - nz_ * rad, (Math.random() - 0.5) * 10 + nx_ * 5, Math.random() * 6, (Math.random() - 0.5) * 10 + nz_ * 5, 0.4); }
  }
}

