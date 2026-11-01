import { icon } from './icons.js';
import { TOPBAR_CSS } from './skin.js';

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
