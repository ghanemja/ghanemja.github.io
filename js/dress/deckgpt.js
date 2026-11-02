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
  const warn = (what, x, z, r) => { if (!free(x, z, r)) (window.__dressWarn ??= []).push(`deckgpt: ${what} at ${x},${z}`); };
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
    warn('organ', x, z + 0.3, 0.25);
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
    tap(organ, 'play the mighty organ', (sfx) => {
      t0 = now();
      sfx([[262, 0.18], [330, 0.18], [392, 0.18], [523, 0.5], [392, 0.15], [523, 0.8]], 'triangle', 0.6);
      sfx([[131, 1.5], [196, 0.8]], 'sine', 0.4);
    });
  }

  // ══ LEFT WALL: lobby posters in bulb frames, deco sconces, an EXIT sign ══
  const bulbsOn = glow(0xfff1b0), bulbsDim = glow(0xb08a40);
  const chase = [];
  {
    const posters = [
      ['SCOPE', 'who is it for?', '#2a3a5e', '#3a4c78', '#f2d27a', 'stage 1'],
      ['THE STORY', 'hook · problem · insight · ask', '#7a1f2c', '#912a38', '#f6eedb', 'stage 2'],
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
  }
  live((t) => { const k = Math.floor(t * 5); chase.forEach((b, i) => { b.material = (i + k) % 4 === 0 ? bulbsDim : bulbsOn; }); });

  // ══ a velvet rope in front of the posters (tap: twang it) ══
  {
    const posts = [[-3.5, -2.05], [-2.7, -2.15], [-1.9, -2.05]];
    posts.forEach(([x, z], i) => {
      warn('post' + i, x, z, 0.14); claim(x, z, 0.12);
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
    warn('reel', x, z, 0.3); claim(x, z, 0.3);
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
    tap(reel, 'spin the film reel', (sfx) => { t0 = now(); sfx(Array.from({ length: 10 }, (_, i) => [900 + (i % 2) * 300, 0.035]), 'square', 0.15); });
  }

  // ══ a cardboard standee: "coming soon" (tap: wobble it) ══
  {
    const x = -1.95, z = -3.15;
    warn('standee', x, z, 0.3); claim(x, z, 0.28);
    const sm = opaque(220, 380, (c, w, h) => {
      deco(c, w, h, '#2a2230', '#3a3048');
      c.fillStyle = '#f2d27a'; c.textAlign = 'center';
      c.font = `400 22px ${HAND}`; c.fillText('COMING SOON', w / 2, 36);
      c.font = `700 58px ${SCRIPT}`; c.fillText('Our Q3', w / 2, 100); c.fillText('Plan', w / 2, 150);
      for (let k = 0; k < 3; k++) { const y = 186 + k * 52; c.fillStyle = '#fbf8f1'; c.fillRect(34 + k * 14, y, 124, 40); c.fillStyle = ['#e8604c', '#7fb3a8', '#e4b84f'][k]; c.fillRect(40 + k * 14, y + 6, 70, 8); }
      c.fillStyle = '#f2d27a'; c.font = `400 20px ${HAND}`; c.fillText('12 slides · one prompt', w / 2, 352);
    });
    const st = new THREE.Group(); st.position.set(x, 0, z); st.rotation.y = 0.5; g.add(st);
    const SK = sub(st);
    SK.box(0.66, 1.18, 0.025, paint(0xc8a47c), 0, 0.62, 0, 0.01);
    const face = SK.put(new THREE.PlaneGeometry(0.62, 1.1), sm, 0, 0.62, 0.014); face.userData.noInk = true;
    SK.box(0.04, 0.7, 0.025, paint(0xc8a47c), 0, 0.33, -0.2, 0.01, [0.55, 0, 0]);
    let t0 = -9;
    live(() => { const s = since(t0); const k = s < 2.2 ? Math.sin(s * 10) * Math.exp(-s * 1.8) : 0; st.rotation.x = k * 0.18; st.rotation.z = k * 0.08; });
    tap(st, 'wobble the standee', (sfx) => { t0 = now(); sfx([[200, 0.06], [170, 0.06], [150, 0.1]], 'sine', 0.5); });
    g.add(shadow(0.35).translateX(x).translateZ(z));
  }

  // ══ RIGHT SIDE: the box office (tap: get a ticket) ══
  {
    const x = 3.52, z = -3.12, ry = -Math.PI / 2;
    warn('kiosk', x, z, 0.36); claim(x, z, 0.4); claim(x, z - 0.3, 0.32); claim(x, z + 0.3, 0.32);
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
    const frontM = opaque(256, 160, (c, w, h) => {
      c.fillStyle = '#b03a30'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#e8c46a'; c.lineWidth = 6; c.strokeRect(14, 14, w - 28, h - 28);
      c.fillStyle = '#f2d27a'; c.font = `700 46px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('Tickets', w / 2, 72);
      c.font = `400 22px ${HAND}`; c.fillText('tonight: your deck', w / 2, 108); c.fillText('admit one · 4 stages', w / 2, 134);
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
    tap(mach, 'buy a ticket', (sfx) => { t0 = now(); sfx([[1200, 0.04], [1000, 0.04], [1200, 0.04], [1000, 0.04], [1568, 0.4]], 'square', 0.2); });
    g.add(shadow(0.6).translateX(x).translateZ(z));
  }

  // ══ a stack of film cans in the back-right corner (tap: pop the lid) ══
  {
    const x = 3.62, z = -4.12;
    warn('cans', x, z, 0.24); claim(x, z, 0.24);
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
    live(() => {
      const s = since(t0);
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
    one(-1.3, 1.65, 'THE DECK', 'export it · present it', '#4a2a5e', '#5c3874', '#f2d27a');
    one(-4.72, 1.6, 'ENCORE!', 'start from a brief', '#7a4a1f', '#8e5a2a', '#f6eedb');
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
    tap(masks, 'swap the masks', (sfx) => {
      t0 = now(); sw = !sw;
      setTimeout(() => mm.forEach(({ mat, i }) => { mat.map = (sw ? T2 : T)[i]; mat.needsUpdate = true; }), 300);
      sfx(sw ? [[392, 0.12], [311, 0.12], [262, 0.3]] : [[262, 0.12], [330, 0.12], [392, 0.3]], 'triangle', 0.4);
    });
  }

  // ══ the sandwich board by the door: tonight's show (tap: flip the card) ══
  {
    const x = 3.52, z = -0.38;
    warn('aframe', x, z, 0.22); claim(x, z, 0.22);
    const af = new THREE.Group(); af.position.set(x, 0, z); af.rotation.y = -0.6; g.add(af);
    const AK = sub(af);
    for (const s of [-1, 1]) AK.box(0.5, 0.9, 0.03, walnut, 0, 0.44, s * 0.13, 0.01, [-s * 0.15, 0, 0]);
    AK.box(0.52, 0.05, 0.15, gold, 0, 0.9, 0, 0.015);
    const faces = ['NOW SHOWING|your deck|in four stages', 'TONIGHT|Scope · Story|Visuals · Deck'].map(txt => opaque(160, 240, (c, w, h) => {
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
    tap(af, 'flip the sign', (sfx) => { t0 = now(); setTimeout(() => { n ^= 1; cm.material = faces[n]; }, 250); sfx([[500, 0.05], [650, 0.08]], 'sine', 0.4); });
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

  S.flush(g); L.flush(g, true);
}

function fitLineLocal(c, text, px, font, maxW) {
  let s = px;
  do { c.font = `700 ${s}px ${font}`; s -= 2; } while (c.measureText(text).width > maxW && s > 8);
}
