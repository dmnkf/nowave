// Presentation data and simulated Gmail controls. The skin itself is the shipped userscript.
const paths = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  tune: '<path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  inbox: '<path d="M4 4h16l2 12v4H2v-4L4 4Z"/><path d="M2 15h6l2 3h4l2-3h6"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  send: '<path d="m3 3 19 9-19 9 4-9-4-9Zm4 9h15"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h6"/>',
  label: '<path d="M3 3h9l9 9-9 9-9-9V3Z"/><circle cx="8" cy="8" r="1"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  left: '<path d="m14 7-5 5 5 5"/>',
  right: '<path d="m10 7 5 5-5 5"/>',
  back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  box: '<rect x="4" y="4" width="16" height="16" rx="1"/>',
  check: '<rect x="4" y="4" width="16" height="16" rx="1" fill="currentColor"/><path d="m7 12 3 3 7-7" stroke="white"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
  archive: '<path d="M4 7v14h16V7M2 3h20v4H2V3Zm7 8h6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  important: '<path d="M4 6h11l6 6-6 6H4l5-6-5-6Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 4 3c-1 .5-1 1-1 2m0 3h.01"/>',
  settings: '<path d="m9 3-.5 3-2 1-3-.5-2 3 2 2v2l-2 2 2 3 3-.5 2 1 .5 3h4l.5-3 2-1 3 .5 2-3-2-2v-2l2-2-2-3-3 .5-2-1-.5-3H9Z"/><circle cx="11" cy="12" r="3"/>',
  apps: '<path d="M4 4h2v2H4V4Zm7 0h2v2h-2V4Zm7 0h2v2h-2V4ZM4 11h2v2H4v-2Zm7 0h2v2h-2v-2Zm7 0h2v2h-2v-2ZM4 18h2v2H4v-2Zm7 0h2v2h-2v-2Zm7 0h2v2h-2v-2Z" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-14 4h2m3 0h2m3 0h1m-11 3h2m3 0h2"/>',
  note: '<path d="M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4"/>',
  task: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-18a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 5v2"/>',
  clip: '<path d="m8 12 7-7a4 4 0 0 1 6 6L10 22a6 6 0 0 1-8-8L13 3m-7 13 10-10"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = (name, filled = false) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.mail}</svg>`;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const stylesheet = document.createElement('link');
stylesheet.rel = 'stylesheet';
stylesheet.href = '/dev/preview.css';
document.head.append(stylesheet);
const native = new URLSearchParams(location.search).get('skin') === 'native';
document.documentElement.classList.toggle('native-demo', native);
document.title = native ? 'Gmail-style baseline — demo' : 'Gmail with Nowave — demo';

let toastTimer;
function toast(message) {
  $('.demo-toast')?.remove();
  clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.className = 'demo-toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), 3200);
}
function decorate(button, name, label, handler) {
  button.innerHTML = icon(name);
  button.setAttribute('aria-label', label);
  button.title = label;
  if (handler) button.onclick = handler;
  return button;
}
function control(name, label, handler) {
  return decorate(document.createElement('button'), name, label, handler);
}

const menu = $('header [aria-label="Main menu"]');
decorate(menu, 'menu', 'Main menu');
menu.setAttribute('aria-expanded', String(native));
$('nav.aeN').classList.toggle('bhZ', !native);
menu.onclick = () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  $('nav.aeN').classList.toggle('bhZ', !expanded);
};
$('header a').innerHTML = '<svg class="gmail-mark" viewBox="0 0 32 24" aria-hidden="true"><path d="M3 21V4l13 10L29 4v17" fill="none" stroke="#4285f4" stroke-width="6"/><path d="m3 4 13 10L29 4" fill="none" stroke="#ea4335" stroke-width="6"/><path d="M29 4v17" stroke="#34a853" stroke-width="6"/><path d="m3 4 4 3" stroke="#c5221f" stroke-width="6"/><path d="m25 7 4-3" stroke="#fbbc04" stroke-width="6"/></svg>Gmail';
$('header form').insertAdjacentHTML('afterbegin', icon('search'));
$('header form').append(control('tune', 'Show search options', () => toast('Demo: search options. No Gmail account is connected.')));
$('header form').insertAdjacentHTML('afterend', '<span class="header-spacer"></span>');
decorate($('header [aria-label="Settings"]'), 'settings', 'Settings', () => location.hash = '#settings/general');
decorate($('#gbwa'), 'apps', 'Google apps', () => toast('Demo only — Google apps would open here.'));
decorate($('header [aria-label="Help"]'), 'help', 'Help', () => toast('Try the surface controls above, or open the command palette.'));
$('header > div').insertAdjacentHTML('beforeend', '<button aria-label="Google account: demo user" title="Demo account"><span class="avatar">D</span></button>');

const nav = $('nav.aeN');
const navItems = [
  ['Inbox', 'inbox', '#inbox', '12'], ['Starred', 'star', '#starred'], ['Snoozed', 'clock', '#snoozed'],
  ['Sent', 'send', '#sent'], ['Drafts', 'file', '#drafts', '2'], ['More', 'chevron', '#all'],
];
for (const item of $$('.TO')) item.remove();
for (const [name, glyph, hash, count] of navItems) {
  nav.insertAdjacentHTML('beforeend', `<div class="TO"><a href="${hash}" aria-label="${name}" ${name === 'Inbox' ? 'aria-current="page"' : ''} title="${name}">${icon(glyph)}<span class="nav-label">${name}</span></a>${count ? `<span class="bsU">${count}</span>` : ''}</div>`);
}
nav.insertAdjacentHTML('beforeend', '<div class="nav-heading">Labels<span>+</span></div>');
for (const [name, color] of [['Work', '#79a586'], ['Personal', '#bca1d1'], ['Receipts', '#d7b47c']]) {
  nav.insertAdjacentHTML('beforeend', `<div class="TO"><a href="#label/${name}" aria-label="${name}" title="${name}"><span style="color:${color}">${icon('label')}</span><span class="nav-label">${name}</span></a></div>`);
}
nav.insertAdjacentHTML('beforeend', '<div class="storage"><progress max="100" value="24"></progress>3.6 GB of 15 GB used</div>');

const toolbar = $('#list-view [gh="mtb"]');
decorate($('#select-all'), 'box', 'Select all');
toolbar.append(control('chevron', 'Select options', () => toast('Click the checkbox to select all demo conversations.')));
decorate(toolbar.children[1], 'refresh', 'Refresh', () => toast('You’re up to date. This inbox contains demo mail.'));
decorate(toolbar.children[2], 'archive', 'Archive', () => toast('Demo only — no messages were archived.'));
decorate(toolbar.children[3], 'more', 'More', () => $('#label-menu').hidden = !$('#label-menu').hidden);
toolbar.children[1].before(toolbar.lastChild);
const divider = document.createElement('span');
divider.className = 'toolbar-divider';
toolbar.children[3].after(divider);
divider.after(control('trash', 'Delete', () => toast('Demo only — no messages were deleted.')), control('mail', 'Mark unread', () => toast('Demo only — message state was not changed.')), control('clock', 'Snooze', () => toast('Demo only — no messages were snoozed.')));
const pagination = document.createElement('div');
pagination.className = 'toolbar-pagination';
pagination.innerHTML = '<span>1–16 of 16</span>';
pagination.append(control('left', 'Previous page'), control('right', 'Next page'));
toolbar.append(pagination);

const rows = [
  ['Maya Chen', 'Friday’s design review', 'A few thoughts on the new inbox. The latest explorations are attached below.', '10:42 AM', true, true, 'Work'],
  ['Alex Morgan', 'Coffee next week?', 'Hey! I’m going to be in Zurich on Tuesday. Would love to catch up.', '10:15 AM', false, true, 'Personal'],
  ['Linear', 'Your team’s weekly digest', '12 issues completed, 3 projects moved forward. Here’s what happened.', '9:48 AM', true, true, 'Work'],
  ['Figma', 'Sarah left a comment in Nowave', '“Love the direction. What if we gave the reading pane a little more room?”', '9:32 AM', true, false, 'Work'],
  ['GitHub', 'Your pull request is ready to review', 'All checks passed. The latest changes are ready for your team.', '9:16 AM', true, false, ''],
  ['Notion', 'Product sync · meeting notes', 'Launch checklist, docs review, and the few things we still need to decide.', '8:54 AM', false, false, 'Work'],
  ['Stripe', 'Your receipt from Acme', 'Your payment of $24.00 was successful. Thank you for your business.', '8:30 AM', false, false, 'Receipts'],
  ['Daniel from Read.cv', 'Something good to read this weekend', 'A collection of small, thoughtful things from people building on the internet.', 'Yesterday', false, false, ''],
  ['Google Calendar', 'Invitation: Design review', 'Thursday, 29 October · 2:00–2:45 PM · Join with Google Meet.', 'Yesterday', false, false, 'Work'],
  ['Sarah Williams', 'Re: The little details', 'Agreed. The best interfaces get out of your way. Let’s keep pushing on this.', 'Yesterday', true, false, ''],
  ['Dropbox', 'Alex shared the Q4 roadmap', 'There are six new files in the shared folder. Take a look when you have a moment.', 'Oct 26', false, false, 'Work'],
  ['Airbnb', 'Your trip to Copenhagen', 'Everything you need for a smooth arrival. Your host has shared a few local tips.', 'Oct 26', false, false, 'Personal'],
  ['The Browser', 'Five stories for a slower Sunday', 'On attention, beautiful software, and knowing when to stop adding features.', 'Oct 25', false, false, ''],
  ['Vercel', 'Deployment successful', 'Your project has been successfully deployed to production.', 'Oct 25', false, false, ''],
  ['Milan at Framer', 'A small update, a big difference', 'Introducing a better way to organize the things you’re working on.', 'Oct 24', false, false, ''],
  ['Readwise', 'Your daily highlights', '“Simplicity boils down to two steps: identify the essential. Eliminate the rest.”', 'Oct 24', false, false, ''],
];
const template = $('#read-row').cloneNode(true);
const list = $('.Cp');
list.replaceChildren();
for (const [title, starred] of [['Starred', true], ['Everything else', false]]) {
  const heading = document.createElement('h3');
  heading.className = 'Wr';
  heading.innerHTML = `${icon('chevron')}<span class="qh">${title}</span>`;
  const table = document.createElement('table');
  const body = document.createElement('tbody');
  table.append(body);
  list.append(heading, table);
  for (const [from, subject, snippet, date, unread, isStarred, label] of rows.filter(row => row[5] === starred)) {
    const row = template.cloneNode(true);
    row.removeAttribute('id');
    row.className = `zA ${unread ? 'zE' : 'yO'}${from === 'Maya Chen' ? ' btb' : ''}`;
    row.dataset.label = label;
    row.querySelector('.yW').textContent = from;
    row.querySelector('.bog').textContent = subject;
    row.querySelector('.y2').textContent = `— ${snippet}`;
    row.querySelector('.xW').textContent = date;
    if (label) {
      const chip = document.createElement('span');
      chip.className = 'at';
      chip.style.cssText = `background:${label === 'Work' ? '#e2ede5' : label === 'Personal' ? '#eee6f4' : '#f5ecd8'};color:${label === 'Work' ? '#4c7658' : label === 'Personal' ? '#87669e' : '#987b3f'}`;
      chip.innerHTML = `<span class="av">${label}</span>`;
      row.querySelector('.a4W').prepend(chip);
    }
    for (const box of row.querySelectorAll('[role="checkbox"]')) {
      const star = Boolean(box.closest('.apU'));
      box.setAttribute('aria-label', `${star ? 'Star' : 'Select'} ${from}`);
      box.setAttribute('aria-checked', String(star && isStarred));
      const draw = () => box.innerHTML = icon(star ? 'star' : box.getAttribute('aria-checked') === 'true' ? 'check' : 'box', star && box.getAttribute('aria-checked') === 'true');
      draw();
      box.onclick = () => { box.setAttribute('aria-checked', String(box.getAttribute('aria-checked') !== 'true')); draw(); };
      box.onkeydown = e => { if (e.key === ' ') { e.preventDefault(); box.click(); } };
    }
    decorate(row.querySelector('.WA button'), 'important', 'Mark important', () => toast('Demo importance marker.'));
    decorate(row.querySelector('.bq4 button'), 'clock', 'Snooze', () => toast('Demo only — no messages were snoozed.'));
    row.onclick = e => { if (!e.target.closest('[role="checkbox"], button')) show('thread'); };
    body.append(row);
  }
}
list.insertAdjacentHTML('beforeend', '<div class="inbox-footer"><span>3.6 GB of 15 GB used</span><span>Last account activity: 2 minutes ago</span></div>');
$('#select-all').onclick = () => {
  const boxes = $$('td.oZ-x3 [role="checkbox"]');
  const checked = boxes.some(box => box.getAttribute('aria-checked') !== 'true');
  for (const box of boxes) if ((box.getAttribute('aria-checked') === 'true') !== checked) box.click();
};

const panel = $('[role="complementary"]');
panel.replaceChildren();
for (const [name, label, color] of [['calendar', 'Calendar', '#4285f4'], ['note', 'Keep', '#e6ac24'], ['task', 'Tasks', '#4285f4'], ['people', 'Contacts', '#5b7cce']]) {
  const button = control(name, label, () => toast(`Demo: ${label} side panel.`));
  button.style.color = color;
  panel.append(button);
}
panel.append(document.createElement('hr'), control('plus', 'Add-ons', () => toast('No add-ons are connected in this demo.')));

const thread = $('#thread-view');
const threadToolbar = thread.querySelector('[gh="mtb"]');
for (const [index, name, label] of [[0, 'back', 'Back to inbox'], [1, 'archive', 'Archive'], [2, 'trash', 'Delete']]) {
  decorate(threadToolbar.children[index], name, label, () => index === 0 ? show('inbox') : toast(`Demo only — no messages were ${label === 'Archive' ? 'archived' : 'deleted'}.`));
}
thread.querySelector('.hP').textContent = 'Friday’s design review';
thread.querySelector('.gE').outerHTML = `<div class="message-heading"><div class="message-avatar">MC</div><div class="message-meta"><span class="gD">Maya Chen</span><small> &lt;maya@example.com&gt;</small><br><small>to me ${icon('chevron')}</small></div><small class="gH">10:42 AM</small>${icon('star')}${icon('more')}</div>`;
const message = $('#message-body');
message.removeAttribute('style');
message.classList.add('message-text');
message.innerHTML = '<p>Hey Dominik,</p><p>I’ve been thinking about our conversation yesterday. The inbox should feel like a quiet workspace, not another thing asking for your attention.</p><p>A few directions for Friday:</p><p>• More room for the conversation.<br>• Keep the controls we actually need.<br>• Make the small interactions feel effortless.</p><p>I’ve attached the latest explorations. Would love your thoughts on the reading pane in particular.</p><p><a href="#inbox">View the explorations in Figma ↗</a></p><p>Thanks,<br>Maya</p>';
message.insertAdjacentHTML('afterend', `<div class="attachment">${icon('file')}<div>Inbox explorations.pdf<small>2.4 MB · PDF document</small></div>${icon('chevron')}</div>`);
const reply = thread.querySelector('[g_editable]');
reply.removeAttribute('style');
reply.textContent = 'Click here to reply…';
thread.querySelector('.ip button').textContent = 'Reply';
const paneMessage = thread.querySelector('.a98').cloneNode(true);
for (const node of paneMessage.querySelectorAll('[id]')) node.removeAttribute('id');
$('.Nu.S3').replaceChildren(paneMessage);
$('#compose [g_editable]').style.cssText = 'font: 14px/1.8 Arial, sans-serif; color: #36383d';
$('#compose [g_editable]').innerHTML = 'Hey Maya,<br><br>Love where this is going. A few thoughts on the reading pane…<br><br>Dominik';
$('#compose [aria-label="Recipients"]').value = 'Maya Chen <maya@example.com>';
$('#compose [name="subjectbox"]').value = 'Re: Friday’s design review';
decorate($('#close-compose'), 'close', 'Close draft');
decorate($('.compose-actions button:nth-child(2)'), 'clip', 'Attach files', () => toast('Demo only — no files will be uploaded.'));
decorate($('.compose-actions button:last-child'), 'trash', 'Discard', () => $('#compose').hidden = true);
$('.compose-actions button:first-child').onclick = () => toast('Demo only — nothing was sent.');

function press(key, code, ctrlKey = false) {
  for (const type of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(type, { key, code, ctrlKey, bubbles: true, cancelable: true }));
}
function show(view) {
  press('Escape', 'Escape');
  $('#label-menu').hidden = true;
  $('#compose').hidden = view !== 'compose';
  $('[gh="tl"]').classList.toggle('Nm', view === 'reading');
  location.hash = view === 'thread' ? '#inbox/1234567890abcdef' : '#inbox';
  if (view === 'palette') {
    if (native) toast('The command palette is a Nowave feature. Switch to “With Nowave” above.');
    else press('k', 'KeyK', true);
  }
}
addEventListener('message', e => {
  if (e.origin === location.origin && e.source === parent && e.data?.type === 'nowave-demo') show(e.data.view);
});
