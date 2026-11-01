import { test, expect } from '@playwright/test';

async function open(page, { settings = {}, hash = '#inbox' } = {}) {
  await page.addInitScript((settings) => {
    localStorage.setItem('nowave', JSON.stringify(settings));
    // Inspect closed roots without changing their production encapsulation.
    window.fixtureRoots = new Map();
    const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      const root = attach.call(this, options);
      window.fixtureRoots.set(this.id, root);
      return root;
    };
  }, settings);
  await page.goto(`/dev/fixture.html${hash}`);
  await expect(page.locator('#nowave-style')).toBeAttached();
  if (hash === '#inbox') await expect(page.locator('#nowave-splits')).toBeVisible();
}

const style = (locator, property) => locator.evaluate((el, property) => getComputedStyle(el)[property], property);

async function splitState(page) {
  return page.evaluate(() => {
    const root = window.fixtureRoots.get('nowave-splits');
    const bar = root.querySelector('.bar');
    const tab = root.querySelector('[aria-selected="true"]');
    const bounds = (el) => {
      const { left, right, top, width, height } = el.getBoundingClientRect();
      return { left, right, top, width, height };
    };
    return {
      bar: bounds(bar),
      tab: tab && bounds(tab),
      background: tab && getComputedStyle(tab).backgroundColor,
      scroll: bar.scrollLeft,
    };
  });
}

async function aligned(page) {
  await expect.poll(async () => {
    const { bar, tab, background } = await splitState(page);
    return Boolean(tab) && background === 'rgba(5, 3, 17, 0.08)' && tab.left >= bar.left - 1 && tab.right <= bar.right + 1;
  }).toBe(true);
}

async function paletteCommand(page, title) {
  await page.keyboard.press('Control+k');
  await expect(page.locator('#nowave-palette')).toBeAttached();
  await page.keyboard.type(title);
  await page.keyboard.press('Enter');
}

test('keeps native actions, search filters, settings and side panel, and hides what Shortwave has no place for', async ({ page }) => {
  await open(page);
  for (const name of ['Select all', 'Refresh', 'Archive', 'More', 'Has attachment', 'Settings', 'Tasks']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  for (const name of ['Google apps', 'Help', 'Main menu']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeHidden();
  }
  await expect(page.getByRole('navigation')).toBeHidden();
  expect(await page.locator('#nowave-splits').evaluate(el => !el.closest('[gh="tl"]') && !!el.closest('[gh="tm"]') && el.nextElementSibling.matches('[gh="mtb"]'))).toBe(true);
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Select Linear' })).toHaveAttribute('aria-checked', 'true');
});

test('lays out the page like Shortwave: gutter, centred search, folder switcher and Compose', async ({ page }) => {
  await open(page);
  const rect = (selector) => page.locator(selector).evaluate((el) => {
    const { x, y, width, height } = el.getBoundingClientRect();
    return { x, y, width, height };
  });
  const search = await rect('header#gb form[role="search"]');
  expect(search).toEqual({ x: 1280 / 2 - 200, y: 5, width: 400, height: 38 });
  expect((await rect('.bkK')).x).toBe(48);
  expect(await style(page.locator('body'), 'backgroundColor')).toBe('rgb(229, 233, 243)');
  const top = await page.evaluate(() => {
    const root = window.fixtureRoots.get('nowave-topbar');
    const box = (el) => { const { x, y, width, height } = el.getBoundingClientRect(); return { x, y, width, height }; };
    return { name: root.querySelector('.name').textContent, switcher: box(root.querySelector('.switcher')), compose: box(root.querySelector('.compose')) };
  });
  expect(top.name).toBe('Inbox');
  expect(top.switcher.x).toBe(64);
  expect(top.compose.x + top.compose.width).toBe(1280 - 64);
  await page.evaluate(() => location.hash = '#sent');
  await expect.poll(() => page.evaluate(() => window.fixtureRoots.get('nowave-topbar').querySelector('.name').textContent)).toBe('Sent');
  await page.evaluate(() => window.fixtureRoots.get('nowave-topbar').querySelector('.switcher').click());
  await expect.poll(() => page.evaluate(() => [...window.fixtureRoots.get('nowave-palette').querySelectorAll('[role="option"]')].map((row) => row.querySelector('.title').textContent))).toContain('Go to Inbox');
  const titles = await page.evaluate(() => [...window.fixtureRoots.get('nowave-palette').querySelectorAll('[role="option"]')].map((row) => row.querySelector('.title').textContent));
  expect(titles.every((title) => title.startsWith('Go to'))).toBe(true);
});

test('keeps selection and stars operable and does not mistake a star for a selected row', async ({ page }) => {
  await open(page);
  const read = page.locator('#read-row');
  expect(await style(read, 'backgroundColor')).toBe('rgba(0, 0, 0, 0)');
  await expect(page.getByRole('checkbox', { name: 'Star Figma' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Select Figma' })).toBeHidden();
  await read.hover();
  await page.getByRole('checkbox', { name: 'Select Figma' }).click();
  await page.mouse.move(0, 0);
  await expect(read).toHaveCSS('background-color', 'rgb(204, 216, 254)');
  await expect(page.getByRole('checkbox', { name: 'Select Figma' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Star Figma' }).click();
  await expect(page.getByRole('checkbox', { name: 'Star Figma' })).toHaveAttribute('aria-checked', 'false');
});

test('draws Shortwave rows: letter avatars, grey label chips, bold unread and a long dash before the snippet', async ({ page }) => {
  await open(page);
  expect(await style(page.locator('.at'), 'backgroundColor')).toBe('rgba(5, 3, 17, 0.08)');
  expect(await style(page.locator('.av'), 'color')).toBe('rgba(5, 3, 17, 0.54)');
  expect(await style(page.locator('#unread-row .bA4 span'), 'fontWeight')).toBe('700');
  expect(await style(page.locator('#read-row .bA4 span'), 'fontWeight')).toBe('400');
  expect(await style(page.locator('#read-row .bog'), 'color')).toBe('rgba(5, 0, 26, 0.75)');
  expect(await style(page.locator('#unread-row .y2'), 'color')).toBe('rgba(5, 0, 26, 0.45)');
  const avatar = await page.locator('#read-row .bA4 > span').evaluate((el) => {
    const s = getComputedStyle(el, '::before');
    return { content: s.content, width: s.width, height: s.height, radius: s.borderRadius };
  });
  expect(avatar).toEqual({ content: '"Figma"', width: '24px', height: '24px', radius: '6px' });
  expect(await page.locator('#read-row .Zt').evaluate((el) => getComputedStyle(el, '::before').content)).toBe('"\u00a0—\u00a0"');
  const row = await page.locator('#read-row').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const list = el.closest('[gh="tl"]').getBoundingClientRect();
    const sender = el.querySelector('td.yX').getBoundingClientRect();
    const date = el.querySelector('td.xW').getBoundingClientRect();
    return { height: r.height, sender: sender.left - list.left, date: list.right - date.right, shadow: getComputedStyle(el).boxShadow };
  });
  expect(row).toEqual({ height: 40, sender: 60, date: 24, shadow: 'none' });
  expect(await style(page.locator('#unread-row'), 'boxShadow')).toBe('rgb(53, 106, 255) 3px 0px 0px 0px inset');
  expect(await style(page.locator('#unread-row'), 'backgroundColor')).toBe('rgb(204, 216, 254)');
});

test('styles the thread shell without changing message or inline-reply formatting', async ({ page }) => {
  await open(page);
  await page.evaluate(() => location.hash = '#inbox/1234567890abcdef');
  await expect(page.locator('#nowave-splits')).not.toBeAttached();
  await expect(page.locator('#thread-view')).toBeVisible();
  expect(await style(page.locator('h2.hP'), 'fontSize')).toBe('22px');
  expect(await style(page.locator('#message-body'), 'fontFamily')).toContain('Georgia');
  expect(await style(page.locator('#message-body'), 'color')).toBe('rgb(123, 31, 162)');
  expect(await style(page.locator('#message-body'), 'backgroundColor')).toBe('rgb(255, 248, 225)');
  expect(await style(page.getByRole('textbox', { name: 'Reply', exact: true }), 'fontFamily')).toContain('Georgia');
  await expect(page.getByRole('button', { name: 'Send reply' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
});

test('styles compose chrome but leaves draft content and native actions intact', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.fixtureRoots.get('nowave-topbar').querySelector('.compose').click());
  await expect(page.getByRole('textbox', { name: 'Recipients', exact: true })).toBeVisible();
  expect(await style(page.locator('#compose .M9'), 'borderTopLeftRadius')).toBe('12px');
  expect(await style(page.locator('#compose .aYF'), 'backgroundColor')).toBe('rgb(242, 244, 247)');
  expect(await style(page.getByRole('textbox', { name: 'Message body' }), 'fontFamily')).toContain('Georgia');
  expect(await style(page.getByRole('textbox', { name: 'Message body' }), 'color')).toBe('rgb(123, 31, 162)');
  await expect(page.getByRole('button', { name: 'Attach files', exact: true })).toBeVisible();
  await page.locator('#close-compose').click();
  await expect(page.locator('#compose')).toBeHidden();
});

test('native menus, dialogs and search suggestions remain visible and are not clipped by the compact header', async ({ page }) => {
  await open(page);
  await page.getByRole('textbox', { name: 'Search mail' }).fill('design');
  await expect(page.getByRole('listbox')).toBeVisible();
  const suggestions = await page.locator('#suggestions').boundingBox();
  const hit = await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('#suggestions')),
    { x: suggestions.x + 20, y: suggestions.y + suggestions.height / 2 });
  expect(hit).toBe(true);
  await page.evaluate(() => {
    document.querySelector('#label-menu').hidden = false;
    document.querySelector('#confirm').hidden = false;
  });
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
  expect(await style(page.locator('#label-menu'), 'backgroundColor')).toBe('rgb(255, 255, 255)');
  expect(await style(page.locator('#confirm'), 'borderRadius')).toBe('12px');
});

test('uses the light skin palette even with a dark OS preference and restores native styles when disabled', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page);
  await page.keyboard.press('Control+k');
  expect(await page.evaluate(() => getComputedStyle(window.fixtureRoots.get('nowave-palette').querySelector('.card')).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.keyboard.press('Escape');
  await paletteCommand(page, 'Toggle Shortwave look');
  await expect(page.locator('html')).not.toHaveClass(/nowave-skin/);
  expect(await style(page.locator('body'), 'backgroundColor')).toBe('rgb(234, 241, 251)');
  expect(await style(page.locator('#unread-row'), 'backgroundColor')).toBe('rgb(242, 246, 252)');
  await page.keyboard.press('Control+k');
  expect(await page.evaluate(() => getComputedStyle(window.fixtureRoots.get('nowave-palette').querySelector('.card')).backgroundColor)).toBe('rgb(32, 33, 36)');
});

test('keeps settings and user-authored signatures untouched', async ({ page }) => {
  await open(page, { hash: '#settings/general' });
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  expect(await style(page.locator('textarea'), 'fontFamily')).toContain('Georgia');
  await expect(page.locator('#nowave-splits')).not.toBeAttached();
});

test('wraps rows only in a vertical reading pane and restores single-line rows afterwards', async ({ page }) => {
  await open(page);
  expect(await style(page.locator('#unread-row'), 'flexWrap')).toBe('nowrap');
  await page.locator('[gh="tl"]').evaluate(el => el.classList.add('Nm'));
  expect(await style(page.locator('#unread-row'), 'flexWrap')).toBe('wrap');
  await expect(page.locator('#unread-row')).toHaveCSS('padding-top', '10px');
  const sender = await page.locator('#unread-row .yX').boundingBox();
  const subject = await page.locator('#unread-row .a4W').boundingBox();
  expect(subject.y).toBeGreaterThan(sender.y);
  await expect(page.locator('.apb')).toBeVisible();
  await expect(page.locator('.apb')).toContainText('No conversations selected');
  await page.locator('.Nu.tf > .Cp').evaluate((cp) => {
    const narrow = document.createElement('div');
    narrow.className = 'Zs';
    cp.before(narrow);
    narrow.append(cp);
  });
  expect(await style(page.locator('#unread-row .a4W'), 'order')).toBe('0');
  expect(await style(page.locator('#unread-row .a4W'), 'flexBasis')).not.toBe('100%');
  await page.locator('.Nu.tf > .Zs').evaluate((narrow) => narrow.replaceWith(...narrow.childNodes));
  await page.locator('[gh="tl"]').evaluate(el => el.classList.remove('Nm'));
  expect(await style(page.locator('#unread-row'), 'height')).toBe('40px');
});

test('anchors the advanced search panel to the compact search field', async ({ page }) => {
  await open(page);
  const place = () => page.evaluate(() => {
    const form = document.querySelector('header#gb form[role="search"]').getBoundingClientRect();
    const panel = document.querySelector('.ZF-Av').getBoundingClientRect();
    return { formLeft: form.left, formWidth: form.width, panelLeft: panel.left, panelWidth: panel.width };
  });
  await page.evaluate(() => {
    const gmail = document.createElement('style');
    gmail.textContent = '.ZF-Av { position: absolute; left: 256px; right: 24px; } .SK.ZF-zT { width: 100%; max-width: 720px; }';
    document.head.append(gmail);
    const popup = document.createElement('div');
    popup.className = 'ZF-Av';
    popup.style.top = '44px';
    const panel = document.createElement('div');
    panel.className = 'SK ZF-zT';
    panel.textContent = 'From';
    popup.append(panel);
    document.body.append(popup);
  });
  const skinned = await place();
  expect(skinned.panelLeft).toBeCloseTo(skinned.formLeft, 0);
  expect(skinned.panelWidth).toBeCloseTo(skinned.formWidth, 0);
  await paletteCommand(page, 'Toggle Shortwave look');
  await expect(page.locator('html')).not.toHaveClass(/nowave-skin/);
  expect((await place()).panelLeft).toBe(256);
});

test('keeps a half-pixel-wide reading pane free of a horizontal scrollbar while wide mail still scrolls', async ({ page }) => {
  await open(page);
  const result = await page.evaluate(() => {
    const list = document.querySelector('[gh="tl"]');
    list.classList.add('Nm');
    const pane = list.querySelector('.Nu.S3');
    pane.style.cssText = 'flex: none; width: 400.5px; height: 300px; overflow: auto;';
    const aia = pane.querySelector('.aia');
    aia.style.display = 'flex';
    const conversation = document.createElement('div');
    const ao8 = document.createElement('div');
    ao8.className = 'nH ao8';
    const body = document.createElement('div');
    body.className = 'a3s';
    body.style.overflowX = 'auto';
    const wide = document.createElement('div');
    wide.style.width = '900px';
    wide.textContent = 'A newsletter wider than the pane';
    body.append(wide);
    ao8.append(body);
    conversation.append(ao8);
    aia.replaceChildren(conversation);
    // Gmail sets this width from the pane's rounded clientWidth.
    ao8.style.width = `${Math.ceil(pane.getBoundingClientRect().width - (pane.offsetWidth - pane.clientWidth))}px`;
    return {
      paneScrollbar: pane.offsetHeight - pane.clientHeight,
      overhang: ao8.getBoundingClientRect().right - (pane.getBoundingClientRect().right - (pane.offsetWidth - pane.clientWidth)),
      bodyScrolls: body.scrollWidth > body.clientWidth,
    };
  });
  expect(result.paneScrollbar).toBe(0);
  expect(result.overhang).toBeLessThanOrEqual(0);
  expect(result.bodyScrolls).toBe(true);
});

test('marks no tab on lists which do not match a split and marks the split again on return', async ({ page }) => {
  await open(page);
  await aligned(page);
  await page.evaluate(() => location.hash = '#sent');
  await expect.poll(async () => (await splitState(page)).tab).toBe(null);
  await page.evaluate(() => location.hash = '#inbox');
  await aligned(page);
});

test('styles the split tabs like Shortwave and hides Gmail\'s select, refresh and more', async ({ page }) => {
  await open(page);
  const tabs = await page.evaluate(() => {
    const root = window.fixtureRoots.get('nowave-splits');
    const look = (el) => {
      const s = getComputedStyle(el);
      return { height: el.getBoundingClientRect().height, font: `${s.fontSize}/${s.lineHeight} ${s.fontWeight}`, color: s.color, transition: s.transitionDuration };
    };
    return { active: look(root.querySelector('[aria-selected="true"]')), idle: look(root.querySelector('[aria-selected="false"]')), count: look(root.querySelector('.count')) };
  });
  expect(tabs.active).toEqual({ height: 28, font: '16px/24px 500', color: 'rgba(5, 3, 17, 0.87)', transition: '0s' });
  expect(tabs.idle.color).toBe('rgba(5, 3, 17, 0.45)');
  expect(tabs.count.font).toBe('13px/16px 400');
  const shown = await page.evaluate(() => {
    const actions = document.querySelector('#list-view [gh="mtb"]');
    const group = (inner) => {
      const el = document.createElement('div');
      el.className = 'G-Ni';
      el.innerHTML = inner;
      actions.append(el);
      return el;
    };
    const groups = [
      group('<div role="button"><span role="checkbox" aria-checked="false"></span></div>'),
      group('<div role="button" act="20">Refresh</div>'),
      group('<div role="button" class="nf">More</div>'),
      group('<div role="button" act="7">Archive</div>'),
    ];
    return groups.map((el) => el.getClientRects().length > 0);
  });
  expect(shown).toEqual([false, false, false, true]);
});

test('keeps a selected overflow tab on screen after narrowing the window', async ({ page }) => {
  const splits = Array.from({ length: 9 }, (_, i) => ({ name: `Team inbox ${i + 1}`, query: i ? `label:team${i}` : 'in:inbox' }));
  await open(page, { settings: { splits } });
  await page.evaluate(() => location.hash = '#search/label%3Ateam8');
  await aligned(page);
  await page.setViewportSize({ width: 640, height: 800 });
  await expect.poll(async () => (await splitState(page)).scroll > 0).toBe(true);
  await aligned(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('supports roving keyboard focus without losing it when split tabs rerender', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.fixtureRoots.get('nowave-splits').querySelector('.tab').focus());
  await page.keyboard.press('End');
  await expect(page).toHaveURL(/category%3Asocial/);
  await expect.poll(() => page.evaluate(() => window.fixtureRoots.get('nowave-splits').activeElement?.textContent)).toBe('Social');
  await page.keyboard.press('Home');
  await expect(page).toHaveURL(/#inbox$/);
  await aligned(page);
});

test('respects reduced motion for rows', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  expect(await style(page.locator('#unread-row'), 'transitionDuration')).toBe('0s');
});

test('mounts outside the list when the native toolbar is absent and follows a replaced view', async ({ page }) => {
  await open(page);
  await page.locator('#list-view [gh="tm"]').evaluate(el => el.remove());
  await expect.poll(() => page.locator('#nowave-splits').evaluate(el => el.nextElementSibling.matches('[gh="tl"]'))).toBe(true);
  await page.evaluate(() => {
    const view = document.querySelector('#list-view');
    const next = view.cloneNode(true);
    next.querySelector('#nowave-splits').remove();
    view.replaceWith(next);
  });
  await expect(page.locator('#nowave-splits')).toHaveCount(1);
  await aligned(page);
});

test('renders the interactive demo with the real skin and switches baseline and surfaces', async ({ page }) => {
  await open(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dev/preview.html');
  const mail = page.frameLocator('iframe');
  await expect(mail.locator('tr.zA')).toHaveCount(16);
  await expect(mail.locator('html')).toHaveClass(/nowave-skin/);
  await page.getByRole('button', { name: 'Gmail-style baseline', exact: true }).click();
  await expect(mail.locator('html')).toHaveClass(/native-demo/);
  await expect(mail.locator('html')).not.toHaveClass(/nowave-skin/);
  await expect(mail.locator('nav.aeN')).not.toHaveClass(/bhZ/);
  await page.getByRole('button', { name: 'With Nowave', exact: true }).click();
  await expect(mail.locator('html')).toHaveClass(/nowave-skin/);
  await page.getByRole('button', { name: 'Reading pane', exact: true }).click();
  await expect(mail.locator('[gh="tl"]')).toHaveClass(/Nm/);
  await expect(mail.locator('.Nu.S3 h2')).toHaveText('Friday’s design review');
  await page.getByRole('button', { name: 'Thread', exact: true }).click();
  await expect(mail.locator('#thread-view')).toBeVisible();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(mail.locator('#compose')).toBeVisible();
  await page.getByRole('button', { name: '⌘K Palette', exact: true }).click();
  await expect.poll(() => mail.locator('body').evaluate(() => {
    const root = window.fixtureRoots.get('nowave-palette');
    return Boolean(root?.querySelector('input').getClientRects().length);
  })).toBe(true);
  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await expect.poll(() => mail.locator('body').evaluate(() => {
    const root = window.fixtureRoots.get('nowave-palette');
    return Boolean(root?.querySelector('input').getClientRects().length);
  })).toBe(false);
  expect(errors).toEqual([]);
});
