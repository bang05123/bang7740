// ================= 라이벌 =================
function crestAt(t) { // 노면이 위로 볼록한 정도 (클수록 그 속도에서 차가 뜸)
  if (t.crest !== undefined) return t.crest; const i = TRK.indexOf(t), a = TRK[(i - 16 + N) % N], b = TRK[(i + 16) % N], ds = Math.max(1, (b.s - a.s + L) % L / 2);
  return t.crest = Math.max(0, -(a.base - 2 * t.base + b.base) / (ds * ds));
}
function aiCornerV(k, mu) { const den = k - mu * DOWN / MASS; return den <= 1e-5 ? 999 : Math.sqrt(mu * G / den); }
const DEAD_INP = { steer: 0, gas: 0, brake: 0, drift: false, boostPress: false };
function stepAI(dt) {
  for (const a of ais) {
    if (a.net) { netStep(a, dt); continue; } // 멀티: 다른 사람(또는 호스트)이 모는 차는 받은 위치로
    if (a.dead) { stepCar(a, DEAD_INP, dt); a.v = a.vf; a.lane = a.lat; continue; }
    const canGo = (state === "race" || state === "end") && !a.done, gap = a.prog - player.prog;
    a.v = a.vf; a.lane = a.lat;
    // 실력: 엔진·최고속·그립 배율 (뒤처지면 조금씩 따라붙음)
    const catchUp = gap < -120 ? 1 + Math.min(0.13, (-gap - 120) / 2500) : gap > 80 ? 1 - Math.min(0.04, (gap - 80) / 2000) : 1;
    a.topMul = a.skill * P.ai * catchUp * 1.09; a.gripMul = a.skill * P.ai; a.accelMul = (a.mass > 1800 ? 0.93 : 1) * catchUp;
    // 앞을 내다보고 코너 속도와 제동 거리로 목표 속도 계산
    const mu = P.grip * a.gripMul * 1.0;
    // 필살 부스트: 모든 차가 3개 들고 시작, 다 쓰면 끝
    const toFinish = lapsTotal * L - a.prog, finalLap = a.prog >= (lapsTotal - 1) * L;
    if (canGo && a.left > 0 && a.boostT <= 0 && raceT > 6 && (a.prog >= (a.nextOK || 0) || finalLap)) { // 마지막 바퀴엔 간격 제한 없이 // 한 번 쓰면 레이스 거리의 1/4은 지나야 다시 씀
      let longStraight = true; const vB = P.top * a.topMul * P.boostPow * 0.85; for (let d = 0; d <= vB * BOOST_TIME * 0.6; d += 15) { const tq = TRK[idxAtS(a.prog + d)]; if (aiCornerV(tq.k, P.grip * a.gripMul * 0.8 + Math.abs(tq.bank) * 0.9) < vB) { longStraight = false; break; } } // 부스트 속도로 버틸 수 있는 직선에서만
      if (longStraight) {
        const lap = Math.floor(a.prog / L), lapFrac = (a.prog - lap * L) / L, lastLap = lap >= lapsTotal - 1;
        let ahead = null, aheadGap = 1e9;
        const cands = [{ prog: player.prog, lane: player.lat, me: true }, ...ais.filter(o => o !== a).map(o => ({ prog: o.prog, lane: o.lane }))];
        for (const c of cands) { const d = c.prog - a.prog; if (d > 6 && d < aheadGap) { aheadGap = d; ahead = c; } }
        const pBehind = a.prog - player.prog; // 양수면 플레이어가 뒤
        const nearMe = Math.abs(pBehind) < 140;                      // 플레이어 눈앞에서 써야 의미가 있음
        const overtake = ahead && aheadGap < 60 && nearMe && raceT > 14;  // 출발 직후 몸싸움에선 아낌
        const hunt = ahead && ahead.me && aheadGap < 110 && raceT > 10;            // 플레이어가 사정거리 안
        const defend = pBehind > 0 && pBehind < 45 && raceT > 14;                  // 플레이어가 바짝 붙음
        const finalStretch = lastLap && lapFrac > 0.55;
        let want = false;
        if (a.trait === "late") want = hunt || finalStretch || (lap >= 1 && overtake);           // Zero: 플레이어를 보면 바로
        else if (a.trait === "burst") want = overtake || hunt || defend;                          // Duke: 참을성 없음
        else if (a.trait === "block") want = defend || hunt || finalStretch;                      // Hex: 붙으면 지르고 도망
        else if (a.trait === "early") want = overtake || (nearMe && raceT > 14 && Math.random() < 0.01);                   // 쌍둥이: 일찍 질러버림
        else if (a.trait === "clean") want = (lap >= 1 && overtake) || hunt || finalStretch;      // Scarlet
        else want = hunt || defend || (lap >= 1 && overtake) || finalStretch;                     // 들이받는 놈들
        // 아껴두는 놈들: 마지막 바퀴 전까진 1개는 꼭 남겨둠
        if (a.save && a.left <= 1 && (!finalLap || toFinish > 1700)) want = false; // 마지막 1개는 결승 직선용
        // 마지막 직선: 결승까지 남은 거리가 직선이면 남은 걸 다 쏟아부음
        if (finalLap && toFinish < 1700) { let clear = true; for (let d = 0; d < Math.min(toFinish, 1700); d += 25) if (TRK[idxAtS(a.prog + d)].k > 0.0016) { clear = false; break; } if (clear) want = true; }
        if (want) { if (viewD(a.x, a.z) < 600) { boostBurst(a); sndBoost(distVol(a.x, a.z) * 0.9); } else recFx({ k: "bst", c: a }); a.left--; a.used = (a.used || 0) + 1; a.nextOK = a.prog + L * lapsTotal / 4; a.boostT = BOOST_TIME * 0.9; if (Math.abs(a.prog - player.prog) < 160) { setMsg(`${a.name} 필살 부스트!`, 1.3); sndBurst(0.6, 900, 0.35); } }
      }
    }
    const bst = a.boostT > 0, dec = bst ? 17 : 28; // 더 늦게 브레이크 // 부스트 중엔 제동이 덜 먹으니 더 일찍 줄임
    let target = P.top * a.topMul * (bst ? P.boostPow : 1);
    const look = Math.max(40, a.v * a.v / (2 * dec) + 20);
    for (let d = 0; d <= look; d += 6) { const tq = TRK[idxAtS(a.prog + d)]; let vc = aiCornerV(tq.krl ?? tq.k, mu + Math.abs(tq.bank) * 0.45); /* 레이싱 라인으로 달리면 코너가 덜 꺾임 */ const cr = crestAt(tq); if (cr > 0) vc = Math.min(vc, Math.sqrt(G * (tq.k > 0.0006 ? 1.1 : 1.8) / cr)); target = Math.min(target, Math.sqrt(vc * vc + 2 * dec * d)); } // 코너 속 언덕 꼭대기에선 뜨지 않을 만큼만
    { // 바로 앞 같은 줄에 차가 있으면 들이받지 않게: 옆으로 비켜 추월하거나 속도를 맞춤
      let fo = null, fd = 1e9; const reach = 12 + a.v * 0.9;
      for (const o of [player, ...ais]) { if (o === a || o.dead) continue; const dd = o.prog - a.prog; if (dd < 1 || dd > reach) continue; if (Math.abs(o.lat - a.lat) > o.mesh.userData.hwd + a.mesh.userData.hwd + 1) continue; if (dd < fd) { fd = dd; fo = o; } }
      if (fo && fo.vf < a.v + 2) { const gapNeed = (fo.mesh.userData.hl + a.mesh.userData.hl) + 2; target = Math.min(target, fo.vf + Math.max(0, fd - gapNeed) * 0.6); a.passSide = a.passSide || (fo.lat > a.lat ? -1 : 1); a.followT = 0.5; }
      else if ((a.followT = (a.followT || 0) - dt) <= 0) a.passSide = 0;
    }
    a.tgt = target;
    // 라인과 성격 (출발 전엔 그리드에 고정)
    const onGrid = state !== "race" && state !== "end";
    if (!onGrid) a.laneTimer -= dt;
    if (a.laneTimer <= 0) { { const WR = 3.5; a.wander = clamp((a.wander || 0) + (Math.random() - 0.5) * WR, -WR, WR) * (a.trait === "clean" ? 0.5 : 1); } a.laneTimer = 3 + Math.random() * 4; } // 라인에서 조금씩만 흔들림
    { const la = a.prog + 12 + Math.abs(a.vf) * 0.32, rl = TRK[idxAtS(la)].rl || 0; a.laneT = rl + (a.wander || 0); } // 기본은 레이싱 라인을 따라감 (아래 몸싸움·추월·회피가 덮어씀)
    const pd = player.prog - a.prog, plat = player.lat;
    const side = Math.abs(pd) < 12 && Math.abs(plat - a.lane) < 9;
    const brave = (a.hp ?? 100) > 35 && raceT > 8; // 많이 망가지면 몸싸움 피함, 출발 직후엔 안 비빔
    if (brave && (a.trait === "ram" || a.trait === "block") && Math.abs(pd) < 20 && Math.abs(plat - a.lane) < 14) a.laneT = plat;                     // 들이받기
    else if (side && brave && a.trait !== "early" && (a.trait !== "clean" || a.boostT > 0)) a.laneT = plat + Math.sign(plat - a.lane) * 1.5; // 옆에 오면 몸으로 밀어붙임
    else if (a.trait === "block" && pd < 0 && pd > -40) a.laneT = plat;
    else if (pd > 0 && pd < 18 && Math.abs(plat - a.lane) < 3.5) a.laneT = plat > 0 ? plat - 7 : plat + 7;
    { // 앞에 멈춘 잔해차나 크게 느린 차가 있으면 피해서 지나감
      const look = 40 + a.v * 1.6; let ob = null, obD = 1e9;
      for (const o of [player, ...ais]) { if (o === a) continue; const dd = o.prog - a.prog; if (dd < 2 || dd > look) continue; if (!(o.dead || Math.abs(o.vf) < a.v * 0.5)) continue; const ol = o.lat; if (Math.abs(ol - a.laneT) < o.mesh.userData.hwd + a.mesh.userData.hwd + 2.5 && dd < obD) { obD = dd; ob = o; } }
      if (ob) { const need = ob.mesh.userData.hwd + a.mesh.userData.hwd + 3, HWo = hwAt(ob.prog) - 2.5, L_ = ob.lat - need, R_ = ob.lat + need; a.laneT = (Math.abs(L_) <= HWo && (Math.abs(R_) > HWo || Math.abs(L_ - a.lat) < Math.abs(R_ - a.lat))) ? L_ : R_; a.avoidT = 0.6; }
    }
    if (a.passSide && !(a.trait === "ram" && Math.abs(player.prog - a.prog) < 14)) { const fo = [player, ...ais].filter(o => o !== a && !o.dead && o.prog > a.prog && o.prog - a.prog < 40).sort((p_, q_) => p_.prog - q_.prog)[0]; if (fo) { const need = fo.mesh.userData.hwd + a.mesh.userData.hwd + 2.5, H_ = hwAt(a.prog) - 2.5; let t_ = fo.lat + a.passSide * need; if (Math.abs(t_) > H_) { a.passSide = -a.passSide; t_ = fo.lat + a.passSide * need; } a.laneT = t_; } }
    const HWa = hwAt(a.prog); a.laneT = clamp(a.laneT, -(HWa - 4), HWa - 4);
    if (onGrid) { a.laneT = a.lane; }
    // 운전: 앞쪽 목표 지점을 향해 핸들, 목표 속도에 맞춰 액셀·브레이크
    const v = Math.abs(a.vf), tp = posAt(a.prog + 12 + v * 0.32, a.laneT);
    let dh = Math.atan2(tp.x - a.x, tp.z - a.z) - a.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    const inp = a.inp || (a.inp = { steer: 0, gas: 0, brake: 0, drift: false, boostPress: false });
    inp.steer = a.contact > 0 ? -clamp(dh * 2.6 - a.ry * 0.35, -1, 1) : 0;
    target *= clamp(1 - Math.abs(dh) * 1.4, 0.25, 1); // 방향이 많이 틀어졌으면 속도부터 줄임
    if (!canGo) { inp.gas = 0; inp.brake = a.done ? 0.15 : 0; }
    else { inp.gas = a.vf < target - 1 ? 1 : 0; inp.brake = a.vf > target + 2 ? clamp((a.vf - target) / 6, 0, 1) : 0; }
    stepCar(a, inp, dt);
    a.v = a.vf; a.lane = a.lat;
    // 멈추거나 거꾸로 서면 코스로 복귀
    const td = TRK[a.idx], fwd = Math.sin(a.h) * td.tx + Math.cos(a.h) * td.tz;
    a.stuckT = canGo && (Math.abs(a.vf) < 4 || fwd < -0.2 || Math.abs(a.lat) > td.hw + 25) && raceT > 5 ? (a.stuckT || 0) + dt : 0;
    if (a.stuckT > 2.5) resetCar(a);
  }
  function boxCenter(x, z, h, b) { const s_ = Math.sin(h), c_ = Math.cos(h); return [x + s_ * b[1] + c_ * b[0], z + c_ * b[1] - s_ * b[0]]; }
  function obbHit(ax, az, ah, al, aw, bx, bz, bh, bl, bw) { // 두 차의 직사각형이 겹치면 [밀어낼 방향 x, z, 깊이] (b→a 방향)
    const dx = ax - bx, dz = az - bz; if (dx * dx + dz * dz > (al + bl + aw + bw) ** 2) return null;
    const axes = [[Math.sin(ah), Math.cos(ah)], [Math.cos(ah), -Math.sin(ah)], [Math.sin(bh), Math.cos(bh)], [Math.cos(bh), -Math.sin(bh)]];
    const af = axes[0], ar = axes[1], bf = axes[2], br = axes[3]; let best = 1e9, bn = null;
    for (const [nx_, nz_] of axes) {
      const ra = al * Math.abs(af[0] * nx_ + af[1] * nz_) + aw * Math.abs(ar[0] * nx_ + ar[1] * nz_), rb = bl * Math.abs(bf[0] * nx_ + bf[1] * nz_) + bw * Math.abs(br[0] * nx_ + br[1] * nz_);
      const dist = dx * nx_ + dz * nz_, ov = ra + rb - Math.abs(dist); if (ov <= 0) return null;
      if (ov < best) { best = ov; bn = dist >= 0 ? [nx_, nz_] : [-nx_, -nz_]; }
    }
    return [bn[0], bn[1], best];
  }
  // 모든 차끼리 충돌: 맞은 자리에 따라 밀리고 돌아감
  const cars = [player, ...ais];
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) collidePair(cars[i], cars[j]);
  function collidePair(A, B) {
    if (window.__bgpGhost || Math.abs(A.y - B.y) > 2.5) return;
    if ((A.x - B.x) ** 2 + (A.z - B.z) ** 2 > (A.mesh.userData.hl + B.mesh.userData.hl + 6) ** 2) return;
    let hit = null, cp = null;
    for (const P_ of A.mesh.userData.boxes) for (const B_ of B.mesh.userData.boxes) {
      const [ax, az] = boxCenter(A.x, A.z, A.h, P_), [bx, bz] = boxCenter(B.x, B.z, B.h, B_);
      const h_ = obbHit(ax, az, A.h, P_[2], P_[3], bx, bz, B.h, B_[2], B_[3]);
      if (h_ && (!hit || h_[2] > hit[2])) { hit = h_; cp = [(ax + bx) / 2, (az + bz) / 2]; }
    }
    if (!hit) return;
    const [nxh, nzh, depth] = hit, isA = A === player, isB = B === player;
    const mOf = o => (o === player ? MASS : o.mass) * (o.boostT > 0 ? (o === player ? 5 : 3) : 1) * (o.dead ? 0.5 : 1); // 잔해는 가벼워서 잘 밀림
    const mA = mOf(A), mB = mOf(B), iOf = (o, m) => m * ((2 * o.mesh.userData.hl) ** 2 + (2 * o.mesh.userData.hwd) ** 2) / 12 * 0.55;
    const IA = iOf(A, mA), IB = iOf(B, mB), wA = 1 / mA, wB = 1 / mB;
    A.x += nxh * depth * wA / (wA + wB); A.z += nzh * depth * wA / (wA + wB); B.x -= nxh * depth * wB / (wA + wB); B.z -= nzh * depth * wB / (wA + wB);
    const rA = [cp[0] - A.x, cp[1] - A.z], rB = [cp[0] - B.x, cp[1] - B.z];
    const kx = (r, jx, jz) => r[1] * jx - r[0] * jz; // 충격이 회전에 주는 영향 (회전 속도 ry 기준)
    const vAx = A.vx + A.ry * rA[1], vAz = A.vz - A.ry * rA[0], vBx = B.vx + B.ry * rB[1], vBz = B.vz - B.ry * rB[0];
    const rvx = vAx - vBx, rvz = vAz - vBz, vn = rvx * nxh + rvz * nzh;
    if (vn >= 0) return;
    const kA = kx(rA, nxh, nzh), kB = kx(rB, nxh, nzh);
    const jn = -1.2 * vn / (wA + wB + kA * kA / IA + kB * kB / IB);
    // 옆으로 긁히는 마찰 (같이 끌려가며 돌게 만듦)
    let tx = rvx - vn * nxh, tz = rvz - vn * nzh; const tl = Math.hypot(tx, tz); let jt = 0;
    if (tl > 0.01) { tx /= tl; tz /= tl; const kAt = kx(rA, tx, tz), kBt = kx(rB, tx, tz); jt = clamp(-tl / (wA + wB + kAt * kAt / IA + kBt * kBt / IB), -0.35 * jn, 0.35 * jn); }
    const Jx = nxh * jn + tx * jt, Jz = nzh * jn + tz * jt;
    const yk = clamp(-vn / 14, 0.2, 1) * 0.6, ycap = -vn > 10 ? 2.5 : 1.0; /* 살짝 스친 걸로 차가 훅 돌지 않게: 약하게 닿으면 회전은 조금만, 세게 박아야 크게 돎 */
    A.kSrc = B.kSrc = "car"; A.kSrcT = B.kSrcT = raceT; A.vx += Jx * wA; A.vz += Jz * wA; A.ry = clamp(A.ry + clamp(kx(rA, Jx, Jz) / IA * yk, -ycap, ycap), -4, 4);
    B.vx -= Jx * wB; B.vz -= Jz * wB; B.ry = clamp(B.ry - clamp(kx(rB, Jx, Jz) / IB * yk, -ycap, ycap), -4, 4);
    fromWorld(A); fromWorld(B);
    const hard = -vn; if (hard > 3) { A.hitT = B.hitT = 0.8; A.kickT = B.kickT = 1.2; }
    for (const [Q, sg, w_] of [[A, 1, wA], [B, -1, wB]]) { // 옆구리를 세게 맞으면 바퀴가 걸려 넘어감
      if (Q.tumble) { Q.tv.x += sg * Jx * w_ * 0; continue; }
      const rx_ = Math.cos(Q.h), rz_ = -Math.sin(Q.h), latDv = sg * (Jx * rx_ + Jz * rz_) * w_, fwdDv = sg * (Jx * Math.sin(Q.h) + Jz * Math.cos(Q.h)) * w_;
      if (Math.abs(latDv) > 18 || (Q.dead && Math.abs(latDv) > 8)) { const rr = -latDv * (0.32 + Math.random() * 0.12); (window.__tlog && window.__tlog.push("carlat")), enterTumble(Q, Math.sin(Q.h) * rr, Math.cos(Q.h) * rr, Math.min(9, Math.abs(latDv) * 0.25)); }
      else if (Math.abs(fwdDv) > 28) { const pr = -fwdDv * 0.18; (window.__tlog && window.__tlog.push("carfwd")), enterTumble(Q, rx_ * pr, rz_ * pr, Math.min(8, Math.abs(fwdDv) * 0.2)); }
    }
    { const JL = Math.hypot(Jx, Jz), kA = B.dead ? 0.45 : 1, kB = A.dead ? 0.45 : 1; applyDamage(A, kA * dmgFromDv(JL * wA), hitLocal(A, -nxh, -nzh), B, B.dead ? 'wreckcar' : 'car'); applyDamage(B, kB * dmgFromDv(JL * wB), hitLocal(B, nxh, nzh), A, A.dead ? 'wreckcar' : 'car'); }
    if (isA || isB) {
      shake = Math.max(shake, Math.min(1, hard / 12));
      const me = isA ? A : B, other = isA ? B : A;
      if (me.boostT > 0 && hard > 4 && !other.hitMsg) { setMsg(`${other.name} 날려버림!`, 1.2); other.hitMsg = 1; setTimeout(() => other.hitMsg = 0, 1500); sndImpact(30, other.x, other.z); for (let k = 0; k < 30; k++) emit(sparks, other.x, other.y + 1, other.z, (Math.random() - 0.5) * 20, Math.random() * 10, (Math.random() - 0.5) * 20, 0.6); }
    }
    if (hard > 1.5) sndImpact(hard, cp[0], cp[1]);
    if ((isA || isB || viewD(cp[0], cp[1]) < 250) && hard > 2) for (let k = 0; k < Math.min(18, hard * 1.5); k++) emit(sparks, cp[0], (A.y + B.y) / 2 + 0.8, cp[1], (Math.random() - 0.5) * 10 + (A.vx + B.vx) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 10 + (A.vz + B.vz) * 0.4, 0.4);
  }
}
function aiFx(p, lat, fx, fz, rx, rz, spd) { // 라이벌: 미끄러지면 연기, 흙에선 먼지 (가까이 있을 때만)
  if (p.contact <= 0 || viewD(p.x, p.z) > 300 || (p.tick = (p.tick || 0) + 1) % 3) return;
  const onDirt = Math.abs(lat) > hwAt(p.s) + 0.8, back = p.mesh.userData.hl * 0.7;
  if (onDirt && spd > 8) emit(dust, p.x - fx * back, p.y + 0.6, p.z - fz * back, -p.vx * 0.12 + (Math.random() - 0.5) * 4, 2 + Math.random() * 3, -p.vz * 0.12 + (Math.random() - 0.5) * 4, 1.4);
  else if (p.slipR > 0.12 && spd > 12) emit(smoke, p.x - fx * back, p.y + 0.4, p.z - fz * back, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, 1.1);
}


