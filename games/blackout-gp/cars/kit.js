// ================= 차 모델 (옆모습 실루엣을 두께 있게 뽑고 모서리를 깎는 방식, 부품 분리) =================
function plateTex(txt) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = "#000"; g.stroke();
  g.fillStyle = "#000"; g.font = `900 italic ${txt.length > 1 ? 64 : 86}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 64, 70);
  return new THREE.CanvasTexture(c);
}
// top: 뒤에서 앞으로 가는 윗선 [[z, y], ...]. o: { bottom, bevel, sharp, taperF, taperZ, taperR, taperZr, tumble, seg }
function sideGeo(top, width, o = {}) {
  const bev = o.bevel ?? 0.07, bot = o.bottom ?? Math.min(...top.map(p => p[1]));
  const sh = new THREE.Shape();
  sh.moveTo(top[0][0], bot); sh.lineTo(top[0][0], top[0][1]);
  if (o.sharp) for (let i = 1; i < top.length; i++) sh.lineTo(top[i][0], top[i][1]);
  else sh.splineThru(top.slice(1).map(p => new THREE.Vector2(p[0], p[1])));
  sh.lineTo(top[top.length - 1][0], bot); sh.lineTo(top[0][0], bot);
  const depth = Math.max(0.01, width - 2 * bev);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: o.seg || 10 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2);
  g.computeBoundingBox(); const bb = g.boundingBox, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i); const y = p.getY(i), z = p.getZ(i);
    if (o.taperF !== undefined && z > o.taperZ) x *= 1 - (1 - o.taperF) * (z - o.taperZ) / Math.max(0.01, bb.max.z - o.taperZ);
    if (o.taperR !== undefined && z < o.taperZr) x *= 1 - (1 - o.taperR) * (o.taperZr - z) / Math.max(0.01, o.taperZr - bb.min.z);
    if (o.tumble) x *= 1 - o.tumble * (y - bb.min.y) / Math.max(0.01, bb.max.y - bb.min.y);
    p.setX(i, x);
  }
  g.computeVertexNormals(); return g;
}
function catGeos(items) { /* 작은 조각 여러 개를 한 덩어리 모양으로: [geo, x, y, z, rx, ry, rz] */
  const list = []; let n = 0; const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);
  for (const [g, x, y, z, rx = 0, ry = 0, rz = 0] of items) { const gg = g.index ? g.toNonIndexed() : g.clone(); M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S1); gg.applyMatrix4(M); list.push(gg); n += gg.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const gg of list) { pos.set(gg.attributes.position.array, o * 3); nor.set(gg.attributes.normal.array, o * 3); o += gg.attributes.position.count; gg.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); return out;
}
function podGeo(prof) { const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 18); g.rotateX(Math.PI / 2); return g; } // [반지름, 길이방향] 회전체
function carKit(color, accent) {
  const g = new THREE.Group(); g.rotation.order = "YXZ";
  const body = new THREE.Group(); g.add(body);
  const K = { g, body, wheels: [], wheelPos: [], flames: [], parts: [] };
  K.part = (name, geo, c, x = 0, y = 0, z = 0, th = 0.085) => { const m = outlined(geo, c, th); m.position.set(x, y, z); m.name = name; body.add(m); K.parts.push(m); return m; };
  K.mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); return m; };
  K.lamp = (w, h, x, y, z, c) => K.mesh(new THREE.BoxGeometry(w, h, 0.05), glow(c), x, y, z);
  K.wheel = (x, z, r, w, rimC = 0xc8c8c8, spokes = 5) => { // 바깥 피벗(조향) 안에 스피너(회전)
    const pivot = new THREE.Group(), spin = new THREE.Group(); pivot.add(spin); pivot.position.set(x, r, z);
    const tire = outlined(new THREE.CylinderGeometry(r, r, w, 22).rotateZ(Math.PI / 2), 0x151515, 0.04); spin.add(tire);
    const side = Math.sign(x) || 1;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.66, r * 0.66, w * 0.3, 20).rotateZ(Math.PI / 2), toon(rimC)); rim.position.x = side * w * 0.36; spin.add(rim);
    for (let k = 0; k < spokes; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, r * 1.15, 0.09), toon(rimC)); sp.position.x = side * (w * 0.5 + 0.005); sp.rotation.x = k / spokes * Math.PI; spin.add(sp); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, w + 0.04, 8).rotateZ(Math.PI / 2), toon(0x333333)); spin.add(hub);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, w * 0.12, 18).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a2a2a })); disc.position.x = side * w * 0.2; pivot.add(disc); // 브레이크 디스크 (달아오름)
    pivot.userData = { spin, baseY: r, r, disc }; g.add(pivot); K.wheels.push(pivot); K.wheelPos.push([x, z]);
    return pivot;
  };
  K.flame = (x, y, z, r = 0.22, len = 2.4) => { const f = new THREE.Mesh(new THREE.ConeGeometry(r, len, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8ff0ff, transparent: true, opacity: 0.9 })); f.position.set(x, y, z - len / 2); f.visible = false; body.add(f); K.flames.push(f); };
  K.pipe = (x, y, z, r = 0.11, len = 0.4) => { K.part("배기구", new THREE.CylinderGeometry(r, r * 0.9, len, 12).rotateX(Math.PI / 2), 0xaaaaaa, x, y, z, 0.03); K.flame(x, y, z - len / 2, r * 1.6); };
  K.nozzle = (x, y, z, r = 0.3) => { K.part("노즐", podGeo([[r * 0.7, -0.5], [r, -0.2], [r, 0.4], [r * 0.6, 0.5]]), 0x5f5e5a, x, y, z, 0.03); K.flame(x, y, z - 0.5, r * 0.85, 3.2); };
  K.plates = (num, x, y, z, r = 0.32) => { if (!num) return; const geo = new THREE.CircleGeometry(r, 24), mat = new THREE.MeshBasicMaterial({ map: plateTex(num) });
    for (const sd of [-1, 1]) { const pl = new THREE.Mesh(geo, mat); pl.rotation.y = sd * Math.PI / 2; pl.position.set(sd * x, y, z); body.add(pl); } };
  K.done = (radius, st = { x: 1, y: 1, z: 1, w: 1 }) => {
    autoBrackets(K); // 떠 있는 부품 연결
    applyWear(body); // 표면 때·상처
    g.traverse(o => { if (o.isMesh && o.material !== outlineMat && !(o.material && o.material.isMeshBasicMaterial)) o.castShadow = true; });
    body.scale.set(st.x, st.y, st.z); // 레드라인식: 길고 두꺼운 덩어리
    K.wheels.forEach((pv, i) => { pv.position.x *= st.x; pv.position.z *= st.z; pv.scale.setScalar(st.w); pv.userData.baseY *= st.w; pv.position.y = pv.userData.baseY; pv.userData.r *= st.w; K.wheelPos[i] = [K.wheelPos[i][0] * st.x, K.wheelPos[i][1] * st.z]; });
    g.scale.setScalar(CS);
    K.flames.forEach(f => body.remove(f)); g.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g); K.flames.forEach(f => body.add(f)); // 불꽃은 빼고 잼
    const hl = (bb.max.z - bb.min.z) / 2 * 0.9, hwd = (bb.max.x - bb.min.x) / 2 * 0.85;
    { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,0.75)"); gr.addColorStop(0.6, "rgba(0,0,0,0.45)"); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      sh.scale.set((bb.max.x - bb.min.x) / CS * 1.05, 1, (bb.max.z - bb.min.z) / CS * 0.95); sh.position.set((bb.max.x + bb.min.x) / 2 / CS, 0.04, (bb.max.z + bb.min.z) / 2 / CS); g.add(sh); } // 차 밑 진한 접지 그림자
    const boxes = (K.boxes || [[0, 0, hl / CS, hwd / CS]]).map(b => b.map(v => v * CS)); // 충돌 상자들 [옆 위치, 앞뒤 위치, 반 길이, 반 폭]
    g.userData = { hl, hwd, boxes, body, wheels: K.wheels, wheelPos: K.wheelPos.map(([x, z]) => [x * CS, z * CS]), flames: K.flames, parts: K.parts, radius: radius * st.z * CS, tail: K.tail };
    { g.updateMatrixWorld(true); const A = partGraph(body, K.parts, K.flames); const reach = new Set(A.roots), stk = [...A.roots]; while (stk.length) { const i = stk.pop(); for (const j of A.adj[i]) if (!reach.has(j)) { reach.add(j); stk.push(j); } }
      for (let i = 0; i < A.nodes.length; i++) if (!reach.has(i)) { let bj = -1, bd = 1e9; const ci = A.geo[i].box.getCenter(new THREE.Vector3()); for (const j of reach) { const d = A.geo[j].box.distanceToPoint(ci); if (d < bd) { bd = d; bj = j; } } if (bj >= 0) { A.adj[i].push(bj); A.adj[bj].push(i); } } // 번호판 같은 얇은 장식은 가장 가까운 부품에 붙은 걸로
      g.userData.adj = { nodes: A.nodes, adj: A.adj, roots: A.roots, cen: A.geo.map(q => q.box.getCenter(new THREE.Vector3())) }; }
    g.traverse(o => { if (o.isMesh && o.material === outlineMat) o.material = carOlMat; });
    mergeWheels(g); mergeCar(g); /* 멀쩡할 땐 한 덩어리로 그림 */
    METAL = false; return g;
  };
  return K;
}

// 주인공 0번: 긴 보닛, 패스트백, 트렁크에 붙은 낮은 스포일러의 아메리칸 쿠페
