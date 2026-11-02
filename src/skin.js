// The Shortwave look: Gmail restyled, scoped under html.nowave-skin. Every selector it relies on is here
// and listed in docs/gmail-contract.md.

export const SKIN_CLASS = 'nowave-skin';

const S = `html.${SKIN_CLASS}`;

const SELECTORS = {
  mainMenu: 'header#gb div[role="button"][aria-expanded]',
  appReady: '[role="main"]',
  toolbar: '[gh="tm"]',
  toolbarActions: '[gh="mtb"]',
  inboxLink: '[role="navigation"] a[href$="#inbox"]',
  navItem: '.TO',
  navCount: '.bsU',
  threadId: '[data-thread-id]',
  subject: 'h2.hP',
  view: '[role="main"]',
  nav: '[role="navigation"].aeN',
  mainMenuBox: 'header#gb div:has(> div[role="button"][aria-expanded])',
  logo: 'header#gb a[href$="#inbox"]',
  support: 'header#gb .zo',
  apps: 'header#gb div:has(> div > a[href*="/about/products"])',
  searchOptions: '[gh="sda"]',
  account: 'header#gb a[href*="accounts.google.com/SignOutOptions"]',
  settings: 'header#gb .FI',
  card: '.bkK',
  sidePanelColumn: '.aqk > div:has(> .aUx)',
  quickSettings: '.IU[role="menu"]',
};

// Shortwave's empty left gutter and its right icon column.
const HEADER_SIDE = 48;

// The thread list while Gmail's vertical split pane is on: rows, a .Nt divider and the .Nu.S3 pane. Like Shortwave,
// the list keeps the full width until a conversation opens, then narrows to a column beside it.
const SPLIT = `${S} [gh="tl"].Nm`;
const SPLIT_EMPTY = `${SPLIT}:has(> .Nu.S3 .apb)`;
const SPLIT_OPEN = `${SPLIT}:not(:has(> .Nu.S3 .apb))`;
// Two-line rows in a narrow list (.Zs), where Gmail's own two-line layout is replaced.
const NARROW_ROW = `${S} .Zs tr.zA`;

// An attribute, not a class: Gmail rewrites a row's className when its checked state changes.
const LEAVING_ATTR = 'data-nowave-leaving';
const LEAVE_MS = 140;

export const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const SKIN_CSS = `
${S} {
  --nw-font: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --nw-page: rgb(229, 233, 243);
  --nw-card: rgb(252, 252, 254);
  --nw-surface: #ffffff;
  --nw-field: #ffffff;
  --nw-text: rgba(5, 3, 17, 0.87);
  --nw-sender: rgba(5, 3, 17, 0.87);
  --nw-secondary: rgba(5, 3, 17, 0.54);
  --nw-tertiary: rgba(5, 3, 17, 0.45);
  --nw-subject: rgba(5, 0, 26, 0.75);
  --nw-snippet: rgba(5, 0, 26, 0.45);
  --nw-strong: rgba(5, 0, 26, 0.87);
  --nw-border: rgba(5, 3, 17, 0.2);
  --nw-rule: rgb(225, 224, 227);
  --nw-fill: rgba(5, 3, 17, 0.08);
  --nw-hairline: rgba(5, 3, 17, 0.08);
  --nw-chrome: rgb(242, 244, 247);
  --nw-accent: rgb(53, 106, 255);
  --nw-accent-text: rgb(39, 91, 255);
  --nw-accent-fill: rgba(53, 106, 255, 0.08);
  --nw-wash: rgba(53, 106, 255, 0.16);
  --nw-hover: rgb(235, 234, 236);
  --nw-selected: rgb(204, 216, 254);
  --nw-avatar: rgb(240, 241, 245);
  --nw-icon-filter: none;
  --nw-mail-filter: none;
  --nw-scheme: light;
  --nw-ease: ${EASE};
  color-scheme: var(--nw-scheme);
}
@media (prefers-color-scheme: dark) {
  ${S} {
    --nw-page: rgb(10, 10, 14);
    --nw-card: rgb(22, 22, 22);
    --nw-surface: rgb(42, 42, 42);
    --nw-field: transparent;
    --nw-text: rgba(255, 255, 255, 0.9);
    --nw-sender: rgba(255, 255, 255, 0.65);
    --nw-secondary: rgba(255, 255, 255, 0.58);
    --nw-tertiary: rgba(255, 255, 255, 0.36);
    --nw-subject: rgba(255, 255, 255, 0.65);
    --nw-snippet: rgba(255, 255, 255, 0.4);
    --nw-strong: rgba(255, 255, 255, 0.9);
    --nw-border: rgba(255, 255, 255, 0.12);
    --nw-rule: rgb(51, 51, 51);
    --nw-fill: rgba(255, 255, 255, 0.08);
    --nw-hairline: rgba(255, 255, 255, 0.08);
    --nw-chrome: rgb(38, 38, 38);
    --nw-accent-text: rgb(101, 147, 255);
    --nw-accent-fill: rgba(53, 106, 255, 0.12);
    --nw-wash: rgba(53, 106, 255, 0.2);
    --nw-hover: rgb(59, 59, 59);
    --nw-selected: rgb(30, 45, 87);
    --nw-avatar: transparent;
    --nw-icon-filter: invert(1) hue-rotate(180deg);
    --nw-mail-filter: invert(1) hue-rotate(180deg);
    --nw-scheme: dark;
  }
}
${S} body,
${S} .wl { background: var(--nw-page) !important; }

${S} header#gb { height: 48px; min-height: 48px; background: transparent; }
${S} header#gb > div:has(form[role="search"]) { height: 48px; padding-block: 0; }
${S} :is(${SELECTORS.mainMenuBox}, ${SELECTORS.logo}, ${SELECTORS.support}, ${SELECTORS.apps}),
${S} ${SELECTORS.nav} { display: none !important; }
${S} header#gb form[role="search"] {
  anchor-name: --nw-search;
  position: fixed;
  top: 5px;
  left: calc(50% - 200px);
  box-sizing: border-box;
  width: 400px;
  max-width: calc(100vw - 2 * ${HEADER_SIDE}px);
  height: 38px;
  min-height: 38px;
  margin: 0;
  border: 1px solid var(--nw-border);
  border-radius: 8px;
  background: var(--nw-field);
  box-shadow: none;
}
${S} header#gb form[role="search"] > :is(div, button) { height: 36px; }
${S} header#gb form[role="search"] > button:last-of-type { display: grid; place-items: center; width: 36px; padding: 0 0 0 4px; }
${S} header#gb form[role="search"] > button:last-of-type svg { width: 20px; height: 20px; margin: 0; color: var(--nw-secondary); fill: currentColor; }
${S} header#gb form[role="search"] button svg { color: var(--nw-secondary); fill: currentColor; }
${S} header#gb form[role="search"] > [gh="sb"] { margin: 0 40px 0 37px; }
${S} header#gb form[role="search"] input { font: 14px/20px var(--nw-font); color: var(--nw-text); }
${S} header#gb form[role="search"] input::placeholder { color: transparent; }
${S} header#gb form[role="search"]:has(input:placeholder-shown)::after {
  content: "Search emails, contacts, labels...";
  position: absolute;
  top: 8px;
  left: 37px;
  font: 14px/20px var(--nw-font);
  color: var(--nw-tertiary);
  pointer-events: none;
}
${S} header#gb form[role="search"] ${SELECTORS.searchOptions} { opacity: 0; }
${S} header#gb form[role="search"]:is(:hover, :focus-within) ${SELECTORS.searchOptions} { opacity: 1; }
${S} header#gb form[role="search"]:focus-within { border-color: var(--nw-accent); }
${S} .ZF-Av {
  right: auto;
  left: calc(50% - 200px);
  left: anchor(--nw-search left);
  width: 400px;
  width: anchor-size(--nw-search width);
}
${S} ${SELECTORS.account} {
  position: fixed;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
}
${S} ${SELECTORS.account} img { width: 32px !important; height: 32px !important; border-radius: 8px; }
${S} ${SELECTORS.account} > :not(span),
${S} ${SELECTORS.account}::before,
${S} ${SELECTORS.account} > span::after { display: none; }
${S} ${SELECTORS.account} > span { position: absolute; inset: 0; width: 32px; height: 32px; margin: 0; }
${S} ${SELECTORS.settings} {
  position: fixed;
  top: 48px;
  right: 10px;
  width: 28px;
  height: 28px;
  margin: 0;
}
${S} ${SELECTORS.settings} > a,
${S} [role="complementary"] [role="tab"] {
  box-sizing: border-box;
  width: 28px !important;
  height: 28px !important;
  border-radius: 8px;
  color: var(--nw-secondary);
}
${S} ${SELECTORS.settings} > a { display: grid; place-items: center; padding: 0; }
${S} ${SELECTORS.settings} > a:hover,
${S} [role="complementary"] [role="tab"]:hover { background: var(--nw-fill); }
${S} ${SELECTORS.settings} svg { width: 20px; height: 20px; fill: currentColor; }

${S} ${SELECTORS.card} { margin: 0 0 0 ${HEADER_SIDE}px !important; }
${S} ${SELECTORS.card} > .nH {
  min-height: calc(100vh - 48px);
  margin-bottom: 0 !important;
  border-radius: 8px 8px 0 0;
  background: var(--nw-card);
  box-shadow: none;
}
${S} ${SELECTORS.sidePanelColumn} { flex: none; min-width: 0; background: transparent; }
${S} ${SELECTORS.sidePanelColumn}:not(:has(${SELECTORS.quickSettings})) { width: ${HEADER_SIDE}px; }
${S} .aUx > .bAw * { background-color: transparent; }
${S} :is(.aUx:not(:has(> ${SELECTORS.quickSettings})), .aUx > .bAw, [role="complementary"]) {
  width: ${HEADER_SIDE}px !important;
  min-width: 0 !important;
}
${S} .aUx > ${SELECTORS.quickSettings} { border-radius: 8px 0 0 0; background: var(--nw-surface); }
${S} [role="complementary"] { background: transparent !important; }
${S} ${SELECTORS.card} [role="contentinfo"] { display: none !important; }
${S} [role="complementary"] [role="tablist"] { width: ${HEADER_SIDE}px; padding-top: 36px; }
${S} [role="complementary"] [role="tab"] { position: relative; margin: 0 10px 8px; }
${S} [role="complementary"] [role="tab"] > * {
  inset: 0 !important;
  width: 28px !important;
  height: 28px !important;
  background-size: 20px 20px !important;
  filter: grayscale(1) contrast(1.2) opacity(0.62);
}
${S} [role="complementary"] [role="separator"] { width: 28px; margin: 0 10px 8px; }

${S} ${SELECTORS.toolbar} {
  box-sizing: border-box;
  height: auto !important;
  min-height: 48px;
  padding: 0 16px 0 12px !important;
  background: transparent;
}
${S} ${SELECTORS.toolbar} > :has(> #nowave-splits) { align-items: center; height: 48px; padding: 0; margin: 0; }
${S} #nowave-splits { flex: none; min-width: 0; margin: 0 8px 0 0; }
${S} ${SELECTORS.toolbarActions} .G-Ni:is(:has(> [role="button"] [role="checkbox"]), :has(> [act="20"]), :has(> .nf)) {
  display: none;
}
${S} ${SELECTORS.toolbar} :is(.asa, .Cr [role="button"] > *, .aBS [role="button"]) { filter: var(--nw-icon-filter); }
${S} ${SELECTORS.toolbar} .Im [role="button"] {
  border-color: var(--nw-border) !important;
  background: transparent !important;
  color: var(--nw-secondary) !important;
}
${S} ${SELECTORS.toolbar} .Im [role="button"] :is(img, svg, .bxX) { filter: var(--nw-icon-filter); }
${S} ${SELECTORS.toolbar} .Cr button { border: 1px solid var(--nw-border); background: transparent !important; color: var(--nw-secondary); }
${S} ${SELECTORS.toolbar} .Cr button * { color: inherit !important; }
${S} .f2 h2.dt { color: var(--nw-text); }
${S} ${SELECTORS.toolbar} .Cr { opacity: 0.6; }
${S} ${SELECTORS.toolbar} .Cr :is(.Dj, .Dj *) { font: 12px/16px var(--nw-font) !important; color: var(--nw-tertiary); }
${S} ${SELECTORS.toolbar} > [role="toolbar"] { margin: 8px 0 0 4px; padding: 0; font-family: var(--nw-font); }
${S} ${SELECTORS.toolbar} > [role="toolbar"] ~ .aqK { margin-top: 0; }

${S} tr.zA {
  position: relative;
  box-sizing: border-box;
  height: 40px !important;
  margin: 0 !important;
  padding: 0 24px 0 60px !important;
  align-items: center;
  border-radius: 0;
  background: var(--nw-card) !important;
  box-shadow: none !important;
  font: 14px/20px var(--nw-font);
  transition: opacity ${LEAVE_MS}ms var(--nw-ease),
    transform ${LEAVE_MS}ms var(--nw-ease);
}
${S} tr.zA[${LEAVING_ATTR}] { opacity: 0; transform: translateX(12px); }
@media (prefers-reduced-motion: reduce) {
  ${S} tr.zA[${LEAVING_ATTR}] { transform: none; }
}
${S} tr.zA:hover { background: var(--nw-hover) !important; }
${S} tr.zA:has(td.oZ-x3 [aria-checked="true"]) { background: var(--nw-selected) !important; }
${S} tr.zA.btb {
  background: var(--nw-selected) !important;
  box-shadow: inset 3px 0 var(--nw-accent) !important;
}
${S} tr.zA > td:not(.bq4),
${S} tr.zA > td:not(.bq4) * { font-family: var(--nw-font) !important; }
${S} tr.zA > :is(td.PF, td.WA) { display: none !important; }
${S} tr.zA > td { padding: 0 !important; }
${S} tr.zA > td.yX::before,
${S} tr.zA > td.yX .yW span[name]:not(span[name] ~ *)::before {
  content: "";
  position: absolute;
  top: 8px;
  left: 24px;
  box-sizing: border-box;
  width: 24px;
  height: 24px;
  padding-left: 7px;
  overflow: hidden;
  border: 1px solid var(--nw-border);
  border-radius: 6px;
  background: var(--nw-avatar);
  color: var(--nw-secondary);
  font: 600 12px/22px ui-monospace, "SF Mono", Menlo, monospace;
  letter-spacing: 24px;
  text-transform: uppercase;
  white-space: nowrap;
}
${S} tr.zA > td.yX .yW span[name]:not(span[name] ~ *)::before { content: attr(name); }
${S} tr.zA > td.oZ-x3 > :not([role="checkbox"]) { display: none; }
${S} tr.zA > td.oZ-x3 {
  position: absolute !important;
  top: 8px;
  left: 24px;
  z-index: 1;
  display: flex;
  width: 24px !important;
  height: 24px;
  align-items: center;
  justify-content: center;
  visibility: hidden;
}
${S} tr.zA:is(:hover, :has(td.oZ-x3 [aria-checked="true"])) > td.oZ-x3 { visibility: visible; }
${S} tr.zA:is(:hover, :has(td.oZ-x3 [aria-checked="true"])) > td.yX::before,
${S} tr.zA:is(:hover, :has(td.oZ-x3 [aria-checked="true"])) > td.yX .yW span[name]:not(span[name] ~ *)::before {
  visibility: hidden;
}
${S} tr.zA > td.yX { flex: 0 0 249px !important; width: 249px !important; margin: 0 4px 0 0 !important; }
${S} tr.zA > td.a4W { flex: 1 1 0 !important; min-width: 0; }
${S} tr.zA > td.yf { order: 1; width: auto !important; flex: none !important; margin-left: 8px; opacity: 0.55; }
${S} tr.zA > td.yf .yE { display: block !important; filter: var(--nw-icon-filter); }
${S} tr.zA > td.apU { order: 2; width: 20px !important; flex: none !important; margin-left: 8px; }
${S} tr.zA:not(:hover) > td.apU:has(.aXw) { display: none; }
${S} tr.zA > :is(td.byZ, td.xW, td.bq4) { order: 3; }
${S} tr.zA > td.xW { flex: none !important; width: auto !important; min-width: 56px; margin-left: 16px; text-align: right; }
${S} tr.zA td.xW span {
  font: 500 11px/16px var(--nw-font) !important;
  color: var(--nw-snippet) !important;
  font-variant-numeric: tabular-nums;
}
${S} tr.zA.zE td.xW span { font-weight: 700 !important; color: var(--nw-strong) !important; }
${S} tr.zA > td.bq4 { opacity: 0.7; }
${S} tr.zA td.yX .yW { color: var(--nw-sender) !important; }
${S} tr.zA td.yX :is(.yW, .bA4) span { font-weight: 400 !important; color: var(--nw-sender) !important; }
${S} tr.zA.zE td.yX :is(.yW, .bA4) span { font-weight: 700 !important; color: var(--nw-strong) !important; }
${S} tr.zA td.yX .bx0 { margin-left: 4px; font: 400 12px/20px var(--nw-font) !important; color: var(--nw-tertiary) !important; }
${S} tr.zA .bog,
${S} tr.zA .bog * { font-weight: 400 !important; color: var(--nw-subject) !important; }
${S} tr.zA.zE .bog,
${S} tr.zA.zE .bog * { font-weight: 700 !important; color: var(--nw-strong) !important; }
${S} tr.zA .y2,
${S} tr.zA .y2 * { font-weight: 400 !important; color: var(--nw-snippet) !important; }
${S} tr.zA :is(.xS, .xT) { height: 20px; line-height: 20px; }
${S} tr.zA .xT { align-items: baseline; }
${S} tr.zA .xT > * { line-height: 20px; }
${S} [gh="tl"] * { scrollbar-width: thin; scrollbar-color: var(--nw-border) transparent; }
${S} tr.zA .y2 .Zt { display: inline !important; font-size: 0; }
${S} tr.zA .y2 .Zt::before { content: "\\00a0\\2014\\00a0"; font-size: 14px; }
${S} tr.zA .brd { display: none; }
${S} tr.zA .at {
  margin: 0 4px 0 0;
  border: 0 !important;
  border-radius: 4px;
  background: var(--nw-fill) !important;
}
${S} tr.zA .at .au { border: 0 !important; background: transparent !important; }
${S} tr.zA .at .av {
  padding: 2px 8px;
  font: 400 12px/16px var(--nw-font) !important;
  color: var(--nw-secondary) !important;
}
${S} ${SELECTORS.subject} { font: 600 22px/1.3 var(--nw-font) !important; color: var(--nw-text); }
${S} .Wg {
  position: relative;
  box-sizing: border-box;
  height: 28px !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 24px !important;
  align-items: center;
  border-bottom: 1px solid var(--nw-rule);
}
${S} .Wg > .d9yJeb { flex: 1; margin: 0 !important; }
${S} .Wg .chp5lb > :not(.Wm) { display: none; }
${S} .Wg .chp5lb .Wm { margin-right: 20px; cursor: pointer; }
${S} .Wg .chp5lb .Wm * {
  font: 500 11px/16px var(--nw-font) !important;
  color: var(--nw-tertiary) !important;
  font-variant-numeric: tabular-nums;
}
${S} .Wg .chp5lb .Wm:hover * { color: var(--nw-text) !important; }
${S} h3.Wr {
  position: static;
  height: 28px !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  align-items: center;
  justify-content: flex-start !important;
  text-align: left;
}
${S} h3.Wr .Wn { height: auto; margin: 0; padding: 0; }
${S} h3.Wr .qh {
  font: 500 11px/16px var(--nw-font) !important;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--nw-secondary) !important;
}
${S} h3.Wr img.qi { position: absolute; top: -1px; right: 17px; margin: 0; opacity: 0.45; transform: scale(0.6); filter: var(--nw-icon-filter); }

${S} .adn .gE { font-family: var(--nw-font); color: var(--nw-secondary); }
${S} .adn .gD { font-family: var(--nw-font); color: var(--nw-text); }
${S} .adn .gH { color: var(--nw-secondary); }
${S} .adn :is(.iw, .go, .hb, .g2) { color: var(--nw-secondary); }
${S} :is(.a98, .Tm, .btDi4d) { background: var(--nw-card) !important; }
${S} .nr:has(> .amn) { background: transparent !important; }
${S} .amn .ams { border-color: var(--nw-border) !important; color: var(--nw-secondary) !important; }
${S} :is(.adn .gH, .V8djrc) :is(img, svg, .T-KT) { filter: var(--nw-icon-filter); }
${S} :is(.ii.gt, .AD :is([g_editable="true"], .aoD)) { filter: var(--nw-mail-filter); }
${S} :is(.ii.gt, .AD [g_editable="true"]) :is(img, video, picture, canvas, iframe, [style*="url("], [background]):not(:is(picture, [style*="url("], [background]) *) {
  filter: var(--nw-mail-filter);
}

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
${S} .J-M .J-N { border-radius: 6px; color: var(--nw-text); }
${S} .J-M .J-N :is(.J-N-Jz, .J-N-Jo) { color: inherit; }
${S} .J-M .J-N:is(:hover, .J-N-JT) { background: var(--nw-wash); }
${S} :is([gh="cm"], [gh="tm"] [role="button"], .TO a):focus-visible {
  outline: 2px solid var(--nw-accent);
  outline-offset: -2px;
}

${SPLIT} > .Nt {
  border-color: transparent !important;
  background: linear-gradient(var(--nw-hairline), var(--nw-hairline)) center / 1px 100% no-repeat !important;
}
${SPLIT_EMPTY} > :is(.Nt, .Nu.S3) {
  flex: 0 0 0 !important;
  width: 0 !important;
  min-width: 0;
  border: 0 !important;
  overflow: hidden;
  visibility: hidden;
}
${SPLIT_OPEN} > .Nu.tf { flex: 0 0 550px !important; min-width: 0; }
${SPLIT_OPEN} > .Nt { position: relative; z-index: 1; margin-right: -5px; }
${SPLIT_OPEN} tr.zA > td.yX { flex-basis: 120px !important; width: 120px !important; }
${SPLIT} > .Nu.S3 .aia > * { min-width: 0; }
${SPLIT} > .Nu.S3 .ao8 { max-width: 100%; }
${SPLIT} > .Nu.S3 ${SELECTORS.subject} { font-size: 16px !important; line-height: 24px; }
${SPLIT} > .Nu.S3 .a98 { padding: 12px 28px 32px 12px !important; }
${NARROW_ROW} {
  flex-wrap: wrap;
  height: auto !important;
  padding-block: 10px !important;
  align-items: flex-start;
  row-gap: 2px;
}
${NARROW_ROW} > td.yX { flex: 0 1 auto !important; width: auto !important; min-width: 0; margin-right: auto !important; }
${NARROW_ROW} > :is(td.apU, td.yf, td.xW) { height: 20px !important; align-items: center; }
${NARROW_ROW} .xT { flex-wrap: nowrap !important; }
${NARROW_ROW} .xT > .y6 { flex: 0 1 auto !important; width: auto !important; min-width: 0; }
${NARROW_ROW} .xT > .y2 { display: block; flex: 1 1 0 !important; width: auto !important; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${NARROW_ROW} > td.a4W {
  order: 4;
  flex: 0 0 100% !important;
  box-sizing: border-box;
  width: auto !important;
  margin: 0 !important;
}
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

// The folder switcher and Compose button, over Gmail's header (z-index 986).
export const TOPBAR_CSS = `
:host {
  all: initial;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 0;
  z-index: 987;
}
button {
  all: unset;
  position: absolute;
  top: 8px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  cursor: pointer;
  font-family: var(--nw-font);
  white-space: nowrap;
}
button:focus-visible { outline: 2px solid var(--nw-accent); outline-offset: 1px; }
svg {
  flex: none;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.switcher {
  left: ${HEADER_SIDE + 16}px;
  max-width: calc(50vw - ${HEADER_SIDE + 16 + 200 + 16}px);
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--nw-secondary);
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  letter-spacing: 0.2px;
}
.switcher:hover { background: var(--nw-fill); }
.name { overflow: hidden; text-overflow: ellipsis; }
.compose {
  right: ${HEADER_SIDE + 16}px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--nw-accent-fill);
  color: var(--nw-accent-text);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}
.compose:hover { background: var(--nw-wash); }
@media (max-width: 900px) {
  .compose span { display: none; }
}
`;

// Inside the split bar's shadow root, applied while its host has the skin class.
export const SPLIT_TABS_CSS = `
:host(.${SKIN_CLASS}) .bar {
  gap: 25px;
  height: 48px;
  padding: 10px 4px;
  box-sizing: border-box;
  border: 0;
  align-items: center;
  font: 500 16px/24px var(--nw-font);
  letter-spacing: 0.2px;
}
:host(.${SKIN_CLASS}) .tab {
  box-sizing: border-box;
  height: 28px;
  margin: 0;
  padding: 2px 8px;
  border: 0;
  border-radius: 8px;
  opacity: 1;
  color: var(--nw-tertiary);
}
:host(.${SKIN_CLASS}) .tab:hover { color: var(--nw-text); }
:host(.${SKIN_CLASS}) .tab[aria-selected="true"] { background: var(--nw-fill); color: var(--nw-text); }
:host(.${SKIN_CLASS}) .count {
  margin-left: 4px;
  font: 400 13px/16px var(--nw-font);
  letter-spacing: 0;
  color: var(--nw-tertiary);
  font-variant-numeric: tabular-nums;
}
`;

// Shortwave's palette, inside the palette's shadow root: no dimming, a 640 px card with a label, a 56 px input and
// 48 px rows with an icon and grey key chips.
export const PALETTE_CSS = `
:host(.${SKIN_CLASS}) .backdrop { background: transparent; }
:host(.${SKIN_CLASS}) .card {
  width: min(640px, calc(100vw - 32px));
  max-height: min(363px, 70vh);
  margin-top: 20vh;
  border-radius: 8px;
  background: var(--nw-surface);
  box-shadow: rgba(0, 0, 0, 0.3) 0 16px 70px;
  font: 14px/20px var(--nw-font);
  color: var(--nw-text);
}
:host(.${SKIN_CLASS}) .label {
  display: block;
  flex: none;
  padding: 12px 16px;
  border-bottom: 1px solid var(--nw-border);
  background: var(--nw-chrome);
  color: var(--nw-secondary);
  font: 500 11px/16px var(--nw-font);
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
:host(.${SKIN_CLASS}) .input {
  flex: none;
  box-sizing: border-box;
  height: 56px;
  padding: 16px;
  border: 0;
  font: 16px/24px var(--nw-font);
  letter-spacing: 0.2px;
  color: var(--nw-text);
}
:host(.${SKIN_CLASS}) .input::placeholder { color: var(--nw-tertiary); }
:host(.${SKIN_CLASS}) .input[hidden] + .list { padding-top: 0; }
:host(.${SKIN_CLASS}) .list { padding: 0; }
:host(.${SKIN_CLASS}) .list > .section:first-child { display: none; }
:host(.${SKIN_CLASS}) .section {
  padding: 12px 16px 4px;
  color: var(--nw-secondary);
  font: 500 11px/16px var(--nw-font);
  letter-spacing: 0.4px;
}
:host(.${SKIN_CLASS}) .row {
  position: relative;
  gap: 16px;
  height: 48px;
  margin: 0;
  padding: 0 16px;
  border-radius: 0;
  justify-content: flex-start;
}
:host(.${SKIN_CLASS}) .row[aria-selected="true"] { background: var(--nw-wash); box-shadow: inset 3px 0 var(--nw-accent); }
:host(.${SKIN_CLASS}) .icon {
  display: block;
  flex: none;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: var(--nw-secondary);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
:host(.${SKIN_CLASS}) .title { flex: 1; min-width: 0; }
:host(.${SKIN_CLASS}) .keys { gap: 6px; }
:host(.${SKIN_CLASS}) kbd {
  min-width: 0;
  padding: 1px 8px;
  border: 0;
  border-radius: 4px;
  background: var(--nw-border);
  color: var(--nw-text);
  font: 400 14px/20px ui-monospace, "SF Mono", Menlo, monospace;
}
:host(.${SKIN_CLASS}) .sep { color: var(--nw-tertiary); font-size: 12px; }
:host(.${SKIN_CLASS}) .note { height: auto; min-height: 48px; padding-block: 14px; }
:host(.${SKIN_CLASS}) .hint { padding: 14px 16px; color: var(--nw-tertiary); }
`;

// The split tabs open Gmail's own control row, ahead of select, refresh and more, so tabs and controls share one
// line. Never inside the thread list itself: Gmail stops archiving when anything is added there.
export function splitBarAnchor(list) {
  const view = list.closest(SELECTORS.view) ?? document;
  const toolbar = [...view.querySelectorAll(SELECTORS.toolbar)].find((el) => el.getClientRects().length > 0);
  return toolbar?.querySelector(SELECTORS.toolbarActions) ?? toolbar ?? null;
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

// 'expand' | null. Earlier versions folded Gmail's nav into its icon rail while the look was on; the look now hides
// the nav, and turning it off unfolds a nav that nowave folded.
export function navToggle({ skin, expanded, collapsedBySkin, clicked }) {
  if (clicked || skin || expanded || !collapsedBySkin) return null;
  return 'expand';
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export function mainMenu() {
  return document.querySelector(SELECTORS.appReady) ? document.querySelector(SELECTORS.mainMenu) : null;
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
