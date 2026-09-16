'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('../../tools/runtime-tests/node_modules/jsdom');
const fixture=require('./published-pricing.fixture.json');
const core=fs.readFileSync(require.resolve('../../src/calculator/core.js'),'utf8'),ui=fs.readFileSync(require.resolve('../../src/calculator/ui.js'),'utf8');
async function setup(options={}){
 const dom=new JSDOM('<!doctype html><body><main data-tdb-calculator="inline" data-finance="true"></main><a id="open" data-tdb-calc-open href="/dental-cost-lichfield#treatment-calculator">Open</a><a id="restricted" data-tdb-calc-open data-restorative="false" data-treatment="bonding" href="#treatment-calculator">Cosmetic</a></body>',{url:'https://example.org/dental-cost-lichfield',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 let viewport;
 if(options.viewport)w.IntersectionObserver=class{constructor(callback){viewport=visible=>callback([{isIntersecting:visible}]);}observe(){}};
 for(const f of fixture){const el=d.createElement('div');el.hidden=true;el.setAttribute('data-tdb-calc-record',f.record);for(const [k,v]of Object.entries(f))if(!['record','whitening','hygiene'].includes(k))el.setAttribute('data-'+k,v);d.body.append(el);for(const key of ['whitening','hygiene'])if(f[key]){const m=d.createElement('span');m.setAttribute('data-tdb-calc-included',key);m.setAttribute('data-record',f.record);d.body.append(m);}}
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.eval(core);w.eval(ui);await new Promise(r=>setImmediate(r));
 return {dom,w,d,viewport,root:d.querySelector('main'),choose(selector){const e=d.querySelector('main '+selector);assert.ok(e,selector);e.click();},text(){return d.querySelector('main [data-output=summary]').textContent;}};
}
test('progressive UI calculates through user controls and keeps included whitening explicit',async()=>{
 const x=await setup();try{
  assert.equal(x.root.querySelector('[data-select]'),null);assert.equal(x.root.querySelector('.tdbc-summary'),null);assert.equal(x.root.querySelector('.tdbc-live'),null);
  x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');assert.match(x.text(),/1,245/);
  x.choose('[data-select=aligners]');assert.match(x.text(),/4,645.*6,845/);assert.equal(x.root.querySelector('[data-select=whitening]').disabled,true);
  x.choose('[data-select=aligners]');assert.equal(x.root.querySelector('[data-select=whitening]').checked,true);assert.match(x.text(),/1,245/);
  x.choose('[data-finance]');assert.equal(x.root.querySelector('[data-range=term]').value,'12');
  const dep=x.root.querySelector('[data-range=deposit]');dep.value='55000';dep.dispatchEvent(new x.w.Event('input',{bubbles:true}));assert.match(x.root.querySelector('[data-output=finance]').textContent,/57.91/);
  x.choose('[data-action=reset]');assert.equal(x.root.querySelector('.tdbc-summary'),null);assert.equal(x.root.querySelector('[data-select]'),null);
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
  assert.ok(dialog.querySelector('[data-finance]'));
  let vip=0;x.w.TDBVIPDrawer={open(){vip++;}};x.d.addEventListener('click',e=>{if(e.target.closest('a[href="#VIP"]')){e.preventDefault();e.stopPropagation();}},true);dialog.querySelector('[data-action=vip]').click();assert.equal(vip,1);assert.equal(dialog.open,false);
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
  dialog.querySelector('[data-category=cosmetic]').click();dialog.querySelector('[data-select=whitening]').click();assert.equal(dialog.querySelector('[data-finance]'),null);
 }finally{x.dom.window.close();}
});

test('friendly complexity, no whitening expansion and persistent slider focus',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');assert.equal(x.root.querySelector('.tdbc-summary'),null);x.choose('[data-select=whitening]');assert.equal(x.root.querySelector('[data-node="option-whitening"] [data-panel]'),null);assert.match(x.root.querySelector('[data-output=duration]').textContent,/7 weeks/);
 x.choose('[data-select=bonding]');const choice=x.root.querySelector('[data-tier=bonding][value="1"]');choice.click();assert.equal(x.root.querySelector('[data-tier=bonding][value="1"]'),choice);assert.equal(choice.checked,true);assert.match(x.root.querySelector('.tdbc-complexity').textContent,/Small alignment tweaks|Small chips or blemishes/);
 x.choose('[data-finance]');const slider=x.root.querySelector('[data-range=deposit]');slider.focus();slider.value='60000';slider.dispatchEvent(new x.w.Event('input',{bubbles:true}));assert.equal(x.root.querySelector('[data-range=deposit]'),slider);assert.equal(x.d.activeElement,slider);
 x.choose('[data-category=restorative]');x.choose('[data-select=replacement]');assert.equal(x.root.querySelector('[data-tier=replacement]'),null);assert.match(x.root.querySelector('[data-node="option-replacement"]').textContent,/495/);
 }finally{x.dom.window.close();}
});
test('tooltips close on page interaction and calculator controls use shared navigation focus',async()=>{
 const x=await setup();try{let focus=0,release=0;x.w.TDBNavScroll={focus(){focus++;},release(){release++;}};
 x.choose('[data-category=cosmetic]');const info=x.root.querySelector('[data-action=info]');info.dispatchEvent(new x.w.Event('pointerdown',{bubbles:true}));info.click();assert.equal(info.getAttribute('aria-expanded'),'true');assert.ok(focus);
 x.d.body.dispatchEvent(new x.w.Event('pointerdown',{bubbles:true}));assert.equal(info.getAttribute('aria-expanded'),'false');assert.ok(release);
 }finally{x.dom.window.close();}
});
test('entering the section holds navigation away without interaction, and restart collapses and returns to the start',async()=>{
 const x=await setup({viewport:true});try{
 let held,release=0,scroll;x.w.TDBNavScroll={focus(callback,hold){held=hold;},release(){release++;}};x.w.lenis={scrollTo(target,options){scroll={target,options};}};
 x.viewport(true);assert.ok(x.d.documentElement.classList.contains('tdbc-chrome-away'));assert.equal(held(),true);
 x.d.body.dispatchEvent(new x.w.Event('pointerdown',{bubbles:true}));assert.equal(release,0);
 x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');x.choose('[data-action=reset]');
 assert.equal(x.root.querySelector('.tdbc-live'),null);assert.equal(x.root.querySelector('.tdbc-summary'),null);assert.equal(x.root.querySelector('[data-select]'),null);assert.equal(scroll.target,x.root);assert.equal(scroll.options.immediate,true);
 assert.ok(x.d.documentElement.classList.contains('tdbc-chrome-away'));x.viewport(false);assert.equal(x.d.documentElement.classList.contains('tdbc-chrome-away'),false);assert.equal(release,1);
 }finally{x.dom.window.close();}
});
test('the target date follows the slider and an earlier attempt shows the deadline message',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');
 const target=x.root.querySelector('[data-date=target]'),slider=x.root.querySelector('[data-range=completion]'),initial=target.value;
 assert.equal(slider.value,'0');assert.equal(target.value,target.min);
 slider.dispatchEvent(new x.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(x.root.querySelector('.tdbc-timing-warning').hidden,false);
 slider.value='21';slider.dispatchEvent(new x.w.Event('input',{bubbles:true}));assert.equal(x.root.querySelector('[data-range=completion]'),slider);assert.ok(target.value>initial);assert.equal(x.root.querySelector('.tdbc-timing-warning').hidden,true);
 target.value='2020-01-01';target.dispatchEvent(new x.w.Event('change',{bubbles:true}));assert.equal(x.root.querySelector('[data-date=target]').value,initial);assert.equal(x.root.querySelector('.tdbc-timing-warning').hidden,false);
 x.choose('[data-finance]');const term=x.root.querySelector('[data-range=term]');term.value='3';term.dispatchEvent(new x.w.Event('input',{bubbles:true}));x.choose('[data-finance]');x.choose('[data-finance]');assert.equal(x.root.querySelector('[data-range=term]').value,'12');assert.match(x.root.querySelector('[data-output=finance]').textContent,/Interest charges£0/);
 }finally{x.dom.window.close();}
});
