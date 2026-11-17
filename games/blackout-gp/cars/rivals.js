function makeSF(kind, color, accent, num) {
  METAL = true;
  const K = carKit(color, accent); let radius = 2.6;
  const D = 0x141414, STEEL = 0x8a8a8a, GLASS = 0x0e1620;
  const spike = (x, y, z, len, r, rx = 0, ry = 0, rz = 0, c = STEEL) => { const m = K.part("가시", new THREE.ConeGeometry(r, len, 6), c, x, y, z, 0.03); m.rotation.set(rx, ry, rz); return m; };
  const blade = (top, w, c, x = 0, bottom) => K.part("칼날", sideGeo(top, w, { bottom: bottom ?? Math.min(...top.map(p => p[1])) - 0.02, bevel: 0.02, sharp: true }), c, x, 0, 0, 0.05);
  const saw = (z0, z1, y0, h, n) => { const pts = [[z0, y0]]; for (let i = 0; i <= n; i++) { const z = z0 + (z1 - z0) * i / n; pts.push([z, y0 + (i % 2 ? h * 0.55 : h)]); } pts.push([z1, y0]); return pts; }; // 톱니 윤곽
  if (kind === "stealth") { // Zero: 9m짜리 검은 창날. 앞은 갈라진 두 개의 턱, 뒷바퀴는 팔 끝에 매달림
    K.part("창날 몸통", sideGeo([[-4.4, 0.5], [-4.3, 1.35], [-2.0, 1.5], [0.5, 1.25], [3.2, 0.75], [4.6, 0.45]], 2.4, { bottom: 0.35, bevel: 0.04, sharp: true, taperF: 0.25, taperZ: 0.5 }), color, 0, 0, 0);
    for (const sd of [-1, 1]) { const j = K.part("턱", sideGeo([[2.6, 0.38], [3.4, 0.7], [5.6, 0.5], [5.9, 0.36]], 0.35, { bottom: 0.3, bevel: 0.02, sharp: true }), color, sd * 0.55, 0, 0, 0.04); j.rotation.y = sd * 0.06; }
    K.part("캐노피", sideGeo([[-1.4, 1.35], [-0.6, 1.85], [0.4, 1.78], [1.2, 1.28]], 1.0, { bottom: 1.25, bevel: 0.03, sharp: true, tumble: 0.4 }), GLASS, 0, 0, 0, 0.05);
    for (const sd of [-1, 1]) {
      K.part("팔", new THREE.BoxGeometry(1.3, 0.16, 0.5), D, sd * 1.15, 0.65, -2.9, 0.04);
      blade([[-4.6, 1.0], [-4.3, 2.6], [-3.6, 2.7], [-2.4, 1.1]], 0.12, color, sd * 0.7);
    }
    K.part("윙", sideGeo([[-4.7, 2.3], [-4.3, 2.42], [-3.6, 2.36]], 2.4, { bottom: 2.28, bevel: 0.02, sharp: true }), D, 0, 0, 0, 0.04);
    K.nozzle(0, 0.75, -4.45, 0.42);
    K.mesh(new THREE.BoxGeometry(0.05, 0.05, 6.5), glow(0xff2a2a), 0, 1.52, -0.8);
    K.lamp(0.6, 0.05, 0, 0.5, 4.62, 0xff4040);
    K.wheel(-0.85, 2.4, 0.42, 0.34); K.wheel(0.85, 2.4, 0.42, 0.34); K.wheel(-1.95, -2.9, 0.72, 0.6); K.wheel(1.95, -2.9, 0.72, 0.6);
    radius = 3.6;
  } else if (kind === "duke") { // Duke: 차 길이만 한 거대 제트엔진 두 개 사이에 조종석이 끼어 있음
    for (const x of [-1.25, 1.25]) {
      K.part("제트엔진", podGeo([[0.55, -4.0], [0.8, -3.4], [0.95, -1.0], [0.92, 2.2], [0.7, 3.4], [0.45, 3.7]]), color, x, 1.15, 0, 0.06);
      K.part("흡기 링", new THREE.TorusGeometry(0.66, 0.1, 8, 20), STEEL, x, 1.15, 3.7, 0.03);
      K.part("팬", new THREE.CylinderGeometry(0.55, 0.55, 0.1, 12).rotateX(Math.PI / 2), D, x, 1.15, 3.55, 0.02);
      K.part("배기", podGeo([[0.62, -0.4], [0.5, 0.3]]), STEEL, x, 1.15, -4.2, 0.03); K.flame(x, 1.15, -4.5, 0.5, 4.2);
      for (const z of [-2, 0, 2]) K.part("고정 띠", new THREE.TorusGeometry(0.96, 0.06, 6, 20), D, x, 1.15, z, 0.02);
    }
    K.part("척추", sideGeo([[-3.6, 0.7], [-3.4, 2.1], [1.2, 2.2], [3.6, 1.1], [4.4, 0.6]], 1.1, { bottom: 0.55, bevel: 0.04, sharp: true, taperF: 0.5, taperZ: 2.0 }), D, 0, 0, 0);
    K.part("캐노피", podGeo([[0, -1.0], [0.42, -0.5], [0.45, 0.4], [0.2, 1.0], [0, 1.1]]), GLASS, 0, 2.2, 0.6, 0.04);
    for (const sx of [-0.25, 0.25]) K.mesh(new THREE.BoxGeometry(0.16, 0.03, 4.6), toon(0xf2f2f2), sx, 2.22, -1.1);
    blade([[-3.7, 2.1], [-3.5, 3.3], [-2.9, 3.35], [-2.0, 2.15]], 0.14, color);
    K.part("앞 포크", new THREE.BoxGeometry(1.6, 0.14, 0.4), D, 0, 0.55, 3.7, 0.03);
    K.lamp(0.8, 0.06, 0, 0.75, 4.42, 0xfff6d0);
    K.wheel(-0.7, 3.7, 0.48, 0.36); K.wheel(0.7, 3.7, 0.48, 0.36); K.wheel(-2.35, -2.6, 0.82, 0.7); K.wheel(2.35, -2.6, 0.82, 0.7);
    radius = 3.8;
  } else if (kind === "scarlet") { // Scarlet: 납작한 가오리 몸통, 앞엔 집게, 뒤엔 몸 위로 휘어 넘어오는 전갈 꼬리 윙
    K.part("가오리", sideGeo([[-3.4, 0.42], [-3.2, 1.15], [-1.0, 1.3], [1.6, 1.0], [3.4, 0.5]], 3.6, { bottom: 0.32, bevel: 0.05, sharp: true, taperF: 0.3, taperZ: -0.4, taperR: 0.55, taperZr: -1.8 }), color, 0, 0, 0);
    for (const sd of [-1, 1]) { const c = K.part("집게", sideGeo([[2.4, 0.36], [3.0, 0.62], [4.8, 0.55], [5.3, 0.4]], 0.3, { bottom: 0.3, bevel: 0.02, sharp: true }), color, sd * 1.05, 0, 0, 0.04); c.rotation.y = -sd * 0.18; spike(sd * 1.6, 0.48, 4.9, 0.6, 0.1, Math.PI / 2, 0, 0, D); }
    K.part("캐노피", podGeo([[0, -1.2], [0.48, -0.6], [0.5, 0.3], [0.28, 0.9], [0, 1.0]]), GLASS, 0, 1.25, -0.2, 0.04);
    // 전갈 꼬리: 뒤에서 솟아 몸 위로 휘어짐
    const tail = [[-3.3, 0.8], [-3.6, 1.6], [-3.4, 2.5], [-2.6, 3.1], [-1.6, 3.2], [-1.0, 2.9]];
    for (let i = 0; i < tail.length - 1; i++) { const [z0, y0] = tail[i], [z1, y1] = tail[i + 1], len = Math.hypot(z1 - z0, y1 - y0); const seg = K.part("꼬리", new THREE.BoxGeometry(0.34 - i * 0.03, 0.34 - i * 0.03, len + 0.1), i % 2 ? D : color, 0, (y0 + y1) / 2, (z0 + z1) / 2, 0.04); seg.rotation.x = -Math.atan2(y1 - y0, z1 - z0); }
    K.part("꼬리 윙", sideGeo([[-2.1, 3.15], [-1.7, 3.35], [-0.9, 3.0]], 3.0, { bottom: 3.0, bevel: 0.02, sharp: true }), D, 0, 0, 0, 0.04);
    spike(0, 2.75, -0.75, 0.8, 0.14, -Math.PI * 0.75, 0, 0, color);
    K.nozzle(-0.9, 0.65, -3.4, 0.32); K.nozzle(0.9, 0.65, -3.4, 0.32);
    K.lamp(1.2, 0.05, 0, 0.5, 3.42, 0xfff6d0);
    K.wheel(-1.85, 1.4, 0.48, 0.5); K.wheel(1.85, 1.4, 0.48, 0.5); K.wheel(-1.95, -2.2, 0.6, 0.66); K.wheel(1.95, -2.2, 0.6, 0.66);
    radius = 3.4;
  } else if (kind === "hex") { // Hex: 캡슐 몸통이 거미 다리 네 개 위에 떠 있고, 톱니 지느러미가 솟음
    K.part("캡슐", podGeo([[0, -2.8], [0.7, -2.2], [0.95, -0.6], [0.88, 1.0], [0.5, 2.2], [0, 2.8]]), color, 0, 1.5, 0, 0.06).scale.set(1.2, 0.85, 1);
    K.part("캐노피", podGeo([[0, -0.7], [0.42, -0.35], [0.44, 0.25], [0.22, 0.65], [0, 0.75]]), GLASS, 0, 2.0, 1.0, 0.04);
    blade(saw(-2.8, -0.2, 1.9, 2.4, 9), 0.14, color);
    K.part("윙", sideGeo([[-2.9, 3.8], [-2.5, 3.95], [-1.9, 3.88]], 3.2, { bottom: 3.78, bevel: 0.02, sharp: true }), D, 0, 0, 0, 0.04);
    for (const [sx, sz] of [[-1, 1.6], [1, 1.6], [-1, -1.7], [1, -1.7]]) { // 꺾인 거미 다리
      const up = K.part("다리 위", new THREE.BoxGeometry(1.3, 0.16, 0.22), D, sx * 0.95, 1.65, sz, 0.03); up.rotation.z = sx * -0.45;
      const lo = K.part("다리 아래", new THREE.BoxGeometry(0.18, 1.0, 0.2), STEEL, sx * 1.55, 1.05, sz, 0.03); lo.rotation.z = sx * 0.2;
      spike(sx * 1.2, 2.05, sz, 0.5, 0.08, 0, 0, -sx * 0.6, D);
    }
    K.nozzle(0, 1.5, -2.85, 0.42);
    K.lamp(0.8, 0.06, 0, 1.45, 2.82, 0xfff6d0);
    K.wheel(-1.75, 1.6, 0.5, 0.36); K.wheel(1.75, 1.6, 0.5, 0.36); K.wheel(-1.75, -1.7, 0.5, 0.36); K.wheel(1.75, -1.7, 0.5, 0.36);
    radius = 3.1;
  } else if (kind === "twins") { // Lyle & Lena: 쌍동선처럼 나란한 두 몸통을 금빛 다리가 잇고, 각자 조종석이 있음
    for (const sd of [-1, 1]) {
      K.part("몸통", sideGeo([[-4.3, 0.5], [-4.2, 1.05], [-1.6, 1.2], [1.4, 1.1], [3.6, 0.8], [4.6, 0.5]], 1.25, { bottom: 0.36, bevel: 0.08, taperF: 0.55, taperZ: 2.2 }), color, sd * 1.15, 0, 0);
      K.part("캐노피", podGeo([[0, -1.0], [0.38, -0.5], [0.4, 0.3], [0.22, 0.9], [0, 1.0]]), GLASS, sd * 1.15, 1.2, 0.6, 0.04);
      blade([[-4.3, 1.1], [-4.0, 2.4], [-3.4, 2.45], [-2.4, 1.2]], 0.12, accent, sd * 1.15);
      spike(sd * 1.15, 0.7, 4.95, 0.9, 0.14, Math.PI / 2, 0, 0, accent);
      K.mesh(new THREE.BoxGeometry(0.04, 0.05, 7.4), toon(accent), sd * 1.79, 0.95, 0);
      K.nozzle(sd * 1.15, 0.85, -4.35, 0.3);
    }
    for (const z of [1.6, -1.2]) K.part("금빛 다리", sideGeo([[z - 0.5, 0.75], [z - 0.3, 1.05], [z + 0.3, 1.05], [z + 0.5, 0.75]], 1.3, { bottom: 0.7, bevel: 0.03, sharp: true }), accent, 0, 0, 0, 0.04);
    K.part("윙", sideGeo([[-4.4, 2.2], [-4.0, 2.32], [-3.3, 2.26]], 2.8, { bottom: 2.18, bevel: 0.02, sharp: true }), accent, 0, 0, 0, 0.04);
    for (const sd of [-1, 1]) K.lamp(0.5, 0.06, sd * 1.15, 0.62, 4.62, 0xfff6d0);
    K.wheel(-1.95, 2.6, 0.52, 0.42, accent); K.wheel(1.95, 2.6, 0.52, 0.42, accent); K.wheel(-2.0, -2.6, 0.6, 0.52, accent); K.wheel(2.0, -2.6, 0.6, 0.52, accent);
    radius = 3.6;
  } else if (kind === "sidecar") { // Bones & Jinx: 껍데기 없는 해골 핫로드. 사다리 프레임, 드러난 거대 엔진, 해골 같은 사이드카
    for (const sx of [-0.45, 0.45]) K.part("프레임", new THREE.BoxGeometry(0.14, 0.18, 7.4), D, -0.6 + sx, 0.62, 0, 0.03);
    for (const z of [-3, -1.5, 0, 1.5, 3]) K.part("갈비뼈", new THREE.BoxGeometry(1.05, 0.12, 0.12), STEEL, -0.6, 0.62, z, 0.02);
    K.part("엔진", new THREE.BoxGeometry(1.1, 0.8, 2.0), 0x5f5e5a, -0.6, 1.2, 1.4, 0.05);
    K.part("블로워", new THREE.BoxGeometry(0.8, 0.5, 1.0), STEEL, -0.6, 1.85, 1.4, 0.04);
    for (const z of [0.7, 1.1, 1.5, 1.9]) for (const sd of [-1, 1]) { const st = K.part("배기관", new THREE.CylinderGeometry(0.08, 0.1, 1.1, 8), STEEL, -0.6 + sd * 0.7, 1.55, z, 0.02); st.rotation.z = sd * 0.7; }
    K.part("좌석", sideGeo([[-2.0, 0.7], [-1.9, 1.5], [-1.3, 1.6], [-0.8, 0.75]], 0.9, { bottom: 0.65, bevel: 0.04, sharp: true }), color, -0.6, 0, 0);
    K.part("코", sideGeo([[2.4, 0.5], [2.6, 1.0], [3.4, 0.95], [4.2, 0.55]], 1.0, { bottom: 0.45, bevel: 0.04, sharp: true, taperF: 0.5, taperZ: 3.0 }), color, -0.6, 0, 0);
    K.part("해골 사이드카", podGeo([[0, -1.4], [0.6, -1.0], [0.7, 0.2], [0.5, 1.0], [0, 1.4]]), color, 1.55, 0.95, 0.4, 0.05).scale.set(1, 0.8, 1);
    for (const sd of [-1, 1]) K.part("눈구멍", new THREE.SphereGeometry(0.17, 8, 6), D, 1.55 + sd * 0.26, 1.08, 1.55, 0.02);
    K.part("연결대", new THREE.BoxGeometry(1.8, 0.14, 0.26), D, 0.55, 0.75, 0.4, 0.03);
    spike(-0.6, 0.8, 4.6, 0.8, 0.12, Math.PI / 2, 0, 0, STEEL);
    K.nozzle(-0.6, 0.9, -3.75, 0.36);
    K.lamp(0.5, 0.06, -0.6, 0.75, 4.22, 0x9cff8a);
    K.wheel(-0.6, 3.0, 0.5, 0.42); K.wheel(-1.35, -2.6, 0.78, 0.72); K.wheel(0.15, -2.6, 0.78, 0.72); K.wheel(2.45, 0.4, 0.5, 0.38);
    radius = 3.3;
  } else { // Gunnar & Big Mo: 낮고 넓은 장갑 공성 레이서. 거대한 뒷바퀴, 가시 박힌 충각, 2인승 탠덤 조종석
    K.part("선체", sideGeo([[-4.7, 0.6], [-4.6, 1.75], [-2.0, 1.95], [1.5, 1.7], [3.8, 1.05], [4.9, 0.55]], 3.0, { bottom: 0.4, bevel: 0.06, sharp: true, taperF: 0.62, taperZ: 1.6, taperR: 0.9, taperZr: -3.0 }), color, 0, 0, 0);
    K.part("장갑 띠", sideGeo([[-4.65, 0.45], [-4.65, 0.95], [4.7, 0.75], [4.85, 0.45]], 3.1, { bottom: 0.38, bevel: 0.03, sharp: true, taperF: 0.62, taperZ: 1.6 }), D, 0, 0, 0, 0.06);
    for (const z of [-0.2, -1.6]) K.part("캐노피", podGeo([[0, -0.75], [0.46, -0.35], [0.48, 0.3], [0.25, 0.7], [0, 0.8]]), GLASS, 0, 1.95, z, 0.04); // 탠덤 2인승
    K.part("척추 장갑", sideGeo([[-4.4, 1.8], [-4.2, 2.45], [-2.6, 2.5], [-2.2, 1.9]], 0.5, { bottom: 1.75, bevel: 0.03, sharp: true }), D, 0, 0, 0, 0.05);
    K.part("충각", sideGeo([[4.6, 0.35], [4.7, 1.25], [5.6, 0.85], [6.0, 0.35]], 2.2, { bottom: 0.3, bevel: 0.04, sharp: true, taperF: 0.45, taperZ: 4.7 }), STEEL, 0, 0, 0, 0.06);
    spike(0, 0.6, 6.35, 1.0, 0.2, Math.PI / 2, 0, 0, STEEL);
    for (const sd of [-1, 1]) { spike(sd * 0.75, 0.55, 6.0, 0.7, 0.13, Math.PI / 2, 0, 0, STEEL); for (const z of [-3.6, -2.6]) spike(sd * 2.45, 1.75, z, 0.55, 0.11, 0, 0, -sd * Math.PI / 2, STEEL); }
    for (const sd of [-1, 1]) { K.part("뒷바퀴 펜더", sideGeo([[-4.2, 1.2], [-3.9, 2.25], [-2.2, 2.3], [-1.8, 1.2]], 0.5, { bottom: 1.15, bevel: 0.03, sharp: true }), color, sd * 2.25, 0, 0, 0.05); K.part("앞바퀴 포드", sideGeo([[2.3, 0.6], [2.5, 1.25], [3.7, 1.15], [4.0, 0.6]], 0.42, { bottom: 0.55, bevel: 0.03, sharp: true }), D, sd * 1.7, 0, 0, 0.04); }
    K.part("윙", sideGeo([[-4.9, 2.55], [-4.5, 2.7], [-3.8, 2.62]], 3.6, { bottom: 2.52, bevel: 0.02, sharp: true }), D, 0, 0, 0, 0.04);
    K.nozzle(-0.9, 1.05, -4.75, 0.42); K.nozzle(0.9, 1.05, -4.75, 0.42);
    K.lamp(1.8, 0.1, 0, 0.9, 4.65, 0xfff6d0); K.lamp(2.6, 0.14, 0, 1.4, -4.72, 0xff2a2a);
    K.wheel(-1.7, 3.15, 0.66, 0.6); K.wheel(1.7, 3.15, 0.66, 0.6); K.wheel(-2.25, -3.0, 1.15, 1.1); K.wheel(2.25, -3.0, 1.15, 1.1);
    radius = 4.6;
  }
  K.boxes = { // 차 모양에 맞춘 충돌 상자 (모델 단위): [옆 위치, 앞뒤 위치, 반 길이, 반 폭]
    stealth: [[0, -2.6, 1.8, 2.3], [0, 0.8, 2.5, 1.15], [0, 4.3, 1.6, 0.95]],
    duke: [[0, -0.15, 4.1, 2.25], [0, -2.6, 0.9, 2.8], [0, 4.0, 0.5, 0.9]],
    scarlet: [[0, -1.2, 2.3, 2.2], [0, 1.4, 1.5, 1.3], [0, 3.9, 1.5, 1.4]],
    hex: [[0, 0, 2.8, 1.25], [0, 0, 2.15, 2.05]],
    twins: [[0, 0.3, 4.6, 1.85], [0, 0, 3.1, 2.4]],
    sidecar: [[-0.6, 0.5, 4.2, 0.75], [-0.6, -2.6, 0.85, 1.15], [1.55, 0.4, 1.4, 0.8], [2.45, 0.4, 0.55, 0.4]],
    gunnar: [[0, -0.2, 4.7, 1.55], [0, -3.0, 1.2, 2.8], [0, 5.4, 1.0, 1.15], [0, 3.15, 0.7, 2.1]]
  }[kind];
  K.plates(num, kind === "duke" ? 2.22 : kind === "twins" ? 1.78 : 1.0, 1.0, 0);
  const g = K.done(radius); scene.add(g); return g;
}

