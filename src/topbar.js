import { TOPBAR_CSS } from './skin.js';

const SVG = 'http://www.w3.org/2000/svg';

// 20 px line icons, drawn with currentColor.
const ICONS = {
  inbox: ['M3 11.5 5.3 4.7A1 1 0 0 1 6.2 4h7.6a1 1 0 0 1 .9.7L17 11.5V15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z', 'M3 11.5h4l1 2h4l1-2h4'],
  star: ['m10 3 2.1 4.4 4.9.7-3.5 3.4.8 4.8L10 14l-4.3 2.3.8-4.8L3 8.1l4.9-.7z'],
  clock: ['M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14', 'M10 6.5V10l2.5 1.5'],
  send: ['M3.5 9.6 16.5 3.5l-4.6 13-2.6-5.3z', 'M9.3 11.2 16.5 3.5'],
  draft: ['M5 3.5h6.5L15 7v9.5H5z', 'M11.5 3.5V7H15'],
  done: ['m4 10.5 3.5 3.5L16 5.5'],
  label: ['M3.5 3.5h6.3l6.7 6.7-6.3 6.3-6.7-6.7z', 'M7.3 7.3h.01'],
  search: ['M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12', 'm13.5 13.5 3.5 3.5'],
  spam: ['M10 3 17 16H3z', 'M10 8.5v3.5', 'M10 14.2h.01'],
  trash: ['M4 6h12', 'M8 6V4h4v2', 'M5.5 6l.7 10h7.6l.7-10'],
  settings: ['M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5', 'M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4'],
  chevron: ['m6 8 4 4 4-4'],
  compose: ['M12.6 4.4 15.6 7.4 7 16H4v-3z', 'M10.8 6.2l3 3'],
};

function icon(name, className) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  for (const d of ICONS[name] ?? ICONS.inbox) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function button(className, label) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.setAttribute('aria-label', label);
  // Keep focus where Gmail had it, so the keys and Gmail's compose shortcut still reach Gmail after a click.
  el.addEventListener('mousedown', (e) => e.preventDefault());
  return el;
}

// Shortwave's header controls that Gmail has no equivalent for: the folder switcher and the Compose button.
// A fixed layer over Gmail's header, never inside it.
export function createTopbar({ onSwitch, onCompose }) {
  const host = document.createElement('div');
  host.id = 'nowave-topbar';
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = TOPBAR_CSS;

  const switcher = button('switcher', 'Go to');
  const name = document.createElement('span');
  name.className = 'name';
  switcher.append(icon('inbox', 'icon'), name, icon('chevron', 'chevron'));
  switcher.addEventListener('click', () => onSwitch());

  const compose = button('compose', 'Compose');
  const composeLabel = document.createElement('span');
  composeLabel.textContent = 'Compose';
  compose.append(icon('compose', 'icon'), composeLabel);
  compose.addEventListener('click', () => onCompose());

  root.append(style, switcher, compose);

  let rendered = '';

  return {
    // view: { name, icon } from viewOf().
    render(view) {
      const key = `${view.icon}\n${view.name}`;
      if (key !== rendered) {
        rendered = key;
        switcher.firstChild.replaceWith(icon(view.icon, 'icon'));
        name.textContent = view.name;
      }
      if (!host.isConnected) document.body.append(host);
    },
    unmount() {
      host.remove();
    },
  };
}
