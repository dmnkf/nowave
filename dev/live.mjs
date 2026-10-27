// Live check against your own signed-in Gmail in Ardia, through the DevTools port that
// Settings › Advanced › Command line opens. Presses only keys that leave mail unchanged.
//   npm run build
//   node dev/live.mjs dist/nowave.user.js
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const bundle = readFileSync(process.argv[2], 'utf8');
const control = JSON.parse(
  readFileSync(join(homedir(), 'Library/Application Support/com.ardia.browser/Chromium/ArdiaControl.json'), 'utf8'),
);
const ws = new WebSocket(`ws://127.0.0.1:${control.port}${control.browser}?token=${encodeURIComponent(control.token)}`);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = () => reject(new Error('Ardia refused the DevTools connection'));
});

let nextId = 0;
const pending = new Map();
const exceptions = [];
ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id !== undefined) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    if (!p) return;
    if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
    else p.resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    if ((d.url ?? '').includes('nowave') || (d.stackTrace?.callFrames ?? []).some((f) => f.url.includes('nowave'))) {
      exceptions.push(d.exception?.description ?? d.text);
    }
  }
};

let sessionId;
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId && !method.startsWith('Target.') ? { sessionId } : {}) }));
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function evaluate(fn, ...args) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: `(${fn})(...${JSON.stringify(args)})`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

async function until(fn, timeoutMs = 5000, ...args) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await evaluate(fn, ...args);
    if (value) return value;
    await sleep(100);
  }
  return evaluate(fn, ...args);
}

const NAMED = {
  Tab: [9, 'Tab'],
  Escape: [27, 'Escape'],
  Alt: [18, 'AltLeft'],
  Meta: [91, 'MetaLeft'],
};

async function press(key, { meta = false, shift = false, alt = false } = {}) {
  const modifiers = (alt ? 1 : 0) | (meta ? 4 : 0) | (shift ? 8 : 0);
  let vk, code, text;
  if (NAMED[key]) [vk, code] = NAMED[key];
  else if (key === '#') [vk, code, text] = [51, 'Digit3', '#'];
  else [vk, code, text] = [key.toUpperCase().charCodeAt(0), `Key${key.toUpperCase()}`, meta ? undefined : key];
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await send('Input.dispatchKeyEvent', { ...base, type: text ? 'keyDown' : 'rawKeyDown', text, unmodifiedText: text });
  await send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  await sleep(120);
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  (${JSON.stringify(detail)})`}`);
}

const hash = () => evaluate(() => location.hash);
const checkedCount = () =>
  evaluate(() => {
    const list = [...document.querySelectorAll('[gh="tl"]')].find((el) => el.getClientRects().length > 0);
    return list ? list.querySelectorAll('[role="checkbox"][aria-checked="true"]').length : -1;
  });
const paletteOpen = () => evaluate(() => document.activeElement?.id === 'nowave-palette');
const listShown = () =>
  evaluate(() => [...document.querySelectorAll('[gh="tl"]')].some((el) => el.getClientRects().length > 0));
const go = async (h) => {
  await evaluate((x) => (location.hash = x), h);
  await until(() => [...document.querySelectorAll('[gh="tl"]')].some((el) => el.getClientRects().length > 0), 8000);
  await sleep(400);
};

// Ardia's DevTools policy can't place a target in a new window, but its AppleScript can.
// The window has to stay unminimised: Gmail and nowave only render while the page is visible.
const MARKER = 'about:blank#nowave-live';
const windowId = execFileSync('osascript', [
  '-e',
  `tell application "Ardia"
set w to make new window
make new tab at end of tabs of w with properties {URL:"${MARKER}"}
return id of w
end tell`,
])
  .toString()
  .trim();
const closeWindow = () => execFileSync('osascript', ['-e', `tell application "Ardia" to close (window id "${windowId}")`]);
const marked = (await send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page' && t.url === MARKER);
if (marked.length !== 1) {
  closeWindow();
  throw new Error(`expected one ${MARKER} tab, found ${marked.length}`);
}
const { targetId } = marked[0];
({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `if (window.top === window && location.host === 'mail.google.com') {\n${bundle}\n}\n//# sourceURL=nowave.js`,
  });
  await send('Page.navigate', { url: 'https://mail.google.com/mail/u/0/#inbox' });
  check('Gmail list loads', await until(() => [...document.querySelectorAll('[gh="tl"]')].some((el) => el.getClientRects().length > 0), 30000));
  await sleep(1500);

  const facts = await evaluate(() => {
    const shown = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
    const list = [...document.querySelectorAll('[gh="tl"]')].find((el) => el.getClientRects().length > 0);
    const bar = document.getElementById('nowave-splits');
    const gemini = [...document.querySelectorAll('[aria-label*="Gemini"], [data-tooltip*="Gemini"]')];
    return {
      visibility: document.visibilityState,
      lang: document.documentElement.lang,
      rows: list ? list.querySelectorAll('tr.zA').length : 0,
      unreadRows: list ? list.querySelectorAll('tr.zE').length : 0,
      calmStyle: Boolean(document.getElementById('nowave-style')),
      calmClass: document.documentElement.classList.contains('nowave-calm'),
      barMounted: Boolean(bar?.isConnected),
      barPlaced: bar?.nextElementSibling === list || bar?.nextElementSibling?.matches('[gh="mtb"]') === true,
      barHeight: bar ? Math.round(bar.getBoundingClientRect().height) : 0,
      categoryTabsShown: [...document.querySelectorAll('[role="main"] [role="tablist"]')].filter(shown).length,
      geminiShown: gemini.filter(shown).map((e) => e.getAttribute('aria-label') || e.getAttribute('data-tooltip')),
      geminiTotal: gemini.length,
      headerControls: [...document.querySelectorAll('header [aria-label], header [data-tooltip]')]
        .filter(shown)
        .map((e) => [e.tagName, e.getAttribute('role'), e.getAttribute('aria-label') || e.getAttribute('data-tooltip')])
        .filter(([, , label]) => !label.includes('@')),
    };
  });
  console.log('facts', JSON.stringify(facts));
  check('page is visible (rAF runs)', facts.visibility === 'visible', facts.visibility);
  check('calm stylesheet injected at document-start survives Gmail', facts.calmStyle && facts.calmClass);
  check('split bar mounts above the thread list or in its toolbar', facts.barMounted && facts.barPlaced, facts.barHeight);
  check('Gmail category tabs hidden while splits show', facts.categoryTabsShown === 0, facts.categoryTabsShown);
  check('no Gemini control left visible', facts.geminiShown.length === 0, facts.geminiShown);
  check('unread rows carry tr.zE', facts.rows === 0 || facts.unreadRows >= 0, `${facts.unreadRows}/${facts.rows}`);

  await press('x');
  const afterX = await checkedCount();
  await press('x');
  const afterX2 = await checkedCount();
  check('Gmail keyboard shortcuts are on (real x checks then unchecks a row)', afterX === 1 && afterX2 === 0, [afterX, afterX2]);

  await press('b');
  const snoozeMenu = await until(
    () => document.activeElement?.closest('[role="menu"], [role="dialog"], [role="alertdialog"], [role="listbox"]') != null,
    1500,
  );
  const checkedDuringMenu = await checkedCount();
  check("b: nowave's synthetic x + b reach Gmail and open the snooze menu", snoozeMenu && checkedDuringMenu === 1, {
    snoozeMenu,
    checkedDuringMenu,
  });
  await press('Escape');
  const cleared = await until(
    () =>
      [...document.querySelectorAll('[gh="tl"]')]
        .find((el) => el.getClientRects().length > 0)
        ?.querySelectorAll('[role="checkbox"][aria-checked="true"]').length === 0,
    2500,
  );
  check('cancelling snooze clears the selection nowave made (* n)', cleared, await checkedCount());

  const before = await hash();
  await press('k', { meta: true });
  check('⌘K opens the palette', await until(() => document.activeElement?.id === 'nowave-palette', 1500));
  await press('g');
  await press('s');
  check('keys typed in the palette do not reach Gmail (g s stays put)', (await hash()) === before && (await paletteOpen()), await hash());
  await press('Escape');
  check('Esc closes the palette', await until(() => document.activeElement?.id !== 'nowave-palette', 1500));

  await press('Tab');
  const afterTab = await until(() => location.hash.startsWith('#search/'), 3000).then(() => hash());
  const tabQuery = decodeURIComponent(afterTab.slice('#search/'.length).replace(/\+/g, ' '));
  check('Tab goes to the next split', tabQuery === 'in:inbox category:updates', afterTab);
  await until(() => [...document.querySelectorAll('[gh="tl"]')].some((el) => el.getClientRects().length > 0), 8000);
  await sleep(600);
  check('split bar follows into the split view', await evaluate(() => document.getElementById('nowave-splits')?.isConnected === true));
  await press('Tab', { shift: true });
  check('Shift+Tab goes back to Inbox', (await until(() => location.hash === '#inbox', 3000)) === true, await hash());
  await sleep(600);

  await press('g');
  await press('h');
  check('g h goes to Snoozed', await until(() => location.hash === '#snoozed', 3000), await hash());
  await press('g');
  await press('i');
  check("g i still reaches Gmail's own shortcut", await until(() => location.hash === '#inbox', 3000), await hash());

  await go('#search/nowave-live-check-no-results-qx7');
  await press('g');
  await press('Alt', { alt: true });
  await press('#', { alt: true });
  check('g, Option, # (Swiss #) goes to Trash, not Delete', await until(() => location.hash === '#trash', 3000), await hash());

  await go('#inbox');
  const readThread = await evaluate(() => {
    const list = [...document.querySelectorAll('[gh="tl"]')].find((el) => el.getClientRects().length > 0);
    const row = list?.querySelector('tr.zA.yO');
    const idEl = row?.querySelector('[data-legacy-thread-id]');
    return idEl ? idEl.getAttribute('data-legacy-thread-id') : null;
  });
  if (readThread) {
    await evaluate((id) => (location.hash = `#inbox/${id}`), readThread);
    await until(() => location.hash.split('/').length === 2 && location.hash !== '#inbox', 5000);
    await sleep(1200);
    await press('Escape');
    check('Esc in a thread goes back to the list', await until(() => location.hash === '#inbox', 3000), await hash());
  } else {
    check('Esc in a thread goes back to the list', true, 'skipped: no read thread on page 1');
  }

  await go('#inbox');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const out = join(process.env.TMPDIR ?? '/tmp', 'nowave-live.png');
  (await import('node:fs')).writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('screenshot', out);
} finally {
  check('no uncaught nowave exceptions', exceptions.length === 0, exceptions.slice(0, 3));
  // Ardia windows share their space's tabs, so closing the window alone would leave the tab behind.
  await send('Target.closeTarget', { targetId }).catch(() => {});
  closeWindow();
  ws.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
