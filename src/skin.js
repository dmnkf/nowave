// The Shortwave look: Gmail restyled, scoped under html.nowave-skin. Every selector it relies on is here
// and listed in docs/gmail-contract.md.

export const SKIN_CLASS = 'nowave-skin';

const S = `html.${SKIN_CLASS}`;

const SELECTORS = {
  mainMenu: 'header#gb div[role="button"][aria-expanded]',
  appReady: '[role="main"]',
  toolbar: '[gh="tm"]',
  inboxLink: '[role="navigation"] a[href$="#inbox"]',
  navItem: '.TO',
  navCount: '.bsU',
  threadId: '[data-thread-id]',
  subject: 'h2.hP',
  view: '[role="main"]',
  nav: '[role="navigation"].aeN',
};

// Gmail's nav while folded into the icon rail.
const RAIL_CLASS = 'bhZ';
// The pointer resting on the rail makes Gmail expand the nav over the list: bym while open, aaj while opening, bjB
// while closing. Every rail style of Gmail's hangs on .bhZ:not(.bym).
const HOVER_EXPAND_CLASSES = ['bym', 'aaj', 'bjB'];

// The thread list while Gmail's vertical split pane is on: rows, a .Nt divider and the .Nu.S3 pane.
const SPLIT = `${S} [gh="tl"].Nm`;

// An attribute, not a class: Gmail rewrites a row's className when its checked state changes.
const LEAVING_ATTR = 'data-nowave-leaving';
const LEAVE_MS = 140;

export const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const SKIN_CSS = `
${S} {
  --nw-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", Roboto, sans-serif;
  --nw-text: #1c1d1f;
  --nw-surface: #ffffff;
  --nw-secondary: #5f636b;
  --nw-tertiary: #6b7280;
  --nw-hairline: rgba(0, 0, 0, 0.06);
  --nw-chrome: #f7f7f8;
  --nw-accent: #3d63f2;
  --nw-wash: #eef2fe;
  --nw-hover: #f5f6f8;
  --nw-selected: #e2e8fd;
  --nw-ease: ${EASE};
  color-scheme: light;
}
${S} body,
${S} .wl { background: var(--nw-chrome) !important; }
${S} .bkK { margin-right: 8px; }
${S} .bkK > .nH {
  border-radius: 12px;
  background: var(--nw-surface);
  box-shadow: 0 0 0 1px var(--nw-hairline);
}

${S} header#gb { min-height: 52px; height: auto; }
${S} header#gb > div:has([role="search"]) { height: 52px; padding-block: 0; align-items: center; }
${S} header#gb div:has(> div[role="button"][aria-expanded]) { flex: none !important; min-width: 0 !important; }
${S} header#gb a[href$="#inbox"] {
  display: none !important;
}
${S} header#gb form[role="search"] {
  max-width: 560px;
  height: 36px;
  min-height: 0;
  margin: 6px 0 6px 4px;
  border: 0;
  border-radius: 10px;
  background: #eceef1;
  box-shadow: none;
}
${S} header#gb form[role="search"] > :is(div, button) { height: 36px; }
${S} header#gb form[role="search"] input { font: 14px var(--nw-font); color: var(--nw-text); }
${S} header#gb form[role="search"]:focus-within {
  background: var(--nw-surface);
  box-shadow: 0 0 0 2px var(--nw-accent);
}
${S} header#gb a[href*="accounts.google.com/SignOutOptions"] { transform: scale(0.8); }

${S} [role="navigation"].aeN {
  background: var(--nw-chrome);
  box-shadow: inset -1px 0 var(--nw-hairline);
}
${S} [role="navigation"] .TO { border-radius: 8px; }
${S} [role="navigation"] .TO a { font-family: var(--nw-font); }
${S} [role="navigation"] .TO:hover { background: var(--nw-hover); }
${S} [role="navigation"] .TO:has(a[aria-current="page"]) { background: var(--nw-wash); }
${S} [role="navigation"] .bsU { font: 500 11px var(--nw-font); color: var(--nw-secondary); }
${S} [gh="cm"] {
  interpolate-size: allow-keywords;
  box-sizing: border-box;
  width: fit-content !important;
  min-width: 0 !important;
  height: 40px !important;
  margin: 4px 0 12px 12px !important;
  padding: 0 16px 0 14px !important;
  justify-content: flex-start;
  overflow: hidden;
  white-space: nowrap;
  border-radius: 10px !important;
  background: var(--nw-surface);
  color: var(--nw-text);
  font: 500 14px/20px var(--nw-font) !important;
  box-shadow: 0 0 0 1px var(--nw-hairline), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: width 160ms var(--nw-ease), padding 160ms var(--nw-ease), background-color 80ms var(--nw-ease);
}
${S} [gh="cm"]::before {
  flex: none;
  width: 20px !important;
  min-width: 0 !important;
  height: 20px !important;
  margin: 0 10px 0 0 !important;
  background-size: 20px auto !important;
  background-position: center !important;
}
${S} ${SELECTORS.nav}.${RAIL_CLASS} [gh="cm"] { width: 40px !important; padding: 0 10px !important; }
${S} [gh="cm"]:hover { background: var(--nw-hover); }

${S} ${SELECTORS.toolbar} { min-height: 44px; background: var(--nw-surface); }
${S} #nowave-splits { min-width: 0; padding: 8px 12px; background: var(--nw-surface); }

${S} tr.zA > td.PF { display: none !important; }
${S} tr.zA > :is(td.oZ-x3, td.apU, td.WA) { opacity: 0.6; }
${S} tr.zA:is(:hover, :focus-within, .x7) > :is(td.oZ-x3, td.apU, td.WA),
${S} tr.zA > :is(td.oZ-x3, td.apU, td.WA):has([aria-checked="true"]) { opacity: 1; }
${S} tr.zA {
  margin-inline: 8px;
  border-radius: 8px;
  background: transparent !important;
  box-shadow: none !important;
  font: 14px var(--nw-font);
  transition: background-color 80ms var(--nw-ease), opacity ${LEAVE_MS}ms var(--nw-ease),
    transform ${LEAVE_MS}ms var(--nw-ease);
}
${S} tr.zA[${LEAVING_ATTR}] { opacity: 0; transform: translateX(12px); }
@media (prefers-reduced-motion: reduce) {
  ${S} tr.zA[${LEAVING_ATTR}] { transform: none; }
}
${S} tr.zA > td:not(.bq4),
${S} tr.zA > td:not(.bq4) * { font-family: var(--nw-font) !important; }
${S} tr.zA > td.yX { padding-left: 12px; }
${S} tr.zA:hover { background: var(--nw-hover) !important; }
${S} tr.zA:has(td.oZ-x3 [role="checkbox"][aria-checked="true"]) { background: var(--nw-selected) !important; }
${S} tr.zA.btb {
  background: var(--nw-wash) !important;
  box-shadow: inset 3px 0 var(--nw-accent) !important;
}
${S} ${SELECTORS.subject} { font: 600 22px/1.3 var(--nw-font) !important; color: var(--nw-text); }
${S} h3.Wr { min-height: 0 !important; height: 28px !important; padding: 12px 0 0 12px !important; }
${S} h3.Wr .qh {
  font: 600 11px/16px var(--nw-font) !important;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--nw-tertiary) !important;
}
${S} h3.Wr img.qi { opacity: 0.4; transform: scale(0.75); }
${S} .Wg .Dj,
${S} .Wg .Dj * { font: 500 11px/16px var(--nw-font) !important; color: var(--nw-tertiary) !important; }
${S} tr.zA :is(td.yX, .bog),
${S} tr.zA :is(td.yX, .bog) * { font-weight: 400 !important; color: var(--nw-text) !important; }
${S} tr.zA.yO .bog,
${S} tr.zA.yO .bog * { color: var(--nw-secondary) !important; }
${S} tr.zA.zE :is(td.yX, .bog, td.xW),
${S} tr.zA.zE :is(td.yX, .bog, td.xW) * { font-weight: 600 !important; color: var(--nw-text) !important; }
${S} tr.zA .y2,
${S} tr.zA .y2 * { color: var(--nw-tertiary) !important; }
${S} tr.zA td.xW * { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--nw-secondary); }
${S} tr.zA .at { border-radius: 4px; }
${S} tr.zA .at .av { font-size: 11px; font-weight: 500; }

${S} .adn .gE { font-family: var(--nw-font); color: var(--nw-secondary); }
${S} .adn .gD { font-family: var(--nw-font); color: var(--nw-text); }
${S} .adn .gH { color: var(--nw-secondary); }

${S} .AD:has([g_editable="true"]) .M9 {
  border-radius: 12px 12px 0 0;
  background: var(--nw-surface);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
}
${S} .AD:has([g_editable="true"]) .aYF {
  background: var(--nw-chrome);
  color: var(--nw-text);
  font-family: var(--nw-font);
}
${S} .AD input[name="subjectbox"] {
  color: var(--nw-text);
  font: 500 14px var(--nw-font);
}
${S} .J-M,
${S} .Kj-JD {
  border: 1px solid var(--nw-hairline);
  border-radius: 12px;
  background: var(--nw-surface);
  color: var(--nw-text);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
  font-family: var(--nw-font);
}
${S} .J-M .J-N { border-radius: 6px; }
${S} .J-M .J-N:is(:hover, .J-N-JT) { background: var(--nw-wash); }
${S} :is([gh="cm"], [gh="tm"] [role="button"], .TO a):focus-visible {
  outline: 2px solid var(--nw-accent);
  outline-offset: -2px;
}

${SPLIT} > .Nt {
  border-color: transparent !important;
  background: linear-gradient(var(--nw-hairline), var(--nw-hairline)) center / 1px 100% no-repeat !important;
}
${SPLIT} > .Nu.S3 :is(.apc, .apO) { display: none !important; }
${SPLIT} > .Nu.S3 .aia > :has(.apb) { flex: 1; }
${SPLIT} > .Nu.S3 .apb {
  padding: clamp(24px, 20vh, 180px) 16px 24px;
  text-align: center;
  font: 14px var(--nw-font);
  color: var(--nw-tertiary);
}
${SPLIT} > .Nu.S3 .a98 { padding: 12px 28px 32px 12px !important; }
${SPLIT} tr.zA { flex-wrap: wrap; height: auto !important; padding-block: 8px !important; row-gap: 2px; }
${SPLIT} tr.zA > td.yX { margin-right: auto; }
${SPLIT} tr.zA > :is(td.yf, td.xW, td.bq4) { order: 2; }
${SPLIT} tr.zA > td.a4W { order: 3; flex: 0 0 100% !important; box-sizing: border-box; padding-left: 12px; }
@media (max-width: 900px) {
  ${S} .bkK { margin-right: 4px; }
  ${S} #nowave-splits { padding-inline: 8px; }
  ${S} header#gb form[role="search"] { width: auto; min-width: 0; }
  ${SPLIT} > .Nu.S3 .a98 { padding-inline: 12px !important; }
}
@media (prefers-reduced-motion: reduce) {
  ${S} tr.zA, ${S} [gh="cm"] { transition: none; }
}
`;

// Inside the split bar's shadow root, applied while its host has the skin class.
export const SPLIT_PILLS_CSS = `
:host(.${SKIN_CLASS}) .bar {
  position: relative;
  gap: 2px;
  height: 32px;
  padding: 0;
  border: 0;
  align-items: center;
  color: var(--nw-text);
  font: 500 14px var(--nw-font);
}
:host(.${SKIN_CLASS}) .tab {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 5px 10px;
  border: 0;
  border-radius: 8px;
  opacity: 1;
  color: var(--nw-secondary);
  line-height: 20px;
  transition: color 80ms var(--nw-ease);
}
:host(.${SKIN_CLASS}) .tab:hover,
:host(.${SKIN_CLASS}) .tab[aria-selected="true"] { color: var(--nw-text); }
:host(.${SKIN_CLASS}) .count {
  margin-left: 6px;
  color: var(--nw-tertiary);
  font-variant-numeric: tabular-nums;
}
.pill { display: none; }
:host(.${SKIN_CLASS}) .pill {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 8px;
  background: var(--nw-hairline);
  pointer-events: none;
}
:host(.${SKIN_CLASS}) .pill[hidden] { display: none; }
`;

// Keep the bar outside Gmail's row container and leave the native toolbar intact.
export function listToolbar(list) {
  const view = list.closest(SELECTORS.view) ?? document;
  return [...view.querySelectorAll(SELECTORS.toolbar)].find((el) => el.getClientRects().length > 0) ?? null;
}

export function inboxUnread() {
  const item = document.querySelector(SELECTORS.inboxLink)?.closest(SELECTORS.navItem);
  const count = item?.querySelector(SELECTORS.navCount)?.textContent.trim();
  return count || null;
}

const threadId = (row) => row.querySelector(SELECTORS.threadId)?.getAttribute('data-thread-id') ?? null;

// Rows fade and slide out as Gmail removes them. A row Gmail keeps (an archive it ignores) comes back after a while,
// and so does a row element Gmail reuses for another conversation, at once.
export async function leaveRows(rows) {
  let leaving = rows.map((row) => ({ row, id: threadId(row) }));
  for (const { row } of leaving) row.setAttribute(LEAVING_ATTR, '');
  const deadline = performance.now() + LEAVE_MS + 600;
  while (leaving.length > 0) {
    await nextFrame();
    const expired = performance.now() > deadline;
    leaving = leaving.filter(({ row, id }) => {
      const stays = row.isConnected && !expired && threadId(row) === id;
      if (!stays) row.removeAttribute(LEAVING_ATTR);
      return stays;
    });
  }
}

// The conversation is everything around its subject up to Gmail's view, or up to the list beside a reading pane.
export function shownConversation(list) {
  const subject = [...document.querySelectorAll(SELECTORS.subject)].find((el) => el.getClientRects().length > 0);
  let el = subject;
  while (el?.parentElement && !el.matches(SELECTORS.view) && !(list && el.parentElement.contains(list))) {
    el = el.parentElement;
  }
  return el ?? null;
}

export function enterConversation(el) {
  const from = reducedMotion() ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' };
  el.animate([from, { opacity: 1, transform: 'none' }], { duration: 160, easing: EASE });
}

// 'collapse' | 'expand' | null. nowave folds Gmail's nav into its icon rail once per page load, and unfolds
// it on the way out only if it was nowave that folded it.
export function navToggle({ skin, expanded, collapsedBySkin, clicked }) {
  if (clicked) return null;
  if (skin && expanded) return 'collapse';
  if (!skin && !expanded && collapsedBySkin) return 'expand';
  return null;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export function mainMenu() {
  return document.querySelector(SELECTORS.appReady) ? document.querySelector(SELECTORS.mainMenu) : null;
}

// Shortwave's rail never expands on hover, so while the look is on nowave takes Gmail's hover classes off the folded
// nav as Gmail adds them. A MutationObserver callback runs before the next paint, so the overlay never shows. The
// main menu button still expands the nav, which takes it out of the rail.
export function createRailPin() {
  const observer = new MutationObserver(unexpand);
  let nav = null;

  function unexpand() {
    const hovered = HOVER_EXPAND_CLASSES.filter((c) => nav.classList.contains(c));
    // classList.remove writes the attribute even when nothing changes, which would call this observer again.
    if (nav.classList.contains(RAIL_CLASS) && hovered.length > 0) nav.classList.remove(...hovered);
  }

  return {
    sync(skin) {
      const next = skin ? document.querySelector(SELECTORS.nav) : null;
      if (next === nav) return;
      observer.disconnect();
      nav = next;
      if (!nav) return;
      observer.observe(nav, { attributes: true, attributeFilter: ['class'] });
      unexpand();
    },
  };
}

export const isNavExpanded = (button) => button.getAttribute('aria-expanded') === 'true';

// Resolves true once Gmail shows the new state.
export async function clickMainMenu(button) {
  const before = isNavExpanded(button);
  button.click();
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (isNavExpanded(button) !== before) return true;
    await nextFrame();
  }
  return false;
}
