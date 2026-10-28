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
    const pill = root.querySelector('.pill');
    const bounds = (el) => {
      const { left, right, top, width, height } = el.getBoundingClientRect();
      return { left, right, top, width, height };
    };
    return { bar: bounds(bar), tab: tab && bounds(tab), pill: bounds(pill), hidden: pill.hidden, scroll: bar.scrollLeft };
  });
}

async function aligned(page) {
  await expect.poll(async () => {
    const { tab, pill, hidden } = await splitState(page);
    return !hidden && tab && Math.abs(tab.left - pill.left) < 1 && Math.abs(tab.top - pill.top) < 1 && Math.abs(tab.width - pill.width) < 1;
  }).toBe(true);
}

async function paletteCommand(page, title) {
  await page.keyboard.press('Control+k');
  await expect(page.locator('#nowave-palette')).toBeAttached();
  await page.keyboard.type(title);
  await page.keyboard.press('Enter');
}

test('keeps native actions, search filters, apps and side panel beside the split navigation', async ({ page }) => {
  await open(page);
  for (const name of ['Select all', 'Refresh', 'Archive', 'More', 'Has attachment', 'Google apps', 'Help', 'Tasks']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  expect(await page.locator('#nowave-splits').evaluate(el => !el.closest('[gh="tl"]') && el.nextElementSibling.matches('[gh="tm"]'))).toBe(true);
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Select Linear' })).toHaveAttribute('aria-checked', 'true');
});

test('keeps selection and stars operable and does not mistake a star for a selected row', async ({ page }) => {
  await open(page);
  const read = page.locator('#read-row');
  expect(await style(read, 'backgroundColor')).toBe('rgba(0, 0, 0, 0)');
  await expect(page.getByRole('checkbox', { name: 'Star Figma' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Select Figma' }).click();
  expect(await style(read, 'backgroundColor')).toBe('rgb(226, 232, 253)');
  await page.getByRole('checkbox', { name: 'Star Figma' }).click();
  await expect(page.getByRole('checkbox', { name: 'Star Figma' })).toHaveAttribute('aria-checked', 'false');
});

test('preserves custom label colors and distinguishes unread subjects from read subjects', async ({ page }) => {
  await open(page);
  expect(await style(page.locator('.at'), 'backgroundColor')).toBe('rgb(206, 234, 214)');
  expect(await style(page.locator('.av'), 'color')).toBe('rgb(19, 115, 51)');
  expect(await style(page.locator('#unread-row .yW'), 'fontWeight')).toBe('600');
  expect(await style(page.locator('#read-row .yW'), 'fontWeight')).toBe('400');
  expect(await style(page.locator('#unread-row .y2'), 'color')).toBe('rgb(107, 114, 128)');
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
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Recipients', exact: true })).toBeVisible();
  expect(await style(page.locator('#compose .M9'), 'borderTopLeftRadius')).toBe('12px');
  expect(await style(page.locator('#compose .aYF'), 'backgroundColor')).toBe('rgb(247, 247, 248)');
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
  const sender = await page.locator('#unread-row .yX').boundingBox();
  const subject = await page.locator('#unread-row .a4W').boundingBox();
  expect(subject.y).toBeGreaterThan(sender.y);
  await expect(page.getByText('No conversations selected', { exact: true })).toBeVisible();
  await page.locator('[gh="tl"]').evaluate(el => el.classList.remove('Nm'));
  expect(await style(page.locator('#unread-row'), 'height')).toBe('42px');
});

test('hides the highlight on lists which do not match a split and restores it on return', async ({ page }) => {
  await open(page);
  await aligned(page);
  await page.evaluate(() => location.hash = '#sent');
  await expect.poll(async () => (await splitState(page)).hidden).toBe(true);
  await page.evaluate(() => location.hash = '#inbox');
  await aligned(page);
});

test('repositions the split highlight after font-size and count changes without a Gmail mutation', async ({ page }) => {
  await open(page);
  await aligned(page);
  await page.evaluate(() => document.documentElement.style.setProperty('--nw-font', 'monospace'));
  await aligned(page);
  await page.evaluate(() => {
    window.fixtureRoots.get('nowave-splits').querySelector('.count').textContent = '123456789';
  });
  await aligned(page);
});

test('keeps a selected overflow tab on screen after narrowing the window', async ({ page }) => {
  const splits = Array.from({ length: 9 }, (_, i) => ({ name: `Team inbox ${i + 1}`, query: i ? `label:team${i}` : 'in:inbox' }));
  await open(page, { settings: { splits } });
  await page.evaluate(() => location.hash = '#search/label%3Ateam8');
  await aligned(page);
  await page.setViewportSize({ width: 640, height: 800 });
  await expect.poll(async () => {
    const { bar, tab, scroll } = await splitState(page);
    return scroll > 0 && tab.left >= bar.left - 1 && tab.right <= bar.right + 1;
  }).toBe(true);
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

test('respects reduced motion for rows and split changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  expect(await style(page.locator('#unread-row'), 'transitionDuration')).toBe('0s');
  await page.evaluate(() => location.hash = '#search/in%3Ainbox%20category%3Aupdates');
  await aligned(page);
  expect(await page.evaluate(() => window.fixtureRoots.get('nowave-splits').querySelector('.pill').getAnimations().length)).toBe(0);
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
