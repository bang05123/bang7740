// ================= 미니맵 (내 주변 일정 거리만, 진행 방향이 위) =================
const radarEl = document.getElementById("radar"), rctx = radarEl.getContext("2d");
const RADAR_RANGE = 300; // 반지름 (m)
const rivalCol = RIVALS.map(r => "#" + new THREE.Color(r.sf[1]).getHexString());
let radarTick = 0;
const DMG = { el: null, t: 0, prev: { F: 0, B: 0, P: 0, N: 0 }, fl: { F: 0, B: 0, P: 0, N: 0 }, key: "" };
function drawDmgMap(dt) { /* 내 차 위에서 본 그림: 맞은 부위가 노랑→주황→빨강, 부품 떨어지면 빗금, 방금 맞으면 번쩍 */
  const el = DMG.el || (DMG.el = document.getElementById("dmgMap")), c = player;
  const show = (state === "race" || state === "count" || state === "end") && !DEMO.on && !REPLAY.on;
  el.style.display = show ? "block" : "none"; if (!show || el.clientWidth < 10 || !c.zoneD) return;
  const zs = ["F", "B", "P", "N"];
  for (const z of zs) { if (c.zoneD[z] > DMG.prev[z] + 0.5) DMG.fl[z] = 0.5; if (c.zoneD[z] < DMG.prev[z]) DMG.fl[z] = 0; DMG.prev[z] = c.zoneD[z]; DMG.fl[z] = Math.max(0, DMG.fl[z] - dt); }
  const d = c.mesh.userData.dmg, gone = { F: 0, B: 0, P: 0, N: 0 }; if (d) for (const g of d.gone) if (g.userData.zone && gone[g.userData.zone] !== undefined) gone[g.userData.zone]++;
  const hp = Math.max(0, Math.round(c.hp)), key = zs.map(z => Math.round(c.zoneD[z]) + "/" + gone[z] + "/" + (DMG.fl[z] > 0 ? Math.round(DMG.fl[z] * 10) : 0)).join(",") + hp + (c.dead ? "x" : "") + el.clientWidth;
  if (key === DMG.key) return; DMG.key = key;
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(el.clientWidth * dpr), H = Math.round(el.clientHeight * dpr); if (el.width !== W || el.height !== H) { el.width = W; el.height = H; }
  const x = el.getContext("2d"); x.setTransform(W / 62, 0, 0, H / 104, 0, 0); x.clearRect(0, 0, 62, 104);
  const col = z => { if (c.dead) return "#2a2622"; const k = clamp(c.zoneD[z] / 44, 0, 1); if (k < 0.02) return "#d8dde2";
    const st = [[0, [235, 220, 120]], [0.35, [245, 170, 40]], [0.7, [235, 80, 30]], [1, [170, 20, 20]]]; let i = 0; while (i < st.length - 2 && k > st[i + 1][0]) i++; const [a, A] = st[i], [b, B] = st[i + 1], f = (k - a) / (b - a);
    return `rgb(${A.map((v, j) => Math.round(v + (B[j] - v) * f)).join(",")})`; };
  /* 바깥 구역: 앞(위)·뒤(아래)·왼쪽(P)·오른쪽(N) */
  const poly = pts => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); };
  x.fillStyle = "rgba(0,0,0,0.45)"; x.beginPath(); x.roundRect ? x.roundRect(4, 2, 54, 100, 10) : x.rect(4, 2, 54, 100); x.fill();
  for (const [wx, wy] of [[7, 26], [55, 26], [7, 74], [55, 74]]) { x.fillStyle = c.dead ? "#222" : "#555"; x.fillRect(wx - 3, wy - 7, 6, 14); }
  const zp = { F: [[16, 8], [46, 8], [50, 20], [44, 30], [18, 30], [12, 20]], B: [[18, 74], [44, 74], [50, 86], [46, 96], [16, 96], [12, 86]], P: [[10, 22], [17, 31], [17, 73], [10, 84]], N: [[52, 22], [45, 31], [45, 73], [52, 84]] };
  for (const z of zs) { poly(zp[z]); x.fillStyle = col(z); x.fill();
    if (gone[z]) { x.save(); x.clip(); x.strokeStyle = "rgba(0,0,0,0.55)"; x.lineWidth = 1.6; for (let k = -110; k < 110; k += 5 - Math.min(2, gone[z] * 0.5)) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 104, 104); x.stroke(); } x.restore(); }
    poly(zp[z]); x.lineWidth = DMG.fl[z] > 0 ? 2.4 : 1.2; x.strokeStyle = DMG.fl[z] > 0 ? `rgba(255,255,255,${0.5 + DMG.fl[z]})` : "rgba(0,0,0,0.8)"; x.stroke(); }
  /* 가운데 실내: 남은 내구도 */
  x.fillStyle = c.dead ? "#111" : hp < 40 ? "#3a1410" : "#14181d"; x.fillRect(19, 32, 24, 40); x.strokeStyle = "rgba(255,255,255,0.35)"; x.lineWidth = 1; x.strokeRect(19, 32, 24, 40);
  x.fillStyle = c.dead ? "#ff5a3a" : hp < 40 ? "#ff7a5a" : "#fff"; x.font = "bold 13px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(c.dead ? "✕" : hp, 31, 52);
  x.fillStyle = "rgba(255,255,255,0.6)"; x.font = "bold 7px sans-serif"; x.fillText("▲", 31, 5);
}
function drawRadar() {
  const show = (state === "race" || state === "count" || state === "end") && !DEMO.on;
  radarEl.style.display = show ? "block" : "none"; if (!show || radarEl.clientWidth < 10) return; // 관전·리플레이처럼 미니맵이 숨겨졌을 땐 안 그림
  if ((radarTick++ % (isTouch ? 2 : 1)) !== 0) return;
  const css = radarEl.clientWidth, dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(css * dpr);
  if (radarEl.width !== W) { radarEl.width = radarEl.height = W; }
  const g = rctx, c = W / 2, R = W / 2 - 3 * dpr, k = R / RADAR_RANGE, p = player;
  const fx = Math.sin(p.h), fz = Math.cos(p.h), sx = -Math.cos(p.h), sz = Math.sin(p.h); // 화면 위 = 진행 방향, 화면 오른쪽
  const toScr = (x, z) => { const dx = x - p.x, dz = z - p.z; return [c + (dx * sx + dz * sz) * k, c - (dx * fx + dz * fz) * k]; };
  g.clearRect(0, 0, W, W);
  g.save(); g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fillStyle = "rgba(10,10,14,0.62)"; g.fill(); g.clip();
  // 코스: 넓은 회색 띠 + 가운데 밝은 선
  const step = Math.max(6, Math.round(N / 1600)), pts = [];
  for (let i = 0; i <= N; i += step) { const t = TRK[i % N]; const d2 = (t.x - p.x) ** 2 + (t.z - p.z) ** 2; pts.push(d2 < (RADAR_RANGE * 1.6) ** 2 ? toScr(t.x, t.z) : null); }
  const stroke = (w, col) => { g.lineWidth = w; g.strokeStyle = col; g.lineJoin = g.lineCap = "round"; g.beginPath(); let on = false; for (const q of pts) { if (!q) { on = false; continue; } if (!on) { g.moveTo(q[0], q[1]); on = true; } else g.lineTo(q[0], q[1]); } g.stroke(); };
  stroke(Math.max(3 * dpr, hwAt(p.s) * 2 * k), "rgba(150,150,160,0.75)");
  stroke(1 * dpr, "rgba(255,255,255,0.5)");
  { const s0 = TRK[0], a = toScr(s0.x + nx(s0) * HALF, s0.z + nz(s0) * HALF), b = toScr(s0.x - nx(s0) * HALF, s0.z - nz(s0) * HALF); g.lineWidth = 3 * dpr; g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } // 결승선
  g.restore();
  // 라이벌: 범위 안은 점, 밖은 테두리에 작은 표시
  const tri = (x, y, ang, size, col) => { g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.7, size * 0.8); g.lineTo(-size * 0.7, size * 0.8); g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 1.5 * dpr; g.strokeStyle = "#000"; g.stroke(); g.restore(); };
  ais.forEach((a, i) => {
    let [x, y] = toScr(a.x, a.z); const dx = x - c, dy = y - c, dist = Math.hypot(dx, dy);
    const rel = a.h - p.h; // 상대 방향
    if (dist <= R - 4 * dpr) tri(x, y, -rel, 5.5 * dpr, (a.mesh.userData.mcol || rivalCol[i]));
    else if (dist < R * 3) { x = c + dx / dist * (R - 4 * dpr); y = c + dy / dist * (R - 4 * dpr); g.beginPath(); g.arc(x, y, 3 * dpr, 0, Math.PI * 2); g.fillStyle = (a.mesh.userData.mcol || rivalCol[i]); g.fill(); }
  });
  tri(c, c, 0, 7.5 * dpr, "#ff5a1f"); // 나
  g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.lineWidth = 2 * dpr; g.strokeStyle = "rgba(255,255,255,0.85)"; g.stroke();
}

function renderMirror() {
  const show = (state === "race" || state === "count" || state === "end") && !SPEC.on && !DEMO.on && !GMIN();
  mirrorEl.style.display = show ? "block" : "none"; if (!show) return;
  const r = mirrorEl.getBoundingClientRect(), W = document.documentElement.clientWidth || innerWidth, H = document.documentElement.clientHeight || innerHeight;
  if (r.width < 10) return;
  if ((mirrorTick++ % (GLOW() ? 4 : isTouch ? 3 : 2)) === 0) { // 폰에선 두 프레임에 한 번만 새로 그림
    const p = player, fx = Math.sin(p.h), fz = Math.cos(p.h);
    mirrorCam.position.set(p.x - fx * 5.2, p.y + 2.3, p.z - fz * 5.2);
    mirrorCam.lookAt(p.x - fx * 40, p.y + 0.6, p.z - fz * 40);
    mirrorCam.aspect = r.width / r.height; mirrorCam.updateProjectionMatrix();
    const vis = p.mesh.visible; p.mesh.visible = false;
    renderer.setRenderTarget(mirrorRT); renderer.render(scene, mirrorCam); renderer.setRenderTarget(null);
    p.mesh.visible = vis;
  }
  const b = 0;
  renderer.setScissorTest(true);
  renderer.setViewport(r.left + b, H - r.bottom + b, r.width - 2 * b, r.height - 2 * b);
  renderer.setScissor(r.left + b, H - r.bottom + b, r.width - 2 * b, r.height - 2 * b);
  renderer.autoClear = false; renderer.render(mirrorScene, mirrorOrtho); renderer.autoClear = true;
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H);
}

// ================= 루프 =================
buildCourse(courseId); loadBest(); placeGrid(); gridFresh = true;
if (document.getElementById("titleScreen").style.display !== "none") demoStart(); // 처음 켜면 타이틀 뒤에서 데모 플레이
document.querySelectorAll(".csel").forEach(b => b.addEventListener("click", loadBest));
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = Math.min(1 / 30, (now - last) / 1000); if (!(realDt > 0.0005)) return; last = now; /* 첫 프레임 시각이 last보다 앞설 수 있어서 음수 dt 방지 (켜자마자 차가 뒤집히던 원인) */
  let dt = realDt;
  if (slowT > 0) { slowT -= realDt; dt *= 0.3; }
  try {
    readInput(realDt); if (DEMO.on) demoTick(realDt);
    if (state === "count") {
      countdown -= realDt; lightsTick(); document.getElementById("center").textContent = countdown <= 0 ? "GO!" : "";
      if (countdown <= 0) { document.getElementById("lights").classList.remove("on"); state = "race"; raceT = 0; player.lapStart = 0; sndBeep(true); setTimeout(() => { if (state === "race") document.getElementById("center").textContent = ""; }, 700); }
    }
    if (QFX) QFX.update(dt); dynRes(realDt); windTick(dt);
    if (REPLAY.on) repTick(realDt);
    else if (state === "race" || state === "end") { raceT += dt; /* 결승 뒤에도 시계는 계속 (라이벌 기록 재려고) */ stepPlayer(dt); stepAI(dt); stepWeapons(dt); lapLogic(); }
    else if (state === "count" || state === "menu" || state === "intro") { stepPlayer(dt); stepAI(dt); }
    stepParticles(smoke, dt, -1.5, 1.2); stepParticles(sparks, dt, 18, 0.5); stepParticles(dust, dt, -0.6, 0.8); stepParticles(debris, dt, 22, 0.3); stepParticles(boostCore, dt, 0, 3); stepParticles(boostFire, dt, -2, 2.2); stepParticles(smokeD, dt, -1.2, 1.1); stepParticles(fireP, dt, -6, 3); if (!REPLAY.on) { if (state === "race" || state === "end") stepProps(); stepWreck(dt); stepDamageFx(dt); } stepBoostFx(dt); stepParticles(streaks, dt, 0, 0);
    if (msgT > 0) { msgT -= realDt; if (msgT <= 0) document.getElementById("msg").textContent = ""; }
    if (!REPLAY.on) { syncMeshes(dt); recFrame(); } updateCamera(realDt); drawFx(dt); updateHud(); updateSound(realDt);
    if (window.__hb && !window.__hbDone) { window.__hbDone = 1; for (const o of [player, ...ais]) for (const b of o.mesh.userData.boxes) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(b[3] * 2 / CS, 3 / CS, b[2] * 2 / CS)), new THREE.LineBasicMaterial({ color: 0xff00ff, depthTest: false })); e.position.set(b[0] / CS, 1.5 / CS, b[1] / CS); o.mesh.add(e); } }
    if (window.__hero) { const [ang, dist, hgt, idx] = window.__hero, tgt = idx === undefined ? player : ais[idx], m = tgt.mesh; [player, ...ais].forEach(o => o.mesh.visible = o === tgt);
      if (idx !== undefined) { m.position.set(player.x, player.y, player.z); m.rotation.set(0, player.h, 0); }
      camera.position.set(m.position.x + Math.sin(player.h + ang) * dist, m.position.y + hgt, m.position.z + Math.cos(player.h + ang) * dist); camera.lookAt(m.position.x, m.position.y + 1.2, m.position.z); camera.fov = 40; camera.updateProjectionMatrix(); }
    if (window.__look) { const L_ = window.__look(); camera.position.set(L_[0], L_[1], L_[2]); camera.lookAt(L_[3], L_[4], L_[5]); camera.fov = 50; camera.updateProjectionMatrix(); }
    if (window.__top) { camera.position.set(window.__top[0], window.__top[2], window.__top[1] + 1); camera.lookAt(window.__top[0], 0, window.__top[1]); camera.fov = 60; camera.updateProjectionMatrix(); }
    if (window.__show) { const all = [player.mesh, ...ais.map(x => x.mesh)], t = TRK[40], y = surfH(TRK[40].s, 0); all.forEach((m, i) => { m.visible = true; m.position.set(t.x + nx(t) * (-HALF + 1 + i * 4.6) + t.tx * (i % 2) * 5, y, t.z + nz(t) * (-HALF + 1 + i * 4.6) + t.tz * (i % 2) * 5); m.rotation.set(0, Math.atan2(t.tx, t.tz) + window.__show, 0); });
      camera.position.set(t.x + t.tx * 14 + nx(t) * 0, y + 5, t.z + t.tz * 14); camera.lookAt(t.x, y + 0.5, t.z); camera.fov = 60; camera.updateProjectionMatrix(); }
    renderMain(realDt);
    renderMirror(); drawRadar(); drawDmgMap(realDt);
  } catch (e) { console.error(e); }
}
requestAnimationFrame(frame);
function simulate(secs, driver) {
  const dt = 1 / 60;
  for (let t = 0; t < secs; t += dt) { if (state !== "race" && state !== "end") break; const d = driver(player); Object.assign(input, d); raceT += dt; stepPlayer(dt); stepAI(dt); stepWeapons(dt); stepProps(); stepWreck(dt); lapLogic(); syncMeshes(dt); recFrame(); }
}
window.__cam = () => { updateCamera(1 / 30); return camera.position.distanceTo(new THREE.Vector3(player.x, player.y, player.z)); };
window.__SND = SND; window.__upd = updateSound; window.__inp = input; window.__bgp = { mp: { MP, apply: mpApplyModels, MODELS: MP_MODELS, carOfSlot, get player() { return player; }, get ais() { return ais; } }, get SFX() { return SFX; }, get renderer() { return renderer; }, get scene() { return scene; }, get camera() { return camera; }, get REC() { return REC; }, detachPart, ensureDmg, raySolid, get SOLIDS() { return SOLIDS; }, useSpecial, fireGun, PROJ, TETHERS, setSpecial, enterTumble, applyDamage, explode, hitLocal, repairAll, demoDrive, get REPLAY() { return REPLAY; }, WRECK, get GAP() { return GAP; }, player, ais, get state() { return state; }, get L() { return L; }, get HALF() { return HALF; }, P, startRace, simulate, get TRK() { return TRK; }, idxAtS, posAt, surfH, setCourse(id) { buildCourse(id); loadBest(); placeGrid(); }, skipCount() { if (state === "intro") introEnd(); countdown = 0.01; } };
})();
