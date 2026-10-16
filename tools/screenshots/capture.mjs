// Captures every screen of the game as a 1080x1920 PNG using headless Chrome (dev server only).
//   pnpm dev            (in another terminal)
//   node tools/screenshots/capture.mjs [url] [outDir]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'docs/screenshots';
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9333;
mkdirSync(out, { recursive: true });

const proc = spawn(
  chrome,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required',
    `--user-data-dir=${process.env.TEMP ?? '/tmp'}/colgate-shots-${Date.now()}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {
    /* not up yet */
  }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result ?? msg.error);
};
const send = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id;
    pending.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const run = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true });

await send('Emulation.setDeviceMetricsOverride', {
  width: 1080,
  height: 1920,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url });
for (let i = 0; i < 60; i++) {
  await sleep(500);
  const r = await run("typeof __game !== 'undefined' && __game.scene.isActive('Attract')");
  if (r.result?.value === true) break;
}

const result = { score: 584, timeBonus: 144, meterPct: 100, catches: 22, hits: 1, durationSec: 22 };
const lose = { score: 120, timeBonus: 0, meterPct: 62, catches: 12, hits: 4, durationSec: 40 };
const shots = [
  ['01-attract', 'Attract', {}, 2500],
  ['02-how-to-play', 'HowToPlay', {}, 3500],
  ['03-gameplay', 'Gameplay', {}, 7000],
  ['04-unlock', 'Unlock', { result }, 2300],
  ['05-initials', 'Initials', { result }, 3000],
  ['06-result', 'Result', { result }, 4500],
  ['07-result-time-up', 'Result', { result: lose }, 4500],
  ['08-admin', 'Admin', {}, 2500],
];
const keys = ['Attract', 'HowToPlay', 'Gameplay', 'Unlock', 'Initials', 'Result', 'Admin'];
for (const [name, scene, data, wait] of shots) {
  await run(
    `${JSON.stringify(keys)}.forEach(k => __game.scene.stop(k)); __game.scene.start(${JSON.stringify(scene)}, ${JSON.stringify(data)}); 1`,
  );
  if (scene === 'Gameplay') {
    // Sweep the basket a little so the shot shows a round in progress.
    await run(
      "(async()=>{const g=__game.scene.getScene('Gameplay'); for (let i=0;i<20;i++){ g.targetX = 300 + (i%2)*480; await new Promise(r=>setTimeout(r,300)); } })()",
    );
  } else {
    // Wiggle the mouse now and then so the idle timeout does not send us back to the start screen.
    for (let waited = 0; waited < wait; waited += 500) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10 + (waited % 40), y: 10 });
      await sleep(Math.min(500, wait - waited));
    }
  }
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(shot.data, 'base64'));
  console.log('saved', name);
}
ws.close();
proc.kill();
