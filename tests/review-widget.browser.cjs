const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const fixture = `<!doctype html><html><head><style>
html{font-size:16px;background:#191714;color:white;font-family:Arial}body{margin:0}
section{height:800px;background:linear-gradient(120deg,#8c7968,#24201c)}main{height:3000px}
#vip{position:fixed;bottom:0;left:0;width:100%;height:6rem;background:#333;z-index:2147483000;display:none}
</style></head><body><section data-tdb-review-introduction>Review hero</section><main>Page content</main><div id="vip">Join VIP</div>
<script src="/src/shared/modules.js"></script><script>
let decided=false, cookiesOpen=true;const listeners=[];
window.TDBConsent={allows:()=>decided,subscribe:fn=>{listeners.push(fn);fn();return ()=>{}}};
window.CookieScript={instance:{isOpen:()=>cookiesOpen}};
window.choose=()=>{decided=true;cookiesOpen=false;listeners.forEach(fn=>fn())};
const TDBRuntimeModuleRoot=new URL('/dist/',location.href);
</script><script src="/src/reviews/widget-loader.js"></script><script>prepareReviewWidgetLoader()</script></body></html>`;
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.setHeader('content-type', 'text/html');
    res.end(fixture);
    return;
  }
  const file = path.join(root, new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader('content-type', file.endsWith('.css') ? 'text/css' : 'application/javascript');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.TDB_BROWSER_CHANNEL || 'msedge',
  });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const assets = [];
      const errors = [];
      page.on('request', (r) => {
        if (/\/dist\/tdb-review-widget\./.test(r.url())) assets.push(r.url());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.evaluate(() => scrollTo(0, 1000));
      await page.waitForTimeout(120);
      assert.equal(assets.length, 0, 'no widget JS/CSS before cookie decision, even below hero');
      await page.evaluate(() => {
        scrollTo(0, 0);
        choose();
      });
      await page.waitForTimeout(120);
      assert.equal(assets.length, 0, 'no widget JS/CSS before passing hero');
      await page.evaluate(() => scrollTo(0, 1000));
      await page.waitForSelector('.tdb-review-widget.is-visible');
      await page.waitForTimeout(500);
      assert.equal(assets.length, 2, 'one JS + one deferred stylesheet');
      const geometry = await page.locator('.tdb-review-widget').evaluate((el) => {
        const r = el.getBoundingClientRect(),
          css = getComputedStyle(el);
        return {
          height: r.height,
          bottom: innerHeight - r.bottom,
          left: r.left,
          blur: css.backdropFilter,
          stars: el.querySelectorAll('.tdb-review-widget_stars > span').length,
        };
      });
      assert.deepEqual(geometry, { height: 64, bottom: 16, left: 0, blur: 'blur(20px)', stars: 5 });
      await page.evaluate(() =>
        document.documentElement.classList.add(
          'tdb-slider-focus',
          'tdb-sg-chrome-away',
          'tdb-timer-hidden',
          'tdb-phone-landscape',
        ),
      );
      assert.equal(await page.locator('.tdb-review-widget').isVisible(), true);
      await page.evaluate(() => (document.getElementById('vip').style.display = 'block'));
      assert.equal(
        await page.evaluate(() => document.elementFromPoint(30, innerHeight - 40).id),
        'vip',
        'VIP covers the widget',
      );
      await page.evaluate(() => (document.getElementById('vip').style.display = 'none'));
      assert.equal(await page.locator('.tdb-review-widget').getAttribute('aria-hidden'), 'false');
      await page.waitForTimeout(100);
      const scrollQueries = await page.evaluate(async () => {
        const original = document.querySelector;
        let queries = 0;
        document.querySelector = function (selector) {
          if (/review-widget-boundary|review-introduction|hero---headline/.test(selector))
            queries++;
          return original.call(this, selector);
        };
        try {
          for (let i = 0; i < 30; i++) {
            dispatchEvent(new Event('scroll'));
            await new Promise(requestAnimationFrame);
          }
        } finally {
          document.querySelector = original;
        }
        return queries;
      });
      console.log(`${width}px: ${scrollQueries} hero queries across 30 scroll frames`);
      assert.equal(
        scrollQueries,
        0,
        'scroll reuses the existing hero instead of searching the DOM',
      );
      await page.screenshot({ path: path.join(root, `tests/review-widget-${width}.png`) });
      await page.evaluate(() => scrollTo(0, 700));
      await page.waitForTimeout(500);
      assert.equal(await page.locator('.tdb-review-widget').getAttribute('aria-hidden'), 'true');
      assert.equal(await page.locator('.tdb-review-widget').evaluate((el) => el.inert), true);
      await page.evaluate(() => scrollTo(0, 1000));
      await page.waitForTimeout(500);
      assert.equal(assets.length, 2, 'no repeat loading on re-entry');
      await page.evaluate(() => {
        const old = document.querySelector('section');
        const replacement = old.cloneNode(true);
        replacement.style.height = '1500px';
        old.replaceWith(replacement);
        scrollTo(0, 1000);
        dispatchEvent(new Event('scroll'));
      });
      await page.waitForTimeout(500);
      assert.equal(
        await page.locator('.tdb-review-widget').getAttribute('aria-hidden'),
        'true',
        'replaced hero invalidates the cached boundary',
      );
      await page.evaluate(() => TDBReviewWidgetLoader.destroy());
      assert.equal(await page.locator('.tdb-review-widget').count(), 0);
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${width}px: consent, lazy assets, geometry, persistent visibility, VIP overlap, return, cleanup`,
      );
      await page.close();
    }
    const page = await browser.newPage();
    const assets = [];
    page.on('request', (r) => {
      if (/\/dist\/tdb-review-widget\./.test(r.url())) assets.push(r.url());
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(() => {
      document.querySelector('section').remove();
      choose();
      scrollTo(0, 1000);
    });
    await page.waitForTimeout(100);
    assert.equal(assets.length, 0, 'pages without a review hero do not load widget assets');
    await page.evaluate(() => {
      const section = document.createElement('section');
      section.setAttribute('data-wf--hero---headline--variant', 'base');
      section.innerHTML = '<div class="button is-review"></div>';
      document.body.prepend(section);
      scrollTo(0, 1000);
      dispatchEvent(new Event('pageshow'));
    });
    await page.waitForSelector('.tdb-review-widget.is-visible');
    assert.equal(assets.length, 2, 'restored/deep scroll supports legacy review hero');
    console.log('PASS absent hero and legacy/restored-scroll boundary');
    await page.close();
    const pending = await browser.newPage();
    let releaseScript, scriptRequested;
    const waiting = new Promise((resolve) => {
      scriptRequested = resolve;
    });
    const gate = new Promise((resolve) => {
      releaseScript = resolve;
    });
    await pending.route('**/dist/tdb-review-widget.js', async (route) => {
      scriptRequested();
      await gate;
      await route.continue();
    });
    await pending.goto(`http://127.0.0.1:${server.address().port}/`);
    await pending.evaluate(() => {
      choose();
      scrollTo(0, 1000);
    });
    await waiting;
    await pending.evaluate(() => scrollTo(0, 0));
    releaseScript();
    await pending.waitForSelector('.tdb-review-widget', { state: 'attached' });
    assert.equal(
      await pending.locator('.tdb-review-widget').getAttribute('aria-hidden'),
      'true',
      'finishing a delayed download does not reveal after returning to the hero',
    );
    await pending.close();
    console.log('PASS return to hero during pending asset download');
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
