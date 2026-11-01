import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export async function ownWindow(marker, { minimized = true } = {}) {
  const win = execFileSync('osascript', ['-e', `tell application "Ardia"
set w to make new window
set zoomed of w to true
${minimized ? 'set minimized of w to true' : ''}
make new tab at end of tabs of w with properties {URL:"${marker}"}
return id of w
end tell`]).toString().trim();
  const close = () => execFileSync('osascript', ['-e', `tell application "Ardia" to close (window id "${win}")`]);
  const c = JSON.parse(readFileSync(join(homedir(), 'Library/Application Support/com.ardia.browser/Chromium/ArdiaControl.json'), 'utf8'));
  const ws = new WebSocket(`ws://127.0.0.1:${c.port}${c.browser}?token=${encodeURIComponent(c.token)}`);
  await new Promise((r) => (ws.onopen = r));
  let n = 0; const p = new Map(); let sid;
  ws.onmessage = ({ data }) => { const m = JSON.parse(data); if (m.id && p.has(m.id)) { p.get(m.id)(m); p.delete(m.id); } };
  ws.onclose = () => { for (const [, r] of p) r({ error: { message: 'Ardia closed the DevTools connection' } }); p.clear(); };
  const send = (method, params = {}) => new Promise((r) => { const id = ++n; const timer = setTimeout(() => { if (p.delete(id)) r({ error: { message: 'timeout ' + method } }); }, 20000); p.set(id, (m) => { clearTimeout(timer); r(m); }); ws.send(JSON.stringify({ id, method, params, ...(sid && !method.startsWith('Target.') ? { sessionId: sid } : {}) })); });
  const mine = (await send('Target.getTargets')).result.targetInfos.filter((t) => t.type === 'page' && t.url === marker);
  if (mine.length !== 1) { close(); throw new Error('marker tab not found'); }
  sid = (await send('Target.attachToTarget', { targetId: mine[0].targetId, flatten: true })).result.sessionId;
  await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) return 'EXC ' + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text).slice(0, 200); return r.result?.result?.value; };
  const visList = `[...document.querySelectorAll('[gh="tl"]')].find((e) => e.getClientRects().length > 0)`;
  const open = async (hash) => {
    await send('Page.navigate', { url: `https://mail.google.com/mail/u/0/${hash}` });
    for (let i = 0; i < 150 && !(await ev(`!!${visList}`)); i++) await sleep(200);
    await sleep(1500);
  };
  const clickAt = async (expr) => {
    const r = await ev(`(() => { const e = ${expr}; if (!e) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
    if (!r) return false;
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0] - 3, y: r[1] - 2, button: 'none' });
    await sleep(120);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0], y: r[1], button: 'none' });
    await sleep(250);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r[0], y: r[1], button: 'left', buttons: 1, clickCount: 1 });
    await sleep(90);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r[0], y: r[1], button: 'left', buttons: 0, clickCount: 1 });
    await sleep(500);
    return true;
  };
  const key = async (k, vk, code, mods = 0, text = k.length === 1 ? k : undefined) => {
    const base = { key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods };
    await send('Input.dispatchKeyEvent', { ...base, type: text ? 'keyDown' : 'rawKeyDown', text, unmodifiedText: text });
    await send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
    await sleep(200);
  };
  const targetId = mine[0].targetId;
  return { send, ev, sleep, open, clickAt, key, visList, done: async () => { await send('Target.closeTarget', { targetId }); try { close(); } catch {} ws.close(); } };
}
