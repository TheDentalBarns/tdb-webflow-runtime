/* Run with node tests/consent-measurements.browser.cjs; requires Playwright. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const source = fs.readFileSync(process.env.TDB_CONSENT_ARTIFACT || 'dist/tdb-consent-startup.min.js', 'utf8');
const markup = fs.readFileSync('src/consent/banner.html', 'utf8');
const css = fs.readFileSync('src/consent/banner.designer.css', 'utf8');
const html = `<!doctype html><style>${css}
 body{margin:0;padding-right:3px}main{height:4000px}
 #nested{height:80px;overflow-y:auto}#nested div{height:300px}
 </style><body data-lenis-prevent="existing"><a id="settings" href="#">Settings</a>
 <main></main><div id="nested"><div>Nested scroll area</div></div>${markup}</body>`;

function assertCleanReads(reads, label) {
  assert.deepEqual(reads.map(read => read.kind), ['width', 'padding'], label);
  assert.deepEqual(reads.flatMap(read => read.pending), [], `${label}: layout reads must precede DOM/style writes`);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.TDB_CHROMIUM ? { executablePath: process.env.TDB_CHROMIUM } : {})
  });
  try {
    for (const viewport of [{width:1440,height:900}, {width:390,height:844}]) {
      const context = await browser.newContext({viewport, isMobile:viewport.width < 768, hasTouch:viewport.width < 768});
      await context.route('https://consent.test/**', route => route.fulfill({contentType:'text/html',body:html}));
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('https://consent.test/');
      const initial = await page.evaluate(source => {
        scrollTo(0,600);
        const html = document.documentElement;
        const width = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth').get;
        const getStyle = window.getComputedStyle.bind(window);
        const observer = new MutationObserver(() => {});
        observer.observe(document, {subtree:true,childList:true,attributes:true,characterData:true});
        window.measurements = [];
        const record = kind => measurements.push({kind, pending:observer.takeRecords().map(record =>
          `${record.target.nodeName}:${record.attributeName || record.type}`)});
        Object.defineProperty(html, 'clientWidth', {get() {record('width');return width.call(this);}});
        window.getComputedStyle = (node, ...args) => {
          if (node === document.body) record('padding');
          return getStyle(node, ...args);
        };
        window.resetMeasurements = () => {measurements.length = 0;observer.takeRecords();};
        const before = {y:scrollY,padding:getStyle(document.body).paddingRight,gap:innerWidth-width.call(html)};
        resetMeasurements();
        (0, eval)(source);
        return {before,reads:measurements,compensation:html.style.getPropertyValue('--tdb-scroll-lock-padding'),inert:document.getElementById('tdb-consent-root').inert};
      }, source);
      assertCleanReads(initial.reads, 'initial consent');
      assert.equal(initial.compensation, `${3 + initial.before.gap}px`);
      assert.equal(initial.inert,false);
      await page.waitForFunction(() => document.activeElement.id === 'tdb-consent-dialog');
      await page.locator('#cookiescript_reject').click();
      await page.waitForFunction(() => !TDBScrollLock.active);
      assert.deepEqual(await page.evaluate(() => ({y:scrollY,padding:getComputedStyle(document.body).paddingRight,
        lenis:document.body.getAttribute('data-lenis-prevent'),inert:document.getElementById('tdb-consent-root').inert,
        action:CookieScript.instance.currentState().action})),
        {y:initial.before.y,padding:'3px',lenis:'existing',inert:true,action:'reject'});

      // Recompute unlocked padding after a change; never accumulate old compensation.
      await page.evaluate(() => {document.body.style.paddingRight = '7px';document.getElementById('settings').focus({preventScroll:true});});
      const reopened = await page.evaluate(() => {
        resetMeasurements();CookieScript.instance.show();
        return {reads:measurements,compensation:document.documentElement.style.getPropertyValue('--tdb-scroll-lock-padding')};
      });
      assertCleanReads(reopened.reads, 'reopened consent');
      assert.equal(reopened.compensation, `${7 + initial.before.gap}px`);
      await page.evaluate(() => CookieScript.instance.hide());
      await page.waitForFunction(() => !TDBScrollLock.active);
      assert.equal(await page.evaluate(() => document.activeElement.id),'settings');

      const overlapping = await page.evaluate(() => {
        resetMeasurements();
        const nested = document.getElementById('nested');
        window.releaseDrawer = TDBScrollLock.acquire({allow:[nested]});
        const first = measurements.slice();
        resetMeasurements();CookieScript.instance.show();
        const additional = measurements.slice();
        function blocked(deltaY) {
          const event = new WheelEvent('wheel',{deltaY,bubbles:true,cancelable:true});
          nested.dispatchEvent(event);return event.defaultPrevented;
        }
        nested.scrollTop = 20;
        const inside = blocked(10);
        nested.scrollTop = nested.scrollHeight;
        const edge = blocked(10);
        return {first,additional,inside,edge};
      });
      assertCleanReads(overlapping.first, 'standalone drawer owner');
      assert.deepEqual(overlapping.additional, [], 'additional owners must not remeasure or relock');
      assert.equal(overlapping.inside,false);assert.equal(overlapping.edge,true);
      await page.evaluate(() => CookieScript.instance.hide());
      await page.waitForFunction(() => document.getElementById('tdb-consent-root').inert);
      assert.equal(await page.evaluate(() => TDBScrollLock.active),true);
      await page.evaluate(() => {releaseDrawer();releaseDrawer();});
      assert.deepEqual(await page.evaluate(() => ({locked:TDBScrollLock.active,y:scrollY,
        padding:getComputedStyle(document.body).paddingRight,lenis:document.body.getAttribute('data-lenis-prevent')})),
        {locked:false,y:initial.before.y,padding:'7px',lenis:'existing'});
      assert.deepEqual(errors,[]);

      // A saved decision stays hidden and inert without taking a lock.
      await page.reload();
      await page.evaluate(source => (0, eval)(source),source);
      assert.deepEqual(await page.evaluate(() => ({locked:TDBScrollLock.active,
        hidden:document.getElementById('tdb-consent-root').getAttribute('aria-hidden'),
        inert:document.getElementById('tdb-consent-root').inert})),{locked:false,hidden:'true',inert:true});
      console.log(`PASS ${viewport.width}px: reads before writes, current padding, focus/scroll restoration, nested scrolling, overlapping owners, saved choice.`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode = 1;});
