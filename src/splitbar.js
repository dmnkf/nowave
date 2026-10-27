import { EASE, SKIN_CLASS, SPLIT_PILLS_CSS, reducedMotion } from './skin.js';

const CSS = `
:host {
  display: block;
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

  const pill = document.createElement('div');
  pill.className = 'pill';

  let rendered = '';
  let placed = null;
  let needsPlace = false;

  // One highlight slides between tabs. Gmail gives every view its own toolbar, so the bar is re-parented on each
  // switch, which resets CSS transitions; the slide is animated from the last measured place instead.
  function place() {
    needsPlace = false;
    const tab = bar.querySelector('[aria-selected="true"]');
    if (!tab || !host.classList.contains(SKIN_CLASS)) {
      placed = null;
      return;
    }
    const next = { transform: `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`, width: `${tab.offsetWidth}px` };
    if (placed?.transform === next.transform && placed.width === next.width) return;
    Object.assign(pill.style, next, { height: `${tab.offsetHeight}px` });
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
      bar.replaceChildren(
        pill,
        ...splits.map((split, i) => {
          const tab = document.createElement('button');
          tab.className = 'tab';
          tab.type = 'button';
          tab.tabIndex = -1;
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
    },
    // Idempotent: Gmail re-renders constantly and this runs on every settled mutation batch.
    mountBefore(anchor) {
      if (host.parentNode !== anchor.parentNode || host.nextSibling !== anchor) {
        anchor.parentNode.insertBefore(host, anchor);
        needsPlace = true;
      }
      if (needsPlace) place();
    },
    unmount() {
      host.remove();
    },
  };
}
