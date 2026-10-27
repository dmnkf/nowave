// Replaces every piece of mail on screen with demo content, for docs/screenshot.png. It needs a "Starred first" inbox
// with the vertical split pane on and no conversation open, and changes only the page's DOM, which Gmail rebuilds on
// the next reload. It sets data-demo-leftover on <html> to the number of shown text nodes in the list that are still
// not demo content, so the run can assert 0 before the shot:
//   npm run build
//   node dev/shot.mjs dist/nowave.user.js "$TMPDIR/shots" '[{"hash":"#inbox"},{"wait":1500},{"evalFile":"dev/demo-inbox.js"},{"assert":"+document.documentElement.dataset.demoLeftover === 0"},{"wait":400},{"shot":"inbox"}]'
//   cp "$TMPDIR/shots/inbox.png" docs/screenshot.png
(() => {
  const STARRED = [
    { from: 'Linear', subject: 'Weekly digest: 12 issues closed', snippet: 'Your team closed 12 issues and opened 4 this week. Cycle 31 ends on Friday.', date: '9:41 AM', unread: true, label: 'Work' },
    { from: 'Figma', subject: 'Comment on Onboarding v3', snippet: 'Maya: Can we try the empty state with the illustration on the left?', date: '8:15 AM', unread: true },
  ];
  const EVERYTHING_ELSE = [
    { from: 'GitHub', subject: '[nowave] CI passed on main', snippet: 'All checks have passed. test (ubuntu-latest) succeeded in 24s.', date: '7:58 AM', unread: true },
    { from: 'Stripe', subject: 'Your receipt from Acme Cloud', snippet: 'Receipt #2041-3317. Amount paid $24.00. Thanks for your business.', date: 'Oct 26', label: 'Receipts' },
    { from: 'Notion', subject: 'Product sync notes', snippet: 'Agenda: launch checklist, docs review, open questions on pricing.', date: 'Oct 26' },
    { from: 'Vercel', subject: 'Deployment ready: nowave-docs', snippet: 'Your deployment is live. Built in 31s with no warnings.', date: 'Oct 25' },
    { from: 'Google Calendar', subject: 'Invitation: Design review @ Thu 2pm', snippet: 'Join with Google Meet. Organizer: Sam Lee.', date: 'Oct 25' },
    { from: 'Ramp', subject: 'Your September statement is ready', snippet: 'Statement period Sep 1 to Sep 30. View it in your dashboard.', date: 'Oct 24' },
    { from: 'Dropbox', subject: 'Alex shared "Q4 roadmap" with you', snippet: 'Open the folder to view 6 files.', date: 'Oct 23', label: 'Team' },
  ];

  const shown = (el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true });
  const list = [...document.querySelectorAll('[gh="tl"]')].find((el) => el.getClientRects().length > 0);

  const leaf = (el) => {
    while (el.firstElementChild && el.firstElementChild.tagName !== 'IMG') el = el.firstElementChild;
    return el;
  };

  // Writes text into the innermost first element of el, where Gmail's styles expect it, and removes everything else.
  function setOnly(el, text) {
    const target = leaf(el);
    target.textContent = text;
    for (const node of [...el.querySelectorAll('*')]) if (!node.contains(target)) node.remove();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const strays = [];
    while (walker.nextNode()) if (!target.contains(walker.currentNode)) strays.push(walker.currentNode);
    for (const node of strays) node.remove();
    return target;
  }

  // Removes everything in el that is neither inside nor around one of the kept elements.
  function keepOnly(el, kept) {
    for (const node of [...el.querySelectorAll('*')]) {
      const related = kept.some((k) => k === node || k.contains(node) || node.contains(k));
      if (!related && node.isConnected) node.remove();
    }
  }

  function fillRow(row, demo) {
    row.classList.toggle('zE', Boolean(demo.unread));
    row.classList.toggle('yO', !demo.unread);

    const sender = setOnly(row.querySelector('td.yX .yW'), demo.from);
    for (const attr of ['email', 'name']) if (sender.hasAttribute(attr)) sender.setAttribute(attr, demo.from);

    const cell = row.querySelector('td.a4W');
    const [chip, ...extraChips] = cell.querySelectorAll('.ar');
    for (const extra of extraChips) extra.remove();
    if (chip && !demo.label) chip.remove();
    keepOnly(cell, [cell.querySelector('.y6'), cell.querySelector('.y2'), ...(chip?.isConnected ? [chip] : [])]);
    if (chip?.isConnected) {
      setOnly(chip.querySelector('.at'), demo.label);
      chip.querySelector('.at').title = demo.label;
    }
    setOnly(cell.querySelector('.bog'), demo.subject);
    const snippet = cell.querySelector('.y2');
    const separator = snippet.querySelector('.Zt');
    snippet.replaceChildren(...(separator ? [separator] : []), demo.snippet);

    const date = row.querySelector('td.xW');
    setOnly(date, demo.date);
    for (const el of date.querySelectorAll('[title], [aria-label]')) {
      el.removeAttribute('title');
      el.removeAttribute('aria-label');
    }
  }

  const sections = [...list.querySelectorAll('table')].filter((t) => t.querySelector('tr.zA'));
  [STARRED, EVERYTHING_ELSE].forEach((demos, s) => {
    const rows = sections[s] ? [...sections[s].querySelectorAll('tr.zA')] : [];
    rows.forEach((row, i) => {
      if (demos[i]) fillRow(row, demos[i]);
      else row.style.display = 'none';
    });
  });

  const ranges = [...list.querySelectorAll('.Wg .Dj')];
  [STARRED, EVERYTHING_ELSE].forEach((demos, s) => {
    if (ranges[s]) ranges[s].textContent = `1–${demos.length} of ${demos.length}`;
  });

  const unread = [...STARRED, ...EVERYTHING_ELSE].filter((d) => d.unread).length;
  for (const count of document.querySelectorAll('[role="navigation"] .bsU')) {
    const inbox = count.closest('.TO')?.querySelector('a[href$="#inbox"]');
    count.textContent = inbox ? String(unread) : '';
  }

  // Gmail's toasts, such as its offer to enable desktop notifications.
  for (const alert of document.querySelectorAll('[role="alert"]')) alert.style.visibility = 'hidden';

  const search = document.querySelector('header form[role="search"] input');
  if (search) search.value = '';

  const demoText = [...STARRED, ...EVERYTHING_ELSE].flatMap((d) => [d.from, d.subject, d.snippet, d.date, d.label]);
  const allowed = new Set([...demoText, 'Starred', 'Everything else', 'No conversations selected'].filter(Boolean));
  for (const range of ranges) allowed.add(range.textContent);
  const walker = document.createTreeWalker(list, NodeFilter.SHOW_TEXT);
  let leftover = 0;
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.replace(/^[\s -]+|[\s -]+$/g, '');
    if (text !== '' && !allowed.has(text) && shown(walker.currentNode.parentElement)) leftover++;
  }
  document.documentElement.dataset.demoLeftover = String(leftover);
  return leftover;
})();
