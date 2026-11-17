function buildCourse(id) {
  courseId = id; C = COURSES[id]; try { localStorage.setItem("bgp_course", id); } catch (e) {}
  if (world) { scene.remove(world); world.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  world = new THREE.Group(); scene.add(world); colliders = []; PROPS = []; PGRID = new Map(); SOLIDS = []; SGRID = new Map(); seed = 7; FEST.turbines = []; FEST.time = null; FEST.anims = [];
  buildTrack(C); computeRacingLine();
  paintSky(C.sky); scene.fog.color.setHex(C.fog[0]); applyViewDist();
  setClouds(id !== "circuit"); if (typeof POST !== "undefined" && POST.mat) POST.mat.uniforms.hatch.value = id === "circuit" ? 0.15 : 1; /* 밤 서킷은 전체가 어두워서 빗금을 약하게 */
  ground.material.color.setHex(C.ground); sun.color.setHex(C.sun[0]); sun.intensity = C.sun[1]; SUN_DIR = new THREE.Vector3(...C.sun[2]).normalize(); sun.position.copy(SUN_DIR); amb.intensity = C.amb;
  if (id === "desert") buildDesert(); else if (id === "dam") buildDam(); else buildCircuit();
  if (id === "dam" && lapsTotal > 3 && typeof setLaps === "function") setLaps(2);
  if (typeof clearSkid === "function") clearSkid();
  splitInstanced(); // 화면 밖 오브젝트는 안 그리게
  mergeStatic(); // 안 움직이는 배경은 합쳐서 그리기 횟수 줄임
  DCULL.length = 0; WOL.length = 0; world.updateMatrixWorld(true); world.traverse(o => { if (o.isInstancedMesh && o.geometry.boundingSphere && o.geometry.boundingSphere.radius < 2000) DCULL.push(o); else if (o.isMesh && !o.isInstancedMesh && o.material === outlineMat && !o.userData.merged) WOL.push([o, new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)]); }); // 멀리 있는 소품 묶음은 거리로 끔
  makeEnv();
  document.querySelectorAll(".csel").forEach(b => b.classList.toggle("on", b.dataset.c === id));
}

