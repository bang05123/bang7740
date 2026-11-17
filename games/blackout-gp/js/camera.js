// ================= 카메라와 그리기 =================
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camOff = new THREE.Vector3(0, 3, -9), lookOffS = new THREE.Vector3(0, 1, 11); let camAcc = 0, camLag = 0;
let fov = 66, firstFrame = true, camH = 0;
function updateCamera(dt) {
  if (state === "menu") { // 메뉴: 그리드 위를 천천히 도는 카메라
    const p = player, t = (FEST.menuT = (FEST.menuT || 0) + dt), a = p.h + 2.4 + t * 0.12, R = 15 + Math.sin(t * 0.2) * 3;
    camera.position.set(p.x + Math.sin(a) * R - Math.sin(p.h) * 12, p.y + 4.5 + Math.sin(t * 0.15) * 1.5, p.z + Math.cos(a) * R - Math.cos(p.h) * 12); camera.lookAt(p.x - Math.sin(p.h) * 14, p.y + 1, p.z - Math.cos(p.h) * 14);
    if (camera.fov !== 55) { camera.fov = 55; camera.updateProjectionMatrix(); } fov = 55; firstFrame = true; return;
  }
  if (state === "intro") { introCam(dt); return; }
  if ((SPEC.on && state === "end") || DEMO.on || REPLAY.on) { specCam(dt); return; }
  if (player.dead && camMode === "chase") { // 리타이어: 잔해 주위를 천천히 돌며 멀어짐
    const p = player, t = p.camRetT = (p.camRetT || 0) + dt, a = camH + 0.6 + t * 0.22, dist = 11 + Math.min(14, t * 2.2), up = 3.5 + Math.min(6, t * 0.9);
    camPos.lerp(new THREE.Vector3(p.x - Math.sin(a) * dist, p.y + up, p.z - Math.cos(a) * dist), 1 - Math.exp(-3 * dt)); camera.position.copy(camPos);
    if (shake > 0) { const sk = shake * SET.shake; camera.position.x += (Math.random() - 0.5) * sk; camera.position.y += (Math.random() - 0.5) * sk * 0.6; shake = Math.max(0, shake - dt * 1.8); }
    camera.lookAt(p.x, p.y + 0.8, p.z); return;
  }
  const p = player, spdR = Math.min(1.3, Math.abs(p.vf) / P.top), boost = p.boostT > 0, portrait = camera.aspect < 1;
  // 카메라는 차 방향을 천천히 따라가서 미끄러짐이 보이게
  let dh = p.h - camH; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
  camH += dh * (firstFrame ? 1 : Math.min(1, (p.tumble ? 1.2 : 8) * dt));
  const fx_ = Math.sin(camH), fz_ = Math.cos(camH);
  let want, look;
  if (camMode === "chase") {
    const back = boost ? 8.6 : 9.6 + spdR * 0.5, up = boost ? 2.4 : 3.1;
    want = new THREE.Vector3(p.x - fx_ * back, p.y + up + (portrait ? 1.2 : 0), p.z - fz_ * back);
    look = new THREE.Vector3(p.x + fx_ * 11, p.y + (portrait ? -1.4 : 1.3), p.z + fz_ * 11);
  } else {
    const f2 = Math.sin(p.h), z2 = Math.cos(p.h);
    want = new THREE.Vector3(p.x - f2 * 0.5, p.y + 2.0, p.z - z2 * 0.5);
    look = new THREE.Vector3(p.x + f2 * 20, p.y + 1.6, p.z + z2 * 20);
  }
  // 가속에 반응하는 카메라: 밟는 순간·부스트 순간엔 차가 튀어나가며 멀어지고, 속도가 일정해지면 다시 따라붙음. 브레이크엔 다가옴
  const acc = dt > 0 ? (p.vf - (p.camPrevV ?? p.vf)) / dt : 0; p.camPrevV = p.vf;
  camAcc += (acc - camAcc) * Math.min(1, (acc > camAcc ? 6 : 1.4) * dt);  // 튀어나갈 땐 빠르게, 돌아올 땐 천천히
  const lagT = camMode === "chase" ? clamp(camAcc * 0.4 + (boost ? 4.5 : 0), -2.5, 18) : 0;
  camLag += (lagT - camLag) * Math.min(1, 3 * dt);
  const lagM = 18 * Math.tanh(camLag / 18);                              // 최대 14m까지, 끝으로 갈수록 부드럽게
  want.x -= fx_ * lagM; want.z -= fz_ * lagM; want.y += lagM * 0.08;
  const P0 = new THREE.Vector3(p.x, p.y, p.z), wantOff = want.sub(P0), lookOff = look.sub(P0);
  const k = firstFrame || camMode === "cockpit" ? 1 : 1 - Math.exp(-7 * dt);
  camOff.lerp(wantOff, k); camOff.y += (wantOff.y - camOff.y) * (firstFrame ? 1 : Math.min(1, 3 * dt));
  lookOffS.lerp(lookOff, firstFrame ? 1 : 1 - Math.exp(-10 * dt)); firstFrame = false;
  camPos.copy(P0).add(camOff); camLook.copy(P0).add(lookOffS);
  camera.position.copy(camPos);
  if (shake > 0) { const sk = shake * SET.shake; camera.position.x += (Math.random() - 0.5) * sk; camera.position.y += (Math.random() - 0.5) * sk * 0.6; shake = Math.max(0, shake - dt * 1.8); }
  camera.lookAt(camLook);
  const baseV = 62 + spdR * 12 + (boost ? 22 : 0);
  const asp = camera.aspect, H = 2 * Math.atan(Math.tan(baseV * Math.PI / 360) * (16 / 9));
  const targetFov = asp >= 16 / 9 ? baseV : Math.min(asp < 1 ? 88 : 100, 2 * Math.atan(Math.tan(H / 2) / asp) * 180 / Math.PI);
  fov += (targetFov - fov) * (1 - Math.exp(-(boost ? 7 : 3) * dt)); camera.fov = Math.min(124, fov + STRETCH.x * 20 * STRETCH.sc); camera.updateProjectionMatrix(); // 부스트 순간 시야가 쭈욱 넓어졌다 튕기며 돌아옴
}
function syncMeshes(dt) {
  const p = player, pm = p.mesh;
  if (p.tumble) { pm.quaternion.copy(p.tq); _r.set(0, -p.thh, 0).applyQuaternion(p.tq); pm.position.set(p.tc.x + _r.x, p.tc.y + _r.y, p.tc.z + _r.z); }
  else { pm.position.set(p.x, p.y, p.z); pm.rotation.set(p.bp || 0, p.h, p.br || 0, "YXZ"); }
  pm.userData.wheels.forEach((w, i) => { if (w.parent !== pm) return; const c = p.comp ? p.comp[i] : SUS_STATIC; w.position.y = w.userData.baseY + clamp(c - SUS_STATIC, -0.22, SUS.TRAVEL); });
  for (const f of pm.userData.flames) { const bf = (p.backfireT || 0) > 0 && p.boostT <= 0; f.visible = p.boostT > 0 || bf; f.material.color.setHex(bf ? 0xff8a2a : 0x8ff0ff); f.scale.set(bf ? 0.8 : 1.6, bf ? 0.8 : 1.6, bf ? 0.35 + Math.random() * 0.3 : 1.6 + Math.random() * 1.4); }
  pm.userData.wheels.forEach((w, i) => { if (w.parent !== pm) return; w.userData.spin.rotation.x += p.vf * dt / w.userData.r; if (i < 2) w.rotation.y = -input.steer * 0.45 / (1 + Math.abs(p.vf) / 70); });
  for (const a of ais) { // 라이벌도 서스펜션 자세 그대로
    const m = a.mesh;
    if (a.tumble) { m.quaternion.copy(a.tq); _r.set(0, -a.thh, 0).applyQuaternion(a.tq); m.position.set(a.tc.x + _r.x, a.tc.y + _r.y, a.tc.z + _r.z); }
    else { m.position.set(a.x, a.y, a.z); m.rotation.set(a.bp || 0, a.h, a.br || 0, "YXZ"); }
    const st = a.inp ? a.inp.steer : 0;
    m.userData.wheels.forEach((w, i) => { if (w.parent !== m) return; if (i < 4) { const c = a.comp ? a.comp[i] : SUS_STATIC; w.position.y = w.userData.baseY + clamp(c - SUS_STATIC, -0.22, SUS.TRAVEL); } w.userData.spin.rotation.x += a.vf * dt / w.userData.r; if (i < 2) w.rotation.y = -st * 0.45 / (1 + Math.abs(a.vf) / 70); });
    for (const f of m.userData.flames) { f.visible = a.boostT > 0; f.scale.set(1.6, 1.6, 1.6 + Math.random() * 1.4); }
  }
}
const _hudCache = {}; function setHTML(id, h) { if (_hudCache[id] !== h) { _hudCache[id] = h; document.getElementById(id).innerHTML = h; } } // DOM은 바뀔 때만 건드림 (폰에서 비쌈)
let _hudT = 0;
function updateHud() {
  { const p = player, t = TRK[p.idx], off = t && Math.abs(p.lat) > t.hw + 3, flip = p.tumble || Math.abs(p.roll || 0) > 1.2, slow = Math.abs(p.vf) < 3; // 걸리거나 뒤집히면 복귀 버튼이 깜빡임
    const bad = state === "race" && !p.dead && !p.done && (off || flip || slow) && raceT > 3; if (!bad) p.needSince = 0; else if (!p.needSince) p.needSince = performance.now(); const need = bad && performance.now() - p.needSince > 1200;
    if (need !== p.needShown) { p.needShown = need; document.getElementById("tRet").classList.toggle("need", need); document.getElementById("bReset").classList.toggle("need", need); } }
  const st = standings(), pos = st.findIndex(r => r.me) + 1, lap = Math.min(lapsTotal, Math.max(1, player.laps.length + 1));
  const hp = Math.max(0, player.hp ?? 100), hc = hp > 70 ? "#7cff8a" : hp > 40 ? "#ffd23a" : hp > 15 ? "#ff8a2a" : (performance.now() % 400 < 200 ? "#ff2a2a" : "#5a1010");
  setHTML("hudTL", `<b>${pos}</b> / ${TOTAL} 위${gapHtml(st)}<br>랩 ${lap} / ${lapsTotal}<br><span style="display:inline-block;width:96px;height:9px;background:rgba(0,0,0,.5);border:1px solid #fff4;vertical-align:middle"><i style="display:block;width:${hp}%;height:100%;background:${hc}"></i></span> <small>내구도</small><br>${player.slip ? '<span style="color:#39d4ff">슬립스트림</span>' : ""}`);
  if (performance.now() - _hudT > 100) { _hudT = performance.now(); setHTML("hudTR", `시간 ${fmt(player.done ? player.finishT : raceT)}<br>이번 랩 ${player.done ? "-" : fmt(Math.max(0, raceT - player.lapStart))}<br>최고 랩 ${best ? fmt(best) : "-"}`); }
  const kmh = Math.round(Math.abs(player.vf) * 3.6);
  setHTML("speed", `${kmh}<small> km/h</small>`);
  const maxC = Math.round(P.charges); let ch = ""; for (let i = 0; i < 3; i++) ch += `<i class="${i >= maxC ? "lock" : (i < player.charges ? "full" : "used")}"></i>`;
  const ce = document.getElementById("charges"); if (ce.innerHTML !== ch) ce.innerHTML = ch;
  if (isTouch) { setHTML("tNitroI", ch); { const rd = player.wpn && player.wpn.sp === "pile" && player.wpn.ammo > 0 && player.wpn.cd <= 0 && state === "race" && !!pileTarget(player); if (rd !== updateHud._rd) { updateHud._rd = rd; document.getElementById("tSp").classList.toggle("ready", rd); } } /* 폰: 버튼 안에 남은 부스트 */
    if (player.wpn) { const w = player.wpn; setHTML("tGunI", `<span class="hb"><i style="width:${Math.round(w.heat * 100)}%;background:${w.over ? "#ff3b3b" : "#ffd23a"}"></i></span>`);
      setHTML("tSpI", `<span class="am">${"●".repeat(w.ammo)}${"○".repeat(Math.max(0, WEAPONS[w.sp].ammo - w.ammo))}${w.sp === "rail" && w.charge > 0 ? ` <b style="color:#ffb040">${w.charge >= 1 ? "!" : Math.round(w.charge * 100) + "%"}</b>` : ""}</span>`); } }
  if (player.wpn) { const w = player.wpn, hc2 = w.over ? "#ff3b3b" : "#ffd23a"; const wh = `기관포 <span style="display:inline-block;width:60px;height:7px;background:rgba(0,0,0,.5);vertical-align:middle"><i style="display:block;height:100%;width:${Math.round(w.heat * 100)}%;background:${hc2}"></i></span><br>${WEAPONS[w.sp].name} ${"●".repeat(w.ammo)}${"○".repeat(Math.max(0, WEAPONS[w.sp].ammo - w.ammo))}${w.sp === "rail" && w.charge > 0 ? ` <b style="color:#8ff4ff">${w.charge >= 1 ? "발사!" : Math.round(w.charge * 100) + "%"}</b>` : ""}`; const we = document.getElementById("wpnHud"); if (we.innerHTML !== wh) we.innerHTML = wh; }
  flashT = Math.max(0, flashT - 0.05); const fe = document.getElementById("flash"); fe.style.opacity = flashT * 0.85; fe.style.background = flashT > 0.5 ? "#fff" : "#ff9a3a";
  if (camMode === "cockpit") {
    document.getElementById("dashSpd").textContent = kmh;
    document.getElementById("dashBoost").textContent = "◆".repeat(player.charges) + "◇".repeat(Math.max(0, maxC - player.charges));
    document.getElementById("wheel").setAttribute("transform", `translate(500 250) rotate(${input.steer * 90})`);
  }
  document.getElementById("pad").textContent = padInfo;
}
function resize() {
  const w = document.documentElement.clientWidth || innerWidth, h = document.documentElement.clientHeight || innerHeight;
  document.body.classList.toggle("portrait", h > w);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fx.width = w; fx.height = h;
}
addEventListener("resize", resize); addEventListener("orientationchange", () => setTimeout(resize, 200));
if (window.visualViewport) visualViewport.addEventListener("resize", resize);
try { new ResizeObserver(resize).observe(document.documentElement); } catch (e) {}
resize();

// ================= 부스트 연출 =================
const BFX = { rings: [], trail: null };
{ const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); g.translate(0, 0, -0.5); // 차 뒤로 길게 깔리는 빛 꼬리
  const c = document.createElement("canvas"); c.width = 16; c.height = 256; const x = c.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "rgba(160,245,255,1)"); gr.addColorStop(0.25, "rgba(255,150,40,0.85)"); gr.addColorStop(1, "rgba(255,60,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, 16, 256);
  BFX.trail = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  BFX.trail.visible = false; scene.add(BFX.trail); }
function carState(o) { if (REPLAY.on) { const v = REPLAY.view.get(o), p = o.mesh.position; if (v) return { x: p.x, y: p.y, z: p.z, h: v.h, vx: Math.sin(v.h) * v.vf, vz: Math.cos(v.h) * v.vf, v: v.vf, on: !!v.boost }; }
  return o === player ? { x: o.x, y: o.y, z: o.z, h: o.h, vx: o.vx, vz: o.vz, v: o.vf, on: o.boostT > 0 } : { x: o.x, y: o.y, z: o.z, h: o.h, vx: Math.sin(o.h) * o.v, vz: Math.cos(o.h) * o.v, v: o.v, on: o.boostT > 0 }; }
function boostBurst(o) { // 켜는 순간: 충격파 고리 + 불꽃 폭발 (모든 차 공통)
  recFx({ k: "bst", c: o });
  const c = carState(o), mine = o === player;
  for (const [col, sp] of [[0xffffff, 70], [0x38d8ff, 45], [0xff7a1a, 30]]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.18, 8, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    r.position.set(c.x, c.y + 1.2, c.z); r.rotation.set(0, c.h, 0); scene.add(r); BFX.rings.push({ m: r, t: 0, sp });
  }
  const g = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 6, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.position.set(c.x, c.y + 0.2, c.z); scene.add(g); BFX.rings.push({ m: g, t: 0, sp: 90 });
  const fx = Math.sin(c.h), fz = Math.cos(c.h), n = mine ? 1 : 0.6;
  for (let k = 0; k < 120 * n; k++) { const a = Math.random() * Math.PI * 2, v = 10 + Math.random() * 30; emit(sparks, c.x - fx * 4, c.y + 1, c.z - fz * 4, Math.cos(a) * v - fx * 20 + c.vx * 0.5, Math.random() * 14, Math.sin(a) * v - fz * 20 + c.vz * 0.5, 0.7); }
  for (let k = 0; k < 80 * n; k++) emit(boostFire, c.x - fx * 4.5, c.y + 0.8, c.z - fz * 4.5, (Math.random() - 0.5) * 25 - fx * 30 + c.vx * 0.5, Math.random() * 8, (Math.random() - 0.5) * 25 - fz * 30 + c.vz * 0.5, 0.6);
}
function makeTrail() { const t = BFX.trail.clone(); t.visible = false; scene.add(t); return t; }
const _fp = new THREE.Vector3();
function stepBoostFx(dt) {
  for (let i = BFX.rings.length - 1; i >= 0; i--) { const r = BFX.rings[i]; r.t += dt; const sc = 2 + r.t * r.sp; r.m.scale.set(sc, sc, sc); r.m.material.opacity = Math.max(0, 1 - r.t / 0.55);
    if (r.t > 0.55) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); BFX.rings.splice(i, 1); } }
  BFX.trail.visible = false;
  for (const o of [player, ...ais]) {
    const ud = o.mesh.userData; if (!ud.trail) ud.trail = makeTrail();
    const c = carState(o), near = viewD(c.x, c.z) < 700;
    ud.trail.visible = c.on && near; if (!ud.trail.visible) continue;
    const fx = Math.sin(c.h), fz = Math.cos(c.h), sr = Math.abs(c.v) / P.top, fl = 0.75 + Math.random() * 0.5, back = ud.hl * 0.85;
    ud.trail.position.set(c.x - fx * back, c.y + 0.25, c.z - fz * back); ud.trail.rotation.y = c.h; ud.trail.scale.set(ud.hwd * 1.6 * fl, 1, 28 + sr * 30);
    for (const f of ud.flames) { // 각 차의 실제 노즐·배기구 자리에서 뿜음
      f.getWorldPosition(_fp); const ex = _fp.x + fx * 1.2, ey = _fp.y, ez = _fp.z + fz * 1.2, reps = o === player ? 3 : 2;
      for (let k = 0; k < reps; k++) {
        emit(boostCore, ex, ey, ez, c.vx * 0.7 - fx * 25 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, c.vz * 0.7 - fz * 25 + (Math.random() - 0.5) * 3, 0.12);
        emit(boostFire, ex, ey, ez, c.vx * 0.6 - fx * 18 + (Math.random() - 0.5) * 7, Math.random() * 4, c.vz * 0.6 - fz * 18 + (Math.random() - 0.5) * 7, 0.32);
      }
    }
    if (Math.random() < 0.5) emit(sparks, c.x - fx * back, c.y + 0.3, c.z - fz * back, c.vx * 0.4 + (Math.random() - 0.5) * 10, Math.random() * 6, c.vz * 0.4 + (Math.random() - 0.5) * 10, 0.4);
  }
}

