// Character check sheet: renders one person from every angle that has caught a
// bug before (four compass sides, both three-quarters, from above and below),
// close-ups of head / hands / feet, and three walk phases — then tiles them into
// one contact sheet. AGENTS.md: "a wide room shot that contains the object does
// not count". Look at every tile before pushing.
//
//   node tools/turntable.mjs [who=player] [outdir=/tmp/turntable]
//   who: player | vivi | otto | pia | rex | critic
//
// Needs playwright (preinstalled in the cloud container) and ImageMagick `montage`
// for the sheet (individual PNGs are written either way).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, extname, normalize } from 'node:path';

// require() resolves a globally installed playwright (NODE_PATH); a bare ESM import would not
const { chromium } = createRequire(import.meta.url)('playwright');

const who = process.argv[2] || 'player';
const out = process.argv[3] || '/tmp/turntable';
const root = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

const server = createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try { res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(await readFile(join(root, p))); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const SHOTS = [
  ['front', { yaw: 0 }], ['back', { yaw: 180 }], ['left', { yaw: 90 }], ['right', { yaw: -90 }],
  ['3q-front', { yaw: 40 }], ['3q-back', { yaw: 140 }],
  ['high-3q', { yaw: 35, pitch: 50 }], ['low', { yaw: 20, pitch: -12 }],
  ['head-front', { yaw: 0, focus: 'head' }], ['head-side', { yaw: 90, focus: 'head' }],
  ['head-back', { yaw: 180, focus: 'head' }], ['head-top', { yaw: 30, pitch: 70, focus: 'head' }],
  ['handR-out', { yaw: 90, focus: 'handR' }], ['handR-front', { yaw: 20, focus: 'handR' }],
  ['handL-out', { yaw: -90, focus: 'handL' }], ['handR-under', { yaw: -60, pitch: -50, focus: 'handR' }],
  ['feet-side', { yaw: 90, focus: 'feet', pitch: 4 }], ['feet-3q', { yaw: 40, focus: 'feet', pitch: 20 }],
  ['walk-0.00', { yaw: 90, walk: 0 }], ['walk-0.25', { yaw: 90, walk: 0.25 }],
  ['walk-0.50', { yaw: 90, walk: 0.5 }], ['walk-0.75', { yaw: 60, walk: 0.75 }],
];

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 480, height: 600 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const files = [];
for (const [name, o] of SHOTS) {
  const qs = new URLSearchParams({ who, ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) });
  await page.goto(`http://localhost:${port}/tools/turntable.html?${qs}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  const f = join(out, `${who}-${name}.png`);
  await page.screenshot({ path: f });
  files.push([f, name]);
}
await browser.close();
server.close();

const sheet = join(out, `${who}-sheet.png`);
try {
  execFileSync('montage', [...files.flatMap(([f, n]) => ['-label', n, f]), '-tile', '6x', '-geometry', '220x275+4+4', '-pointsize', '14', sheet]);
  console.log(`sheet: ${sheet}`);
} catch { console.log(`(no montage) shots in ${out}`); }
if (errors.length) { console.log('page errors:\n  ' + [...new Set(errors)].join('\n  ')); process.exitCode = 1; }
