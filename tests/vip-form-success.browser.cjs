/* Real layout, mocked Meta API: never submits a form or sends an analytics hit. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const source = fs.readFileSync(path.join(__dirname, '../dist/tdb-vip-form.js'), 'utf8');
const markup = ['email-form', 'vip-drawer-form'].map(id => `<div class="w-form"><form id="${id}"><input name="Name"></form><div class="w-form-done">Thanks</div></div>`).join('');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] });
  try {
    for (const scenario of ['no-pixel', 'inline-hidden', 'css-hidden', 'hidden-parent']) {
      const page = await browser.newPage();
      await page.route('**/*', route => route.abort());
      await page.setContent('<style>.w-form-done{display:none}</style>' + markup);
      await page.evaluate(scenario => {
        window.reads = { styles: 0, rects: 0 };
        window.leads = [];
        window.installPixel = () => { window.fbq = (...args) => leads.push(args); };
        if (scenario !== 'no-pixel') installPixel();
        const css = window.getComputedStyle.bind(window), rects = Element.prototype.getClientRects;
        window.getComputedStyle = (node, ...args) => { if (node.matches('.w-form-done')) reads.styles++; return css(node, ...args); };
        Element.prototype.getClientRects = function() { if (this.matches('.w-form-done')) reads.rects++; return rects.call(this); };
        if (scenario === 'inline-hidden') document.querySelectorAll('.w-form-done').forEach(node => { node.style.display = 'none'; });
        if (scenario === 'hidden-parent') document.querySelectorAll('.w-form-done').forEach(node => { node.style.display = 'block'; node.parentElement.style.display = 'none'; });
      }, scenario);
      await page.addScriptTag({ content: source });
      let initial = await page.evaluate(() => ({ ...reads, leads: leads.length }));
      assert.equal(initial.leads, 0, 'no lead before visible success');
      if (['no-pixel', 'inline-hidden'].includes(scenario)) assert.deepEqual(initial, { styles: 0, rects: 0, leads: 0 });
      if (scenario === 'css-hidden') assert.deepEqual(initial, { styles: 2, rects: 0, leads: 0 });
      if (scenario === 'hidden-parent') assert.deepEqual(initial, { styles: 2, rects: 2, leads: 0 });
      await page.evaluate(() => {
        installPixel();
        reads.styles = reads.rects = 0;
        const node = document.querySelector('.w-form-done');
        node.hidden = true; node.style.display = 'block';
      });
      assert.deepEqual(await page.evaluate(() => ({ ...reads, leads: leads.length })), { styles: 0, rects: 0, leads: 0 }, 'hidden success needs no geometry');
      await page.evaluate(() => {
        const node = document.querySelector('.w-form-done');
        node.parentElement.style.removeProperty('display'); node.hidden = false;
      });
      const visible = await page.evaluate(() => ({ ...reads, leads: leads.slice() }));
      assert.deepEqual(visible, { styles: 1, rects: 1, leads: [['trackSingle', '1326762815429148', 'Lead']] });
      await page.evaluate(() => { const node = document.querySelector('.w-form-done'); node.classList.add('changed'); node.style.color = 'red'; });
      assert.deepEqual(await page.evaluate(() => ({ ...reads, leads: leads.slice() })), visible, 'tracked forms neither reread layout nor send duplicate leads');
      await page.evaluate(() => { const node = document.querySelectorAll('.w-form-done')[1]; node.hidden = true; node.parentElement.style.removeProperty('display'); node.style.display = 'block'; });
      await page.evaluate(() => { document.querySelectorAll('.w-form-done')[1].hidden = false; });
      assert.equal(await page.evaluate(() => leads.length), 2, 'embed and drawer each retain independent once-only tracking');
      await page.close();
      console.log('PASS', scenario, 'initial reads', JSON.stringify(initial));
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
