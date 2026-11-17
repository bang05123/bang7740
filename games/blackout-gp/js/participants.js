// ================= 참가자 =================
const player = { mesh: makeCar({ len: 6.6, color: 0xff4a1a, accent: 0x111111, wing: "spoiler", scoop: true, num: "0", rim: 0xffd23a }),
  x: 0, z: 0, h: 0, y: 0, vy: 0, air: 0, vf: 0, vl: 0, ry: 0, vx: 0, vz: 0, idx: 0, s: 0, lat: 0, prog: 0, charges: 1, boostT: 0, laps: [], lapStart: 0, done: false, finishT: 0, name: "Rook (0번)",
  pitch: 0, roll: 0, pv: 0, rv: 0, squash: 0, scrape: 0, slipR: 0, ax: 0, ay: 0, steerS: 0, offTimer: 0, tPitch: 0, tRoll: 0, mass: MASS };
const RIVALS = [
  { name: "Zero", save: true, sf: ["stealth", 0x141414, 0xff2a2a], skill: 1.04, charges: 2, trait: "late", mass: 1300 },
  { name: "Duke", sf: ["duke", 0x1f6fd6, 0xffffff], skill: 1.02, charges: 2, trait: "burst", mass: 1400 },
  { name: "Scarlet", save: true, sf: ["scarlet", 0xd6123a, 0xff6ab4], skill: 1.01, charges: 1, trait: "clean", mass: 1200 },
  { name: "Hex", sf: ["hex", 0x9b5cff, 0xff3bd4], skill: 1.0, charges: 1, trait: "block", mass: 1250 },
  { name: "Lyle & Lena", save: true, sf: ["twins", 0xf2f2f2, 0xd4af37], skill: 0.99, charges: 1, trait: "early", mass: 1450 },
  { name: "Bones & Jinx", sf: ["sidecar", 0x2f7a2a, 0x7cff8a], skill: 0.97, charges: 1, trait: "ram", mass: 1500 },
  { name: "Gunnar & Big Mo", sf: ["gunnar", 0xffb21a, 0x39d4ff], skill: 0.96, charges: 1, trait: "ram", mass: 2400 }
];
const ais = RIVALS.map(r => ({ ...r, mesh: makeSF(...r.sf), prog: 0, v: 0, lane: 0, laneT: 0, lv: 0, laneTimer: 0, done: false, finishT: 0, y: 0, vy: 0, air: 0, boostT: 0, left: r.charges, x: 0, z: 0, h: 0 }));
const TOTAL = ais.length + 1;

// ================= 입자 =================
const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const puffTex = (() => { // 테두리 있는 뭉게뭉게 덩어리 (아래는 그늘)
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const bl = [[64, 70, 40], [40, 76, 26], [88, 74, 28], [54, 48, 26], [78, 50, 24]];
  g.fillStyle = "#000"; for (const [x, y, r] of bl) { g.beginPath(); g.arc(x, y, r + 5, 0, 7); g.fill(); }
  g.fillStyle = "#fff"; for (const [x, y, r] of bl) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.fillStyle = "rgba(0,0,0,0.28)"; for (const [x, y, r] of bl) { g.beginPath(); g.ellipse(x + 4, y + r * 0.5, r * 0.8, r * 0.38, 0, 0, 7); g.fill(); }
  return new THREE.CanvasTexture(c); })();
function makeParticles(n, color, size, additive, op = 0.32) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3).fill(-9999);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const comic = op === "comic", mat = new THREE.PointsMaterial({ color, size, map: comic ? puffTex : dotTex, transparent: !comic, alphaTest: comic ? 0.5 : 0, opacity: additive || comic ? 1 : op, depthWrite: comic, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  return { pts, pos, vel: new Float32Array(n * 3), life: new Float32Array(n), n, next: 0 };
}
const smoke = makeParticles(260, 0xd8d8d8, 1.6, false, 0.38), sparks = makeParticles(320, 0xffb040, 0.22, true), dust = makeParticles(420, 0xe8c08a, 3.0, false, 0.3);
const boostCore = makeParticles(1400, 0x9ff4ff, 0.9, true), boostFire = makeParticles(2000, 0xff7a1a, 1.5, true);
const debris = makeParticles(260, 0x5a3a1c, 0.32, false, 0.95), streaks = makeParticles(360, 0x9a9a9a, 0.07, true);
// 스키드마크: 미끄러질 때 노면에 남는 검은 자국
const SKID_N = 900, skid = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.34, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0d0d0d, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), SKID_N);
skid.frustumCulled = false; scene.add(skid); let skidI = 0; const skidM = new THREE.Matrix4(), skidQ = new THREE.Quaternion(), skidS = new THREE.Vector3(), skidP = new THREE.Vector3(), skidE = new THREE.Euler();
function clearSkid() { skidM.makeScale(0, 0, 0); for (let i = 0; i < SKID_N; i++) skid.setMatrixAt(i, skidM); skid.instanceMatrix.needsUpdate = true; }
clearSkid();
function addSkid(x, z, y, h, len) { skidP.set(x, y, z); skidE.set(0, h, 0); skidQ.setFromEuler(skidE); skidS.set(1, 1, len); skidM.compose(skidP, skidQ, skidS); skid.setMatrixAt(skidI, skidM); skidI = (skidI + 1) % SKID_N; skid.instanceMatrix.needsUpdate = true; }
function emit(ps, x, y, z, vx, vy, vz, life) { const i = ps.next; ps.next = (i + 1) % ps.n; ps.pos[i * 3] = x; ps.pos[i * 3 + 1] = y; ps.pos[i * 3 + 2] = z; ps.vel[i * 3] = vx; ps.vel[i * 3 + 1] = vy; ps.vel[i * 3 + 2] = vz; ps.life[i] = life; }
function stepParticles(ps, dt, grav, drag) {
  for (let i = 0; i < ps.n; i++) {
    if (ps.life[i] <= 0) continue;
    ps.life[i] -= dt; if (ps.life[i] <= 0) { ps.pos[i * 3 + 1] = -9999; continue; }
    ps.vel[i * 3 + 1] -= grav * dt; const k = Math.exp(-drag * dt); ps.vel[i * 3] *= k; ps.vel[i * 3 + 2] *= k;
    ps.pos[i * 3] += ps.vel[i * 3] * dt; ps.pos[i * 3 + 1] += ps.vel[i * 3 + 1] * dt; ps.pos[i * 3 + 2] += ps.vel[i * 3 + 2] * dt;
  }
  ps.pts.geometry.attributes.position.needsUpdate = true;
}

