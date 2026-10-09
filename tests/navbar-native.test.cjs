const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(process.env.TDB_NAV_FOUNDATION_FILE || path.join(root, 'dist/tdb-navbar-native.js'), 'utf8');
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

test('parser-time setup preserves authored IDs, native nodes and settings after IX2 retirement', async () => {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {runScripts:'outside-only'});
  dom.window.eval(source);
  const doc = dom.window.document;
  doc.body.innerHTML = markup;
  const nav = doc.querySelector('.w-nav'), link = doc.querySelector('a');
  await flush();
  assert.equal(doc.querySelectorAll('[data-tdb-nav-previous-id]').length, 0);
  assert.deepEqual([...doc.querySelectorAll('[data-w-id]')].map(e=>e.dataset.wId), [navId,servicesId,discoverId,'unrelated-inside-nav','outside-nav']);
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

function solidSurfaceFixture() {
  const dom=new JSDOM('<!doctype html>'+markup,{runScripts:'outside-only'});
  const {document:doc}=dom.window, nav=doc.querySelector('.w-nav');
  const media={matches:true,listeners:[],addEventListener(type,callback){this.listeners.push(callback);}};
  dom.window.matchMedia=()=>media;
  nav.insertAdjacentHTML('afterbegin','<div class="tdb-nav-bar-glass is-nav-solid"></div><nav class="navbar10_menu is-menu-solid"><div class="navbar10_menu-left"></div></nav>');
  const glass=nav.querySelector('.tdb-nav-bar-glass'), menu=nav.querySelector('.navbar10_menu');
  const finished=[];
  for (const surface of [glass,menu]) {
    surface.getAnimations=()=>['backdrop-filter','-webkit-backdrop-filter','transform','height','background-color',undefined].map(transitionProperty=>({
      transitionProperty, finish(){finished.push({surface,transitionProperty,idle:surface.hasAttribute('data-tdb-nav-blur-idle')});}
    }));
  }
  function end(surface,animationName,pseudoElement='') {
    const event=new dom.window.Event('animationend',{bubbles:true});
    Object.assign(event,{animationName,pseudoElement});
    surface.dispatchEvent(event);
  }
  dom.window.eval(source);
  return {dom,doc,nav,media,glass,menu,finished,end,button:nav.querySelector('.navbar10_menu-button')};
}

test('solid mobile surfaces retire blur only after their own fade and restore before native ARIA closing cleanup', async () => {
  const {dom,nav,glass,menu,button,finished,end}=solidSurfaceFixture();
  const idle='data-tdb-nav-blur-idle';
  button.classList.add('w--open');button.setAttribute('aria-expanded','true');await flush();
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,0,'opening remains blurred');
  end(glass,'tdb-mobile-nav-text-motion');
  end(menu.querySelector('.navbar10_menu-left'),'tdb-nav-menu-open');
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,0,'unrelated/child animations cannot retire blur');
  end(glass,'tdb-nav-bar-open');
  assert.equal(glass.hasAttribute(idle),true);
  assert.equal(menu.hasAttribute(idle),false,'each surface follows its own fade');
  end(menu,'tdb-nav-menu-open');
  assert.equal(menu.hasAttribute(idle),true);
  assert.deepEqual(finished.map(x=>x.transitionProperty),['backdrop-filter','-webkit-backdrop-filter','backdrop-filter','-webkit-backdrop-filter']);
  assert(finished.every(x=>x.idle));
  end(menu,'tdb-nav-menu-open');
  assert.equal(finished.length,4,'duplicate completion is idempotent');
  button.classList.remove('w--open');await flush();
  assert.equal(button.getAttribute('aria-expanded'),'true','native closing still owns ARIA');
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,0);
  assert.equal(finished.length,8);
  assert(finished.slice(4).every(x=>!x.idle),'restoration finishes only the filter transition');
  end(glass,'tdb-nav-bar-open');end(menu,'tdb-nav-menu-open');
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,0,'late completion after close is ignored');
  assert.equal(glass.getAttribute('style'),null);
  assert.equal(menu.getAttribute('style'),null,'native transition and transform styles are never overwritten');
  dom.window.close();
});

test('blur retirement preserves top-of-page fades, interrupted openings and breakpoint changes', async () => {
  const {dom,nav,glass,menu,button,media,end}=solidSurfaceFixture();
  const idle='data-tdb-nav-blur-idle';
  button.classList.add('w--open');await flush();
  end(menu,'tdb-menu-clear-to-solid');
  end(glass,'tdb-nav-bar-open','::before');
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,0);
  button.classList.remove('w--open');await flush();
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,0,'an interrupted opening adds no delayed flag');
  button.classList.add('w--open');await flush();
  end(glass,'tdb-nav-bar-open');end(menu,'tdb-nav-menu-open');
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,2);
  media.matches=false;media.listeners.forEach(callback=>callback());
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,0,'crossing the mobile surface boundary restores blur');
  end(glass,'tdb-nav-bar-open');end(menu,'tdb-nav-menu-open');
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,0,'desktop/tablet cannot acquire a mobile flag');
  media.matches=true;media.listeners.forEach(callback=>callback());
  assert.equal(nav.querySelectorAll(`[${idle}]`).length,0,'return to mobile starts with the normal surface');
  end(glass,'tdb-nav-bar-open');
  assert.equal(glass.hasAttribute(idle),true);
  dom.window.close();
});
