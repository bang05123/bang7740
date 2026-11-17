// o: { len, color, accent, wing, scoop, num, rim, rust, pipes }
function carDetail0(K, o, W, zz, P) { /* 주인공 0번 세밀 부품: 패널 틈, 손잡이, 사이드 파이프, 보닛 핀·루버, 블로워 리브, 창틀, 뒷유리 루버, 미러, 안테나, 주유구, 범퍼, 번호판 */
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), Cyl = (r, h, sg = 8) => new THREE.CylinderGeometry(r, r, h, sg), PI = Math.PI;
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  const rod = (a, b, w, h) => { _a.set(...a); _b.set(...b); const d = _b.clone().sub(_a), len = d.length(); _q.setFromUnitVectors(Z, d.normalize()); _e.setFromQuaternion(_q); return [B(w, h, len), (_a.x + _b.x) / 2, (_a.y + _b.y) / 2, (_a.z + _b.z) / 2, _e.x, _e.y, _e.z]; };
  const on = (pt, col, items, basic) => { if (!pt || !items.length) return null; const px = pt.position; const m = new THREE.Mesh(catGeos(items.map(([g, x, y, z, rx, ry, rz]) => [g, x - px.x, y - px.y, z - px.z, rx, ry, rz])), basic ? glow(col) : toon(col)); pt.add(m); return m; };
  const lerpY = (pts, z) => { for (let i = 0; i < pts.length - 1; i++) { const [z0, y0] = pts[i], [z1, y1] = pts[i + 1]; if ((z - z0) * (z - z1) <= 0) return y0 + (y1 - y0) * (z - z0) / ((z1 - z0) || 1); } return pts[pts.length - 1][1]; };
  const along = (pts, n, t0, t1, fn) => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); const T = L[L.length - 1];
    for (let k = 0; k < n; k++) { const d = (t0 + (t1 - t0) * k / Math.max(1, n - 1)) * T; let i = 1; while (i < L.length - 1 && L[i] < d) i++; const f = (d - L[i - 1]) / (L[i] - L[i - 1]); fn(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); } };
  const zp = a => a.map(([z, y]) => [zz(z), y]);
  const topP = zp([[-3.3, 0.48], [-3.27, 1.08], [-2.55, 1.16], [-1.2, 1.2], [0.9, 1.17], [2.4, 1.06], [3.18, 0.9], [3.32, 0.52]]), top = z => lerpY(topP, z) + 0.045; /* 모서리 깎임만큼 위 */
  const slope = (fy, z) => -Math.atan((fy(z + 0.05) - fy(z - 0.05)) / 0.1);
  const DARK = 0x161616, CHROME = 0xc8c8c8, RIV = 0x8c8c8c, ARM = 0x3c3e44, GREY = 0x6a6a6a;
  const rivS = Cyl(0.03, 0.03, 8).rotateZ(PI / 2), rivU = Cyl(0.03, 0.025, 8);
  const body = P.body, seams = [], chrome = [], rivs = [], acc = [];
  for (const sd of [-1, 1]) { const X = sd * 1.155;
    for (const z of [1.32, -0.92]) seams.push([B(0.03, 0.46, 0.03), X, 0.9, zz(z)]); // 문 틈
    seams.push([B(0.03, 0.025, zz(2.24)), X, 0.69, zz(0.2)]);
    seams.push([B(0.03, 0.08, 0.28), X, 1.04, zz(-0.55)]); chrome.push([B(0.05, 0.035, 0.22), X + sd * 0.012, 1.05, zz(-0.55)]); // 손잡이
    acc.push([B(0.02, 0.035, zz(2.2)), X + sd * 0.004, 0.96, zz(0.2)]); // 핀스트라이프
    chrome.push([B(0.42, 0.05, 0.16), sd * 0.79, 0.975, zz(3.15), -0.3]); // 헤드라이트 눈썹 (차체색 아래 크롬 테)
  }
  // 보닛 핀·루버
  for (const sx of [-0.72, 0.72]) { const z = zz(2.85), y = top(z); chrome.push([Cyl(0.035, 0.06, 8), sx, y + 0.02, z]); chrome.push([new THREE.TorusGeometry(0.055, 0.011, 5, 12).rotateX(PI / 2), sx, y + 0.012, z]); }
  for (const sx of [-0.62, 0.62]) for (let k = 0; k < 5; k++) { const z = zz(2.15 + k * 0.13); seams.push([B(0.3, 0.03, 0.045), sx, top(z) + 0.014, z, slope(top, z)]); }
  // 뒤: 후미등 틀, 번호판
  seams.push([B(W * 0.9, 0.22, 0.04), 0, 0.96, zz(-3.315)]);
  seams.push([B(0.56, 0.24, 0.015), 0, 0.66, zz(-3.303)]);
  on(body, DARK, seams); on(body, CHROME, chrome); on(body, RIV, rivs); on(body, o.accent ?? 0x111111, acc); on(body, 0xe8e2c8, [[B(0.5, 0.19, 0.02), 0, 0.66, zz(-3.312)]]);
  on(body, 0xfff2b0, [[Cyl(0.07, 0.04, 12).rotateX(PI / 2), -0.86, 0.6, zz(3.31)], [Cyl(0.07, 0.04, 12).rotateX(PI / 2), 0.86, 0.6, zz(3.31)]], true); // 안개등
  // 펜더 리벳 + 아가미
  (P.ff || []).forEach(pt => { const sd = Math.sign(pt.position.x), r = [];
    on(pt, DARK, [0, 1, 2].map(k => [B(0.025, 0.15, 0.035), sd * 1.335, 0.95, zz(1.95 + k * 0.12), 0.35])); });
  (P.rf || []).forEach(pt => { const sd = Math.sign(pt.position.x), r = [];
    if (sd > 0) { const z = zz(-1.85), y = 1.28; on(pt, CHROME, [[Cyl(0.1, 0.04, 16), sd * 1.23, y + 0.02, z], ...[0, 1, 2, 3, 4, 5].map(k => [rivU, sd * 1.23 + Math.cos(k * PI / 3) * 0.13, y + 0.01, z + Math.sin(k * PI / 3) * 0.13])]); } }); // 주유구
  // 하부 장갑판
  if (P.under) { const it = [], rv = []; for (const sd of [-1, 1]) { it.push([B(0.03, 0.2, zz(1.9)), sd * 1.19, 0.53, zz(0.2)]); } for (let k = -2; k <= 2; k++) it.push([B(0.03, 0.16, 0.45), k * 0.2, 0.38, zz(-3.1)]); on(P.under, ARM, it); }
  // 블로워 리브·풀리, 흡기구 그릴
  if (P.blower) { const it = []; for (const sx of [-0.43, 0.43]) for (let k = 0; k < 7; k++) it.push([B(0.025, 0.34, 0.03), sx, 1.33, zz(0.92) + k * zz(0.14)]); on(P.blower, GREY, it); on(P.blower, DARK, [[Cyl(0.13, 0.05, 14).rotateX(PI / 2), 0.2, 1.24, zz(1.35) + 0.53], [Cyl(0.05, 0.07, 8).rotateX(PI / 2), 0.2, 1.24, zz(1.35) + 0.55]]); }
  if (P.intake) { const it = []; for (let k = 0; k < 4; k++) { const y = 1.56 + k * 0.065, z = zz(0.88) + 0.85 + (1.8 - y) / 0.3 * 0.1 + 0.02; it.push([B(0.6, 0.025, 0.03), 0, y, z]); } on(P.intake, CHROME, it); }
  // 캐빈: 창틀, 와이퍼, 뒷유리 루버
  if (P.cabin) { const tr = [], dk = [], lv = []; const hw = y => 0.92 * (1 - 0.26 * (y - 1.08) / 0.56);
    for (const sd of [-1, 1]) { tr.push(rod([sd * hw(1.16) + sd * 0.01, 1.16, zz(1.04)], [sd * hw(1.58) + sd * 0.01, 1.58, zz(0.27)], 0.05, 0.04)); // A필러
      tr.push(rod([sd * 0.915, top(zz(-2.4)) + 0.02, zz(-2.4)], [sd * 0.915, top(zz(-1.2)) + 0.02, zz(-1.2)], 0.025, 0.03), rod([sd * 0.915, top(zz(-1.2)) + 0.02, zz(-1.2)], [sd * 0.915, top(zz(1.0)) + 0.02, zz(1.0)], 0.025, 0.03)); } // 허리 크롬
    dk.push(rod([-0.55, 1.2, zz(0.99)], [0.12, 1.25, zz(0.92)], 0.03, 0.02), rod([0.05, 1.2, zz(0.99)], [0.7, 1.25, zz(0.92)], 0.03, 0.02)); // 와이퍼
    const cab = z => lerpY(zp([[-2.5, 1.14], [-1.4, 1.45], [-0.45, 1.6]]), z);
    for (let k = 0; k < 8; k++) { const z = zz(-2.15 + k * 0.17), y = cab(z); lv.push([B(hw(y) * 1.6, 0.03, 0.09), 0, y + 0.06, z, slope(cab, z)]); }
    lv.push(rod([0, cab(zz(-2.2)) + 0.085, zz(-2.2)], [0, cab(zz(-0.95)) + 0.085, zz(-0.95)], 0.06, 0.04));
    on(P.cabin, 0x9a9a9a, tr); on(P.cabin, DARK, dk); on(P.cabin, o.color, lv); }
  if (P.roof) {
    on(P.roof, DARK, [rod([0.38, 1.63, zz(-0.55)], [0.38, 2.12, zz(-0.85)], 0.018, 0.018)]); } // 안테나
  // 떨어지는 부품: 사이드 파이프·열판, 미러, 범퍼, 스포일러 날개판
  for (const sd of [-1, 1]) {
    const pipe = K.part("사이드 파이프", Cyl(0.08, zz(2.0), 12).rotateX(PI / 2), CHROME, sd * 1.27, 0.42, zz(0.15), 0.02);
    on(pipe, DARK, [[new THREE.TorusGeometry(0.08, 0.016, 6, 12), sd * 1.27, 0.42, zz(1.15)], [Cyl(0.065, 0.02, 12).rotateX(PI / 2), sd * 1.27, 0.42, zz(-0.86)]]);
    const sh = K.part("열 차폐판", B(0.035, 0.15, zz(1.4)), ARM, sd * 1.36, 0.44, zz(0.15), 0.02), dots = [];
    for (const y of [0.41, 0.47]) for (let k = 0; k < 9; k++) dots.push([B(0.012, 0.03, 0.03), sd * 1.379, y, zz(-0.45 + k * 0.15)]); on(sh, DARK, dots);
    const mr = K.part("사이드 미러", B(0.08, 0.11, 0.17), o.color, sd * 1.05, 1.34, zz(0.78), 0.02);
    on(mr, DARK, [rod([sd * 1.03, 1.3, zz(0.8)], [sd * 0.9, 1.21, zz(0.86)], 0.03, 0.03), [B(0.01, 0.08, 0.13), sd * 1.05 - sd * 0.045, 1.34, zz(0.78)]]);
    if (o.wing !== "none" && P.spoiler) K.part("스포일러 날개판", B(0.04, 0.24, 0.62), 0x111111, sd * 1.17, 1.3, zz(-3.04), 0.02);
  }
  const bp = K.part("범퍼", Cyl(0.05, W * 0.86, 10).rotateZ(PI / 2), CHROME, 0, 0.47, zz(3.38), 0.02);
  on(bp, CHROME, [-0.55, 0.55].map(x => rod([x, 0.47, zz(3.38)], [x, 0.56, zz(3.27)], 0.04, 0.04))); on(bp, 0xd22a1a, [[new THREE.TorusGeometry(0.07, 0.02, 6, 12).rotateY(PI / 2), 0.66, 0.41, zz(3.44)]]);
  if (P.spoiler) on(P.spoiler, o.color, [[B(W * 0.96, 0.06, 0.02), 0, 1.28, zz(-3.355)]]);
}
function makeCar(o, parent = scene) {
  METAL = !o.rust;
  const K = carKit(o.color, o.accent), s = (o.len || 6.6) / 6.6, W = 2.3, zz = v => v * s;
  // 아래 차체: 높고 두꺼운 옆판, 길게 뻗은 보닛, 각진 꺾임
  const parts0 = {}; parts0.body = K.part("차체", sideGeo([[zz(-3.3), 0.48], [zz(-3.27), 1.08], [zz(-2.55), 1.16], [zz(-1.2), 1.2], [zz(0.9), 1.17], [zz(2.4), 1.06], [zz(3.18), 0.9], [zz(3.32), 0.52]], W, { bottom: 0.34, bevel: 0.05, sharp: true, taperF: 0.9, taperZ: zz(2.0), taperR: 0.95, taperZr: zz(-2.6) }), o.color, 0, 0, 0);
  // 아래쪽 검은 덩어리 (레드라인식 진한 그림자 면)
  parts0.under = K.part("하부", sideGeo([[zz(-3.28), 0.36], [zz(-3.28), 0.66], [zz(3.28), 0.62], [zz(3.3), 0.36]], W + 0.04, { bottom: 0.3, bevel: 0.03, sharp: true, taperF: 0.9, taperZ: zz(2.0) }), 0x141414, 0, 0, 0, 0.05);
  // 캐빈: 낮고 넓게, 각진 패스트백
  parts0.cabin = K.part("캐빈", sideGeo([[zz(-2.5), 1.14], [zz(-1.4), 1.45], [zz(-0.45), 1.6], [zz(0.25), 1.59], [zz(1.05), 1.15]], W * 0.8, { bottom: 1.08, bevel: 0.04, sharp: true, tumble: 0.26 }), 0x0e1620, 0, 0, 0, 0.06);
  parts0.roof = K.part("지붕", sideGeo([[zz(-1.0), 1.53], [zz(-0.4), 1.64], [zz(0.2), 1.63]], W * 0.6, { bottom: 1.5, bevel: 0.02, sharp: true }), o.color, 0, 0, 0, 0.04);
  // 각진 펜더 플레어 (뒤쪽이 더 크게 솟은 근육)
  for (const sd of [-1, 1]) {
    (parts0.ff = parts0.ff || []).push(K.part("앞 펜더", sideGeo([[zz(1.45), 0.6], [zz(1.7), 1.14], [zz(2.55), 1.1], [zz(2.9), 0.62]], 0.26, { bottom: 0.55, bevel: 0.03, sharp: true }), o.color, sd * (W / 2 + 0.05), 0, 0, 0.06));
    (parts0.rf = parts0.rf || []).push(K.part("뒷 펜더", sideGeo([[zz(-2.85), 0.62], [zz(-2.55), 1.22], [zz(-1.45), 1.26], [zz(-1.05), 0.62]], 0.34, { bottom: 0.55, bevel: 0.03, sharp: true }), o.color, sd * (W / 2 + 0.08), 0, 0, 0.06));
  }
  // 보닛을 뚫고 나온 블로워 + 흡기구
  if (o.scoop !== false) {
    parts0.blower = K.part("블로워", new THREE.BoxGeometry(0.85, 0.42, 1.0), 0x8a8a8a, 0, 1.33, zz(1.35), 0.06);
    parts0.intake = K.part("흡기구", sideGeo([[0, 1.5], [0.12, 1.86], [0.85, 1.8], [0.95, 1.5]], 0.72, { bottom: 1.48, bevel: 0.03, sharp: true }), 0x141414, 0, 0, zz(0.88), 0.06);
    for (const sx of [-0.25, 0.25]) K.part("벨트", new THREE.BoxGeometry(0.1, 0.32, 0.5), 0x2a2a2a, sx, 1.25, zz(2.0), 0.03);
  }
  // 보닛·지붕·트렁크 굵은 줄무늬
  for (const sx of [-0.32, 0.32]) K.mesh(sideGeo([[zz(-3.24), 1.135], [zz(-2.55), 1.215], [zz(-1.2), 1.255], [zz(0.9), 1.225], [zz(2.4), 1.115], [zz(3.1), 0.97]], 0.26, { bottom: 0.7, bevel: 0, sharp: true }), toon(o.accent), sx, 0, 0);
  // 앞얼굴: 검은 그릴 이빨 + 움푹 들어간 각진 헤드라이트
  K.part("그릴", new THREE.BoxGeometry(W * 0.62, 0.3, 0.12), 0x111111, 0, 0.66, zz(3.3), 0.04);
  for (let k = -3; k <= 3; k++) K.mesh(new THREE.BoxGeometry(0.06, 0.26, 0.04), toon(0x9a9a9a), k * 0.19, 0.66, zz(3.37));
  for (const sd of [-1, 1]) { K.part("헤드라이트 틀", new THREE.BoxGeometry(0.46, 0.2, 0.12), 0x111111, sd * (W / 2 - 0.36), 0.86, zz(3.18), 0.04); K.lamp(0.34, 0.08, sd * (W / 2 - 0.36), 0.86, zz(3.25), 0xfff6d0); }
  K.part("앞 립", new THREE.BoxGeometry(W * 1.0, 0.08, 0.5), 0x111111, 0, 0.34, zz(3.1), 0.04);
  // 낮은 블레이드 스포일러 (트렁크 끝)
  if (o.wing !== "none") {
    for (const sx of [-0.72, 0.72]) K.part("스포일러 받침", new THREE.BoxGeometry(0.16, 0.16, 0.3), o.color, sx, 1.2, zz(-3.0), 0.03);
    parts0.spoiler = K.part("스포일러", sideGeo([[zz(-3.36), 1.25], [zz(-3.1), 1.34], [zz(-2.72), 1.29]], W, { bottom: 1.24, bevel: 0.02, sharp: true }), 0x111111, 0, 0, 0, 0.05);
  }
  K.tail = K.lamp(W * 0.86, 0.14, 0, 0.96, zz(-3.33), 0xff2a2a);
  for (const sx of [-0.6, 0.6]) K.pipe(sx, 0.48, zz(-3.35), 0.14, 0.5);
  K.plates(o.num, W / 2 + 0.06, 0.88, zz(0.1), 0.36);
  if (!o.rust) carDetail0(K, o, W, zz, parts0);
  const rc = o.rim || 0xc8c8c8;
  K.wheel(-(W / 2 - 0.05), zz(2.15), 0.46, 0.38, rc); K.wheel(W / 2 - 0.05, zz(2.15), 0.46, 0.38, rc);
  K.wheel(-(W / 2 + 0.0), zz(-1.95), 0.56, 0.58, rc); K.wheel(W / 2 + 0.0, zz(-1.95), 0.56, 0.58, rc);
  K.boxes = [[0, zz(0.04), zz(3.32), W / 2 + 0.08]];
  const g = K.done(Math.max(2.3, (o.len || 6.6) * 0.44)); parent.add(g); return g;
}

// 라이벌 SF 머신: 차를 벗어난 파괴적인 기계들
