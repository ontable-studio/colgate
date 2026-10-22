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

const result = { score: 95, meterPct: 95, pops: 24, misses: 5, durationSec: 22 };
const lose = { score: 55, meterPct: 55, pops: 15, misses: 9, durationSec: 30 };
const shots = [
  ['01-attract', 'Attract', {}, 2500],
  ['02-how-to-play', 'HowToPlay', {}, 3500],
  ['03-gameplay', 'Gameplay', {}, 7000],
  ['04-result', 'Result', { result }, 4500],
  ['05-result-time-up', 'Result', { result: lose }, 4500],
];
const keys = ['Attract', 'HowToPlay', 'Gameplay', 'Result'];
for (const [name, scene, data, wait] of shots) {
  await run(
    `${JSON.stringify(keys)}.forEach(k => __game.scene.stop(k)); __game.scene.start(${JSON.stringify(scene)}, ${JSON.stringify(data)}); 1`,
  );
  if (scene === 'Gameplay') {
    // Wait for the countdown to end and for molecules to float in, tap a few so the meter has
    // some progress, then wait until the screen is busy again before the shot.
    const gameState =
      "(() => { const g = __game.scene.getScene('Gameplay'); return g.countdownLeftMs <= 0 ? g.bubbles.length : -1; })()";
    const waitForBubbles = async (min) => {
      for (let i = 0; i < 60; i++) {
        const r = await run(gameState);
        if ((r.result?.value ?? -1) >= min) return;
        await sleep(250);
      }
    };
    await waitForBubbles(4);
    for (let i = 0; i < 4; i++) {
      await run(
        "(() => { const g = __game.scene.getScene('Gameplay'); const b = g.bubbles[0]; if (b) g.onTap(b.x, b.y); return 1; })()",
      );
      await sleep(400);
    }
    await waitForBubbles(4);
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
