// ---- 리플레이: 레이스 동안 차 위치·자세를 0.05초마다 기록, 떨어진 부품·부서진 오브젝트·폭발까지
const REC = { ts: [], fr: [], wr: [], ev: [], fx: [], pj: [], th: [], next: 0, on: false };
const REC_STRIDE = 11; // 차 하나당 x y z qx qy qz qw h prog vf 부스트
function recReset(on) { REC.ts.length = 0; REC.fr.length = 0; REC.wr.length = 0; REC.ev.length = 0; REC.fx.length = 0; for (const e of REC.pj) if (e.rm) scene.remove(e.rm); REC.pj.length = 0; for (const e of REC.th) if (e.rm) scene.remove(e.rm); REC.th.length = 0; REC.next = 0; REC.on = on; }
function recFx(e) { if (!REC.on || REPLAY.on) return; e.t = raceT; REC.fx.push(e); } /* 리플레이용: 총·포·파일벙커·폭발·부스트 */
function recProj(q) { if (!REC.on || REPLAY.on) return; q.rec = { type: q.type, born: raceT, end: 1e9, fr: [], q }; REC.pj.push(q.rec); }
function recCars() { return [player, ...ais]; }
function recFrame() {
  if (!REC.on || REPLAY.on || raceT < REC.next || REC.ts.length > 16000) return; REC.next = raceT + 0.05;
  const cars = recCars(), f = new Float32Array(cars.length * REC_STRIDE);
  cars.forEach((c, i) => { const m = c.mesh, o = i * REC_STRIDE; f[o] = m.position.x; f[o + 1] = m.position.y; f[o + 2] = m.position.z; f[o + 3] = m.quaternion.x; f[o + 4] = m.quaternion.y; f[o + 5] = m.quaternion.z; f[o + 6] = m.quaternion.w; f[o + 7] = c.h; f[o + 8] = c.prog; f[o + 9] = c.vf || 0; f[o + 10] = c.boostT > 0 ? 1 : 0; });
  REC.ts.push(raceT); REC.fr.push(f);
  for (const e of REC.pj) { if (e.end < 1e9) continue; const q = e.q; if (!PROJ.includes(q)) { e.end = raceT; e.q = null; continue; } e.fr.push([raceT, q.x, q.y, q.z, Math.atan2(q.vx, q.vz)]); }
  for (const e of REC.wr) { if (e.fin) continue; const g = e.w.obj; e.fr.push([raceT, g.position.x, g.position.y, g.position.z, g.quaternion.x, g.quaternion.y, g.quaternion.z, g.quaternion.w]); if (e.w.rest) e.fin = true; }
}
const _rm = new THREE.Matrix4(), _rm2 = new THREE.Matrix4();
function recWreck(w, car) { // 새 파편 등록: 차 부품이면 떨어지기 전까지 차에 붙어 있던 자리(차 기준 위치)를 기억
  if (!REC.on || REPLAY.on) return; const g = w.obj; g.updateMatrixWorld(true); let local = null;
  if (car) { car.mesh.updateMatrixWorld(true); local = _rm.copy(car.mesh.matrixWorld).invert().multiply(g.matrixWorld).clone(); }
  REC.wr.push({ w, car, born: raceT, local, fr: [[raceT, g.position.x, g.position.y, g.position.z, g.quaternion.x, g.quaternion.y, g.quaternion.z, g.quaternion.w]], fin: false });
}
function recEvent(type, c, big) { if (!REC.on || REPLAY.on) return; const last = REC.ev.filter(e => e.car === c).pop(); if (type === "hit" && last && raceT - last.t < 2) return; REC.ev.push({ t: raceT, type, car: c, x: c.x, y: c.y, z: c.z, big }); }
const REPLAY = { on: false, t: 0, speed: 1, paused: false, auto: true, view: new Map(), saved: null, camT: 0, hiEnd: 0, lastT: 0, charred: new Map() };
function repIdx(t) { const T = REC.ts; let lo = 0, hi = T.length - 1; if (t <= T[0]) return 0; if (t >= T[hi]) return hi; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; } return lo; }
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p1 = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1);
function repApply(t, dt) {
  const T = REC.ts, i = repIdx(t), j = Math.min(T.length - 1, i + 1), f = j > i ? clamp((t - T[i]) / (T[j] - T[i]), 0, 1) : 0, A = REC.fr[i], B = REC.fr[j];
  recCars().forEach((c, k) => { const o = k * REC_STRIDE, m = c.mesh;
    m.position.set(A[o] + (B[o] - A[o]) * f, A[o + 1] + (B[o + 1] - A[o + 1]) * f, A[o + 2] + (B[o + 2] - A[o + 2]) * f);
    _q1.set(A[o + 3], A[o + 4], A[o + 5], A[o + 6]); _q2.set(B[o + 3], B[o + 4], B[o + 5], B[o + 6]); m.quaternion.copy(_q1).slerp(_q2, f);
    let dh = B[o + 7] - A[o + 7]; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    const vf = A[o + 9] + (B[o + 9] - A[o + 9]) * f; REPLAY.view.set(c, { h: A[o + 7] + dh * f, prog: A[o + 8] + (B[o + 8] - A[o + 8]) * f, vf, tumble: false, dead: false });
    m.userData.wheels.forEach(w => { if (w.parent === m) w.userData.spin.rotation.x += vf * dt / w.userData.r; });
    pileAnim(c, dt);     const bo = A[o + 10] > 0.5; REPLAY.view.get(c).boost = bo; for (const fl of m.userData.flames) fl.visible = bo;
    const boom = REC.ev.find(e => e.type === "boom" && e.car === c); if (boom) repChar(c, t >= boom.t); // 터지기 전엔 원래 색, 터진 뒤엔 그을린 색
  });
  for (const e of REC.wr) { const g = e.w.obj; g.visible = true;
    if (t < e.born) { if (e.car) { e.car.mesh.updateMatrixWorld(true); _rm2.multiplyMatrices(e.car.mesh.matrixWorld, e.local); _rm2.decompose(g.position, g.quaternion, _p1); } else { const a = e.fr[0]; g.position.set(a[1], a[2], a[3]); g.quaternion.set(a[4], a[5], a[6], a[7]); } continue; }
    const F = e.fr; let lo = 0; while (lo < F.length - 1 && F[lo + 1][0] <= t) lo++; const a = F[lo], b = F[Math.min(F.length - 1, lo + 1)], u = b[0] > a[0] ? clamp((t - a[0]) / (b[0] - a[0]), 0, 1) : 0;
    g.position.set(a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u); _q1.set(a[4], a[5], a[6], a[7]); _q2.set(b[4], b[5], b[6], b[7]); g.quaternion.copy(_q1).slerp(_q2, u); }
  for (const e of REC.pj) { const show = t >= e.born && t <= e.end && e.fr.length; if (!show) { if (e.rm) e.rm.visible = false; continue; }
    if (!e.rm) { if (e.type === "missile") e.rm = makeMissileMesh(0xff3b3b); else { e.rm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 6).rotateX(Math.PI / 2), toon(0x9a9a9a)); scene.add(e.rm); } }
    const F = e.fr; let lo = 0; while (lo < F.length - 1 && F[lo + 1][0] <= t) lo++; const a = F[lo], b = F[Math.min(F.length - 1, lo + 1)], u = b[0] > a[0] ? clamp((t - a[0]) / (b[0] - a[0]), 0, 1) : 0;
    e.rm.visible = true; e.rm.position.set(a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u); e.rm.rotation.y = a[4];
    if (e.type === "missile" && dt > 0 && viewD(e.rm.position.x, e.rm.position.z) < 400) emit(boostFire, e.rm.position.x, e.rm.position.y, e.rm.position.z, (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3, 0.25); }
  for (const e of REC.th) { const show = t >= e.t0 && t <= e.t1; if (!show) { if (e.rm) e.rm.visible = false; continue; }
    if (!e.rm) { e.rm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 5).translate(0, 0.5, 0).rotateX(Math.PI / 2), toon(0x2a2a2a)); scene.add(e.rm); }
    const pa = e.a.mesh.position, pb = e.b.mesh.position; e.rm.visible = true; e.rm.position.set(pa.x, pa.y + 1.1, pa.z); e.rm.scale.set(1, 1, Math.hypot(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z)); e.rm.lookAt(pb.x, pb.y + 1.1, pb.z); }
  { const FX = REC.fx; if (REPLAY.fxi === undefined || t < REPLAY.fxT || t - REPLAY.fxT > 1.0) { let lo = 0, hi = FX.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (FX[mid].t <= t) lo = mid + 1; else hi = mid; } REPLAY.fxi = lo; }
    else if (REPLAY.speed > 0 && !REPLAY.paused) while (REPLAY.fxi < FX.length && FX[REPLAY.fxi].t <= t) repFx(FX[REPLAY.fxi++]);
    REPLAY.fxT = t; }
  if (REPLAY.speed > 0 && !REPLAY.paused) for (const e of REC.ev) if (e.t > REPLAY.lastT && e.t <= t && t - e.t < 0.5) { // 지나가는 순간 효과 다시
    if (e.type === "boom") { if (QFX) QFX.boom(e.x, e.y, e.z, 1); else for (let k = 0; k < 120; k++) emit(boostFire, e.x, e.y + 1, e.z, (Math.random() - 0.5) * 30, Math.random() * 16, (Math.random() - 0.5) * 30, 0.9); for (let k = 0; k < 40; k++) emit(smokeD, e.x, e.y + 1.5, e.z, (Math.random() - 0.5) * 8, 2 + Math.random() * 4, (Math.random() - 0.5) * 8, 2.5); sndExplode(e.x, e.z); }
    else { for (let k = 0; k < 24; k++) emit(sparks, e.x, e.y + 1, e.z, (Math.random() - 0.5) * 14, Math.random() * 7, (Math.random() - 0.5) * 14, 0.4); sndImpact(e.big ? 22 : 12, e.x, e.z); } }
  REPLAY.lastT = t;
}
function repFx(e) { /* 리플레이에서 공격·부스트 다시 */
  if (e.k === "gun") { if (viewD(e.a[0], e.a[2]) < 300) { addTracer(e.a, e.b); sndGun(distVol(e.a[0], e.a[2]) * 0.8); } }
  else if (e.k === "can") { cannonFx(e.c, e.m, e.dx, e.dz, e.len, true); sndCannon(distVol(e.m[0], e.m[2])); }
  else if (e.k === "pile") { e.c.pbT = 0; if (e.hit) { if (QFX && viewD(e.hit[0], e.hit[2]) < 400) QFX.boom(e.hit[0], e.hit[1] - 0.3, e.hit[2], 0.38); const v = distVol(e.hit[0], e.hit[2]); if (v > 0.04) { sfx("boom2", Math.min(1.4, v * 1.2), 1.15); sndImpact(20, e.hit[0], e.hit[2]); } } }
  else if (e.k === "blast") { if (viewD(e.x, e.z) < 400) { if (QFX) QFX.boom(e.x, e.y - 0.8, e.z, 0.6); else for (let k = 0; k < 70; k++) emit(boostFire, e.x, e.y, e.z, (Math.random() - 0.5) * 22, Math.random() * 12, (Math.random() - 0.5) * 22, 0.6); } const v = distVol(e.x, e.z); if (v > 0.04) sfx("boom2", Math.min(1.2, v * 1.3), 1 + Math.random() * 0.1); }
  else if (e.k === "bst") { if (viewD(e.c.mesh.position.x, e.c.mesh.position.z) < 600) { boostBurst(e.c); sndBoost(distVol(e.c.mesh.position.x, e.c.mesh.position.z) * 0.9); } }
}
function repChar(c, on) { const d = ensureDmg(c), st = REPLAY.charred.get(c); if (st === on) return; REPLAY.charred.set(c, on); unmergeCar(c.mesh);
  for (const pair of d.chars) { const [mesh, orig] = pair; if (!pair[2]) pair[2] = mesh.material; mesh.material = on ? pair[2] : orig; }
  for (const k in d.fr) d.fr[k].visible = on; c.mesh.userData.body.position.y = on ? -0.32 : 0; } /* 터지기 전 장면에선 차체를 원래 높이로 (터지면 차체가 0.32 꺼지는데, 다시 붙여 보여주는 부품은 원래 높이라 떠 보였음) */
function repStart() {
  if (REC.ts.length < 20) { setMsg("기록이 너무 짧아요", 1.2); return; }
  specOff(); REPLAY.on = true; REPLAY.fxi = undefined; REPLAY.t = REC.ts[0]; REPLAY.lastT = REPLAY.t; REPLAY.paused = false; REPLAY.speed = 1; REPLAY.auto = true; REPLAY.camT = 0; REPLAY.hiEnd = 0; REPLAY.charred.clear();
  REPLAY.saved = REC.wr.map(e => [e.w.obj.position.clone(), e.w.obj.quaternion.clone()]);
  document.getElementById("endScreen").style.display = "none"; document.body.classList.add("spec", "replay"); document.getElementById("specTag").textContent = "▶ REPLAY";
  SPEC.car = null; SPEC.on = false; repUI(); repDirector(0, true);
}
function repStop(showRes) {
  if (!REPLAY.on) return; REPLAY.on = false; REPLAY.fxi = undefined; for (const e of REC.pj) if (e.rm) e.rm.visible = false; for (const e of REC.th) if (e.rm) e.rm.visible = false; for (const c of recCars()) for (const fl of c.mesh.userData.flames) fl.visible = false;
  REC.wr.forEach((e, i) => { const sv = REPLAY.saved && REPLAY.saved[i]; if (sv) { e.w.obj.position.copy(sv[0]); e.w.obj.quaternion.copy(sv[1]); } });
  for (const c of recCars()) if (REC.ev.some(e => e.type === "boom" && e.car === c)) repChar(c, true); REPLAY.charred.clear();
  document.body.classList.remove("spec", "replay"); document.getElementById("specTag").textContent = "● LIVE"; firstFrame = true; player.mesh.visible = camMode !== "cockpit";
  if (showRes && state === "end") document.getElementById("endScreen").style.display = "flex";
}
function repNextHi() { // 다음 하이라이트(폭발·큰 충돌)로 점프: 3초 전부터
  const evs = REC.ev.filter(e => e.t > REPLAY.t + 4); const e = evs.find(x => x.type === "boom") && evs[0]; const pick = e || evs[0];
  if (!pick) { setMsg("더 볼 하이라이트가 없어요", 1.2); return; }
  REPLAY.t = Math.max(REC.ts[0], pick.t - 3); REPLAY.lastT = REPLAY.t - 0.01; REPLAY.paused = false; if (REPLAY.auto) { SPEC.car = pick.car; SPEC.mode = Math.random() < 0.6 ? "tv" : "chase"; SPEC.tv = null; SPEC.fresh = true; REPLAY.camT = 7; REPLAY.hiEnd = pick.t + 3; } repUI();
}
function repDirector(dt, force) { // 자동 카메라: 곧 사고 날 차 > 서로 붙은 차, TV 캠 위주
  if (!REPLAY.auto && !force && SPEC.car) return;
  REPLAY.camT -= dt; const t = REPLAY.t;
  const soon = REC.ev.find(e => e.t > t && e.t - t < 3.5 && (e.type === "boom" || e.big));
  if (soon && SPEC.car !== soon.car && REPLAY.auto) { SPEC.car = soon.car; SPEC.mode = "tv"; SPEC.tv = null; SPEC.fresh = true; REPLAY.camT = 6; repUI(); return; }
  const over = SPEC.mode === "tv" ? (SPEC.tvDone || REPLAY.camT < -12) : REPLAY.camT <= 0;
  if (force || !SPEC.car || over) {
    const cars = recCars(), V = REPLAY.view; let best = null, bs = -1e9;
    for (const c of cars) { const v = V.get(c); if (!v) continue; let near = 1e9; for (const o of cars) { if (o === c) continue; const w = V.get(o); if (w) near = Math.min(near, Math.abs(w.prog - v.prog)); } const sc = -near + Math.random() * 30 + (c === SPEC.car ? -40 : 0) + (c === player ? 15 : 0); if (sc > bs) { bs = sc; best = c; } }
    SPEC.car = best || player; REPLAY.n = (REPLAY.n || 0) + 1; SPEC.mode = REPLAY.n % 3 === 0 ? "chase" : "tv"; SPEC.tv = null; SPEC.tvDone = false; SPEC.fresh = true; REPLAY.camT = 6 + Math.random() * 3; repUI();
  }
}
function repTick(dt) {
  const T0 = REC.ts[0], T1 = REC.ts[REC.ts.length - 1];
  if (!REPLAY.paused) REPLAY.t = Math.min(T1, REPLAY.t + dt * REPLAY.speed);
  if (REPLAY.t >= T1) REPLAY.paused = true;
  repApply(REPLAY.t, REPLAY.paused ? 0 : dt * REPLAY.speed); repDirector(REPLAY.paused ? 0 : dt * REPLAY.speed);
  if ((REPLAY.uiT = (REPLAY.uiT || 0) + dt) > 0.2) { REPLAY.uiT = 0; repUI(); }
}
function repUI() {
  const T0 = REC.ts[0] || 0, T1 = REC.ts[REC.ts.length - 1] || 1, t = REPLAY.t, mm = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
  document.getElementById("repTime").textContent = `${mm(t - T0)} / ${mm(T1 - T0)}`;
  const sk = document.getElementById("repSeek"); if (!sk.dragging) sk.value = Math.round((t - T0) / Math.max(0.01, T1 - T0) * 1000);
  document.getElementById("rpPlay").textContent = REPLAY.paused ? "▶" : "❚❚"; document.getElementById("rpSpd").textContent = REPLAY.speed === 1 ? "×1" : REPLAY.speed === 0.25 ? "×¼" : "×" + REPLAY.speed;
  const c = SPEC.car; document.getElementById("repName").textContent = c ? c.name.split(" ")[0] + (c === player ? " (나)" : "") : "-";
  document.getElementById("rpAuto").classList.toggle("on", REPLAY.auto); document.getElementById("rpChase").classList.toggle("on", !REPLAY.auto && SPEC.mode === "chase"); document.getElementById("rpTv").classList.toggle("on", !REPLAY.auto && SPEC.mode === "tv");
}
document.getElementById("bRep").onclick = repStart; document.getElementById("rpClose").onclick = () => repStop(true);
document.getElementById("rpPlay").onclick = () => { if (REPLAY.t >= REC.ts[REC.ts.length - 1] - 0.05) { REPLAY.t = REC.ts[0]; REPLAY.lastT = REPLAY.t; } REPLAY.paused = !REPLAY.paused; repUI(); };
document.getElementById("rpBack").onclick = () => { REPLAY.t = Math.max(REC.ts[0], REPLAY.t - 5); REPLAY.lastT = REPLAY.t; SPEC.tv = null; SPEC.fresh = true; repUI(); };
document.getElementById("rpSpd").onclick = () => { const L_ = [1, 2, 0.25, 0.5]; REPLAY.speed = L_[(L_.indexOf(REPLAY.speed) + 1) % L_.length]; repUI(); };
document.getElementById("rpHi").onclick = repNextHi;
document.getElementById("rpPrev").onclick = () => repPick(-1); document.getElementById("rpNext").onclick = () => repPick(1);
document.getElementById("rpAuto").onclick = () => { REPLAY.auto = true; repDirector(0, true); };
document.getElementById("rpChase").onclick = () => { REPLAY.auto = false; SPEC.mode = "chase"; SPEC.fresh = true; repUI(); };
document.getElementById("rpTv").onclick = () => { REPLAY.auto = false; SPEC.mode = "tv"; SPEC.tv = null; SPEC.fresh = true; repUI(); };
function repPick(d) { const cars = recCars(); let i = cars.indexOf(SPEC.car); i = (i + d + cars.length) % cars.length; SPEC.car = cars[i]; REPLAY.auto = false; SPEC.tv = null; SPEC.fresh = true; repUI(); }
{ const sk = document.getElementById("repSeek"); sk.addEventListener("pointerdown", () => sk.dragging = true); sk.addEventListener("pointerup", () => sk.dragging = false);
  sk.addEventListener("input", () => { const T0 = REC.ts[0], T1 = REC.ts[REC.ts.length - 1]; REPLAY.t = T0 + sk.value / 1000 * (T1 - T0); REPLAY.lastT = REPLAY.t; SPEC.tv = null; SPEC.fresh = true; }); }
