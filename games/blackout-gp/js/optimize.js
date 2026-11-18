function computeRacingLine() { // 레이싱 라인: 바깥-안쪽(에이펙스)-바깥으로 코너를 펴서 달리는 길. 줄을 팽팽히 당기듯 반복해서 곡률을 줄임
  const st = 4, M = Math.floor(N / st), cx = new Float64Array(M), cz = new Float64Array(M), ux = new Float64Array(M), uz = new Float64Array(M), W = new Float64Array(M), o = new Float64Array(M);
  for (let j = 0; j < M; j++) { const t = TRK[j * st]; cx[j] = t.x; cz[j] = t.z; ux[j] = nx(t); uz[j] = nz(t); W[j] = Math.max(0, t.hw - 5.5); }
  const px = j => cx[j] + ux[j] * o[j], pz = j => cz[j] + uz[j] * o[j];
  for (let it = 0; it < 500; it++) { const k = it < 150 ? 8 : it < 300 ? 4 : 2;
    for (let j = 0; j < M; j++) { const a = (j - k + M) % M, b = (j + k) % M, mx = (px(a) + px(b)) / 2, mz = (pz(a) + pz(b)) / 2;
      const want = (mx - cx[j]) * ux[j] + (mz - cz[j]) * uz[j]; o[j] = clamp(o[j] + (want - o[j]) * 0.6, -W[j], W[j]); } }
  const kr = new Float64Array(M);
  for (let j = 0; j < M; j++) { const a = (j - 2 + M) % M, b = (j + 2) % M; const h1 = Math.atan2(px(j) - px(a), pz(j) - pz(a)), h2 = Math.atan2(px(b) - px(j), pz(b) - pz(j)); let d = h2 - h1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const ds = Math.hypot(px(b) - px(a), pz(b) - pz(a)) / 2 || 1; kr[j] = Math.abs(d) / ds; }
  for (let i = 0; i < N; i++) { const j = Math.floor(i / st) % M, j2 = (j + 1) % M, f = (i % st) / st, t = TRK[i];
    t.rl = o[j] + (o[j2] - o[j]) * f; t.krl = Math.min(t.k, Math.max(kr[(j - 1 + M) % M], kr[j], kr[j2]) * 1.1 + 0.00005); } // 라인 곡률 (원래 코스 곡률보다 크게는 안 봄)
}
const DCULL = [], WOL = []; // WOL: 길가 소품들의 외곽선 (멀면 끔)
const VC_MATS = new Map(); /* 색을 꼭짓점에 굽고 공유하는 재질 */
function vcMat(m0, key) { let m = VC_MATS.get(key); if (m) return m;
  m = m0.clone(); m.vertexColors = true; if (m.color) m.color.setHex(0xffffff);
  if (m0.userData.wear) { m.onBeforeCompile = wearCompile(m0.userData.dirt || 0x6a5238, "#include <color_fragment>"); m.customProgramCacheKey = () => "wearVC"; }
  if (m.isMeshStandardMaterial) metalMats.push(m); VC_MATS.set(key, m); return m; }
function matKey(m, vc) { return m === carOlMat ? "OL" : [m.type, vc ? "" : (m.color ? m.color.getHex() : ""), m.map ? m.map.uuid : "", m.emissive ? m.emissive.getHex() : "", m.side, m.gradientMap ? m.gradientMap.uuid : "", m.metalness ?? "", m.roughness ?? "", m.polygonOffset ? m.polygonOffsetFactor : "", m.userData.wear ? "W" + (m.userData.dirt || 0) : (m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ? m.uuid : "")].join(","); }
function buildMerged(list, rel, key) { /* 여러 메시를 하나로 (색은 꼭짓점 색으로) */
  const m0 = list[0].material, ol = m0 === carOlMat, uv = !!m0.map, nm = new THREE.Matrix3(), v = new THREE.Vector3(), C = new THREE.Color();
  let nv = 0, ni = 0; for (const o of list) { const gg = o.geometry; nv += gg.attributes.position.count; ni += gg.index ? gg.index.count : gg.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = ol ? null : new Float32Array(nv * 3), tuv = uv ? new Float32Array(nv * 2) : null, idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let vo = 0, io = 0;
  for (const o of list) { const gg = o.geometry, P = gg.attributes.position, N = gg.attributes.normal, T = gg.attributes.uv, M = rel.get(o), cnt = P.count; nm.getNormalMatrix(M); if (col) C.copy(o.material.color || C.setHex(0xffffff));
    for (let i = 0; i < cnt; i++) { const k = (vo + i) * 3; v.fromBufferAttribute(P, i).applyMatrix4(M); pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z;
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[k] = v.x; nor[k + 1] = v.y; nor[k + 2] = v.z;
      if (col) { col[k] = C.r; col[k + 1] = C.g; col[k + 2] = C.b; } if (uv) { tuv[(vo + i) * 2] = T ? T.getX(i) : 0; tuv[(vo + i) * 2 + 1] = T ? T.getY(i) : 0; } }
    if (gg.index) { const ix = gg.index; for (let i = 0; i < ix.count; i++) idx[io + i] = ix.getX(i) + vo; io += ix.count; } else { for (let i = 0; i < cnt; i++) idx[io + i] = vo + i; io += cnt; }
    vo += cnt; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); if (col) out.setAttribute("color", new THREE.BufferAttribute(col, 3)); if (uv) out.setAttribute("uv", new THREE.BufferAttribute(tuv, 2)); out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere();
  const mm = new THREE.Mesh(out, ol ? carOlMat : vcMat(m0, key)); mm.castShadow = list[0].castShadow; mm.receiveShadow = list[0].receiveShadow; mm.renderOrder = list[0].renderOrder; mm.layers.mask = list[0].layers.mask; mm.userData.carMerged = true; return mm;
}
function collectMerge(root, skip, okVis) { /* root 아래 메시를 재질 종류별로 묶음 (root 기준 좌표) */
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), rel = new Map();
  root.traverse(o => { if (!o.isMesh || skip.has(o) || o.userData.carMerged) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (!p.visible) return;
    if (!o.visible && !okVis(o)) return;
    const m = o.material, gg = o.geometry; if (!m || Array.isArray(m) || m.transparent || !gg.attributes.position || !gg.attributes.normal) return;
    const key = matKey(m, true) + "|" + (o.castShadow ? 1 : 0); let a = groups.get(key); if (!a) groups.set(key, a = []); a.push(o); rel.set(o, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); });
  return { groups, rel };
}
function mergeWheels(g) { /* 바퀴 안쪽(타이어·림·스포크·허브)은 영구히 합침 — 바퀴째 떨어지니 다시 나눌 일 없음 */
  for (const pv of g.userData.wheels || []) { const sp = pv.userData.spin; if (!sp || sp.userData.merged) continue; sp.userData.merged = true;
    const { groups, rel } = collectMerge(sp, new Set(), () => false);
    for (const [key, list] of groups) { if (list.length < 2) continue; const mm = buildMerged(list, rel, key); sp.add(mm); for (const o of list) o.parent.remove(o); } }
}
function mergeCar(g) { /* 차가 멀쩡할 땐 부품 100여 개를 재질 종류별 몇 덩어리로 합쳐 그림 (처음 부서질 때 원래 부품으로 돌아감) */
  const u = g.userData, body = u.body; if (!body || u.mrg) return;
  const skip = new Set(u.flames || []); if (u.tail) skip.add(u.tail);
  const { groups, rel } = collectMerge(body, skip, o => o.material === carOlMat);
  const meshes = [], hid = new Set();
  for (const [key, list] of groups) { if (list.length < 2) continue; const mm = buildMerged(list, rel, key); body.add(mm); meshes.push(mm); for (const o of list) { o.visible = false; hid.add(o); } }
  u.mrg = { meshes, hid }; u.ols = null; u.olFar = undefined;
}
function unmergeCar(g) { /* 부서지기 시작하면 원래 부품들로 */
  const u = g.userData, M = u.mrg; if (!M) return;
  for (const o of M.hid) o.visible = true; for (const mm of M.meshes) { u.body.remove(mm); mm.geometry.dispose(); }
  u.mrg = null; u.ols = null; u.olFar = undefined;
}
function carLod() { // 멀리 있는 차는 외곽선을 끔 (어차피 안 보이고 그리기 횟수만 두 배)
  const p = camera.position;
  for (const c of [player, ...ais]) { const u = c.mesh.userData; if (!u.ols) { u.ols = []; c.mesh.traverse(o => { if (o.isMesh && o.material === carOlMat && (!u.mrg || o.userData.carMerged || !u.mrg.hid.has(o))) u.ols.push(o); }); }
    const far = c.mesh.position.distanceTo(p) > (GLOW() ? 90 : 160); if (u.olFar !== far) { u.olFar = far; for (const o of u.ols) o.visible = !far; } }
}
function distCull() { // 그래픽 낮음 1.5km, 높음 4.5km 밖의 소품 묶음(나무·관중·풍선 등)은 안 그림
  const lim = GMIN() ? 650 : GLOW() ? 1100 : 4500, p = camera.position;
  const limOl = GLOW() ? 380 : 900; // 소품 외곽선 묶음은 더 가까이서만
  for (const o of DCULL) { const sp = o.geometry.boundingSphere; o.visible = sp.center.distanceTo(p) - sp.radius < (o.material === outlineMat ? limOl : lim); }
  const ol = GLOW() ? 130 : 320, ol2 = ol * ol; for (const [o, q] of WOL) o.visible = q.distanceToSquared(p) < ol2;
}
function mergeStatic() { // 안 움직이는 배경 메시(건물·관중석·간판 등)를 재질·구역별로 하나로 합쳐 그리기 횟수를 줄임
  const skip = new Set(); for (const pr of PROPS) if (pr.obj) pr.obj.traverse(o => skip.add(o)); // 부서지는 오브젝트는 그대로
  const snap = new Map(); world.traverse(o => snap.set(o, [o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
  for (const f of FEST.anims) { try { f(0.05); } catch (e) {} } for (const h of FEST.turbines) h.rotation.z += 0.01; // 움직이는 건 한 번 돌려 보고 찾아냄
  world.traverse(o => { const q = snap.get(o); if (q && (!q[0].equals(o.position) || !q[1].equals(o.quaternion) || !q[2].equals(o.scale))) o.userData.anim = true; });
  world.updateMatrixWorld(true); const groups = new Map(), P = new THREE.Vector3();
  world.traverse(o => { if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !o.visible || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
    for (let p = o; p && p !== world; p = p.parent) if (p.userData.anim || !p.visible) return;
    const m = o.material, g = o.geometry; if (!m || Array.isArray(m) || m.transparent || !g.attributes.position || (g.morphAttributes && g.morphAttributes.position)) return;
    const sig = Object.keys(g.attributes).sort().map(k => k + g.attributes[k].itemSize).join(",") + (g.index ? "I" : "N"); P.setFromMatrixPosition(o.matrixWorld);
    const mk = [m.type, m.color ? m.color.getHex() : "", m.map ? m.map.uuid : "", m.emissive ? m.emissive.getHex() : "", m.side, m.vertexColors ? 1 : 0, m.opacity, m.gradientMap ? m.gradientMap.uuid : "", m.fog, m.flatShading ? 1 : 0, m.envMap ? m.envMap.uuid : "", m.metalness ?? "", m.roughness ?? "", m.onBeforeCompile && m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile ? m.uuid : ""].join(","); // 색·질감이 같은 재질끼리
    const key = mk + "|" + sig + "|" + Math.floor(P.x / 420) + "," + Math.floor(P.z / 420) + "|" + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + "|" + o.renderOrder;
    let a = groups.get(key); if (!a) groups.set(key, a = []); a.push(o); });
  const nm = new THREE.Matrix3(), v = new THREE.Vector3(); let merged = 0;
  for (const list of groups.values()) { if (list.length < 3) continue; const g0 = list[0].geometry, keys = Object.keys(g0.attributes), idxd = !!g0.index;
    let nv = 0, ni = 0; for (const o of list) { nv += o.geometry.attributes.position.count; if (idxd) ni += o.geometry.index.count; } if (nv > 400000) continue;
    const out = new THREE.BufferGeometry(), arrs = {}; for (const k of keys) arrs[k] = new Float32Array(nv * g0.attributes[k].itemSize); const idx = idxd ? (nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni)) : null;
    let vo = 0, io = 0;
    for (const o of list) { const g = o.geometry, cnt = g.attributes.position.count; nm.getNormalMatrix(o.matrixWorld);
      for (const k of keys) { const at = g.attributes[k], is = at.itemSize, dst = arrs[k];
        for (let i = 0; i < cnt; i++) { if (k === "position") { v.fromBufferAttribute(at, i).applyMatrix4(o.matrixWorld); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
          else if (k === "normal") { v.fromBufferAttribute(at, i).applyMatrix3(nm).normalize(); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
          else for (let c = 0; c < is; c++) dst[(vo + i) * is + c] = at.array[i * is + c] ?? at.getComponent?.(i, c) ?? 0; } }
      if (idxd) { const ix = g.index; for (let i = 0; i < ix.count; i++) idx[io + i] = ix.getX(i) + vo; io += ix.count; } vo += cnt; }
    for (const k of keys) out.setAttribute(k, new THREE.BufferAttribute(arrs[k], g0.attributes[k].itemSize, g0.attributes[k].normalized)); if (idx) out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere(); const mm = new THREE.Mesh(out, list[0].material); mm.castShadow = list[0].castShadow; mm.receiveShadow = list[0].receiveShadow; mm.renderOrder = list[0].renderOrder; mm.userData.merged = true; world.add(mm);
    for (const o of list) o.parent.remove(o); merged += list.length; }
  return merged;
}
function splitInstanced() {
  const pairOf = new Map(); for (const pr of PROPS) if (pr.inst && pr.inst.om) pairOf.set(pr.inst.im, pr.inst.om);
  const outlines = new Set(pairOf.values()), list = []; world.traverse(o => { if (o.isInstancedMesh && o.count > 120 && !outlines.has(o)) list.push(o); });
  const remap = new Map(), M = new THREE.Matrix4(), P = new THREE.Vector3(), Cc = new THREE.Color(), CELL = 800;
  for (const im of list) { const om = pairOf.get(im) || null, groups = new Map(); im.geometry.computeBoundingSphere(); const gr = im.geometry.boundingSphere.radius;
    for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, M); P.setFromMatrixPosition(M); const key = Math.floor(P.x / CELL) + "," + Math.floor(P.z / CELL); let a = groups.get(key); if (!a) groups.set(key, a = []); a.push(i); }
    if (groups.size <= 1) continue; const map = new Array(im.count);
    for (const idxs of groups.values()) { const g = im.geometry.clone(); let rMax = 0; const pts = idxs.map(i => { im.getMatrixAt(i, M); rMax = Math.max(rMax, gr * M.getMaxScaleOnAxis()); return new THREE.Vector3().setFromMatrixPosition(M); });
      const sph = new THREE.Sphere().setFromPoints(pts); sph.radius += rMax + 2; g.boundingSphere = sph;
      const n = new THREE.InstancedMesh(g, im.material, idxs.length); n.castShadow = im.castShadow; n.receiveShadow = im.receiveShadow; n.renderOrder = im.renderOrder; n.userData = im.userData;
      let no = null; if (om) { no = new THREE.InstancedMesh(g, om.material, idxs.length); no.userData = om.userData; no.renderOrder = om.renderOrder; }
      idxs.forEach((i, k) => { im.getMatrixAt(i, M); n.setMatrixAt(k, M); if (im.instanceColor) { im.getColorAt(i, Cc); n.setColorAt(k, Cc); } if (no) { om.getMatrixAt(i, M); no.setMatrixAt(k, M); } map[i] = [n, no, k]; });
      im.parent.add(n); if (no) om.parent.add(no); }
    im.parent.remove(im); if (om && om.parent) om.parent.remove(om); remap.set(im, map); }
  for (const pr of PROPS) if (pr.inst && remap.has(pr.inst.im)) { const r = remap.get(pr.inst.im)[pr.inst.i]; if (r) { pr.inst.im = r[0]; pr.inst.om = r[1]; pr.inst.i = r[2]; } }
}
function applyViewDist() { // 폰(그래픽 낮음)은 3.2km까지만 그리고 그 앞을 안개로 가림
  if (!C) return; const low = GLOW(), far = GMIN() ? 1500 : low ? 3200 : 9000;
  scene.fog.near = low ? Math.min(C.fog[1], GMIN() ? 350 : 600) : C.fog[1]; scene.fog.far = low ? Math.min(C.fog[2], far - 200) : C.fog[2];
  camera.far = far; camera.updateProjectionMatrix(); sky.scale.setScalar(Math.min(1, far * 0.9 / 7000)); // 하늘 돔(과 구름)도 시야 안으로 줄임 (보이는 크기는 같음) if (typeof mirrorCam !== "undefined") { mirrorCam.far = low ? 1200 : 9000; mirrorCam.updateProjectionMatrix(); }
}
