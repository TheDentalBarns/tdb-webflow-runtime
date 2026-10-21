const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const [route, width] of [
      ['/', 1440],
      ['/location', 390],
      ['/services/signature-assessment', 1440],
      ['/treatments/invisalign', 390],
    ]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      const requests = [],
        errors = [];
      page.on('request', (r) => {
        if (/tdb-review-widget\.(js|css)/.test(r.url())) requests.push(r.url());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'warning' || m.type() === 'error') console.log(route, m.type(), m.text());
      });
      if (!process.env.TDB_WIDGET_DEPLOYED)
        await page.route('**/dist/*', async (r) => {
          const file = new URL(r.request().url()).pathname.split('/').pop();
          if (['tdb-runtime.js', 'tdb-review-widget.js', 'tdb-review-widget.css'].includes(file))
            await r.fulfill({
              path: path.join(root, 'dist', file),
              contentType: file.endsWith('.css') ? 'text/css' : 'application/javascript',
            });
          else await r.continue();
        });
      await page.goto('https://dentalbarns.webflow.io' + route, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForFunction(() => window.CookieScript?.instance);
      assert.equal(requests.length, 0);
      const boundary =
        '[data-tdb-review-introduction], [data-wf--hero---headline--variant]:has(.button.is-review)';
      const boundaries = await page.locator(boundary).count();
      assert.ok(boundaries, route + ' has review introduction');
      await page.evaluate(() => CookieScript.instance.rejectAllAction());
      await page.waitForFunction(() => window.TDBReviewWidgetLoader, { timeout: 30000 });
      assert.equal(requests.length, 0);
      await page.evaluate(() => {
        window.TDBLenis?.stop?.();
        const el = document.querySelector(
          '[data-tdb-review-introduction], [data-wf--hero---headline--variant]:has(.button.is-review)',
        );
        window.scrollTo(0, scrollY + el.getBoundingClientRect().bottom + 200);
      });
      await page.waitForSelector('.tdb-review-widget.is-visible', { state: 'attached' });
      await page.waitForTimeout(1000);
      const result = await page.locator('.tdb-review-widget').evaluate((el) => {
        const r = el.getBoundingClientRect(),
          css = getComputedStyle(el),
          rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        return {
          height: r.height / rem,
          bottom: (innerHeight - r.bottom) / rem,
          blur: css.backdropFilter,
          google: el.querySelector('img').naturalWidth,
          visible: el.classList.contains('is-visible'),
          vipZ: getComputedStyle(document.querySelector('#tdb-vip-drawer')).zIndex,
          z: css.zIndex,
        };
      });
      assert.ok(Math.abs(result.height - 4) < 0.01);
      assert.ok(Math.abs(result.bottom - 1) < 0.01);
      assert.ok(result.google > 0);
      assert.ok(+result.vipZ > +result.z);
      await page.screenshot({
        path: path.join(
          root,
          `tests/widget-staging-${route.replaceAll('/', '') || 'home'}-${width}.png`,
        ),
      });
      // Programmatic activation bypasses only physical VIP overlap, exercising the actual delegated review handler.
      await page.locator('.tdb-review-widget').evaluate((el) => el.click());
      try {
        await page.waitForSelector(
          '[data-tdb-drawer][aria-hidden="false"] [data-tdb-drawer-panel][role="dialog"]:has([data-tdb-reviews])',
          { state: 'visible', timeout: 30000 },
        );
      } catch (e) {
        console.log(
          await page.evaluate(() => ({
            loader: window.TDBReviewLoader?.status?.(),
            busy: document.querySelector('.tdb-review-widget')?.outerHTML,
            drawers: [...document.querySelectorAll('[data-tdb-drawer]')].map((el) => ({
              cls: el.className,
              hidden: el.hidden,
              html: el.outerHTML.slice(0, 350),
            })),
          })),
        );
        throw e;
      }
      console.log(
        JSON.stringify({
          route,
          width,
          boundaries,
          requests: requests.length,
          result,
          drawerOpened: true,
          errors,
        }),
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

