// ─── dressing for the deckgpt room ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
// An old picture palace: a cinema organ with its pipes, a box office, velvet ropes, lobby
// posters in bulb frames, a giant film reel, a standee and a sandwich board for tonight's show.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// static pieces collected per material and merged into one mesh each
function bag(THREE, rb) {
  const bins = new Map();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), Sc = new THREE.Vector3();
  const add = (geo, mat, m) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups(); g.applyMatrix4(m);
    if (!bins.has(mat)) bins.set(mat, []);
    bins.get(mat).push(g);
  };
  const frame = (base) => {
    const put = (geo, mat, x = 0, y = 0, z = 0, rot = null, s = 1) => {
      E.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0);
      M.compose(P.set(x, y, z), Q.setFromEuler(E), typeof s === 'number' ? Sc.set(s, s, s) : Sc.set(s[0], s[1], s[2]));
      add(geo, mat, base ? M.clone().premultiply(base) : M.clone());
    };
    return {
      put,
      box: (w, h, d, mat, x, y, z, r = 0.03, rot) => put(rb(w, h, d, r), mat, x, y, z, rot),
      at: (x, y, z, ry = 0, rx = 0, rz = 0) => frame(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)).premultiply(base || new THREE.Matrix4())),
    };
  };
  return {
    ...frame(null),
    flush(parent, noInk = false) {
      for (const [mat, list] of bins) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.userData.noInk = noInk; parent.add(m); }
      bins.clear();
    },
  };
}

export default function dress(kit) {
  const { THREE, g, put, paint, tap, live, free, claim, rb, canvasTex, HAND, SCRIPT, INKC, D, PAL, kit: sub, now, shadow } = kit;
  const S = bag(THREE, rb), L = bag(THREE, rb);
  const { fx, say, onExit, games, shuffle } = kit;
  const showAll = (o, v) => o.traverse(q => { q.visible = v; });      // hidden things mustn't catch taps
  const CHANGES = [];                  // what the lights-out puzzle can quietly change: { what, why, on, off }
  let baseFilter = '';                 // the filter the current slide wants
  const tapsWithin = (arr, n, secs) => { arr.push(now()); while (arr.length && now() - arr[0] > secs) arr.shift(); if (arr.length >= n) { arr.length = 0; return true; } return false; };
  const gold = paint(PAL.gold), red = paint(0xb03a30), plum = paint(0x6b2730), dark = paint(0x2a2230, { hatch: 0 }), walnut = paint(0x5a3a2a), cream = paint(0xf6eedb);
  const opaque = (w, h, draw) => paint(0xffffff, { map: canvasTex(w, h, draw), hatch: 0, unique: true });
  const plane = (w, h, mat, x, y, z, rot) => { const m = put(new THREE.PlaneGeometry(w, h), mat, x, y, z, rot); m.userData.noInk = true; return m; };
  const since = (t0) => now() - t0;
  const LW = -4 + 0.06, RW = 4 - 0.06, BW = -D + 0.5;
  const glow = (col) => new THREE.MeshBasicMaterial({ color: col });
  const deco = (c, w, h, bg, fg) => {                 // an art-deco sunburst behind a poster
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = fg;
    for (let k = 0; k < 18; k++) { const a0 = Math.PI + k / 18 * Math.PI, a1 = a0 + Math.PI / 36; c.beginPath(); c.moveTo(w / 2, h * 0.62); c.lineTo(w / 2 + Math.cos(a0) * w, h * 0.62 + Math.sin(a0) * w); c.lineTo(w / 2 + Math.cos(a1) * w, h * 0.62 + Math.sin(a1) * w); c.fill(); }
  };

  // ══ THE CINEMA ORGAN, back-left: console, bench and a wall of pipes (tap: play it) ══
  {
    const x = -3.15, z = -5.02;
    claim(x, z, 0.32); claim(x - 0.3, z, 0.32); claim(x + 0.3, z, 0.32); claim(x, z + 0.58, 0.25);
    const O = S.at(x, 0, z, 0);
    O.box(1.0, 0.62, 0.5, walnut, 0, 0.31, 0, 0.03);                                 // the body
    for (const s of [-1, 1]) O.box(0.07, 1.0, 0.58, red, s * 0.52, 0.5, 0.02, 0.03); // the cheeks
    O.box(1.1, 0.06, 0.6, gold, 0, 1.01, 0.02, 0.02);                               // the lid
    O.box(0.98, 0.06, 0.2, walnut, 0, 0.66, 0.2, 0.01);                            // lower manual's keybed
    O.box(0.98, 0.06, 0.16, walnut, 0, 0.75, 0.05, 0.01);                          // upper manual's keybed
    O.box(0.96, 0.12, 0.04, walnut, 0, 0.88, -0.06, 0.01, [-0.5, 0, 0]);           // the stop rail
    O.box(0.5, 0.26, 0.02, walnut, 0, 1.17, -0.12, 0.01, [-0.25, 0, 0]);            // music rack
    O.box(0.9, 0.04, 0.3, walnut, 0, 0.02, 0.38, 0.01);                            // the pedalboard
    for (let i = 0; i < 9; i++) O.box(0.05, 0.035, 0.26, i % 3 === 1 ? dark : cream, -0.4 + i * 0.1, 0.055, 0.4, 0.008);
    // stop tabs in a rainbow along the rail
    const tabs = [0xe8604c, 0xf6eedb, 0xe4b84f, 0x7fb3a8, 0xf6eedb, 0x8f7ae8, 0xe8604c, 0xf6eedb, 0x7fb3a8, 0xe4b84f];
    tabs.forEach((col, i) => O.box(0.06, 0.03, 0.05, paint(col), -0.38 + i * 0.085, 0.9, -0.03, 0.008, [-0.5, 0, 0]));
    // keyboards: flat strips of keys
    const keysM = opaque(512, 32, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8a7e8e'; c.lineWidth = 1.5;
      for (let i = 0; i <= 36; i++) { c.beginPath(); c.moveTo(i * w / 36, 0); c.lineTo(i * w / 36, h); c.stroke(); }
      c.fillStyle = '#2a2230';
      for (let i = 0; i < 36; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) c.fillRect((i + 0.65) * w / 36, 0, w / 36 * 0.7, h * 0.6);
    });
    plane(0.92, 0.12, keysM, x, 0.695, z + 0.24, [-Math.PI / 2, 0, 0]);
    plane(0.92, 0.12, keysM, x, 0.785, z + 0.08, [-Math.PI / 2, 0, 0]);
    const sheet = opaque(160, 96, (c, w, h) => {
      c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6a6070'; c.lineWidth = 1;
      for (let s = 0; s < 3; s++) for (let l = 0; l < 5; l++) { c.beginPath(); c.moveTo(6, 14 + s * 28 + l * 4); c.lineTo(w - 6, 14 + s * 28 + l * 4); c.stroke(); }
      c.fillStyle = INKC; for (let k = 0; k < 18; k++) { c.beginPath(); c.ellipse(14 + k * 8, 16 + (k % 3) * 28 + ((k * 5) % 9) * 2, 2.6, 2, -0.4, 0, 7); c.fill(); }
    });
    plane(0.4, 0.22, sheet, x, 1.18, z - 0.098, [-0.25, 0, 0]);
    // three keys that go down when it plays
    const keys = [];
    for (let i = 0; i < 3; i++) { const k = new THREE.Group(); k.position.set(x - 0.2 + i * 0.17, 0.705, z + 0.24); g.add(k); sub(k).box(0.024, 0.016, 0.11, paint(0xfbf6ea), 0, 0, 0, 0.004); keys.push(k); }
    // the bench
    S.box(0.72, 0.07, 0.3, red, x, 0.44, z + 0.6, 0.03);
    for (const s of [-1, 1]) S.box(0.06, 0.42, 0.26, walnut, x + s * 0.3, 0.21, z + 0.6, 0.015);
    // the pipes, on a chest along the back wall, in a golden arch
    S.box(1.42, 0.14, 0.14, walnut, x, 0.93, BW + 0.09, 0.02);
    const pipeM = paint(PAL.gold, { emissive: 0x000000, unique: true }), mouthM = dark, pipes = [];
    for (let i = 0; i < 13; i++) {
      const px = x - 0.6 + i * 0.1, h = 0.55 + (1 - Math.abs(i - 6) / 6) * 0.75 + (i % 2) * 0.06, r = 0.04 - Math.abs(i - 6) * 0.002;
      pipes.push(new THREE.CylinderGeometry(r, r, h, 10).translate(px - x, 0.1 + h / 2, 0).toNonIndexed());
      pipes.push(new THREE.ConeGeometry(r, 0.1, 10).rotateX(Math.PI).translate(px - x, 0.05, 0).toNonIndexed());
      S.box(r * 1.1, 0.05, 0.01, mouthM, px, 1.2, BW + 0.09 + r, 0.003);
    }
    const pm = put(mergeGeometries(pipes), pipeM, x, 1.0, BW + 0.09);
    const organ = new THREE.Group(); organ.position.set(x, 0, z); g.add(organ);
    organ.add(put(new THREE.BoxGeometry(1.1, 1.05, 0.6), new THREE.MeshBasicMaterial({ visible: false }), 0, 0.52, 0.02));   // the tap target
    organ.children[0].userData.noInk = true;
    let t0 = -9;
    live((t) => {
      const s = since(t0), on = s < 2.4;
      const e = on ? 0.9 * Math.max(0, Math.sin(Math.min(1, s / 0.3) * Math.PI / 2)) * (1 - s / 2.4) * (0.8 + 0.2 * Math.sin(s * 30)) : 0.06 + 0.04 * Math.sin(t * 1.5);
      pm.scale.y = 1 + (on ? 0.05 * Math.abs(Math.sin(s * 9)) * (1 - s / 2.4) : 0);
      pipeM.emissive.setRGB(e, e * 0.75, e * 0.3); pipeM.emissiveIntensity = 1;
      keys.forEach((k, i) => { k.position.y = 0.705 - (on && Math.floor(s * 3) % 3 === i ? 0.012 : 0); });
    });
    const otaps = []; let st0 = -9;
    live((t) => {
      const s = since(st0);
      if (s < 3) { fx.filter(`saturate(${1.6 + Math.sin(s * 20) * 0.5}) contrast(1.2) brightness(${1 + Math.max(0, 0.5 - s) })`); chase.forEach((b, i) => { b.material = (i + Math.floor(t * 30)) % 2 ? bulbsDim : bulbsOn; }); }
      else if (st0 > 0) { st0 = -9; fx.filter(baseFilter); }
    });
    CHANGES.push({ what: 'The organ pipes turned silver', why: 'Gold pipes, then silver ones: a very expensive continuity error.', on: () => pipeM.color.set(0xc9ccd6), off: () => pipeM.color.set(PAL.gold) });
    tap(organ, 'play the mighty organ', (sfx) => {
      t0 = now();
      if (tapsWithin(otaps, 5, 4)) {
        st0 = now(); say('♪ BWAAAAMMM. The DeckGPT logo sting. Please silence your phones.');
        sfx([[65, 2.5], [98, 2.2], [131, 2]], 'sawtooth', 0.25); return;
      }
      sfx([[262, 0.18], [330, 0.18], [392, 0.18], [523, 0.5], [392, 0.15], [523, 0.8]], 'triangle', 0.6);
      sfx([[131, 1.5], [196, 0.8]], 'sine', 0.4);
    });
  }

  // ══ LEFT WALL: lobby posters in bulb frames, deco sconces, an EXIT sign ══
  const bulbsOn = glow(0xfff1b0), bulbsDim = glow(0xb08a40);
  const chase = [];
  {
    const posters = [
      ['SCOPE', 'who is it for? (not: everyone)', '#2a3a5e', '#3a4c78', '#f2d27a', 'stage 1'],
      ['THE STORY', 'rated PG: mild bullet points', '#7a1f2c', '#912a38', '#f6eedb', 'stage 2'],
      ['VISUALS', 'in glorious house style', '#1f5a52', '#2b6e64', '#f2d27a', 'stage 3'],
    ];
    posters.forEach(([title, tag, bg, fg, ink, st], i) => {
      const z = -1.75 - i * 1.0, y = 1.62;
      const pm = opaque(200, 280, (c, w, h) => {
        deco(c, w, h, bg, fg);
        c.fillStyle = ink; c.textAlign = 'center';
        c.font = `400 18px ${HAND}`; c.fillText('DeckGPT presents', w / 2, 30);
        fitLineLocal(c, title, 52, SCRIPT, w - 24); c.fillText(title, w / 2, 96);
        c.font = `400 16px ${HAND}`; c.fillText(tag, w / 2, 124);
        // a little slide on the poster
        c.fillStyle = '#fbf8f1'; c.fillRect(40, 150, 120, 76); c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(40, 150, 120, 76);
        c.fillStyle = ['#e8604c', '#e4b84f', '#7fb3a8'][i]; c.fillRect(48, 158, 104, 14);
        c.fillStyle = '#b9b2a4'; for (let l = 0; l < 3; l++) c.fillRect(50, 182 + l * 12, 90 - l * 20, 4);
        c.fillStyle = ink; c.font = `700 18px ${HAND}`; c.fillText(`— ${st} of 4 —`, w / 2, 256);
      });
      S.box(0.04, 0.98, 0.72, gold, LW + 0.0, y, z, 0.02);
      plane(0.6, 0.84, pm, LW + 0.025, y, z, [0, Math.PI / 2, 0]);
      for (let k = 0; k < 14; k++) {          // bulbs round the frame
        const u = k / 14, per = u * 2 * (0.72 + 0.98);
        let dy, dz;
        if (per < 0.72) { dz = -0.36 + per; dy = 0.49; } else if (per < 1.7) { dz = 0.36; dy = 0.49 - (per - 0.72); } else if (per < 2.42) { dz = 0.36 - (per - 1.7); dy = -0.49; } else { dz = -0.36; dy = -0.49 + (per - 2.42); }
        const b = put(new THREE.SphereGeometry(0.022, 6, 5), bulbsOn, LW + 0.035, y + dy, z + dz); b.userData.noInk = true; chase.push(b);
      }
    });
    // deco fan sconces between the posters, flickering like gaslight
    const sconces = [];
    for (const z of [-1.25, -2.25, -3.25]) {
      S.box(0.04, 0.05, 0.3, gold, LW + 0.01, 2.2, z, 0.01);
      const m = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.9 });
      const fan = put(new THREE.CircleGeometry(0.14, 16, 0, Math.PI), m, LW + 0.035, 2.22, z, [0, Math.PI / 2, 0]); fan.userData.noInk = true;
      sconces.push(m);
    }
    live((t) => sconces.forEach((m, i) => { m.opacity = 0.75 + 0.2 * Math.sin(t * 13 + i * 2) * Math.sin(t * 7.3 + i); }));
    // EXIT
    const ex = new THREE.MeshBasicMaterial({ map: canvasTex(128, 48, (c, w, h) => { c.fillStyle = '#1f6a3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#c9ffd6'; c.font = `700 34px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT →', w / 2, h / 2 + 2); }) });
    S.box(0.06, 0.2, 0.46, dark, LW + 0.02, 2.15, -0.45, 0.01);
    plane(0.4, 0.15, ex, LW + 0.055, 2.15, -0.45, [0, Math.PI / 2, 0]);
    const exMap = ex.map, entMap = canvasTex(128, 48, (c, w, h) => { c.fillStyle = '#1f6a3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#c9ffd6'; c.font = `700 26px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ENTRANCE →', w / 2, h / 2 + 2); });
    CHANGES.push({ what: 'The EXIT sign says ENTRANCE', why: 'Same door, more optimistic sign.', on: () => { ex.map = entMap; ex.needsUpdate = true; }, off: () => { ex.map = exMap; ex.needsUpdate = true; } });
  }
  live((t) => { const k = Math.floor(t * 5); chase.forEach((b, i) => { b.material = (i + k) % 4 === 0 ? bulbsDim : bulbsOn; }); });

  // ══ a velvet rope in front of the posters (tap: twang it) ══
  {
    const posts = [[-3.5, -2.05], [-2.7, -2.15], [-1.9, -2.05]];
    posts.forEach(([x, z], i) => {
      claim(x, z, 0.12);
      S.put(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 14), gold, x, 0.02, z);
      S.put(new THREE.CylinderGeometry(0.025, 0.03, 0.82, 8), gold, x, 0.43, z);
      S.put(new THREE.SphereGeometry(0.05, 10, 8), gold, x, 0.88, z);
      g.add(shadow(0.18).translateX(x).translateZ(z));
    });
    const ropeM = paint(0x8e2f3a), ropes = [];
    for (let i = 0; i < 2; i++) {
      const [ax, az] = posts[i], [bx, bz] = posts[i + 1];
      const a = new THREE.Vector3(ax, 0.83, az), b = new THREE.Vector3(bx, 0.83, bz), mid = a.clone().lerp(b, 0.5); mid.y -= 0.2;
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 14, 0.022, 6), ropeM); g.add(m);
      ropes.push({ m, a, b });
    }
    const rope = new THREE.Group(); g.add(rope);
    ropes.forEach(r => rope.add(r.m));
    let t0 = -9, last = -1;
    live((t) => {
      const s = since(t0), wob = s < 2.5 ? Math.sin(s * 14) * 0.12 * Math.exp(-s * 1.8) : 0;
      const f = Math.floor(t * 12); if (f === last && s > 2.5) return; last = f;
      ropes.forEach((r, i) => {
        const mid = r.a.clone().lerp(r.b, 0.5); mid.y -= 0.2 + wob * (i ? -1 : 1) + Math.sin(t * 1.2 + i) * 0.01; mid.x += wob * 0.5;
        const geo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(r.a, mid, r.b), 14, 0.022, 6);
        r.m.geometry.dispose(); r.m.geometry = geo; r.m.children.forEach(c => { if (c.userData.isInk) c.geometry = geo; });
      });
    });
    tap(rope, 'twang the velvet rope', (sfx) => { t0 = now(); sfx([[98, 0.25], [110, 0.35]], 'triangle', 0.5); });
  }

  // ══ a giant film reel on its stand by the left wall (tap: spin it) ══
  {
    const x = -3.62, z = -3.62;
    claim(x, z, 0.3);
    S.box(0.36, 0.06, 0.7, walnut, x, 0.03, z, 0.02);
    for (const s of [-1, 1]) S.box(0.05, 0.6, 0.06, walnut, x + s * 0.11, 0.33, z, 0.015);
    S.put(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8).rotateZ(Math.PI / 2), gold, x, 0.6, z);
    const reel = new THREE.Group(); reel.position.set(x, 0.6, z); g.add(reel);
    const flangeT = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#c9ccd6'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, 7); c.fill();
      c.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; c.beginPath(); c.arc(w / 2 + Math.cos(a) * w * 0.29, h / 2 + Math.sin(a) * w * 0.29, w * 0.12, 0, 7); c.fill(); }
      c.beginPath(); c.arc(w / 2, h / 2, 8, 0, 7); c.fill();
      c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#2a2230'; c.lineWidth = 5; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.stroke();
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; c.beginPath(); c.arc(w / 2 + Math.cos(a) * w * 0.29, h / 2 + Math.sin(a) * w * 0.29, w * 0.12, 0, 7); c.stroke(); }
    });
    const fm = paint(0xffffff, { map: flangeT, side: THREE.DoubleSide, hatch: 0, unique: true }); fm.alphaTest = 0.5;
    for (const s of [-1, 1]) { const f = put(new THREE.CircleGeometry(0.5, 40), fm, s * 0.06, 0, 0, [0, Math.PI / 2, 0]); f.userData.noInk = true; reel.add(f); }
    reel.add(put(new THREE.CylinderGeometry(0.36, 0.36, 0.11, 28).rotateZ(Math.PI / 2), paint(0x3a3040), 0, 0, 0));
    reel.add(put(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12).rotateZ(Math.PI / 2), gold, 0, 0, 0));
    // a tail of film trailing off to the floor
    const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.6 - 0.36, z + 0.05), new THREE.Vector3(x + 0.12, 0.12, z + 0.3), new THREE.Vector3(x + 0.3, 0.015, z + 0.45), new THREE.Vector3(x + 0.6, 0.015, z + 0.4)]), 16, 0.012, 4), paint(0x3a3040)); tail.scale.set(1, 1, 1); tail.userData.noInk = true; g.add(tail);
    let t0 = -9;
    live((t, dt) => { const s = since(t0); reel.rotation.x -= dt * (0.25 + (s < 4 ? 8 * Math.exp(-s * 0.9) : 0)); });
    CHANGES.push({ what: 'The giant film reel vanished', why: 'The reel by the left wall: gone. Someone’s taken it to the projection booth.', on: () => showAll(reel, false), off: () => showAll(reel, true) });
    tap(reel, 'spin the film reel', (sfx) => { t0 = now(); sfx(Array.from({ length: 10 }, (_, i) => [900 + (i % 2) * 300, 0.035]), 'square', 0.15); });
  }

  // ══ a cardboard standee: "coming soon" (tap: wobble it) ══
  {
    const x = -1.95, z = -3.15;
    claim(x, z, 0.28);
    const sm = opaque(220, 380, (c, w, h) => {
      deco(c, w, h, '#2a2230', '#3a3048');
      c.fillStyle = '#f2d27a'; c.textAlign = 'center';
      c.font = `400 22px ${HAND}`; c.fillText('COMING SOON', w / 2, 36);
      c.font = `700 58px ${SCRIPT}`; c.fillText('Our Q3', w / 2, 100); c.fillText('Plan', w / 2, 150);
      for (let k = 0; k < 3; k++) { const y = 186 + k * 52; c.fillStyle = '#fbf8f1'; c.fillRect(34 + k * 14, y, 124, 40); c.fillStyle = ['#e8604c', '#7fb3a8', '#e4b84f'][k]; c.fillRect(40 + k * 14, y + 6, 70, 8); }
      c.fillStyle = '#f2d27a'; c.font = `400 17px ${HAND}`; c.fillText('12 slides · 1 prompt · 0 all-nighters', w / 2, 352);
    });
    const sm4 = opaque(220, 380, (c, w, h) => {
      deco(c, w, h, '#2a2230', '#3a3048');
      c.fillStyle = '#f2d27a'; c.textAlign = 'center';
      c.font = `400 22px ${HAND}`; c.fillText('COMING SOON', w / 2, 36);
      c.font = `700 58px ${SCRIPT}`; c.fillText('Our Q4', w / 2, 100); c.fillText('Plan', w / 2, 150);
      for (let k = 0; k < 3; k++) { const y = 186 + k * 52; c.fillStyle = '#fbf8f1'; c.fillRect(34 + k * 14, y, 124, 40); c.fillStyle = ['#e8604c', '#7fb3a8', '#e4b84f'][k]; c.fillRect(40 + k * 14, y + 6, 70, 8); }
      c.fillStyle = '#f2d27a'; c.font = `400 17px ${HAND}`; c.fillText('(we slipped a quarter)', w / 2, 352);
    });
    const st = new THREE.Group(); st.position.set(x, 0, z); st.rotation.y = 0.5; g.add(st);
    const SK = sub(st);
    SK.box(0.66, 1.18, 0.025, paint(0xc8a47c), 0, 0.62, 0, 0.01);
    const face = SK.put(new THREE.PlaneGeometry(0.62, 1.1), sm, 0, 0.62, 0.014); face.userData.noInk = true;
    CHANGES.push({ what: 'The standee says Q4 now', why: '“Our Q3 Plan” became “Our Q4 Plan”. Classic schedule slip.', on: () => { face.material = sm4; }, off: () => { face.material = sm; } });
    SK.box(0.04, 0.7, 0.025, paint(0xc8a47c), 0, 0.33, -0.2, 0.01, [0.55, 0, 0]);
    let t0 = -9;
    live(() => { const s = since(t0); const k = s < 2.2 ? Math.sin(s * 10) * Math.exp(-s * 1.8) : 0; st.rotation.x = k * 0.18; st.rotation.z = k * 0.08; });
    tap(st, 'wobble the standee', (sfx) => { t0 = now(); sfx([[200, 0.06], [170, 0.06], [150, 0.1]], 'sine', 0.5); });
    g.add(shadow(0.35).translateX(x).translateZ(z));
  }

  // ══ RIGHT SIDE: the box office (tap: get a ticket) ══
  {
    const x = 3.52, z = -3.12, ry = -Math.PI / 2;
    claim(x, z, 0.4); claim(x, z - 0.3, 0.32); claim(x, z + 0.3, 0.32);
    const B = S.at(x, 0, z, ry);
    B.box(0.92, 0.95, 0.56, red, 0, 0.475, 0, 0.03);
    B.box(0.98, 0.06, 0.64, gold, 0, 0.98, 0.02, 0.015);
    for (const ty of [0.25, 0.86]) B.box(0.92, 0.025, 0.012, gold, 0, ty, 0.283, 0.005);
    for (const s of [-1, 1]) B.box(0.06, 0.8, 0.06, gold, s * 0.45, 1.41, 0.27, 0.015);
    B.box(0.92, 0.82, 0.04, plum, 0, 1.41, -0.26, 0.01);
    B.box(1.0, 0.1, 0.66, red, 0, 1.86, 0.0, 0.02);
    B.box(0.8, 0.1, 0.56, gold, 0, 1.96, -0.02, 0.02);
    B.box(0.5, 0.1, 0.4, red, 0, 2.06, -0.04, 0.02);
    const glass = put(rb(0.84, 0.76, 0.01, 0.003), paint(0xcfe6ef, { opacity: 0.3, hatch: 0 }), 0, 0, 0); glass.userData.noInk = true;
    const kio = new THREE.Group(); kio.position.set(x, 0, z); kio.rotation.y = ry; g.add(kio);
    glass.position.set(0, 1.42, 0.27); kio.add(glass);
    const signM = new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#2a2230'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd98a'; c.font = `700 44px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Box Office', w / 2, h / 2 + 2); }) });
    const sign = sub(kio).put(new THREE.PlaneGeometry(0.8, 0.2), signM, 0, 1.86, 0.335); sign.userData.noInk = true;
    const boMap = signM.map, offish = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#2a2230'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd98a'; c.font = `700 44px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Box Offish', w / 2, h / 2 + 2); });
    CHANGES.push({ what: 'The box office sign is misspelt', why: '“Box Office” became “Box Offish”. It’s having a day.', on: () => { signM.map = offish; signM.needsUpdate = true; }, off: () => { signM.map = boMap; signM.needsUpdate = true; } });
    const ttaps = [];
    const frontM = opaque(256, 160, (c, w, h) => {
      c.fillStyle = '#b03a30'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#e8c46a'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28);
      c.fillStyle = '#f2d27a'; c.font = `700 46px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('Tickets', w / 2, 72);
      c.font = `400 22px ${HAND}`; c.fillText('admit one · 4 stages', w / 2, 108); c.font = `400 17px ${HAND}`; c.fillText('no refunds after Scope', w / 2, 134);
    });
    sub(kio).put(new THREE.PlaneGeometry(0.62, 0.38), frontM, 0, 0.58, 0.285).userData.noInk = true;
    // inside the window: the ticket roll
    const KK = S.at(x, 0, z, ry);
    KK.put(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 16).rotateZ(Math.PI / 2), paint(0xe8604c), -0.15, 1.12, -0.05);
    // the ticket machine on the ledge, a strip that shoots out, and a bell
    const mach = new THREE.Group(); mach.position.set(0.18, 1.01, 0.22); kio.add(mach);
    const MK = sub(mach);
    MK.box(0.18, 0.12, 0.12, paint(0x6f7d92), 0, 0.06, 0, 0.02);
    MK.put(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10).rotateX(Math.PI / 2), paint(0xe8604c), 0.05, 0.08, 0.065);
    const tick = new THREE.Group(); tick.position.set(-0.04, 0.03, 0.06); mach.add(tick);
    const tm = opaque(64, 128, (c, w, h) => { c.fillStyle = '#f2d27a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b03a30'; c.lineWidth = 3; c.setLineDash([4, 3]); c.strokeRect(4, 4, w - 8, h - 8); c.fillStyle = '#b03a30'; c.font = `700 18px ${HAND}`; c.textAlign = 'center'; c.save(); c.translate(w / 2, h / 2); c.rotate(Math.PI / 2); c.fillText('ADMIT ONE', 0, 6); c.restore(); });
    tm.side = THREE.DoubleSide;
    const tk = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.16).translate(0, -0.08, 0).rotateX(-Math.PI / 2), tm); tk.userData.noInk = true; tick.add(tk);
    tick.scale.set(1, 1, 0.01);
    S.at(x, 0, z, ry).put(new THREE.SphereGeometry(0.04, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), gold, -0.25, 1.01, 0.22);
    let t0 = -9;
    live((t) => {
      const s = since(t0);
      tick.scale.z = s < 0.4 ? Math.max(0.01, s / 0.4) : s < 3 ? 1 : Math.max(0.01, 1 - (s - 3) / 0.3);
      tick.rotation.x = s < 3 ? Math.min(s, 0.6) * 0.5 : 0;
      mach.position.y = 1.01 + (s < 0.3 ? Math.sin(s / 0.3 * Math.PI) * 0.02 : 0);
      signM.color.setScalar(s < 1.2 ? (Math.floor(s * 8) % 2 ? 1 : 0.5) : 0.85 + 0.15 * Math.sin(t * 2));
    });
    tap(mach, 'buy a ticket', (sfx) => { t0 = now(); if (tapsWithin(ttaps, 5, 6)) say('Five tickets! You may now sit in five seats at once. Please don’t.'); sfx([[1200, 0.04], [1000, 0.04], [1200, 0.04], [1000, 0.04], [1568, 0.4]], 'square', 0.2); });
    g.add(shadow(0.6).translateX(x).translateZ(z));
  }

  // ══ a stack of film cans in the back-right corner (tap: pop the lid) ══
  {
    const x = 3.62, z = -4.12;
    claim(x, z, 0.24);
    const canM = paint(0x8a8f9a), lab = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0x8f7ae8];
    for (let i = 0; i < 4; i++) {
      const dx = Math.sin(i * 2.3) * 0.03, dz = Math.cos(i * 1.7) * 0.03;
      S.put(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 22), canM, x + dx, 0.03 + i * 0.065, z + dz);
      S.box(0.1, 0.035, 0.01, paint(lab[i]), x + dx - 0.02, 0.03 + i * 0.065, z + dz + 0.221, 0.005, [0, -0.2, 0]);
    }
    const lid = new THREE.Group(); lid.position.set(x - 0.22, 0.26 + 0.005, z); g.add(lid);    // hinged at its left edge
    const LK = sub(lid);
    LK.put(new THREE.CylinderGeometry(0.225, 0.225, 0.02, 22).translate(0.22, 0.01, 0), paint(0xa0a5b0));
    LK.put(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 10).translate(0.22, 0.025, 0), paint(0xe8604c));
    const inside = S.put(new THREE.CylinderGeometry(0.18, 0.18, 0.012, 20), paint(0x3a3040), x, 0.262, z);
    let t0 = -9;
    // Vivi's lost page is rolled up in this can: open it and it stands up out of the film
    const pg = kit.page(); let pgState = pg.collected ? 2 : 0;          // 0 hidden, 1 out, 2 gone
    if (!pg.collected) {
      pg.position.set(x, 0.268, z); pg.rotation.y = -0.5; pg.scale.setScalar(0.9); g.add(pg); showAll(pg, false);
      const poke = pg.userData.toy.poke; pg.userData.toy.poke = (sfx) => { pgState = 2; poke(sfx); say('A page of Vivi’s guest list! It really was in the can.'); };
    }
    live(() => {
      const s = since(t0);
      if (pgState === 0 && s > 0.2 && s < 1) { pgState = 1; showAll(pg, true); say('Something’s rolled up inside the film can…'); }
      if (pgState === 1) { lid.rotation.z = 1.9; return; }                // it stays open while the page stands in it
      const open = s < 0.25 ? s / 0.25 : s < 1.4 ? 1 : s < 1.8 ? 1 - (s - 1.4) / 0.4 : 0;
      lid.rotation.z = open * 1.9 + (s > 1.8 && s < 2.4 ? Math.abs(Math.sin((s - 1.8) * 20)) * 0.12 * (2.4 - s) : 0);
    });
    tap(lid, 'open the film can', (sfx) => { t0 = now(); sfx([[700, 0.05], [1050, 0.05]], 'square', 0.25); setTimeout(() => sfx([[300, 0.06], [250, 0.08]], 'square', 0.25), 1700); });
  }

  // ══ right wall posters ══
  {
    const one = (z, y, title, tag, bg, fg, ink) => {
      const pm = opaque(200, 280, (c, w, h) => {
        deco(c, w, h, bg, fg); c.fillStyle = ink; c.textAlign = 'center';
        c.font = `400 18px ${HAND}`; c.fillText('DeckGPT presents', w / 2, 30);
        fitLineLocal(c, title, 50, SCRIPT, w - 24); c.fillText(title, w / 2, 100);
        c.font = `400 16px ${HAND}`; c.fillText(tag, w / 2, 128);
        c.fillStyle = '#fbf8f1'; c.fillRect(30, 150, 140, 90); c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(30, 150, 140, 90);
        for (let k = 0; k < 5; k++) { c.fillStyle = '#b03a30'; c.fillRect(42 + k * 25, 226 - (k * 13 % 40) - 30, 16, (k * 13 % 40) + 30); }
        c.fillStyle = ink; c.font = `700 18px ${HAND}`; c.fillText('— stage 4 of 4 —', w / 2, 262);
      });
      S.box(0.04, 0.98, 0.72, gold, RW, y, z, 0.02);
      plane(0.6, 0.84, pm, RW - 0.025, y, z, [0, -Math.PI / 2, 0]);
    };
    one(-1.3, 1.65, 'THE DECK', 'present it · pretend it was easy', '#4a2a5e', '#5c3874', '#f2d27a');
    one(-4.72, 1.6, 'ENCORE!', 'that’s a wrap: it’s in the can!', '#7a4a1f', '#8e5a2a', '#f6eedb');
  }

  // ══ comedy & tragedy masks high on the back wall, right (tap: they swap moods) ══
  {
    const maskTex = (happy, col) => canvasTex(128, 150, (c, w, h) => {
      c.fillStyle = col; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, 7); c.fill();
      c.strokeStyle = '#2a2230'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#2a2230';
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w / 2 + s * 24, h * 0.4, 14, happy ? 8 : 9, s * (happy ? 0.3 : -0.3), happy ? Math.PI : 0, happy ? Math.PI * 2 : Math.PI); c.fill(); }
      c.lineWidth = 7; c.beginPath();
      if (happy) c.arc(w / 2, h * 0.6, 30, 0.15, Math.PI - 0.15); else c.arc(w / 2, h * 0.86, 30, Math.PI + 0.25, -0.25);
      c.stroke();
    });
    const T = [maskTex(true, '#f2d27a'), maskTex(false, '#cfd8e8')], T2 = [maskTex(false, '#f2d27a'), maskTex(true, '#cfd8e8')];
    const masks = new THREE.Group(); masks.position.set(3.45, 2.1, BW + 0.08); g.add(masks);
    S.put(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6).rotateZ(Math.PI / 2), gold, 3.45, 2.18, BW + 0.05);
    const mm = [];
    [[-0.13, 0.25], [0.13, -0.25]].forEach(([dx, rz], i) => {
      const pivot = new THREE.Group(); pivot.position.set(dx, 0.08, 0); masks.add(pivot);   // each hangs from the bar
      const mat = paint(0xffffff, { map: T[i], hatch: 0, unique: true, side: THREE.DoubleSide }); mat.transparent = true; mat.alphaTest = 0.4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.28).translate(0, -0.14, 0), mat); m.rotation.z = rz; m.userData.noInk = true; pivot.add(m);
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 4).translate(0, -0.025, 0), paint(0xe8604c, { hatch: 0 })); rib.userData.noInk = true; pivot.add(rib);
      mm.push({ pivot, m, mat, i });
    });
    let t0 = -9, sw = false;
    live((t) => mm.forEach(({ pivot, i }) => { const s = since(t0); pivot.rotation.y = s < 0.6 ? s / 0.6 * Math.PI * 2 * (i ? -1 : 1) : 0; pivot.rotation.z = Math.sin(t * 1.1 + i * 2) * 0.05; }));
    CHANGES.push({ what: 'The masks swapped faces', why: 'Comedy went glum and tragedy cheered up, up on the back wall.', on: () => mm.forEach(({ mat, i }) => { mat.map = (sw ? T : T2)[i]; mat.needsUpdate = true; }), off: () => mm.forEach(({ mat, i }) => { mat.map = (sw ? T2 : T)[i]; mat.needsUpdate = true; }) });
    tap(masks, 'swap the masks', (sfx) => {
      t0 = now(); sw = !sw;
      setTimeout(() => mm.forEach(({ mat, i }) => { mat.map = (sw ? T2 : T)[i]; mat.needsUpdate = true; }), 300);
      sfx(sw ? [[392, 0.12], [311, 0.12], [262, 0.3]] : [[262, 0.12], [330, 0.12], [392, 0.3]], 'triangle', 0.4);
    });
  }

  // ══ the sandwich board by the door: tonight's show (tap: flip the card) ══
  {
    const x = 3.52, z = -0.38;
    claim(x, z, 0.22);
    const af = new THREE.Group(); af.position.set(x, 0, z); af.rotation.y = -0.6; g.add(af);
    const AK = sub(af);
    for (const s of [-1, 1]) AK.box(0.5, 0.9, 0.03, walnut, 0, 0.44, s * 0.13, 0.01, [-s * 0.15, 0, 0]);
    AK.box(0.52, 0.05, 0.15, gold, 0, 0.9, 0, 0.015);
    const faces = ['NOW SHOWING|your deck|in four stages', 'TONIGHT|Scope · Story|Visuals · Deck', 'COMING SOON|the sequel|final_v2_FINAL.pptx'].map(txt => opaque(160, 240, (c, w, h) => {
      c.fillStyle = '#2a2230'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#e8c46a'; c.lineWidth = 4; c.strokeRect(8, 8, w - 16, h - 16);
      const [a, b, d] = txt.split('|');
      c.textAlign = 'center'; c.fillStyle = '#f6eedb'; c.font = `400 20px ${HAND}`; c.fillText(a, w / 2, 44);
      c.fillStyle = '#f2d27a'; fitLineLocal(c, b, 40, SCRIPT, w - 24); c.fillText(b, w / 2, 120);
      c.fillStyle = '#f6eedb'; c.font = `400 18px ${HAND}`; c.fillText(d, w / 2, 170);
      c.fillStyle = '#e8604c'; c.beginPath(); c.arc(w / 2, 205, 8, 0, 7); c.fill();
    }));
    const card = new THREE.Group(); card.position.set(0, 0.82, 0.095); card.rotation.x = -0.15; af.add(card);   // hinged at the top
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.62).translate(0, -0.33, 0.006), faces[0]); cm.userData.noInk = true; card.add(cm);
    let t0 = -9, n = 0;
    live(() => { const s = since(t0); card.rotation.x = -0.15 - (s < 0.5 ? Math.sin(s / 0.5 * Math.PI) * 1.6 : 0); });
    tap(af, 'flip the sign', (sfx) => { t0 = now(); setTimeout(() => { n = (n + 1) % faces.length; cm.material = faces[n]; }, 250); sfx([[500, 0.05], [650, 0.08]], 'sine', 0.4); });
    g.add(shadow(0.32).translateX(x).translateZ(z));
  }

  // ══ popcorn popping in the cart's glass case ══
  {
    const cx = -2.9, cz = -1.3, ks = [];
    for (let i = 0; i < 7; i++) { const k = put(new THREE.IcosahedronGeometry(0.03, 0), paint(0xfaf0c8), cx, 1.0, cz); k.userData.noInk = true; ks.push({ k, ph: i * 0.37, dx: Math.sin(i * 2.1) * 0.2, dz: Math.cos(i * 1.3) * 0.13 }); }
    live((t) => ks.forEach(({ k, ph, dx, dz }) => {
      const s = (t * 0.9 + ph) % 1.6;
      const y = s < 0.6 ? Math.sin(s / 0.6 * Math.PI) * 0.26 : 0;
      k.position.set(cx + dx + (s < 0.6 ? s * 0.08 : 0.05), 0.99 + y, cz + dz);
      k.rotation.set(s * 9, s * 7, 0);
    }));
  }

  // ══ dust motes drifting in the projector's beam ══
  {
    const N = 40, mg = new THREE.SphereGeometry(0.008, 4, 3), mat = new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.7, depthWrite: false });
    const motes = new THREE.InstancedMesh(mg, mat, N); motes.userData.noInk = true; motes.frustumCulled = false; g.add(motes);
    const M = new THREE.Matrix4(), seeds = Array.from({ length: N }, (_, i) => [Math.sin(i * 12.9) * 0.5 + 0.5, Math.sin(i * 7.7) * 0.5 + 0.5, Math.sin(i * 3.3) * 0.5 + 0.5]);
    const A = new THREE.Vector3(3.05, 1.1, -2.35), B = new THREE.Vector3(0.3, 1.2, -5.2);
    live((t) => {
      seeds.forEach(([a, b, c], i) => {
        const u = (a + t * 0.015 * (0.5 + c)) % 1;
        const p = A.clone().lerp(B, u);
        const r = 0.05 + u * 0.6;
        p.x += Math.sin(b * 40 + t * 0.3) * r * 0.6; p.y += Math.cos(c * 40 + t * 0.25) * r * 0.5; p.z += Math.sin(a * 30 + t * 0.2) * r * 0.3;
        M.makeTranslation(p.x, p.y, p.z); motes.setMatrixAt(i, M);
      });
      motes.instanceMatrix.needsUpdate = true;
    });
  }

  // ══ THE SIGNATURE TRICK: the whole room is a slide deck, and the clicker on the podium runs it ══
  {
    const px = -2.2, pz = -4.35;
    claim(px, pz, 0.25);
    S.box(0.42, 0.92, 0.32, walnut, px, 0.46, pz, 0.03);
    S.box(0.52, 0.05, 0.4, gold, px, 0.94, pz, 0.015, [-0.12, 0, 0]);
    S.box(0.46, 0.06, 0.36, walnut, px, 0.03, pz, 0.015);
    const ctr = opaque(256, 160, () => {});
    const drawCtr = (n) => {
      const c = ctr.map.image.getContext('2d'), w = 256, h = 160;
      c.fillStyle = '#b03a30'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8c46a'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
      c.fillStyle = '#f2d27a'; c.textAlign = 'center'; c.font = `700 40px ${SCRIPT}`; c.fillText('DeckGPT', w / 2, 56);
      c.font = `400 24px ${HAND}`; c.fillStyle = '#f6eedb'; c.fillText(n ? `slide ${n} of 5` : 'click to present ▶', w / 2, 100);
      c.font = `400 16px ${HAND}`; c.fillText('the room is the deck', w / 2, 130);
      ctr.map.needsUpdate = true;
    };
    drawCtr(0);
    plane(0.36, 0.23, ctr, px, 0.62, pz + 0.163);
    // the clicker: a big presenter's remote, its button on a spring
    const clk = new THREE.Group(); clk.position.set(px, 0.98, pz + 0.02); clk.rotation.set(-0.12, 0.35, 0); g.add(clk);
    const CK = sub(clk);
    CK.box(0.12, 0.05, 0.26, dark, 0, 0.025, 0, 0.02);
    CK.put(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 5).rotateX(Math.PI / 2), paint(0x9a9aa8), 0, 0.04, -0.16);
    CK.put(new THREE.SphereGeometry(0.012, 6, 5), paint(0xe8604c), 0, 0.04, -0.2);
    const btn = new THREE.Group(); btn.position.set(0, 0.05, 0.04); clk.add(btn);
    sub(btn).put(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 14).translate(0, 0.012, 0), paint(0xe8604c));
    sub(btn).put(new THREE.ConeGeometry(0.018, 0.02, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, 0.028, 0), paint(0xf6eedb));
    CK.put(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10).translate(0, 0.06, -0.07), paint(0x6f7d92));

    // slide 1: the title, in giant letters
    const letters = [];
    'Q3PLAN'.split('').forEach((ch, i) => {
      const lg = new THREE.Group(); lg.position.set(-1.2 + i * 0.46 + (i > 1 ? 0.3 : 0), 3.4, -3.3); g.add(lg);
      sub(lg).box(0.38, 0.46, 0.08, gold, 0, 0, 0, 0.03);
      const lm = opaque(96, 112, (c, w, h) => { c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#b03a30'; c.font = `700 92px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, w / 2, h / 2 + 6); });
      sub(lg).put(new THREE.PlaneGeometry(0.34, 0.42), lm, 0, 0, 0.042).userData.noInk = true;
      showAll(lg, false); letters.push(lg);
    });
    // slide 2: a bar chart grows out of the floor in front of the screen
    const bars = [0.45, 0.7, 0.55, 1.05, 1.5].map((h, i) => {
      const b = put(rb(0.36, h, 0.36, 0.03).translate(0, h / 2, 0), paint([0x7fb3a8, 0xe4b84f, 0x8f7ae8, 0xe8604c, 0xb03a30][i]), -1.2 + i * 0.6, 0, -4.75);
      b.scale.y = 0.001; b.visible = false; return b;
    });
    const arrow = put(new THREE.ConeGeometry(0.14, 0.3, 12).rotateZ(-0.9), paint(0xb03a30), 1.55, 1.75, -4.75); arrow.visible = false;
    // slide 3: a picture: cardboard clip-art mountains and a sun rise behind the seats
    const cut = (w, h, draw) => { const m = paint(0xffffff, { map: canvasTex(w, h, draw), hatch: 0, unique: true, side: THREE.DoubleSide }); m.alphaTest = 0.5; m.transparent = true; return m; };
    const pic = new THREE.Group(); pic.position.set(0.2, -1.6, -4.55); g.add(pic);
    const mount = cut(256, 128, (c, w, h) => {
      c.fillStyle = '#7a8fb0'; c.beginPath(); c.moveTo(0, h); c.lineTo(w * 0.3, h * 0.15); c.lineTo(w * 0.55, h); c.fill();
      c.fillStyle = '#5f7a9e'; c.beginPath(); c.moveTo(w * 0.35, h); c.lineTo(w * 0.68, h * 0.05); c.lineTo(w, h); c.fill();
      c.fillStyle = '#f6f6f6'; for (const [x0, y0] of [[0.3, 0.15], [0.68, 0.05]]) { c.beginPath(); c.moveTo(w * x0, h * y0); c.lineTo(w * x0 - 18, h * y0 + 30); c.lineTo(w * x0 + 18, h * y0 + 30); c.fill(); }
      c.strokeStyle = '#2a2230'; c.lineWidth = 3; c.strokeRect(1, 1, 0, 0);
    });
    const mm2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), mount); mm2.position.set(0, 0.65, 0); mm2.userData.noInk = true; pic.add(mm2);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), cut(128, 128, (c, w, h) => {
      c.fillStyle = '#f2c84a'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, 7); c.fill();
      c.fillStyle = '#2a2230'; c.beginPath(); c.arc(w * 0.38, h * 0.42, 6, 0, 7); c.arc(w * 0.62, h * 0.42, 6, 0, 7); c.fill();
      c.strokeStyle = '#2a2230'; c.lineWidth = 5; c.beginPath(); c.arc(w / 2, h * 0.55, 22, 0.3, Math.PI - 0.3); c.stroke();
    }));
    sun.position.set(0.9, 1.55, -0.02); sun.userData.noInk = true; pic.add(sun);
    showAll(pic, false);
    // slide 4: Q&A: question-mark balloons float up out of the seats
    const qTex = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#fbf6ea'; c.font = `700 52px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, h / 2 + 4); });
    const balloons = [];
    for (let i = 0; i < 8; i++) {
      const bg = new THREE.Group(); bg.position.set(-0.75 + (i % 4) * 0.7, 0.9, -3.7 + Math.floor(i / 4) * 0.8); g.add(bg);
      const col = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0x8f7ae8][i % 4];
      const bb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10).scale(1, 1.15, 1), paint(col)); bb.position.y = 0.45; bg.add(bb);
      const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: qTex, depthWrite: false })); q.scale.set(0.16, 0.16, 1); q.position.set(0, 0.46, 0.14); bg.add(q);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 3).translate(0, 0.15, 0), paint(0x2a2230, { hatch: 0 })); str.userData.noInk = true; bg.add(str);
      showAll(bg, false); balloons.push(bg);
    }
    // slide 5: thank you! confetti over everything
    const NC = 140, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.06), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), NC);
    conf.userData.noInk = true; conf.frustumCulled = false; conf.visible = false; g.add(conf);
    const cseed = Array.from({ length: NC }, (_, i) => [Math.sin(i * 12.9) * 3.6, Math.sin(i * 4.1) * 2.5 - 2.6, (i * 0.137) % 1, i]);
    const CC = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0x8f7ae8, 0xf2d27a].map(h => new THREE.Color(h));
    cseed.forEach((c, i) => conf.setColorAt(i, CC[i % CC.length]));
    const CM = new THREE.Matrix4(), CQ = new THREE.Quaternion(), CE = new THREE.Euler(), CV = new THREE.Vector3(), C1 = new THREE.Vector3(1, 1, 1);

    let slide = 0, sT = -9, bT = -9;
    const LINES = [
      'Lights up. That was a five-slide deck in a five-click room.',
      'Slide 1 of 5 · The title. Giant letters, confident font, no idea yet what slide 2 is.',
      'Slide 2 · The chart. Up and to the right, as is tradition.',
      'Slide 3 · A picture. A mountain, for “vision”.',
      'Slide 4 · Q&A. The seats have questions.',
      'Slide 5 · Thank you! DeckGPT builds that arc for you: Scope, Story, Visuals, Deck.',
    ];
    const go = (n) => {
      slide = n; sT = now(); drawCtr(n); say(LINES[n]);
      baseFilter = n === 3 ? 'sepia(0.55) saturate(1.2)' : '';
      fx.filter('brightness(1.8) blur(3px)');                           // the transition: a quick dissolve
      setTimeout(() => fx.filter(baseFilter), 220);
      if (n === 4) for (let k = 0; k < 14; k++) setTimeout(() => kit.sfx([[300 + Math.random() * 900, 0.03], [200 + Math.random() * 600, 0.03]], 'square', 0.05), k * 110 + Math.random() * 60);
      if (n === 5) kit.sfx([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.4]], 'triangle', 0.2);
    };
    onExit(() => { if (slide) { slide = 0; sT = -9; drawCtr(0); baseFilter = ''; } });
    live((t) => {
      const s = since(sT);
      btn.position.y = 0.05 - (since(bT) < 0.2 ? 0.012 : 0);
      // title letters drop in with a bounce, and fly off when the slide changes
      letters.forEach((lg, i) => {
        const on = slide === 1, u = s - i * 0.12;
        if (on) { const k = Math.max(0, Math.min(1, u / 0.5)); const y = 1.75 + (1 - k) * 1.7; const bnc = u > 0.5 && u < 1.1 ? Math.sin((u - 0.5) / 0.6 * Math.PI * 2) * 0.08 * (1.1 - u) : 0; lg.position.y = y + bnc; lg.rotation.z = (1 - k) * (i % 2 ? 0.4 : -0.4); if (!lg.visible && u > 0) showAll(lg, true); }
        else if (lg.visible) { lg.position.y += 0.08; if (lg.position.y > 3.3) showAll(lg, false); }
      });
      bars.forEach((b, i) => { const want = slide === 2 ? Math.max(0.001, Math.min(1, (s - i * 0.15) / 0.6)) : Math.max(0.001, b.scale.y - 0.06); b.scale.y = want; b.visible = want > 0.002; });
      arrow.visible = slide === 2 && s > 1.2; arrow.position.y = 1.75 + Math.sin(t * 4) * 0.04;
      const py = slide === 3 ? Math.min(0, -1.6 + s * 2.2) : Math.max(-1.6, pic.position.y - 0.08);
      pic.position.y = py; if (pic.visible !== py > -1.59) showAll(pic, py > -1.59);
      sun.rotation.z = Math.sin(t) * 0.1;
      balloons.forEach((bg, i) => {
        const on = slide === 4, u = Math.max(0, s - i * 0.18);
        if (on) { if (!bg.visible) showAll(bg, true); bg.position.y = 0.6 + Math.min(1.3, u * 0.9) + Math.sin(t * 2 + i) * 0.04; bg.rotation.z = Math.sin(t * 1.5 + i) * 0.1; }
        else if (bg.visible) { bg.position.y += 0.05; if (bg.position.y > 2.8) { showAll(bg, false); bg.position.y = 0.6; } }
      });
      conf.visible = slide === 5 && s < 12;
      if (conf.visible) {
        cseed.forEach(([cx, cz, ph, i]) => {
          const y = 2.7 - ((s * 0.45 + ph) % 1) * 2.7;
          CE.set(s * 3 + i, s * 2 + i * 0.7, 0); CQ.setFromEuler(CE);
          CM.compose(CV.set(cx + Math.sin(s * 2 + i) * 0.15, y, cz), CQ, C1); conf.setMatrixAt(i, CM);
        });
        conf.instanceMatrix.needsUpdate = true;
      }
    });
    tap(clk, 'click to the next slide', (sfx) => { bT = now(); sfx([[1500, 0.02], [900, 0.03]], 'square', 0.2); go((slide + 1) % 6); });
  }

  // ══ THE SMARTER GAME: lights out, and something in the room changes. What? ══
  // (the panel steps aside while you look, so the camera is yours: walk about, look around)
  let runId = 0, curChange = null;
  const undoChange = () => { curChange?.off(); curChange = null; };
  onExit(() => { runId++; undoChange(); });
  games.replace('toss some popcorn', (m) => {
    const G = m.game, N = 3, id = ++runId;
    let round = 0, score = 0, picks = shuffle(CHANGES).slice(0, N), stepping = false;
    const alive = () => id === runId && kit.player();
    const onClose = () => { if (!stepping) { runId++; undoChange(); fx.filter(baseFilter); } };
    const panel = () => { G.open('Spot what changed', { onClose }); G.score(`round ${round + 1} of ${N} · ★ ${score}`); G.note(''); };
    const intro = () => {
      panel();
      G.text(round ? 'Back to normal. Same again: have a look round, then the lights go out…' : 'Continuity check! When you’re ready, this panel steps aside: have a good look round the picture palace. Then the lights go out, and when they come back one thing will be different.');
      G.choices([], () => {}); G.next('ready: let me look', look);
    };
    const look = () => {
      stepping = true; G.close(); stepping = false;
      say('Memorise the room… lights out in 6 seconds.');
      setTimeout(() => {
        if (!alive()) return;
        fx.filter('brightness(0.04)'); kit.sfx([[110, 0.5]], 'sine', 0.1); say('…shh…');
        setTimeout(() => {
          if (!alive()) return;
          curChange = picks[round]; curChange.on(); fx.filter(baseFilter);
          say('Lights up! Look around: what’s different?');
          setTimeout(() => { if (alive()) ask(); }, 6000);
        }, 1400);
      }, 6000);
    };
    const ask = () => {
      panel(); G.text('So: what changed?');
      const cur = curChange, opts = shuffle([cur, ...shuffle(CHANGES.filter(c => c !== cur)).slice(0, 3)]);
      G.choices(opts.map(o => o.what), (i) => {
        const ok = opts[i] === cur; if (ok) score++;
        G.lock(i, opts.indexOf(cur));
        if (ok) G.good(`Sharp eyes! ${cur.why}`); else G.bad(`It was: ${cur.what.toLowerCase()}. ${cur.why}`);
        G.score(`round ${round + 1} of ${N} · ★ ${score}`);
        G.next(round + 1 < N ? 'put it back · next round →' : 'how did I do?', () => { undoChange(); round++; round < N ? intro() : finish(); });
      });
    };
    const finish = () => {
      G.score(`★ ${score} of ${N}`); G.note('');
      G.text(`${score} of ${N}. ${score === N ? 'A continuity editor’s eye: nothing gets past you.' : 'Continuity is hard. That’s why DeckGPT keeps every slide in your house style.'}`);
      if (score >= 2) G.cheer();
      G.choices([], () => {});
      G.next('play again', () => { round = 0; score = 0; picks = shuffle(CHANGES).slice(0, N); intro(); });
      G.next('done', () => G.close());
    };
    intro();
  }, 'spot what changed');

  // ══ WALK-OVER FLOOR: flat painted rugs, runners and scraps a few millimetres up — you walk
  // straight across them, so they can go anywhere, walkways included (just not on a game ring) ══
  let decalN = 0;
  const decal = (w, h, draw, x, z, rot = 0, { y, px = 150 } = {}) => {
    const cw = Math.min(512, Math.max(32, Math.round(w * px))), ch = Math.min(1024, Math.max(32, Math.round(h * px)));
    const m = paint(0xffffff, { map: canvasTex(cw, ch, draw), hatch: 0, unique: true });
    m.transparent = true; m.alphaTest = 0.35; m.depthWrite = false;
    const k = decalN++;
    const p = plane(w, h, m, x, y ?? 0.004 + (k % 12) * 0.001, z, [-Math.PI / 2, 0, rot]); p.renderOrder = 1 + k * 0.01;
    return p;
  };
  const firstFree = (list, r) => list.find(([x, z]) => free(x, z, r));
  const curl = (c, x, y, len, col, seed, lw = 3) => {          // a snipped end of yarn
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y);
    for (let i = 1; i <= 12; i++) { const t = i / 12; c.lineTo(x + Math.cos(seed + t * 5) * len * t + Math.sin(t * 9 + seed) * 6, y + Math.sin(seed * 1.3 + t * 4) * len * 0.6 * t + Math.cos(t * 11) * 5); }
    c.stroke();
  };
  {
    const runner = (c, w, h) => {
      c.fillStyle = '#7a1f2c'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#c9a24a'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10); c.fillRect(0, 0, 10, h); c.fillRect(w - 10, 0, 10, h);
      c.fillStyle = '#5e1621'; c.fillRect(16, 16, w - 32, h - 32);
      c.fillStyle = '#7a1f2c'; c.fillRect(20, 20, w - 40, h - 40);
      c.strokeStyle = 'rgba(201,162,74,0.55)'; c.lineWidth = 2;
      const along = h > w, n = Math.floor((along ? h : w) / 70);
      for (let i = 0; i < n; i++) {
        const cx = along ? w / 2 : 40 + i * 70, cy = along ? 40 + i * 70 : h / 2;
        c.beginPath(); c.moveTo(cx, cy - 18); c.lineTo(cx + 18, cy); c.lineTo(cx, cy + 18); c.lineTo(cx - 18, cy); c.closePath(); c.stroke();
        c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(cx, cy, 3, 0, 7); c.fill();
      }
    };
    // the aisle runner, door to the front row, and a cross runner at the foot of the screen
    decal(0.9, 2.75, runner, 0, -1.12, 0, { px: 100 });
    decal(3.3, 0.72, runner, 0.1, -4.6, 0, { px: 100 });
    // ticket stubs and popcorn, dropped all over
    const scraps = (seed) => (c, w, h) => {
      for (let k = 0; k < 5; k++) {
        const x = 20 + ((k * 41 + seed * 17) % (w - 60)), y = 20 + ((k * 29 + seed * 23) % (h - 50));
        c.save(); c.translate(x, y); c.rotate(k * 1.3 + seed);
        if (k % 2) { c.fillStyle = '#f2d27a'; c.fillRect(-14, -7, 28, 14); c.strokeStyle = '#b03a30'; c.lineWidth = 1.5; c.setLineDash([2, 2]); c.strokeRect(-12, -5, 24, 10); c.setLineDash([]); c.fillStyle = '#b03a30'; c.font = `700 7px ${HAND}`; c.fillText('ADMIT', -9, 2); }
        else { c.fillStyle = '#f6eedb'; for (let q = 0; q < 4; q++) { c.beginPath(); c.arc(Math.cos(q * 1.6) * 4, Math.sin(q * 1.6) * 4, 4, 0, 7); c.fill(); } c.strokeStyle = 'rgba(160,120,60,0.6)'; c.lineWidth = 1; c.stroke(); }
        c.restore();
      }
    };
    [[-0.7, -1.9], [0.75, -0.8], [1.9, -2.4], [-1.5, -1.2], [0.4, -2.45], [-1.1, -4.0], [2.1, -4.2], [-0.3, -0.25]].forEach(([x, z], i) => decal(0.6, 0.6, scraps(i), x, z, i));
    // "stand here for your close-up": a gaffer-tape mark
    decal(0.6, 0.45, (c, w, h) => {
      c.strokeStyle = '#e4b84f'; c.lineWidth = 10; c.beginPath(); c.moveTo(w / 2 - 22, 18); c.lineTo(w / 2 + 22, 62); c.moveTo(w / 2 + 22, 18); c.lineTo(w / 2 - 22, 62); c.stroke();
      c.fillStyle = '#f6eedb'; c.font = `400 13px ${HAND}`; c.textAlign = 'center'; c.fillText('your close-up: here', w / 2, h - 6);
    }, 1.35, -0.5, -0.2);
    // a walk-of-fame star set in the carpet (tap it)
    const starG = new THREE.Group(); starG.position.set(-1.15, 0, -1.75); g.add(starG);
    const stTex = canvasTex(256, 256, () => {});
    let name = 0;
    const NAMES = ['DeckGPT', 'YOU', 'Slide 4', 'The Popcorn'];
    const drawStar = (lit) => {
      const c = stTex.image.getContext('2d'), w = 256;
      c.clearRect(0, 0, w, w);
      c.fillStyle = '#6a5a5a'; c.fillRect(6, 6, w - 12, w - 12);
      c.fillStyle = '#8a7a74'; c.fillRect(14, 14, w - 28, w - 28);
      c.fillStyle = lit ? '#ffb0c8' : '#e88aa6'; c.strokeStyle = '#d8b25a'; c.lineWidth = 8;
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 46 : 106; c.lineTo(w / 2 + Math.cos(a) * r, w / 2 + 6 + Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#d8b25a'; c.textAlign = 'center'; c.font = `700 30px ${HAND}`; c.fillText(NAMES[name], w / 2, w / 2 + 12);
      c.beginPath(); c.arc(w / 2, w / 2 + 50, 12, 0, 7); c.fill(); c.fillStyle = '#6a5a5a'; c.fillRect(w / 2 - 4, w / 2 + 44, 8, 12);
      stTex.needsUpdate = true;
    };
    drawStar(false);
    const stM = paint(0xffffff, { map: stTex, hatch: 0, unique: true }); stM.transparent = true; stM.alphaTest = 0.35; stM.depthWrite = false;
    const stP = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62).rotateX(-Math.PI / 2), stM); stP.position.y = 0.012; stP.renderOrder = 1.5; stP.userData.noInk = true; starG.add(stP);
    const glowM = new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const glw = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28).rotateX(-Math.PI / 2), glowM); glw.position.y = 0.02; glw.renderOrder = 3; glw.userData.noInk = true; starG.add(glw);
    let gt0 = -9;
    live((t) => { const s = since(gt0); glowM.opacity = s < 2 ? 0.55 * (1 - s / 2) * (0.7 + 0.3 * Math.sin(s * 20)) : 0; glw.scale.setScalar(1 + (s < 2 ? s * 0.4 : 0)); });
    const QUIPS = ['You stepped on a star. It’s fine: they’re used to it.', 'A star is born. Mostly out of popcorn.', 'Slide 4 got a star before you did. Rude.', 'The Popcorn thanks its agent, its butter, and you.'];
    tap(starG, 'step on the walk-of-fame star', (sfx) => { gt0 = now(); name = (name + 1) % NAMES.length; drawStar(true); setTimeout(() => drawStar(false), 900); say(QUIPS[name]); sfx([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.3]], 'triangle', 0.2); });
    // two spotlights roaming the carpet, like a premiere
    const pool = (col) => {
      const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, map: canvasTex(64, 64, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }) });
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.55, 28).rotateX(-Math.PI / 2), m); p.position.y = 0.022; p.renderOrder = 3; p.userData.noInk = true; g.add(p); return p;
    };
    const pools = [pool(0xfff1c0), pool(0xffd0e0)];
    live((t) => {
      pools[0].position.set(Math.sin(t * 0.23) * 1.6, 0.022, -1.6 + Math.sin(t * 0.37) * 0.9);
      pools[1].position.set(Math.sin(t * 0.19 + 2) * 1.4, 0.022, -1.4 + Math.cos(t * 0.29) * 1.0);
    });
    // solid things where there's room: a Q&A microphone and a popcorn-tub bin
    const mic = firstFree([[3.55, -2.3], [3.6, -1.95], [-3.55, -1.45], [3.6, -0.95], [-3.5, -4.0]], 0.16);
    if (mic) {
      const [x, z] = mic; claim(x, z, 0.16);
      S.put(new THREE.CylinderGeometry(0.15, 0.17, 0.03, 16), dark, x, 0.015, z);
      S.put(new THREE.CylinderGeometry(0.014, 0.014, 1.3, 8), paint(0x9a9aa8), x, 0.66, z);
      S.put(new THREE.CylinderGeometry(0.03, 0.025, 0.12, 10).rotateX(0.5), dark, x, 1.34, z + 0.02);
      S.put(new THREE.SphereGeometry(0.04, 10, 8), paint(0x6f7d92), x, 1.41, z + 0.05);
    }
    const bin = firstFree([[-3.55, -1.45], [3.6, -0.95], [3.6, -1.95], [-3.5, -4.0], [-1.55, -4.9]].filter(p => !mic || Math.hypot(p[0] - mic[0], p[1] - mic[1]) > 0.5), 0.2);
    if (bin) {
      const [x, z] = bin; claim(x, z, 0.2);
      S.put(new THREE.CylinderGeometry(0.2, 0.16, 0.55, 16, 1, false), paint(0xffffff, { map: canvasTex(64, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#c23f36' : '#f6eedb'; c.fillRect(i * 8, 0, 8, h); } }), unique: true }), x, 0.275, z);
      for (let i = 0; i < 7; i++) S.put(new THREE.SphereGeometry(0.05, 7, 6), paint(0xf3e3b8), x + Math.sin(i * 2.4) * 0.1, 0.56 + (i % 2) * 0.04, z + Math.cos(i * 2.4) * 0.1);
      decal(0.5, 0.5, (c, w, h) => { c.fillStyle = '#f6eedb'; for (let q = 0; q < 14; q++) { c.beginPath(); c.arc(w / 2 + Math.cos(q * 2.2) * (20 + q * 3), h / 2 + Math.sin(q * 2.2) * (20 + q * 3), 5, 0, 7); c.fill(); } }, x, z + 0.05);
    }
  }

  S.flush(g); L.flush(g, true);
}

function fitLineLocal(c, text, px, font, maxW) {
  let s = px;
  do { c.font = `700 ${s}px ${font}`; s -= 2; } while (c.measureText(text).width > maxW && s > 8);
}
