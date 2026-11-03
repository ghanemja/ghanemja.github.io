// ─── dressing for the gallery room ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
// The morning after the heist: the night guard's desk (empty chair still turning), an
// evidence board strung with red thread, the window washer's rope hanging down the wall,
// security cameras sweeping the corners, an alarm bell, a jewel the thief somehow missed,
// a wobbly vase, a kinetic sculpture, shipping crates, track lights and evidence markers.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function baker(THREE) {
  const lists = new Map(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const add = (mat, geo, x = 0, y = 0, z = 0, rot, sc) => {
    e.set(...(rot || [0, 0, 0])); q.setFromEuler(e);
    const s = sc == null ? [1, 1, 1] : typeof sc === 'number' ? [sc, sc, sc] : sc;
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(...s));
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m4);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!lists.has(mat)) lists.set(mat, []);
    lists.get(mat).push(g);
  };
  const flush = (parent) => {
    const out = [];
    for (const [mat, l] of lists) { const m = new THREE.Mesh(mergeGeometries(l), mat); parent.add(m); out.push(m); }
    lists.clear();
    return out;
  };
  return { add, flush };
}

export default function dress(K) {
  const { THREE, g: G, paint, PAL, tap, live, free, claim, rb, canvasTex, texMat, HAND, SCRIPT, INKC, now } = K;
  const B = baker(THREE);
  const HOOK = { cams: [] };                 // props the whodunit and the secrets reach into
  const grp = (x = 0, y = 0, z = 0, parent = G) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, rot) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    parent.add(m); return m;
  };
  const decal = (w, h, draw, px, pw, ph, parent, x, y, z, rot) => {
    const m = mesh(new THREE.PlaneGeometry(w, h), texMat(pw, ph, draw), parent, x, y, z, rot);
    m.userData.noInk = true; m.renderOrder = 2; return m;
  };
  const solid = (x, z, r) => { if (!free(x, z, r)) console.warn('[gallery] crowded spot', x, z, r); claim(x, z, r); };
  const smooth = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
  const glowTex = canvasTex(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const starTex = canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = '#fff'; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 6 : 30; c.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
    c.fill();
  });
  const sprite = (tex, col, s, parent = G, op = 0) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op }));
    sp.scale.setScalar(s); parent.add(sp); return sp;
  };
  const HPI = Math.PI / 2;
  const gold = paint(PAL.gold), dark = paint(0x2a2230, { hatch: 0 }), marble = paint(0xf1ece0), steel = paint(0x8a93a0);
  const desk = paint(0x5a3e2e), beige = paint(0xd8d0bc), red = paint(0xb03a30);

  // ── 1. the night guard's desk, front-right: monitors, a log, cold coffee, an empty chair ──
  const DX = 2.85, DZ = -0.85, TOP = 0.76;
  solid(DX, DZ, 0.56);
  B.add(desk, rb(1.15, 0.05, 0.55, 0.015), DX, TOP - 0.025, DZ);
  B.add(desk, rb(0.05, 0.71, 0.5, 0.01), DX - 0.53, 0.355, DZ);
  B.add(desk, rb(0.36, 0.71, 0.5, 0.012), DX + 0.36, 0.355, DZ);
  B.add(desk, rb(1.05, 0.4, 0.03, 0.008), DX, 0.5, DZ - 0.22);
  for (const y of [0.18, 0.42, 0.62]) B.add(gold, rb(0.08, 0.02, 0.02, 0.006), DX + 0.36, y, DZ + 0.26);
  // two CRTs showing the camera feeds; their scanlines roll
  const feeds = [];
  [[DX - 0.2, 0.1, 'CAM 2 · GALLERY', 0], [DX + 0.2, -0.1, 'CAM 4 · SKYLIGHT', 1]].forEach(([mx, ry, title, k]) => {
    const M = grp(mx, TOP, DZ - 0.07); M.rotation.y = ry;
    mesh(rb(0.34, 0.27, 0.28, 0.04), beige, M, 0, 0.16, 0);
    mesh(rb(0.22, 0.2, 0.12, 0.03), beige, M, 0, 0.15, -0.17);
    mesh(rb(0.2, 0.02, 0.18, 0.006), beige, M, 0, 0.01, 0);
    const tex = canvasTex(160, 120, (c, w, h) => {
      c.fillStyle = '#1c2a2e'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#7fd8c0'; c.lineWidth = 2;
      if (k === 0) { c.strokeRect(50, 30, 60, 46); c.strokeRect(56, 36, 48, 34); c.fillStyle = '#7fd8c0'; c.font = `700 24px ${HAND}`; c.fillText('?', 72, 62); c.beginPath(); c.moveTo(0, 100); c.lineTo(w, 92); c.stroke(); }
      else { c.strokeRect(40, 14, 80, 30); c.beginPath(); c.moveTo(80, 44); c.bezierCurveTo(84, 70, 76, 80, 82, 112); c.stroke(); c.beginPath(); c.arc(82, 60, 5, 0, 7); c.stroke(); }
      c.fillStyle = '#7fd8c0'; c.font = `700 13px ${HAND}`; c.fillText(title, 6, 14); c.fillText('03:07:12', w - 64, h - 6);
      c.fillStyle = '#e8604c'; c.beginPath(); c.arc(w - 10, 10, 4, 0, 7); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 2);
    });
    tex.wrapT = THREE.RepeatWrapping;
    const scr = mesh(new THREE.PlaneGeometry(0.27, 0.2), new THREE.MeshBasicMaterial({ map: tex }), M, 0, 0.165, 0.142);
    scr.userData.noInk = true;
    feeds.push([tex, scr.material, k]);
  });
  // the guard's log, stopped mid-shift
  B.add(paint(0x3f5872), rb(0.32, 0.015, 0.22, 0.004), DX - 0.08, TOP + 0.008, DZ + 0.15, [0, -0.15, 0]);
  decal(0.3, 0.2, (c, w, h) => {
    c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
    c.font = `700 17px ${HAND}`; c.fillStyle = INKC; c.fillText('GUARD LOG', 10, 22);
    c.font = `400 15px ${HAND}`; ['1:00 all quiet', '2:00 all quiet', '2:45 coffee', '3:07 —'].forEach((l, i) => c.fillText(l, 12, 46 + i * 20));
    c.fillStyle = '#b03a30'; c.font = `700 16px ${HAND}`; c.fillText('zzz…', w / 2 + 14, 60);
  }, 0, 200, 132, G, DX - 0.08, TOP + 0.017, DZ + 0.15, [-HPI, 0, 0.15]);
  // a box of doughnuts, lid up
  B.add(paint(0xf29bb4), rb(0.22, 0.05, 0.2, 0.008), DX + 0.42, TOP + 0.025, DZ + 0.12);
  B.add(paint(0xf29bb4), rb(0.22, 0.012, 0.2, 0.004), DX + 0.42, TOP + 0.13, DZ + 0.01, [-1.2, 0, 0]);
  B.add(paint(0xc98a4a), new THREE.TorusGeometry(0.035, 0.018, 8, 14), DX + 0.37, TOP + 0.06, DZ + 0.12, [HPI, 0, 0]);
  B.add(paint(0xe8604c), new THREE.TorusGeometry(0.035, 0.019, 8, 14, Math.PI * 1.3), DX + 0.47, TOP + 0.064, DZ + 0.14, [HPI, 0, 0]);
  // the coffee mug, still steaming (just)
  const mugX = DX + 0.16, mugZ = DZ + 0.19;
  B.add(paint(0xfffaf0), new THREE.CylinderGeometry(0.035, 0.032, 0.09, 12), mugX, TOP + 0.045, mugZ);
  B.add(paint(0xfffaf0), new THREE.TorusGeometry(0.022, 0.007, 6, 10), mugX + 0.038, TOP + 0.05, mugZ);
  mesh(new THREE.CircleGeometry(0.03, 12), paint(0x5a3a22, { hatch: 0 }), G, mugX, TOP + 0.08, mugZ, [-HPI, 0, 0]).userData.noInk = true;
  const steam = [0, 1, 2].map(() => sprite(glowTex, 0xffffff, 0.06));
  // the tape recorder: tap it to hear what the guard was really doing at 3:07
  const TRY = TOP + 0.297, TR = grp(DX + 0.2, TRY, DZ - 0.1); TR.rotation.y = -0.1;   // on top of the second monitor
  mesh(rb(0.2, 0.07, 0.13, 0.015), dark, TR, 0, 0.035, 0);
  const reels = [-1, 1].map(s => { const r = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 10), paint(0xd8d0bc), TR, s * 0.05, 0.076, -0.005); return r; });
  mesh(rb(0.05, 0.012, 0.025, 0.004), paint(0xe8604c), TR, 0.06, 0.075, 0.045);
  const zs = [0, 1, 2].map((i) => {
    const z = mesh(new THREE.PlaneGeometry(0.07 + i * 0.02, 0.07 + i * 0.02), texMat(48, 48, (c, w, h) => {
      c.strokeStyle = '#5a4e5e'; c.lineWidth = 6; c.beginPath(); c.moveTo(8, 10); c.lineTo(w - 8, 10); c.lineTo(8, h - 10); c.lineTo(w - 8, h - 10); c.stroke();
    }), G, 0, -5, 0);
    z.userData.noInk = true; z.material.opacity = 0; return z;
  });
  let tTape = -99, tapes = 0;
  const TAPE = ['Tape, 2:58 a.m.: “…zzz… *snort* …five more minutes, Mum…”', 'Tape, 3:07 a.m.: “…zzz… was that a rope? …zzz…”', 'Tape, 3:20 a.m.: “…zzz… no, YOU guard the Monet… zzz…”'];
  tap(TR, 'play the guard’s tape', (sfx) => {
    tTape = now(); K.say(TAPE[tapes++ % TAPE.length]);
    sfx([[110, 0.5], [95, 0.6], [140, 0.25], [110, 0.6], [95, 0.7]], 'sawtooth', 0.03);
  });
  // an anglepoise lamp: tap to switch it
  const LX = DX - 0.47, LZ = DZ + 0.17;
  B.add(dark, new THREE.CylinderGeometry(0.06, 0.07, 0.025, 14), LX, TOP + 0.013, LZ);
  B.add(dark, new THREE.CylinderGeometry(0.009, 0.009, 0.3, 6), LX + 0.04, TOP + 0.15, LZ, [0, 0, -0.28]);
  const head = grp(LX + 0.085, TOP + 0.29, LZ);          // pivots where the head meets the arm
  mesh(new THREE.ConeGeometry(0.065, 0.11, 14, 1, true).translate(0, -0.055, 0), paint(0x3f6a4a, { side: THREE.DoubleSide }), head, 0, 0, 0, [0, 0, 0]);
  const bulbM = paint(0xfff6d0, { emissive: 0xffe08a, hatch: 0, unique: true });
  mesh(new THREE.SphereGeometry(0.028, 10, 8), bulbM, head, 0, -0.085, 0).userData.noInk = true;
  head.rotation.z = 0.9;
  const pool = sprite(glowTex, 0xffd98a, 0.5); pool.position.set(LX + 0.2, TOP + 0.12, LZ + 0.02);
  let lampOn = true, tLamp = -99;
  tap(head, 'click the desk lamp', (sfx) => { lampOn = !lampOn; tLamp = now(); sfx(lampOn ? [[900, 0.03], [1400, 0.05]] : [[1400, 0.03], [700, 0.05]], 'square', 0.04); });
  // the guard's chair, still slowly turning as if he's just got up
  const CH = grp(DX - 0.05, 0, DZ + 0.6);
  claim(DX - 0.05, DZ + 0.6, 0.22);          // tucked against the desk
  const cb = baker(THREE);
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; cb.add(dark, rb(0.25, 0.03, 0.04, 0.01), Math.cos(a) * 0.12, 0.05, Math.sin(a) * 0.12, [0, -a, 0]); cb.add(dark, new THREE.SphereGeometry(0.025, 6, 5), Math.cos(a) * 0.24, 0.025, Math.sin(a) * 0.24); }
  cb.add(steel, new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8), 0, 0.23, 0);
  cb.flush(CH);
  const seat = grp(0, 0.42, 0, CH);                       // swivels on its post
  mesh(rb(0.42, 0.07, 0.4, 0.03), paint(0x3f5872), seat, 0, 0.0, 0);
  mesh(rb(0.4, 0.42, 0.06, 0.03), paint(0x3f5872), seat, 0, 0.27, 0.19, [-0.08, 0, 0]);
  mesh(rb(0.06, 0.2, 0.04, 0.01), dark, seat, 0, 0.1, 0.2);
  live((t) => {
    seat.rotation.y = 0.35 * Math.sin(t * 0.35) + 0.08 * Math.sin(t * 1.1);
    for (const [tex, mat, k] of feeds) { tex.offset.y = (t * 0.07 + k * 0.4) % 1; mat.color.setScalar(0.85 + 0.15 * Math.sin(t * 17 + k * 3) * Math.sin(t * 3.1)); }
    steam.forEach((s, i) => {
      const u = (t * 0.35 + i / 3) % 1;
      s.position.set(mugX + Math.sin(t * 2 + i * 2) * 0.02 * u, TOP + 0.1 + u * 0.25, mugZ);
      s.material.opacity = 0.4 * Math.sin(u * Math.PI); s.scale.setScalar(0.04 + u * 0.08);
    });
    const kt = t - tTape, playing = kt >= 0 && kt < 3.2;
    reels.forEach(r => { if (playing) r.rotation.y += 0.2; });
    TR.position.y = TRY + (playing ? Math.abs(Math.sin(kt * 8)) * 0.012 : 0);
    zs.forEach((z, i) => {
      const u = playing ? ((kt * 0.6 + i / 3) % 1) : 1;
      z.position.set(DX + 0.25 + u * 0.15, TRY + 0.12 + u * 0.4, DZ - 0.05);
      z.material.opacity = playing ? 1 - u : 0;
    });
    const lk = t - tLamp, nod = lk >= 0 && lk < 0.6 ? Math.sin(lk / 0.6 * Math.PI * 3) * 0.12 * (1 - lk / 0.6) : 0;
    head.rotation.z = 0.9 + nod;
    bulbM.emissiveIntensity = lampOn ? 1.2 : 0; pool.material.opacity = lampOn ? 0.5 + Math.sin(t * 13) * 0.02 : 0;
  });

  // ── 2. the evidence board on the east wall, strung with red thread ──
  {
    const bz = -1.3, by = 1.62, bw = 1.25, bh = 0.78, px = 512, ph = 320;
    const pins = [[70, 64], [230, 60], [400, 70], [120, 230], [300, 210], [440, 250]];
    decal(bw, bh, (c, w, h) => {
      c.fillStyle = '#c69a62'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(${80 + (i % 5) * 20},55,30,0.25)`; c.fillRect((i * 97) % w, (i * 53) % h, 2, 2); }
      const card = (x, y, rot, wd, ht, bg, draw) => { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = bg; c.fillRect(-wd / 2, -10, wd, ht); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.strokeRect(-wd / 2, -10, wd, ht); draw(); c.restore(); };
      card(70, 64, -0.06, 100, 80, '#fbf6ea', () => { c.strokeStyle = '#c08a2a'; c.lineWidth = 6; c.strokeRect(-32, 0, 64, 48); c.font = `700 26px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('?', 0, 34); });
      card(230, 60, 0.05, 110, 70, '#ffe26a', () => { c.font = `700 30px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('3:07 am', 0, 36); });
      card(400, 70, -0.04, 100, 84, '#fbf6ea', () => { c.fillStyle = '#5f8cc8'; c.beginPath(); c.arc(0, 30, 24, 0, 7); c.fill(); c.font = `400 15px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('blue paint!', 0, 68); });
      card(120, 230, 0.08, 120, 76, '#fbf6ea', () => { c.fillStyle = 'rgba(42,34,48,0.7)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(-38 + k * 26, 30 + (k % 2) * 12, 7, 12, 0.3, 0, 7); c.fill(); } c.font = `400 15px ${HAND}`; c.textAlign = 'center'; c.fillText('footprints', 0, 60); });
      card(300, 210, -0.05, 120, 80, '#bfe0f0', () => { c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(-40, 4, 80, 34); c.beginPath(); c.moveTo(-40, 21); c.lineTo(40, 21); c.moveTo(0, 4); c.lineTo(0, 38); c.stroke(); c.font = `400 15px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('skylight', 0, 60); });
      card(440, 250, 0.06, 104, 64, '#fbf6ea', () => { c.font = `700 34px ${SCRIPT}`; c.fillStyle = '#b03a30'; c.textAlign = 'center'; c.fillText('WHO?', 0, 36); });
    }, 0, px, ph, G, 3.975, by, bz, [0, -HPI, 0]);
    const fw = paint(0x6b4a34), x = 3.968;
    B.add(fw, rb(0.04, 0.05, bw + 0.08, 0.01), x, by + bh / 2 + 0.02, bz);
    B.add(fw, rb(0.04, 0.05, bw + 0.08, 0.01), x, by - bh / 2 - 0.02, bz);
    for (const s of [-1, 1]) B.add(fw, rb(0.04, bh, 0.05, 0.01), x, by, bz + s * (bw / 2 + 0.02));
    // pins and thread, in world space just off the cork
    const P = pins.map(([u, v]) => new THREE.Vector3(3.95, by + (0.5 - v / ph) * bh + 0.01, bz + (u / px - 0.5) * bw));
    for (const p of P) B.add(red, new THREE.SphereGeometry(0.016, 8, 6), p.x - 0.005, p.y, p.z);
    const links = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 4], [1, 4]];
    const threads = links.map(([a, b]) => {
      const A = P[a], Bp = P[b], mid = A.clone().add(Bp).multiplyScalar(0.5); mid.y -= 0.02; mid.x = 3.945;
      const m = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([A, mid, Bp]), 8, 0.004, 4), paint(0xd8302a, { emissive: 0xff4a3a, hatch: 0, unique: true }), G);
      m.userData.noInk = true; m.material.emissiveIntensity = 0; return m;
    });
    const hit = mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), G, 3.94, by, bz, [0, -HPI, 0]);
    hit.userData.noInk = true;
    let tBoard = -99;
    tap(hit, 'connect the clues', (sfx) => { tBoard = now(); sfx(links.map((_, i) => [330 + i * 70, 0.12]), 'triangle', 0.05); });
    live((t) => {
      const k = t - tBoard;
      threads.forEach((m, i) => {
        const kk = k - i * 0.12;
        m.material.emissiveIntensity = kk >= 0 && kk < 3 ? Math.min(1, kk * 5) * (1 - smooth((kk - 2.2) / 0.8)) * 1.4 : 0;
      });
    });
  }

  // ── 3. the window washer's rope, over the top of the west wall and down to a coil ──
  {
    const rz = -1.25, ropeM = paint(0xd9c08a, { hatch: 0.5 });
    B.add(ropeM, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-4.06, 2.58, rz), new THREE.Vector3(-3.99, 2.74, rz), new THREE.Vector3(-3.91, 2.62, rz)]), 10, 0.022, 6));
    const R = grp(-3.91, 2.62, rz); HOOK.rope = R;                       // the hanging run pivots where it bends over the wall
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.01, -1.0, 0.0), new THREE.Vector3(0.03, -2.2, 0.03), new THREE.Vector3(0.12, -2.5, 0.06)]);
    mesh(new THREE.TubeGeometry(curve, 30, 0.022, 6), ropeM, R);
    for (let i = 0; i < 4; i++) B.add(ropeM, new THREE.TorusGeometry(0.17 - i * 0.012, 0.025, 6, 20), -3.72, 0.025 + i * 0.045, rz + 0.04, [HPI, 0, i * 0.7]);
    // a bucket and squeegee left at the bottom
    B.add(steel, new THREE.CylinderGeometry(0.13, 0.1, 0.24, 14, 1, true), -3.55, 0.12, rz - 0.42);
    B.add(steel, new THREE.CylinderGeometry(0.1, 0.1, 0.01, 14), -3.55, 0.005, rz - 0.42);
    mesh(new THREE.CircleGeometry(0.12, 14), paint(0x8fc3c9, { hatch: 0 }), G, -3.55, 0.19, rz - 0.42, [-HPI, 0, 0]).userData.noInk = true;
    B.add(steel, new THREE.TorusGeometry(0.13, 0.006, 4, 16, Math.PI), -3.55, 0.24, rz - 0.42, [0, 0.4, 0]);
    B.add(dark, new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), -3.86, 0.44, rz - 0.85, [0.2, 0, -0.06]);
    B.add(dark, rb(0.04, 0.05, 0.3, 0.01), -3.88, 0.88, rz - 0.94, [0.2, 0, 0]);
    solid(-3.6, rz - 0.2, 0.3);
    let tRope = -99;
    tap(R, 'tug the window washer’s rope', (sfx) => { tRope = now(); sfx([[160, 0.12], [140, 0.18], [190, 0.1]], 'sawtooth', 0.03); });
    live((t) => {
      const k = t - tRope, e = k >= 0 && k < 2.5 ? (1 - k / 2.5) : 0;
      R.rotation.x = Math.sin(t * 0.9) * 0.012 + Math.sin(k * 9) * 0.06 * e;
      R.position.y = 2.62 + (k >= 0 && k < 0.4 ? Math.sin(k / 0.4 * Math.PI) * 0.08 : 0);
    });
    // muddy footprints from the empty frame to the rope
    decal(0.7, 3.3, (c, w, h) => {
      // big work-boot treads, toes pointing from the frame towards the rope (the front)
      for (let i = 0; i < 9; i++) {
        const y = 40 + i * (h - 90) / 8, x = w / 2 + (i % 2 ? 20 : -20) + Math.sin(i * 0.6) * 14;
        c.fillStyle = 'rgba(70,50,40,0.6)';
        c.beginPath(); c.roundRect(x - 12, y + 6, 24, 34, 10); c.fill();          // the sole, toe at the bottom
        c.beginPath(); c.roundRect(x - 11, y - 14, 22, 14, 5); c.fill();          // the heel block
        c.fillStyle = 'rgba(200,180,150,0.7)'; for (let k = 0; k < 4; k++) c.fillRect(x - 9, y + 11 + k * 7, 18, 2.5);
      }
    }, 0, 140, 660, G, -3.35, 0.022, -3.0, [-HPI, 0, 0.12]);
  }

  // ── 4. shipping crates in the front-left corner; one's lid pops ──
  {
    const crateTex = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#c9a06a'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(90,60,30,0.6)'; c.lineWidth = 3;
      for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = '#8a6440'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
      c.beginPath(); c.moveTo(8, 8); c.lineTo(w - 8, h - 8); c.stroke();
      c.font = `700 20px ${HAND}`; c.fillStyle = 'rgba(176,58,48,0.85)'; c.textAlign = 'center'; c.fillText('FRAGILE', w / 2, h / 2 - 8); c.fillText('↑ ART ↑', w / 2, h / 2 + 16);
    });
    const crate = paint(0xffffff, { map: crateTex, hatch: 0.5 });
    solid(-3.3, -0.45, 0.4);
    B.add(crate, rb(0.7, 0.7, 0.7, 0.02), -3.3, 0.35, -0.48, [0, 0.08, 0]);
    B.add(crate, rb(0.45, 0.4, 0.45, 0.02), -3.32, 0.9, -0.5, [0, 0.42, 0]);
    // the open one: a lid hinged at its back edge, straw and a frame corner inside
    const cx = -2.42, cz = -0.32;
    solid(cx, cz, 0.28);
    const C = grp(cx, 0, cz); C.rotation.y = -0.25; HOOK.crate = C;
    const cr = baker(THREE);
    cr.add(crate, rb(0.5, 0.42, 0.04, 0.01), 0, 0.21, 0.23); cr.add(crate, rb(0.5, 0.42, 0.04, 0.01), 0, 0.21, -0.23);
    cr.add(crate, rb(0.04, 0.42, 0.42, 0.01), -0.23, 0.21, 0); cr.add(crate, rb(0.04, 0.42, 0.42, 0.01), 0.23, 0.21, 0);
    cr.add(crate, rb(0.46, 0.03, 0.46, 0.01), 0, 0.02, 0);
    cr.flush(C);
    const straw = baker(THREE), strawM = paint(0xe8c860);
    for (let i = 0; i < 26; i++) straw.add(strawM, new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), -0.18 + (i * 0.37) % 0.36, 0.4 + (i % 3) * 0.015, -0.18 + (i * 0.23) % 0.36, [HPI * (i % 2), i, 0.4 * (i % 3)]);
    straw.flush(C);
    HOOK.crateFrame = mesh(rb(0.06, 0.32, 0.3, 0.01), gold, C, 0.08, 0.45, -0.02, [0, 0.3, 0.25]);
    const lid = grp(0, 0.42, -0.25, C);                     // hinge along the back top edge
    mesh(rb(0.52, 0.035, 0.5, 0.01), crate, lid, 0, 0.018, 0.25);
    const puff = [0, 1, 2, 3].map(() => sprite(glowTex, 0xfff0b0, 0.12, C));
    let tLid = -99;
    tap(C, 'pry open the crate', (sfx) => { tLid = now(); sfx([[220, 0.06], [330, 0.06], [660, 0.2]], 'square', 0.035); });
    live((t) => {
      const k = t - tLid;
      let a = 0;
      if (k >= 0 && k < 2.6) a = k < 0.25 ? smooth(k / 0.25) * 1.9 : k < 1.9 ? 1.9 + Math.sin((k - 0.25) * 12) * 0.08 * Math.max(0, 1 - (k - 0.25) * 2) : 1.9 * (1 - smooth((k - 1.9) / 0.5)) + (k > 2.4 ? Math.sin((k - 2.4) * 40) * 0.03 : 0);
      if (HOOK.lidOpen) a = Math.max(a, 1.9);
      lid.rotation.x = -a;
      puff.forEach((s, i) => {
        const kk = k - 0.05 * i;
        if (kk < 0 || kk > 1.2) { s.material.opacity = 0; return; }
        s.position.set(Math.cos(i * 1.6) * 0.12 * (1 + kk), 0.45 + kk * 0.5, Math.sin(i * 1.6) * 0.12 * (1 + kk));
        s.material.opacity = 0.7 * (1 - kk / 1.2);
      });
    });
  }

  // ── 5. the alarm bell high on the west wall, with a beacon ──
  {
    const AZ = -0.62, AY = 2.22;
    B.add(red, rb(0.03, 0.22, 0.22, 0.01), -3.985, AY, AZ);
    const bell = grp(-3.96, AY, AZ);                         // hung from its wall plate
    mesh(new THREE.SphereGeometry(0.1, 16, 10, 0, Math.PI * 2, 0, HPI).rotateZ(-HPI), red, bell, 0.0, 0, 0);
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), steel, bell, 0.02, 0, 0, [0, 0, HPI]);
    const clap = mesh(new THREE.SphereGeometry(0.022, 8, 6), steel, bell, 0.06, -0.105, 0);
    const beaconM = paint(0xff5040, { emissive: 0xff2a1a, hatch: 0, unique: true, opacity: 0.9 });
    B.add(dark, new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), -3.93, AY + 0.17, AZ);
    mesh(new THREE.SphereGeometry(0.04, 12, 8, 0, Math.PI * 2, 0, HPI), beaconM, G, -3.93, AY + 0.18, AZ).userData.noInk = true;
    const fan = grp(-3.93, AY + 0.2, AZ);
    const fanTex = canvasTex(128, 16, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); const v = c.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = v; c.fillRect(0, 0, w, h); });
    const fanM = new THREE.MeshBasicMaterial({ map: fanTex, color: 0xff3a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const a of [0, HPI]) { const f = mesh(new THREE.PlaneGeometry(1.1, 0.1), fanM, fan, 0, 0, 0, [0, a, 0]); f.userData.noInk = true; }
    const halo = sprite(glowTex, 0xff4030, 0.5); halo.position.set(-3.9, AY + 0.19, AZ);
    let tBell = -99;
    HOOK.ringAlarm = (loud = true) => { tBell = now(); if (loud) K.sfx(Array.from({ length: 10 }, (_, i) => [i % 2 ? 1180 : 940, 0.09]), 'square', 0.03); };
    tap(bell, 'ring the alarm', (sfx) => { tBell = now(); const n = []; for (let i = 0; i < 10; i++) n.push([i % 2 ? 1180 : 940, 0.09]); sfx(n, 'square', 0.03); });
    live((t) => {
      const k = t - tBell, on = k >= 0 && k < 3;
      bell.rotation.x = on ? Math.sin(k * 60) * 0.06 * (1 - k / 3) : 0;
      clap.position.z = on ? Math.sin(k * 60) * 0.05 : 0;
      fan.rotation.y = t * 6;
      fanM.opacity = on ? 0.35 : 0;
      beaconM.emissiveIntensity = on ? 1.3 : 0.1 + 0.08 * Math.sin(t * 2);
      halo.material.opacity = on ? 0.7 + Math.sin(k * 12) * 0.2 : 0;
    });
  }

  // ── 6. security cameras sweeping the back corners ──
  const cams = [[-1, 0.75], [1, -0.75]].map(([s, yaw0], i) => {
    const wx = s * 3.97, wz = -5.05, wy = 2.42;
    B.add(steel, rb(0.03, 0.12, 0.12, 0.01), wx, wy, wz);
    B.add(steel, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), wx - s * 0.1, wy, wz, [0, 0, HPI]);
    const pan = grp(wx - s * 0.2, wy, wz);                   // the swivel at the end of the bracket
    mesh(new THREE.SphereGeometry(0.025, 8, 6), steel, pan);
    const tilt = grp(0, -0.02, 0, pan); tilt.rotation.x = 0.38;
    mesh(rb(0.1, 0.09, 0.24, 0.02), paint(0xf1ece0), tilt, 0, -0.04, 0.06);
    mesh(rb(0.12, 0.012, 0.27, 0.004), dark, tilt, 0, 0.012, 0.075);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), dark, tilt, 0, -0.04, 0.18, [HPI, 0, 0]);
    const ledM = paint(0xff3a2a, { emissive: 0xff2a1a, hatch: 0, unique: true });
    mesh(new THREE.SphereGeometry(0.009, 6, 5), ledM, tilt, 0.035, -0.0, 0.18).userData.noInk = true;
    let tCam = -99;
    HOOK.cams.push(() => { tCam = now(); });
    tap(pan, 'wave at the security camera', (sfx) => { tCam = now(); K.say(i ? 'CAM 4 saw: a rope coming down from the skylight at 3:07. Then a lot of fern.' : 'CAM 2 saw: a pair of big muddy boots at 3:07. Then a lens cap.'); sfx([[1760, 0.06], [1760, 0.06], [2093, 0.1]], 'square', 0.03); });
    // the yaw that points it at the middle of the open front (where the visitor stands)
    const look = Math.atan2(0 - (wx - s * 0.2), -0.6 - wz);
    live((t) => {
      const k = t - tCam, on = k >= 0 && k < 3;
      const idle = yaw0 + Math.sin(t * 0.3 + i * 2) * 0.55;
      const w = on ? smooth(k / 0.3) * (1 - smooth((k - 2.4) / 0.6)) : 0;
      pan.rotation.y = idle + (look - idle) * w;
      tilt.rotation.x = 0.38 - w * 0.1;
      ledM.emissiveIntensity = on ? ((k * 8) % 1 < 0.5 ? 1.5 : 0) : ((t % 2) < 1 ? 1 : 0.2);
    });
    return pan;
  });

  // ── 7. track lights along the top of each side wall, washing the paintings ──
  {
    const beamTex = canvasTex(32, 128, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    const beamM = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const motes = [];
    for (const s of [-1, 1]) {
      B.add(dark, rb(0.05, 0.035, 4.7, 0.01), s * 3.9, 2.6, -2.9);
      const spots = s < 0 ? [-4.3, -2.95, -1.95] : [-4.2, -2.9, -3.55];
      for (const z of spots.slice(0, 2)) {
        const ax = s * 3.82, ay = 2.5;
        B.add(dark, new THREE.CylinderGeometry(0.008, 0.008, 0.1, 5), s * 3.87, 2.56, z, [0, 0, -s * 0.8]);
        B.add(dark, new THREE.CylinderGeometry(0.035, 0.045, 0.12, 12), ax, ay, z, [0, 0, s * 0.35]);
        // a soft cone of light down onto the painting below
        const cone = mesh(new THREE.ConeGeometry(0.26, 0.9, 16, 1, true).translate(0, -0.45, 0), beamM, G, ax + s * 0.02, ay - 0.04, z, [0, 0, s * 0.1]);
        cone.userData.noInk = true;
        for (let i = 0; i < 3; i++) { const m = sprite(glowTex, 0xfff2c0, 0.035, G, 0.6); motes.push([m, ax + s * 0.05, z, i * 2.1 + z]); }
      }
    }
    live((t) => {
      for (const [m, x, z, ph] of motes) {
        const u = (t * 0.06 + ph * 0.13) % 1;
        m.position.set(x - Math.sign(x) * (0.05 + Math.sin(t * 0.7 + ph) * 0.06), 2.4 - u * 0.75, z + Math.sin(t * 0.5 + ph) * 0.12);
        m.material.opacity = 0.7 * Math.sin(u * Math.PI);
      }
    });
  }

  // ── 8. the jewel the thief missed, in a glass case on a marble plinth ──
  {
    const jx = 3.0, jz = -2.75;
    solid(jx, jz, 0.26);
    B.add(marble, rb(0.4, 0.82, 0.4, 0.02), jx, 0.41, jz);
    B.add(gold, rb(0.44, 0.04, 0.44, 0.01), jx, 0.84, jz);
    B.add(gold, rb(0.44, 0.04, 0.44, 0.01), jx, 0.02, jz);
    B.add(paint(0x6a4a8a), rb(0.2, 0.05, 0.2, 0.02), jx, 0.885, jz);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.add(gold, rb(0.02, 0.3, 0.02, 0.005), jx + dx * 0.16, 1.01, jz + dz * 0.16);
    for (const s of [-1, 1]) { B.add(gold, rb(0.34, 0.02, 0.02, 0.005), jx, 1.16, jz + s * 0.16); B.add(gold, rb(0.02, 0.02, 0.34, 0.005), jx + s * 0.16, 1.16, jz); }
    mesh(rb(0.31, 0.3, 0.31, 0.005), paint(0xdff0f6, { opacity: 0.22, hatch: 0 }), G, jx, 1.01, jz).userData.noInk = true;
    decal(0.26, 0.1, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4);
      c.font = `700 22px ${SCRIPT}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('The Star of Tiny Planet', w / 2, 26);
      c.font = `400 14px ${HAND}`; c.fillStyle = '#b03a30'; c.fillText('(somehow, still here)', w / 2, 44);
    }, 0, 256, 54, G, jx, 0.62, jz + 0.205);
    const gem = grp(jx, 0.99, jz);
    const gemM = paint(0xbfefff, { emissive: 0x5fcfff, hatch: 0, unique: true });
    mesh(new THREE.OctahedronGeometry(0.06, 0).scale(1, 1.35, 1), gemM, gem);
    const sparks = [0, 1, 2].map(() => sprite(starTex, 0xffffff, 0.08));
    let tGem = -99, gspin = 0.6;
    tap(gem, 'admire the jewel', (sfx) => { tGem = now(); K.say('Why didn’t the thief take the jewel? Too shiny: you can see it from the roof.'); gspin = 14; sfx([[1568, 0.08], [2093, 0.08], [2637, 0.08], [3136, 0.25]], 'sine', 0.04); });
    live((t, dt) => {
      const k = t - tGem;
      gspin += (0.6 - gspin) * Math.min(1, dt * 1.2);
      gem.rotation.y += gspin * dt;
      gem.position.y = 0.99 + Math.sin(t * 1.4) * 0.008 + (k >= 0 && k < 1.6 ? Math.sin(k / 1.6 * Math.PI) * 0.05 : 0);
      gemM.emissiveIntensity = 0.35 + (k >= 0 && k < 1.6 ? (1 - k / 1.6) * 1.5 : 0);
      sparks.forEach((s, i) => {
        const u = (t * 0.8 + i * 0.33) % 1, burst = k >= 0 && k < 1.2;
        const a = i * 2.1 + t * (burst ? 3 : 0.5), r = burst ? 0.05 + k * 0.08 : 0.05;
        s.position.set(jx + Math.cos(a) * r, 1.0 + Math.sin(a * 1.3) * 0.05, jz + Math.sin(a) * r);
        s.material.opacity = burst ? 1 - k / 1.2 : Math.max(0, Math.sin(u * Math.PI * 2)) * 0.8;
        s.material.rotation = t * 2 + i;
      });
    });
  }

  // ── 9. a tall amphora on a column, back-right: it wobbles alarmingly when touched ──
  {
    const vx = 3.55, vz = -3.95;
    solid(vx, vz, 0.2);
    B.add(marble, new THREE.CylinderGeometry(0.15, 0.17, 0.74, 16), vx, 0.37, vz);
    B.add(marble, rb(0.38, 0.05, 0.38, 0.01), vx, 0.765, vz);
    B.add(marble, rb(0.4, 0.04, 0.4, 0.01), vx, 0.02, vz);
    const vt = canvasTex(128, 64, (c, w, h) => {
      c.fillStyle = '#2f6a80'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#e4b84f'; c.fillRect(0, h * 0.42, w, 4); c.fillRect(0, h * 0.62, w, 4);
      c.fillStyle = '#f1e4c8'; for (let x = 4; x < w; x += 16) { c.beginPath(); c.moveTo(x, h * 0.58); c.lineTo(x + 6, h * 0.46); c.lineTo(x + 12, h * 0.58); c.fill(); }
    });
    vt.wrapS = THREE.RepeatWrapping; vt.repeat.x = 3;
    const prof = [[0.001, 0], [0.06, 0], [0.08, 0.03], [0.13, 0.14], [0.125, 0.24], [0.07, 0.31], [0.045, 0.36], [0.07, 0.4]].map(([r, y]) => new THREE.Vector2(r, y));
    const V = grp(vx, 0.79, vz);                              // rocks about its foot
    mesh(new THREE.LatheGeometry(prof, 18), paint(0xffffff, { map: vt, side: THREE.DoubleSide }), V);
    for (const s of [-1, 1]) mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.05, 0.355], [0.12, 0.365], [0.135, 0.3], [0.115, 0.245]].map(([x, y]) => new THREE.Vector3(s * x, y, 0))), 10, 0.009, 5), paint(0x2f6a80), V);
    let tVase = -99;
    tap(V, 'nudge the amphora', (sfx) => { tVase = now(); sfx([[523, 0.07], [494, 0.07], [523, 0.07], [494, 0.07], [440, 0.2]], 'triangle', 0.05); });
    live((t) => {
      const k = t - tVase, e = k >= 0 && k < 2.4 ? Math.exp(-k * 1.6) : 0;
      V.rotation.z = Math.sin(k * 10) * 0.22 * e;
      V.rotation.x = Math.cos(k * 10) * 0.16 * e;
    });
  }

  // ── 10. a kinetic sculpture on a plinth by the west wall ──
  {
    const sx = -3.42, sz = -2.05;
    solid(sx, sz, 0.24);
    B.add(dark, rb(0.38, 0.86, 0.38, 0.02), sx, 0.43, sz);
    B.add(gold, rb(0.42, 0.03, 0.42, 0.01), sx, 0.875, sz);
    B.add(steel, new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), sx, 0.99, sz);
    decal(0.24, 0.09, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4);
      c.font = `700 20px ${SCRIPT}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('Untitled (Loop)', w / 2, 24);
      c.font = `400 13px ${HAND}`; c.fillStyle = '#5a4e5e'; c.fillText('please do not spin', w / 2, 41);
    }, 0, 256, 50, G, sx + 0.193, 0.62, sz, [0, HPI, 0]);
    const S = grp(sx, 1.18, sz);                              // turns on the tip of its rod
    mesh(new THREE.TorusKnotGeometry(0.1, 0.028, 80, 8, 2, 3), gold, S);
    const ring = grp(0, 0, 0, S);
    mesh(new THREE.TorusGeometry(0.16, 0.008, 6, 32), paint(0x6a4a8a), ring);
    let tS = -99, sp = 0.4;
    let spins = 0;
    tap(S, 'spin the sculpture', (sfx) => { tS = now(); if (++spins === 5) { K.say('The label did say please. (ALARM!)'); HOOK.ringAlarm(); HOOK.cams.forEach(f => f()); } sp = 9; sfx([[300, 0.15], [450, 0.15], [600, 0.15], [900, 0.3]], 'sine', 0.04); });
    live((t, dt) => {
      sp += (0.4 - sp) * Math.min(1, dt * 0.7);
      S.rotation.y += sp * dt;
      ring.rotation.x = t * 0.5 + (t - tS < 3 ? (t - tS) * 3 : 0);
    });
  }

  // ── 11. wall paper: a MISSING notice and the museum floor plan, west wall ──
  decal(0.55, 0.72, (c, w, h) => {
    c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
    c.strokeStyle = INKC; c.lineWidth = 5; c.strokeRect(4, 4, w - 8, h - 8);
    c.font = `700 46px ${HAND}`; c.fillStyle = '#b03a30'; c.textAlign = 'center'; c.fillText('MISSING', w / 2, 56);
    c.strokeStyle = '#c08a2a'; c.lineWidth = 10; c.strokeRect(40, 80, w - 80, 130);
    c.setLineDash([8, 8]); c.strokeStyle = 'rgba(42,34,48,0.5)'; c.lineWidth = 3; c.strokeRect(58, 98, w - 116, 94); c.setLineDash([]);
    c.font = `400 22px ${HAND}`; c.fillStyle = INKC;
    ['45 paintings,', 'one night.', 'seen them?'].forEach((l, i) => c.fillText(l, w / 2, 248 + i * 26));
    c.font = `700 24px ${HAND}`; c.fillStyle = '#b03a30'; c.fillText('REWARD', w / 2, h - 18);
  }, 0, 220, 340, G, -3.975, 1.72, -1.92, [0, HPI, 0]);
  decal(0.62, 0.46, (c, w, h) => {
    c.fillStyle = '#2f5a8a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3;
    c.strokeRect(20, 30, w - 40, h - 50);
    c.beginPath(); c.moveTo(w * 0.45, 30); c.lineTo(w * 0.45, h * 0.6); c.moveTo(20, h * 0.6); c.lineTo(w * 0.7, h * 0.6); c.stroke();
    c.strokeRect(w * 0.6, 40, 40, 26);
    c.font = `700 18px ${HAND}`; c.fillStyle = '#fff'; c.fillText('FLOOR PLAN', 22, 22);
    c.font = `400 13px ${HAND}`; c.fillText('skylight', w * 0.6, 82);
    c.fillStyle = '#ff6a5a'; c.font = `700 30px ${HAND}`; c.fillText('✕', w * 0.2, h * 0.5);
    c.strokeStyle = '#ff6a5a'; c.setLineDash([5, 5]); c.beginPath(); c.moveTo(w * 0.24, h * 0.45); c.lineTo(w * 0.55, h * 0.35); c.lineTo(w * 0.64, 70); c.stroke();
  }, 0, 248, 184, G, -3.975, 1.6, -0.28, [0, HPI, 0.03]);
  // a museum banner hanging from the top of the east wall, stirring in the draught
  {
    const BN = grp(3.94, 2.68, -0.25);
    const ban = mesh(new THREE.PlaneGeometry(0.38, 1.0).translate(0, -0.52, 0), texMat(152, 400, (c, w, h) => {
      c.fillStyle = '#6a4a8a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#e4b84f'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 28, w, 6);
      c.save(); c.translate(w / 2, h / 2); c.rotate(-HPI);
      c.font = `700 40px ${SCRIPT}`; c.fillStyle = '#fbf6ea'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Vanishing', 0, -18);
      c.font = `400 22px ${HAND}`; c.fillStyle = '#e4b84f'; c.fillText('a retrospective', 0, 22);
      c.restore();
      c.fillStyle = '#6a4a8a'; c.beginPath(); c.moveTo(0, h); c.lineTo(w / 2, h - 22); c.lineTo(w, h); c.fill();
    }), BN, 0, 0, 0, [0, -HPI, 0]);
    ban.userData.noInk = true; ban.material.side = THREE.DoubleSide;
    B.add(gold, new THREE.CylinderGeometry(0.012, 0.012, 0.46, 6), 3.93, 2.67, -0.25, [HPI, 0, 0]);
    live((t) => { BN.rotation.z = Math.sin(t * 0.8) * 0.05 + Math.sin(t * 2.1) * 0.015; BN.rotation.x = Math.sin(t * 0.6) * 0.03; });
  }

  // ── 12. yellow evidence markers by the clues ──
  [[1, -2.85, -4.75, 0.3], [2, -3.25, -2.55, -0.2], [3, 1.55, -1.85, 0.6], [4, -3.5, -1.0, 0.9]].forEach(([n, x, z, ry]) => {
    const m = new THREE.Shape([new THREE.Vector2(-0.06, 0), new THREE.Vector2(0.06, 0), new THREE.Vector2(0.0, 0.1)]);
    const geo = new THREE.ExtrudeGeometry(m, { depth: 0.08, bevelEnabled: false }).translate(0, 0, -0.04).rotateY(HPI);
    const tent = mesh(geo, paint(0xf6c445), G, x, 0, z, [0, ry, 0]);
    const num = mesh(new THREE.PlaneGeometry(0.055, 0.055), texMat(48, 48, (c, w, h) => { c.font = `700 40px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), w / 2, h / 2 + 2); }), tent, 0, 0.048, 0.033, [-0.54, 0, 0]);
    num.userData.noInk = true;
  });

  // ═══ round 2: THE CASE OF THE EMPTY FRAME — a whodunit solved with your eyes ═══
  // The clues are things in this room: three pairs of shoes (only one matches the boot
  // prints), the wall clock that stopped when the rope swung into it, the smear on the rope
  // and the paint tin it matches. Name the thief, then say where it's hidden: the painting
  // flies home to its frame, and a lost page turns up in the crate where it was hidden.
  const { games, quiz, say, page } = K;
  const sh = baker(THREE);
  // the guard's trainers, kicked off by his chair
  for (const s of [-1, 1]) {
    sh.add(paint(0xf6f2ea), rb(0.09, 0.06, 0.22, 0.03), 2.42 + s * 0.07, 0.04, -0.3, [0, 0.2 * s, 0]);
    sh.add(paint(0xe8604c), rb(0.095, 0.02, 0.23, 0.008), 2.42 + s * 0.07, 0.01, -0.3, [0, 0.2 * s, 0]);
  }
  // the curator's red heels by the bench: heels leave dots, not treads
  for (const s of [-1, 1]) {
    const x = -2.08 + s * 0.06, z = -1.72 + s * 0.03;
    sh.add(red, rb(0.075, 0.015, 0.19, 0.006), x, 0.055, z, [-0.4, 0.3, 0]);
    sh.add(red, rb(0.08, 0.045, 0.07, 0.02), x + 0.02, 0.022, z + 0.07, [0, 0.3, 0]);
    sh.add(dark, new THREE.CylinderGeometry(0.008, 0.006, 0.09, 6), x - 0.025, 0.045, z - 0.075);
  }
  // the window washer's work boots by the crates, still muddy
  const mud = paint(0x5a4030, { hatch: 0.6 });
  for (const s of [-1, 1]) {
    const x = -3.0 + s * 0.09, z = -1.05;
    sh.add(paint(0x8a5a2a), rb(0.12, 0.08, 0.27, 0.03), x, 0.04, z + 0.03, [0, s * 0.15, 0]);
    sh.add(paint(0x8a5a2a), rb(0.11, 0.24, 0.12, 0.03), x, 0.18, z - 0.06, [0, s * 0.15, 0]);
    sh.add(dark, rb(0.13, 0.025, 0.28, 0.008), x, 0.012, z + 0.03, [0, s * 0.15, 0]);
    for (let k = 0; k < 3; k++) sh.add(mud, new THREE.SphereGeometry(0.025, 6, 5), x + (k - 1) * 0.035, 0.03, z + 0.15 - k * 0.04, null, [1.4, 0.5, 1]);
  }
  // three tins of paint by the bucket: only one matches the smear on the rope
  [['GALLERY GOLD', '#e4b84f', -3.08, -1.78], ['SKYLIGHT BLUE', '#2f6ad0', -3.22, -1.58], ['VELVET RED', '#b03a30', -3.02, -1.48]].forEach(([name, col, x, z], i) => {
    const tex = canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = '#d8dce4'; c.fillRect(0, 0, w, h); c.fillStyle = col; c.fillRect(0, 10, w, h - 20);
      c.fillStyle = '#fff'; c.font = `700 22px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const cx of [w * 0.25, w * 0.75]) c.fillText(name, cx, h / 2);
    });
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.13, 16), paint(0xffffff, { map: tex, hatch: 0.3 }), G, x, 0.065, z, [0, -0.8 + i, 0]);
    if (i === 1) {          // the blue one's open, with a drip down the side
      mesh(new THREE.CircleGeometry(0.062, 16), paint(0x2f6ad0, { hatch: 0 }), G, x, 0.131, z, [-HPI, 0, 0]).userData.noInk = true;
      sh.add(paint(0xb8bec8), new THREE.CylinderGeometry(0.072, 0.072, 0.012, 16), x + 0.1, 0.006, z + 0.04);
    } else sh.add(paint(0xb8bec8), new THREE.CylinderGeometry(0.072, 0.072, 0.012, 16), x, 0.136, z);
  });
  sh.flush(G);
  // the blue smear on the rope, where the washer's paint-covered gloves grabbed it
  mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.14, 8), paint(0x2f6ad0, { hatch: 0 }), HOOK.rope, 0.012, -1.3, 0);
  // the clock on the east wall, knocked to a stop by the swinging rope
  {
    const CK = grp(3.97, 2.08, -3.52); CK.rotation.y = -HPI;
    mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), gold, CK, 0, 0, 0.02, [HPI, 0, 0]);
    mesh(new THREE.CircleGeometry(0.145, 24), paint(0xfbf6ea, { hatch: 0 }), CK, 0, 0, 0.042).userData.noInk = true;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; mesh(rb(0.012, 0.03, 0.004, 0.002), dark, CK, Math.sin(a) * 0.12, Math.cos(a) * 0.12, 0.045, [0, 0, -a]).userData.noInk = true; }
    const hand = (len, wid, ang) => { const p = grp(0, 0, 0.05, CK); p.rotation.z = -ang; mesh(rb(wid, len, 0.006, 0.002).translate(0, len / 2 - 0.01, 0), dark, p).userData.noInk = true; return p; };
    hand(0.075, 0.016, (3 + 7 / 60) / 12 * Math.PI * 2);    // 3:07
    hand(0.115, 0.01, 7 / 60 * Math.PI * 2);
    mesh(new THREE.CircleGeometry(0.012, 8), red, CK, 0, 0, 0.056).userData.noInk = true;
    decal(0.36, 0.1, (c, w, h) => { c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4); c.font = `700 19px ${HAND}`; c.fillStyle = '#b03a30'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EVIDENCE · please do not wind', w / 2, h / 2 + 1); }, 0, 220, 60, CK, 0, -0.24, 0.01);
    // and it's still slightly wobbling on its nail
    live((t) => { CK.rotation.x = Math.sin(t * 1.7) * 0.03; });
  }
  // the stolen painting: rolled into the FRAGILE ART crate all along
  const PNT = grp(0, -50, 0); PNT.visible = false;
  {
    const pw = 0.78, ph = 0.64;
    mesh(new THREE.PlaneGeometry(pw, ph), paint(0xffffff, { hatch: 0, map: canvasTex(312, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f4a98a'); g.addColorStop(0.55, '#f6d6a0'); g.addColorStop(1, '#6a8fb8'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(w * 0.68, h * 0.42, 30, 0, 7); c.fill();
      c.fillStyle = '#4f7a6a'; c.beginPath(); c.arc(w / 2, h * 1.35, h * 0.75, 0, 7); c.fill();
      c.fillStyle = '#e8604c'; for (const [x, s] of [[0.36, 1], [0.5, 1.3], [0.62, 0.9]]) { c.fillRect(w * x - 9 * s, h * 0.7 - 30 * s, 18 * s, 30 * s); c.beginPath(); c.moveTo(w * x - 13 * s, h * 0.7 - 30 * s); c.lineTo(w * x, h * 0.7 - 48 * s); c.lineTo(w * x + 13 * s, h * 0.7 - 30 * s); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; for (let i = 0; i < 40; i++) { c.beginPath(); c.moveTo((i * 37) % w, (i * 53) % (h * 0.5)); c.lineTo((i * 37) % w + 6, (i * 53) % (h * 0.5) + 2); c.stroke(); }
      c.font = `400 14px ${SCRIPT}`; c.fillStyle = '#2a2230'; c.fillText('J.G.', w - 34, h - 10);
    }) }), PNT).userData.noInk = true;
    for (const s of [-1, 1]) { mesh(rb(pw + 0.06, 0.035, 0.03, 0.008), gold, PNT, 0, s * (ph / 2 + 0.015), 0); mesh(rb(0.035, ph, 0.03, 0.008), gold, PNT, s * (pw / 2 + 0.015), 0, 0); }
  }
  const pg = page();
  const pgSpot = grp(0, -50, 0, HOOK.crate); pgSpot.visible = false; pgSpot.add(pg); pg.position.set(0, 0.42, 0.02); pg.rotation.y = 0.4;
  let solved = false, tSolve = -99;
  const from = new THREE.Vector3(-2.42, 0.5, -0.32), to = new THREE.Vector3(-3.2, 1.18, -5.352);
  const solve = () => {
    if (solved) return;
    solved = true; tSolve = now();
    PNT.visible = true; HOOK.crateFrame.visible = false;
    K.sfx([[392, 0.12], [523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.4]], 'triangle', 0.06);
  };
  live((t) => {
    if (!solved) return;
    const u = smooth((t - tSolve) / 2.6);
    PNT.position.lerpVectors(from, to, u); PNT.position.y += Math.sin(u * Math.PI) * 1.1;
    PNT.rotation.set(-1.2 * (1 - u), (1 - u) * 3, Math.sin(u * Math.PI * 2) * 0.2);
    PNT.scale.setScalar(0.5 + u * 0.5);
    if (u >= 1 && !pgSpot.visible) { pgSpot.visible = true; pgSpot.position.y = 0; HOOK.lidOpen = true; say('Case closed! The painting is home… and a lost page was tucked in the crate underneath it.'); }
  });
  games.replace('solve the empty frame', (m) => quiz(m.game, 'The case of the empty frame', [
    { q: 'Clue 1. The muddy prints run from the empty frame to the rope. Three pairs of shoes are lying about the gallery. Which made the prints?', choices: ['the trainers by the guard’s desk', 'the red heels by the bench', 'the muddy boots by the crates'], answer: 2, why: 'Big chunky treads with a heel block: the work boots. Heels would leave little dots, trainers a zigzag.' },
    { q: 'Clue 2. The rope swung into the clock on its way down and stopped it. What time does it say?', choices: ['2:45', '3:07', '4:30'], answer: 1, why: '3:07: the minute the guard’s log stops. (His tape is just snoring. He was asleep, not stealing.)' },
    { q: 'Clue 3. There’s a smear on the rope. Which tin by the bucket matches it?', choices: ['Gallery Gold', 'Skylight Blue', 'Velvet Red'], answer: 1, why: 'Skylight Blue, the open tin with the drip. Someone was painting the skylight frame that night.' },
    { q: 'Boots, a rope, blue paint, 3:07. Who took the painting?', choices: ['Gus, the night guard', 'Dr. Plum, the curator', 'Wes, the window washer'], answer: 2, why: 'Wes! The only one with muddy boots, a rope down from the skylight, and Skylight Blue on his gloves.' },
    { q: 'But Wes never got it out of the building. Where did he hide it?', choices: ['in the paint bucket', 'in the crate marked FRAGILE ↑ ART ↑', 'behind the guard’s doughnuts'], answer: 1, why: 'In the crate! (Prise the lid and you can see a gold corner.) Watch the back wall…', reveal: (ok) => { if (ok) m.game.later(600, solve); } },
  ], { intro: solved ? 'Solved already, detective: the painting is back on the wall. Play again to walk through the clues.' : 'The frame on the back wall is empty and the culprit is still in the building. Every clue is something you can see in this room: look around, then answer.',
    end: (s, n) => solved ? `${s} of ${n}. Case closed: Wes is busted and the painting is back on the wall. The full mystery (45 paintings!) is on the big screen.` : `${s} of ${n}. Not quite solved: look round the room again. The shoes, the clock, the rope…` }));

  // ── secrets and jokes ──
  decal(0.3, 0.1, (c, w, h) => { c.fillStyle = '#ffe26a'; c.fillRect(0, 0, w, h); c.font = `700 22px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EVIDENCE (half eaten)', w / 2, h / 2 + 1); }, 0, 200, 64, G, DX + 0.42, TOP + 0.052, DZ + 0.12, [-HPI, 0, 0]);
  decal(0.38, 0.12, (c, w, h) => { c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4); c.font = `700 20px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('please sit (the art can’t)', w / 2, h / 2 + 1); }, 0, 240, 76, G, -1.2, 0.505, -1.6, [-HPI, 0, 0]);

  // ═══ round 3: the floor, walk-over dressing edge to edge (flat, so nobody is blocked) ═══
  // one big canvas laid over the whole floor; the game rings are cut out of it so they still glow
  const floorArt = (draw, seed) => {
    const cw = 2048, ch = 1536, PXM = cw / 8;
    const P = (x, z) => [(x + 4) * PXM, (z + 5.5) * PXM];
    const R = K.mkRng(seed);
    const m = mesh(new THREE.PlaneGeometry(8, 6), texMat(cw, ch, (c) => {
      c.lineCap = c.lineJoin = 'round';
      draw(c, P, PXM, R);
      c.globalCompositeOperation = 'destination-out';
      for (const q of K.K.minis) { const [px, py] = P(q.x, q.z); c.beginPath(); c.arc(px, py, 0.5 * PXM, 0, 7); c.fill(); }
    }), G, 0, 0.008, -2.5, [-Math.PI / 2, 0, 0]);
    m.userData.noInk = true; m.renderOrder = 1;
    return m;
  };
  // draw something at room point (x, z), rotated a, scaled to s metres per 100 px
  const at = (c, P, PXM, x, z, a, s, fn) => { const [px, py] = P(x, z); c.save(); c.translate(px, py); c.rotate(a); c.scale(s * PXM / 100, s * PXM / 100); fn(c); c.restore(); };
  floorArt((c, P, M, R) => {
    // the museum runner from the door to the screen, with brass stanchion bases set into the floor
    const [x0, y0] = P(-0.42, 0.35), [x1, y1] = P(0.42, -4.75);
    c.fillStyle = '#8e2f3a'; c.fillRect(x0, y1, x1 - x0, y0 - y1);
    c.strokeStyle = '#e4b84f'; c.lineWidth = 9; c.strokeRect(x0 + 14, y1 + 14, x1 - x0 - 28, y0 - y1 - 28);
    c.fillStyle = 'rgba(228,184,79,0.5)'; for (let y = y1 + 60; y < y0 - 40; y += 90) { c.beginPath(); c.moveTo((x0 + x1) / 2, y - 20); c.lineTo((x0 + x1) / 2 + 18, y); c.lineTo((x0 + x1) / 2, y + 20); c.lineTo((x0 + x1) / 2 - 18, y); c.fill(); }
    for (const s of [-1, 1]) for (let z = -0.2; z > -4.6; z -= 0.9) {
      const [px, py] = P(s * 0.62, z), g = c.createRadialGradient(px - 6, py - 6, 2, px, py, 26);
      g.addColorStop(0, '#fff2b0'); g.addColorStop(1, '#c08a2a'); c.fillStyle = g; c.beginPath(); c.arc(px, py, 24, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke();
    }
    // CRIME SCENE tape laid across the floor
    const tape = (xa, za, xb, zb) => {
      const [ax, ay] = P(xa, za), [bx, by] = P(xb, zb), L = Math.hypot(bx - ax, by - ay);
      c.save(); c.translate(ax, ay); c.rotate(Math.atan2(by - ay, bx - ax));
      c.fillStyle = '#f6d23a'; c.fillRect(0, -16, L, 32); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(0, -16, L, 32);
      c.fillStyle = INKC; c.font = `700 20px ${HAND}`; c.textBaseline = 'middle';
      for (let x = 10; x < L - 200; x += 260) c.fillText('CRIME SCENE · DO NOT CROSS', x, 1);
      c.restore();
    };
    tape(1.0, -0.4, 3.2, -1.6); tape(-1.1, -4.6, -0.6, -2.4); tape(1.2, -3.2, 3.3, -4.3); tape(-3.6, -0.1, -1.4, -0.9);
    // chalk circles round each evidence tent, and chalk notes
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.fillStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 5; c.font = `700 30px ${HAND}`;
    for (const [n, x, z] of [[1, -2.85, -4.75], [2, -3.25, -2.55], [3, 1.55, -1.85], [4, -3.5, -1.0]]) {
      const [px, py] = P(x, z); c.beginPath(); c.arc(px, py, 0.2 * M, 0, 7); c.stroke(); c.fillText('#' + n, px + 0.2 * M, py - 0.12 * M);
    }
    const chalk = (t, x, z, a, px = 34) => at(c, P, M, x, z, a, 0.5, (c) => { c.font = `700 ${px}px ${HAND}`; c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillText(t, 0, 0); });
    chalk('3:07 a.m.', 1.0, -4.95, -0.1); chalk('boots → crate?', -2.35, -1.2, -0.5); chalk('the jewel? left behind!', 2.0, -2.3, 0.15, 28); chalk('↑ skylight', -3.0, -3.3, -1.4, 30);
    // the muddy trail goes on: from the bottom of the rope to the FRAGILE ART crate, dripping Skylight Blue
    for (let i = 0; i < 7; i++) {
      const u = i / 6, x = -3.55 + u * 1.0 + (i % 2 ? 0.08 : -0.08), z = -1.15 + u * 0.55;
      at(c, P, M, x, z, Math.atan2(0.55, 1.0) + Math.PI / 2, 0.16, (c) => {
        c.fillStyle = 'rgba(70,50,40,0.6)'; c.beginPath(); c.roundRect(-12, -40, 24, 34, 10); c.fill(); c.beginPath(); c.roundRect(-11, 4, 22, 14, 5); c.fill();
      });
      const [bx, by] = P(x + 0.1, z - 0.06); c.fillStyle = '#2f6ad0'; c.beginPath(); c.arc(bx, by, 6 + (i % 3) * 3, 0, 7); c.fill();
    }
    // a dropped glove, blue fingertips
    at(c, P, M, -2.95, -0.95, 0.8, 0.13, (c) => { c.fillStyle = '#e8dcc0'; c.beginPath(); c.roundRect(-30, -10, 60, 60, 16); c.fill(); for (let k = 0; k < 4; k++) { c.beginPath(); c.roundRect(-28 + k * 15, -50, 12, 46, 6); c.fill(); } c.fillStyle = '#2f6ad0'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-22 + k * 15, -46, 7, 0, 7); c.fill(); } c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(-30, 30, 60, 8); });
    // floor-guide leaflets everywhere
    for (let i = 0; i < 16; i++) at(c, P, M, -3.6 + R() * 7.2, -5.2 + R() * 5.3, R() * 6.3, 0.2, (c) => {
      c.fillStyle = '#fbf6ea'; c.fillRect(-40, -55, 80, 110); c.strokeStyle = 'rgba(42,34,48,0.5)'; c.lineWidth = 3; c.strokeRect(-40, -55, 80, 110);
      c.fillStyle = '#6a4a8a'; c.fillRect(-40, -55, 80, 22); c.fillStyle = '#fff'; c.font = `700 12px ${HAND}`; c.fillText('FLOOR GUIDE', -34, -39);
      c.fillStyle = 'rgba(42,34,48,0.5)'; for (let y = -20; y < 45; y += 12) c.fillRect(-32, y, 40 + (y * 7) % 24, 4);
    });
    // spilled coffee and doughnut crumbs by the guard's desk, a dropped key ring
    { const [px, py] = P(2.35, -0.25); c.fillStyle = 'rgba(110,70,40,0.55)'; c.beginPath(); c.ellipse(px, py, 46, 28, 0.4, 0, 7); c.fill(); c.beginPath(); c.arc(px + 50, py + 18, 9, 0, 7); c.fill(); }
    for (let i = 0; i < 20; i++) { const [px, py] = P(3.2 + (R() - 0.5) * 0.6, -0.3 + (R() - 0.5) * 0.3); c.fillStyle = i % 3 ? '#c98a4a' : '#f29bb4'; c.beginPath(); c.arc(px, py, 3 + R() * 3, 0, 7); c.fill(); }
    at(c, P, M, 1.75, -0.65, 0.4, 0.12, (c) => { c.strokeStyle = '#e4b84f'; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, 24, 0, 7); c.stroke(); for (const a of [0.4, 1.2, 2.1]) { c.save(); c.rotate(a); c.fillStyle = '#b8bec8'; c.fillRect(22, -5, 46, 10); c.fillRect(56, 5, 8, 8); c.restore(); } });
  }, 47);
  // the fun one: the taped-out outline of the missing painting, in front of its empty frame
  {
    const OL = grp(-3.15, 0, -4.98);
    const ol = mesh(new THREE.PlaneGeometry(1.0, 0.55), texMat(400, 220, (c, w, h) => {
      c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.setLineDash([26, 10]); c.strokeRect(14, 14, w - 28, h - 28); c.setLineDash([]);
      c.fillStyle = '#ffffff'; c.font = `700 30px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('painting was here', w / 2, h / 2 - 10);
      c.font = `400 20px ${HAND}`; c.fillText('(roughly)', w / 2, h / 2 + 24);
    }), OL, 0, 0.012, 0, [-HPI, 0, 0]);
    ol.userData.noInk = true; ol.renderOrder = 2;
    const flash = sprite(glowTex, 0xffffff, 0.3, OL); flash.position.y = 0.4;
    let tOL = -99, snaps = 0;
    const FOR = ['Forensics photograph the outline. Conclusion: it was painting-shaped.', 'Snap. The outline has been photographed from its good side.', 'Snap. Forensics would like you to stop standing in the evidence.'];
    tap(OL, 'photograph the crime scene', (sfx) => { tOL = now(); K.say(FOR[snaps++ % FOR.length]); sfx([[2400, 0.03], [1200, 0.05], [600, 0.08]], 'square', 0.035); });
    live((t) => { const k = t - tOL, f = k >= 0 && k < 0.6 ? 1 - k / 0.6 : 0; flash.material.opacity = f; flash.scale.setScalar(0.4 + f * 1.8); ol.material.color.setScalar(1 + f); });
  }
  // more solid bits where there's room: velvet museum ottomans along the walls
  K.scatter(2, 0.2, (x, z) => {
    B.add(paint(0x6a4a8a), new THREE.CylinderGeometry(0.19, 0.19, 0.3, 16), x, 0.17, z);
    B.add(gold, new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16), x, 0.015, z);
    B.add(paint(0x6a4a8a), new THREE.SphereGeometry(0.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, 0.32, z, null, [1, 0.25, 1]);
  }, { along: 'walls' });

  B.flush(G);
}
