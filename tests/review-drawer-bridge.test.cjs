const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.TDB_JSDOM_PATH || 'jsdom');
const script = fs.readFileSync(path.join(__dirname, '../src/reviews/review-drawer-bridge.js'), 'utf8');
const records = [{ id: 'sample-review', name: 'Sample Reviewer', excerpt: 'Care and planning.', excerpts: {} }];
function setup() {
  const dom = new JSDOM(`<section data-tdb-review-introduction><div data-tdb-review-trigger></div><blockquote data-tdb-review-excerpt>Care and planning.</blockquote><span data-tdb-review-author>Sample Reviewer</span></section><script type="application/json" data-tdb-review-drawer-data>${JSON.stringify({ records })}</script>`, { runScripts: 'outside-only' });
  dom.window.eval(script);
  return { dom, w: dom.window, root: dom.window.document.querySelector('section'), trigger: dom.window.document.querySelector('[data-tdb-review-trigger]') };
}
test('drawer identity follows the native CMS text without selecting or replacing it', async () => {
  const { dom, w, root, trigger } = setup(); let received;
  w.TDBPowerSnippets = { loadDrawer: async () => ({ open: async (t, id) => { received = id; } }) };
  const before = root.innerHTML;
  await w.TDBReviewDrawerBridge.open({ trigger });
  assert.equal(received, 'sample-review'); assert.equal(root.innerHTML, before);
  root.querySelector('blockquote').textContent = 'A newly edited CMS excerpt';
  await w.TDBReviewDrawerBridge.open({ trigger }); assert.equal(received, '');
  assert.equal(w.TDBReviewDrawerBridge.resolveIdentity([...records, ...records], root), '');
  dom.window.close();
});
test('withdrawal while the drawer is loading prevents it opening', async () => {
  const { dom, w, trigger } = setup(); let release, opened = 0;
  w.TDBPowerSnippets = { loadDrawer: () => new Promise(resolve => { release = resolve; }) };
  const controller = new w.AbortController();
  const pending = w.TDBReviewDrawerBridge.open({ trigger, signal: controller.signal });
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.abort(); release({ open: () => { opened++; } });
  await assert.rejects(pending, { name: 'AbortError' }); assert.equal(opened, 0);
  dom.window.close();
});
