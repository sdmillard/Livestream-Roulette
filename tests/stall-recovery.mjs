// Checks recovery from a direct video feed that stops delivering data after it has started.
// Needs Playwright with Chromium and ffmpeg on PATH. Start the loopback server first:
//   python -m http.server 8765 --bind 127.0.0.1
//   node tests/stall-recovery.mjs [http://127.0.0.1:8765/]
// The stalled camera is served from a fake HTTPS origin through request interception.
// It returns the first part of the file and never answers the next range request,
// the way a feed does when its server or network stops mid-stream.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const app = process.argv[2] ?? 'http://127.0.0.1:8765/';
const dir = mkdtempSync(join(tmpdir(), 'lr-stall-'));
const file = join(dir, 'feed.webm');
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15',
  '-t', '60', '-c:v', 'libvpx-vp9', '-b:v', '150k', '-deadline', 'realtime', '-cpu-used', '8', file]);
const media = readFileSync(file);
rmSync(dir, { recursive: true, force: true });

const stream = (id, embed) => ({ id, title: id, institution: 'Test fixture', collection: 'Wildlife', kind: 'video',
  embed, original: 'https://feeds.invalid/watch' });
const settings = { interval: 120, muted: true, streams: [stream('stalls', 'https://feeds.invalid/stalls.webm')] };

const browser = await chromium.launch();
const page = await browser.newPage();
const requests = { stalls: 0, healthy: 0 };
await page.route('https://feeds.invalid/**', route => {
  const name = new URL(route.request().url()).pathname.slice(1).replace('.webm', '');
  const range = /bytes=(\d+)-/.exec(route.request().headers().range ?? '');
  const start = range ? Number(range[1]) : 0;
  requests[name] += 1;
  // About ten seconds of video, then silence.
  const cut = name === 'stalls' ? Math.floor(media.length / 6) : media.length;
  if (start >= cut) return;
  route.fulfill({ status: 206, contentType: 'video/webm', body: media.subarray(start, cut),
    headers: { 'Content-Range': `bytes ${start}-${cut - 1}/${media.length}`, 'Accept-Ranges': 'bytes' } });
});
await page.addInitScript(value => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem('livestream-roulette-v1', value);
    sessionStorage.setItem('seeded', '1');
  }
}, JSON.stringify(settings));
await page.goto(app);

const started = Date.now();
const log = message => console.log(`${((Date.now() - started) / 1000).toFixed(1).padStart(5)}s  ${message}`);
const state = () => page.evaluate(() => {
  const video = document.getElementById('video');
  return { src: video.currentSrc, time: video.currentTime.toFixed(1), title: document.getElementById('title').textContent,
    status: document.getElementById('emptyStatus').textContent };
});
let last = '';
let failure;
async function until(label, test, seconds) {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    const now = await state();
    const line = `${now.title || '(none)'} t=${now.time}`;
    if (line !== last) { last = line; log(line); }
    if (await test(now)) { log('PASS ' + label); return; }
    await page.waitForTimeout(500);
  }
  failure ??= label;
  log('FAIL ' + label);
}

await until('stalled feed starts playing', now => Number(now.time) > 2, 20);
// Add a healthy camera through the form while the stalled one plays, so the stalled feed is current.
await page.evaluate(() => {
  const set = (id, value) => { document.getElementById(id).value = value; };
  set('newTitle', 'healthy');
  set('newInstitution', 'Test fixture');
  set('newKind', 'video');
  set('newEmbed', 'https://feeds.invalid/healthy.webm');
  set('newOriginal', 'https://feeds.invalid/watch');
  document.getElementById('permission').checked = true;
  document.getElementById('addForm').requestSubmit();
});
await until('stalled feed is still current after adding a camera', now => now.src.includes('stalls'), 2);
const firstLoads = requests.stalls;
await until('one reconnect to the stalled feed', () => requests.stalls > firstLoads, 40);
await until('switch to the healthy camera after the retry stalls', now => now.src.includes('healthy') && Number(now.time) > 1, 50);
console.log(failure ? `FAIL: ${failure}` : 'PASS');
console.log('Requests', requests);
await browser.close();
process.exit(failure ? 1 : 0);
