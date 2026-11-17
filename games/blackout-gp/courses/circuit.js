// ================= 축제 마을 (근미래) =================
const FEST = { crowdMats: [], turbines: [], anims: [] };
const MX = (x, y, z, ry, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(sx, sy, sz));
const trackAt = (s, lat) => { const t = TRK[idxAtS(s)], l = mapLat(t, lat); return [t.x + nx(t) * l, surfH(s, l), t.z + nz(t) * l, Math.atan2(t.tx, t.tz), t]; };
function windowTex(seedC, lit) { // 밤 빌딩 창문 (불 켜진 칸은 밝게)
  const c = document.createElement("canvas"); c.width = 64; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#0b0d1c"; g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 124; y += 6) for (let x = 3; x < 61; x += 6) { const r = rnd(); g.fillStyle = r < lit ? seedC[Math.floor(rnd() * seedC.length)] : "#141a33"; g.fillRect(x, y, 4, 3); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
}
function zoneAt(s) {
  const cs = CTRL_S; if (!cs) return null;
  if (s > L - 1150 || s < cs[1] + 200) return "plaza";
  if (s < cs[7]) return "town";
  if (s > cs[10] - 300 && s < cs[12] + 300) return "dam";
  if (s > cs[13] && s < cs[22]) return "farm";
  if (s > cs[23] && s < cs[27] + 300) return "forest";
  if (s > cs[29]) return "town";
  return null;
}
function instanced(geo, mat, list, outline, kind) { // list: [{m, c}] 코스 순서대로. 덩어리로 나눠서 화면 밖은 안 그림 (kind를 주면 부서지는 오브젝트로 등록)
  const CH = 300, P = new THREE.Vector3(), S = new THREE.Matrix4().makeScale(outline || 1, outline || 1, outline || 1), M = new THREE.Matrix4();
  for (let c0 = 0; c0 < list.length; c0 += CH) {
    const part = list.slice(c0, c0 + CH), g = geo.clone(), pts = part.map(o => P.setFromMatrixPosition(o.m).clone());
    const sph = new THREE.Sphere().setFromPoints(pts); sph.radius += 30; g.boundingSphere = sph;
    const im = new THREE.InstancedMesh(g, mat, part.length); part.forEach((o, i) => { im.setMatrixAt(i, o.m); if (o.c) im.setColorAt(i, o.c); }); world.add(im);
    let om = null; if (outline) { om = new THREE.InstancedMesh(g, outlineMat, part.length); om.userData.sc = S.clone(); part.forEach((o, i) => { M.multiplyMatrices(o.m, S); om.setMatrixAt(i, M); }); world.add(om); }
    if (kind === "solid") part.forEach(o => solidFromMatrix(o.m)); else if (kind) part.forEach((o, i) => propInst(im, i, kind, om, o.r ? { r: o.r } : null));
  }
}
function buildFestival() {
  const Mx = (x, y, z, ry, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz));
  const at = (s, lat) => { const t = TRK[idxAtS(s)], l = mapLat(t, lat); return [t.x + nx(t) * l, surfH(s, l), t.z + nz(t) * l, Math.atan2(t.tx, t.tz)]; };
  const HOUSE = [0xf4f1ea, 0xe8eef4, 0xf2d7c4, 0xcfe6dc, 0xf6e2a8, 0xd9d4f0];
  const bodies = [], roofs = [], panels = [], strips = [], people = [], heads = [], flags = [], tents = [], balloons = [], bales = [];
  const C = (h) => new THREE.Color(h);
  // 집: 둥근 모서리 대신 단순한 덩어리 + 태양광 지붕 + 빛나는 창 띠
  for (let s = 0; s < L; s += 26) {
    const z = zoneAt(s); if (z !== "town" && z !== "plaza" && !(z === "farm" && rnd() < 0.12)) continue;
    for (const sd of [-1, 1]) {
      if (z === "plaza" && rnd() < 0.5) continue;
      const w = 9 + rnd() * 8, h = 6 + rnd() * (z === "town" ? 10 : 5), d = 9 + rnd() * 5, lat = sd * (HALF + 24 + rnd() * 16 + w / 2);
      const [x, y, zz, ry] = at(s, lat), base = y - 1;
      bodies.push({ m: Mx(x, base + h / 2, zz, ry, w, h, d), c: C(HOUSE[Math.floor(rnd() * HOUSE.length)]) });
      roofs.push({ m: Mx(x, base + h + 0.4, zz, ry, w + 0.8, 0.8, d + 0.8), c: C(rnd() < 0.5 ? 0x3a4a5a : 0x5a5a62) });
      panels.push({ m: Mx(x, base + h + 1.0, zz, ry, w * 0.7, 0.25, d * 0.6) });
      for (let f = 0; f < Math.floor(h / 4); f++) strips.push({ m: Mx(x + Math.cos(ry) * 0 , base + 2.5 + f * 4, zz, ry, w + 0.06, 0.5, d + 0.06), c: C([0x8ff0ff, 0xffe28a, 0xff9ad0][Math.floor(rnd() * 3)]) });
      colliders.push({ x, z: zz, r: Math.max(w, d) * 0.55 });
    }
  }
  instanced(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), bodies, 1.04, "solid");
  instanced(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), roofs, 1.05);
  instanced(new THREE.BoxGeometry(1, 1, 1), toon(0x1c3a6a), panels);
  instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), strips);
  // 관중: 길가 울타리 뒤에서 팔짝팔짝
  const COL = [0xff4a1a, 0x38d8ff, 0xffd23a, 0xff4fa8, 0x7cff8a, 0xffffff, 0x8a5cff];
  for (let s = 0; s < L; s += 4.5) {
    const z = zoneAt(s); if (!z) continue;
    const dens = (z === "plaza" ? 1 : z === "dam" ? 0.9 : z === "town" ? 0.7 : z === "forest" ? 0.25 : 0.3) * (isTouch ? 0.45 : 0.7);
    for (const sd of [-1, 1]) for (let row = 0; row < (z === "plaza" || z === "dam" ? 3 : 2); row++) {
      if (rnd() > dens) continue;
      const [x, y, zz, ry] = at(s + (rnd() - 0.5) * 3, sd * (HALF + 7 + row * 1.6 + rnd() * 0.6));
      people.push({ m: Mx(x, y + 0.9, zz, ry, 0.8, 1.7, 0.5), c: C(COL[Math.floor(rnd() * COL.length)]) });
      heads.push({ m: Mx(x, y + 2.0, zz, ry, 0.55, 0.55, 0.55), c: C([0xf2c9a0, 0xc8946a, 0x8a5a3a, 0xf6dcc0][Math.floor(rnd() * 4)]) });
    }
  }
  const crowdMat = (base) => { const m = toon(base); m.onBeforeCompile = sh => { sh.uniforms.uTime = FEST.time; sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed.y += abs(sin(uTime * 7.0 + float(gl_InstanceID) * 1.7)) * 0.35 / 1.7;"); }; return m; };
  FEST.time = { value: 0 };
  instanced(new THREE.BoxGeometry(1, 1, 1), crowdMat(0xffffff), people, 1.12);
  instanced(new THREE.SphereGeometry(1, 6, 4), crowdMat(0xffffff), heads);
  // 울타리: 마을·광장·댐 구간 길가
  const fenceOn = t => { const z = zoneAt(t.s); return z === "town" || z === "plaza" || z === "dam"; };
  for (const t of TRK) t.fence = fenceOn(t); // 가드레일 충돌용
  for (const sd of [-1, 1]) { // 가드레일: 기둥 위에 가로 빔 + 빨간 반사띠 (띠를 빔보다 살짝 앞에 둬서 겹쳐 깜빡이지 않게)
    const B = sd * (HALF + 5.5);
    ribbon(B, B, 0, 0xdfe3e6, { y0: (t, l) => surfH(t.s, l) + 0.42, y1: (t, l) => surfH(t.s, l) + 0.98, only: fenceOn });
    ribbon(B - sd * 0.12, B - sd * 0.12, 0, 0xe2283a, { y0: (t, l) => surfH(t.s, l) + 0.6, y1: (t, l) => surfH(t.s, l) + 0.8, only: fenceOn, mat: new THREE.MeshBasicMaterial({ color: 0xe2283a, side: THREE.DoubleSide }) });
    const spots = []; for (let i = 0; i < N; i += 3) if (fenceOn(TRK[i])) spots.push(i);
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1, 0.16), toon(0x8a8f96), spots.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(1, 1, 1);
    spots.forEach((i, k) => { const t = TRK[i], l = mapLat(t, B + sd * 0.22), y = surfH(t.s, l), h = 1.0; Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(t.tx, t.tz)); Sc.set(1, h, 1); M.compose(new THREE.Vector3(t.x + nx(t) * l, y + h / 2, t.z + nz(t) * l), Q, Sc); posts.setMatrixAt(k, M); });
    posts.castShadow = true; posts.receiveShadow = true; world.add(posts); }
  // 길을 가로지르는 만국기 줄
  const FC = [0xff4a1a, 0xffd23a, 0x38d8ff, 0xffffff, 0x7cff8a, 0xff4fa8];
  const poleList = [];
  for (let s = 0; s < L; s += 70) {
    const z = zoneAt(s); if (z !== "town" && z !== "plaza") continue;
    const t = TRK[idxAtS(s)], w = t.hw + 6, ry = Math.atan2(t.tx, t.tz), y = surfH(s, 0);
    for (const sd of [-1, 1]) { const [x, yy, zz] = at(s, sd * (HALF + 6)); poleList.push({ m: Mx(x, yy + 5.5, zz, ry, 0.35, 11, 0.35) }); }
    const n = 18;
    for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, lat = -w + 2 * w * u, sag = 2.2 * Math.sin(Math.PI * u), [x, , zz] = at(s, lat); flags.push({ m: Mx(x, y + 10.5 - sag, zz, ry, 1, 1, 1), c: C(FC[k % FC.length]) }); }
  }
  instanced(new THREE.BoxGeometry(1, 1, 1), toon(0xdddddd), poleList, 1.1); for (const o of poleList) solidFromMatrix(o.m, 0.3);
  const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.Float32BufferAttribute([-0.7, 0, 0, 0.7, 0, 0, 0, -1.4, 0], 3)); tri.computeVertexNormals();
  instanced(tri, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), flags);
  // 광장: 천막과 풍선, 풍력발전기는 들판에
  for (let s = L - 1100; s < L + 500; s += 38) for (const sd of [-1, 1]) { if (rnd() < 0.35) continue; const [x, y, zz, ry] = at(s, sd * (HALF + 16 + rnd() * 6)); tents.push({ m: Mx(x, y + 2.5, zz, ry + Math.PI / 4, 1, 1, 1), c: C(FC[Math.floor(rnd() * FC.length)]) }); }
  instanced(new THREE.ConeGeometry(4.2, 5, 4), toon(0xffffff), tents, 1.06); for (const o of tents) { const P_ = new THREE.Vector3().setFromMatrixPosition(o.m); addSolid(P_.x, P_.z, 0, 3, 3, P_.y - 3, P_.y + 3); }
  for (let k = 0; k < 70; k++) { const s = L - 1100 + rnd() * 1500, [x, y, zz] = at(s, (rnd() - 0.5) * 2 * (HALF + 40)); balloons.push({ m: Mx(x, y + 25 + rnd() * 40, zz, 0, 1.6, 2, 1.6), c: C(FC[Math.floor(rnd() * FC.length)]) }); }
  instanced(new THREE.SphereGeometry(1, 10, 8), toon(0xffffff), balloons, 1.08);
  for (let s = CTRL_S[13]; s < CTRL_S[22]; s += 9) for (const sd of [-1, 1]) { if (rnd() < 0.85) continue; const [x, y, zz, ry] = at(s, sd * (HALF + 12 + rnd() * 30)); bales.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.9, zz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, Math.PI / 2)), new THREE.Vector3(1.8, 1.6, 1.8)) }); }
  instanced(new THREE.CylinderGeometry(1, 1, 1, 12), toon(0xe0b84a), bales, 1.06, "bale");
  // 들판 무늬 (밭)
  for (let s = CTRL_S[13]; s < CTRL_S[22]; s += 160) for (const sd of [-1, 1]) { const [x, y, zz, ry] = at(s, sd * (HALF + 90)); const f = new THREE.Mesh(new THREE.PlaneGeometry(120, 140), toon([0x8fbf4a, 0xd8c35a, 0x6aa84a, 0xc8a050][Math.floor(rnd() * 4)])); f.rotation.set(-Math.PI / 2, 0, ry); f.position.set(x, y + 0.08, zz); world.add(f); }
  for (let k = 0; k < 16; k++) { // 미래형 풍력발전기
    const s = CTRL_S[13] + (CTRL_S[22] - CTRL_S[13]) * (k + 0.5) / 16, sd = k % 2 ? 1 : -1, [x, y, zz, ry] = at(s, sd * (HALF + 120 + rnd() * 80));
    const g = new THREE.Group(), mast = outlined(new THREE.CylinderGeometry(0.9, 1.8, 60, 10), 0xf4f4f4, 0.15); mast.position.y = 30; g.add(mast);
    const hub = new THREE.Group(); hub.position.set(0, 60, 2.2); for (let b = 0; b < 3; b++) { const bl = outlined(new THREE.BoxGeometry(2, 26, 0.5), 0xffffff, 0.08); bl.position.y = 13; const arm = new THREE.Group(); arm.add(bl); arm.rotation.z = b * Math.PI * 2 / 3; hub.add(arm); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.25, 6, 16), glow(0x38d8ff)); hub.add(ring); g.add(hub);
    g.position.set(x, y, zz); g.rotation.y = ry + Math.PI / 2; world.add(g); FEST.turbines.push(hub); addSolid(x, zz, 0, 1.8, 1.8, y - 2, y + 60);
  }
  // 멀리 둥근 초록 언덕과 미래 도시 실루엣
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9; for (const t of TRK) { minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x); minZ = Math.min(minZ, t.z); maxZ = Math.max(maxZ, t.z); }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, R0 = Math.max(maxX - minX, maxZ - minZ) * 0.65;
  for (let k = 0; k < 40; k++) { const a = rnd() * Math.PI * 2, R = R0 + rnd() * 1800, r = 300 + rnd() * 500, hill = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), toon([0x4f7f3e, 0x5a8a46, 0x6a9a50][k % 3])); hill.scale.y = 0.35 + rnd() * 0.3; hill.position.set(cx + Math.cos(a) * R, -r * 0.1, cz + Math.sin(a) * R); world.add(hill); }
  for (let k = 0; k < 14; k++) { const a = -0.6 + k * 0.09, R = R0 + 2600, h = 200 + rnd() * 380, w = 50 + rnd() * 60, tw = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.6, w, h, 8), new THREE.MeshBasicMaterial({ color: 0xa8c4dc, fog: false })); tw.position.set(cx + Math.cos(a) * R, h / 2, cz + Math.sin(a) * R); world.add(tw); }
}
function buildCircuit() {
  TEX.road = TEX.road || noiseTex("#ffffff", [["#5a5a5a", 0.5], ["#ffffff", 0.6], ["#8a8a8a", 0.5]]);
  for (let k = 0; k < 4; k++) ribbon(-HALF + k * HALF / 2, -HALF + (k + 1) * HALF / 2, 0, 0x45454e, { tex: TEX.road, uvU: 6, uvV: 6 });
  ribbon(-HALF + 0.5, -HALF + 0.9, 0.03, 0xffffff); ribbon(HALF - 0.9, HALF - 0.5, 0.03, 0xffffff);
  for (const sd of [-1, 1]) { ribbon(sd * HALF, sd * (HALF + 1.8), 0.03, 0xf1efe8); ribbon(sd * HALF, sd * (HALF + 1.8), 0.05, 0xe2283a, { dash: 4 }); }
  TEX.grass = TEX.grass || noiseTex("#ffffff", [["#7a7a7a", 0.45], ["#ffffff", 0.5]], 256, true);
  terrain([[HALF, HALF + C.barrier, 0x2b2e36], [HALF + C.barrier, HALF + 40, 0x1c3a28], [HALF + 40, HALF + 81, 0x16301f]], TEX.grass);
  // 방호벽 (부딪혀도 미끄러지듯 흘려보냄)
  const B = HALF + C.barrier;
  for (const sd of [-1, 1]) {
    ribbon(sd * B, sd * B, 0, 0xb8bcc8, { y0: t => surfH(t.s, sd * B), y1: t => surfH(t.s, sd * B) + 1.3 });
    ribbon(sd * B, sd * (B + 0.2), 1.32, 0, { mat: glow(sd > 0 ? 0x38d8ff : 0xff3bd4) });
  }
  // 거대한 고리 아치
  const archCols = [0x38d8ff, 0xff3bd4, 0xffd23a];
  for (let k = 0; k < 9; k++) {
    const s = L * (k + 0.15) / 9, R = hwAt(s) + C.barrier + 4;
    const arch = new THREE.Group(), tor = new THREE.Mesh(new THREE.TorusGeometry(R, 1.4, 8, 40, Math.PI), glow(archCols[k % 3])), back = new THREE.Mesh(new THREE.TorusGeometry(R, 2.6, 8, 40, Math.PI), toon(0x15151c));
    back.position.z = -1.5; arch.add(back, tor); placeOnTrack(arch, s, 0, 0); arch.position.y = Math.min(surfH(s, R), surfH(s, -R), surfH(s, 0)) - 2; // 뱅크로 한쪽이 낮아도 양 다리가 땅에 박히게
  }
  // 관중석
  function stand(s0, s1, sd) {
    for (let s = s0; s < s1; s += 42) {
      const g = new THREE.Group();
      for (let k = 0; k < 7; k++) { const st = outlined(new THREE.BoxGeometry(40, 3.2, 6), k % 2 ? 0x2a3550 : 0x34406a, 0.08); st.position.set(0, 1.6 + k * 3.2, sd * (k * 6)); g.add(st);
        const crowd = new THREE.Mesh(new THREE.BoxGeometry(38, 0.8, 0.8), glow([0xffd23a, 0xff6a8a, 0x8ad8ff][(k + Math.floor(s)) % 3])); crowd.position.set(0, 3.4 + k * 3.2, sd * (k * 6 - 2.4)); g.add(crowd); }
      const roof = outlined(new THREE.BoxGeometry(42, 1, 46), 0x111118, 0.1); roof.position.set(0, 27, sd * 18); g.add(roof);
      const lt = new THREE.Mesh(new THREE.BoxGeometry(42, 0.4, 1), glow(0xffffff)); lt.position.set(0, 26.4, sd * -4); g.add(lt);
      const t = TRK[idxAtS(s)], ql = mapLat(t, sd * (B + 8)); g.position.set(t.x + nx(t) * ql, surfH(s, ql), t.z + nz(t) * ql);
      g.rotation.y = Math.atan2(t.tx, t.tz) - Math.PI / 2; world.add(g);
    }
  }
  stand(60, 900, 1); stand(60, 900, -1); stand(L * 0.5, L * 0.5 + 300, 1);
  // 조명탑
  for (let i = 0; i < N; i += 110) {
    const sd = (i / 110) % 2 ? 1 : -1, s = TRK[i].s;
    const pole = outlined(new THREE.BoxGeometry(1.2, 34, 1.2), 0x22222a, 0.08); placeOnTrack(pole, s, sd * (B + 5), 17);
    const head = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 1.2), glow(0xf4f6ff)); placeOnTrack(head, s, sd * (B + 4), 34);
    const hp_ = linkedProp({ kind: "lamp", obj: head, x: 0, z: 0, y: 0 }); propObj(pole, "lamp", { yOff: 17, link: [hp_] });
  }
  // 멀리 서 있는 거대 탑들 (로보월드 느낌)
  const towerCols = [0x38d8ff, 0xff3bd4, 0xffd23a, 0x7cff8a];
  for (let k = 0; k < 26; k++) {
    const a = k / 26 * Math.PI * 2 + rnd() * 0.1, R = (1500 + rnd() * 700) * WS, h = 300 + rnd() * 800, w = 60 + rnd() * 110;
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), toon(0x101020)); body.position.y = h / 2; g.add(body);
    for (let j = 1; j < 6; j++) { const band = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 3, w + 1), new THREE.MeshBasicMaterial({ color: towerCols[(k + j) % 4], fog: false })); band.position.y = h * j / 6; g.add(band); }
    const top = new THREE.Mesh(new THREE.ConeGeometry(w * 0.4, 60, 4), new THREE.MeshBasicMaterial({ color: towerCols[k % 4], fog: false })); top.position.y = h + 30; g.add(top);
    g.position.set(Math.cos(a) * R + 30 * WS, 0, Math.sin(a) * R + 320 * WS); world.add(g);
  }
  // 고가 구간 기둥
  for (let i = 0; i < N; i += 12) { const t = TRK[i]; if (t.base < 3) continue; const col = outlined(new THREE.BoxGeometry(2.4, t.base, 2.4), 0x2a2a34, 0.08); placeOnTrack(col, t.s, 0, -t.base / 2); col.position.y = t.base / 2 - 0.2; }
  // 대형 전광판
  const scr = new THREE.Group(), frame = outlined(new THREE.BoxGeometry(60, 26, 3), 0x111118, 0.2); frame.position.y = 40; scr.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(56, 22), new THREE.MeshBasicMaterial({ map: textTex("BLACKOUT GP", "#0b1440", "#38d8ff", 1024, 400) })); face.position.set(0, 40, -1.6); face.rotation.y = Math.PI; scr.add(face);
  for (const dx of [-20, 20]) { const leg = outlined(new THREE.BoxGeometry(3, 28, 3), 0x22222a, 0.1); leg.position.set(dx, 14, 0); scr.add(leg); }
  placeOnTrack(scr, 300, -(B + 70), 0); scr.rotation.y += Math.PI / 2;
  circuitDecor(B);
  startGate(0x38d8ff, textTex("BLACKOUT GP", "#0b1440", "#38d8ff"));
}
function circuitDecor(B) {
  // 방호벽 뒤 광고판 (트랙 쪽을 보게)
  const ADS = [["BLACKOUT GP", "#0b1440", "#38d8ff"], ["DUKE MOTORS", "#1f6fd6", "#ffffff"], ["HEX ENERGY", "#2a0d40", "#ff3bd4"], ["ZERO LINE", "#111111", "#ff2a2a"], ["BIG MO TIRES", "#ffb21a", "#111111"], ["NO BRAKES", "#7cff8a", "#0b1a10"]];
  const adLists = ADS.map(() => []), frameList = [];
  for (let i = 0, k = 0; i < N; i += 26, k++) for (const sd of [-1, 1]) {
    if ((k + (sd > 0 ? 1 : 0)) % 3 === 2) continue;
    const t = TRK[i], l = mapLat(t, sd * (B + 2.2)), x = t.x + nx(t) * l, z = t.z + nz(t) * l, y = surfH(t.s, l), ry = Math.atan2(-sd * nx(t), -sd * nz(t));
    adLists[(k * 2 + (sd > 0 ? 1 : 0)) % ADS.length].push({ m: MX(x, y + 3, z, ry, 1, 1, 1) });
    frameList.push({ m: MX(x + sd * nx(t) * 0.25, y + 3, z + sd * nz(t) * 0.25, ry, 1, 1, 1) });
  }
  ADS.forEach((a, j) => { if (adLists[j].length) instanced(new THREE.PlaneGeometry(14, 3.4), new THREE.MeshBasicMaterial({ map: textTex(a[0], a[1], a[2], 512, 124), side: THREE.DoubleSide }), adLists[j], 0, "adboard"); });
  instanced(new THREE.BoxGeometry(14.6, 4, 0.4), toon(0x15151c), frameList, 0, "adboard");
  // 주변 빌딩 숲 (불 켜진 창문)
  const WT = [windowTex(["#ffd88a", "#fff2c8"], 0.35), windowTex(["#8ad8ff", "#ffffff"], 0.3), windowTex(["#ff8ad8", "#ffd23a"], 0.25)];
  const bl = [[], [], []], roofs = [];
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9; for (const t of TRK) { minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x); minZ = Math.min(minZ, t.z); maxZ = Math.max(maxZ, t.z); }
  const RC = [0x38d8ff, 0xff3bd4, 0xffd23a, 0xff3b3b];
  for (let tries = 0, n = 0; tries < 3000 && n < 230; tries++) {
    const x = minX - 700 + rnd() * (maxX - minX + 1400), z = minZ - 700 + rnd() * (maxZ - minZ + 1400), d = trackDist(x, z);
    if (d < B + 150 || d > B + 700) continue;
    const w = 24 + rnd() * 40, dp = 24 + rnd() * 40, h = 30 + rnd() * 120 * (0.4 + (d - B) / 700), ry = rnd() * Math.PI;
    bl[n % 3].push({ m: MX(x, h / 2 - 4, z, ry, w, h, dp) }); roofs.push({ m: MX(x, h - 4 + 0.6, z, ry, w * 0.9, 1.2, dp * 0.9), c: new THREE.Color(RC[n % 4]) }); n++;
  }
  bl.forEach((L_, j) => instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: WT[j] }), L_));
  instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), roofs);
  // 코너 바깥쪽 대형 화면 (글자가 흘러감)
  for (const f of [0.22, 0.46, 0.66, 0.88]) {
    const s = L * f, t = TRK[idxAtS(s)], sd = t.kside || 1, g = new THREE.Group();
    const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const cg = c.getContext("2d");
    const bands = ["#38d8ff", "#ff3bd4", "#ffd23a"]; for (let k = 0; k < 3; k++) { cg.fillStyle = bands[k]; cg.fillRect(k * 341, 0, 342, 256); }
    cg.fillStyle = "#0b0d1c"; cg.fillRect(0, 40, 1024, 176); cg.fillStyle = "#ffffff"; cg.font = "900 italic 150px sans-serif"; cg.textBaseline = "middle"; cg.fillText("BLACKOUT GP  ★  ", 10, 132);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(48, 14), new THREE.MeshBasicMaterial({ map: tex })); face.position.set(0, 30, 1.6); g.add(face);
    const fr = outlined(new THREE.BoxGeometry(52, 18, 3), 0x111118, 0.2); fr.position.y = 30; g.add(fr);
    for (const dx of [-16, 16]) { const leg = outlined(new THREE.BoxGeometry(2.5, 22, 2.5), 0x22222a, 0.1); leg.position.set(dx, 11, 0); g.add(leg); }
    const [x, y, z] = trackAt(s, sd * (B + 40)); g.position.set(x, y, z); g.rotation.y = Math.atan2(-sd * nx(t), -sd * nz(t)); world.add(g);
    FEST.anims.push(dt => { tex.offset.x += dt * 0.12; });
  }
  // 하늘을 훑는 서치라이트
  const beamGeo = new THREE.CylinderGeometry(9, 0.8, 420, 16, 1, true); beamGeo.translate(0, 210, 0);
  for (let k = 0; k < 10; k++) {
    const s = L * (k + 0.4) / 10, sd = k % 2 ? 1 : -1, [x, y, z] = trackAt(s, sd * (B + 22));
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: [0x9fd8ff, 0xffb8ec, 0xfff1b8][k % 3], transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, y, z); world.add(m);
    const base = outlined(new THREE.CylinderGeometry(1.6, 2, 2, 10), 0x22222a, 0.1); base.position.set(x, y + 1, z); world.add(base);
    const ph = rnd() * 6, sp = 0.25 + rnd() * 0.3;
    FEST.anims.push(dt => { const tt = (FEST.clock = (FEST.clock || 0) + dt / 10) * sp * 10 + ph; m.rotation.set(0.35 + Math.sin(tt * 0.7) * 0.25, 0, Math.sin(tt) * 0.5, "YXZ"); m.rotation.y = tt * 0.3; });
  }
  // 하늘에 떠다니는 비행선
  let cx = 0, cz = 0; for (const t of TRK) { cx += t.x; cz += t.z; } cx /= N; cz /= N;
  for (let k = 0; k < 2; k++) {
    const g = new THREE.Group(), body = outlined(new THREE.SphereGeometry(1, 20, 12), k ? 0xe8e8f0 : 0x1a1a24, 0.02); body.scale.set(16, 16, 60); g.add(body);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(16.3, 16.3, 26, 24, 1, true), new THREE.MeshBasicMaterial({ map: textTex("  BLACKOUT GP  ", k ? "#ff3bd4" : "#38d8ff", "#0b0d1c", 1024, 128), side: THREE.DoubleSide }));
    band.rotation.x = Math.PI / 2; band.scale.set(1, 1, 0.55); g.add(band);
    for (const r of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const fin = outlined(new THREE.BoxGeometry(0.8, 14, 10), k ? 0xff3bd4 : 0x38d8ff, 0.1); fin.position.set(Math.sin(r) * 9, Math.cos(r) * 9, -52); fin.rotation.z = -r; g.add(fin); }
    const gon = outlined(new THREE.BoxGeometry(6, 4, 14), 0x22222a, 0.1); gon.position.y = -17; g.add(gon);
    world.add(g); const R = 900 + k * 500, hgt = 170 + k * 60, ph = k * 2.5, sp = k ? -0.018 : 0.025; let a = ph;
    FEST.anims.push(dt => { a += dt * sp; g.position.set(cx + Math.cos(a) * R, hgt + Math.sin(a * 3) * 6, cz + Math.sin(a) * R); g.rotation.y = -a + (sp > 0 ? Math.PI : 0); });
  }
}
