// ================= 소리 =================
// 녹음 파일 없이 전부 실시간 합성: 속도·회전수·충돌 세기에 맞춰 바뀜
const SND = { ctx: null, on: true, gear: 0, shiftT: 0, voices: 0, rv: [] };
function audioInit() {
  if (SND.ctx) { if (SND.ctx.state === "suspended") SND.ctx.resume(); return; }
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); SND.ctx = ctx;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(ctx.destination);
    const master = ctx.createGain(); master.gain.value = SND.on ? SET.vol / 100 : 0; master.connect(comp); SND.master = master;
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; SND.noise = nb;
    // V8 느낌 파형: 홀수·짝수 배음을 고르지 않게 섞어 울퉁불퉁한 소리
    const H = 24, re = new Float32Array(H), im = new Float32Array(H); for (let k = 1; k < H; k++) im[k] = (k <= 4 ? [0, 1, 1.15, 0.7, 0.85][k] : (k % 2 ? 0.95 : 0.5) / Math.pow(k, 1.0)); // 묵직함은 살리고 회전음이 들리게
    SND.v8 = ctx.createPeriodicWave(re, im);
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 2.3) * 0.9 + 0.1 * Math.tanh(x * 6); } SND.curve = curve;
    SND.eng = makeEngine(1, master);                     // 내 차
    for (let k = 0; k < 3; k++) SND.rv.push(makeEngine(0, master, true)); // 가까운 라이벌 3대
    const loop = (type, freq, q, out = master) => { const s_ = ctx.createBufferSource(); s_.buffer = nb; s_.loop = true; s_.loopStart = Math.random(); const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s_.connect(f); f.connect(g); g.connect(out); s_.start(0, Math.random() * 1.5); return { g, f }; };
    SND.scrape = loop("bandpass", 2900, 3); SND.scrape2 = loop("bandpass", 5200, 6); SND.squeal = loop("bandpass", 1750, 9); SND.wind = loop("lowpass", 420, 0.7); SND.rush = loop("highpass", 2400, 0.5);
    SND.gravel = loop("bandpass", 260, 0.9); SND.boostRoar = loop("lowpass", 900, 0.8); SND.boostRumble = loop("bandpass", 120, 1.2); SND.fire = loop("bandpass", 1400, 1.5);
    { const o = ctx.createOscillator(); o.type = "sine"; const g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(master); o.start(); SND.jet = { o, g }; } // 부스트 제트 휘파람
    sfxLoad();
  } catch (e) { SND.ctx = null; }
}
// ---- 녹음된 효과음 (OpenGameArt 무료 소리, sfx 폴더) — 못 불러오면 합성음으로
const SFX = { buf: {}, ready: false, loops: {} };
const SFX_LIST = ["hit1", "hit2", "hit3", "hit4", "hit5", "hit6", "hit7", "hit8", "gun1", "gun2", "crash1", "crash2", "crash3", "clank1", "clank2", "clank3", "clank4", "wood1", "wood2", "glass1", "boom", "boom2", "squeal", "wind", "crowd", "ooh"];
function sfxLoad() {
  if (SFX.loading || !SND.ctx) return; SFX.loading = true; let n = 0;
  for (const k of SFX_LIST) fetch("sfx/" + k + ".ogg").then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(a => new Promise((res, rej) => SND.ctx.decodeAudioData(a, res, rej))).then(b => { SFX.buf[k] = b; if (++n >= 6) SFX.ready = true; if (k === "squeal" || k === "wind" || k === "crowd") sfxLoop(k); }).catch(() => {});
}
function sfxLoop(k) { const ctx = SND.ctx, s_ = ctx.createBufferSource(); s_.buffer = SFX.buf[k]; s_.loop = true; const g = ctx.createGain(); g.gain.value = 0; s_.connect(g); g.connect(SND.master); s_.start(0, Math.random() * SFX.buf[k].duration); SFX.loops[k] = { s: s_, g }; }
function sfx(k, vol, rate = 1, delay = 0) { // 한 번 재생
  const b = SFX.buf[k]; if (!b || !SND.ctx || vol < 0.02 || SND.voices > 30) return false; const ctx = SND.ctx, s_ = ctx.createBufferSource(), g = ctx.createGain(); s_.buffer = b; s_.playbackRate.value = rate; g.gain.value = Math.min(1.6, vol);
  s_.connect(g); g.connect(SND.master); SND.voices++; s_.onended = () => SND.voices--; s_.start(ctx.currentTime + delay); return true;
}
const pick = (base, n) => base + (1 + Math.floor(Math.random() * n));
function makeEngine(vol, out, spatial) { // 굵은 V8: 낮은 기본음 + 한 옥타브 아래 + 살짝 어긋난 겹음 + 크로스플레인 울렁임
  const ctx = SND.ctx, o1 = ctx.createOscillator(), o1b = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator(), whine = ctx.createOscillator();
  o1.setPeriodicWave(SND.v8); o1b.setPeriodicWave(SND.v8); o2.setPeriodicWave(SND.v8); o3.type = "sawtooth"; whine.type = "triangle";
  const lope = ctx.createOscillator(), lopeG = ctx.createGain(); lope.type = "sine"; lopeG.gain.value = 0.3;
  const am = ctx.createGain(); am.gain.value = 0.7; lope.connect(lopeG); lopeG.connect(am.gain);
  const g1 = ctx.createGain(), g1b = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain(), gw = ctx.createGain(); g1.gain.value = 0.5; g1b.gain.value = 0.3; g2.gain.value = 0.45; g3.gain.value = 0.13; gw.gain.value = 0;
  o1.connect(g1); o1b.connect(g1b); o2.connect(g2); o3.connect(g3); whine.connect(gw);
  const sh = ctx.createWaveShaper(); sh.curve = SND.curve; sh.oversample = "2x"; const drive = ctx.createGain(); drive.gain.value = 1;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 1.4; lp.frequency.value = 600;
  const body = ctx.createBiquadFilter(); body.type = "peaking"; body.frequency.value = 130; body.gain.value = 6; body.Q.value = 0.9;
  const low = ctx.createBiquadFilter(); low.type = "peaking"; low.frequency.value = 380; low.gain.value = 5; low.Q.value = 0.8; // 폰 스피커에서도 들리는 으르렁 대역
  const outG = ctx.createGain(); outG.gain.value = 0;
  [g1, g1b, g2, g3].forEach(g => g.connect(am)); am.connect(drive); drive.connect(sh); sh.connect(lp); lp.connect(body); body.connect(low); low.connect(outG); gw.connect(outG);
  let pan = null; if (spatial && ctx.createStereoPanner) { pan = ctx.createStereoPanner(); outG.connect(pan); pan.connect(out); } else outG.connect(out);
  [o1, o1b, o2, o3, whine, lope].forEach(o => o.start());
  return { o1, outG, pan, vol, set(f, load, gain, panV, tc = 0.04) {
    const t = ctx.currentTime; o1.frequency.setTargetAtTime(f, t, tc); o1b.frequency.setTargetAtTime(f * 1.012, t, tc); o2.frequency.setTargetAtTime(f * 0.5, t, tc); o3.frequency.setTargetAtTime(f * 2.01, t, tc); whine.frequency.setTargetAtTime(f * 8.5, t, tc);
    lope.frequency.setTargetAtTime(f * 0.25, t, tc); lopeG.gain.setTargetAtTime(0.04 + 0.32 * Math.max(0, 1 - (f - 34) / 30), t, 0.1); // 공회전일 때만 울렁, 밟으면 매끈하게
    lp.frequency.setTargetAtTime(260 + f * 10 + load * 1700, t, tc); drive.gain.setTargetAtTime(0.9 + load * 2.4, t, tc);
    gw.gain.setTargetAtTime(Math.min(0.03, Math.max(0, f - 60) / 4000) * (0.4 + load) * gain, t, tc); outG.gain.setTargetAtTime(gain, t, 0.05);
    if (pan) pan.pan.setTargetAtTime(panV || 0, t, 0.05);
  } };
}
function shot(build, life) { // 한 번 나는 소리 (동시에 너무 많으면 생략)
  if (!SND.ctx || SND.voices > 28) return; SND.voices++; build(SND.ctx, SND.ctx.currentTime); setTimeout(() => SND.voices--, life * 1000 + 50);
}
function nzs(ctx, t, dur, type, f0, f1, vol, q = 1, out = SND.master, delay = 0) {
  const s_ = ctx.createBufferSource(); s_.buffer = SND.noise; const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t + delay); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + delay + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + delay); g.gain.linearRampToValueAtTime(vol, t + delay + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
  s_.connect(f); f.connect(g); g.connect(out); s_.start(t + delay, Math.random() * 1.5); s_.stop(t + delay + dur + 0.05);
}
function tone(ctx, t, dur, type, f0, f1, vol, delay = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + delay); o.frequency.exponentialRampToValueAtTime(Math.max(15, f1), t + delay + dur);
  g.gain.setValueAtTime(0.0001, t + delay); g.gain.linearRampToValueAtTime(vol, t + delay + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur); o.connect(g); g.connect(SND.master); o.start(t + delay); o.stop(t + delay + dur + 0.05);
}
function viewD(x, z) { const v = (SPEC.on || REPLAY.on || DEMO.on) ? camera.position : player; return Math.hypot(x - v.x, z - v.z); } /* 효과·소리는 지금 보고 있는 곳 기준 (관전·리플레이에서도 보이게) */
const distVol = (x, z) => { const d = viewD(x, z); return 1 / (1 + Math.pow(d / 30, 1.4)); };
function sndBurst(dur, freq, vol, type = "lowpass") { shot((ctx, t) => nzs(ctx, t, dur, type, freq, freq * 0.6, vol), dur); }
function sndBoom() { sndBoost(1); }
function sndBoost(v = 1) { // 부스트 점화: 빨아들이는 쉭 → 쿵 → 불꽃 갈라지는 소리
  if (v < 0.03) return;
  shot((ctx, t) => { nzs(ctx, t, 0.22, "bandpass", 400, 3800, 0.35 * v, 2); tone(ctx, t, 1.1, "sine", 120, 28, 1.0 * v, 0.16); tone(ctx, t, 0.5, "triangle", 70, 30, 0.5 * v, 0.16); nzs(ctx, t, 0.9, "lowpass", 3000, 200, 0.8 * v, 0.7, SND.master, 0.15); nzs(ctx, t, 0.12, "highpass", 4000, 2500, 0.5 * v, 0.7, SND.master, 0.16); }, 1.3);
}
function sndImpact(hard, x, z, metal = 1) { // 충돌: 둔탁한 쿵 + 금속이 찌그러지는 울림
  const v = Math.min(1.2, hard / 18) * (x === undefined ? 1 : distVol(x, z)); if (v < 0.03) return;
  if (SFX.ready && sfx(pick("hit", 8), (0.6 + v * 0.75) * (metal ? 1 : 0.6), 0.72 + Math.random() * 0.3)) { // 녹음된 금속 충돌음 + 합성 저음(무게감)
    if (v > 0.55) sfx(pick("crash", 3), v * 0.85, 0.7 + Math.random() * 0.25, 0.02); if (v > 0.9) sfx(pick("clank", 4), v * 0.5, 0.9, 0.12);
    shot((ctx, t) => tone(ctx, t, 0.25 + v * 0.2, "sine", 95, 38, 0.75 * v), 0.5); return; }
  shot((ctx, t) => {
    tone(ctx, t, 0.25 + v * 0.2, "sine", 95, 38, 0.9 * v); nzs(ctx, t, 0.18 + v * 0.35, "lowpass", 2500 + v * 3000, 300, 0.75 * v, 0.8);
    if (metal) for (const fr of [430 + Math.random() * 80, 690 + Math.random() * 120, 1170 + Math.random() * 200, 2310 + Math.random() * 300]) tone(ctx, t, 0.18 + v * 0.3, "square", fr, fr * 0.92, 0.05 * v * metal);
    if (v > 0.5) nzs(ctx, t, 0.35, "bandpass", 3500, 1800, 0.25 * v, 3, SND.master, 0.03); // 유리·파편 자글자글
  }, 0.8);
}
function sndClank(v, x, z) { v *= x === undefined ? 1 : distVol(x, z); if (v < 0.03) return; if (SFX.ready && sfx(pick("clank", 4), v * 0.55, 0.9 + Math.random() * 0.4)) return; shot((ctx, t) => { const fr = 600 + Math.random() * 1600; tone(ctx, t, 0.12, "square", fr, fr * 0.85, 0.07 * v); tone(ctx, t, 0.09, "triangle", fr * 1.6, fr * 1.4, 0.05 * v); nzs(ctx, t, 0.07, "highpass", 3000, 2000, 0.25 * v); }, 0.2); }
function sndLand(impact) { const v = Math.min(1, impact / 22); if (v < 0.05) return; shot((ctx, t) => { tone(ctx, t, 0.35, "sine", 75, 32, 0.9 * v); nzs(ctx, t, 0.25, "lowpass", 900, 150, 0.6 * v); }, 0.4); }
function sndExplode(x, z) { // 폭발: 긴 저음 + 화염 쏴아 + 잔불 탁탁
  const v = Math.min(1.3, distVol(x, z) * 1.6); if (v < 0.03) return;
  if (SFX.ready && sfx("boom", v * 1.1, 0.9 + Math.random() * 0.15)) { shot((ctx, t) => tone(ctx, t, 1.6, "sine", 90, 22, 0.8 * v), 1.8); if (courseId !== "desert" && v > 0.25) sfx("ooh", Math.min(0.8, v * 0.7), 0.95 + Math.random() * 0.1, 0.45); return; } // 관중이 있는 코스면 "오오오"
  shot((ctx, t) => { tone(ctx, t, 1.8, "sine", 110, 22, 1.1 * v); tone(ctx, t, 0.9, "triangle", 60, 25, 0.6 * v); nzs(ctx, t, 1.6, "lowpass", 5000, 120, 1.0 * v, 0.6); nzs(ctx, t, 0.4, "highpass", 3000, 1200, 0.5 * v);
    for (let k = 0; k < 14; k++) nzs(ctx, t, 0.04 + Math.random() * 0.05, "bandpass", 700 + Math.random() * 2000, 500, 0.35 * v * Math.random(), 2, SND.master, 0.25 + Math.random() * 1.6); }, 2.2);
}
function sndPop(v = 1) { shot((ctx, t) => { nzs(ctx, t, 0.07, "bandpass", 650 + Math.random() * 300, 300, 0.7 * v, 1.5); tone(ctx, t, 0.08, "sine", 140, 60, 0.4 * v); }, 0.15); } // 백파이어 펑
function sndBeep(go) { shot((ctx, t) => { tone(ctx, t, go ? 0.6 : 0.22, "square", go ? 880 : 440, go ? 880 : 440, 0.12); }, 0.7); }
function updateSound(dt) {
  if (!SND.ctx) return; const ctx = SND.ctx, t = ctx.currentTime;
  const watch = (SPEC.on || REPLAY.on) && !DEMO.on, F = watch ? (SPEC.car || player) : player; /* 관전·리플레이: 보고 있는 차의 엔진 소리 */
  const fv = c => REPLAY.on ? ((REPLAY.view.get(c) || {}).vf || 0) : (c.vf || 0), fb = c => REPLAY.on ? !!(REPLAY.view.get(c) || {}).boost : c.boostT > 0, fdead = c => REPLAY.on ? false : !!c.dead;
  const camD = watch ? Math.hypot(F.mesh.position.x - camera.position.x, F.mesh.position.z - camera.position.z) : 0, camK = watch ? Math.max(0.12, 1 / (1 + Math.pow(Math.max(0, camD - 8) / (SPEC.mode === "tv" ? 55 : 22), 1.5))) : 1; /* TV 캠은 멀리서 찍으니 덜 줄임 */
  const p = watch ? { vf: fv(F), boostT: fb(F) ? 1 : 0, hp: F.hp, air: 0, lat: 0, s: 0, vx: 0, vz: 0, scrape: 0, slipR: 0, dead: fdead(F) } : player, v = Math.abs(p.vf), active = (state === "race" || state === "count" || state === "intro" || state === "end" || state === "menu") && !p.dead && !DEMO.on;
  const boosting = p.boostT > 0, gas = watch ? active && v > 5 : input.gas > 0 && active;
  // 기어: 회전수가 차면 변속 (툭 끊겼다가 다시 올라감)
  const GT = [0.2, 0.34, 0.5, 0.66, 0.83, 1.02, 1.3].map(k => k * P.top);
  SND.shiftT = Math.max(0, SND.shiftT - (dt || 0.016));
  let g = SND.gear; if (g < GT.length - 1 && v > GT[g] * 0.97 && gas) { g++; SND.shiftT = 0.09; if (Math.random() < 0.6) sndPop(0.5); } else if (g > 0 && v < GT[g - 1] * 0.62) g--; SND.gear = g;
  const lo = g ? GT[g - 1] * 0.55 : 0, rpm = clamp((v - lo) / (GT[g] - lo), 0, 1.05);
  const dmgShake = (p.hp ?? 100) < 40 && Math.random() < (40 - p.hp) / 400 ? 0.4 : 1; // 망가지면 엔진이 툭툭 끊김
  const f = 34 + rpm * 108 + (boosting ? 26 : 0) + (p.air > 0.1 && gas ? 22 : 0) + (state === "count" && input.gas > 0 ? 45 : 0);
  const load = boosting ? 1 : gas ? 0.8 : 0.15;
  SND.eng.set(f, load, active ? (0.28 + load * 0.16) * (SND.shiftT > 0 ? 0.35 : 1) * dmgShake * camK : 0, 0, SND.shiftT > 0 ? 0.015 : 0.04);
  // 라이벌: 가까운 3대, 거리·좌우·도플러
  const cx = camera.position.x, cz = camera.position.z, ch = Math.atan2(camLook.x - cx, camLook.z - cz);
  const near = (watch ? [player, ...ais].filter(a => a !== F) : ais).filter(a => !fdead(a)).map(a => [a, Math.hypot(a.mesh.position.x - cx, a.mesh.position.z - cz)]).sort((q, w) => q[1] - w[1]).slice(0, 3);
  SND.rv.forEach((e, i) => { const it = near[i]; if (!it || !active && state !== "count") { e.set(30, 0, 0, 0); return; }
    const [a, d] = it, ri = ais.indexOf(a), pitch = [1.08, 0.95, 1.18, 1.0, 0.9, 1.05, 0.72][ri] || 1, av = fv(a), ah = REPLAY.on ? ((REPLAY.view.get(a) || {}).h || 0) : a.h, avx = Math.sin(ah) * av, avz = Math.cos(ah) * av;
    const ux = (a.mesh.position.x - cx) / (d || 1), uz = (a.mesh.position.z - cz) / (d || 1), vRel = watch ? (avx * ux + avz * uz) : (a.vx - p.vx) * ux + (a.vz - p.vz) * uz, dop = clamp(260 / (260 + vRel), 0.6, 1.6);
    const ar = clamp(Math.abs(av) / (P.top * 1.02), 0, 1.3), fa = (34 + ((ar * 6) % 1) * 100 + (fb(a) ? 28 : 0)) * pitch * dop;
    const pan = clamp(Math.sin(Math.atan2(ux, uz) - ch) * -1, -1, 1), gain = 0.3 / (1 + Math.pow(d / (watch ? 40 : 22), 1.5));
    e.set(fa, fb(a) ? 1 : 0.75, gain, pan); });
  // 바람·노면·부스트·불
  const r = Math.min(1.4, v / P.top) * (watch ? (SPEC.mode === "chase" ? 0.8 : 0.15) : 1), onRoad = watch || Math.abs(p.lat) <= hwAt(p.s) + 0.5;
  SND.wind.g.gain.setTargetAtTime(active ? 0.04 + r * 0.16 : 0, t, 0.15); SND.wind.f.frequency.setTargetAtTime(300 + r * 700, t, 0.2);
  SND.rush.g.gain.setTargetAtTime(active ? Math.max(0, r - 0.45) * 0.12 + (boosting ? 0.06 : 0) : 0, t, 0.15);
  SND.scrape.g.gain.setTargetAtTime(p.scrape > 0 ? 0.22 : 0, t, 0.03); SND.scrape2.g.gain.setTargetAtTime(p.scrape > 0 ? 0.1 : 0, t, 0.03);
  const slip = active && p.air <= 0 && onRoad ? Math.min(0.2, Math.max(0, (p.slipR || 0) - 0.08) * 0.9) : 0;
  const L_ = SFX.loops;
  if (L_.squeal) { L_.squeal.g.gain.setTargetAtTime(slip * 3.2, t, 0.05); L_.squeal.s.playbackRate.setTargetAtTime(0.85 + (p.slipR || 0) * 0.5, t, 0.1); SND.squeal.g.gain.setTargetAtTime(0, t, 0.05); } // 녹음된 타이어 끼익
  else { SND.squeal.g.gain.setTargetAtTime(slip, t, 0.05); SND.squeal.f.frequency.setTargetAtTime(1500 + (p.slipR || 0) * 1500, t, 0.08); }
  if (L_.wind) L_.wind.g.gain.setTargetAtTime(active ? Math.max(0, r - 0.15) * 0.16 + (boosting ? 0.05 : 0) : 0, t, 0.2);
  if (L_.crowd) L_.crowd.g.gain.setTargetAtTime(courseId !== "desert" && (active || state === "menu" || state === "count") ? (state === "count" || state === "intro" ? 0.24 : 0.11) : 0, t, 0.6); // 관중석 있는 코스는 함성이 깔림
  SND.gravel.g.gain.setTargetAtTime(active && !onRoad && p.air <= 0 ? Math.min(0.35, v * 0.006) : 0, t, 0.05);
  SND.boostRoar.g.gain.setTargetAtTime(boosting && active ? 0.42 * camK : 0, t, boosting ? 0.05 : 0.4); SND.boostRumble.g.gain.setTargetAtTime(boosting && active ? 0.5 * camK : 0, t, boosting ? 0.05 : 0.5);
  SND.jet.o.frequency.setTargetAtTime(700 + r * 900, t, 0.1); SND.jet.g.gain.setTargetAtTime(boosting && active ? 0.035 : 0, t, 0.2);
  let fireV = 0; for (const c of [player, ...ais]) if (c.hp !== undefined && c.hp < 15) fireV = Math.max(fireV, distVol(c.x, c.z) * (c.dead && c.deadT > 40 ? 0 : 1));
  SND.fire.g.gain.setTargetAtTime(fireV * (0.15 + Math.random() * 0.25), t, 0.03);
}
function setSound(on) { SND.on = on; if (SND.master) SND.master.gain.value = on ? SET.vol / 100 : 0; document.getElementById("bSnd").textContent = on ? "소리 켬 (M)" : "소리 끔 (M)"; }

