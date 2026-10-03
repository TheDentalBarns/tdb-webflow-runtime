const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.TDB_JSDOM_PATH || 'jsdom');
const script = fs.readFileSync(path.join(__dirname, '../src/reviews/review-drawer-bridge.js'), 'utf8');
const cms = fs.readFileSync(path.join(__dirname, '../src/reviews/review-cms-source.js'), 'utf8');
const records = [{ id: 'sample-review', name: 'Sample Reviewer', excerpt: 'Care and planning.', excerpts: {} }];
function setup() {
  const dom = new JSDOM(`<section data-tdb-review-introduction><button data-tdb-review-trigger></button><blockquote data-tdb-review-excerpt>Care and planning.</blockquote><span data-tdb-review-author>Sample Reviewer</span></section>`, { url:'https://dentalbarns.webflow.io/',runScripts:'outside-only' });
  const w=dom.window; w.eval(cms); const resolveIdentity=w.TDBReviewCMS.resolveIdentity;
  w.TDBReviewCMS={resolveIdentity,load:async()=>({records})}; w.eval(script);
  return {dom,w,root:w.document.querySelector('section'),trigger:w.document.querySelector('button')};
}
test('drawer follows native CMS quote identity without replacing the selected quote', async () => {
  const {dom,w,root,trigger}=setup();let received;
  w.TDBReviewDrawer={version:'2.0.0-cms',open:async(t,id)=>received=id};
  const before=root.innerHTML;await w.TDBReviewDrawerBridge.open({trigger});
  assert.equal(received,'sample-review');assert.equal(root.innerHTML,before);
  root.querySelector('blockquote').textContent='New CMS excerpt';
  await w.TDBReviewDrawerBridge.open({trigger});assert.equal(received,'');dom.window.close();
});
test('permission withdrawal during CMS fetch prevents drawer download and opening', async () => {
  const {dom,w,trigger}=setup();let release,opened=0;
  w.TDBReviewCMS.load=()=>new Promise(resolve=>release=()=>resolve({records}));
  w.TDBReviewDrawer={version:'2.0.0-cms',open:()=>opened++};
  const controller=new w.AbortController();const pending=w.TDBReviewDrawerBridge.open({trigger,signal:controller.signal});
  controller.abort();release();await assert.rejects(pending,{name:'AbortError'});assert.equal(opened,0);dom.window.close();
});
test('legacy snapshot drawer cannot silently replace the CMS drawer', async () => {
  const {dom,w,trigger}=setup();w.TDBReviewDrawer={version:'1.9.9'};
  await assert.rejects(w.TDBReviewDrawerBridge.open({trigger}),/previous review drawer/);dom.window.close();
});
