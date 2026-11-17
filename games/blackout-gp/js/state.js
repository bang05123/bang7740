// ================= 상태 =================
let state = "menu", raceT = 0, countdown = 0, camMode = "chase", shake = 0, msgT = 0, flashT = 0, slowT = 0, lastPos = TOTAL;
const BOOST_TIME = 5.6; let endTimer = 0;
let lapsTotal = 5;
try { lapsTotal = parseInt(localStorage.getItem("bgp_laps")) || 5; } catch (e) {}
const AI_BOOST_MAX = 3; // 라이벌 한 대가 한 레이스에 쓸 수 있는 부스트 총 횟수
function setLaps(n) { lapsTotal = n; try { localStorage.setItem("bgp_laps", String(n)); } catch (e) {} document.querySelectorAll(".lsel[data-l]").forEach(b => b.classList.toggle("on", +b.dataset.l === n)); }
function setMsg(t, dur = 1.4) { document.getElementById("msg").textContent = t; msgT = dur; }
let gridOrder = null, gridFresh = false; // 출발 순서: 메뉴로 올 때 한 번만 섞고, 코스 바꾸거나 출발 누를 땐 그대로 (차가 순간이동하지 않게)
function placeGrid(shuffle = true) {
  if (player.mesh) repairAll();
  armAll();
  const slot = i => [-14 - i * 28, i % 2 ? 9 : -9]; // 앞뒤 28m·좌우 18m 간격으로 넉넉하게
  if (shuffle || !gridOrder) { gridOrder = [...Array(ais.length + 1).keys()]; for (let i = gridOrder.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [gridOrder[i], gridOrder[j]] = [gridOrder[j], gridOrder[i]]; } } const order = gridOrder; // 출발 순서는 판마다 랜덤
  ais.forEach((a, i) => { const [pr, ln] = slot(order[i]); const p = posAt(L + pr, ln);
    Object.assign(a, { prog: pr, laneT: ln, lane: ln, lv: 0, latV: 0, wander: ln, v: 0, done: false, finishT: 0, boostT: 0, left: AI_BOOST_MAX, used: 0, nextOK: 0, x: p.x, z: p.z, h: p.h, y: p.y, vf: 0, vl: 0, ry: 0, vx: 0, vz: 0, lat: ln, ax: 0, ay: 0, stuckT: 0, charges: 0 });
    a.idx = fullNearest(p.x, p.z); a.s = TRK[a.idx].s; suspReset(a, p.y); });
  const [pr, ln] = slot(order[ais.length]), p = posAt(L + pr, ln);
  Object.assign(player, { x: p.x, z: p.z, h: p.h, y: p.y, vy: 0, air: 0, vf: 0, vl: 0, ry: 0, vx: 0, vz: 0, charges: Math.round(P.charges), boostT: 0, laps: [], done: false, finishT: 0, pitch: 0, roll: 0, pv: 0, rv: 0, squash: 0, ax: 0, ay: 0, offTimer: 0, lat: ln });
  player.idx = fullNearest(p.x, p.z); player.s = TRK[player.idx].s; player.prog = pr; player.lapStart = 0; lastPos = TOTAL; firstFrame = true;
  suspReset(player, p.y);
}
// ---- 출발 연출: 카메라가 그리드를 앞에서 뒤로 훑으며 차 이름 소개 → 내 차 뒤로 부드럽게 이어짐 → 빨간불 5개, 다 꺼지면 출발
const INTRO = { t: 0, len: 5.6, s0: 0, s1: 0, skip: false, tagCar: null, pos: new THREE.Vector3(), look: new THREE.Vector3(), hold: 0, lit: 0 };
function introStart() {
  state = "intro"; INTRO.t = 0; INTRO.skip = false; INTRO.tagCar = null; countdown = 0; document.body.classList.add("intro");
  const progs = [player, ...ais].map(c => c.prog); INTRO.s0 = Math.max(...progs) + 22; INTRO.s1 = Math.min(...progs) - 14; INTRO.len = Math.min(6.5, 2.2 + (INTRO.s0 - INTRO.s1) / 60);
  firstFrame = true;
}
function introCleanup() { document.body.classList.remove("intro"); document.getElementById("lights").classList.remove("on"); }
function introEnd() { if (state !== "intro") return; document.body.classList.remove("intro"); state = "count"; INTRO.hold = 0.3 + Math.random() * 0.8; countdown = 3.0 + INTRO.hold; INTRO.lit = 0; document.getElementById("lights").classList.add("on"); }
function introCam(dt) { // 그리드 옆을 따라 뒤로 이동하며 차들 앞모습을 보고, 마지막 1.2초는 내 차 뒤 추적 카메라 자리로 부드럽게
  INTRO.t += dt; const k = Math.min(1, INTRO.t / INTRO.len), fly = Math.min(1, INTRO.t / Math.max(0.1, INTRO.len - 1.2)), e = fly * fly * (3 - 2 * fly);
  const sc = INTRO.s0 + (INTRO.s1 - INTRO.s0) * e, sway = Math.sin(INTRO.t * 0.9) * 2.5, q = posAt(sc, sway), lk = posAt(sc - 15, -sway * 0.5); // 두 줄 사이 가운데로 지나감 (차에 박히지 않게)
  const fp = _sv.set(q.x, q.y + 3.6, q.z), fl = _sv2.set(lk.x, lk.y + 0.9, lk.z);
  const b = clamp((INTRO.t - (INTRO.len - 1.2)) / 1.2, 0, 1), bb = b * b * (3 - 2 * b);
  if (bb > 0) { const p = player, fx_ = Math.sin(p.h), fz_ = Math.cos(p.h); fp.lerp(new THREE.Vector3(p.x - fx_ * 9.6, p.y + 3.1, p.z - fz_ * 9.6), bb); fl.lerp(new THREE.Vector3(p.x + fx_ * 11, p.y + 1.3, p.z + fz_ * 11), bb); }
  camera.position.copy(fp); camera.lookAt(fl); if (camera.fov !== 55 + bb * 11) { camera.fov = 55 + bb * 11; camera.updateProjectionMatrix(); } fov = camera.fov;
  // 지금 카메라 앞을 지나는 차 이름 띄우기
  let near = null, nd = 1e9; for (const c of [player, ...ais]) { const d = Math.abs(c.prog - (sc - 6)); if (d < nd) { nd = d; near = c; } }
  if (b > 0.05) near = null; if (near !== INTRO.tagCar) { INTRO.tagCar = near; const tg = document.getElementById("introTag"); if (near) { tg.querySelector(".nm").textContent = near.name; tg.querySelector(".sb").textContent = near === player ? "나 · 0번" : `무게 ${(near.mass || 1400).toLocaleString()}kg`; tg.style.opacity = 1; } else tg.style.opacity = 0; }
  if (k >= 1) { camPos.copy(camera.position); firstFrame = true; introEnd(); }
}
function lightsTick() { // 신호등: 0.6초마다 하나씩 켜지고, 5개 다 켜진 뒤 잠깐 있다가 한꺼번에 꺼지면 출발
  const total = 3.0 + INTRO.hold, el = total - countdown, lit = countdown > 0 ? Math.min(5, Math.floor(el / 0.6) + 1) : 0;
  if (lit !== INTRO.lit) { if (lit > INTRO.lit && lit <= 5) sndBeep(false); INTRO.lit = lit; document.querySelectorAll("#lights i").forEach((n, i) => n.classList.toggle("lit", i < lit)); }
}
const introSkip = () => { if (state === "intro" && INTRO.t > 0.3) INTRO.t = Math.max(INTRO.t, INTRO.len - 0.5); }; // 건너뛰어도 뚝 끊기지 않고 0.5초 만에 내 차 뒤로 이어짐
addEventListener("keydown", introSkip); addEventListener("pointerdown", introSkip);
function startRace() {
  repStop(); demoStop(); specOff(); recReset(true); audioInit(); clearTimeout(endTimer); setMsg("", 0.01); flashT = 0; slowT = 0;
  placeGrid(!gridFresh); gridFresh = false; raceT = 0; gapReset(); introStart(); // 메뉴에서 보던 자리 그대로 출발 → 그리드 소개 → 신호등
  showScreen(null); hideBig(); kos.clear();
}
const SCREENS = ["titleScreen", "helpScreen", "setScreen", "startScreen", "endScreen", "pauseScreen"];
function showScreen(id) { if (id === "titleScreen" || id === "helpScreen" || id === "setScreen") { if (!DEMO.on && (state === "menu" || state === "end")) demoStart(); } else if (DEMO.on) demoStop(); for (const k of SCREENS) document.getElementById(k).style.display = k === id ? "flex" : "none"; document.body.classList.toggle("inmenu", ["titleScreen", "helpScreen", "setScreen", "startScreen"].includes(id)); }
// ---- 타이틀 데모 플레이: 내 차도 봇이 몰고, 카메라가 알아서 이 차 저 차 비춤
const DEMO = { on: false, camT: 0, n: 0 };
function demoStart() {
  recReset(false); DEMO.on = true; document.body.classList.add("demo"); placeGrid(true); kos.clear(); raceT = 0; state = "race"; player.mesh.visible = true; camMode = "chase";
  DEMO.camT = 0; DEMO.n = 0; SPEC.car = null;
}
function demoStop() {
  if (!DEMO.on) return; DEMO.on = false; document.body.classList.remove("demo"); state = "menu"; setMsg("", 0.01); placeGrid(true); gridFresh = true; firstFrame = true;
  for (const k in input) if (typeof input[k] === "number") input[k] = 0; else if (typeof input[k] === "boolean") input[k] = false;
}
const wrapS = s => ((s % L) + L) % L; // 출발선 뒤(음수)나 여러 바퀴째도 트랙 위치로
function demoDrive(p) { // 테스트용 봇과 같은 방식: 앞을 보고 조향, 코너 속도에 맞춰 브레이크
  const v = Math.abs(p.vf), t = posAt(wrapS(p.prog + 18 + v * 0.45), 0), want = Math.atan2(t.x - p.x, t.z - p.z); let d = want - p.h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  let vt = 999; for (let o = 0; o < 40 + v * v / 30; o += 6) { const k = TRK[idxAtS(wrapS(p.prog + o))].k, mu = P.grip * 0.92, den = k - mu / 1350, vc = den <= 1e-5 ? 999 : Math.sqrt(mu * 9.8 / den); vt = Math.min(vt, Math.sqrt(vc * vc + 2 * 20 * o)); }
  const brake = v > vt + 2 ? 1 : 0, m = muzzle(p), gun = raceT > 16 && p.wpn && !p.wpn.over && p.wpn.heat < 0.8 && !!rayHit(p, m[0], m[2], Math.sin(p.h), Math.cos(p.h), 140, 0.6);
  return { steer: -clamp(d * 2.5 - p.ry * 0.25, -1, 1), gas: brake ? 0 : 1, brake, nitro: false, drift: false, gun, sp: false, spPress: false, boostPress: false };
}
function demoTick(dt) {
  Object.assign(input, demoDrive(player));
  const alive = [player, ...ais].filter(c => !c.dead);
  if (raceT > 80 || alive.length < 3 || [player, ...ais].some(c => c.done) || player.prog > L * (lapsTotal - 0.3)) { demoStart(); return; } // 판 다시
  DEMO.camT -= dt;
  const shotOver = SPEC.mode === "tv" ? (SPEC.tvDone || DEMO.camT < -14) : DEMO.camT <= 0;
  if (shotOver || !SPEC.car || SPEC.car.dead) { // 볼거리 있는 차 고르기: 가까이 붙어 싸우는 차 우선
    let best = null, bs = -1e9; for (const c of alive) { let near = 1e9; for (const o of alive) if (o !== c) near = Math.min(near, Math.abs(o.prog - c.prog) + Math.abs(o.lat - c.lat)); const sc = -near + Math.random() * 25 + (c === SPEC.car ? -30 : 0); if (sc > bs) { bs = sc; best = c; } }
    SPEC.car = best || alive[0]; DEMO.n++; SPEC.mode = DEMO.n % 3 === 0 ? "chase" : "tv"; SPEC.tv = null; SPEC.tvDone = false; SPEC.fresh = true; DEMO.camT = 7 + Math.random() * 3;
  }
}
