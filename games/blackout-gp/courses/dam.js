function buildDam() {
  TEX.road = TEX.road || noiseTex("#ffffff", [["#5a5a5a", 0.5], ["#ffffff", 0.6], ["#8a8a8a", 0.5]]);
  TEX.sand = TEX.sand || noiseTex("#ffffff", [["#b07840", 0.35], ["#fff0d0", 0.4]], 256, true);
  for (let k = 0; k < 4; k++) ribbon(-HALF + k * HALF / 2, -HALF + (k + 1) * HALF / 2, 0, 0x4c4a4e, { tex: TEX.road, uvU: 6, uvV: 6 });
  ribbon(-HALF + 0.5, -HALF + 0.9, 0.03, 0xffffff); ribbon(HALF - 0.9, HALF - 0.5, 0.03, 0xffffff);
  for (const sd of [-1, 1]) { ribbon(sd * HALF, sd * (HALF + 1.8), 0.03, 0xf1efe8); ribbon(sd * HALF, sd * (HALF + 1.8), 0.05, 0xe2283a, { dash: 4 }); }
  TEX.grass = TEX.grass || noiseTex("#ffffff", [["#7a7a7a", 0.45], ["#ffffff", 0.5]], 256, true);
  terrain([[HALF + 1.8, HALF + 8, 0x9a9a92], [HALF + 8, HALF + 40, 0x5f9a4a], [HALF + 40, HALF + 120, 0x5f8f4a], [HALF + 120, HALF + 260, 0x5a8846]], TEX.grass);
  buildFestival();
  { // 반사봉
    const postGeo = new THREE.BoxGeometry(0.25, 1.1, 0.25), cnt = Math.floor(N / 10) * 2, posts = new THREE.InstancedMesh(postGeo, toon(0xf1efe8), cnt), M4 = new THREE.Matrix4(); let k = 0;
    for (let i = 0; i + 10 <= N && k < cnt; i += 10) for (const sd of [-1, 1]) { const t = TRK[i]; if (GAP && t.s > GAP[0] - 5 && t.s < GAP[1] + 5) continue; const lat = mapLat(t, sd * (HALF + 3)), y = surfH(t.s, lat); M4.makeTranslation(t.x + nx(t) * lat, y + 0.55, t.z + nz(t) * lat); posts.setMatrixAt(k++, M4); }
    posts.count = k; posts.frustumCulled = false; world.add(posts); for (let i = 0; i < k; i++) propInst(posts, i, "post");
  }
  // 댐: 오 루즈에서 댐 앞면을 타고 올라 꼭대기 위를 지나 뒷면으로 내려감
  const sTop = CTRL_S[C.damCrestIdx], tT = TRK[idxAtS(sTop)], ang = Math.atan2(tT.tx, tT.tz), topH = surfH(sTop, 0) - 0.6;
  const dam = new THREE.Group();
  const wall = outlined(new THREE.BoxGeometry(620, topH + 6, 18), 0xb8b0a2, 0.6); wall.position.set(0, (topH + 6) / 2 - 6, 0); dam.add(wall);
  for (const fz of [-9.3, 9.3]) { for (let k = -6; k <= 6; k++) { if (Math.abs(k * 46) < tT.hw + 6) continue; const st = new THREE.Mesh(new THREE.BoxGeometry(3, topH * 0.8, 0.4), toon(0x8a8274)); st.position.set(k * 46, topH * 0.4 - 6, fz); dam.add(st); }
    for (const sx of [-1, 1]) { const nm = new THREE.Mesh(new THREE.PlaneGeometry(150, 18), new THREE.MeshBasicMaterial({ map: textTex("BLACKOUT GP", "#d8d4cc", "#ff4a1a", 1024, 128) })); nm.position.set(sx * (tT.hw + 110), topH - 14, fz + Math.sign(fz) * 0.1); nm.rotation.y = fz > 0 ? 0 : Math.PI; dam.add(nm); } }
  for (const sd of [-1, 1]) { const tower = outlined(new THREE.BoxGeometry(14, topH + 22, 22), 0x9a9284, 0.3); tower.position.set(sd * (tT.hw + 14), (topH + 22) / 2 - 6, 0); dam.add(tower); }
  dam.position.set(tT.x, 0, tT.z); dam.rotation.y = ang; world.add(dam); for (const sd of [-1, 1]) solidFromObj(dam, 7, 11, sd * (tT.hw + 14), 0, topH + 22);
  for (const sd of [-1, 1]) for (let s = sTop - 420; s < sTop + 420; s += 12) {
    const t = TRK[idxAtS(s)], h = surfH(s, 0); if (h < 4) continue; const blk = outlined(new THREE.BoxGeometry(5, h + 6, 13), 0xa8a092, 0.1), lat = sd * (t.hw + 4);
    blk.position.set(t.x + nx(t) * lat, (h + 6) / 2 - 6, t.z + nz(t) * lat); blk.rotation.y = Math.atan2(t.tx, t.tz); world.add(blk); addSolid(blk.position.x, blk.position.z, blk.rotation.y, 2.5, 6.5, -6, h + 1); }
  // 케멜 직선: 길을 감싸는 빛나는 링과 철골 게이트
  for (let k = 0; k < 4; k++) { const s = CTRL_S[13] + (CTRL_S[17] - CTRL_S[13]) * (k + 0.5) / 4, t = TRK[idxAtS(s)], R = t.hw + 10;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 1.1, 8, 48, Math.PI), glow([0x38d8ff, 0xff4fa8, 0xffd23a, 0x7cff8a][k % 4])); ring.position.set(t.x, surfH(s, 0) - 1, t.z); ring.rotation.y = Math.atan2(t.tx, t.tz); world.add(ring); }
  for (let k = 0; k < 6; k++) { const s = CTRL_S[13] + (CTRL_S[17] - CTRL_S[13]) * (k + 1) / 7 + 120, g = new THREE.Group(), t = TRK[idxAtS(s)], w = t.hw * 2 + 6;
    for (const sd of [-1, 1]) { const pl = outlined(new THREE.BoxGeometry(1, 12, 1), 0x2a2a2a, 0.06); pl.position.set(sd * w / 2, 6, 0); g.add(pl); }
    const beam = outlined(new THREE.BoxGeometry(w, 1.4, 1.2), 0x2a2a2a, 0.08); beam.position.y = 12; g.add(beam);
    for (let j = -2; j <= 2; j++) { const lt = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.6), glow(k % 2 ? 0xffd23a : 0xff6a2a)); lt.position.set(j * w / 6, 11.2, 0); g.add(lt); }
    placeOnTrack(g, s, 0, 0); for (const sd of [-1, 1]) solidFromObj(g, 0.8, 0.8, sd * w / 2, 0, 14); }
  // 숲길: 침엽수
  { const fs0 = L * 0.565, fs1 = L * 0.7, cnt = 2600, trees = new THREE.InstancedMesh(new THREE.ConeGeometry(3.2, 14, 7), toon(0x23402a), cnt), M4 = new THREE.Matrix4(); let k = 0;
    for (let s = fs0; s < fs1 && k < cnt; s += 9) for (const sd of [-1, 1]) for (let row = 0; row < 3 && k < cnt; row++) { const t = TRK[idxAtS(s)], lat = mapLat(t, sd * (HALF + 12 + row * 14 + rnd() * 8)), y = surfH(s, lat), sc = 0.7 + rnd() * 0.8; M4.makeScale(sc, sc, sc); M4.setPosition(t.x + nx(t) * lat, y + 6.5 * sc, t.z + nz(t) * lat); trees.setMatrixAt(k++, M4); }
    trees.count = k; trees.frustumCulled = false; world.add(trees); const tm = new THREE.Matrix4(), tp = new THREE.Vector3(); for (let i = 0; i < k; i++) { trees.getMatrixAt(i, tm); tp.setFromMatrixPosition(tm); const sc = tm.elements[0]; addSolid(tp.x, tp.z, 0, 0.8 * sc + 0.3, 0.8 * sc + 0.3, tp.y - 8 * sc, tp.y + 8 * sc); } }
  // 고원 결승: 관중석
  for (let s = L - 1000; s < L - 120; s += 46) for (const sd of [-1, 1]) {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) { const st = outlined(new THREE.BoxGeometry(42, 3, 6), k % 2 ? 0x3a3a44 : 0x4a4a56, 0.08); st.position.set(0, 1.5 + k * 3, sd * k * 6); g.add(st); const crowd = new THREE.Mesh(new THREE.BoxGeometry(40, 0.8, 0.8), glow([0xffd23a, 0xff6a8a, 0x8ad8ff][(k + Math.floor(s)) % 3])); crowd.position.set(0, 3.3 + k * 3, sd * (k * 6 - 2.4)); g.add(crowd); }
    const t = TRK[idxAtS(s)], ql = mapLat(t, sd * (HALF + 14)); g.position.set(t.x + nx(t) * ql, surfH(s, ql), t.z + nz(t) * ql); g.rotation.y = Math.atan2(t.tx, t.tz) - Math.PI / 2; world.add(g); solidFromObj(g, 21, 15, 0, sd * 12, 16);
  }
  // 광고판
  const ads = ["BLACKOUT GP", "REDWATER DAM", "FIRST LINE WINS", "KEEP ONE BOOST"];
  for (let k = 0; k < 10; k++) { const s = L * (k + 0.5) / 10; const sd = k % 2 ? 1 : -1, g = new THREE.Group();
    for (const dx of [-5, 5]) { const pl = outlined(new THREE.BoxGeometry(0.6, 9, 0.6), 0x3a2a1c, 0.06); pl.position.set(dx, 4.5, 0); g.add(pl); }
    const board = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 0.4), new THREE.MeshBasicMaterial({ map: textTex(ads[k % 4], k % 2 ? "#1c2430" : "#8a1f1a", "#f6e7c8") })); board.position.y = 10; g.add(board);
    placeOnTrack(g, s, sd * (HALF + 26), 0); g.rotation.y += sd * 0.5; propObj(g, "board"); }
  startGate(0xff6a2a, textTex("BLACKOUT GP", "#111", "#ff6a2a"));
}
