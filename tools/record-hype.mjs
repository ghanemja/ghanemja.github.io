// Renders hype.html to an MP4, frame by frame (so a slow software GL still gives a smooth video).
//
//   node tools/record-hype.mjs [out=/tmp/hype.mp4] [fps=30] [only=t1,t2,...]
//   only: comma-separated times in seconds -> writes just those stills (for checking), no video
//
// Needs playwright (preinstalled in the cloud container) and ffmpeg.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, extname, normalize, dirname } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || '/tmp/hype.mp4', fps = +(process.argv[3] || 30), only = process.argv[4];
const root = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try { res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(await readFile(join(root, p))); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${server.address().port}/hype.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
await page.evaluate(() => document.fonts.ready);
const total = await page.evaluate(() => window.__hype.total);

const dir = join(dirname(out), 'hype-frames');
await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
const times = only ? only.split(',').map(Number) : Array.from({ length: Math.round(total * fps) }, (_, i) => i / fps);
for (let i = 0; i < times.length; i++) {
  await page.evaluate((t) => window.__hype.frame(t), times[i]);
  await page.screenshot({ path: join(dir, only ? `t${times[i]}.png` : `f${String(i).padStart(5, '0')}.png`) });
  if (i % 30 === 0) console.log(`frame ${i + 1} / ${times.length}`);
}
await browser.close(); server.close();
if (errors.length) console.log('page errors:\n' + [...new Set(errors)].join('\n'));
if (!only) {
  execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(dir, 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('wrote', out);
} else console.log('stills in', dir);
