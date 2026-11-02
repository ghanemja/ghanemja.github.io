// Every-angle check sheet for one shop room:  node tools/room-shot.mjs <room-id> [outDir]
// Serves the repo, walks in through the door, and saves overview / three-quarter / side /
// eye-level shots (plus a close-up of each tappable thing, mid-reaction) as PNGs.
// Prints mesh + draw-call counts and any page errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const id = process.argv[2], out = path.resolve(process.argv[3] || `/tmp/room-shots/${id}`);
if (!id) { console.error('usage: node tools/room-shot.mjs <room-id> [outDir]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const port = srv.address().port;

const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(`http://localhost:${port}/index.html?t=${Date.now()}`);
await p.waitForFunction(() => window.__street, null, { timeout: 120000 });
await p.click('#startBtn');
await p.evaluate((id) => { const d = __street.town.doors[id]; __street.player.teleport(d.x, d.z); }, id);
await p.waitForTimeout(300); await p.keyboard.press('KeyE'); await p.waitForTimeout(1600);
await p.evaluate(() => { for (const s of ['#hud', '#bar', '#say', '#prompt', '#nbBtn']) document.querySelector(s)?.classList.add('hide'); });
const info = await p.evaluate((id) => {
  const r = __street.rooms[id], toys = []; let meshes = 0;
  r.group.traverse(o => { if (o.isMesh && !o.userData.isInk) meshes++; if (o.userData.toy) { const v = o.getWorldPosition(new __street.camera.position.constructor()); toys.push({ x: v.x, z: v.z, label: o.userData.toy.label }); } });
  const pl = __street.player, up = pl.update.bind(pl);
  pl.update = (dt, t) => { const k = up(dt, t); if (window.__cam) { __street.camera.position.set(...window.__cam[0]); __street.camera.lookAt(...window.__cam[1]); } return k; };
  return { o: r.origin, toys, meshes };
}, id);
const { o } = info;
await p.evaluate((o) => __street.player.teleport(o.x + 3.6, o.z + 0.25), o);   // out of the way
const views = {
  overview: [[o.x, 6.8, o.z + 3.4], [o.x, 0, o.z - 2.7]],
  front: [[o.x, 2.2, o.z + 2.6], [o.x, 1.0, o.z - 3]],
  left34: [[o.x - 3.6, 2.4, o.z + 0.3], [o.x + 0.8, 0.8, o.z - 3.4]],
  right34: [[o.x + 3.6, 2.4, o.z + 0.3], [o.x - 0.8, 0.8, o.z - 3.4]],
  sideL: [[o.x + 3.7, 1.3, o.z - 2.6], [o.x - 4, 1.0, o.z - 2.6]],
  sideR: [[o.x - 3.7, 1.3, o.z - 2.6], [o.x + 4, 1.0, o.z - 2.6]],
  eye: [[o.x, 1.5, o.z - 0.6], [o.x, 1.2, o.z - 5]],
};
for (const [name, cam] of Object.entries(views)) {
  await p.evaluate((c) => { window.__cam = c; }, cam);
  await p.waitForTimeout(450);
  await p.screenshot({ path: `${out}/${name}.png` });
}
const calls = await p.evaluate(() => __street.renderer.info.render.calls);
for (const [k, t] of info.toys.entries()) {
  await p.evaluate((t) => { window.__cam = [[t.x + 0.9, 1.0, t.z + 1.3], [t.x, 0.3, t.z]]; }, t);
  await p.waitForTimeout(250);
  await p.evaluate(([id, k]) => { const ts = []; __street.rooms[id].group.traverse(o => o.userData.toy && ts.push(o.userData.toy)); ts[k].poke(() => {}); }, [id, k]);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/tap_${k}.png` });
}
console.log(JSON.stringify({ room: id, meshes: info.meshes, drawCalls: calls, taps: info.toys.map(t => t.label), out, errors: errs }, null, 1));
await b.close(); srv.close();
