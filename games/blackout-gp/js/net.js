
// ================= 멀티플레이 (PeerJS · 방 코드로 들어가기 · 최대 8명) =================
// 구조: 방장(호스트)이 방을 만들면 4글자 코드가 나옴 → 다른 사람은 코드로 접속 (P2P, 서버 없음)
// 각자 자기 차는 자기 폰에서 물리 계산 → 초당 20번 위치를 보냄. 빈자리 라이벌 봇은 호스트가 몰고 위치를 보냄
// 피해는 "맞은 차 주인"이 판정해서 알려줌 (총·미사일은 모든 화면에서 똑같이 쏴서 보여줌)
const MP = { on: false, host: false, slot: 0, code: "", peer: null, conns: new Map(), conn: null, players: [], race: null, hold: 0.6, goRecv: false, sendT: 0, prevState: "", name: "", joinTimer: 0, noBot: new Set() };
const MP_MAX = 8, MP_PRE = "bgp7740-";
const RIVAL_NAMES = ais.map(a => a.name), PLAYER_NAME0 = player.name;
// 멀티 차: 사람은 전부 Rook(0번) 모양 + 자리마다 다른 색, 봇은 원래 라이벌 차. 빈자리로 뺀 봇은 레이스에서 빠짐
const AIS_ALL = ais.slice(), MP_MODELS = [player.mesh, ...ais.map(a => a.mesh)];
const ROOK_COL = [0xff4a1a, 0x1f8fff, 0x2fd15a, 0xffd21a, 0xb04aff, 0xff3b8b, 0x19d6d6, 0xeeeeee], MP_ROOKS = [player.mesh];
const hexOf = c => "#" + new THREE.Color(c).getHexString();
MP_MODELS[0].userData.mcol = hexOf(ROOK_COL[0]); ais.forEach((a, i) => { MP_MODELS[i + 1].userData.mcol = hexOf(RIVALS[i].sf[1]); });
function rookFor(s) { if (!MP_ROOKS[s]) { const m = makeCar({ len: 6.6, color: ROOK_COL[s], accent: 0x111111, wing: "spoiler", scoop: true, num: String(s), rim: 0xffd23a }); m.visible = false; m.userData.mcol = hexOf(ROOK_COL[s]); MP_ROOKS[s] = m; } return MP_ROOKS[s]; }
function mpRestoreAis() { ais.length = 0; ais.push(...AIS_ALL); }
function mpApplyModels(humans) { // humans: 사람 자리 목록, 없으면 원래대로
  const all = [player, ...AIS_ALL]; for (const c of all) pileMesh(c, false);
  for (const m of [...MP_MODELS, ...MP_ROOKS]) if (m) m.visible = false;
  player.mesh = MP_MODELS[0]; AIS_ALL.forEach((a, i) => { a.mesh = MP_MODELS[i + 1]; });
  if (humans) for (const s of humans) { const c = carOfSlot(s); if (c) c.mesh = rookFor(s); }
  for (const c of all) c.mesh.visible = true;
  if (camMode === "cockpit") player.mesh.visible = false;
}
const MP_COURSE = { desert: "더스트 하이웨이", circuit: "메가 서킷", dam: "레드워터 댐" }, MP_WPN = { missile: "미사일", harpoon: "작살", rail: "대구경 포", pile: "파일벙커" };
const MP_TURN = { username: "81e1d07276477fa7037157c4", credential: "YCCmOW88tS0m/QX/" };
const MP_ICE = { iceServers: [{ urls: "stun:stun.relay.metered.ca:80" }, { urls: "stun:stun.l.google.com:19302" }, { urls: ["turn:global.relay.metered.ca:80", "turn:global.relay.metered.ca:80?transport=tcp", "turn:global.relay.metered.ca:443", "turns:global.relay.metered.ca:443?transport=tcp"], ...MP_TURN }] };
try { MP.name = localStorage.getItem("bgp_name") || ""; } catch (e) {}
const r2 = v => Math.round((v || 0) * 100) / 100, r3 = v => Math.round((v || 0) * 1000) / 1000;
const $id = id => document.getElementById(id);

// 슬롯(0=호스트) ↔ 이 화면의 차. 봇 자리는 어느 화면에서나 같은 차(ais[s-1])로 보이게
function carOfSlot(s) { if (s === MP.slot) return player; if (s < 0 || s >= MP_MAX) return null; if (s === 0) return AIS_ALL[MP.slot - 1]; return AIS_ALL[s - 1]; }
function slotOfCar(c) { if (!c) return -1; if (c === player) return MP.slot; const i = AIS_ALL.indexOf(c); if (i < 0) return -1; if (MP.slot > 0 && i === MP.slot - 1) return 0; return i + 1; }
function owns(c) { return !MP.on || c === player || (MP.host && !c.human); }
function netRemote(fn) { window.__netRemote = true; try { fn(); } finally { window.__netRemote = false; } }

// ---- 보내기
function bcast(m, except) { for (const info of MP.conns.values()) if (info.conn !== except && info.conn.open) try { info.conn.send(m); } catch (e) {} }
function netSend(m) { if (!MP.on) return; if (MP.host) bcast(m); else if (MP.conn && MP.conn.open) try { MP.conn.send(m); } catch (e) {} }

// ---- 차 상태 스냅샷
function snapOf(c, s) {
  const tb = !!(c.tumble && c.tq && c.tc), gun = performance.now() - (c._gunT || 0) < 130;
  const st = c === player ? (input.steer || 0) : (c.inp ? c.inp.steer || 0 : 0), yk = c === player ? (input.steer || 0) : (c.yankDir || 0);
  const a = [s, r2(c.x), r2(c.y), r2(c.z), r3(c.h), r2(c.vx), r2(c.vz), r2(c.vf), r2(c.prog), r2(c.lat), r3(c.bp), r3(c.br), r2(c.boostT), r2(c.hp ?? 100), (c.dead ? 1 : 0) | (c.done ? 2 : 0) | (tb ? 4 : 0) | (gun ? 8 : 0), r2(c.finishT), r2(st), r2(yk)];
  if (tb) a.push(r3(c.tq.x), r3(c.tq.y), r3(c.tq.z), r3(c.tq.w), r2(c.tc.x), r2(c.tc.y), r2(c.tc.z), r3(c.thh));
  return a;
}
function onSnap(a) {
  const s = a[0]; if (s === MP.slot) return; const c = carOfSlot(s); if (!c || !c.net || c === player) return;
  c.snap = { x: a[1], y: a[2], z: a[3], h: a[4], vx: a[5], vz: a[6], vf: a[7], prog: a[8], lat: a[9], bp: a[10], br: a[11], boostT: a[12], hp: a[13], f: a[14], ft: a[15], st: a[16], yk: a[17],
    tq: a.length > 18 ? a.slice(18, 22) : null, tc: a.length > 18 ? a.slice(22, 25) : null, thh: a[25] || 0, at: performance.now() };
}
// stepAI에서 남이 모는 차마다 호출: 받은 위치 + 속도로 살짝 앞을 예측해서 부드럽게 따라감
function netStep(a, dt) {
  a.v = a.vf; a.lane = a.lat; const s = a.snap; if (!s) return;
  const age = Math.min(0.3, (performance.now() - s.at) / 1000), tx = s.x + s.vx * age, tz = s.z + s.vz * age, dx = tx - a.x, dz = tz - a.z;
  let dh = s.h - a.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
  if (a._fresh || dx * dx + dz * dz > 400) { a.x = tx; a.z = tz; a.y = s.y; a.h = s.h; a.idx = fullNearest(a.x, a.z); a._fresh = false; }
  else { const k = 1 - Math.exp(-dt * 12); a.x += dx * k; a.z += dz * k; a.y += (s.y - a.y) * k; a.h += dh * k; a.idx = nearest(a.x, a.z, a.idx || 0); }
  a.s = TRK[a.idx].s; a.vx = s.vx; a.vz = s.vz; a.vf = s.vf; a.prog = s.prog + s.vf * age; a.lat = s.lat; a.bp = s.bp; a.br = s.br; a.boostT = s.boostT; a.hp = s.hp;
  a.done = !!(s.f & 2); a.finishT = s.ft; a.inp = { steer: s.st }; a.yankDir = s.yk;
  if ((s.f & 4) && s.tq) { if (!a.tq) a.tq = new THREE.Quaternion(); if (!a.tc) a.tc = new THREE.Vector3(); a.tq.set(s.tq[0], s.tq[1], s.tq[2], s.tq[3]).normalize(); a.tc.set(s.tc[0], s.tc[1], s.tc[2]); a.thh = s.thh; a.tumble = true; a.x = a.tc.x; a.z = a.tc.z; }
  else a.tumble = false;
  if ((s.f & 1) && !a.dead) netRemote(() => explode(a));
  if ((s.f & 8) && state === "race" && a.wpn && !a.dead) { a.wpn.over = false; a.wpn.heat = 0; _fireGun(a); } // 남이 쏘는 기관포도 내 화면에서 똑같이 쏨 (맞으면 내 차 피해는 내가 판정)
}

// ---- 기존 함수 감싸기 (원래 동작은 그대로, 멀티일 때만 추가)
const _applyDamage = applyDamage;
applyDamage = function (c, amt, loc, by, src) {
  if (!MP.on || window.__netRemote) return _applyDamage(c, amt, loc, by, src);
  if (!owns(c)) return; // 남의 차 피해는 그 차 주인이 판정
  const hp0 = c.hp ?? 100; _applyDamage(c, amt, loc, by, src); const da = hp0 - (c.hp ?? 100);
  if (da > 0.01) netSend({ t: "dmg", s: slotOfCar(c), a: r2(da), l: loc ? [r3(loc.x), r3(loc.y), r3(loc.z)] : null, b: slotOfCar(by), k: src });
};
const _enterTumble = enterTumble;
enterTumble = function (p, ...r) { if (MP.on && !window.__netRemote && !owns(p)) return; return _enterTumble(p, ...r); };
const _fireGun = fireGun;
fireGun = function (c) { const cd = c.wpn ? c.wpn.gunCd : 0; _fireGun(c); if (MP.on && c.wpn && c.wpn.gunCd > cd) c._gunT = performance.now(); };
const _useSpecial = useSpecial;
useSpecial = function (c) {
  const r = _useSpecial(c);
  if (r && MP.on && owns(c)) { const q = PROJ[PROJ.length - 1], tg = q && q.owner === c && q.type === "missile" ? slotOfCar(q.target) : -1;
    netSend({ t: "sp", s: slotOfCar(c), x: r2(c.x), y: r2(c.y), z: r2(c.z), h: r3(c.h), tg }); }
  return r;
};
const _reelIn = reelIn;
reelIn = function (T) { _reelIn(T); if (MP.on && owns(T.a)) netSend({ t: "reel", s: slotOfCar(T.a) }); };
const _armAll = armAll;
armAll = function () { _armAll(); if (!MP.on || !MP.race) return;
  for (let s = 0; s < MP_MAX; s++) { const c = carOfSlot(s), sp = MP.race.w[s]; if (!c || c === player || !sp || !WEAPONS[sp] || c.wpn.sp === sp) continue; c.wpn.sp = sp; c.wpn.ammo = WEAPONS[sp].ammo; pileMesh(c, sp === "pile"); } };
const _setSpecial = setSpecial;
setSpecial = function (w) { _setSpecial(w); if (!MP.on) return; if (MP.host) { const me = MP.players.find(p => p.slot === 0); if (me) me.wpn = w; bcastPlayers(); } else netSend({ t: "wpn", w }); };
const _buildCourse = buildCourse;
buildCourse = function (id) { _buildCourse(id); if (MP.on && MP.host) mpCfg(); };
const _setLaps = setLaps;
setLaps = function (n) { _setLaps(n); if (MP.on && MP.host) mpCfg(); };
const _togglePause = togglePause;
togglePause = function () { if (MP.on && (state === "race" || state === "count")) { setMsg("멀티에선 일시정지 없음", 1); return; } _togglePause(); };
const _introEnd = introEnd;
introEnd = function () { const was = state; _introEnd(); if (MP.on && MP.race && was === "intro" && state === "count") { INTRO.hold = MP.hold; countdown = 3.0 + INTRO.hold; } };
removeEventListener("keydown", introSkip); removeEventListener("pointerdown", introSkip); // 멀티에선 출발 연출 건너뛰기 막음 (다 같이 출발해야 하니까)
addEventListener("keydown", e => { if (!MP.on) introSkip(e); }); addEventListener("pointerdown", e => { if (!MP.on) introSkip(e); });
SCREENS.push("mpScreen");
const _showScreen = showScreen;
showScreen = function (id) { _showScreen(id); if (id === "mpScreen") document.body.classList.add("inmenu"); };

// ---- 받은 게임 메시지 처리
function onGame(m) {
  if (state === "menu") return;
  if (m.t === "s") { if (Array.isArray(m.c)) for (const a of m.c) if (Array.isArray(a)) onSnap(a); }
  else if (m.t === "sp") { const c = carOfSlot(m.s); if (!c || c === player || !c.wpn || state !== "race") return;
    Object.assign(c, { x: m.x, y: m.y, z: m.z, h: m.h }); c.wpn.ammo = Math.max(1, c.wpn.ammo); c.wpn.cd = 0; const wasT = c.tumble, wasD = c.dead; c.tumble = false; c.dead = false;
    const n0 = PROJ.length; _useSpecial(c); c.tumble = wasT; c.dead = wasD;
    if (m.tg >= 0 && PROJ.length > n0 && PROJ[PROJ.length - 1].type === "missile") { const tc = carOfSlot(m.tg); PROJ[PROJ.length - 1].target = tc; if (tc === player) setMsg("⚠ 미사일 접근!", 1.2); } }
  else if (m.t === "reel") { const c = carOfSlot(m.s), T = TETHERS.find(T => T.a === c); if (T) _reelIn(T); }
  else if (m.t === "dmg") { const c = carOfSlot(m.s); if (!c || c === player || !(m.a > 0)) return;
    window.__netNoScale = true; try { netRemote(() => _applyDamage(c, m.a, m.l ? new THREE.Vector3(m.l[0], m.l[1], m.l[2]) : null, m.b >= 0 ? carOfSlot(m.b) : null, m.k)); } finally { window.__netNoScale = false; } }
}

// ---- 로비
function cleanName(n) { return String(n || "").replace(/[<>&"]/g, "").trim().slice(0, 10) || "Player"; }
function mpCfg() { bcast({ t: "cfg", c: courseId, l: lapsTotal }); updatePanel(); }
function applyCfg(m) { if (COURSES[m.c] && courseId !== m.c) { _buildCourse(m.c); placeGrid(false); gridFresh = true; } if (m.l > 0) _setLaps(m.l); updatePanel(); }
function bcastPlayers() { MP.players.sort((a, b) => a.slot - b.slot); bcast({ t: "players", pl: MP.players, nb: [...MP.noBot] }); updatePanel(); }
function updatePanel() {
  if (!MP.on) return; $id("mpCodeShow").textContent = MP.code;
  let h = ""; for (let s = 0; s < MP_MAX; s++) { const p = MP.players.find(q => q.slot === s);
    h += p ? `<span class="${s === MP.slot ? "me" : ""}">${s === 0 ? "👑 " : ""}${cleanName(p.name)} · ${MP_WPN[p.wpn] || "?"}</span>` : MP.noBot.has(s) ? `<span class="bot off" data-s="${s}">빈자리</span>` : `<span class="bot" data-s="${s}">봇 ${RIVAL_NAMES[s - 1]}</span>`; }
  $id("mpList").innerHTML = h;
  const nBot = MP_MAX - MP.players.length - [...MP.noBot].filter(s => !MP.players.some(p => p.slot === s)).length; $id("mpBots").style.display = MP.host ? "" : "none";
  $id("mpWait").textContent = MP.host ? `${MP.players.length}명 · 봇 ${nBot}대 · 봇 칸을 누르면 넣고 뺄 수 있어 · 출발 누르면 다 같이 시작` : `호스트가 출발 누르면 시작 · ${MP_COURSE[courseId] || courseId} · ${lapsTotal}바퀴`;
}
function enterLobby() {
  MP.on = true; document.body.classList.add("mp"); document.body.classList.toggle("mpclient", !MP.host);
  if (state !== "menu") { introCleanup(); repStop(); specOff(); clearTimeout(endTimer); state = "menu"; placeGrid(); gridFresh = true; }
  showScreen("startScreen"); updatePanel();
}
function mpSetupCars(names) {
  AIS_ALL.forEach((a, i) => { const s = slotOfCar(a), human = MP.players.some(p => p.slot === s); a.human = human; a.net = human || !MP.host; a.name = cleanName(names && names[s] || RIVAL_NAMES[i]); if (!human) a.name = names && names[s] || RIVAL_NAMES[i]; a.snap = null; a._fresh = true; });
  player.name = cleanName(MP.name);
}
function mpStart() { // 호스트: 출발 순서·무기·이름 정해서 다 같이 시작
  if (!MP.host) return;
  const order = [...Array(MP_MAX).keys()]; for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const n = {}, w = {}; for (let s = 0; s < MP_MAX; s++) { const p = MP.players.find(q => q.slot === s); n[s] = p ? cleanName(p.name) : RIVAL_NAMES[s - 1]; w[s] = p ? p.wpn : (RIVAL_WPN[RIVAL_NAMES[s - 1]] || "missile"); }
  const m = { t: "start", c: courseId, l: lapsTotal, o: order, nb: [...MP.noBot], n, w, hold: 0.3 + Math.random() * 0.8, pl: MP.players };
  bcast(m); mpBegin(m);
}
function mpBegin(m) {
  MP.players = m.pl; MP.hold = m.hold; MP.goRecv = false; MP.race = m;
  if (COURSES[m.c] && courseId !== m.c) _buildCourse(m.c); if (m.l > 0) _setLaps(m.l);
  const humans = new Set(m.pl.map(p => p.slot)), nb = new Set(m.nb || []);
  mpRestoreAis(); mpApplyModels(humans); mpSetupCars(m.n);
  for (let s = 1; s < MP_MAX; s++) if (!humans.has(s) && nb.has(s)) { const c = carOfSlot(s), k = ais.indexOf(c); if (k >= 0) { c.mesh.visible = false; ais.splice(k, 1); } } // 뺀 봇
  const vals = ais.map(a => m.o[slotOfCar(a)]).concat([m.o[MP.slot]]), srt = [...vals].sort((a, b) => a - b);
  gridOrder = vals.map(v => srt.indexOf(v)); gridFresh = true; // 빈자리 없이 앞으로 당겨 출발
  startRace();
}
function mpToLobby() { toMenu(); for (const a of ais) { a.snap = null; a._fresh = true; } document.body.classList.add("mp"); updatePanel(); }
function onLeft(s) { const c = carOfSlot(s); if (!c || c === player) return; c.snap = null; if (state === "race" && !c.dead) { netRemote(() => explode(c)); setMsg(`${c.name} 나감`, 1.5); } }
function mpLeave(why) {
  clearTimeout(MP.joinTimer);
  try { for (const info of MP.conns.values()) info.conn.close(); if (MP.conn) MP.conn.close(); if (MP.peer) MP.peer.destroy(); } catch (e) {}
  const was = MP.on; Object.assign(MP, { on: false, host: false, slot: 0, code: "", peer: null, conn: null, players: [], race: null }); MP.conns.clear();
  document.body.classList.remove("mp", "mpclient");
  mpRestoreAis(); ais.forEach((a, i) => { a.net = false; a.human = false; a.snap = null; a.name = RIVAL_NAMES[i]; }); player.name = PLAYER_NAME0; mpApplyModels(null); MP.noBot.clear();
  if (was) toTitle();
  if (why) { showScreen("mpScreen"); mpStatus(why); }
}
function mpStatus(t) { $id("mpStatus").textContent = t; }
function genCode() { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function readName() { const n = cleanName($id("mpName").value); MP.name = n; try { localStorage.setItem("bgp_name", n); } catch (e) {} return n; }

function mpCreate() {
  if (typeof Peer === "undefined") return mpStatus("멀티 라이브러리를 못 불러왔어요 (인터넷 확인)");
  readName(); if (MP.peer) try { MP.peer.destroy(); } catch (e) {}
  const code = genCode(); mpStatus("방 만드는 중…");
  const peer = new Peer(MP_PRE + code, { config: MP_ICE, debug: 1 }); MP.peer = peer;
  peer.on("open", () => { Object.assign(MP, { host: true, slot: 0, code, players: [{ slot: 0, name: MP.name, wpn: mySpecial }] }); mpStatus(""); enterLobby(); });
  peer.on("error", err => { if (err.type === "unavailable-id") return mpCreate(); if (!MP.on) mpStatus("방 만들기 실패: " + err.type + " — 와이파이가 막았을 수도 (핫스팟으로 해봐)"); });
  peer.on("disconnected", () => { try { if (MP.on && !peer.destroyed) peer.reconnect(); } catch (e) {} });
  peer.on("connection", conn => {
    conn.on("open", () => {
      if (state !== "menu") { try { conn.send({ t: "busy" }); } catch (e) {} setTimeout(() => conn.close(), 400); return; }
      const used = new Set(MP.players.map(p => p.slot)); let slot = -1; for (let s = 1; s < MP_MAX; s++) if (!used.has(s)) { slot = s; break; }
      if (slot < 0) { try { conn.send({ t: "full" }); } catch (e) {} setTimeout(() => conn.close(), 400); return; }
      const info = { conn, slot }; MP.conns.set(conn.peer, info); MP.players.push({ slot, name: "P" + (slot + 1), wpn: "missile" });
      conn.send({ t: "welcome", slot, code: MP.code, c: courseId, l: lapsTotal }); bcastPlayers();
    });
    conn.on("data", m => hostRecv(conn, m));
    const drop = () => { const info = MP.conns.get(conn.peer); if (!info || info.conn !== conn) return; MP.conns.delete(conn.peer); MP.players = MP.players.filter(p => p.slot !== info.slot); bcast({ t: "left", s: info.slot }); onLeft(info.slot); bcastPlayers(); };
    conn.on("close", drop); conn.on("error", drop);
  });
}
function hostRecv(conn, m) {
  const info = MP.conns.get(conn.peer); if (!info || !m || typeof m !== "object") return; const me = MP.players.find(p => p.slot === info.slot);
  if (m.t === "hello" || m.t === "wpn") { if (me) { if (m.t === "hello") me.name = cleanName(m.n); if (WEAPONS[m.w]) me.wpn = m.w; } bcastPlayers(); }
  else if (m.t === "s") { if (!Array.isArray(m.c)) return; m.c = m.c.filter(a => Array.isArray(a) && a[0] === info.slot); onGame(m); bcast(m, conn); }
  else if (m.t === "sp" || m.t === "reel" || m.t === "dmg") { if (m.s !== info.slot) return; onGame(m); bcast(m, conn); }
}
function mpJoin() {
  if (typeof Peer === "undefined") return mpStatus("멀티 라이브러리를 못 불러왔어요 (인터넷 확인)");
  readName(); const code = $id("mpCode").value.trim().toUpperCase(); if (code.length !== 4) return mpStatus("방 코드 4글자를 넣어줘");
  if (MP.peer) try { MP.peer.destroy(); } catch (e) {}
  mpStatus("접속 중…"); const peer = new Peer({ config: MP_ICE, debug: 1 }); MP.peer = peer;
  clearTimeout(MP.joinTimer); MP.joinTimer = setTimeout(() => { if (!MP.on) { mpStatus("연결 실패 — 코드 확인하거나, 학교 와이파이가 막는 거면 폰 핫스팟으로 해봐"); try { peer.destroy(); } catch (e) {} } }, 15000);
  peer.on("open", () => {
    const conn = peer.connect(MP_PRE + code, { reliable: true, serialization: "json" }); MP.conn = conn;
    conn.on("data", clientRecv);
    conn.on("close", () => { if (MP.on) mpLeave("호스트와 연결이 끊겼어요"); });
    conn.on("error", () => { if (MP.on) mpLeave("연결 오류"); });
  });
  peer.on("error", err => { if (err.type === "peer-unavailable") { clearTimeout(MP.joinTimer); mpStatus(`${code} 방이 없어요 (코드 확인)`); } else if (!MP.on) mpStatus("접속 실패: " + err.type); });
}
function clientRecv(m) {
  if (!m || typeof m !== "object") return;
  if (m.t === "welcome") { clearTimeout(MP.joinTimer); Object.assign(MP, { host: false, slot: m.slot, code: m.code }); MP.on = true; applyCfg(m); MP.conn.send({ t: "hello", n: MP.name, w: mySpecial }); mpStatus(""); enterLobby(); }
  else if (m.t === "players") { MP.players = m.pl || []; MP.noBot = new Set(m.nb || []); updatePanel(); }
  else if (m.t === "cfg") applyCfg(m);
  else if (m.t === "start") mpBegin(m);
  else if (m.t === "go") MP.goRecv = true;
  else if (m.t === "lobby") mpToLobby();
  else if (m.t === "left") onLeft(m.s);
  else if (m.t === "busy") { clearTimeout(MP.joinTimer); mpStatus("지금 레이스 중이라 못 들어가요. 끝나고 다시 해봐"); try { MP.peer.destroy(); } catch (e) {} }
  else if (m.t === "full") { clearTimeout(MP.joinTimer); mpStatus("방이 꽉 찼어요 (8명)"); try { MP.peer.destroy(); } catch (e) {} }
  else onGame(m);
}

// ---- 매 프레임: 출발 맞추기 + 위치 보내기
function netTick() {
  requestAnimationFrame(netTick); if (!MP.on) return;
  const now = performance.now();
  if (MP.host && MP.prevState === "count" && state === "race") bcast({ t: "go" }); // 호스트 신호등이 꺼지는 순간 다 같이 출발
  if (!MP.host && MP.race) { if (MP.goRecv) { if (state === "intro") introEnd(); if (state === "count") countdown = Math.min(countdown, 0.001); } else if (state === "count" && countdown < 0.5) countdown = 0.5; }
  MP.prevState = state;
  if (!REPLAY.on && (state === "intro" || state === "count" || state === "race" || state === "end") && now - MP.sendT > 50) {
    MP.sendT = now; const c = [snapOf(player, MP.slot)]; if (MP.host) for (const a of ais) if (!a.net) c.push(snapOf(a, slotOfCar(a)));
    netSend({ t: "s", c });
  }
}
requestAnimationFrame(netTick);

// ---- 버튼
$id("mpName").value = MP.name;
titleBtn("tmMulti", () => { mpStatus(""); showScreen("mpScreen"); });
$id("mpList").onclick = e => { const b = e.target.closest("span.bot"); if (!b || !MP.host || state !== "menu") return; const s = +b.dataset.s; if (MP.noBot.has(s)) MP.noBot.delete(s); else MP.noBot.add(s); bcastPlayers(); };
$id("mpBotAll").onclick = () => { if (!MP.host) return; MP.noBot.clear(); bcastPlayers(); };
$id("mpBotNone").onclick = () => { if (!MP.host) return; for (let s = 1; s < MP_MAX; s++) MP.noBot.add(s); bcastPlayers(); };
$id("mpCreate").onclick = mpCreate; $id("mpJoin").onclick = mpJoin; $id("mpCode").onkeydown = e => { if (e.key === "Enter") mpJoin(); };
$id("mpBack").onclick = () => { if (MP.peer && !MP.on) try { MP.peer.destroy(); MP.peer = null; } catch (e) {} showScreen("titleScreen"); };
{ const o = $id("bStart").onclick; $id("bStart").onclick = () => { if (!MP.on) return o(); if (MP.host) { if (isTouch) goFull(true); mpStart(); } }; }
$id("bAgain").onclick = () => { if (!MP.on) return startRace(); if (MP.host) mpStart(); };
$id("bMenu").onclick = () => { if (!MP.on) return toMenu(); if (MP.host) { bcast({ t: "lobby" }); mpToLobby(); } };
$id("bTitle").onclick = () => { if (MP.on) mpLeave(); else toTitle(); };
$id("bSetupBack").onclick = () => { if (MP.on) mpLeave(); else showScreen("titleScreen"); };
{ const o = $id("bRep").onclick; $id("bRep").onclick = () => { if (MP.on && MP.host && ais.some(a => a.human && !a.done && !a.dead)) { $id("endInfo").textContent = "다른 사람들이 다 들어오면 리플레이 볼 수 있어 (호스트가 멈추면 봇도 멈춤)"; return; } o(); }; }
window.__mp = MP;
