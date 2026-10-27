// Screenshots of a bundle on your own signed-in Gmail, for visual checks. Runs in its own minimised Ardia window
// (Settings › Advanced › Command line must be on). The installed nowave would run alongside the injected one, so the
// run uninstalls it and afterwards reinstalls the last commit from a clean checkout.
//   npm run build
//   node dev/shot.mjs dist/nowave.user.js "$TMPDIR/shots" '[{"hash":"#inbox"},{"shot":"inbox"},{"key":"mod+k"},{"wait":300},{"shot":"palette"}]'
// Steps:
//   {hash}: goes to that Gmail view and waits for the list.
//   {key: "j" | "shift+tab" | "mod+k" | "escape" | "enter" | ...}: presses a real key.
//   {mouse: [x, y]}: moves the pointer, never clicks.
//   {wait: ms}, {shot: name}, {eval: "js"}, {evalFile: "path"}.
//   {assert: "js"}: stops the run unless it is true.
//   {shadowText: [host, selector], expect?: text}: prints the text of selector inside host's shadow root, also a
//   closed one, and stops the run unless it contains expect.
// Use only keys that leave mail unchanged, and put an assert before any key that is safe only in one state, such as
// Enter in the palette:
//   {"assert": "document.activeElement?.id === 'nowave-palette'"}
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [bundlePath, outDir, stepsJson = '[{"hash":"#inbox"},{"shot":"inbox"}]'] = process.argv.slice(2);
const bundle = readFileSync(bundlePath, 'utf8');
const steps = JSON.parse(stepsJson);
mkdirSync(outDir, { recursive: true });

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const headCheckout = join(tmpdir(), 'nowave-head');

function reinstallHead() {
  const head = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD']).toString().trim();
  try {
    execFileSync('git', ['-C', headCheckout, 'checkout', '-q', '--detach', head], { stdio: 'ignore' });
  } catch {
    execFileSync('git', ['-C', repo, 'worktree', 'add', '-q', '--detach', headCheckout, head]);
  }
  execFileSync('ardia', ['scripts', 'install', join(headCheckout, 'nowave.user.js')], { stdio: 'ignore' });
  console.log(`reinstalled nowave at ${head.slice(0, 7)}`);
}

const MARKER = 'about:blank#nowave-shot';
execFileSync('ardia', ['scripts', 'uninstall', 'nowave'], { stdio: 'ignore' });
const windowId = execFileSync('osascript', [
  '-e',
  `tell application "Ardia"
set w to make new window
set minimized of w to true
make new tab at end of tabs of w with properties {URL:"${MARKER}"}
return id of w
end tell`,
])
  .toString()
  .trim();
const closeWindow = () => execFileSync('osascript', ['-e', `tell application "Ardia" to close (window id "${windowId}")`]);

const control = JSON.parse(
  readFileSync(join(homedir(), 'Library/Application Support/com.ardia.browser/Chromium/ArdiaControl.json'), 'utf8'),
);
const ws = new WebSocket(`ws://127.0.0.1:${control.port}${control.browser}?token=${encodeURIComponent(control.token)}`);
await new Promise((ok, fail) => {
  ws.onopen = ok;
  ws.onerror = () => fail(new Error('Ardia refused the DevTools connection'));
});
let nextId = 0;
let sessionId;
const pending = new Map();
const errors = [];
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id !== undefined) {
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  } else if (msg.method === 'Runtime.exceptionThrown' && JSON.stringify(msg.params).includes('nowave')) {
    errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  }
};
const send = (method, params = {}) =>
  new Promise((ok, fail) => {
    const id = ++nextId;
    pending.set(id, (m) => (m.error ? fail(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
    ws.send(JSON.stringify({ id, method, params, ...(sessionId && !method.startsWith('Target.') ? { sessionId } : {}) }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return r.exceptionDetails ? `error: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}` : r.result.value;
};
async function shadowText(host, selector) {
  const { root } = await send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: host });
  if (!nodeId) return null;
  const { node } = await send('DOM.describeNode', { nodeId, depth: 1, pierce: true });
  const shadow = node.shadowRoots?.[0];
  if (!shadow) return null;
  const { object } = await send('DOM.resolveNode', { backendNodeId: shadow.backendNodeId });
  const found = await send('Runtime.callFunctionOn', {
    objectId: object.objectId,
    functionDeclaration: 'function (selector) { return this.querySelector(selector)?.textContent ?? null; }',
    arguments: [{ value: selector }],
    returnByValue: true,
  });
  return found.result.value;
}
const listShown = `[...document.querySelectorAll('[gh="tl"]')].some((e) => e.getClientRects().length > 0)`;

const NAMED = {
  escape: ['Escape', 27, 'Escape'],
  enter: ['Enter', 13, 'Enter', '\r'],
  tab: ['Tab', 9, 'Tab'],
  arrowdown: ['ArrowDown', 40, 'ArrowDown'],
  arrowup: ['ArrowUp', 38, 'ArrowUp'],
};
async function press(chord) {
  const parts = chord.split('+');
  const name = parts.pop();
  const mods = (parts.includes('alt') ? 1 : 0) | (parts.includes('ctrl') ? 2 : 0) | (parts.includes('mod') ? 4 : 0) | (parts.includes('shift') ? 8 : 0);
  let [key, vk, code, text] = NAMED[name] ?? [name, name.toUpperCase().charCodeAt(0), `Key${name.toUpperCase()}`, name];
  if (parts.includes('shift') && text?.length === 1) key = text = text.toUpperCase();
  if (parts.includes('mod')) text = undefined;
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods };
  await send('Input.dispatchKeyEvent', { ...base, type: text ? 'keyDown' : 'rawKeyDown', text, unmodifiedText: text });
  await send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  await sleep(150);
}

let targetId;
try {
  const marked = (await send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page' && t.url === MARKER);
  if (marked.length !== 1) throw new Error(`expected one ${MARKER} tab, found ${marked.length}`);
  ({ targetId } = marked[0]);
  ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `if (window.top === window && location.host === 'mail.google.com') {\n${bundle}\n}\n//# sourceURL=nowave.js`,
  });
  for (const step of steps) {
    if (step.hash !== undefined) {
      const loaded = await evaluate(`location.host === 'mail.google.com'`);
      if (loaded === true) await evaluate(`location.hash = ${JSON.stringify(step.hash)}`);
      else await send('Page.navigate', { url: `https://mail.google.com/mail/u/0/${step.hash}` });
      for (let i = 0; i < 150 && (await evaluate(listShown)) !== true; i++) await sleep(200);
      await sleep(1200);
    } else if (step.key) await press(step.key);
    else if (step.mouse) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: step.mouse[0], y: step.mouse[1] });
    else if (step.wait) await sleep(step.wait);
    else if (step.eval) console.log('eval', JSON.stringify(await evaluate(step.eval)));
    else if (step.evalFile) console.log('eval', JSON.stringify(await evaluate(readFileSync(step.evalFile, 'utf8'))));
    else if (step.assert && (await evaluate(step.assert)) !== true) throw new Error(`assert failed: ${step.assert}`);
    else if (step.shadowText) {
      const text = await shadowText(...step.shadowText);
      console.log('shadowText', JSON.stringify(text));
      if (step.expect !== undefined && !text?.includes(step.expect)) throw new Error(`expected ${JSON.stringify(step.expect)} in ${step.shadowText.join(' ')}`);
    }
    else if (step.shot) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const file = join(outDir, `${step.shot}.png`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      console.log('shot', file);
    }
  }
} finally {
  if (errors.length) console.log('nowave errors', JSON.stringify(errors.slice(0, 5)));
  // Ardia windows share their space's tabs, so closing the window alone would leave the tab behind.
  if (targetId) await send('Target.closeTarget', { targetId }).catch(() => {});
  try {
    closeWindow();
  } catch {}
  ws.close();
  reinstallHead();
}
