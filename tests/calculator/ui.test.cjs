'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('../../tools/runtime-tests/node_modules/jsdom');
const fixture=require('./published-pricing.fixture.json');
const core=fs.readFileSync(require.resolve('../../src/calculator/core.js'),'utf8'),ui=fs.readFileSync(require.resolve('../../src/calculator/ui.js'),'utf8');
async function setup(){
 const dom=new JSDOM('<!doctype html><body><main data-tdb-calculator="inline" data-finance="true"></main><a id="open" data-tdb-calc-open href="/dental-cost-lichfield#treatment-calculator">Open</a><a id="restricted" data-tdb-calc-open data-restorative="false" data-treatment="bonding" href="#treatment-calculator">Cosmetic</a></body>',{url:'https://example.org/dental-cost-lichfield',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 for(const f of fixture){const el=d.createElement('div');el.hidden=true;el.setAttribute('data-tdb-calc-record',f.record);for(const [k,v]of Object.entries(f))if(!['record','whitening','hygiene'].includes(k))el.setAttribute('data-'+k,v);d.body.append(el);for(const key of ['whitening','hygiene'])if(f[key]){const m=d.createElement('span');m.setAttribute('data-tdb-calc-included',key);m.setAttribute('data-record',f.record);d.body.append(m);}}
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.eval(core);w.eval(ui);await new Promise(r=>setImmediate(r));
 return {dom,w,d,root:d.querySelector('main'),choose(selector){const e=d.querySelector('main '+selector);assert.ok(e,selector);e.click();},text(){return d.querySelector('main [data-output=summary]').textContent;}};
}
test('progressive UI calculates through user controls and keeps included whitening explicit',async()=>{
 const x=await setup();try{
  assert.equal(x.root.querySelector('[data-select]'),null);assert.equal(x.root.querySelector('.tdbc-starting-option').open,false);
  x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');assert.match(x.text(),/1,245/);
  x.choose('[data-select=aligners]');assert.match(x.text(),/4,645.*6,845/);assert.equal(x.root.querySelector('[data-select=whitening]').disabled,true);
  x.choose('[data-select=aligners]');assert.equal(x.root.querySelector('[data-select=whitening]').checked,true);assert.match(x.text(),/1,245/);
  x.choose('[data-action=finance-yes]');assert.equal(x.root.querySelector('[data-range=term]').value,'12');
  const dep=x.root.querySelector('[data-range=deposit]');dep.value='10000';dep.dispatchEvent(new x.w.Event('input',{bubbles:true}));assert.match(x.root.querySelector('[data-output=finance]').textContent,/57.91/);
  x.choose('[data-action=reset]');assert.match(x.text(),/Choose your treatments/);assert.equal(x.root.querySelector('[data-select]'),null);
 }finally{x.dom.window.close();}
});
test('drawer preserves estimate, discloses context conflicts, restores focus and hands off VIP',async()=>{
 const x=await setup();try{
  x.choose('[data-category=restorative]');x.choose('[data-select=fillings]');
  const trigger=x.d.getElementById('restricted');await x.w.TDBCalculator.open(trigger);
  const dialog=x.d.querySelector('dialog');assert.equal(dialog.open,true);assert.equal(x.d.documentElement.style.overflow,'hidden');
  assert.match(dialog.textContent,/Your existing estimate is saved/);assert.match(dialog.textContent,/New fillings/);
  dialog.dispatchEvent(new x.w.Event('cancel',{cancelable:true}));assert.equal(dialog.open,false);assert.equal(x.d.activeElement,trigger);assert.equal(x.d.documentElement.style.overflow,'');
  await x.w.TDBCalculator.open(trigger);dialog.querySelector('[data-action=context]').click();assert.equal(dialog.querySelector('[data-category=restorative]'),null);assert.equal(dialog.querySelector('[data-select=bonding]').checked,true);
  assert.equal(dialog.querySelector('[data-action=finance-yes]'),null);
  let vip=0;x.w.TDBVIPDrawer={open(){vip++;}};dialog.querySelector('[data-action=vip]').click();assert.equal(vip,1);assert.equal(dialog.open,false);
  assert.ok(x.w.sessionStorage.getItem('tdb-treatment-estimate-v1'));assert.match(x.text(),/Composite bonding/);
 }finally{x.dom.window.close();}
});
test('CMS strings are text, never executable markup',async()=>{
 const x=await setup();try{
  const row=x.d.querySelector('[data-tdb-calc-record="681ce51276b22da0b0660090"]');row.setAttribute('data-label','<img src=x onerror=alert(1)>');x.w.TDBCalculator.refresh();await new Promise(r=>setImmediate(r));
  x.choose('[data-category=cosmetic]');assert.match(x.root.textContent,/<img src=x/);assert.equal(x.root.querySelector('img'),null);
 }finally{x.dom.window.close();}
});
test('Webflow omitted boolean markers override stale attribute defaults',async()=>{
 const x=await setup();try{
  const container=x.d.createElement('section');container.setAttribute('data-tdb-calc-entry','true');
  container.innerHTML='<div hidden data-tdb-calc-config="true"><span data-tdb-calc-toggle="cosmetic"></span></div><a href="#treatment-calculator" data-finance="true" data-restorative="true">Open configured calculator</a>';
  x.d.body.append(container);await x.w.TDBCalculator.open(container.querySelector('a'));
  const dialog=x.d.querySelector('dialog');assert.ok(dialog.querySelector('[data-category=cosmetic]'));assert.equal(dialog.querySelector('[data-category=restorative]'),null);
  dialog.querySelector('[data-select=whitening]').click();assert.equal(dialog.querySelector('[data-action=finance-yes]'),null);
 }finally{x.dom.window.close();}
});
