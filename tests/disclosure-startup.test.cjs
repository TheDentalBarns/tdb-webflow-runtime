const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../src/navbar/native-foundation.js'),'utf8');
function fixture(open){
  const dom=new JSDOM(`<!doctype html><div data-tdb-disclosure-item class="faq3_accordion is-disclosure${open?' is-open':''}"><div role="button" tabindex="0" data-tdb-disclosure-trigger aria-expanded="${open}"><span data-tdb-chevron class="tdb-disclosure-chevron${open?' is-open':''}"></span></div><div data-tdb-disclosure-panel class="tdb-disclosure-panel${open?' is-open':''}"><a href="#">Answer</a></div></div>`,{runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  w.eval(source);d.dispatchEvent(new w.Event('DOMContentLoaded'));w.TDBDisclosure.refresh();
  return {dom,w,item:d.querySelector('[data-tdb-disclosure-item]'),trigger:d.querySelector('[data-tdb-disclosure-trigger]'),panel:d.querySelector('[data-tdb-disclosure-panel]'),chevron:d.querySelector('[data-tdb-chevron]')};
}
test('mount preserves authored open and closed states without enabling animation',()=>{
  for(const open of [false,true]){
    const {dom,w,item,trigger,panel,chevron}=fixture(open);
    assert.equal(trigger.getAttribute('aria-expanded'),String(open));
    assert.equal(panel.hidden,!open);
    assert.equal(panel.inert,!open);
    for(const node of [item,panel,chevron])assert.equal(node.classList.contains('is-open'),open);
    assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'),false);
    w.TDBDisclosure.refresh();
    assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'),false);
    dom.window.close();
  }
});
test('click and keyboard toggles enable animation and keep native state and accessibility aligned',()=>{
  const {dom,w,item,trigger,panel,chevron}=fixture(true);
  panel.querySelector('a').focus();
  trigger.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'),true);
  assert.equal(panel.hidden,true);
  assert.equal(w.document.activeElement,trigger);
  assert.equal(trigger.getAttribute('aria-expanded'),'false');
  for(const node of [item,panel,chevron])assert.equal(node.classList.contains('is-open'),false);
  trigger.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal(panel.hidden,false);
  assert.equal(panel.getAttribute('aria-hidden'),'false');
  for(const node of [item,panel,chevron])assert.equal(node.classList.contains('is-open'),true);
  dom.window.close();
});
test('programmatic setup and disabled controls cannot enable startup motion',()=>{
  const {dom,w,item,trigger,panel}=fixture(false);
  w.TDBDisclosure.mount(trigger).set(true);
  assert.equal(panel.hidden,false);
  assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'),false);
  trigger.setAttribute('aria-disabled','true');
  trigger.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(panel.hidden,false);
  assert.equal(item.hasAttribute('data-tdb-disclosure-interacted'),false);
  dom.window.close();
});
