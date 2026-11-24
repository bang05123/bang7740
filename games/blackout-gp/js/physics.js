// ================= 높이 (점프·착지) =================
function stepVertical(o, groundY, dt, isPlayer) {
  const pred = o.y + o.vy * dt - GRAV * dt * dt * 0.5;
  if (pred > groundY + 0.03) { o.y = pred; o.vy -= GRAV * dt; o.air = (o.air || 0) + dt; return false; }
  const impact = -o.vy, wasAir = (o.air || 0) > 0.15;
  o.vy = clamp((groundY - o.y) / Math.max(dt, 1e-4), -5, 45); o.y = groundY;
  if (wasAir && isPlayer) { shake = Math.max(shake, Math.min(1.3, impact / 16)); player.squash = Math.min(0.55, impact / 34); player.pv -= impact * 0.06; sndBurst(0.4, 260, Math.min(0.9, impact / 22)); for (let k = 0; k < 16; k++) emit(sparks, o.x, o.y + 0.2, o.z, (Math.random() - 0.5) * 12, Math.random() * 5, (Math.random() - 0.5) * 12, 0.4); }
  o.air = 0; return true;
}

// ================= 플레이어 물리 (타이어·무게 이동) =================
let CUR = null, INP = null; // 지금 계산 중인 차와 그 차의 입력 (플레이어든 라이벌이든 같은 물리)
function toWorld(p = CUR) { const s = Math.sin(p.h), c = Math.cos(p.h); p.vx = s * p.vf + c * p.vl; p.vz = c * p.vf - s * p.vl; }
function fromWorld(p = CUR) { const s = Math.sin(p.h), c = Math.cos(p.h); p.vf = p.vx * s + p.vz * c; p.vl = p.vx * c - p.vz * s; }
// ================= 서스펜션 (바퀴 네 개가 각자 땅을 짚고 눌리고 늘어남) =================
const SUS = { LR: 0.5, KS: 62000, CS: 4600, TRAVEL: 0.26, KB: 700000, CB: 22000, IP: 2300, IR: 700, KARB: 160000, CP: 9000, CR: 14000 };
const SUS_STATIC = MASS * G / 4 / SUS.KS, RIDE = SUS.LR - SUS_STATIC; // 정지 상태에서 차체 기준점 높이
function suspReset(p, groundY) { p.cy = groundY + RIDE; p.vy = 0; p.bp = 0; p.br = 0; p.bpr = 0; p.brr = 0; p.comp = [SUS_STATIC, SUS_STATIC, SUS_STATIC, SUS_STATIC]; p.hgPrev = null; p.loads = [MASS * G / 4, MASS * G / 4, MASS * G / 4, MASS * G / 4]; p.air = 0; p.y = groundY; }
function physWP(m) { // 물리용 바퀴 위치: 좌우 대칭 사각형으로 정리 (사이드카처럼 바퀴가 제각각인 차도 똑같이 굴러가게)
  const u = m.userData; if (u.physWP) return u.physWP;
  const W = u.wheelPos, zf = Math.max(...W.map(w => w[1])), zr = Math.min(...W.map(w => w[1])), ht = Math.max(1.3, W.reduce((q, w) => q + Math.abs(w[0]), 0) / W.length);
  return u.physWP = [[-ht, zf], [ht, zf], [-ht, zr], [ht, zr]];
}
function suspStep(dt, down) {
  const p = CUR, WP = physWP(p.mesh), t0 = TRK[p.idx];
  const fx = Math.sin(p.h), fz = Math.cos(p.h), rx = Math.cos(p.h), rz = -Math.sin(p.h);
  let Fsum = 0, tP = 0, tR = 0, contact = 0, maxOver = 0, gvOver = -1e9; if (!p.hgPrev) p.hgPrev = [null, null, null, null];
  for (let i = 0; i < 4; i++) {
    const [wx, wz] = WP[i], ox = rx * wx + fx * wz, oz = rz * wx + fz * wz;
    const bx = p.x + ox - t0.x, bz = p.z + oz - t0.z; // 이번 프레임 기준 구간에서 바퀴 위치
    const hg = surfH(t0.s + bx * t0.tx + bz * t0.tz, bx * nx(t0) + bz * nz(t0));
    const attach = p.cy - wz * p.bp + wx * p.br;
    const comp = hg - (attach - SUS.LR), rate = (comp - p.comp[i]) / dt;
    const gv = p.hgPrev[i] === null ? 0 : clamp((hg - p.hgPrev[i]) / dt, -60, 60); p.hgPrev[i] = hg; // 바퀴 밑 땅이 올라오는 속도
    let F = 0;
    if (comp > 0) {
      F = SUS.KS * Math.min(comp, SUS.TRAVEL) + SUS.CS * rate;
      if (comp > SUS.TRAVEL) { const over = comp - SUS.TRAVEL; F += SUS.KB * over * (rate > 0 ? 1 : 0.1) + SUS.CB * Math.max(0, rate); p.bottomed = Math.max(p.bottomed || 0, rate); if (over > maxOver) { maxOver = over; gvOver = gv; } } // 범프스톱은 튕겨내지 않고 흡수
      F = Math.max(0, F); contact++;
    }
    p.comp[i] = comp; p.loads[i] = F; Fsum += F; tP -= F * wz; tR += F * wx;
  }
  // 안티롤바: 바퀴가 닿아 있을 때만, 좌우 하중을 옮김
  if (contact >= 3) { // 좌우 서스펜션이 눌린 차이만 보고 버팀 (기울어진 뱅크 위에선 차가 노면을 따라 기울어야 하니까)
    let cP = 0, cN = 0, nP = 0, nN = 0; for (let i = 0; i < 4; i++) { const c = Math.max(0, p.comp[i]); if (WP[i][0] > 0) { cP += c; nP++; } else { cN += c; nN++; } }
    const arbF = SUS.KARB / 3.6 * (cP / Math.max(1, nP) - cN / Math.max(1, nN));
    for (let i = 0; i < 4; i++) { const d = (WP[i][0] > 0 ? 1 : -1) * arbF / 2; p.loads[i] = Math.max(0, p.loads[i] + d); tR += d * WP[i][0]; }
  }
  const grounded = contact > 0;
  // 몸체 운동: 위아래, 앞뒤 기울기, 좌우 기울기
  p.vy += (grounded ? (Fsum - MASS * G - down) / MASS : -GRAV) * dt; p.cy += p.vy * dt; // 공중에선 게임용으로 중력을 세게 (점프가 둥둥 뜨지 않게)
  if (maxOver > 0.05) { p.cy += maxOver - 0.05; p.vy = Math.max(p.vy, Math.min(gvOver, 25)); } // 끝까지 눌리면 땅을 따라 올라감 (스프링 반동 없이)
  const gI = p.mesh.userData.physI || (p.mesh.userData.physI = (() => { const W = WP, wb = W[0][1] - W[2][1], ht = W[1][0]; return [Math.max(1, (wb / 5.74) ** 2), Math.max(1, (ht / 1.575) ** 2)]; })()); // 큰 차는 관성도 크게 (안 그러면 스프링이 튕겨서 날아감)
  const IPx = SUS.IP * gI[0], IRx = SUS.IR * gI[1];
  let aP = (tP + (grounded ? p.tauP || 0 : 0)) / IPx - (grounded ? SUS.CP * gI[0] * p.bpr / IPx : 0);
  let aR = (tR + (grounded ? p.tauR || 0 : 0)) / IRx - (grounded ? SUS.CR * gI[1] * p.brr / IRx : 0);
  if (!grounded) { aP += -(p.bp - 0.03) * 4 - p.bpr * 2; aR += -p.br * 6 - p.brr * 3; } // 공중에서 살짝 자세 잡기
  p.bpr += aP * dt; p.bp += p.bpr * dt; p.brr += aR * dt; p.br += p.brr * dt;
  p.bp = clamp(p.bp, -0.6, 0.6); p.br = clamp(p.br, -0.6, 0.6);
  return contact;
}
function tireStep(dt, env) {
  const p = CUR;
  const downF = DOWN * p.vf * p.vf * (p.boostT > 0 ? 1.8 : 1);
  const contact = suspStep(dt, downF), onGround = contact > 0;
  const boosting = p.boostT > 0, canGo = env.canGo;
  const top = P.top * (p.topMul || 1) * (p.hpMul || 1) * (p.slip ? 1.1 : 1);
  const vfa = Math.max(Math.abs(p.vf), 4);
  let Fx = 0;
  if (canGo) {
    if (INP.gas > 0) Fx += MASS * P.accel * (p.accelMul || 1) * (p.hpMul || 1) * INP.gas * Math.max(0, 1 - Math.max(0, p.vf) / top);
    if (INP.brake > 0) { if (p.vf > 1) Fx -= MASS * 34 * INP.brake; else Fx -= MASS * 9 * INP.brake * (p.vf > -12 ? 1 : 0); }
  } else Fx -= Math.sign(p.vf) * MASS * 10;
  if (p.vf > top && !boosting) Fx -= MASS * (p.vf - top) * 1.2;
  // 타이어가 받는 하중 = 서스펜션이 실제로 누르는 힘 (무게 이동·점프·연석이 그대로 반영됨)
  const LCAP = (MASS * G + downF) * 0.75; // 착지 순간 하중이 튀어도 타이어 힘은 한계까지만 (한쪽 바퀴만 닿아 휙 도는 것 방지)
  const wf = clamp(p.loads[0] + p.loads[1], 1, LCAP), wr = clamp(p.loads[2] + p.loads[3], 1, LCAP), Fz = wf + wr;
  const HWp = hwAt(p.s), off = Math.abs(p.lat) > HWp + 0.8, offK = sstep(HWp + 0.5, HWp + 4, Math.abs(p.lat));
  const mu = P.grip * (p.gripMul || 1) * (1 - 0.34 * offK) * (env.muMul || 1), muR = mu * (INP.drift ? 0.45 : 1);
  const tyre = Math.tanh;
  // 구동력은 뒷바퀴 그립 한계까지 (부스트 추력은 별도)
  const drive = Math.max(0, Fx), capR0 = muR * wr * 1.12;
  // 트랙션 컨트롤: 코너에서 뒷바퀴가 버틸 만큼만 힘을 보냄 (Shift 드리프트 중엔 꺼짐)
  const tc = INP.drift ? 1.25 * capR0 / 1.12 : capR0 * 1.15 * Math.sqrt(Math.max(0.12, 1 - Math.min(1, (p.latUse || 0) * 1.08) ** 2));
  const driveMax = Math.min(muR * wr * 1.25, tc), driveUsed = Math.min(drive, driveMax);
  p.spin = drive > muR * wr * 1.5 && Math.abs(p.vf) < 18;
  let FxT = (Fx >= 0 ? driveUsed : Math.max(Fx, -mu * Fz * 1.05));
  if (boosting && canGo && INP.brake < 0.3) FxT += MASS * P.accel * 2.2 * (INP.gas > 0 ? 1 : 0.3) * Math.max(0, 1 - Math.max(0, p.vf) / (P.top * P.boostPow)); // 브레이크 밟으면 부스트 추력은 쉼
  FxT -= MASS * (0.012 * p.vf + 0.08 * offK * p.vf); // 공기·지면 저항
  const maxD = 0.55 * P.steer / (1 + Math.abs(p.vf) / 70), delta = -INP.steer * maxD; // 화면 기준 오른쪽 = 회전 방향 음수
  let Ar = 0, Af = 0, ryDot = 0;
  if (onGround) {
    const alphaF = Math.atan2(p.vl + A_ * p.ry, vfa) - delta;
    const alphaR = Math.atan2(p.vl - B_ * p.ry, vfa);
    const Fyf = -mu * wf * tyre(CNF * alphaF);
    const capR = muR * wr * 1.12, latR = capR * Math.sqrt(Math.max(0.3, 1 - (driveUsed / (capR * 1.15)) ** 2));
    const Fyr = -latR * tyre(CNR * alphaR);
    p.latUse = Math.abs(Fyr) / capR;
    p.slipR = Math.max(Math.abs(alphaR), Math.abs(alphaF) * 0.6);
    p.aF = alphaF; p.aR = alphaR; p.Fyf = Fyf; p.Fyr = Fyr; p.latR = latR; p.wf = wf; p.wr = wr;
    Af = (FxT - Fyf * Math.sin(delta)) / MASS + env.gF;
    Ar = (Fyf * Math.cos(delta) + Fyr) / MASS + env.gR;
    p.tauP = -(Af - env.gF) * MASS * HCG; p.tauR = (Ar - env.gR) * MASS * HCG; // 가속·제동·코너링이 차체를 기울임
    ryDot = (A_ * Fyf * Math.cos(delta) - B_ * Fyr) / IZ;
    const ryMax = mu * (Fz / MASS) / Math.max(Math.abs(p.vf), 6) * 0.95;
    if (!INP.drift) { const tgt = clamp(p.vf * Math.tan(delta) / WB, -ryMax, ryMax); ryDot -= 4.5 * (p.ry - tgt); if (Math.abs(p.ry) > ryMax) ryDot -= 14 * (p.ry - Math.sign(p.ry) * ryMax); } // 약간의 안정 보조
    // 저속에서는 기하학적 조향으로 섞기
    const w = clamp((p.vf - 1) / 5, 0, 1);
    if (w < 1) { const ryK = p.vf * Math.tan(delta) / WB; ryDot = ryDot * w + (ryK - p.ry) * 10 * (1 - w); Ar = Ar * w + (-p.vl * 10 - p.vf * p.ry) * (1 - w) + p.vf * p.ry * (1 - w); }
  } else {
    Af = (boosting && canGo && INP.brake < 0.3 ? MASS * P.accel * 1.2 : 0) / MASS - 0.01 * p.vf; Ar = 0; ryDot = -INP.steer * 0.5 - p.ry * 2.5; p.slipR = 0; p.tauP = p.tauR = 0;
  }
  p.vf += (Af + p.vl * p.ry) * dt; p.vl += (Ar - p.vf * p.ry) * dt; p.ry += ryDot * dt;
  if (onGround && !INP.drift) p.vl *= Math.exp(-4 * dt); // 옆으로 흘러가는 것 억제 (차체가 덜 휘청이게)
  if (p.vf < -12) p.vf = -12;
  p.h += p.ry * dt;
  toWorld(); p.x += p.vx * dt; p.z += p.vz * dt;
  p.ax += (Af - p.ax) * Math.min(1, 6 * dt); p.ay += (Ar - p.ay) * Math.min(1, 6 * dt);
  return contact;
}
function stepPlayer(dt) { stepCar(player, player.dead ? DEAD_INP : input, dt); }
function stepCar(p, inp, dt) {
  if (window.__yawlog && p === player && !p.tumble) { const d = (p.ry || 0) - (p._ry || 0); if (Math.abs(d) > (window.__yawTh || 0.5)) window.__yawlog.push({ t: +raceT.toFixed(2), d: +d.toFixed(2), src: raceT - (p.kSrcT ?? -9) < 0.1 ? p.kSrc : "?", s: Math.round(p.s), lat: +p.lat.toFixed(1), v: Math.round(p.vf), air: +(p.air || 0).toFixed(2), st: inp.steer }); } p._ry = p.ry;
  CUR = p; INP = inp; const isP = p === player, canGo = (state === "race" || (state === "end" && !isP)) && !p.done && !p.dead; // 내가 들어온 뒤에도 라이벌은 끝까지 달림
  let slip = false;
  for (const a of [player, ...ais]) { if (a === p) continue; const d = a.prog - p.prog; if (d > 3 && d < 32 && p.vf > 15 && Math.abs(a.lat - p.lat) < 3.6) slip = true; }
  p.slip = slip;
  if (isP && canGo && input.boostPress && p.charges > 0 && p.boostT <= 0 && p.vf > 5) { p.charges--; p.boostT = BOOST_TIME; boostBurst(player); setMsg("BLACKOUT BOOST!", 1.5); shake = 1.1; flashT = 1; slowT = 0.45; sndBoom(); }
  p.boostT = Math.max(0, p.boostT - dt);
  if (p.tumble) { stepTumble(p, dt); if (p.tumble) trackFollow(p, dt); return; }
  // 경사면 중력 (언덕·뱅크)
  const t0 = TRK[p.idx], s0 = p.s, l0 = p.lat;
  const dhds = (surfH(s0 + 1.5, l0) - surfH(s0 - 1.5, l0)) / 3, dhdl = (surfH(s0, l0 + 1) - surfH(s0, l0 - 1)) / 2;
  const fxv = Math.sin(p.h), fzv = Math.cos(p.h), rxv = Math.cos(p.h), rzv = -Math.sin(p.h);
  const fT = fxv * t0.tx + fzv * t0.tz, fN = fxv * nx(t0) + fzv * nz(t0), rT = rxv * t0.tx + rzv * t0.tz, rN = rxv * nx(t0) + rzv * nz(t0);
  const onG = p.air <= 0;
  const env = { canGo, gF: onG ? -G * (dhds * fT + dhdl * fN) : 0, gR: onG ? -G * (dhds * rT + dhdl * rN) : 0 };
  p.tPitch = -Math.atan(dhds * fT + dhdl * fN); p.tRoll = Math.atan(dhds * rT + dhdl * rN);
  const SUB = 4; for (let k = 0; k < SUB; k++) p.contact = tireStep(dt / SUB, env);
  const relR = p.br - (p.tRoll || 0), relP = p.bp - (p.tPitch || 0); // 노면 기울기 대비 차체가 얼마나 넘어갔나 (뱅크는 빼고)
  p.kickT = Math.max(0, (p.kickT || 0) - dt);
  if ((p.kickT > 0 || p.air > 0.3) && ((Math.abs(relR) > 0.56 && relR * p.brr > 1.8) || (Math.abs(relP) > 0.58 && relP * p.bpr > 2.2))) { /* 맞았거나 공중에서만 (그냥 달리다 저절로 넘어가진 않게) */ const fx_ = Math.sin(p.h), fz_ = Math.cos(p.h), rx_ = Math.cos(p.h), rz_ = -Math.sin(p.h); (window.__tlog && window.__tlog.push("susp")), enterTumble(p, fx_ * p.brr * 0.9 + rx_ * p.bpr * 0.9, fz_ * p.brr * 0.9 + rz_ * p.bpr * 0.9, 1); } // 너무 기울면 그대로 넘어감
  if (p.dead) { p.vf *= Math.exp(-1.4 * dt); p.vl *= Math.exp(-3 * dt); p.ry *= Math.exp(-2 * dt); toWorld(p); } // 바퀴 없이 바닥을 긁으며 멈춤
  if (!isP && !p.dead) { // 라이벌 운전 실력 보정: 공중에선 진행 방향으로 차체를 맞추고, 땅에선 옆미끄럼을 조금 더 잡음
    if (p.contact === 0) { let d = Math.atan2(p.vx, p.vz) - p.h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; if (Math.hypot(p.vx, p.vz) > 8 && Math.abs(d) < 1) { p.h += d * Math.min(1, 4 * dt); p.ry *= Math.exp(-4 * dt); fromWorld(p); } }
    else if ((p.hitT || 0) <= 0) { p.vl *= Math.exp(-2.5 * dt); toWorld(p); }
    p.hitT = Math.max(0, (p.hitT || 0) - dt);
  }
  // 위치를 코스에 대응
  const prevLat = p.lat;
  p.idx = nearest(p.x, p.z, p.idx);
  const t = TRK[p.idx]; let lat = (p.x - t.x) * nx(t) + (p.z - t.z) * nz(t);
  p.scrape = Math.max(0, p.scrape - dt);
  // 점프대 옆면은 벽
  if (t.ramp > 1 && Math.abs(prevLat) > t.hw && Math.abs(lat) <= t.hw && p.y < surfH(t.s, lat) - 0.8) { const sg = Math.sign(prevLat); p.x += nx(t) * sg * (Math.abs(lat) - t.hw - 0.1) * -1; p.z += nz(t) * sg * (Math.abs(lat) - t.hw - 0.1) * -1; hitWall(t, sg, 0.4); lat = sg * (t.hw + 0.1); }
  if (C.barrier) { // 방호벽: 수직 성분만 없애고 미끄러지게
    const lim = t.hw + C.barrier - 1.2;
    if (Math.abs(lat) > lim) { const sg = Math.sign(lat), over = Math.abs(lat) - lim; p.x -= nx(t) * sg * over; p.z -= nz(t) * sg * over; hitWall(t, sg, 0.25, 1.4); lat = sg * lim; }
  }
  if (C.bound) { // 황야 끝: 모래가 깊어져 느려지고, 너무 멀면 복귀
    const out = Math.abs(lat) - C.bound;
    if (out > 0) { p.vf *= Math.exp(-0.8 * dt); p.vl *= Math.exp(-0.8 * dt); toWorld(); if (isP && msgT <= 0) setMsg("코스 이탈! (R: 복귀)", 1); if (out > 60) resetCar(p); }
  }
  for (const c of colliders) { // 바위산·폐차
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), R = c.r + 2.2;
    if (d < R && d > 0.01) { const ux = dx / d, uz = dz / d; p.x = c.x + ux * R; p.z = c.z + uz * R; const vn = p.vx * ux + p.vz * uz; if (vn < 0) { if (-vn > 22 && !p.tumble) (window.__tlog && window.__tlog.push("rock")), enterTumble(p, -uz * vn * 0.12, ux * vn * 0.12, -vn * 0.25); if (-vn > 8) applyDamage(p, dmgWall(-vn) * SMASH, hitLocal(p, -ux, -uz), null, 'rock'); p.vx -= ux * vn * 1.3; p.vz -= uz * vn * 1.3; p.vx *= 0.92; p.vz *= 0.92; if (isP) shake = Math.max(shake, Math.min(1, -vn / 20)); sndImpact(-vn, p.x, p.z, 0.4); fromWorld(); p.ry *= 0.5; } }
  }
  if (t.fence) { const lim = Math.abs(mapLat(t, HALF + 5.5)) - 1.1; if (Math.abs(lat) > lim && Math.abs(prevLat) <= lim + 2.5) { const sg = Math.sign(lat), over = Math.abs(lat) - lim; p.x -= nx(t) * sg * over; p.z -= nz(t) * sg * over; hitWall(t, sg, 0.25, SMASH); lat = sg * lim; } } // 가드레일
  if (SOLIDS.length) collideSolids(p, false);
  p.lat = lat;
  const along = (p.x - t.x) * t.tx + (p.z - t.z) * t.tz, s = t.s + along;
  let ds = s - p.s; if (ds < -L / 2) ds += L; if (ds > L / 2) ds -= L; p.s = s; p.prog += ds;
  // 높이는 서스펜션이 계산함. 공중·착지 판정
  p.y = p.cy - RIDE;
  if (GAP && s > GAP[0] && s < GAP[1] && p.y < 0) { resetCar(p); if (isP) { setMsg("추락! 착지 지점에서 다시", 1.5); shake = 1; } return; } // 점프가 모자라 협곡으로 떨어짐
  const gnd = surfH(s, lat); if (p.y < gnd - 1.5 && !(GAP && s > GAP[0] && s < GAP[1])) { suspReset(p, gnd); } // 혹시 땅을 뚫으면 복구
  if (!p.contact) { p.air += dt; p.fallV = Math.min(p.fallV || 0, p.vy); }
  else {
    if (p.air > 0.15 && isP) { const impact = -(p.fallV || 0); shake = Math.max(shake, Math.min(1.3, impact / 14)); sndLand(impact); if (impact > 6) for (let k = 0; k < 16; k++) emit(sparks, p.x, p.y + 0.2, p.z, (Math.random() - 0.5) * 12, Math.random() * 5, (Math.random() - 0.5) * 12, 0.4); }
    if (p.air > 0.15 && -(p.fallV || 0) > 32) applyDamage(p, (-(p.fallV || 0) - 32) * 1.0, null, null, 'land');
    p.air = 0; p.fallV = 0;
  }
  if (p.bottomed > 3 && isP) { shake = Math.max(shake, Math.min(0.8, p.bottomed / 12)); for (let k = 0; k < 6; k++) emit(sparks, p.x, p.y + 0.15, p.z, (Math.random() - 0.5) * 8, Math.random() * 3, (Math.random() - 0.5) * 8, 0.3); } // 바닥 긁힘
  p.bottomed = 0;
  if (isP && p.air > 0.5 && !p.airMsg) { setMsg("AIR!", 0.9); p.airMsg = 1; } if (p.air === 0) p.airMsg = 0;
  // 연기·먼지
  const fx = Math.sin(p.h), fz = Math.cos(p.h), rx = Math.cos(p.h), rz = -Math.sin(p.h), spd = Math.hypot(p.vf, p.vl);
  p.tick = (p.tick || 0) + 1;
  if (isP) carFx(dt, lat, fx, fz, rx, rz, spd); else aiFx(p, lat, fx, fz, rx, rz, spd);
}

// ================= 전복 (굴러가는 강체) =================
// 평소엔 서스펜션이 자세를 잡지만, 크게 맞거나 기울면 그때부터는 자유롭게 구르고 뒤집힘
const _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _r = new THREE.Vector3(), _e = new THREE.Euler();
function enterTumble(p, wx, wz, vyAdd = 0) {
  if (p.tumble) { p.tw.x += wx; p.tw.z += wz; p.tv.y += vyAdd; return; }
  const u = p.mesh.userData, hh = Math.max(0.6, (u.hh || 0.8));
  p.tumble = true; p.tumbleT = 0; p.stillT = 0; p.rollDmg = 0; p.rolls = (p.rolls || 0) + 1;
  p.tq = new THREE.Quaternion().setFromEuler(_e.set(p.bp || 0, p.h, p.br || 0, "YXZ"));
  p.tc = new THREE.Vector3(p.x, p.y + hh, p.z).add(new THREE.Vector3(0, 0, 0)); p.thh = hh;
  p.tv = new THREE.Vector3(p.vx, (p.vy || 0) + vyAdd, p.vz); p.tw = new THREE.Vector3(wx, p.ry, wz);
}
function exitTumble(p, gy) {
  p.tumble = false; const f = new THREE.Vector3(0, 0, 1).applyQuaternion(p.tq); p.h = Math.atan2(f.x, f.z);
  p.vx = p.tv.x; p.vz = p.tv.z; p.ry = clamp(p.tw.y, -1.5, 1.5); fromWorld(p); suspReset(p, gy); p.vy = Math.min(0, p.tv.y);
}
function stepTumble(p, dt) {
  const u = p.mesh.userData, hl = u.hl * 0.95, hw = u.hwd * 0.95, hh = p.thh, m = MASS, I = m * (hl * hl + hh * hh) / 3, isP = p === player;
  const SUBT = 4, h = dt / SUBT; let contacts = 0, bigHit = 0;
  for (let k = 0; k < SUBT; k++) {
    p.tv.y -= 24 * h; p.tc.addScaledVector(p.tv, h);
    const wl = p.tw.length(); if (wl > 1e-4) { _q.setFromAxisAngle(_w.copy(p.tw).divideScalar(wl), wl * h); p.tq.premultiply(_q).normalize(); }
    contacts = 0; let lift = 0;
    for (const cx of [-hw, hw]) for (const cy of [-hh, hh * 0.9]) for (const cz of [-hl, hl]) {
      _r.set(cx, cy, cz).applyQuaternion(p.tq); const px = p.tc.x + _r.x, py = p.tc.y + _r.y, pz = p.tc.z + _r.z;
      const t = TRK[p.idx], lat = (px - t.x) * nx(t) + (pz - t.z) * nz(t), along = (px - t.x) * t.tx + (pz - t.z) * t.tz, gy = surfH(t.s + along, lat);
      const pen = gy - py; if (pen <= 0) continue; contacts++; lift = Math.max(lift, pen);
      // 그 점의 속도 = 몸 속도 + 회전 × 팔
      const vx = p.tv.x + p.tw.y * _r.z - p.tw.z * _r.y, vy = p.tv.y + p.tw.z * _r.x - p.tw.x * _r.z, vz = p.tv.z + p.tw.x * _r.y - p.tw.y * _r.x;
      if (vy < 0) {
        const rn2 = _r.x * _r.x + _r.z * _r.z, j = -(1.25) * vy / (1 / m + rn2 / I) / 4; // 구석 넷이 나눠 받음
        p.tv.y += j / m; p.tw.x += (-_r.z * j) / I * 1; p.tw.z += (_r.x * j) / I;
        if (-vy > bigHit) bigHit = -vy;
        // 바닥 마찰: 미끄러지는 방향 반대로
        const tl = Math.hypot(vx, vz); if (tl > 0.05) { const jt = Math.min(0.55 * j, tl * m / 8) ; const fx = -vx / tl * jt, fz = -vz / tl * jt; p.tv.x += fx / m; p.tv.z += fz / m; p.tw.x += (_r.y * fz) / I * 0.6; p.tw.z += (-_r.y * fx) / I * 0.6; p.tw.y += (_r.z * fx - _r.x * fz) / I * 0.6; }
      }
    }
    if (lift > 0) p.tc.y += lift * 0.9;
    if (contacts) { p.tw.multiplyScalar(Math.exp(-0.6 * h)); p.tv.x *= Math.exp(-0.35 * h); p.tv.z *= Math.exp(-0.35 * h); }
  }
  // 차체 기준값들 갱신 (충돌·카메라·순위가 쓰는 값)
  const f = _v.set(0, 0, 1).applyQuaternion(p.tq); p.h = Math.atan2(f.x, f.z); p.ry = p.tw.y;
  p.x = p.tc.x; p.z = p.tc.z; p.vx = p.tv.x; p.vz = p.tv.z; fromWorld(p);
  const up = _w.set(0, 1, 0).applyQuaternion(p.tq); p.y = p.tc.y - hh * up.y; p.air = contacts ? 0 : p.air + dt; p.contact = 0;
  if (bigHit > 9) { const dm = Math.min((bigHit - 9) * 0.5, Math.max(0, 20 - (p.rollDmg || 0))); p.rollDmg = (p.rollDmg || 0) + dm; applyDamage(p, dm, null, null, 'roll'); /* 한 번 구를 때 최대 45 */ sndImpact(bigHit * 1.2, p.x, p.z); if (viewD(p.x, p.z) < 250) for (let k = 0; k < 10; k++) emit(sparks, p.x, p.y + 0.5, p.z, (Math.random() - 0.5) * 10 + p.vx * 0.3, Math.random() * 6, (Math.random() - 0.5) * 10 + p.vz * 0.3, 0.4); if (isP) shake = Math.max(shake, Math.min(1.2, bigHit / 12)); }
  if (contacts && Math.hypot(p.tv.x, p.tv.z) > 8 && Math.random() < 0.5 && viewD(p.x, p.z) < 250) emit(sparks, p.x, p.y + 0.2, p.z, -p.vx * 0.2 + (Math.random() - 0.5) * 6, Math.random() * 3, -p.vz * 0.2 + (Math.random() - 0.5) * 6, 0.3);
  if (contacts && p.tv.length() < 4 && p.tw.length() < 1.5) p.stillT += dt; else p.stillT = 0;
  p.tumbleT += dt;
  // 바로 서서 멈추면 다시 달림, 뒤집혀 멈추면 코스 복귀
  if (!p.dead && p.stillT > 0.25 && up.y > 0.8 && contacts >= 3) { const t = TRK[p.idx]; exitTumble(p, surfH(p.s, p.lat)); if (isP) setMsg("살았다!", 0.8); return; }
  if (!p.dead && (p.stillT > 1.6 || p.tumbleT > 9) && up.y <= 0.8) { p.tumble = false; resetCar(p); applyDamage(p, 4, null, null, 'roll'); if (isP) setMsg("전복! 코스 복귀", 1.2); return; }
  if (p.dead && p.stillT > 2) { p.tv.set(0, 0, 0); p.tw.set(0, 0, 0); }
}
function trackFollow(p, dt) { // 굴러가는 중에도 코스 위치·순위 갱신, 방호벽·바위 처리
  p.idx = nearest(p.x, p.z, p.idx); const t = TRK[p.idx]; let lat = (p.x - t.x) * nx(t) + (p.z - t.z) * nz(t);
  if (C.barrier) { const lim = t.hw + C.barrier - 1.2; if (Math.abs(lat) > lim) { const sg = Math.sign(lat), over = Math.abs(lat) - lim; p.tc.x -= nx(t) * sg * over; p.tc.z -= nz(t) * sg * over; const vn = p.tv.x * nx(t) * sg + p.tv.z * nz(t) * sg; if (vn > 0) { p.tv.x -= nx(t) * sg * vn * 1.3; p.tv.z -= nz(t) * sg * vn * 1.3; if (vn > 8) { applyDamage(p, dmgWall(vn), hitLocal(p, nx(t) * sg, nz(t) * sg), null, 'wall'); sndImpact(vn, p.x, p.z); } } p.x = p.tc.x; p.z = p.tc.z; lat = sg * lim; } }
  for (const c of colliders) { const dx = p.tc.x - c.x, dz = p.tc.z - c.z, d = Math.hypot(dx, dz), R = c.r + 2.2; if (d < R && d > 0.01) { const ux = dx / d, uz = dz / d; p.tc.x = c.x + ux * R; p.tc.z = c.z + uz * R; const vn = p.tv.x * ux + p.tv.z * uz; if (vn < 0) { p.tv.x -= ux * vn * 1.3; p.tv.z -= uz * vn * 1.3; } p.x = p.tc.x; p.z = p.tc.z; } }
  if (SOLIDS.length) collideSolids(p, true);
  if (C.bound && Math.abs(lat) - C.bound > 60) { p.tumble = false; resetCar(p); return; }
  p.lat = lat; const along = (p.x - t.x) * t.tx + (p.z - t.z) * t.tz, s = t.s + along; let ds = s - p.s; if (ds < -L / 2) ds += L; if (ds > L / 2) ds -= L; p.s = s; p.prog += ds;
}

// ================= 차 이펙트 =================
function carFx(dt, lat, fx, fz, rx, rz, spd) {
  const p = player, onG = p.contact > 0, onDirt = Math.abs(lat) > hwAt(p.s) + 0.8, R = Math.random;
  const rearX = sd => p.x - fx * 2.75 + rx * sd * 1.6, rearZ = sd => p.z - fz * 2.75 + rz * sd * 1.6;
  // 더트: 크게 피어오르는 흙먼지 + 뒤로 튀는 흙덩이
  if (onG && onDirt && spd > 6) {
    const n = spd > 40 ? 2 : 1;
    for (let k = 0; k < n; k++) for (const sd of [-1, 1]) emit(dust, rearX(sd) - fx * 0.6, p.y + 0.5 + R() * 0.6, rearZ(sd) - fz * 0.6, (R() - 0.5) * 5 - p.vx * 0.12 + rx * sd * 3, 2 + R() * 4, (R() - 0.5) * 5 - p.vz * 0.12 + rz * sd * 3, 1.6 + R());
    if (spd > 15) for (let k = 0; k < 3; k++) { const sd = R() < 0.5 ? -1 : 1; emit(debris, rearX(sd), p.y + 0.3, rearZ(sd), -p.vx * 0.25 + (R() - 0.5) * 6, 4 + R() * 6, -p.vz * 0.25 + (R() - 0.5) * 6, 0.9); }
  }
  // 코너·드리프트: 타이어 연기 + 스키드마크
  const sliding = onG && !onDirt && ((p.slipR > 0.1 && spd > 12) || (p.spin && p.tick % 4 === 0));
  if (sliding && p.tick % 2 === 0) for (const sd of [-1, 1]) emit(smoke, rearX(sd), p.y + 0.35, rearZ(sd), (R() - 0.5) * 2 - p.vx * 0.05, 0.8 + R(), (R() - 0.5) * 2 - p.vz * 0.05, 1.2 + Math.min(1, p.slipR * 3));
  const hardBrake = onG && input.brake > 0 && p.vf > 20;
  if ((sliding || hardBrake) && !onDirt) {
    const len = clamp(spd / 60, 0.3, 3), vh = Math.atan2(p.vx, p.vz);
    for (const sd of [-1, 1]) { addSkid(rearX(sd), rearZ(sd), surfH(p.s - 2.75, lat + sd * 1.6) + 0.04, vh, len); if (hardBrake) addSkid(p.x + fx * 3.0 + rx * sd * 1.55, p.z + fz * 3.0 + rz * sd * 1.55, surfH(p.s + 3.0, lat + sd * 1.55) + 0.04, vh, len); }
  }
  // 브레이크: 디스크가 달아오르고, 꽉 밟으면 앞이 주저앉으며 바닥에서 불꽃
  p.brakeHeat = clamp((p.brakeHeat || 0) + ((input.brake > 0 && p.vf > 8 ? input.brake * p.vf / 70 : 0) - (p.brakeHeat || 0) * 0.45) * dt, 0, 1);
  const ud = p.mesh.userData, heat = p.brakeHeat;
  ud.wheels.forEach((w, i) => { const hh = clamp(heat * (i < 2 ? 1.25 : 0.8), 0, 1); w.userData.disc.material.color.setRGB(0.16 + hh * 0.84, 0.16 + hh * 0.3, 0.16 - hh * 0.1); });
  if (ud.tail) { const on = input.brake > 0; ud.tail.material.color.setHex(on ? 0xff7070 : 0xff2a2a); ud.tail.scale.set(1, on ? 1.8 : 1, 1); }
  if (hardBrake && p.vf > 45 && p.comp && Math.max(p.comp[0], p.comp[1]) > SUS.TRAVEL * 0.55) for (let k = 0; k < 2; k++) emit(sparks, p.x + fx * 4.3 + rx * (R() - 0.5) * 2.6, p.y + 0.18, p.z + fz * 4.3 + rz * (R() - 0.5) * 2.6, p.vx * 0.6 + (R() - 0.5) * 4, 1 + R() * 3, p.vz * 0.6 + (R() - 0.5) * 4, 0.35);
  // 백파이어: 고속에서 액셀을 떼면 배기구에서 펑
  p.backfireT = Math.max(0, (p.backfireT || 0) - dt);
  if ((p.prevGas || 0) > 0 && input.gas === 0 && p.vf > 35 && state === "race") { p.backfireT = 0.14; sndPop(0.8); for (let k = 1; k < 4; k++) setTimeout(() => { if (R() < 0.7) { sndPop(0.4 + R() * 0.4); player.backfireT = 0.1; } }, 90 * k + R() * 90); }
  if (p.backfireT > 0 && R() < 0.5) for (const sd of [-0.5, 0.5]) emit(sparks, p.x - fx * 4.8 + rx * sd * 1.7, p.y + 0.67, p.z - fz * 4.8 + rz * sd * 1.7, -fx * 8 + (R() - 0.5) * 3, R() * 2, -fz * 8 + (R() - 0.5) * 3, 0.25);
  p.prevGas = input.gas;
  // 고속: 날개 끝·차체 모서리에서 흰 바람 줄기
  const sr = Math.abs(p.vf) / P.top;
  if (sr > 0.65 || p.boostT > 0) { const n = p.boostT > 0 ? 2 : 1; for (let k = 0; k < n; k++) for (const sd of [-1, 1]) emit(streaks, p.x - fx * 4.6 + rx * sd * 1.65, p.y + 1.75 + (R() - 0.5) * 0.3, p.z - fz * 4.6 + rz * sd * 1.65, p.vx * 0.05, 0, p.vz * 0.05, 0.22 + sr * 0.2); }
}
function hitWall(t, sg, rest, mul = 1) {
  const p = CUR, ux = nx(t) * sg, uz = nz(t) * sg, vn = p.vx * ux + p.vz * uz;
  if (vn > 0) {
    p.vx -= ux * vn * (1 + rest); p.vz -= uz * vn * (1 + rest); p.vx *= 0.99; p.vz *= 0.99; fromWorld(); p.ry *= 0.6;
    if (vn > 8) applyDamage(p, dmgWall(vn) * mul, hitLocal(p, ux, uz), null, 'wall');
    if (vn > 24 && !p.dead) { const rr = -vn * 0.14; (window.__tlog && window.__tlog.push("wall")), enterTumble(p, -uz * rr, ux * rr, vn * 0.2); }
    if (p === player) shake = Math.max(shake, Math.min(0.7, vn / 22)); if (vn > 4) sndImpact(vn * 0.9, p.x, p.z);
  }
  if (Math.hypot(p.vf, p.vl) > 10) { p.scrape = 0.12; for (let k = 0; k < 3; k++) emit(sparks, p.x + ux * 1.1, p.y + 0.5, p.z + uz * 1.1, -p.vx * 0.15 + (Math.random() - 0.5) * 6, Math.random() * 6, -p.vz * 0.15 + (Math.random() - 0.5) * 6, 0.35); }
}

