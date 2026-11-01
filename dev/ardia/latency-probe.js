(() => {
  const L = (window.__lat = { samples: [], pending: null });
  addEventListener('keydown', (e) => { if (e.isTrusted && !L.pending) L.pending = { key: e.key, t0: e.timeStamp }; }, true);
  const v = (e) => e && e.getClientRects().length > 0;
  const list = () => [...document.querySelectorAll('[gh="tl"]')].find(v);
  const cursorId = () => list()?.querySelector('tr.btb [data-thread-id], tr.btb [data-legacy-thread-id]')?.getAttribute('data-legacy-thread-id') ?? list()?.querySelector('tr.btb')?.rowIndex ?? null;
  const subject = () => [...document.querySelectorAll('h2.hP')].find(v)?.textContent ?? '';
  const firstRow = () => list()?.querySelector('tr.zA [data-legacy-thread-id]')?.getAttribute('data-legacy-thread-id') ?? null;
  const paletteOpen = () => document.activeElement?.id === 'nowave-palette';
  L.measure = (kind) => new Promise((resolve) => {
    const before = { cursor: cursorId(), subject: subject(), hash: location.hash, first: firstRow(), palette: paletteOpen() };
    const changed = () => {
      if (kind === 'cursor') return cursorId() !== before.cursor;
      if (kind === 'open') return subject() !== '' && subject() !== before.subject;
      if (kind === 'close') return subject() === '';
      if (kind === 'split') return location.hash !== before.hash && firstRow() !== null && firstRow() !== before.first;
      if (kind === 'palette') return paletteOpen() !== before.palette;
      return false;
    };
    L.pending = null;
    const deadline = performance.now() + 4000;
    const tick = async (now) => {
      if (!L.pending) return requestAnimationFrame(tick);
      if (changed()) {
        const dom = now - L.pending.t0;
        const anims = document.getAnimations().filter((a) => a.playState === 'running');
        await Promise.all(anims.map((a) => a.finished.catch(() => {})));
        await new Promise((r) => requestAnimationFrame(r));
        const settled = performance.now() - L.pending.t0;
        resolve({ kind, key: L.pending.key, dom: Math.round(dom), settled: Math.round(settled), anims: anims.length, vis: document.visibilityState });
        L.pending = null;
        return;
      }
      if (now > deadline) { resolve({ kind, timeout: true, vis: document.visibilityState }); L.pending = null; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  return true;
})()
