import { writeFileSync } from 'node:fs';
import { ownWindow } from './window.mjs';
const out = process.argv[2];
const b = await ownWindow('about:blank#nowave-swmeasure');
const shot = async (n) => { const r = await b.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${out}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const S = 1388 / 1300;
const pts = { inboxMenu: [113, 22], search: [650, 22], compose: [1185, 22], avatar: [1275, 22], tabActive: [100, 67], tabIdle: [210, 67], tabCount: [148, 68], section: [92, 155], sectionRule: [600, 167], selRowLeft: [48, 194], selSender: [170, 194], selSubject: [480, 194], selSnippet: [900, 194], selDate: [1200, 194], rowSender: [170, 232], rowSubject: [480, 232], rowSnippet: [900, 232], rowDate: [1210, 232], rowAvatar: [78, 232], chip: [1097, 468], unreadSender: [128, 393], card: [700, 1100 / 1], outerBg: [20, 500], rightIcon: [1277, 58], cardEdge: [47, 600] };
const probe = (x, y) => `(() => {
  const el = document.elementFromPoint(${x}, ${y});
  const out = [];
  for (let e = el, i = 0; e && i < 5; i++, e = e.parentElement) {
    const s = getComputedStyle(e); const r = e.getBoundingClientRect();
    out.push({ tag: e.tagName, txt: e.children.length === 0 ? e.textContent.trim().slice(0, 18) : '', box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], font: s.fontFamily.split(',')[0] + ' ' + s.fontSize + '/' + s.lineHeight + ' w' + s.fontWeight + (s.letterSpacing !== 'normal' ? ' ls' + s.letterSpacing : '') + (s.textTransform !== 'none' ? ' ' + s.textTransform : ''), color: s.color, bg: s.backgroundColor !== 'rgba(0, 0, 0, 0)' ? s.backgroundColor : '', bgImg: s.backgroundImage !== 'none' ? s.backgroundImage.slice(0, 90) : '', pad: s.padding, rad: s.borderRadius !== '0px' ? s.borderRadius : '', border: s.borderTopWidth !== '0px' || s.borderBottomWidth !== '0px' || s.borderLeftWidth !== '0px' ? [s.borderTop, s.borderBottom, s.borderLeft].join(' | ').slice(0, 120) : '', shadow: s.boxShadow !== 'none' ? s.boxShadow.slice(0, 80) : '', trans: s.transition !== 'all 0s ease 0s' && s.transition !== 'none 0s ease 0s' ? s.transition.slice(0, 80) : '' });
  }
  return out;
})()`;
try {
  await b.send('Page.navigate', { url: 'https://app.shortwave.com/' });
  for (let i = 0; i < 60; i++) { const n = await b.ev(`document.querySelectorAll('*').length`); if (n > 1500) break; await b.sleep(500); }
  await b.sleep(4000);
  const res = {};
  for (const [k, [x, y]] of Object.entries(pts)) res[k] = await b.ev(probe(Math.round(x * S), Math.round(y * S)));
  await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(600 * S), y: Math.round(270 * S) });
  await b.sleep(400);
  res.hoverRow = await b.ev(probe(Math.round(600 * S), Math.round(270 * S)));
  await shot('hover');
  writeFileSync(`${out}/measure.json`, JSON.stringify(res, null, 1));
  console.log('measured', Object.keys(res).length);
  await b.key('k', 75, 'KeyK', 4, '');
  await b.sleep(700);
  await shot('palette');
  res.palette = await b.ev(`(() => { const a = document.activeElement; const s = getComputedStyle(a); let e = a; for (let i = 0; i < 6 && e; i++) e = e.parentElement; const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }; const chain = []; for (let x = a, i = 0; x && i < 8; i++, x = x.parentElement) { const cs = getComputedStyle(x); chain.push({ tag: x.tagName, box: box(x), bg: cs.backgroundColor, rad: cs.borderRadius, shadow: cs.boxShadow.slice(0, 90), font: cs.fontSize + ' w' + cs.fontWeight }); } return { active: a.tagName + ' ' + (a.getAttribute('placeholder') || ''), chain }; })()`);
  writeFileSync(`${out}/measure.json`, JSON.stringify(res, null, 1));
  await b.key('Escape', 27, 'Escape');
  await b.sleep(500);
  await b.key('g', 71, 'KeyG'); await b.key('t', 84, 'KeyT');
  await b.sleep(2500);
  await shot('sent');
  console.log('sent url', await b.ev('location.href'));
} finally {
  await b.done();
}
