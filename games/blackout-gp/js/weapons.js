// ================= 무기 =================
// 모두 기관포를 기본으로 달고, 특수무기 하나씩. 전부 앞만 노림
const massOf = c => (c === player ? MASS : c.mass) * (c.boostT > 0 ? (c === player ? 5 : 3) : 1);
function armAll() {
  for (const c of [player, ...ais]) { const sp = c === player ? mySpecial : (RIVAL_WPN[c.name] || "missile"); c.wpn = { sp, ammo: WEAPONS[sp].ammo, heat: 0, over: false, gunCd: 0, cd: 0, charge: 0, aimT: 0, gunBurst: 0, nextOK: L * (0.2 + Math.random() * 0.3) }; pileMesh(c, sp === "pile"); }
  for (const p_ of PROJ) { scene.remove(p_.mesh); if (p_.rope) scene.remove(p_.rope); } PROJ.length = 0; for (const t of TETHERS) scene.remove(t.rope); TETHERS.length = 0;
  for (const b of BEAMS) scene.remove(b.m); BEAMS.length = 0; for (const r of WRINGS) scene.remove(r.m); WRINGS.length = 0;
}
function findTarget(c, maxD, cone) { // 앞쪽 원뿔 안에서 가장 노리기 좋은 차
  const fx = Math.sin(c.h), fz = Math.cos(c.h); let best = null, bs = 1e9;
  for (const o of [player, ...ais]) { if (o === c || o.dead) continue; const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz); if (d < 3 || d > maxD || Math.abs(o.y - c.y) > 8) continue;
    const cs = (dx * fx + dz * fz) / d; if (cs < Math.cos(cone)) continue; const sc = d * (1 + (1 - cs) * 30); if (sc < bs) { bs = sc; best = o; } }
  return best;
}
const muzzle = c => { const u = c.mesh.userData, fx = Math.sin(c.h), fz = Math.cos(c.h); return [c.x + fx * u.hl * 0.9, c.y + 1.1, c.z + fz * u.hl * 0.9]; };
// ---- 소리
function sndGun(v) { if (v < 0.04) return; if (SFX.ready && sfx(Math.random() < 0.6 ? "gun1" : "gun2", v * 0.75, 0.62 + Math.random() * 0.12)) { shot((ctx, t) => tone(ctx, t, 0.1, "sine", 140, 46, 0.6 * v), 0.12); return; } shot((ctx, t) => { tone(ctx, t, 0.11, "sine", 150, 48, 0.75 * v); tone(ctx, t, 0.07, "triangle", 95, 40, 0.35 * v); nzs(ctx, t, 0.06, "lowpass", 900, 200, 0.45 * v, 0.9); }, 0.12); } // 퉁퉁 하는 묵직한 포
function sndLaunch(v) { if (v < 0.04) return; shot((ctx, t) => { nzs(ctx, t, 0.7, "bandpass", 500, 2600, 0.4 * v, 1.5); tone(ctx, t, 0.3, "sawtooth", 160, 60, 0.15 * v); }, 0.8); }
function sndRail(v) { if (v < 0.04) return; shot((ctx, t) => { tone(ctx, t, 0.45, "sine", 2600, 180, 0.35 * v); tone(ctx, t, 0.5, "sawtooth", 90, 40, 0.3 * v); nzs(ctx, t, 0.3, "highpass", 5000, 2000, 0.4 * v); }, 0.6); }
function sndTwang(v) { if (v < 0.04) return; shot((ctx, t) => { tone(ctx, t, 0.3, "triangle", 320, 110, 0.35 * v); nzs(ctx, t, 0.12, "bandpass", 3000, 1500, 0.25 * v, 2); }, 0.35); }
function sndHarpoon(v) { if (v < 0.04) return; shot((ctx, t) => { tone(ctx, t, 0.25, "sine", 120, 45, 0.9 * v); nzs(ctx, t, 0.18, "lowpass", 1800, 300, 0.6 * v, 0.8); tone(ctx, t, 0.35, "triangle", 260, 90, 0.25 * v, 0.02); }, 0.4); }
function sndShock(v) { if (v < 0.04) return; shot((ctx, t) => { tone(ctx, t, 0.7, "sine", 95, 28, 1.0 * v); nzs(ctx, t, 0.5, "lowpass", 2500, 150, 0.8 * v, 0.7); }, 0.8); }
const HITFX = { mark: 0, big: 0, tickCd: 0, hurt: [] }; // 맞힌 표시·맞은 방향
function sndTick(big) { shot((ctx, t) => { tone(ctx, t, big ? 0.12 : 0.05, "square", big ? 1400 : 2100, big ? 900 : 1800, big ? 0.16 : 0.09); if (big) tone(ctx, t, 0.15, "sine", 220, 90, 0.3); }, 0.15); }
function sndHurt(v) { shot((ctx, t) => { tone(ctx, t, 0.16, "sine", 85, 40, 0.6 * v); nzs(ctx, t, 0.1, "bandpass", 1200, 500, 0.25 * v, 1.5); }, 0.2); }
function sndWarn() { shot((ctx, t) => tone(ctx, t, 0.07, "square", 1250, 1250, 0.1), 0.1); }
// ---- 기관포
const tracerGeo = new THREE.BufferGeometry(), TR_N = 80, trPos = new Float32Array(TR_N * 6).fill(-9999), trLife = new Float32Array(TR_N); let trNext = 0;
tracerGeo.setAttribute("position", new THREE.BufferAttribute(trPos, 3)); const tracers = new THREE.LineSegments(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 })); tracers.frustumCulled = false; scene.add(tracers);
function addTracer(a, b) { const i = trNext; trNext = (i + 1) % TR_N; trPos.set([a[0], a[1], a[2], b[0], b[1], b[2]], i * 6); trLife[i] = 0.06; }
function rayHit(c, ox, oz, dx, dz, maxL, pad = 0.3) { // 정면으로 쏜 선에 처음 걸리는 차
  let best = null, bl = maxL;
  for (const o of [player, ...ais]) { if (o === c || o.dead || Math.abs(o.y - c.y) > 4) continue; const rx = o.x - ox, rz = o.z - oz, al = rx * dx + rz * dz; if (al < 0 || al > bl) continue;
    const perp = Math.abs(rx * dz - rz * dx), u = o.mesh.userData, cs = Math.abs(Math.sin(o.h - Math.atan2(dx, dz))), halfW = u.hwd * (1 - cs) + u.hl * cs; // 비스듬히 선 차는 옆면이 넓게 걸림
    if (perp < halfW + pad) { bl = al; best = o; } }
  return best ? [best, bl] : null;
}
function fireGun(c) {
  const w = c.wpn; if (w.over || w.gunCd > 0) return; w.gunCd = 0.075; w.heat += 0.05; if (w.heat >= 1) { w.over = true; if (c === player) setMsg("기관포 과열!", 0.8); }
  const m = muzzle(c), a = c.h + (Math.random() - 0.5) * 0.03, dx = Math.sin(a), dz = Math.cos(a), wallD = raySolid(m[0], m[2], dx, dz, 190, m[1]), rng = wallD ?? 190; let hit = rayHit(c, m[0], m[2], dx, dz, rng);
  const ph = rayProp(m[0], m[2], dx, dz, hit ? hit[1] : rng, m[1]); let end;
  if (ph) { hit = null; const [pr, L_] = ph; end = [m[0] + dx * L_, m[1] + (Math.random() - 0.5) * 0.5, m[2] + dz * L_]; damageProp(pr, 1, dx, dz, 14); if (c === player) { HITFX.mark = 0.12; } }
  if (hit) { const [tg, L_] = hit; end = [m[0] + dx * L_, tg.y + 0.9 + (Math.random() - 0.5) * 0.6, m[2] + dz * L_];
    applyDamage(tg, 0.22, hitLocal(tg, -dx, -dz), c, "gun"); tg.vx += dx * 0.12; tg.vz += dz * 0.12; fromWorld(tg);
    if (viewD(tg.x, tg.z) < 220) for (let k = 0; k < 3; k++) emit(sparks, end[0], end[1], end[2], (Math.random() - 0.5) * 8 - dx * 4, Math.random() * 5, (Math.random() - 0.5) * 8 - dz * 4, 0.25);
    if (tg === player) shake = Math.max(shake, 0.12); }
  else if (!end) { end = [m[0] + dx * rng, m[1] + (Math.random() - 0.5) * 1.2, m[2] + dz * rng]; if (wallD !== null && viewD(end[0], end[2]) < 200) emit(sparks, end[0], end[1], end[2], -dx * 5 + (Math.random() - 0.5) * 6, Math.random() * 4, -dz * 5 + (Math.random() - 0.5) * 6, 0.25); }
  recFx({ k: "gun", c, a: m.slice(), b: end.slice() });
  if (viewD(c.x, c.z) < 300) { addTracer(m, end); emit(sparks, m[0], m[1], m[2], c.vx + dx * 12, Math.random() * 2, c.vz + dz * 12, 0.08); sndGun(c === player ? 0.7 : distVol(c.x, c.z) * 0.8); if (c === player) shake = Math.max(shake, 0.05); }
}
// ---- 특수무기
function makeMissileMesh(col) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 8).rotateX(Math.PI / 2), toon(0xe8e8e8)); const n = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8).rotateX(Math.PI / 2), toon(col)); n.position.z = 1.45; g.add(b, n);
  for (const r of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.5), toon(col)); f.position.set(Math.sin(r) * 0.28, Math.cos(r) * 0.28, -0.9); f.rotation.z = -r; g.add(f); } g.scale.setScalar(1.3); scene.add(g); return g; }
function useSpecial(c) {
  const w = c.wpn; if (w.ammo <= 0 || w.cd > 0 || c.dead || c.tumble) return false; const sp = w.sp, m = muzzle(c), fx = Math.sin(c.h), fz = Math.cos(c.h), near = viewD(c.x, c.z) < 400, vol = c === player ? 1 : distVol(c.x, c.z);
  if (sp === "missile") { const tg = findTarget(c, 320, 0.45); const sp0 = Math.max(60, Math.hypot(c.vx, c.vz) + 30); PROJ.push({ type: "missile", x: m[0], y: m[1], z: m[2], vx: fx * sp0, vy: 2, vz: fz * sp0, owner: c, target: tg, life: 6.5, t: 0, idx: c.idx, mesh: makeMissileMesh(0xff3b3b) }); recProj(PROJ[PROJ.length - 1]); sndLaunch(vol); if (tg === player) setMsg("⚠ 미사일 접근!", 1.2); }
  else if (sp === "harpoon") { PROJ.push({ type: "harpoon", x: m[0], y: m[1], z: m[2], vx: c.vx + fx * 360, vy: 0.5, vz: c.vz + fz * 360, owner: c, target: null, life: 0.55, t: 0, idx: c.idx, mesh: (() => { const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6).rotateX(Math.PI / 2), toon(0x5a5e66)); const hd = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.0, 6).rotateX(Math.PI / 2), toon(0xd8d8d8)); hd.position.z = 1.6; g.add(sh, hd); for (const sd of [-1, 1]) { const barb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), toon(0xd8d8d8)); barb.position.set(sd * 0.25, 0, 1.0); barb.rotation.y = sd * 0.5; g.add(barb); } g.scale.setScalar(1.6); scene.add(g); return g; })(), rope: (() => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 5).translate(0, 0.5, 0).rotateX(Math.PI / 2), toon(0x2a2a2a)); scene.add(r); return r; })() });
    recProj(PROJ[PROJ.length - 1]); sndHarpoon(vol); if (c === player) { shake = Math.max(shake, 0.45); } if (!c.tumble) { c.vf -= 1.5; toWorld(c); } }
  else if (sp === "rail") fireRail(c);
  else if (sp === "pile") firePile(c);
  w.ammo--; w.cd = sp === "rail" ? 1.2 : sp === "pile" ? 0.9 : 1.6; if (c !== player) w.nextOK = c.prog + L * lapsTotal / (WEAPONS[sp].ammo + 1) * (0.4 + Math.random() * 0.4) * (sp === "pile" ? 0.45 : 1); return true;
}
// ================= 폭발 효과 (three.quarks 파티클 라이브러리) =================
const QFX = (() => {
  const Q = THREE.QUARKS; if (!Q) return null; // 라이브러리를 못 불러오면 예전 파티클로
  try {
    const br = new Q.BatchedRenderer(); scene.add(br);
    const tex = (draw) => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); draw(g); const t = new THREE.CanvasTexture(c); return t; };
    const soft = tex(g => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.75)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    const puff = tex(g => { for (let k = 0; k < 9; k++) { const x = 34 + Math.random() * 60, y = 34 + Math.random() * 60, rr = 22 + Math.random() * 20, r = g.createRadialGradient(x, y, 0, x, y, rr); r.addColorStop(0, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); } }); // 뭉게뭉게 연기
    const ring = tex(g => { const r = g.createRadialGradient(64, 64, 34, 64, 64, 62); r.addColorStop(0, "rgba(255,255,255,0)"); r.addColorStop(0.55, "rgba(255,255,255,.9)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    const mAdd = (map) => new THREE.MeshBasicMaterial({ map, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const M = { fire: mAdd(soft), spark: mAdd(soft), ring: mAdd(ring), smoke: new THREE.MeshBasicMaterial({ map: puff, transparent: true, depthWrite: false, color: 0xffffff }) };
    const V4 = (r, g, b, a) => new THREE.Vector4(r, g, b, a), curve = (a, b, c, d) => new Q.PiecewiseBezier([[new Q.Bezier(a, b, c, d), 0]]);
    const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const live = [];
    function sys(p) { const ps = new Q.ParticleSystem(Object.assign({ duration: 0.3, looping: false, autoDestroy: true, worldSpace: true, emissionOverTime: new Q.ConstantValue(0) }, p)); br.addSystem(ps); scene.add(ps.emitter); return ps; }
    function boom(x, y, z, k = 1) { // k: 크기 (차 폭발 1, 미사일 0.6)
      const list = [
        sys({ shape: new Q.SphereEmitter({ radius: 1.6 * k }), startLife: new Q.IntervalValue(0.45, 0.95), startSpeed: new Q.IntervalValue(5 * k, 15 * k), startSize: new Q.IntervalValue(4 * k, 8.5 * k), startColor: new Q.ConstantColor(V4(1, 0.95, 0.75, 1)),
          emissionBursts: [{ time: 0, count: Math.round(34 * k), cycle: 1, interval: 0.01, probability: 1 }], material: M.fire, renderMode: Q.RenderMode.BillBoard, startRotation: new Q.IntervalValue(0, 6.28),
          behaviors: [new Q.ColorOverLife(new Q.Gradient([[new Q.ColorRange(V4(1, 0.9, 0.6, 0.8), V4(1, 0.5, 0.12, 0.7)), 0], [new Q.ColorRange(V4(1, 0.5, 0.12, 0.7), V4(0.4, 0.06, 0.02, 0)), 0.4]])), new Q.SizeOverLife(curve(0.6, 1.2, 1.35, 1.1)), new Q.SpeedOverLife(curve(1, 0.35, 0.1, 0))] }), // 불덩이
        sys({ shape: new Q.SphereEmitter({ radius: 2 * k }), startLife: new Q.IntervalValue(2.2, 4), startSpeed: new Q.IntervalValue(2 * k, 7 * k), startSize: new Q.IntervalValue(6 * k, 11 * k), startColor: new Q.ConstantColor(V4(0.16, 0.14, 0.13, 0.8)),
          emissionBursts: [{ time: 0.05, count: Math.round(30 * k), cycle: 1, interval: 0.01, probability: 1 }], material: M.smoke, renderMode: Q.RenderMode.BillBoard, startRotation: new Q.IntervalValue(0, 6.28),
          behaviors: [new Q.ColorOverLife(new Q.Gradient([[new Q.ColorRange(V4(0.2, 0.17, 0.15, 0.75), V4(0.32, 0.3, 0.28, 0.55)), 0], [new Q.ColorRange(V4(0.32, 0.3, 0.28, 0.55), V4(0.45, 0.43, 0.41, 0)), 0.5]])), new Q.SizeOverLife(curve(0.5, 1.3, 1.8, 2.2)), new Q.ApplyForce(new THREE.Vector3(0, 1, 0), new Q.ConstantValue(3.5)), new Q.SpeedOverLife(curve(1, 0.4, 0.2, 0.1)), new Q.RotationOverLife(new Q.IntervalValue(-0.6, 0.6), false)] }), // 검은 연기
        sys({ shape: new Q.SphereEmitter({ radius: 0.8 * k }), startLife: new Q.IntervalValue(0.5, 1.3), startSpeed: new Q.IntervalValue(18 * k, 42 * k), startSize: new Q.IntervalValue(0.35, 0.7), startColor: new Q.ConstantColor(V4(1, 0.75, 0.3, 1)),
          emissionBursts: [{ time: 0, count: Math.round(70 * k), cycle: 1, interval: 0.01, probability: 1 }], material: M.spark, renderMode: Q.RenderMode.StretchedBillBoard, speedFactor: 0.05,
          behaviors: [new Q.ApplyForce(new THREE.Vector3(0, -1, 0), new Q.ConstantValue(24)), new Q.ColorOverLife(new Q.ColorRange(V4(1, 0.85, 0.4, 1), V4(1, 0.3, 0.05, 0)))] }), // 튀는 불똥
        sys({ shape: new Q.PointEmitter ? new Q.PointEmitter() : new Q.SphereEmitter({ radius: 0.01 }), startLife: new Q.ConstantValue(0.45), startSpeed: new Q.ConstantValue(0), startSize: new Q.ConstantValue(1), startColor: new Q.ConstantColor(V4(1, 0.8, 0.55, 0.9)),
          emissionBursts: [{ time: 0, count: 1, cycle: 1, interval: 0.01, probability: 1 }], material: M.ring, renderMode: Q.RenderMode.Mesh, instancingGeometry: ringGeo,
          behaviors: [new Q.SizeOverLife(curve(2, 14 * k, 24 * k, 30 * k)), new Q.ColorOverLife(new Q.ColorRange(V4(1, 0.8, 0.55, 0.9), V4(1, 0.4, 0.1, 0)))] }), // 바닥을 퍼져나가는 충격파 링
      ];
      list[0].emitter.position.set(x, y + 1, z); list[1].emitter.position.set(x, y + 1.5, z); list[2].emitter.position.set(x, y + 1, z); list[3].emitter.position.set(x, y + 0.25, z);
      for (const ps of list) { ps.emitter.updateMatrixWorld(true); live.push({ ps, t: 0, life: 5 }); }
    }
    function update(dt) { br.update(dt); for (let i = live.length - 1; i >= 0; i--) { const L_ = live[i]; L_.t += dt; if (L_.t > L_.life) { try { br.deleteSystem(L_.ps); scene.remove(L_.ps.emitter); } catch (e) {} live.splice(i, 1); } } }
    return { boom, update };
  } catch (e) { console.warn("quarks 초기화 실패", e); return null; }
})();
function blast(x, y, z, owner, direct) { // 미사일 폭발: 직격은 크게, 주변은 조금
  recFx({ k: "blast", x, y, z });
  for (const o of [player, ...ais]) { if (o.dead) continue; const d = Math.hypot(o.x - x, o.z - z, (o.y + 0.8) - y); if (d > 11) continue;
    if (o !== direct && d > 1 && raySolid(x, z, (o.x - x) / d, (o.z - z) / d, d, y) !== null) continue;
    const k = o === direct ? 1 : (1 - d / 11) * 0.45, ux = (o.x - x) / (d || 1), uz = (o.z - z) / (d || 1); o.kickT = 1.2;
    applyDamage(o, 20 * k, hitLocal(o, -ux, -uz), owner, "missile");
    if (o.tumble) { o.tv.x += ux * 8 * k; o.tv.z += uz * 8 * k; o.tv.y += 7 * k; } else { o.vx += ux * 10 * k; o.vz += uz * 10 * k; fromWorld(o); o.ry += (Math.random() - 0.5) * 3 * k; if (k > 0.6 && Math.random() < 0.25) (window.__tlog && window.__tlog.push("missile")), enterTumble(o, (Math.random() - 0.5) * 6 * k, (Math.random() - 0.5) * 6 * k, 7 * k); else o.vy = (o.vy || 0) + 5 * k; }
    if (o === player) shake = Math.max(shake, 1.1 * k + 0.2); }
  for (const pr of propsNear(x, z, 10)) { const d = Math.hypot(pr.x - x, pr.z - z); if (d < 9) { const k = 1 - d / 9; breakProp(pr, (pr.x - x) / (d || 1) * 18 * k, 6 + 8 * k, (pr.z - z) / (d || 1) * 18 * k); } }
  const near = viewD(x, z);
  if (near < 400) { if (QFX) QFX.boom(x, y - 0.8, z, 0.6); else { for (let k = 0; k < 70; k++) emit(boostFire, x, y, z, (Math.random() - 0.5) * 22, Math.random() * 12, (Math.random() - 0.5) * 22, 0.6); for (let k = 0; k < 25; k++) emit(smokeD, x, y + 0.5, z, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, 1.8); } sndImpact(26, x, z); sfx("boom2", distVol(x, z) * 1.1, 0.9 + Math.random() * 0.2); shot((ctx, t) => tone(ctx, t, 0.9, "sine", 110, 30, 0.8 * distVol(x, z)), 1); }
}
// ---- 지뢰: 차 뒤에 떨어뜨림 → 1초 뒤 무장(빨간 불 깜빡) → 밟으면 폭발하며 차가 공중으로
function makeMineMesh() { const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.22, 16), toon(0x2a2c30)); base.position.y = 0.11; g.add(base);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.06, 16, 1, true), new THREE.MeshToonMaterial({ map: hazStripe(), gradientMap: grad, side: THREE.DoubleSide })); ring.position.y = 0.16; g.add(ring);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.12, 12), toon(0x44474e)); top.position.y = 0.27; g.add(top);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 })); lamp.position.y = 0.36; g.add(lamp); g.userData.lamp = lamp;
  for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), toon(0x8a8a8a)); const a = k * Math.PI / 2 + 0.4; p.position.set(Math.cos(a) * 0.36, 0.37, Math.sin(a) * 0.36); g.add(p); }
  g.scale.setScalar(1.35); scene.add(g); return g; }
let _hzStripe = null; function hazStripe() { if (_hzStripe) return _hzStripe; const c = document.createElement("canvas"); c.width = 64; c.height = 16; const x = c.getContext("2d"); x.fillStyle = "#151515"; x.fillRect(0, 0, 64, 16); x.fillStyle = "#f2c21a"; for (let k = -16; k < 80; k += 16) { x.beginPath(); x.moveTo(k, 16); x.lineTo(k + 8, 16); x.lineTo(k + 16, 0); x.lineTo(k + 8, 0); x.closePath(); x.fill(); } _hzStripe = new THREE.CanvasTexture(c); _hzStripe.wrapS = THREE.RepeatWrapping; _hzStripe.repeat.set(3, 1); return _hzStripe; }
function mineGround(q) { q.idx = nearest(q.x, q.z, q.idx); const t = TRK[q.idx], lat = (q.x - t.x) * nx(t) + (q.z - t.z) * nz(t); q.y = surfH(t.s, lat); }
function dropMine(c, vol) {
  const fx = Math.sin(c.h), fz = Math.cos(c.h), hl = c.mesh.userData.hl || 3, q = { type: "mine", x: c.x - fx * (hl + 1.4), y: c.y, z: c.z - fz * (hl + 1.4), vx: c.vx * 0.25, vy: 0, vz: c.vz * 0.25, owner: c, life: 50, t: 0, idx: c.idx, mesh: makeMineMesh() };
  mineGround(q); q.mesh.position.set(q.x, q.y, q.z); PROJ.push(q);
  const mines = PROJ.filter(p => p.type === "mine"); if (mines.length > 14) { const o = mines[0]; scene.remove(o.mesh); PROJ.splice(PROJ.indexOf(o), 1); } /* 너무 많이 깔리면 오래된 것부터 치움 */
  if (vol > 0.04) shot((ctx, t) => { tone(ctx, t, 0.08, "square", 420, 260, 0.14 * vol); tone(ctx, t, 0.18, "sine", 140, 70, 0.3 * vol, 0.06); }, 0.3);
}
function stepMine(q, dt) { /* true면 제거 */
  if (q.t < 0.7) { q.x += q.vx * dt; q.z += q.vz * dt; q.vx *= Math.pow(0.02, dt); q.vz *= Math.pow(0.02, dt); mineGround(q); }
  const armed = q.t > 1.0, lamp = q.mesh.userData.lamp; lamp.material.color.setHex(!armed ? 0xffaa00 : Math.floor(q.t * 3.5) % 2 ? 0xff2020 : 0x380000);
  if (armed && !q.beeped) { q.beeped = true; const v = distVol(q.x, q.z); if (v > 0.06) shot((ctx, t) => tone(ctx, t, 0.07, "square", 1500, 1500, 0.08 * v), 0.1); }
  let hit = null; if (armed) for (const o of [player, ...ais]) { if (o.dead || (o === q.owner && q.t < 3)) continue; if (Math.abs(o.y - q.y) > 2.5) continue; const r = Math.max(2.0, (o.mesh.userData.hwd || 1.2) + 0.7); if ((o.x - q.x) ** 2 + (o.z - q.z) ** 2 < r * r) { hit = o; break; } }
  if (hit) { blast(q.x, q.y + 0.8, q.z, q.owner, hit);
    if (!hit.dead) { if (hit.tumble) { hit.tv.y += 7; } else if (Math.random() < 0.55) enterTumble(hit, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, 9); else { hit.vy = 8; hit.ry += (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2); hit.vf *= 0.75; } }
    if (hit === player) { setMsg("지뢰!", 1); shake = Math.max(shake, 1.3); } else if (q.owner === player) setMsg(`${hit.name} 지뢰 밟음!`, 1.2);
    scene.remove(q.mesh); return true; }
  if (q.life <= 0) { scene.remove(q.mesh); return true; }
  q.mesh.position.set(q.x, q.y, q.z); return false;
}
// ---- 대구경 포: 포구 화염 + 연기 + 날아가는 철갑탄 예광 + 남는 연기 줄
function sndCannon(v) { if (v < 0.04) return; if (SFX.ready) { sfx("boom2", Math.min(1.5, v * 1.3), 0.85 + Math.random() * 0.1); sfx("gun1", v * 0.9, 0.38); } shot((ctx, t) => { tone(ctx, t, 0.5, "sine", 120, 28, 1.0 * v); nzs(ctx, t, 0.35, "lowpass", 3000, 200, 0.7 * v, 0.7); }, 0.6); }
function cannonFx(c, m, dx, dz, len, vis) {
  const near = viewD(m[0], m[2]) < 450;
  if (!vis) { recFx({ k: "can", c, m: m.slice(), dx, dz, len }); if (!c.tumble) { c.vf -= 2; toWorld(c); } /* 반동 (차가 들리지 않게 살짝만) */
  if (c === player) { shake = Math.max(shake, 0.9); flashT = Math.max(flashT, 0.25); } }
  if (!near) return;
  for (let k = 0; k < 26; k++) { const a = (Math.random() - 0.5) * 0.6, sp = 12 + Math.random() * 26; emit(boostFire, m[0] + dx * 1.2, m[1], m[2] + dz * 1.2, (vis ? 0 : c.vx) + (dx * Math.cos(a) - dz * Math.sin(a)) * sp, (Math.random() - 0.3) * 5, c.vz + (dz * Math.cos(a) + dx * Math.sin(a)) * sp, 0.18); } /* 포구 화염 */
  for (let k = 0; k < 14; k++) emit(smoke, m[0] + dx * 2, m[1], m[2] + dz * 2, c.vx * 0.5 + dx * (4 + Math.random() * 8) + (Math.random() - 0.5) * 6, 1 + Math.random() * 3, c.vz * 0.5 + dz * (4 + Math.random() * 8) + (Math.random() - 0.5) * 6, 1.6);
  for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) emit(smoke, m[0], m[1], m[2], c.vx * 0.5 + dz * sd * (6 + Math.random() * 6), 1 + Math.random() * 2, c.vz * 0.5 - dx * sd * (6 + Math.random() * 6), 1.3); /* 옆으로 터지는 화염 가스 */
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5, 6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 7, 6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); shell.add(glow);
  shell.rotation.y = Math.atan2(dx, dz); shell.position.set(m[0], m[1], m[2]); scene.add(shell);
  const V = 650; BEAMS.push({ m: shell, t: 0, upd: (b, dt) => { const d = Math.min(len, b.t * V); b.m.position.set(m[0] + dx * d, m[1] - d * 0.002, m[2] + dz * d); if (d >= len) { if (len < 449 && QFX) QFX.boom(m[0] + dx * len, m[1] - 0.8, m[2] + dz * len, 0.3); return true; } return false; } });
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, len, 6, 1, true).rotateX(Math.PI / 2).translate(0, 0, len / 2), new THREE.MeshBasicMaterial({ color: 0xd8d4cc, transparent: true, opacity: 0.45, depthWrite: false }));
  trail.layers.set(1); trail.rotation.y = Math.atan2(dx, dz); trail.position.set(m[0], m[1], m[2]); trail.scale.z = 0.001; scene.add(trail);
  BEAMS.push({ m: trail, t: 0, upd: (b, dt) => { b.m.scale.z = Math.min(1, b.t * V / len + 0.001); const f = b.t / 1.6; b.m.material.opacity = 0.45 * (1 - f); b.m.scale.x = b.m.scale.y = 1 + f * 5; if (f >= 1) { b.m.geometry.dispose(); return true; } return false; } });
}
// ---- 파일벙커: 차 앞 쇠말뚝. 앞차에 바짝 대고 누르면 쾅 튀어나가 날려버림
function pileMesh(c, on) { const u = c.mesh.userData; if (u.pb) { c.mesh.remove(u.pb); u.pb = null; } if (!on) return;
  const g = new THREE.Group(), fz = (u.hl / 0.9) / CS, y = 0.62;
  const hous = outlined(new THREE.BoxGeometry(0.56, 0.5, 1.3), 0x2a2c30, 0.03); hous.position.set(0, y, fz - 0.45); g.add(hous);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 1.32), new THREE.MeshToonMaterial({ map: hazStripe(), gradientMap: grad })); band.position.set(0, y + 0.12, fz - 0.45); g.add(band);
  for (const sx of [-0.2, 0.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8).rotateX(Math.PI / 2), toon(0x9a9a9a)); p.position.set(sx, y - 0.2, fz - 0.6); g.add(p); }
  const spike = new THREE.Group(); const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 10).rotateX(Math.PI / 2), toon(0xd0d0d0)); rod.position.z = -0.4; spike.add(rod);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 10).rotateX(Math.PI / 2), toon(0xe8e8e8)); tip.position.z = 0.75; spike.add(tip);
  const z0 = fz + 0.05; spike.position.set(0, y, z0); g.add(spike); g.userData = { spike, z0 };
  g.traverse(o => { if (o.isMesh && o.material !== outlineMat) o.castShadow = true; }); c.mesh.add(g); u.pb = g; }
function pileAnim(c, dt) { const pb = c.mesh.userData.pb; if (!pb) return; c.pbT = (c.pbT ?? 9) + dt; const t_ = c.pbT, ex = t_ < 0.05 ? t_ / 0.05 : Math.max(0, 1 - (t_ - 0.05) / 0.5); pb.userData.spike.position.z = pb.userData.z0 + ex * 1.9; }
function pileTarget(c) { /* 말뚝이 닿는 앞차 */
  const u = c.mesh.userData, fx = Math.sin(c.h), fz = Math.cos(c.h), F = [c.x + fx * u.hl / 0.9, c.z + fz * u.hl / 0.9]; let best = null, bd = 1e9;
  for (const o of [player, ...ais]) { if (o === c || o.dead) continue; const rx = o.x - F[0], rz = o.z - F[1], al = rx * fx + rz * fz, pp = Math.abs(rx * fz - rz * fx), ol = o.mesh.userData; if (al < -1 || al > (ol.hl || 3) + 4.5 || pp > (ol.hwd || 1.2) + 1.0 || Math.abs(o.y - c.y) > 3) continue; if (al < bd) { bd = al; best = o; } }
  return best;
}
function firePile(c) {
  const u = c.mesh.userData, fx = Math.sin(c.h), fz = Math.cos(c.h), F = [c.x + fx * (u.hl / 0.9 + 1.2), c.y + 0.8, c.z + fz * (u.hl / 0.9 + 1.2)], o = pileTarget(c), v = c === player ? 1 : distVol(c.x, c.z); c.pbT = 0;
  if (v > 0.04) shot((ctx, t) => { nzs(ctx, t, 0.15, "highpass", 6000, 3000, 0.4 * v); tone(ctx, t, 0.12, "square", 220, 90, 0.25 * v); }, 0.2);
  for (const pr of propsNear(F[0], F[2], 5)) { const dx = pr.x - F[0], dz = pr.z - F[2]; if (dx * fx + dz * fz > -1) breakProp(pr, fx * 30 + c.vx * 0.5, 7, fz * 30 + c.vz * 0.5); }
  if (!o) recFx({ k: "pile", c, hit: null });
  if (!o) { if (v > 0.04) sfx("clank" + (1 + Math.floor(Math.random() * 4)), v * 0.6, 1.3); return; }
  o.kickT = 1.4; applyDamage(o, 28, hitLocal(o, -fx, -fz), c, "pile");
  if (!o.dead) { if (o.tumble) { o.tv.x += fx * 22; o.tv.z += fz * 22; o.tv.y += 6; } else { toWorld(o); o.vx += fx * 24 + c.vx * 0.15; o.vz += fz * 24 + c.vz * 0.15; fromWorld(o); if (Math.random() < 0.6) enterTumble(o, fz * (Math.random() < 0.5 ? -1 : 1) * 6, -fx * (Math.random() < 0.5 ? -1 : 1) * 6, 7); else { o.vy = 6; o.ry += (Math.random() - 0.5) * 5; } } }
  if (!c.tumble) { c.vf -= 6; toWorld(c); }
  const hx = o.x - fx * (o.mesh.userData.hl || 3) * 0.8, hz = o.z - fz * (o.mesh.userData.hl || 3) * 0.8;
  recFx({ k: "pile", c, hit: [hx, o.y, hz] });
  if (viewD(hx, hz) < 400) { if (QFX) QFX.boom(hx, o.y - 0.3, hz, 0.38); for (let k = 0; k < 40; k++) emit(sparks, hx, o.y + 0.8, hz, (Math.random() - 0.5) * 22 + fx * 18, Math.random() * 10, (Math.random() - 0.5) * 22 + fz * 18, 0.5); }
  if (v > 0.04 || distVol(o.x, o.z) > 0.04) { const vv = Math.max(v, distVol(o.x, o.z)); sfx("boom2", Math.min(1.4, vv * 1.2), 1.15); sfx("clank" + (1 + Math.floor(Math.random() * 4)), vv, 0.7); sndImpact(20, o.x, o.z); }
  if (c === player) { shake = Math.max(shake, 1.2); flashT = Math.max(flashT, 0.3); setMsg("쾅!", 0.6); } if (o === player) { shake = Math.max(shake, 1.4); setMsg("파일벙커에 맞음!", 1); }
}
function fireRail(c) {
  const m = muzzle(c); let dx = Math.sin(c.h), dz = Math.cos(c.h); // 조준 보정 없이 정면으로
  let len = raySolid(m[0], m[2], dx, dz, 450, m[1]) ?? 450; /* 구조물에서 멈춤 */
  for (const o of [player, ...ais]) { if (o === c || o.dead) continue; const rx = o.x - m[0], rz = o.z - m[2], al = rx * dx + rz * dz; if (al < 0 || al > len) continue; const perp = Math.abs(rx * dz - rz * dx); if (perp > o.mesh.userData.hwd + 0.8 || Math.abs(o.y - c.y) > 5) continue;
    applyDamage(o, 24, hitLocal(o, -dx, -dz), c, "rail"); o.kickT = 1.2; const side = Math.sign(rx * dz - rz * dx) || 1;
    if (o.tumble) { o.tv.x += dx * 12; o.tv.z += dz * 12; } else { o.vx += dx * 12 + dz * side * 6; o.vz += dz * 12 - dx * side * 6; fromWorld(o); o.ry += side * 1.6; if (Math.random() < 0.2) (window.__tlog && window.__tlog.push("rail")), enterTumble(o, dx * 4 * side, dz * 4 * side, 5); }
    if (viewD(o.x, o.z) < 400) { if (QFX) QFX.boom(o.x, o.y - 0.4, o.z, 0.4); sndImpact(20, o.x, o.z); } if (viewD(o.x, o.z) < 400) for (let k = 0; k < 30; k++) emit(sparks, o.x, o.y + 1, o.z, (Math.random() - 0.5) * 20 + dx * 15, Math.random() * 10, (Math.random() - 0.5) * 20 + dz * 15, 0.5);
    if (o === player) shake = Math.max(shake, 1); }
  { let o = 0; while (o < len) { const ph = rayProp(m[0] + dx * o, m[2] + dz * o, dx, dz, len - o, m[1]); if (!ph) break; breakProp(ph[0], dx * 30, 6, dz * 30); o += ph[1] + 0.5; } } // 레일건은 오브젝트도 관통하며 다 부숨
  cannonFx(c, m, dx, dz, len);
  sndCannon(c === player ? 1 : distVol(c.x, c.z));
}
function fireShock(c) {
  const fx = Math.sin(c.h), fz = Math.cos(c.h), R = 48;
  for (const o of [player, ...ais]) { if (o === c || o.dead) continue; const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz); if (d > R || d < 1) continue; const cs = (dx * fx + dz * fz) / d; if (cs < Math.cos(0.6)) continue;
    if (raySolid(c.x, c.z, dx / d, dz / d, d, c.y + 1) !== null) continue;
    const k = 1 - d / R, ux = dx / d, uz = dz / d, J = 22 * k; o.kickT = 1.2; applyDamage(o, 10 * k, hitLocal(o, -ux, -uz), c, "shock");
    if (o.tumble) { o.tv.x += ux * J; o.tv.z += uz * J; o.tv.y += 5 * k; continue; }
    o.vx += ux * J; o.vz += uz * J; fromWorld(o); const lat = J * Math.abs(ux * Math.cos(o.h) - uz * Math.sin(o.h)); if (lat > 11) { const rr = -(ux * Math.cos(o.h) - uz * Math.sin(o.h)) * J * 0.35; (window.__tlog && window.__tlog.push("shock")), enterTumble(o, Math.sin(o.h) * rr, Math.cos(o.h) * rr, 6 * k); } else { o.ry += (Math.random() - 0.5) * 2.5 * k; o.vy = (o.vy || 0) + 4 * k; }
    if (o === player) shake = Math.max(shake, 0.9 * k + 0.3); }
  for (const pr of propsNear(c.x, c.z, R)) { const dx = pr.x - c.x, dz = pr.z - c.z, d = Math.hypot(dx, dz); if (d > R || d < 1 || (dx * fx + dz * fz) / d < Math.cos(0.6)) continue; const k = 1 - d / R; breakProp(pr, dx / d * 25 * k + c.vx, 5 + 6 * k, dz / d * 25 * k + c.vz); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.35, 6, 32, Math.PI * 0.75), new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.order = "YXZ"; ring.rotation.set(-Math.PI / 2, c.h, Math.PI * 0.125 + Math.PI / 2); ring.position.set(c.x + fx * 3, c.y + 1, c.z + fz * 3); scene.add(ring); WRINGS.push({ m: ring, t: 0, vx: c.vx, vz: c.vz });
  if (viewD(c.x, c.z) < 350) for (let k = 0; k < 30; k++) { const a = c.h + (Math.random() - 0.5) * 1.2, sp = 20 + Math.random() * 25; emit(dust, c.x + fx * 4, c.y + 0.6, c.z + fz * 4, Math.sin(a) * sp + c.vx, Math.random() * 3, Math.cos(a) * sp + c.vz, 0.8); }
  sndShock(c === player ? 1 : distVol(c.x, c.z));
}
function attachTether(a, b) {
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 5).translate(0, 0.5, 0).rotateX(Math.PI / 2), toon(0x2a2a2a)); scene.add(rope);
  TETHERS.push({ a, b, t: 0, life: 2.8, len: Math.hypot(b.x - a.x, b.z - a.z), rope }); if (REC.on && !REPLAY.on) { const r = { a, b, t0: raceT, t1: 1e9 }; REC.th.push(r); TETHERS[TETHERS.length - 1].rec = r; }
  applyDamage(b, 4, hitLocal(b, (a.x - b.x) / 10, (a.z - b.z) / 10), a, "harpoon"); sndImpact(10, b.x, b.z); if (b === player) { setMsg("작살에 걸림!", 1); shake = Math.max(shake, 0.5); } if (a === player) setMsg("걸었다! 좌우로 휘두르고 X로 당겨", 1.4);
}
function reelIn(T) { // 다시 누르면 확 당김: 상대는 내 쪽으로 끌려오고 나는 앞으로 튀어나감, 잠시 뒤 줄이 끊어짐
  if (T.reeled) return; T.reeled = true; T.life = T.t + 0.35; const { a, b } = T, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
  const ma = massOf(a), mb = massOf(b), J = 26, ja = J * mb / (ma + mb), jb = J * ma / (ma + mb);
  if (a.tumble) { a.tv.x += ux * ja; a.tv.z += uz * ja; } else { a.vx += ux * ja; a.vz += uz * ja; fromWorld(a); }
  const st = a === player ? input.steer : (a.yankDir || 0), rx = Math.cos(a.h), rz = -Math.sin(a.h);
  if (b.tumble) { b.tv.x -= ux * jb; b.tv.z -= uz * jb; } else { b.vx -= ux * jb + rx * st * 8; b.vz -= uz * jb + rz * st * 8; fromWorld(b); b.ry += (Math.random() - 0.5) * 2.5 + st * 1.5; b.kickT = 1.2;
    const latDv = Math.abs((ux * jb + rx * st * 8) * Math.cos(b.h) - (uz * jb + rz * st * 8) * Math.sin(b.h)); if (latDv > 14) { const rr = (Math.random() < 0.5 ? -1 : 1) * latDv * 0.3; enterTumble(b, Math.sin(b.h) * rr, Math.cos(b.h) * rr, 4); } }
  applyDamage(b, 6, hitLocal(b, -ux, -uz), a, "harpoon"); sndImpact(16, b.x, b.z); sndHarpoon(a === player || b === player ? 1 : distVol(a.x, a.z));
  if (a === player) { shake = Math.max(shake, 0.7); setMsg("당겨!", 0.6); } if (b === player) shake = Math.max(shake, 0.9);
}
function releaseTether(T, snap) {
  const { a, b } = T; scene.remove(T.rope); TETHERS.splice(TETHERS.indexOf(T), 1); if (T.rec) T.rec.t1 = raceT;
  if (snap && !a.dead && !b.dead) { // 놓는 순간: 나는 앞으로 튕겨나가고, 상대는 옆으로 휙
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1; if (!a.tumble) { a.vx += dx / d * 9; a.vz += dz / d * 9; fromWorld(a); }
    const st = a === player ? input.steer : (a.yankDir || 1); if (!b.tumble && Math.abs(st) > 0.3) { const rx = Math.cos(a.h), rz = -Math.sin(a.h), J = 15 * Math.sign(st); b.vx += rx * J; b.vz += rz * J; fromWorld(b); b.ry += Math.sign(st) * 2; const lat = Math.abs(rx * Math.cos(b.h) - rz * Math.sin(b.h)) * 15; if (lat > 11) { const rr = -Math.sign(st) * 5; (window.__tlog && window.__tlog.push("harpoon")), enterTumble(b, Math.sin(b.h) * rr, Math.cos(b.h) * rr, 4); } }
    sndTwang(a === player || b === player ? 1 : distVol(a.x, a.z)); }
}
function stepWeapons(dt) {
  const racing = state === "race";
  // 플레이어 조작
  const pw = player.wpn;
  if (pw && racing && !player.dead) {
    if (input.gun) fireGun(player);
    if (pw.sp === "rail") { if (input.sp && pw.ammo > 0 && pw.cd <= 0) pw.charge = Math.min(1, pw.charge + dt / 0.9); else { if (pw.charge >= 1) useSpecial(player); else if (pw.charge > 0.05 && !input.sp) setMsg("장전 부족", 0.5); pw.charge = 0; } }
    else if (input.spPress) { const myT = TETHERS.find(T => T.a === player); if (myT) reelIn(myT); else useSpecial(player); }
  }
  // 라이벌 사격
  if (racing && !window.__bgpGhost && raceT > 9) for (const a of ais) {
    const w = a.wpn; if (!w || a.dead || a.done || a.tumble) continue;
    const tg = findTarget(a, 140, 0.13); if (tg && !w.over && w.heat < 0.8 && (w.gunBurst > 0 || Math.random() < dt * 1.1)) { if (w.gunBurst <= 0) w.gunBurst = 0.5 + Math.random() * 0.8; fireGun(a); } w.gunBurst -= dt;
    if (w.cd > 0 || w.ammo <= 0 || a.prog < (w.nextOK || 0) || raceT < 16) continue; // 특수무기는 레이스 전체에 나눠서 씀
    const lastLap = a.prog >= (lapsTotal - 1) * L, keep = !lastLap && w.ammo <= 1 && Math.random() < 0.97; // 마지막 한 발은 마지막 바퀴용으로 아끼는 편
    if (w.sp === "missile") { const t2 = findTarget(a, 280, 0.35); if (t2 && Math.hypot(t2.x - a.x, t2.z - a.z) > 40 && !keep && Math.random() < dt * 1.0) useSpecial(a); }
    else if (w.sp === "harpoon") { const myT = TETHERS.find(T => T.a === a); if (myT) { if (myT.t > 0.8 && !myT.reeled && Math.random() < dt * 2.5) reelIn(myT); } else { const t2 = findTarget(a, 130, 0.06); if (t2 && Math.hypot(t2.x - a.x, t2.z - a.z) > 15 && !keep && Math.random() < dt * 0.7) { a.yankDir = Math.random() < 0.5 ? -1 : 1; useSpecial(a); } } }
    else if (w.sp === "rail") { const t2 = findTarget(a, 420, 0.05); if (t2 && !keep) { w.aimT += dt; if (w.aimT > 0.9 && Math.random() < dt * 2) { useSpecial(a); w.aimT = 0; } } else w.aimT = Math.max(0, w.aimT - dt * 2); }
    else if (w.sp === "pile") { if (pileTarget(a) && !keep && Math.random() < dt * 4) useSpecial(a); }
  }
  for (const c of [player, ...ais]) { pileAnim(c, dt);
    const w = c.wpn; if (!w) continue; w.gunCd = Math.max(0, w.gunCd - dt); w.cd = Math.max(0, w.cd - dt); w.heat = Math.max(0, w.heat - dt * (w.over ? 0.55 : 0.4)); if (w.over && w.heat <= 0.3) w.over = false; }
  // 날아가는 것들
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const q = PROJ[i]; q.t += dt; q.life -= dt; let boom = q.life <= 0, hit = null;
    if (q.type === "mine") { if (stepMine(q, dt)) PROJ.splice(i, 1); continue; }
    if (q.type === "missile") {
      if (q.target && !q.target.dead) { const tx = q.target.x + q.target.vx * 0.15, tz = q.target.z + q.target.vz * 0.15, ty = q.target.y + 0.8, sp = Math.hypot(q.vx, q.vz), want = Math.atan2(tx - q.x, tz - q.z), cur = Math.atan2(q.vx, q.vz); let dh = want - cur; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; const nh = cur + clamp(dh, -1.7 * dt, 1.7 * dt), ns = Math.min(255, sp + 90 * dt); q.vx = Math.sin(nh) * ns; q.vz = Math.cos(nh) * ns; q.vy += (ty - q.y) * 3 * dt - q.vy * 2 * dt; }
      else { q.vy -= 2 * dt; const sp = Math.hypot(q.vx, q.vz), ns = Math.min(255, sp + 90 * dt); q.vx *= ns / sp; q.vz *= ns / sp; }
      if (q.target === player && Math.floor(q.t * 6) !== Math.floor((q.t - dt) * 6)) sndWarn();
      if (viewD(q.x, q.z) < 400) { emit(boostFire, q.x - q.vx * 0.012, q.y, q.z - q.vz * 0.012, (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3, 0.25); if (Math.random() < 0.5) emit(smoke, q.x, q.y, q.z, (Math.random() - 0.5), 0.5, (Math.random() - 0.5), 0.9); }
    }
    const px0 = q.x, pz0 = q.z; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.idx = nearest(q.x, q.z, q.idx); if (q.type === "harpoon") q.vy -= 3 * dt;
    const t = TRK[q.idx], lat = (q.x - t.x) * nx(t) + (q.z - t.z) * nz(t), gy = surfH(t.s, lat); if (q.y < gy + 0.3) { if (q.type === "missile") boom = true; else q.y = gy + 0.3; }
    for (const o of [player, ...ais]) { if (o === q.owner && q.t < 0.5 || o.dead) continue; const r = Math.max(o.mesh.userData.hwd + 0.4, o.mesh.userData.hl * 0.6), sx = q.x - px0, sz = q.z - pz0, sl = sx * sx + sz * sz || 1, tt = clamp(((o.x - px0) * sx + (o.z - pz0) * sz) / sl, 0, 1), cx = px0 + sx * tt, cz = pz0 + sz * tt; if ((o.x - cx) ** 2 + (o.z - cz) ** 2 < r * r && Math.abs(o.y + 1 - q.y) < 3) { hit = o; break; } } // 빠른 탄도 지나치지 않게 이동 구간 전체로 판정
    if (!hit && !boom) { const sx0 = q.x - px0, sz0 = q.z - pz0, sl0 = Math.hypot(sx0, sz0) || 1; if (raySolid(px0, pz0, sx0 / sl0, sz0 / sl0, sl0, q.y) !== null) boom = true; }
    if (!hit && !boom) { const sx = q.x - px0, sz = q.z - pz0, sl = Math.hypot(sx, sz) || 1, ph = rayProp(px0, pz0, sx / sl, sz / sl, sl, q.y); if (ph) { if (q.type === "missile") boom = true; else { breakProp(ph[0], q.vx * 0.15, 5, q.vz * 0.15); boom = true; } } }
    if (q.type === "missile" && (hit || boom)) { blast(q.x, q.y, q.z, q.owner, hit); scene.remove(q.mesh); PROJ.splice(i, 1); continue; }
    if (q.type === "harpoon") { if (hit && hit !== q.owner) { if (!q.owner.dead) attachTether(q.owner, hit); scene.remove(q.mesh); scene.remove(q.rope); PROJ.splice(i, 1); continue; } if (boom) { scene.remove(q.mesh); scene.remove(q.rope); PROJ.splice(i, 1); continue; }
      const mo = muzzle(q.owner), L_ = Math.hypot(q.x - mo[0], q.y - mo[1], q.z - mo[2]); q.rope.position.set(mo[0], mo[1], mo[2]); q.rope.scale.set(1, 1, L_); q.rope.lookAt(q.x, q.y, q.z); }
    q.mesh.position.set(q.x, q.y, q.z); q.mesh.rotation.y = Math.atan2(q.vx, q.vz);
  }
  // 작살 줄: 당기고, 쥔 쪽이 꺾는 방향으로 상대를 휘두름
  for (let i = TETHERS.length - 1; i >= 0; i--) {
    const T = TETHERS[i], { a, b } = T; T.t += dt;
    if (T.t > T.life || a.dead || b.dead || (a.tumble && b.tumble)) { releaseTether(T, false); continue; }
    T.len = Math.max(10, T.len - 22 * dt);
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    if (d > 260) { releaseTether(T, false); continue; }
    b.kickT = 1.2; if (d > T.len) { const ma = massOf(a), mb = massOf(b), rv = (b.vx - a.vx) * ux + (b.vz - a.vz) * uz, F = (d - T.len) * 9 + Math.max(0, rv) * 3, ja = F * mb / (ma + mb), jb = F * ma / (ma + mb);
      if (a.tumble) { a.tv.x += ux * ja * dt; a.tv.z += uz * ja * dt; } else { a.vx += ux * ja * dt; a.vz += uz * ja * dt; fromWorld(a); }
      if (b.tumble) { b.tv.x -= ux * jb * dt; b.tv.z -= uz * jb * dt; } else { b.vx -= ux * jb * dt; b.vz -= uz * jb * dt; fromWorld(b); } }
    const st = a === player ? input.steer : (a.yankDir || 0) * (T.t > 0.5 ? 1 : 0);
    if (Math.abs(st) > 0.2 && !b.tumble) { const px = uz, pz = -ux, F = -st * 26 * dt; b.vx += px * F; b.vz += pz * F; fromWorld(b); b.ry += -st * 1.6 * dt * Math.sign(px * Math.cos(b.h) - pz * Math.sin(b.h) || 1); }
    const ma_ = muzzle(a), mb_ = [b.x, b.y + 1, b.z], L_ = Math.hypot(mb_[0] - ma_[0], mb_[1] - ma_[1], mb_[2] - ma_[2]);
    T.rope.position.set(ma_[0], ma_[1], ma_[2]); T.rope.scale.set(1, 1, L_); T.rope.lookAt(mb_[0], mb_[1], mb_[2]);
  }
  for (let i = BEAMS.length - 1; i >= 0; i--) { const b = BEAMS[i]; b.t += dt; if (b.upd) { if (b.upd(b, dt)) { scene.remove(b.m); BEAMS.splice(i, 1); } continue; } b.m.material.opacity = 0.95 * (1 - b.t / b.life); b.m.children[0].material.opacity = 1 - b.t / b.life; b.m.scale.x = b.m.scale.y = 1 + b.t * 3; if (b.t > b.life) { scene.remove(b.m); b.m.geometry.dispose(); BEAMS.splice(i, 1); } }
  for (let i = WRINGS.length - 1; i >= 0; i--) { const r = WRINGS[i]; r.t += dt; const sc = 3 + r.t * 90; r.m.scale.set(sc, sc, 1.5); r.m.position.x += r.vx * dt; r.m.position.z += r.vz * dt; r.m.material.opacity = Math.max(0, 0.7 - r.t * 2.2); if (r.t > 0.32) { scene.remove(r.m); WRINGS.splice(i, 1); } }
  for (let i = 0; i < TR_N; i++) if (trLife[i] > 0) { trLife[i] -= dt; if (trLife[i] <= 0) { trPos[i * 6 + 1] = trPos[i * 6 + 4] = -9999; } } tracerGeo.attributes.position.needsUpdate = true;
}

