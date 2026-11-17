function buildDesert() {
  // 도로: 바랜 아스팔트 + 노란 선
  TEX.road = TEX.road || noiseTex("#ffffff", [["#5a5a5a", 0.5], ["#ffffff", 0.6], ["#8a8a8a", 0.5]]);
  TEX.sand = TEX.sand || noiseTex("#ffffff", [["#b07840", 0.35], ["#fff0d0", 0.4]], 256, true);
  for (let k = 0; k < 4; k++) ribbon(-HALF + k * HALF / 2, -HALF + (k + 1) * HALF / 2, 0, 0x5a5658, { tex: TEX.road, uvU: 6, uvV: 6 });
  ribbon(-HALF + 0.6, -HALF + 1.1, 0.03, 0xf2c230); ribbon(HALF - 1.1, HALF - 0.6, 0.03, 0xf2c230);
  ribbon(-0.55, -0.2, 0.03, 0xf2c230, { dash: 7 }); ribbon(0.2, 0.55, 0.03, 0xf2c230, { dash: 7 });
  terrain([[HALF, HALF + 4, 0xc68a52], [HALF + 4, HALF + 20, 0xd29a5e], [HALF + 20, HALF + 45, 0xd9a066], [HALF + 45, HALF + 80, 0xd9a066]], TEX.sand);
  // 점프대 옆면과 끝벽
  for (const sd of [-1, 1]) ribbon(sd * HALF, sd * HALF, 0, 0x8a8478, { y0: (t, l) => surfH(t.s, l), y1: (t, l) => surfH(t.s, l + sd * 0.01, true), only: t => t.ramp > 0.05 });
  if (RAMP) {
    const s = RAMP.s1 - 0.6, wall = outlined(new THREE.BoxGeometry(hwAt(RAMP.s1) * 2, RAMP.h, 0.6), 0xf2c230, 0.1);
    placeOnTrack(wall, s, 0, 0); wall.position.y = surfH(s, 0, true) + RAMP.h / 2;
    for (let k = 0; k < 10; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(hwAt(RAMP.s1) * 2 / 10, 0.1, 1.4), toon(k % 2 ? 0x111111 : 0xf2c230)); placeOnTrack(st, s - 0.8, -HALF + HALF / 10 + k * HALF / 5, 0.06); }
  }
  // 메사 (거대한 바위산)
  const MESA = [0xc1653a, 0xa84f2c, 0xd9874f, 0xb85d36];
  function mesa(x, z, r, h, coll) {
    const g = new THREE.Group(); let y = 0, rr = r; const layers = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < layers; k++) { const lh = h / layers * (0.8 + rnd() * 0.4), top = rr * (0.82 + rnd() * 0.12); const m = outlined(new THREE.CylinderGeometry(top, rr, lh, 9), MESA[(k + Math.floor(rnd() * 4)) % 4], 0.6); m.position.y = y + lh / 2; m.rotation.y = rnd() * 6; g.add(m); y += lh; rr = top * (0.9 + rnd() * 0.08); }
    g.position.set(x, 0, z); world.add(g); if (coll) colliders.push({ x, z, r: r * 0.95 });
  }
  for (let k = 0; k < 70; k++) { const a = rnd() * Math.PI * 2, R = (1500 + rnd() * 900) * WS; mesa(Math.cos(a) * R + 100 * WS, Math.sin(a) * R - 380 * WS, (80 + rnd() * 220) * 1.8, (90 + rnd() * 260) * 1.6, false); }
  let placed = 0;
  for (let tries = 0; tries < 1200 && placed < 110; tries++) {
    const x = (-900 + rnd() * 1900) * WS, z = (-1100 + rnd() * 1300) * WS, r = 25 + rnd() * 90;
    if (trackDist(x, z) < r + HALF * 1.5 + 45) continue;
    mesa(x, z, r, 40 + rnd() * 130, true); placed++;
  }
  // 바위, 전봇대, 표지판, 버려진 차
  const rockMat = 0x9c5a35;
  for (let i = 0; i < N; i += 20) {
    if (rnd() < 0.5) continue;
    const sd = rnd() < 0.5 ? -1 : 1, lat = sd * (HALF + 10 + rnd() * 70), r = 0.6 + rnd() * 2.2;
    const rock = outlined(new THREE.DodecahedronGeometry(r, 0), rockMat, 0.08); placeOnTrack(rock, TRK[i].s, lat, r * 0.4); rock.rotation.set(rnd() * 3, rnd() * 3, 0); propObj(rock, "rock", { r: r * 1.1, yOff: r * 0.4, h: r * 1.6 });
  }
  const postGeo = new THREE.BoxGeometry(0.25, 1.1, 0.25), postMat = toon(0xf1efe8), refl = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
  { // 한 번에 그리는 인스턴스 (폰에서도 가볍게)
    const cnt = Math.floor(N / 8) * 2, posts = new THREE.InstancedMesh(postGeo, postMat, cnt), caps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.27, 0.18, 0.27), refl, cnt), M4 = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i + 8 <= N && k < cnt; i += 8) for (const sd of [-1, 1]) {
      const t = TRK[i], lat = mapLat(t, sd * (HALF + 2.5)), y = surfH(t.s, lat), x = t.x + nx(t) * lat, z = t.z + nz(t) * lat;
      M4.makeTranslation(x, y + 0.55, z); posts.setMatrixAt(k, M4); M4.makeTranslation(x, y + 0.95, z); caps.setMatrixAt(k, M4); k++;
    }
    posts.count = caps.count = k; world.add(posts, caps); posts.frustumCulled = caps.frustumCulled = false;
    for (let i = 0; i < k; i++) { const m = new THREE.Matrix4(); caps.getMatrixAt(i, m); const cp = linkedProp({ kind: "post", x: 0, y: 0, z: 0, inst: { im: caps, om: null, i, m } }); const pp = propInst(posts, i, "post"); pp.link = [cp]; }
  }
  for (let i = 0; i < N; i += 64) {
    const pole = outlined(new THREE.BoxGeometry(0.5, 11, 0.5), 0x5a3d26, 0.06); placeOnTrack(pole, TRK[i].s, -(HALF + 14), 5.5);
    const bar = outlined(new THREE.BoxGeometry(3.4, 0.35, 0.35), 0x5a3d26, 0.05); placeOnTrack(bar, TRK[i].s, -(HALF + 14), 10);
    const bp = linkedProp({ kind: "pole", obj: bar, x: 0, z: 0, y: 0 }); propObj(pole, "pole", { yOff: 5.5, link: [bp] });
  }
  const ads = ["BLACKOUT GP", "NO GAS 200 MI", "DUKE MOTORS", "FIRST LINE WINS"];
  for (let k = 0; k < 8; k++) {
    const s = L * (k + 0.5) / 8, sd = k % 2 ? 1 : -1, g = new THREE.Group();
    for (const dx of [-5, 5]) { const p = outlined(new THREE.BoxGeometry(0.6, 9, 0.6), 0x3a2a1c, 0.06); p.position.set(dx, 4.5, 0); g.add(p); }
    const board = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 0.4), new THREE.MeshBasicMaterial({ map: textTex(ads[k % 4], k % 2 ? "#1c2430" : "#d8462a", "#f6e7c8") })); board.position.y = 10; g.add(board);
    placeOnTrack(g, s, sd * (HALF + 26), 0); g.rotation.y += sd * 0.5; propObj(g, "board");
  }
  for (let k = 0; k < 5; k++) {
    const w = makeCar({ len: 5.2 + rnd(), wing: rnd() < 0.5 ? "duck" : "none", color: [0x7a4a2a, 0x5a5a52, 0x8a3a22][k % 3], accent: 0x333333, scoop: rnd() < 0.5, rust: true }, world);
    const s = L * (0.1 + k * 0.19), lat = mapLat(TRK[idxAtS(s)], (k % 2 ? 1 : -1) * (HALF + 16 + rnd() * 20)); const p = posAt(s, lat);
    w.position.set(p.x, surfH(s, lat) - 0.2, p.z); w.rotation.set(0.05, p.h + rnd() * 3, (rnd() - 0.5) * 0.4); colliders.push({ x: p.x, z: p.z, r: 2.6 });
  }
  desertDecor();
  startGate(0xff4a1a, textTex("BLACKOUT GP", "#111", "#ff6a2a"));
}
function desertDecor() {
  const far = (x, z, m) => trackDist(x, z) > HALF + m;
  // 선인장 (사와로) + 덤불
  const trunk = [], armH = [], armV = [], bush = [], CAC = [0x4f7a3a, 0x5d8a44, 0x466e34];
  for (let i = 0; i < N; i += 5) {
    if (rnd() < 0.45) continue;
    const t = TRK[i], sd = rnd() < 0.5 ? -1 : 1, lat = sd * (HALF + 8 + rnd() * rnd() * 110), [x, y, z] = trackAt(t.s, lat);
    if (rnd() < 0.42) { // 선인장
      const h = 4 + rnd() * 7, ry = rnd() * 6.3, c = new THREE.Color(CAC[Math.floor(rnd() * 3)]), Mb = MX(x, y, z, ry);
      trunk.push({ m: Mb.clone().multiply(MX(0, h / 2, 0, 0, 1, h, 1)), c });
      for (const side of [-1, 1]) { if (rnd() < 0.3) continue; const ah = h * (0.35 + rnd() * 0.25), al = 1.4 + rnd();
        armH.push({ m: Mb.clone().multiply(MX(side * al / 2, ah, 0, 0, al, 1, 1)), c }); armV.push({ m: Mb.clone().multiply(MX(side * al, ah + 1.1, 0, 0, 1, 2.2 + rnd() * 1.5, 1)), c }); }
    } else bush.push({ m: MX(x, y + 0.3, z, rnd() * 6, 1 + rnd() * 1.6, 0.5 + rnd() * 0.5, 1 + rnd() * 1.6), c: new THREE.Color([0x8a8a4a, 0x7a6a3a, 0x9a8a5a][Math.floor(rnd() * 3)]) });
  }
  const cm = toon(0xffffff); instanced(new THREE.CylinderGeometry(0.55, 0.65, 1, 8), cm, trunk, 1.06, "cactus"); instanced(new THREE.BoxGeometry(1, 0.8, 0.8), cm, armH, 1.06, "cactus"); instanced(new THREE.CylinderGeometry(0.42, 0.42, 1, 7), cm, armV, 1.06, "cactus");
  instanced(new THREE.DodecahedronGeometry(1, 0), toon(0xffffff), bush, 0, "bush");
  // 전봇대 사이 전깃줄 (살짝 처지게)
  const wire = []; let prev = null;
  for (let i = 0; i <= N; i += 64) { const [x, y, z] = trackAt(TRK[i % N].s, -(HALF + 14)), top = [x, y + 10, z];
    if (prev && Math.hypot(top[0] - prev[0], top[2] - prev[2]) < 200) for (const dy of [0, -0.9]) for (let k = 0; k < 8; k++) { const P_ = u => [prev[0] + (top[0] - prev[0]) * u, prev[1] + (top[1] - prev[1]) * u + dy - Math.sin(u * Math.PI) * 1.4, prev[2] + (top[2] - prev[2]) * u]; wire.push(...P_(k / 8), ...P_((k + 1) / 8)); }
    prev = top; }
  { const gw = new THREE.BufferGeometry(); gw.setAttribute("position", new THREE.Float32BufferAttribute(wire, 3)); world.add(new THREE.LineSegments(gw, new THREE.LineBasicMaterial({ color: 0x2a1c12 }))); }
  // 버려진 주유소 + 물탱크
  { const s = L * 0.33, t = TRK[idxAtS(s)], sd = -(t.kside || 1), [x, y, z] = trackAt(s, sd * (HALF + 42)), g = new THREE.Group();
    const store = outlined(new THREE.BoxGeometry(22, 7, 12), 0xe8d8b8, 0.12); store.position.set(0, 3.5, 12); g.add(store);
    const roofS = outlined(new THREE.BoxGeometry(24, 0.8, 14), 0xc8462a, 0.1); roofS.position.set(0, 7.4, 12); g.add(roofS);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), glow(0x2a3a48)); win.position.set(0, 3.6, 5.95); win.rotation.y = Math.PI; g.add(win);
    const canopy = outlined(new THREE.BoxGeometry(26, 1.4, 14), 0xf1efe8, 0.12); canopy.position.set(0, 8, -6); g.add(canopy);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(26.2, 0.5, 14.2), glow(0xff4a1a)); stripe.position.set(0, 7.6, -6); g.add(stripe);
    for (const dx of [-9, 9]) { const col = outlined(new THREE.BoxGeometry(0.8, 7.4, 0.8), 0xd8d0c0, 0.06); col.position.set(dx, 3.7, -6); g.add(col); }
    for (const dx of [-5, 0, 5]) { const pump = outlined(new THREE.BoxGeometry(1.4, 2.6, 1), 0xd8462a, 0.08); pump.position.set(dx, 1.3, -6); g.add(pump); }
    const pole = outlined(new THREE.BoxGeometry(0.8, 18, 0.8), 0x5a4a3a, 0.06); pole.position.set(14, 9, -14); g.add(pole);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 0.5), new THREE.MeshBasicMaterial({ map: textTex("FUEL", "#d8462a", "#fff1d0", 256, 112) })); sign.position.set(14, 17, -14); g.add(sign);
    const tank = outlined(new THREE.CylinderGeometry(4, 4, 6, 14), 0x9aa6a8, 0.1); tank.position.set(-20, 15, 18); g.add(tank);
    const cap = outlined(new THREE.ConeGeometry(4.4, 2.5, 14), 0x8a9698, 0.1); cap.position.set(-20, 19.2, 18); g.add(cap);
    for (const [ax, az] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { const lg = outlined(new THREE.BoxGeometry(0.5, 12, 0.5), 0x6a5a4a, 0.05); lg.position.set(-20 + ax, 6, 18 + az); g.add(lg); }
    g.position.set(x, y, z); g.rotation.y = Math.atan2(-sd * nx(t), -sd * nz(t)); world.add(g); colliders.push({ x, z, r: 16 }); }
  // 사막 태양광 발전소 (미래 느낌: 거울판이 탑을 향해 빛남)
  { let best = null; for (let k = 0; k < 400; k++) { const i = Math.floor(rnd() * N), t = TRK[i], sd = rnd() < 0.5 ? -1 : 1, d = HALF + 140 + rnd() * 80, x = t.x + nx(t) * sd * d, z = t.z + nz(t) * sd * d; if (far(x, z, 130)) { best = [x, z]; break; } }
    if (best) { const [cx, cz] = best, panels = [];
      for (let r = 30; r < 150; r += 10) { const n = Math.floor(r * 0.42); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + r, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (!far(x, z, 40)) continue; panels.push({ m: MX(x, 1.6, z, -a + Math.PI / 2, 5, 0.25, 3, -0.5) }); } }
      instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x8fd0ff }), panels);
      const tower = outlined(new THREE.CylinderGeometry(3, 5, 110, 12), 0xd8d0c4, 0.15); tower.position.set(cx, 55, cz); world.add(tower);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 16), glow(0xfff4c8)); core.position.set(cx, 112, cz); world.add(core);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.copy(core.position); world.add(halo);
      FEST.anims.push(dt => { halo.scale.setScalar(1 + Math.sin((FEST.dclock = (FEST.dclock || 0) + dt) * 2) * 0.08); });
      colliders.push({ x: cx, z: cz, r: 8 }); }
  }
  // 회오리 먼지기둥 (천천히 떠돌아다님)
  for (let k = 0; k < 4; k++) {
    const s = L * (k + 0.3) / 4, sd = k % 2 ? 1 : -1, [x, y, z] = trackAt(s, sd * (HALF + 60 + rnd() * 60)), g = new THREE.Group();
    for (let j = 0; j < 5; j++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(3 + j * 2.2, 2 + j * 1.8, 9, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xe8c08a, transparent: true, opacity: 0.22 - j * 0.03, depthWrite: false, side: THREE.DoubleSide })); m.position.y = 4.5 + j * 8.5; g.add(m); }
    g.position.set(x, y, z); world.add(g); const ox = x, oz = z, ph = rnd() * 6; let tt = 0;
    FEST.anims.push(dt => { tt += dt; g.rotation.y += dt * 3; g.position.x = ox + Math.sin(tt * 0.13 + ph) * 25; g.position.z = oz + Math.cos(tt * 0.11 + ph) * 25; g.children.forEach((c, j) => { c.position.x = Math.sin(tt * 1.3 + j) * j * 0.8; }); });
  }
}
