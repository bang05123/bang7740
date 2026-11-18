// ---- 큰 글자 연출 (컷인 없이 화면 위에만)
const kos = new Map();
function showBig(txt, dur = 1.6) { const e = document.getElementById("bigMsg"); e.textContent = txt; e.style.transition = "none"; e.style.opacity = 1; e.style.transform = "scale(1.35)"; requestAnimationFrame(() => { e.style.transition = `transform .35s ease-out, opacity .4s ease-in ${dur}s`; e.style.transform = "scale(1)"; e.style.opacity = 0; }); }
function hideBig() { const e = document.getElementById("bigMsg"); e.style.transition = "none"; e.style.opacity = 0; }
function sndFanfare(win) { const notes = win ? [523, 659, 784, 1047] : [440, 554, 659]; notes.forEach((f, i) => shot((ctx, t) => { tone(ctx, t, 0.5, "square", f, f, 0.09, i * 0.12); tone(ctx, t, 0.5, "triangle", f / 2, f / 2, 0.12, i * 0.12); }, 0.5 + i * 0.12)); }
function sndFinalLap() { [0, 0.16, 0.32].forEach(d => shot((ctx, t) => tone(ctx, t, 0.12, "square", 1046, 1046, 0.1, d), 0.5)); }
// ================= 랩과 순위 =================
function fmt(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(2).padStart(5, "0")}`; }
const bestKey = () => "bgp_best4_" + courseId;
let best = null; const loadBest = () => { try { best = parseFloat(localStorage.getItem(bestKey())) || null; } catch (e) { best = null; } };
const GAP_STEP = 20; /* 20m마다 지나간 시각을 적어둠 → 같은 지점을 지난 시각 차이 = 간격 */
function gapRec() { if (raceT <= 0) return; for (const c of [player, ...ais]) { if (!c.ghist || raceT < (c.ghistT0 ?? 1e9)) { c.ghist = []; c.ghistT0 = raceT; } if (c.dead || c.done) continue; const b = Math.floor(c.prog / GAP_STEP); if (b < 0) continue; const h = c.ghist; if (h.length === 0) { h[b] = raceT; continue; } let last = h.length - 1; while (last < b) { last++; h[last] = raceT; } } }
function gapReset() { for (const c of [player, ...ais]) { c.ghist = []; c.ghistT0 = 0; } }
function gapTAt(c, prog) { const h = c.ghist; if (!h) return null; const b = Math.floor(prog / GAP_STEP), f = prog / GAP_STEP - b, a = h[b], n = h[b + 1]; if (a === undefined) return null; return n === undefined ? a : a + (n - a) * f; }
const GAPV = { t: 0, html: "" };
function gapHtml(st) { /* 앞차·뒤차 간격 (0.25초마다) */
  if (performance.now() - GAPV.t < 250) return GAPV.html; GAPV.t = performance.now();
  const i = st.findIndex(r => r.me); let out = "";
  if (state === "race" && !player.done && !player.dead && raceT > 2) {
    const A = i > 0 ? st[i - 1] : null, B = i < st.length - 1 ? st[i + 1] : null;
    if (A && !A.ret) { const t0 = gapTAt(A.car, player.prog); const g = A.done ? null : t0 === null ? null : raceT - t0; out += `<span style="color:#ffb15a">▲ ${g === null ? "-" : "+" + g.toFixed(1)}</span>`; }
    if (B && !B.ret && !B.done) { const t0 = gapTAt(player, B.car.prog); const g = t0 === null ? null : raceT - t0; out += `${out ? " &nbsp;" : ""}<span style="color:#6fd8ff">▼ ${g === null ? "-" : "−" + g.toFixed(1)}</span>`; }
  }
  GAPV.html = out ? `<span style="font-size:13px;font-weight:700;margin-left:8px;vertical-align:middle">${out}</span>` : ""; return GAPV.html;
}
function lapLogic() {
  gapRec();
  const lapNow = Math.floor(player.prog / L);
  if (!DEMO.on && !player.done && lapNow > player.laps.length && player.prog > 0) {
    const lt = raceT - player.lapStart; player.laps.push(lt); player.lapStart = raceT;
    if (!best || lt < best) { best = lt; try { localStorage.setItem(bestKey(), String(best)); } catch (e) {} setMsg(`최고 랩! ${fmt(lt)}`); } else setMsg(`랩 ${fmt(lt)}`);
    if (player.laps.length >= lapsTotal) { player.done = true; player.finishT = raceT; const pos = standings().findIndex(r => r.me) + 1;
      setMsg("", 0.01); showBig(pos === 1 ? "WINNER!" : `${pos}위 FINISH`, 2.2); slowT = 1.4; flashT = 1; shake = Math.max(shake, 0.6); sndFanfare(pos === 1);
      const t = TRK[0]; for (let k = 0; k < 160; k++) { const sd = (Math.random() - 0.5) * 2 * hwAt(0); emit(k % 2 ? boostCore : boostFire, t.x + nx(t) * sd, surfH(0, 0) + 1 + Math.random() * 8, t.z + nz(t) * sd, (Math.random() - 0.5) * 10, 6 + Math.random() * 14, (Math.random() - 0.5) * 10, 1.4); }
      endTimer = setTimeout(showEnd, 3200); }
    else if (player.laps.length === lapsTotal - 1) { setMsg("", 0.01); showBig("FINAL LAP", 1.4); sndFinalLap(); flashT = Math.max(flashT, 0.5); }
  }
  for (const a of ais) if (!a.net && !a.done && a.prog >= lapsTotal * L) { a.done = true; a.finishT = raceT; }
  if (state === "race" && raceT > 2) { const pos = standings().findIndex(r => r.me) + 1; if (pos < lastPos && msgT <= 0.3) setMsg(pos === 1 ? "선두 탈환!" : "OVERTAKE!", 0.9); lastPos = pos; }
}
function standings() {
  const all = [{ name: player.name, prog: player.prog, done: player.done, t: player.finishT, me: true, ret: player.dead, car: player }, ...ais.map(a => ({ name: a.name, prog: a.prog, done: a.done, t: a.finishT, ret: a.dead, car: a }))];
  return all.sort((a, b) => (a.ret - b.ret) || ((a.done && b.done) ? a.t - b.t : (b.done - a.done) || (b.prog - a.prog)));
}
let endRefresh = 0;
function showEnd() {
  if (!player.done && !player.dead) return; state = "end";
  renderEnd(); clearInterval(endRefresh); endRefresh = setInterval(() => { if (state !== "end") { clearInterval(endRefresh); return; } renderEnd(); }, 500);
  document.getElementById("endScreen").style.display = "flex";
}
function estT(r) { // 아직 달리는 차: 지금까지 평균 속도로 남은 거리를 달린다고 치고 예상 기록
  const pace = Math.max(15, r.prog / Math.max(1, raceT)); return raceT + Math.max(0, lapsTotal * L - r.prog) / pace;
}
function renderEnd() {
  const st = standings(), pos = st.findIndex(r => r.me) + 1;
  document.getElementById("endTitle").textContent = player.dead ? "RETIRED" : pos === 1 ? "1위! FINISH" : `${pos}위 FINISH`;
  for (const r of st) if (!r.done && !r.ret) r.est = estT(r);
  st.sort((a, b) => (a.ret - b.ret) || ((a.done ? a.t : a.est) - (b.done ? b.t : b.est)));
  const lead = st.find(r => r.done && !r.ret) || st.find(r => !r.ret), lt = lead ? (lead.done ? lead.t : lead.est) : 0, carOf = r => r.me ? player : ais.find(a => a.name === r.name);
  document.getElementById("resTable").innerHTML = `<tr style="color:#888;font-size:12px"><td></td><td></td><td style="text-align:right">기록</td><td class="ko">격파</td></tr>` + st.map((r, i) => { const c = carOf(r), ko = kos.get(c) || 0;
    return `<tr class="${r.me ? "me" : ""}"><td>${r.ret ? "-" : i + 1}</td><td>${r.name}</td><td style="text-align:right">${r.ret ? "리타이어" : r.done ? (r === lead ? fmt(r.t) : "+" + (r.t - lt).toFixed(2)) : `<span style="color:#8b93a0" title="아직 달리는 중 · 예상 기록">~${r === lead ? fmt(r.est) : "+" + (r.est - lt).toFixed(1)} 🏁</span>`}</td><td class="ko">${ko ? "💥" + ko : ""}</td></tr>`; }).join("");
  const myBest = player.laps.length ? Math.min(...player.laps) : null;
  document.getElementById("endInfo").innerHTML = `${C.name} · 이번 최고 랩 ${myBest ? fmt(myBest) : "-"} · 코스 기록 ${best ? fmt(best) : "-"}<br>격파 ${kos.get(player) || 0} · 남은 내구도 ${Math.max(0, Math.round(player.hp ?? 0))} · 부스트 ${3 - player.charges}/3 사용`;
}

// ================= 화면 효과 =================
const fx = document.getElementById("fx"), fctx = fx.getContext("2d");
const lines = Array.from({ length: 90 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), sp: 0.6 + Math.random() }));
function drawReticle() { // 조준 표시와 미사일 경고
  if (!player.wpn || player.dead || state !== "race") return; const w = fx.width, h = fx.height; camera.updateMatrixWorld(); // 백미러 렌더 후 남은 행렬 대신 현재 시점으로 투영
  { const dtf = 1 / 60; HITFX.mark = Math.max(0, HITFX.mark - dtf); HITFX.big = Math.max(0, HITFX.big - dtf); HITFX.tickCd -= dtf;
    // 맞은 방향: 화면 가장자리에 붉은 호
    const camAng = Math.atan2(camLook.x - camera.position.x, camLook.z - camera.position.z), R = Math.min(w, h) * 0.42;
    for (let i = HITFX.hurt.length - 1; i >= 0; i--) { const H = HITFX.hurt[i]; H.t -= dtf; if (H.t <= 0) { HITFX.hurt.splice(i, 1); continue; }
      let rel = H.ang - camAng; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI; const a = -Math.PI / 2 - rel; // 화면 위 = 정면
      fctx.strokeStyle = `rgba(255,40,30,${Math.min(1, H.t * 2) * 0.85 * H.k})`; fctx.lineWidth = 10 + H.k * 10; fctx.beginPath(); fctx.arc(w / 2, h / 2, R, a - 0.35, a + 0.35); fctx.stroke(); } }
  { const m = muzzle(player), fx_ = Math.sin(player.h), fz_ = Math.cos(player.h), v = new THREE.Vector3(m[0] + fx_ * 70, m[1], m[2] + fz_ * 70).project(camera); if (v.z < 1) { const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
    if (HITFX.mark > 0 || HITFX.big > 0) { const big = HITFX.big > 0, r1 = big ? 9 : 7, r2 = big ? 24 : 16; fctx.strokeStyle = big ? "#ff4a3a" : "#ffffff"; fctx.lineWidth = big ? 4 : 3; fctx.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { fctx.moveTo(x + sx * r1, y + sy * r1); fctx.lineTo(x + sx * r2, y + sy * r2); } fctx.stroke(); } // 맞힌 표시 (X)
    fctx.strokeStyle = "rgba(255,255,255,0.75)"; fctx.lineWidth = 2; fctx.beginPath(); fctx.moveTo(x - 12, y); fctx.lineTo(x - 4, y); fctx.moveTo(x + 4, y); fctx.lineTo(x + 12, y); fctx.moveTo(x, y - 12); fctx.lineTo(x, y - 4); fctx.moveTo(x, y + 4); fctx.lineTo(x, y + 12); fctx.stroke(); } } // 정면 조준선
  const tg = player.wpn.sp === "missile" ? findTarget(player, 320, 0.45) : null;
  if (tg) { const v = new THREE.Vector3(tg.x, tg.y + 1, tg.z).project(camera); if (v.z < 1) { const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h, r = 26; fctx.strokeStyle = "#ff4a3a"; fctx.lineWidth = 3;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { fctx.beginPath(); fctx.moveTo(x + sx * r, y + sy * r * 0.6); fctx.lineTo(x + sx * r, y + sy * r); fctx.lineTo(x + sx * r * 0.6, y + sy * r); fctx.stroke(); } } }
  const inc = PROJ.find(q => q.type === "missile" && q.target === player);
  if (inc) { fctx.fillStyle = performance.now() % 300 < 150 ? "#ff3b3b" : "#ffd23a"; fctx.font = "900 italic 28px sans-serif"; fctx.textAlign = "center"; fctx.fillText("⚠ 미사일 접근", w / 2, h * 0.2); fctx.textAlign = "left"; }
  if (player.wpn.sp === "pile" && state === "race" && player.wpn.ammo > 0 && player.wpn.cd <= 0 && pileTarget(player)) { fctx.fillStyle = performance.now() % 240 < 120 ? "#ffb040" : "#fff"; fctx.font = "900 italic 22px sans-serif"; fctx.textAlign = "center"; fctx.fillText("▶ 파일벙커 사정거리!", w / 2, h * 0.64); fctx.textAlign = "left"; }
  if (player.wpn.sp === "rail" && player.wpn.charge > 0) { fctx.strokeStyle = `rgba(255,170,60,${0.3 + player.wpn.charge * 0.6})`; fctx.lineWidth = 2; fctx.beginPath(); fctx.moveTo(w / 2, h * 0.62); fctx.lineTo(w / 2, h * 0.38); fctx.stroke(); }
}
function drawFx(dt) {
  const w = fx.width, h = fx.height; fctx.clearRect(0, 0, w, h); drawReticle();
  const boost = player.boostT > 0, ratio = Math.max(0, (Math.abs(player.vf) / P.top - 0.22) / 0.78) + (boost ? 0.8 : 0);
  const cx = w / 2, cy = h * 0.47, R = Math.hypot(w, h) / 2;
  if (boost) { const g = fctx.createRadialGradient(cx, cy, R * 0.35, cx, cy, R); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.7, "rgba(255,90,30,0.08)"); g.addColorStop(1, "rgba(60,220,255,0.22)"); fctx.fillStyle = g; fctx.fillRect(0, 0, w, h); }
  else if (ratio > 0.3) { const g = fctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${Math.min(0.42, ratio * 0.32)})`); fctx.fillStyle = g; fctx.fillRect(0, 0, w, h); }
  // 부스트: 레드라인식 만화 집중선 (굵고 끝이 뾰족한 잉크 붓 터치, 화면 가장자리에서 중심으로)
  FOCUS.amt += ((boost ? 1 : 0) - FOCUS.amt) * Math.min(1, (boost ? 10 : 4) * dt); if (boost && !FOCUS.was) FOCUS.kick = 1; FOCUS.was = boost; FOCUS.kick = Math.max(0, FOCUS.kick - dt * 2.2);
  const fa = FOCUS.amt; if (fa < 0.02 || SPEC.on || REPLAY.on) return;
  if ((FOCUS.t += dt) > 0.05 || !FOCUS.list.length) { FOCUS.t = 0; FOCUS.list = []; const n = 64; for (let i = 0; i < n; i++) FOCUS.list.push({ a: (i + Math.random() * 0.8) / n * Math.PI * 2, r0: 0.5 + Math.random() * 0.32 - FOCUS.kick * 0.18, wd: 3 + Math.random() * 13, white: Math.random() < 0.18 }); } // 0.05초마다 새로 그려 지글지글
  for (const f of FOCUS.list) { const ca = Math.cos(f.a), sa = Math.sin(f.a), x0 = cx + ca * R * f.r0, y0 = cy + sa * R * f.r0 * 0.8, x1 = cx + ca * R * 1.15, y1 = cy + sa * R * 1.15 * 0.8, wd = f.wd * (0.6 + fa * 0.6) * (w / 900);
    fctx.fillStyle = f.white ? `rgba(255,255,255,${0.55 * fa})` : `rgba(10,8,8,${0.78 * fa})`; fctx.beginPath(); fctx.moveTo(x0, y0); fctx.lineTo(x1 - sa * wd, y1 + ca * wd); fctx.lineTo(x1 + sa * wd, y1 - ca * wd); fctx.closePath(); fctx.fill(); }
}
const FOCUS = { amt: 0, t: 0, list: [], was: false, kick: 0 };
// 고속 주행: 3D 바람 줄기 (실제 공간에 떠 있어서 차가 스쳐 지나감, 가까운 건 빠르게 먼 건 느리게)
const WIND = (() => { const n = isTouch ? 26 : 56, mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, 1), mat, n); im.frustumCulled = false; im.layers.set(1); scene.add(im);
  return { im, mat, n, p: Array.from({ length: n }, () => new THREE.Vector3()), live: false }; })();
function windTick(dt) {
  const p = player, show = state === "race" && !SPEC.on && !REPLAY.on && !DEMO.on && !p.dead, sr = Math.abs(p.vf) / P.top, boost = p.boostT > 0;
  const op = show ? clamp((sr - 0.4) * 1.3, 0, 0.55) + (boost ? 0.2 : 0) : 0; WIND.mat.opacity += (op - WIND.mat.opacity) * Math.min(1, 6 * dt); WIND.im.visible = WIND.mat.opacity > 0.01; if (!WIND.im.visible) { WIND.live = false; return; }
  const sp = Math.hypot(p.vx, p.vz) || 1, fx_ = p.vx / sp, fz_ = p.vz / sp, rx = fz_, rz = -fx_, M = WIND._m || (WIND._m = new THREE.Matrix4()), Q = WIND._q || (WIND._q = new THREE.Quaternion()), S = WIND._s || (WIND._s = new THREE.Vector3()), up = WIND._u || (WIND._u = new THREE.Vector3(0, 0, 1)), d = WIND._d || (WIND._d = new THREE.Vector3());
  const spawn = (v, far) => { const side = Math.random() < 0.5 ? -1 : 1, lat = side * (1.8 + Math.random() * 8), fwd = far ? 20 + Math.random() * 55 : -10 + Math.random() * 70; v.set(p.x + fx_ * fwd + rx * lat, p.y + 0.3 + Math.random() * 4.2, p.z + fz_ * fwd + rz * lat); };
  const len = 1 + sp * 0.07 + (boost ? 3 : 0); d.set(fx_, 0, fz_); Q.setFromUnitVectors(up, d); S.set(1, 1, len);
  for (let i = 0; i < WIND.n; i++) { const v = WIND.p[i]; if (!WIND.live) spawn(v, false); const rel = (v.x - p.x) * fx_ + (v.z - p.z) * fz_; if (rel < -14 || Math.abs((v.x - p.x) * rx + (v.z - p.z) * rz) > 18) spawn(v, true); M.compose(v, Q, S); WIND.im.setMatrixAt(i, M); }
  WIND.live = true; WIND.im.instanceMatrix.needsUpdate = true;
}

