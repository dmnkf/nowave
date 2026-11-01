import { writeFileSync } from 'node:fs';
import { ownWindow } from './window.mjs';
const out = process.argv[2];
const b = await ownWindow('about:blank#nowave-swflow');
const shot = async (n) => { const r = await b.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${out}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const layout = (label) => b.ev(`(() => {
  const r = (e) => { const x = e.getBoundingClientRect(); return [Math.round(x.x), Math.round(x.y), Math.round(x.width), Math.round(x.height)]; };
  const big = [...document.querySelectorAll('div')].filter((e) => { const x = e.getBoundingClientRect(); return x.height > 500 && x.width > 300 && x.width < innerWidth - 40; });
  const cols = [...new Set(big.map((e) => r(e).join(',')))].slice(0, 8);
  return { label: ${JSON.stringify('')}, url: location.pathname + location.hash, vis: document.visibilityState, active: document.activeElement?.tagName, cols };
})()`);
try {
  await b.send('Page.navigate', { url: 'https://app.shortwave.com/sent' });
  for (let i = 0; i < 60; i++) { if ((await b.ev(`document.querySelectorAll('*').length`)) > 1500) break; await b.sleep(500); }
  await b.sleep(4000);
  const steps = [['list', null], ['enter', ['Enter', 13, 'Enter', 0, '\r']], ['j-in-thread', ['j', 74, 'KeyJ']], ['k-in-thread', ['k', 75, 'KeyK']], ['esc', ['Escape', 27, 'Escape']], ['arrow-right', ['ArrowRight', 39, 'ArrowRight', 0, '']], ['arrow-left', ['ArrowLeft', 37, 'ArrowLeft', 0, '']], ['esc2', ['Escape', 27, 'Escape']]];
  for (const [name, k] of steps) {
    if (k) await b.key(...k);
    await b.sleep(1500);
    const l = await layout();
    console.log(name.padEnd(12), JSON.stringify(l));
    await shot(name);
  }
} finally { await b.done(); }
