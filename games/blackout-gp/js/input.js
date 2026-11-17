// ================= 입력 =================
const keys = {};
const input = { steer: 0, gas: 0, brake: 0, nitro: false, boostPress: false, drift: false, analog: false, gun: false, sp: false, spPress: false };
addEventListener("keydown", e => {
  if (!keys[e.code]) {
    if (REPLAY.on) { if (e.code === "Space") document.getElementById("rpPlay").onclick(); if (e.code === "ArrowLeft" || e.code === "KeyA") repPick(-1); if (e.code === "ArrowRight" || e.code === "KeyD") repPick(1); if (e.code === "KeyH") repNextHi(); if (e.code === "KeyC") document.getElementById(SPEC.mode === "chase" ? "rpTv" : "rpChase").onclick(); if (e.code === "Escape") repStop(true); keys[e.code] = true; e.preventDefault(); return; }
    if (SPEC.on) { if (e.code === "ArrowLeft" || e.code === "KeyA") specStep(-1); if (e.code === "ArrowRight" || e.code === "KeyD") specStep(1); if (e.code === "KeyC" || e.code === "KeyV") specMode(SPEC.mode === "chase" ? "tv" : "chase"); if (e.code === "Escape" || e.code === "Enter") specOff(true); keys[e.code] = true; return; }
    if (DEMO.on && (e.code === "KeyC" || e.code === "KeyR")) { keys[e.code] = true; return; }
    if (e.code === "KeyC") toggleCam();
    if (e.code === "KeyR") resetToTrack();
    if (e.code === "KeyM") setSound(!SND.on);
    if (e.code === "Escape") togglePause();
  }
  keys[e.code] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
});
addEventListener("keyup", e => { keys[e.code] = false; });
const touch = { left: false, right: false, gas: false, brake: false, nitro: false, drift: false, gun: false, sp: false };
const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
if (isTouch) { document.getElementById("touch").style.display = "block"; document.body.classList.add("touch"); }
for (const [id, k] of [["tLeft", "left"], ["tRight", "right"], ["tGas", "gas"], ["tBrake", "brake"], ["tNitro", "nitro"], ["tDrift", "drift"], ["tGun", "gun"], ["tSp", "sp"]]) {
  const el = document.getElementById(id);
  const on = e => { e.preventDefault(); touch[k] = true; el.classList.add("on"); };
  const off = e => { e.preventDefault(); touch[k] = false; el.classList.remove("on"); };
  el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("pointerleave", off);
}
{ const doReset = e => { if (e) e.preventDefault(); if (state === "race" && !player.dead && !player.done) resetToTrack(); }; // 복귀 버튼 (PC는 R키와 같음)
  document.getElementById("tRet").addEventListener("pointerdown", e => { doReset(e); e.currentTarget.classList.add("on"); }); document.getElementById("tRet").addEventListener("pointerup", e => e.currentTarget.classList.remove("on"));
  document.getElementById("bReset").onclick = () => doReset(); }
let padInfo = "게임패드: 연결 안 됨", yHeld = false, steerTarget = 0;
// ---- 모바일 옵션: 자동 가속
const MOB = { gas: true, steer: "wheel" }; try { const o = JSON.parse(localStorage.getItem("bgp_mob") || "{}"); Object.assign(MOB, o); } catch (e) {} MOB.steer = "wheel"; delete MOB.gun; // 조향은 핸들만, 자동 사격은 없앰
function syncMob() { try { localStorage.setItem("bgp_mob", JSON.stringify(MOB)); } catch (e) {} document.getElementById("oGas").classList.toggle("on", MOB.gas); document.body.classList.toggle("manualgas", !MOB.gas); }
document.getElementById("oGas").onclick = () => { MOB.gas = !MOB.gas; syncMob(); }; syncMob();
// ---- 핸들: 엄지로 잡고 돌림 (잡은 각도 기준으로 따라 돎, 놓으면 가운데로)
const WHEEL = { on: false, id: null, ang: 0, grab: 0, max: 0.92 }; // 53도만 돌려도 끝까지 꺾임
{ const zone = document.getElementById("wheelZone"), el = document.getElementById("swheel");
  const center = () => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const touchAng = e => { const [cx, cy] = center(); return Math.atan2(e.clientX - cx, -(e.clientY - cy)); };
  const tr = document.getElementById("sTrack"), knob = tr.querySelector(".knob"), range = () => clamp(innerWidth * 0.11, 70, 120); // 슬라이더: 엄지 댄 곳이 가운데, 좌우로 민 만큼
  zone.addEventListener("pointerdown", e => { e.preventDefault(); try { zone.setPointerCapture(e.pointerId); } catch (er) {} WHEEL.on = true; WHEEL.id = e.pointerId; WHEEL.grab = WHEEL.ang - touchAng(e); WHEEL.last = touchAng(e);
    if (MOB.steer === "slider") { WHEEL.sx = e.clientX; const r = zone.getBoundingClientRect(); tr.style.left = (e.clientX - r.left) + "px"; tr.style.top = (e.clientY - r.top) + "px"; tr.style.display = "block"; knob.style.transform = "translateX(0px)"; } });
  zone.addEventListener("pointermove", e => { if (!WHEEL.on || e.pointerId !== WHEEL.id) return; e.preventDefault();
    if (MOB.steer === "slider") { const R = range(); let dx = e.clientX - WHEEL.sx; if (dx > R) { WHEEL.sx = e.clientX - R; dx = R; } if (dx < -R) { WHEEL.sx = e.clientX + R; dx = -R; } WHEEL.ang = dx / R * WHEEL.max; const r = zone.getBoundingClientRect(); tr.style.left = (WHEEL.sx - r.left) + "px"; knob.style.transform = `translateX(${dx / R * 100}px)`; return; } // 끝을 넘으면 기준점이 따라와서, 반대로 밀면 바로 반응
    const a = touchAng(e); let d = a - WHEEL.last; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; WHEEL.last = a; WHEEL.ang = clamp(WHEEL.ang + d, -WHEEL.max, WHEEL.max); });
  const up = e => { if (e.pointerId !== WHEEL.id) return; WHEEL.on = false; WHEEL.id = null; tr.style.display = "none"; if (MOB.steer === "slider") WHEEL.ang = 0; };
  zone.addEventListener("pointerup", up); zone.addEventListener("pointercancel", up); }
// ---- 전체화면 (가로 고정)
function goFull(force) {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) { if (!force) (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen; if (!req) { if (!force) setMsg("이 브라우저는 전체화면 미지원 (홈 화면에 추가해서 열기)", 2); return; }
  try { const pr = req.call(el, { navigationUI: "hide" }); if (pr && pr.then) pr.then(() => { try { screen.orientation.lock("landscape").catch(() => {}); } catch (e) {} }).catch(() => {}); } catch (e) {}
}
function readInput(dt) {
  let steer = 0, gas = 0, brake = 0, nitro = false, drift = false, analog = false, gun = !!(keys.KeyZ || touch.gun), sp = !!(keys.KeyX || touch.sp);
  if (keys.ArrowLeft || keys.KeyA || touch.left) steer -= 1;
  if (keys.ArrowRight || keys.KeyD || touch.right) steer += 1;
  if (keys.ArrowUp || keys.KeyW || touch.gas) gas = 1;
  if (keys.ArrowDown || keys.KeyS || touch.brake) brake = 1;
  if (keys.Space || touch.nitro) nitro = true;
  if (keys.ShiftLeft || keys.ShiftRight || touch.drift) drift = true;
  if (isTouch) {
    if (!WHEEL.on) WHEEL.ang *= Math.exp(-14 * dt); // 놓으면 가운데로 돌아옴
    const x = WHEEL.ang / WHEEL.max; if (Math.abs(WHEEL.ang) > 0.01 || WHEEL.on) { steer = Math.sign(x) * Math.pow(Math.abs(x), 0.85); analog = true; } // 가운데부터 바로 반응
    const g_ = document.getElementById("swheelG"); if (g_) g_.setAttribute("transform", `rotate(${WHEEL.ang * 180 / Math.PI})`);
    if (MOB.gas && !touch.brake) gas = 1;
  }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    padInfo = `게임패드: ${gp.id.slice(0, 40)}\n축: ${gp.axes.map(a => a.toFixed(2)).join(" ")}\n버튼: ${gp.buttons.map((b, i) => b.pressed ? i : null).filter(v => v !== null).join(",") || "-"}`;
    const a0 = gp.axes[0] || 0; if (Math.abs(a0) > 0.06) { steer = clamp(a0 * 1.15, -1, 1); analog = true; }
    const rt = gp.buttons[7] ? gp.buttons[7].value : 0, lt = gp.buttons[6] ? gp.buttons[6].value : 0;
    if (rt > 0.05) gas = Math.max(gas, rt); if (lt > 0.05) brake = Math.max(brake, lt);
    if (gp.buttons[0] && gp.buttons[0].pressed) nitro = true;
    if (gp.buttons[1] && gp.buttons[1].pressed) drift = true;
    if (gp.buttons[5] && gp.buttons[5].pressed) gun = true; if (gp.buttons[2] && gp.buttons[2].pressed) sp = true;
    const y = gp.buttons[3] && gp.buttons[3].pressed; if (y && !yHeld) toggleCam(); yHeld = y;
    break;
  }
  // 묵직하게: 핸들이 천천히 감기고 풀린다
  if (analog) input.steer += (steer - input.steer) * Math.min(1, (isTouch ? 20 : 12) * dt);
  else { const rate = (Math.abs(steer) < Math.abs(input.steer) || Math.sign(steer) !== Math.sign(input.steer)) ? 10 : 7; input.steer += clamp(steer - input.steer, -rate * dt, rate * dt); }
  input.gas = gas; input.brake = brake; input.boostPress = nitro && !input.nitro; input.nitro = nitro; input.drift = drift; input.spPress = sp && !input.sp; input.sp = sp; input.gun = gun;
}

