/* Local browser fixtures: stylesheet timing/failure and consent, no Vimeo network. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const source = fs.readFileSync(path.join(__dirname, '../dist/tdb-vimeo-loader.js'), 'utf8');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  try {
    for (const scenario of ['loaded', 'delayed', 'failed-before', 'failed-after', 'timeout', 'disabled', 'legacy', 'missing', 'retry']) {
      const page = await browser.newPage();
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      const requests = [];
      let failed;
      const fallbackFailed = new Promise(resolve => { failed = resolve; });
      page.on('requestfailed', request => { if (request.url().endsWith('/tdb-vimeo.css')) failed(); });
      await page.route('**/*', async route => {
        const file = new URL(route.request().url()).pathname.split('/').pop();
        requests.push(file);
        if (file === 'shared.css') {
          if (['delayed', 'failed-after', 'timeout'].includes(scenario)) await gate;
          if (scenario.startsWith('failed-')) return route.abort();
          return route.fulfill({ contentType: 'text/css', body: ':root { --tdb-vimeo-ui-ready: 1; }' });
        }
        if (file === 'tdb-vimeo-loader.js') return route.fulfill({ contentType: 'text/javascript', body: source });
        if (file === 'tdb-vimeo.css') {
          if (scenario === 'retry' && requests.filter(x => x === file).length === 1) return route.abort();
          return route.fulfill({ contentType: 'text/css', body: ':root { --tdb-vimeo-ui-ready: 1; }' });
        }
        throw Error('Unexpected external request: ' + route.request().url());
      });
      await page.setContent('<section data-vimeo-hero-shell><button data-vimeo-control="play">Play</button></section>');
      await page.evaluate(scenario => {
        window.allowed = false;
        window.cssReads = window.initCalls = window.playCalls = window.failures = 0;
        window.CookieScript = { instance: { currentState: () => ({ categories: allowed ? ['functionality'] : [] }) } };
        window.TDBVimeo = { init() { initCalls++; return { play() { playCalls++; } }; } };
        window.IntersectionObserver = class { observe() {} disconnect() {} };
        console.warn = () => { failures++; };
        const read = window.getComputedStyle.bind(window);
        window.getComputedStyle = (node, ...args) => { if (node === document.documentElement) cssReads++; return read(node, ...args); };
        if (scenario === 'timeout') {
          const later = window.setTimeout.bind(window);
          window.setTimeout = (fn, delay, ...args) => later(fn, delay === 15000 ? 30 : delay, ...args);
        }
        if (['missing', 'retry'].includes(scenario)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.media = 'print'; link.href = 'https://fixture.test/shared.css';
        link.setAttribute('data-tdb-ui-css', '');
        if (scenario !== 'legacy') link.setAttribute('data-tdb-vimeo-ui', '');
        link.onload = () => { link.media = 'all'; if (scenario !== 'legacy') link.dataset.tdbVimeoUiReady = 'true'; };
        link.onerror = () => { link.dataset.tdbVimeoUiFailed = 'true'; };
        document.head.appendChild(link);
      }, scenario);
      if (['loaded', 'disabled'].includes(scenario)) await page.waitForFunction(() => document.querySelector('link').dataset.tdbVimeoUiReady === 'true');
      if (scenario === 'disabled') await page.evaluate(() => { document.querySelector('link').disabled = true; });
      if (scenario === 'legacy') await page.waitForFunction(() => document.querySelector('link').media === 'all');
      if (scenario === 'failed-before') await page.waitForFunction(() => document.querySelector('link').dataset.tdbVimeoUiFailed === 'true');
      await page.addScriptTag({ url: 'https://fixture.test/tdb-vimeo-loader.js' });
      assert.equal(await page.evaluate(() => initCalls), 0, 'styles never bypass consent');
      if (scenario === 'retry') {
        await fallbackFailed;
        await page.waitForFunction(() => !document.querySelector('[data-tdb-vimeo-css]'));
      }
      await page.evaluate(() => { allowed = true; document.querySelector('button').click(); });
      if (['delayed', 'failed-after'].includes(scenario)) {
        assert.equal(await page.evaluate(() => initCalls), 0, 'play waits for the pending stylesheet');
        assert.equal(requests.filter(x => x === 'tdb-vimeo.css').length, 0, 'no premature fallback request');
        release();
      }
      await page.waitForFunction(() => TDBVimeoLoader.status().ready);
      const state = await page.evaluate(() => ({ reads: cssReads, init: initCalls, plays: playCalls }));
      const legacy = ['legacy', 'missing', 'retry'].includes(scenario);
      assert.equal(state.reads, legacy ? (scenario === 'retry' ? 2 : 1) : 0, 'no computed-style checks for the explicit readiness contract');
      assert.equal(state.init, 1); assert.equal(state.plays, 1, 'queued play delivered once');
      const fallback = !['loaded', 'delayed', 'legacy'].includes(scenario);
      assert.equal(requests.filter(x => x === 'tdb-vimeo.css').length, fallback ? (scenario === 'retry' ? 2 : 1) : 0);
      await page.evaluate(() => Promise.all([TDBVimeoLoader.prepare(), TDBVimeoLoader.prepare()]));
      assert.equal(await page.evaluate(() => cssReads), state.reads, 'successful readiness stays cached');
      release();
      await page.close();
      console.log('PASS', scenario, JSON.stringify(state));
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
