import { EASE, SKIN_CLASS, SPLIT_PILLS_CSS, reducedMotion } from './skin.js';

const CSS = `
:host {
  display: block;
  min-width: 0;
  max-width: 100%;
  --accent: #0b57d0;
  --line: rgba(0, 0, 0, 0.08);
}
@media (prefers-color-scheme: dark) {
  :host {
    --accent: #a8c7fa;
    --line: rgba(255, 255, 255, 0.12);
  }
}
.bar {
  display: flex;
  align-items: stretch;
  gap: 24px;
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
  scrollbar-width: none;
  font: 500 14px "Google Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
}
.tab {
  all: unset;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  opacity: 0.66;
  cursor: pointer;
  white-space: nowrap;
}
.tab:hover { opacity: 0.9; }
.tab:focus-visible { outline: 2px solid var(--nw-accent, var(--accent)); outline-offset: -2px; border-radius: 8px; }
.tab[aria-selected="true"] {
  opacity: 1;
  border-bottom-color: var(--accent);
}
`;

export function createSplitBar({ onSelect }) {
  const host = document.createElement('div');
  host.id = 'nowave-splits';
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = CSS + SPLIT_PILLS_CSS;
  const bar = document.createElement('div');
  bar.className = 'bar';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Splits');
  root.append(style, bar);

  // Keep focus where Gmail had it, so j/k keep moving through the list after a click.
  bar.addEventListener('mousedown', (e) => e.preventDefault());
  bar.addEventListener('keydown', (e) => {
    const tabs = [...bar.querySelectorAll('.tab')];
    const index = tabs.indexOf(root.activeElement);
    if (index < 0) return;
    let next;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    e.stopPropagation();
    tabs[next].focus({ preventScroll: true });
    onSelect(next);
  });

  const pill = document.createElement('div');
  pill.className = 'pill';

  let rendered = '';
  let placed = null;
  let needsPlace = false;
  let frame = null;
  const observer = new ResizeObserver(() => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (host.isConnected) place();
    });
  });

  function observe() {
    observer.disconnect();
    observer.observe(bar);
    for (const tab of bar.querySelectorAll('.tab')) observer.observe(tab);
  }

  // One highlight slides between tabs. Gmail gives every view its own toolbar, so the bar is re-parented on each
  // switch, which resets CSS transitions; the slide is animated from the last measured place instead.
  function place() {
    needsPlace = false;
    const tab = bar.querySelector('[aria-selected="true"]');
    pill.hidden = !tab || !host.classList.contains(SKIN_CLASS);
    if (tab) {
      const left = tab.getBoundingClientRect().left - bar.getBoundingClientRect().left + bar.scrollLeft;
      if (left < bar.scrollLeft) bar.scrollLeft = left;
      else if (left + tab.offsetWidth > bar.scrollLeft + bar.clientWidth) {
        bar.scrollLeft = left + tab.offsetWidth - bar.clientWidth;
      }
    }
    if (pill.hidden) {
      placed = null;
      return;
    }
    const next = { transform: `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`, width: `${tab.offsetWidth}px` };
    if (placed?.transform === next.transform && placed.width === next.width) return;
    Object.assign(pill.style, next, { height: `${tab.offsetHeight}px` });
    for (const animation of pill.getAnimations()) animation.cancel();
    if (placed && !reducedMotion()) pill.animate([placed, next], { duration: 220, easing: EASE });
    placed = next;
  }

  return {
    setSkin(on) {
      if (host.classList.contains(SKIN_CLASS) === on) return;
      host.classList.toggle(SKIN_CLASS, on);
      needsPlace = true;
    },
    render(splits, active, counts = []) {
      const key = JSON.stringify([splits, active, counts]);
      if (key === rendered) return;
      rendered = key;
      needsPlace = true;
      const focused = bar.contains(root.activeElement);
      bar.replaceChildren(
        pill,
        ...splits.map((split, i) => {
          const tab = document.createElement('button');
          tab.className = 'tab';
          tab.type = 'button';
          tab.tabIndex = i === (active < 0 ? 0 : active) ? 0 : -1;
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-selected', String(i === active));
          tab.textContent = split.name;
          if (counts[i]) {
            const count = document.createElement('span');
            count.className = 'count';
            count.textContent = counts[i];
            tab.append(count);
          }
          tab.title = split.query;
          tab.addEventListener('click', () => onSelect(i));
          return tab;
        }),
      );
      if (focused) bar.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
      if (host.isConnected) observe();
    },
    // Idempotent: Gmail re-renders constantly and this runs on every settled mutation batch.
    mountBefore(anchor) {
      if (host.parentNode !== anchor.parentNode || host.nextSibling !== anchor) {
        anchor.parentNode.insertBefore(host, anchor);
        observe();
        needsPlace = true;
      }
      if (needsPlace) place();
    },
    unmount() {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      placed = null;
      needsPlace = true;
      host.remove();
    },
  };
}
