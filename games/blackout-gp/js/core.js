(() => {
"use strict";
// ================= 조절 값 =================
const DEFAULTS = { top: 140, accel: 34, grip: 2.2, steer: 1.0, boostPow: 1.6, charges: 3, ai: 1.0 };
const LABELS = { top: ["최고속도 (m/s)", 70, 200, 1], accel: ["엔진 힘", 10, 45, 0.5], grip: ["타이어 그립", 1.0, 3.5, 0.05],
  steer: ["조향 세기", 0.5, 1.8, 0.05], boostPow: ["필살 부스트 힘 (배수)", 1.2, 2.2, 0.05], charges: ["필살 부스트 횟수 (업그레이드 체험)", 1, 3, 1], ai: ["상대 실력", 0.7, 1.3, 0.01] };
let P = { ...DEFAULTS };
// 수치 조절 패널은 뺐음: 항상 기본값으로 달림
const saveTune = () => { try { localStorage.setItem("bgp_tune6", JSON.stringify(P)); } catch (e) {} };
// 차 물리 상수 (무게·축거·무게중심)
const MASS = 1350, IZ = 2400, A_ = 1.3, B_ = 1.5, WB = A_ + B_, HCG = 0.5, CNF = 10, CNR = 14, DOWN = 1.0, G = 9.8, GRAV = 30;
const WEAPONS = {
  missile: { name: "유도 미사일", ammo: 4, desc: "앞차를 쫓아가 폭발" },
  harpoon: { name: "작살", ammo: 4, desc: "꽂아서 끌어당기고 휘두름" },
  rail: { name: "대구경 포", ammo: 3, desc: "장전했다 쏘는 관통 철갑탄" },
  pile: { name: "파일벙커", ammo: 5, desc: "앞차에 대고 쇠말뚝으로 쾅" }
};
const RIVAL_WPN = { "Zero": "rail", "Duke": "missile", "Scarlet": "missile", "Hex": "harpoon", "Lyle & Lena": "missile", "Bones & Jinx": "harpoon", "Gunnar & Big Mo": "pile" };
let mySpecial = "missile"; try { mySpecial = localStorage.getItem("bgp_special") || "missile"; if (mySpecial === "shock" || mySpecial === "mine") mySpecial = "pile"; if (!WEAPONS[mySpecial]) mySpecial = "missile"; } catch (e) {}
const PROJ = [], TETHERS = [], BEAMS = [], WRINGS = [];
const WS = 2.2; // 월드 크기 배율 (코스·풍경 전체)
const CS = 1.4; // 차 크기 배율 (넓은 맵에 맞게 차를 키움)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ================= 코스 정의 =================
const COURSES = {
  desert: {
    name: "더스트 하이웨이", sub: "아무도 안 쓰는 황야 고속도로",
    ctrl: [[0, 0], [420, 0], [585, -43], [679, -136], [711, -258], [779, -384], [802, -516], [710, -617], [573, -625], [460, -583], [332, -611], [192, -685], [40, -731], [-98, -783], [-240, -775], [-366, -715], [-492, -667], [-573, -558], [-583, -424], [-621, -296], [-605, -164], [-512, -55], [-380, 0], [-200, 0]],
    roadW: 36, ramp: { s0: 190 * WS, s1: 190 * WS + 70, h: 8 },
    hills: [[0.25, 420, 20], [0.531, 115, 10], [0.638, 260, 13], [0.77, 450, 18], [0.909, 125, 11]],
    bankK: 40, maxBank: 0.3, barrier: 0, bound: 210, shoulder: 4, fall: 70,
    rough: [], // 울퉁불퉁 구간 없음
    sky: [0x0b1d4e, 0x3a74c4, 0xf1dcb0], fog: [0xeccb98, 600, 6000], ground: 0xd9a066,
    sun: [0xfff1d6, 1.25, [-0.6, 1, 0.3]], amb: 0.12
  },
  circuit: {
    name: "메가 서킷", sub: "거대 구조물 사이의 야간 서킷",
    ctrl: [[0, 0], [620, 0], [785, 45], [873, 146], [887, 276], [930, 408], [881, 547], [744, 623], [602, 621], [466, 641], [331, 605], [222, 517], [98, 466], [-36, 448], [-154, 520], [-265, 609], [-414, 641], [-560, 619], [-702, 617], [-835, 549], [-895, 424], [-881, 298], [-891, 174], [-850, 70], [-760, 0], [-560, 0]],
    roadW: 36, ramp: null,
    hills: [[0.375, 100, 9], [0.632, 320, 20]],
    bankK: 120, maxBank: 0.55, barrier: 20, bound: 0, shoulder: 21, fall: 60,
    rough: [], // 울퉁불퉁 구간 없음
    sky: [0x050818, 0x1a1450, 0x7a2a8a], fog: [0x141038, 800, 6000], ground: 0x16301f,
    sun: [0x9fb8ff, 0.9, [0.4, 1, -0.5]], amb: 0.2
  },
  dam: {
    name: "레드워터 댐", sub: "마을을 통째로 막고 달리는 축제 레이스",
    scale: 1.85, ctrl: [[0, 0],[700, 0],[1200, -150],[1350, -500],[1150, -800],[700, -900],[200, -880],[-150, -850],[-450, -960],[-720, -830],[-900, -815],[-1080, -815],[-1320, -840],[-1650, -880],[-2300, -960],[-2800, -880],[-3300, -980],[-3800, -1120],[-4300, -1250],[-4700, -1100],[-4850, -750],[-4700, -400],[-4300, -150],[-4000, 150],[-4150, 500],[-3900, 850],[-4100, 1200],[-3800, 1550],[-3200, 1800],[-2400, 1850],[-1600, 1650],[-1050, 1150],[-950, 550],[-800, 150],[-560, 0],[-380, 0]],
    heights: [42,42,40,33,21,9,3,0,0,9,51,78,51,30,24,36,18,33,42,42,33,21,12,9,27,12,30,15,12,9,6,4,4,8,15,40], damCrestIdx: 11, // 오 루즈로 댐을 타고 올라 넘어서 내려감
    roadW: 36, ramp: null, hills: [],
    bankK: 70, maxBank: 0.35, barrier: 0, bound: 200, shoulder: 60, fall: 400,
    rough: [], // 울퉁불퉁 구간 없음
    sky: [0x0e2458, 0x3f86d8, 0xe6f0f2], fog: [0xcfe2ee, 900, 8000], ground: 0x5f8f4a,
    sun: [0xfff4dc, 1.3, [-0.5, 1, 0.4]], amb: 0.16
  }
};
let CTRL_S = null, GAP = null; // [시작 s, 끝 s, 시작 높이, 끝 높이]: 길이 끊긴 점프 구간
let C = null, courseId = "desert";
try { courseId = localStorage.getItem("bgp_course") || "desert"; if (!COURSES[courseId]) courseId = "desert"; } catch (e) {}
let TRK = [], N = 0, L = 0, HALF = 15, RAMP = null;

function buildTrack(c) {
  const curve = new THREE.CatmullRomCurve3(c.ctrl.map(p => new THREE.Vector3(p[0] * (c.scale || WS), 0, p[1] * (c.scale || WS))), true, "centripetal");
  N = Math.round(curve.getLength() / 1.25);
  const pts = curve.getSpacedPoints(N); pts.pop();
  TRK = []; L = 0;
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[(i + 1) % N], tx = b.x - a.x, tz = b.z - a.z, len = Math.hypot(tx, tz);
    TRK.push({ x: a.x, z: a.z, tx: tx / len, tz: tz / len, s: L, len }); L += len;
  }
  for (let i = 0; i < N; i++) {
    const p = TRK[(i - 8 + N) % N], q = TRK[(i + 8) % N];
    let d = Math.atan2(q.tx, q.tz) - Math.atan2(p.tx, p.tz);
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    TRK[i].kc = d / (TRK[i].len * 16); TRK[i].k = Math.abs(TRK[i].kc);
  }
  // 코너 안쪽 지형이 도로 위로 접히지 않도록 주변 최대 곡률을 기록
  for (let i = 0; i < N; i++) { let mx = 0, sk = 0; for (let o = -60; o <= 60; o += 3) { const q = TRK[(i + o + N) % N]; mx = Math.max(mx, q.k); sk += q.kc; } TRK[i].kmx = mx; TRK[i].kside = Math.sign(sk); }
  const raw = TRK.map(t => clamp(c.bankK * t.kc, -c.maxBank, c.maxBank));
  const W = 55;
  for (let i = 0; i < N; i++) { let sum = 0; for (let o = -W; o <= W; o++) sum += raw[(i + o + N) % N]; TRK[i].bank = sum / (2 * W + 1); }
  HALF = c.roadW / 2; RAMP = c.ramp;
  for (const t of TRK) { const w = sstep(150, 350, t.s) * (1 - sstep(L - 380, L - 200, t.s)); t.hw = HALF * (1 + 0.5 * w); } // 출발 그리드 근처만 원래 폭, 나머지는 1.5배
  for (const t of TRK) {
    let h = 0;
    for (const [f, w, hh] of c.hills) { let d = t.s - f * L; if (d > L / 2) d -= L; if (d < -L / 2) d += L; if (Math.abs(d) < w) h += hh * 0.5 * (1 + Math.cos(Math.PI * d / w)); }
    t.base = h;
    t.ramp = RAMP && t.s > RAMP.s0 && t.s < RAMP.s1 ? RAMP.h * (t.s - RAMP.s0) / (RAMP.s1 - RAMP.s0) : 0;
    t.rough = 0; for (const [a0, a1, amp] of (c.rough || [])) { const f = t.s / L; if (f > a0 && f < a1) t.rough = Math.max(t.rough, amp * sstep(a0, a0 + 0.006, f) * (1 - sstep(a1 - 0.006, a1, f))); }
  }
  GAP = null;
  if (c.heights) { // 제어점마다 높이를 정하고 사이를 부드럽게 이음
    const sc = c.scale || WS, cs = c.ctrl.map(([x, z]) => { let bi = 0, bd = 1e18; for (let i = 0; i < N; i += 2) { const d = (TRK[i].x - x * sc) ** 2 + (TRK[i].z - z * sc) ** 2; if (d < bd) { bd = d; bi = i; } } return TRK[bi].s; });
    cs[0] = 0; const M = cs.length; CTRL_S = cs;
    for (const t of TRK) {
      let k = M - 1; for (let j = 0; j < M; j++) if (cs[j] <= t.s) k = j;
      const a = cs[k], b = k + 1 < M ? cs[k + 1] : L, u = (t.s - a) / Math.max(1, b - a), w = (1 - Math.cos(Math.PI * u)) / 2;
      t.base = c.heights[k] * (1 - w) + c.heights[(k + 1) % M] * w;
    }
    if (c.damIdx !== undefined) { // 댐 꼭대기 너머: 길이 끊기고, 아래쪽 내리막에 착지
      const sTop = cs[c.damIdx], g0 = sTop + 2, g1 = sTop + c.gapLen, topH = c.heights[c.damIdx];
      for (const t of TRK) {
        const d = t.s - g1;
        if (t.s > g0 && t.s <= g1) t.base = topH;
        else if (d > 0 && d < 750) t.base = (22 - 9 * d / 750) * (1 - sstep(520, 750, d)) + t.base * sstep(520, 750, d);
      }
      GAP = [g0, g1, topH, 22];
    }
  }
}
const nx = t => -t.tz, nz = t => t.tx;
// 기준 폭(HALF)으로 적힌 옆 위치를 그 지점의 실제 폭에 맞게 바꿈: 도로 안은 비례, 바깥은 늘어난 만큼 밀어냄
function mapLat(t, lat) { const a = Math.abs(lat); return a <= HALF ? lat * t.hw / HALF : Math.sign(lat) * (a - HALF + t.hw); }
function hwAt(s) { return TRK[idxAtS(s)].hw; }
const idxAtS = s => { // 샘플 간격이 아주 조금씩 달라서, 추정 위치에서 실제 구간으로 보정
  s = ((s % L) + L) % L; let i = Math.min(N - 1, Math.floor(s / L * N));
  while (i > 0 && TRK[i].s > s) i--;
  while (i < N - 1 && TRK[i + 1].s <= s) i++;
  return i;
};
function surfH(s, lat, noRamp, ai) {
  s = ((s % L) + L) % L;
  if (GAP && s > GAP[0] && s < GAP[1]) { if (!ai) return -30; const u = (s - GAP[0]) / (GAP[1] - GAP[0]); return GAP[2] + (GAP[3] - GAP[2]) * u; } // 라이벌은 보이지 않는 선을 따라 날아감
  const i = idxAtS(s), t = TRK[i], t2 = TRK[(i + 1) % N], f = clamp((s - t.s) / t.len, 0, 1);
  const base = t.base + (t2.base - t.base) * f, bank = t.bank + (t2.bank - t.bank) * f, HW = t.hw + (t2.hw - t.hw) * f;
  const rg = t.rough + (t2.rough - t.rough) * f, rough = rg > 0 ? rg * (0.5 * Math.sin(s * 0.21) + 0.3 * Math.sin(s * 0.13 + lat * 0.35) + 0.2 * Math.sin(s * 0.33 + lat * 0.8) + 1) : 0; // 긴 파도 같은 둔덕 (위로만)
  const h = base + clamp(lat, -HW, HW) * bank + HW * Math.abs(bank) + rough; // 뱅크는 안쪽 가장자리를 기준으로 바깥만 들어올림 (땅 밑으로 안 꺼지게)
  if (Math.abs(lat) <= HW) return h + (noRamp ? 0 : (t2.ramp > 0 || t.ramp > 0 ? t.ramp + (Math.max(t2.ramp, 0) - t.ramp) * f * (t2.ramp > 0 ? 1 : 0) : 0));
  const out = Math.abs(lat) - HW;
  return h * (1 - sstep(C.shoulder, C.shoulder + C.fall, out));
}
function posAt(s, lane) { // 샘플 사이를 보간해서 매끄럽게 (안 하면 1.25m 단위로 뚝뚝 끊겨 움직임)
  s = ((s % L) + L) % L;
  const i = idxAtS(s), t = TRK[i], t2 = TRK[(i + 1) % N], f = clamp((s - t.s) / t.len, 0, 1);
  const tx = t.tx + (t2.tx - t.tx) * f, tz = t.tz + (t2.tz - t.tz) * f, n = Math.hypot(tx, tz) || 1, ux = tx / n, uz = tz / n;
  const cx = t.x + (t2.x - t.x) * f, cz = t.z + (t2.z - t.z) * f;
  return { x: cx - uz * lane, z: cz + ux * lane, h: Math.atan2(ux, uz), y: surfH(s, lane, false, true) };
}
function nearest(x, z, guess) { let best = guess, bd = 1e18; for (let o = -90; o <= 90; o++) { const i = (guess + o + N) % N, t = TRK[i], d = (x - t.x) ** 2 + (z - t.z) ** 2; if (d < bd) { bd = d; best = i; } } return best; }
function fullNearest(x, z) { let best = 0, bd = 1e18; for (let i = 0; i < N; i += 2) { const t = TRK[i], d = (x - t.x) ** 2 + (z - t.z) ** 2; if (d < bd) { bd = d; best = i; } } return best; }
function trackDist(x, z) { let bd = 1e18; for (let i = 0; i < N; i += 8) { const t = TRK[i], d = (x - t.x) ** 2 + (z - t.z) ** 2; if (d < bd) bd = d; } return Math.sqrt(bd); }

