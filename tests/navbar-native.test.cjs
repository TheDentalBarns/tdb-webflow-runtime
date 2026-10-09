const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dist/tdb-navbar-native.js'), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
const navId = '83119b7e-a73e-66e3-0fce-5279000d146c';
const servicesId = '83119b7e-a73e-66e3-0fce-5279000d1472';
const discoverId = '83119b7e-a73e-66e3-0fce-5279000d149c';
const markup = `<div class="navbar10_component w-nav" data-tdb-navbar-native data-w-id="${navId}" transparent-nav="true" data-duration="500">
  <div class="navbar10_menu-dropdown w-dropdown" data-w-id="${servicesId}"><div class="navbar10_dropdown-toggle w-dropdown-toggle" aria-expanded="false"><span data-tdb-chevron></span></div><nav class="w-dropdown-list"><a href="/services/smile-design">Service</a></nav></div><div class="accordion-spacer services"></div>
  <div class="navbar10_menu-dropdown w-dropdown" data-w-id="${discoverId}"><div class="navbar10_dropdown-toggle w-dropdown-toggle" aria-expanded="false"></div><nav class="w-dropdown-list"><a href="/about-us">About</a></nav></div><div class="accordion-spacer discover"></div>
  <div class="navbar10_menu-button w-nav-button" aria-expanded="false"><div class="menu-icon1_line-top"></div></div>
  <div data-w-id="unrelated-inside-nav"></div></div><div data-w-id="outside-nav"></div>`;

test('built CSS preserves descendant selectors and separate hamburger clocks', () => {
  const css=fs.readFileSync(path.join(root,'dist/tdb-navbar-native.css'),'utf8');
  const dom=new JSDOM('<!doctype html><style>'+css+'</style>'+markup);
  const d=dom.window.document, line=d.querySelector('.menu-icon1_line-top');
  const rules=[...d.styleSheets[0].cssRules].filter(r=>r.selectorText);
  assert(rules.some(r=>line.matches(r.selectorText) && r.style.getPropertyValue('translate')==='0 0'));
  assert(rules.some(r=>line.matches(r.selectorText) && r.style.getPropertyValue('transition').includes('translate 600ms')));
  d.querySelector('.w-nav-button').setAttribute('data-tdb-expanded','true');
  assert(rules.some(r=>line.matches(r.selectorText) && r.style.getPropertyValue('transition-duration')==='400ms,600ms'));
  assert(rules.some(r=>line.matches(r.selectorText) && r.style.getPropertyValue('rotate')==='-45deg'));
  dom.window.close();
});

test('parser-time handoff detaches only audited handles, preserving native nodes and settings', async () => {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {runScripts:'outside-only'});
  dom.window.eval(source);
  const doc = dom.window.document;
  doc.body.innerHTML = markup;
  const nav = doc.querySelector('.w-nav'), link = doc.querySelector('a');
  await flush();
  assert.equal(doc.querySelectorAll('[data-tdb-nav-previous-id]').length, 3);
  assert.deepEqual([...doc.querySelectorAll('[data-w-id]')].map(e=>e.dataset.wId), ['unrelated-inside-nav','outside-nav']);
  assert.equal(nav, doc.querySelector('.w-nav'));
  assert.equal(link, doc.querySelector('a'));
  assert.equal(link.getAttribute('href'), '/services/smile-design');
  assert.equal(nav.getAttribute('data-duration'), '500');
  assert.equal(nav.getAttribute('transparent-nav'), 'true');
  assert.equal(doc.querySelector('.w-dropdown-list').getAttribute('style'), null);
  dom.window.close();
});

test('native state drives individual spacers, hamburger closing and rapid reversals without owning input', async () => {
  const dom = new JSDOM('<!doctype html><html><body>'+markup+'</body></html>', {runScripts:'outside-only'});
  const {document:doc} = dom.window;
  dom.window.eval(source);
  const trigger=doc.querySelector('.w-dropdown-toggle'), spacer=doc.querySelector('.services');
  for (const open of [true,false,true,false]) {
    trigger.classList.toggle('w--open',open);
    trigger.setAttribute('aria-expanded',String(open));
    await flush();
    assert.equal(spacer.dataset.tdbExpanded,String(open));
    assert.equal(doc.querySelector('.discover').dataset.tdbExpanded,'false');
  }
  const menu=doc.querySelector('.w-nav-button');
  menu.classList.add('w--open');menu.setAttribute('aria-expanded','true');await flush();
  assert.equal(menu.dataset.tdbExpanded,'true');
  menu.classList.remove('w--open');await flush();
  assert.equal(menu.dataset.tdbExpanded,'false','closing follows native class immediately, before native aria cleanup');
  assert.equal(menu.getAttribute('aria-expanded'),'true','foundation must not rewrite Webflow ARIA');
  const click=new dom.window.MouseEvent('click',{bubbles:true,cancelable:true});
  assert.equal(trigger.dispatchEvent(click),true,'native click remains untouched');
  const api=dom.window.TDBNavbarNative;dom.window.eval(source);
  assert.equal(dom.window.TDBNavbarNative,api,'loading again is idempotent');
  dom.window.close();
});

test('shared observer works without a navbar and emits only state changes', async () => {
  const dom=new JSDOM('<!doctype html><button aria-expanded="false">FAQ</button>',{runScripts:'outside-only'});
  dom.window.eval(source);
  const trigger=dom.window.document.querySelector('button'), seen=[];
  const stop=dom.window.TDBDisclosure.observe(trigger,open=>seen.push(open));
  trigger.classList.add('unrelated');await flush();
  trigger.setAttribute('aria-expanded','true');await flush();
  assert.deepEqual(seen,[false,true]);
  stop();trigger.setAttribute('aria-expanded','false');await flush();
  assert.deepEqual(seen,[false,true]);
  dom.window.close();
});
