// ---- 관전: 결승 뒤 다른 차를 체이스 캠 / TV 캠으로 보기
const SPEC = { on: false, car: null, mode: "chase", tv: null, h: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), fresh: true, side: 1 };
function specCars() { return [player, ...ais].filter(c => !c.dead); }
function specOn() {
  const st = standings(), list = specCars(); // 처음엔 아직 달리는 차 중 가장 앞 차, 없으면 1위
  const pick = st.find(r => !r.done && !r.ret) || st.find(r => !r.ret); SPEC.car = (pick && (pick.me ? player : ais.find(a => a.name === pick.name))) || list[0] || player;
  SPEC.on = true; SPEC.fresh = true; SPEC.tv = null; player.mesh.visible = true;
  document.getElementById("endScreen").style.display = "none"; document.body.classList.add("spec"); specLabel();
}
function specOff(showRes) {
  if (!SPEC.on) return; SPEC.on = false; document.body.classList.remove("spec"); player.mesh.visible = camMode !== "cockpit"; firstFrame = true;
  if (showRes && state === "end") document.getElementById("endScreen").style.display = "flex";
}
function specStep(d) { const list = specCars(); if (!list.length) return; let i = list.indexOf(SPEC.car); i = (i + d + list.length) % list.length; SPEC.car = list[i]; SPEC.fresh = true; SPEC.tv = null; specLabel(); }
function specMode(m) { SPEC.mode = m; SPEC.fresh = true; SPEC.tv = null; document.getElementById("spChase").classList.toggle("on", m === "chase"); document.getElementById("spTv").classList.toggle("on", m === "tv"); }
function specLabel() {
  const c = SPEC.car; if (!c) return; const st = standings(), pos = st.findIndex(r => r.me ? c === player : r.name === c.name) + 1;
  const lap = Math.min(lapsTotal, Math.floor(Math.max(0, c.prog) / L) + 1);
  document.getElementById("specName").innerHTML = `${pos}위 · ${c.name}<small>${c.done ? "완주" : `랩 ${lap}/${lapsTotal} · ${Math.round(Math.abs(c.vf || 0) * 3.6)} km/h`}</small>`;
}
function specCam(dt) {
  let c = SPEC.car; if (!REPLAY.on && (!c || (c.dead && specCars().length))) { specStep(1); c = SPEC.car; } if (!c) return;
  const cv = REPLAY.on ? (REPLAY.view.get(c) || c) : c; // 리플레이 중엔 기록된 방향·위치·속도
  const m = c.mesh.position, k = SPEC.fresh ? 1 : 0;
  if (SPEC.mode === "chase") {
    let dh = cv.h - SPEC.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; SPEC.h += dh * (k || Math.min(1, (cv.tumble ? 1.5 : 6) * dt));
    const big = (c.mesh.userData.topH || 3.5) / 3.5, back = 12.5 * big + 1.5, up = 4 * big, fx_ = Math.sin(SPEC.h), fz_ = Math.cos(SPEC.h);
    const want = _sv.set(m.x - fx_ * back, m.y + up, m.z - fz_ * back), look = _sv2.set(m.x + fx_ * 10, m.y + 1.3, m.z + fz_ * 10);
    SPEC.pos.lerp(want, k || 1 - Math.exp(-6 * dt)); SPEC.look.lerp(look, k || 1 - Math.exp(-10 * dt));
    camera.position.copy(SPEC.pos); camera.lookAt(SPEC.look); camera.fov = 64;
  } else { // TV 캠: 길가에 세운 카메라가 다가오는 차를 줌으로 따라감. 지나가면 다음 카메라로
    const ahead = cv.prog - (SPEC.tv ? SPEC.tv.prog : -1e9), v = Math.max(30, Math.abs(cv.vf || 0));
    // 차가 카메라 앞을 지나 뒷모습이 멀어질 때까지 붙잡고 있다가 다음 카메라로
    if (SPEC.tv && ahead > SPEC.tv.past) SPEC.tvDone = true;
    if (!SPEC.tv || ahead > SPEC.tv.past + (DEMO.on || (REPLAY.on && REPLAY.auto) ? 1e9 : 0) || ahead < -SPEC.tv.lead - 150) {
      SPEC.tv = tvPick(cv, v); SPEC.look.set(m.x, m.y + 1, m.z); SPEC.tvDone = false;
    }
    const T = SPEC.tv; camera.position.set(T.x, T.y, T.z); SPEC.look.lerp(_sv.set(m.x, m.y + 1, m.z), k || 1 - Math.exp(-9 * dt)); camera.lookAt(SPEC.look);
    const d = Math.max(1, camera.position.distanceTo(SPEC.look)); camera.fov = clamp(2 * Math.atan(11 / d) * 180 / Math.PI, 12, 60); // 멀면 당겨 찍고 가까우면 넓게
  }
  SPEC.fresh = false; camera.updateProjectionMatrix(); fov = camera.fov;
  if (SPEC.on && (SPEC.lt = (SPEC.lt || 0) + dt) > 0.25) { SPEC.lt = 0; specLabel(); }
}
const _sv = new THREE.Vector3(), _sv2 = new THREE.Vector3();
function tvPick(c, v) { // 길가 카메라 자리 고르기: 차가 다가오고 지나가는 길이 간판·선인장·벽에 안 가리는 곳
  const past = v * 1.6 + 50; let best = null, bb = 1e9;
  for (let tr = 0; tr < 10 && bb > 0; tr++) {
    SPEC.side = -SPEC.side; const lead = v * 2.4 + 70 + Math.random() * 40, sp = c.prog + lead, lat = SPEC.side * (HALF + 8 + Math.random() * 10), q = posAt(wrapS(sp), lat);
    const cam = { prog: sp, lead, past, x: q.x, y: q.y + 6 + Math.random() * 6, z: q.z };
    let blocked = 0;
    for (const f of [-0.85, -0.6, -0.35, -0.12, 0.35, 0.75]) { // 다가오는 구간·지나간 뒤 구간을 몇 군데 찍어서 시야 확인
      const pt = posAt(wrapS(sp + (f < 0 ? f * lead : f * past)), 0), dx = pt.x - cam.x, dz = pt.z - cam.z, dl = Math.hypot(dx, dz); if (dl < 1) continue;
      const ux = dx / dl, uz = dz / dl, yh = pt.y + 1.5;
      if (raySolid(cam.x, cam.z, ux, uz, dl - 4, yh) !== null || rayProp(cam.x, cam.z, ux, uz, dl - 4, yh)) blocked += f > -0.2 && f < 0.5 ? 2 : 1; // 카메라 바로 앞을 지나는 순간이 가리면 더 나쁨
    }
    if (blocked < bb) { bb = blocked; best = cam; }
  }
  return best;
}
document.getElementById("bSpec").onclick = specOn; document.getElementById("spBack").onclick = () => specOff(true);
document.getElementById("spPrev").onclick = () => specStep(-1); document.getElementById("spNext").onclick = () => specStep(1);
document.getElementById("spChase").onclick = () => specMode("chase"); document.getElementById("spTv").onclick = () => specMode("tv");
function toMenu() { introCleanup(); repStop(); specOff(); clearTimeout(endTimer); state = "menu"; placeGrid(); gridFresh = true; showScreen("startScreen"); }
function toTitle() { introCleanup(); repStop(); specOff(); clearTimeout(endTimer); state = "menu"; placeGrid(); gridFresh = true; showScreen("titleScreen"); }
function isTouchDev() { return matchMedia("(pointer: coarse)").matches || "ontouchstart" in window; }
function GLOW() { return SET.gfx === "low" || SET.gfx === "min"; } /* 낮음·최저 */
function GMIN() { return SET.gfx === "min"; } /* 최저: 해상도 0.6배, 후처리·백미러·차 외곽선 끔, 시야 짧게 */
function basePR() { return GMIN() ? 0.6 : GLOW() ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 1.5); }
const SET = { vol: 60, shake: 1, blur: 0.5, gfx: isTouchDev() ? "low" : "high" }; try { Object.assign(SET, JSON.parse(localStorage.getItem("bgp_set") || "{}")); } catch (e) {}
function applySet() {
  try { localStorage.setItem("bgp_set", JSON.stringify(SET)); } catch (e) {}
  if (SND.master) SND.master.gain.value = SND.on ? SET.vol / 100 : 0;
  renderer.setPixelRatio(basePR()); renderer.shadowMap.enabled = !GLOW(); outlineMat.visible = !GLOW(); carOlMat.visible = !GMIN(); /* 폰: 배경 외곽선은 화면 잉크선으로 대신 (차 외곽선은 유지) */ resize(); applyViewDist(); if (typeof DYN !== "undefined") DYN.pr = 0;
  document.getElementById("sVol").value = SET.vol;
  document.querySelectorAll("[data-shk]").forEach(b => b.classList.toggle("on", +b.dataset.shk === SET.shake)); document.querySelectorAll("[data-blr]").forEach(b => b.classList.toggle("on", +b.dataset.blr === SET.blur)); document.querySelectorAll("[data-gfx]").forEach(b => b.classList.toggle("on", b.dataset.gfx === SET.gfx));
}
function togglePause() {
  if (DEMO.on) return;
  if (state === "race" || state === "count") { state = "paused:" + state; document.getElementById("pauseScreen").style.display = "flex"; }
  else if (state.startsWith("paused:")) { state = state.slice(7); document.getElementById("pauseScreen").style.display = "none"; }
}
function toggleCam() { camMode = camMode === "chase" ? "cockpit" : "chase"; const ck = camMode === "cockpit"; document.getElementById("dash").style.display = ck ? "block" : "none"; document.getElementById("hudBR").style.display = ck ? "none" : "block"; player.mesh.visible = !ck; }
function toggleTune() { const t = document.getElementById("tune"); t.style.display = t.style.display === "block" ? "none" : "block"; }
function resetToTrack() { resetCar(player); }
function resetCar(p) {
  if (state !== "race") return; let t = TRK[p.idx]; if (GAP && t.s > GAP[0] - 5 && t.s < GAP[1] + 20) t = TRK[idxAtS(GAP[1] + 40)];
  Object.assign(p, { tumble: false, x: t.x, z: t.z, h: Math.atan2(t.tx, t.tz), vf: Math.min(Math.abs(p.vf), 20), vl: 0, ry: 0, offTimer: 0, s: t.s, lat: 0, stuckT: 0 }); toWorld(p); suspReset(p, surfH(t.s, 0)); if (p === player) setMsg("코스 복귀");
}
const sl = document.getElementById("sliders");
function buildSliders() {
  sl.innerHTML = "";
  for (const k of Object.keys(DEFAULTS)) {
    const [lab, mn, mx, st] = LABELS[k], wrap = document.createElement("label");
    wrap.innerHTML = `<div class="row"><span>${lab}</span><span id="v_${k}">${P[k]}</span></div><input type="range" min="${mn}" max="${mx}" step="${st}" value="${P[k]}">`;
    wrap.querySelector("input").addEventListener("input", e => { P[k] = parseFloat(e.target.value); document.getElementById("v_" + k).textContent = P[k]; saveTune(); });
    sl.appendChild(wrap);
  }
}
buildSliders();
document.getElementById("tReset").onclick = () => { P = { ...DEFAULTS }; saveTune(); buildSliders(); };
function tapBtn(id, fn) { // 터치에선 click이 막히는 경우가 있어 pointerup으로 직접 처리
  const el = document.getElementById(id);
  el.addEventListener("pointerup", e => { e.preventDefault(); e.stopPropagation(); fn(); });
  el.addEventListener("click", e => { if (e.detail === 0) fn(); }); // 키보드(Enter)로 누른 경우만. 터치·마우스는 pointerup에서 처리
}
tapBtn("bCam", toggleCam); tapBtn("bFull", () => goFull(false)); tapBtn("bSnd", () => { audioInit(); setSound(!SND.on); });
document.getElementById("bStart").onclick = () => { if (isTouch) goFull(true); startRace(); };
document.getElementById("bAgain").onclick = startRace;
document.getElementById("bTitle").onclick = toTitle;
const titleBtn = (id, fn) => document.getElementById(id).onclick = () => { audioInit(); fn(); };
titleBtn("tmRace", () => showScreen("startScreen")); titleBtn("tmHelp", () => showScreen("helpScreen")); titleBtn("tmSet", () => showScreen("setScreen"));
document.getElementById("bHelpBack").onclick = document.getElementById("bSetBack").onclick = document.getElementById("bSetupBack").onclick = () => showScreen("titleScreen");
document.getElementById("sVol").oninput = e => { SET.vol = +e.target.value; applySet(); };
document.querySelectorAll("[data-shk]").forEach(b => b.onclick = () => { SET.shake = +b.dataset.shk; applySet(); });
document.querySelectorAll("[data-blr]").forEach(b => b.onclick = () => { SET.blur = +b.dataset.blr; applySet(); });
document.querySelectorAll("[data-gfx]").forEach(b => b.onclick = () => { SET.gfx = b.dataset.gfx; applySet(); });
setTimeout(applySet, 0);
document.getElementById("bMenu").onclick = toMenu;
document.getElementById("bResume").onclick = togglePause;
document.getElementById("bRestart").onclick = startRace;
document.getElementById("bPortrait").onclick = () => document.body.classList.add("allowPortrait");
document.querySelectorAll(".lsel[data-l]").forEach(b => b.onclick = () => setLaps(+b.dataset.l)); setLaps(lapsTotal);
function setSpecial(w) { mySpecial = w; try { localStorage.setItem("bgp_special", w); } catch (e) {} document.querySelectorAll(".wsel").forEach(b => b.classList.toggle("on", b.dataset.w === w)); if (player.wpn && state !== "race") armAll(); }
document.querySelectorAll(".wsel").forEach(b => b.onclick = () => setSpecial(b.dataset.w)); setSpecial(mySpecial);
document.querySelectorAll(".csel").forEach(b => b.onclick = () => { if (b.dataset.c !== courseId) { buildCourse(b.dataset.c); placeGrid(false); gridFresh = true; } });

