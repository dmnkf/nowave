import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { ownWindow } from './window.mjs';
const ardia = join(homedir(), '.local/bin/ardia');
const [repo, rounds = '4'] = process.argv.slice(2);
const probe = readFileSync(new URL('./latency-probe.js', import.meta.url), 'utf8');
const VIEW = '#search/is%3Aread+-in%3Ainbox+older_than%3A2y';
const all = [];
async function side(name) {
  if (name === 'gmail') execFileSync(ardia, ['scripts', 'uninstall', 'nowave'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
  let b;
  const m = async (kind, key, vk, code, mods = 0, text) => {
    await b.ev(`(window.__p = window.__lat.measure(${JSON.stringify(kind)}), true)`);
    await (text === undefined ? b.key(key, vk, code, mods) : b.key(key, vk, code, mods, text));
    let r = await b.ev('window.__p');
    if (!r || typeof r !== 'object') r = { kind, error: String(r).slice(0, 160) };
    all.push({ side: name, ...r });
    writeFileSync(join(tmpdir(), 'nowave-latency.json'), JSON.stringify(all));
    await b.sleep(250);
    return r;
  };
  try {
    b = await ownWindow(`about:blank#nowave-lat-${name}`);
    await b.open(VIEW);
    await b.sleep(1500);
    await b.ev(probe);
    if (name === 'nowave' && !(await b.ev(`!!document.getElementById('nowave-style')`))) throw new Error('nowave not running');
    if (name === 'gmail' && (await b.ev(`!!document.getElementById('nowave-style')`))) throw new Error('nowave still running');
    await b.key('j', 74, 'KeyJ'); await b.key('k', 75, 'KeyK'); await b.sleep(300);
    for (let i = 0; i < 5; i++) await m('cursor', 'j', 74, 'KeyJ');
    for (let i = 0; i < 5; i++) await m('cursor', 'k', 75, 'KeyK');
    for (let i = 0; i < 6 && !(await b.ev(`!![...document.querySelectorAll('[gh="tl"]')].find((e) => e.getClientRects().length > 0)?.querySelector('tr.btb.yO')`)); i++) await b.key('k', 75, 'KeyK');
    const read = await b.ev(`!![...document.querySelectorAll('[gh="tl"]')].find((e) => e.getClientRects().length > 0)?.querySelector('tr.btb.yO')`);
    if (read) {
      if (name === 'nowave') { await m('open', 'l', 76, 'KeyL'); await b.sleep(400); await m('close', 'h', 72, 'KeyH'); await b.sleep(300); await m('open', 'o', 79, 'KeyO'); await m('close', 'Escape', 27, 'Escape'); }
      else { await m('open', 'o', 79, 'KeyO'); }
    } else all.push({ side: name, kind: 'open', skipped: 'cursor row not read' });
    if (name === 'nowave') {
      for (let i = 0; i < 2; i++) { await m('palette', 'k', 75, 'KeyK', 4, ''); await m('palette', 'Escape', 27, 'Escape'); }
      await b.open('#inbox'); await b.sleep(1200); await b.ev(probe);
      await m('split', 'Tab', 9, 'Tab'); await b.sleep(500); await m('split', 'Tab', 9, 'Tab', 8);
    }
  } finally {
    if (b) await b.done().catch(() => {});
    if (name === 'gmail') execFileSync(ardia, ['scripts', 'install', join(repo, 'nowave.user.js')], { stdio: 'ignore' });
  }
}
for (let r = 0; r < Number(rounds); r++) { for (const s of r % 2 ? ['gmail', 'nowave'] : ['nowave', 'gmail']) { try { await side(s); } catch (e) { console.log('side failed', s, String(e).slice(0, 120)); } } }
writeFileSync(join(tmpdir(), 'nowave-latency.json'), JSON.stringify(all, null, 1));
const ok = all.filter((s) => !s.timeout && !s.skipped && !s.error && s.vis === 'visible');
const groups = {};
for (const s of ok) (groups[`${s.side} ${s.kind}`] ??= []).push(s);
const med = (xs) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
for (const [k, xs] of Object.entries(groups)) console.log(k.padEnd(16), 'n=' + xs.length, 'dom p50', med(xs.map((s) => s.dom)), 'range', Math.min(...xs.map((s) => s.dom)) + '-' + Math.max(...xs.map((s) => s.dom)), '| settled p50', med(xs.map((s) => s.settled)), 'range', Math.min(...xs.map((s) => s.settled)) + '-' + Math.max(...xs.map((s) => s.settled)), '| anims', med(xs.map((s) => s.anims)));
console.log('dropped', all.length - ok.length, JSON.stringify(all.filter((s) => s.timeout || s.skipped || s.error || s.vis !== 'visible').map((s) => s.side + ':' + s.kind + ':' + (s.skipped || s.error || (s.timeout ? 'timeout' : s.vis)))));
