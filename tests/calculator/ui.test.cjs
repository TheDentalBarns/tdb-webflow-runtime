'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('../../tools/runtime-tests/node_modules/jsdom');
const fixture=require('./published-pricing.fixture.json');
const core=fs.readFileSync(require.resolve('../../src/calculator/core.js'),'utf8'),ui=fs.readFileSync(require.resolve('../../src/calculator/ui.js'),'utf8');
async function setup(options={}){
 const dom=new JSDOM('<!doctype html><body><main data-tdb-calculator="inline" data-finance="true"></main><a id="open" data-tdb-calc-open href="/dental-cost-lichfield#treatment-calculator">Open</a><a id="restricted" data-tdb-calc-open data-restorative="false" data-treatment="bonding" href="#treatment-calculator">Cosmetic</a></body>',{url:'https://example.org/dental-cost-lichfield',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;
 w.fetch=options.fetch||async function(){return {ok:true,text:async()=>'<div data-banner-field="slug">active</div>'};};
 if(options.clock)w.Date.now=()=>options.clock.now;
 let viewport;
 if(options.viewport)w.IntersectionObserver=class{constructor(callback){viewport=visible=>callback([{isIntersecting:visible}]);}observe(){}};
 for(const f of fixture){const el=d.createElement('div');el.hidden=true;el.setAttribute('data-tdb-calc-record',f.record);for(const [k,v]of Object.entries(f))if(!['record','whitening','hygiene'].includes(k))el.setAttribute('data-'+k,v);d.body.append(el);for(const key of ['whitening','hygiene'])if(f[key]){const m=d.createElement('span');m.setAttribute('data-tdb-calc-included',key);m.setAttribute('data-record',f.record);d.body.append(m);}}
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.eval(core);w.eval(ui);await new Promise(r=>setImmediate(r));
 return {dom,w,d,viewport,root:d.querySelector('main'),choose(selector){const e=d.querySelector('main '+selector);assert.ok(e,selector);e.click();},text(){return d.querySelector('main [data-output=summary]').textContent;}};
}
test('progressive UI calculates through user controls and keeps included whitening explicit',async()=>{
 const x=await setup();try{
  assert.equal(x.root.querySelector('[data-select]'),null);assert.equal(x.root.querySelector('.tdbc-summary'),null);assert.equal(x.root.querySelector('.tdbc-live').classList.contains('has-estimate'),false);
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
test('the first outside tap dismisses a tooltip without activating the page; the next tap works',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');const info=x.root.querySelector('[data-action=info]');
 const menu=x.d.createElement('button');menu.textContent='Menu';x.d.body.append(menu);
 let clicks=0,downs=0,ups=0;menu.addEventListener('click',()=>clicks++);menu.addEventListener('pointerdown',()=>downs++);menu.addEventListener('pointerup',()=>ups++);
 const tap=()=>{for(const type of ['pointerdown','pointerup'])menu.dispatchEvent(new x.w.MouseEvent(type,{bubbles:true,cancelable:true}));menu.click();};
 info.click();const panel=x.root.querySelector('.tdbc-info.is-open [role=tooltip]');panel.click();assert.equal(info.getAttribute('aria-expanded'),'true');
 tap();assert.equal(info.getAttribute('aria-expanded'),'false');assert.deepEqual([downs,ups,clicks],[0,0,0]);
 tap();assert.deepEqual([downs,ups,clicks],[1,1,1]);
 info.click();menu.click();assert.equal(clicks,1);assert.equal(info.getAttribute('aria-expanded'),'false');menu.click();assert.equal(clicks,2);
 info.click();menu.dispatchEvent(new x.w.MouseEvent('pointerdown',{bubbles:true,cancelable:true}));menu.dispatchEvent(new x.w.Event('pointercancel',{bubbles:true}));tap();assert.equal(clicks,3);
 }finally{x.dom.window.close();}
});
test('entering the section holds navigation away without interaction, and restart collapses and returns to the start',async()=>{
 const x=await setup({viewport:true});try{
 let held,release=0,scroll;x.w.TDBNavScroll={focus(callback,hold){held=hold;},release(){release++;}};x.w.lenis={scrollTo(target,options){scroll={target,options};}};
 x.viewport(true);assert.ok(x.d.documentElement.classList.contains('tdbc-chrome-away'));assert.equal(held(),true);
 x.d.body.dispatchEvent(new x.w.Event('pointerdown',{bubbles:true}));assert.equal(release,0);
 x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');x.choose('[data-action=reset]');
 assert.equal(x.root.querySelector('.tdbc-live').classList.contains('has-estimate'),false);assert.equal(x.root.querySelector('.tdbc-summary'),null);assert.equal(x.root.querySelector('[data-select]'),null);assert.equal(scroll.target,x.root);assert.equal(scroll.options.immediate,true);
 assert.ok(x.d.documentElement.classList.contains('tdbc-chrome-away'));x.viewport(false);assert.equal(x.d.documentElement.classList.contains('tdbc-chrome-away'),false);assert.equal(release,1);
 }finally{x.dom.window.close();}
});
test('the target date follows the slider and an earlier attempt shows the deadline message',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');
 const target=x.root.querySelector('[data-date=target]'),slider=x.root.querySelector('[data-range=completion]'),initial=target.value;
 assert.equal(slider.value,'0');assert.equal(target.value,target.min);
 slider.dispatchEvent(new x.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(x.root.querySelector('[data-panel=deadline]').getAttribute('aria-hidden'),'false');
 slider.value='21';slider.dispatchEvent(new x.w.Event('input',{bubbles:true}));assert.equal(x.root.querySelector('[data-range=completion]'),slider);assert.ok(target.value>initial);assert.equal(x.root.querySelector('[data-panel=deadline]').getAttribute('aria-hidden'),'true');
 target.value='2020-01-01';target.dispatchEvent(new x.w.Event('change',{bubbles:true}));assert.equal(x.root.querySelector('[data-date=target]').value,initial);assert.equal(x.root.querySelector('[data-panel=deadline]').getAttribute('aria-hidden'),'false');
 x.choose('[data-finance]');const term=x.root.querySelector('[data-range=term]');term.value='3';term.dispatchEvent(new x.w.Event('input',{bubbles:true}));x.choose('[data-finance]');x.choose('[data-finance]');assert.equal(x.root.querySelector('[data-range=term]').value,'12');assert.match(x.root.querySelector('[data-output=finance]').textContent,/Interest charges£0/);
 }finally{x.dom.window.close();}
});

test('veneer arches update the trial fee, tiers update the tooth price, and timeline stages disclose selections',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');x.choose('[data-select=veneers]');assert.match(x.text(),/Smile Trial/);assert.match(x.text(),/2,440/);
 x.choose('[data-arch=lower]');assert.match(x.text(),/3,435/);assert.match(x.text(),/2 arches/);assert.equal(x.root.querySelector('[data-qty=veneers]').value,'1');
 x.choose('[data-tier=veneers][value="1"]');assert.match(x.text(),/3,635/);x.choose('[data-action=stage][data-key=trial]');assert.equal(x.root.querySelector('[data-action=stage][data-key=trial]').getAttribute('aria-expanded'),'true');assert.match(x.root.querySelector('[data-node=stage-trial]').textContent,/1,990/);
 const total=x.text();x.choose('[data-action=option][data-key=veneers]');assert.equal(x.root.querySelector('[data-select=veneers]').checked,true);assert.equal(x.text(),total);
 x.choose('[data-action=start-assessment]');assert.match(x.text(),/450/);assert.doesNotMatch(x.text(),/Smile Trial/);assert.equal(x.root.querySelector('[data-select=veneers]').checked,false);
 }finally{x.dom.window.close();}
});
test('unavailable finance remains tappable with an explanation and recovers when borrowing is sufficient',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');x.choose('[data-select=gumline]');assert.ok(x.root.querySelector('[data-date=target]').value);assert.equal(x.root.querySelector('input[data-finance]'),null);
 x.choose('.tdbc-finance-disabled');assert.equal(x.root.querySelector('.tdbc-finance-disabled').getAttribute('aria-expanded'),'true');assert.match(x.root.querySelector('.tdbc-finance-info').textContent,/at least £250/);
 x.choose('[data-action=plus][data-key=gumline]');assert.equal(x.root.querySelector('input[data-finance]'),null);x.choose('[data-action=plus][data-key=gumline]');assert.ok(x.root.querySelector('input[data-finance]'));x.choose('input[data-finance]');assert.equal(x.root.querySelector('[data-range=term]').value,'12');
 }finally{x.dom.window.close();}
});
test('floating estimate stays mounted, toggles access, and scrolls to the full estimate',async()=>{
 const x=await setup({viewport:true});try{
 let scroll;x.w.lenis={scrollTo(target,options){scroll={target,options};}};x.viewport(true);const bar=x.root.querySelector('.tdbc-live');assert.equal(bar.getAttribute('aria-hidden'),'true');
 x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');assert.equal(x.root.querySelector('.tdbc-live'),bar);assert.equal(bar.getAttribute('aria-hidden'),'false');x.choose('[data-action=estimate]');assert.equal(scroll.target,x.root.querySelector('.tdbc-summary'));
 x.choose('[data-action=reset]');assert.equal(x.root.querySelector('.tdbc-live'),bar);assert.equal(bar.getAttribute('aria-hidden'),'true');
 }finally{x.dom.window.close();}
});

test('timeline clicks move emphasis and open a stage without scrolling; wedding advice expands in the deadline panel',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');x.choose('[data-select=veneers]');let scrolls=0;x.w.lenis={scrollTo(){scrolls++;}};x.w.HTMLElement.prototype.scrollIntoView=function(){scrolls++;};
 x.choose('[data-action=stage][data-key=trial]');assert.equal(x.root.querySelector('[data-stage=trial]').classList.contains('is-current'),true);assert.equal(x.root.querySelector('[data-action=stage][data-key=trial]').getAttribute('aria-expanded'),'true');assert.equal(scrolls,0);
 x.choose('[data-action=stage][data-key=veneers-upper-prep]');assert.equal(x.root.querySelector('[data-stage=trial]').classList.contains('is-current'),false);assert.equal(x.root.querySelector('[data-stage=veneers-upper-prep]').classList.contains('is-current'),true);assert.equal(scrolls,0);
 x.choose('[data-action=sooner]');const panel=x.root.querySelector('.tdbc-timing-warning');assert.equal(x.root.querySelector('[data-action=sooner]').getAttribute('aria-expanded'),'true');assert.equal(x.root.querySelector('[data-panel=deadline]').getAttribute('aria-hidden'),'false');x.choose('[data-action=bridal]');assert.equal(panel.querySelector('[data-action=bridal]').getAttribute('aria-expanded'),'true');assert.equal(panel.querySelector('[role=tooltip]'),null);assert.match(panel.textContent,/makeup trials/);assert.equal(scrolls,0);
 x.choose('[data-action=bridal]');assert.equal(panel.querySelector('[data-action=bridal]').getAttribute('aria-expanded'),'false');x.d.body.dispatchEvent(new x.w.Event('pointerdown',{bubbles:true}));assert.equal(x.root.querySelector('[data-action=sooner]').getAttribute('aria-expanded'),'true');x.choose('[data-action=sooner]');assert.equal(x.root.querySelector('[data-panel=deadline]').getAttribute('aria-hidden'),'true');
 }finally{x.dom.window.close();}
});
test('live price changes animate once even with reduced motion, and retain exact displayed totals',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');x.choose('[data-select=bonding]');let animations=0;const live=x.root.querySelector('[data-output=live]');live.animate=function(){animations++;return {cancel(){}};};
 x.choose('[data-action=plus][data-key=bonding]');assert.equal(animations,1);assert.match(live.textContent,/1,240/);x.choose('[data-action=breakdown]');assert.equal(animations,1);
 x.w.matchMedia=()=>({matches:true});x.choose('[data-action=plus][data-key=bonding]');assert.equal(animations,2);assert.match(live.textContent,/1,635/);
 }finally{x.dom.window.close();}
});
test('scrolling gives neighbouring timeline rows overlapping emphasis while retaining one current stage',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');x.choose('[data-select=veneers]');
 const rows=[...x.root.querySelectorAll('.tdbc-timeline-row')],centre=x.w.innerHeight*.42;
 let shift=0;
 rows.forEach((row,i)=>{row.getBoundingClientRect=()=>({top:centre-80+i*80-shift,bottom:centre+i*80-shift,height:80});});
 const scroll=async()=>{x.w.dispatchEvent(new x.w.Event('scroll'));await new Promise(resolve=>x.w.requestAnimationFrame(resolve));};
 const opacity=row=>Number(row.style.getPropertyValue('--tdbc-stage-opacity'));
 await scroll();
 assert.ok(opacity(rows[0])>.9&&opacity(rows[1])>.9,'two neighbouring stages can be bright together');
 assert.equal(x.root.querySelectorAll('[aria-current=step]').length,1);
 const before=opacity(rows[2]);shift=20;await scroll();const after=opacity(rows[2]);
 assert.ok(after>before&&after<1,'the next row brightens progressively before it becomes current');
 x.choose('[data-action=stage][data-key=veneers-upper-fit]');await new Promise(resolve=>x.w.requestAnimationFrame(resolve));
 const last=x.root.querySelector('[data-stage=veneers-upper-fit]');assert.equal(opacity(last),1);
 await scroll();assert.ok(opacity(last)<1,'scrolling resumes the shared focus band after a tap');
 }finally{x.dom.window.close();}
});

test('dismissing a tooltip restores shared calculator focus until the section leaves view',async()=>{
 const x=await setup({viewport:true});try{
 let focuses=0,releases=0;
 x.w.TDBNavScroll={focus(){focuses++;x.d.documentElement.classList.add('tdb-slider-focus');},release(){releases++;x.d.documentElement.classList.remove('tdb-slider-focus');}};
 x.root.getBoundingClientRect=()=>({height:1000,top:100,bottom:1100});
 x.viewport(true);x.choose('[data-category=cosmetic]');x.choose('[data-action=info]');
 const before=focuses;x.d.documentElement.classList.remove('tdb-slider-focus');
 x.d.body.dispatchEvent(new x.w.MouseEvent('pointerdown',{bubbles:true,cancelable:true}));
 assert.equal(x.root.querySelector('.tdbc-info.is-open'),null);
 assert.ok(focuses>before);assert.equal(releases,0);
 assert.ok(x.d.documentElement.classList.contains('tdbc-chrome-away'));
 assert.ok(x.d.documentElement.classList.contains('tdb-slider-focus'));
 x.d.body.click();assert.equal(releases,0);
 x.viewport(false);assert.equal(releases,1);assert.equal(x.d.documentElement.classList.contains('tdbc-chrome-away'),false);
 }finally{x.dom.window.close();}
});

test('deadline and wedding disclosures leave unrelated expansion contents mounted and untouched',async()=>{
 const x=await setup();try{
  x.choose('[data-category=cosmetic]');x.choose('[data-select=aligners]');
  const estimate=x.root.querySelector('[data-output=summary]'),treatments=x.root.querySelector('[data-panel=option-aligners]');
  const observer=new x.w.MutationObserver(()=>{});observer.observe(estimate,{subtree:true,attributes:true,childList:true,characterData:true});
  for(const selector of ['[data-action=sooner]','[data-action=bridal]','[data-action=bridal]','[data-action=sooner]']){
   x.choose(selector);assert.deepEqual(observer.takeRecords(),[]);assert.equal(x.root.querySelector('[data-output=summary]'),estimate);
  }
  observer.disconnect();
 }finally{x.dom.window.close();}
});

test('chevrons only expand; choosing a quantity or tier selects the treatment',async()=>{
 const x=await setup();try{
  x.choose('[data-category=cosmetic]');
  x.choose('[data-action=option][data-key=bonding]');
  assert.equal(x.root.querySelector('[data-select=bonding]').checked,false);
  assert.equal(x.root.querySelector('[data-panel=option-bonding]').getAttribute('aria-hidden'),'false');
  x.choose('[data-action=plus][data-key=bonding]');
  assert.equal(x.root.querySelector('[data-select=bonding]').checked,true);
  x.choose('[data-select=bonding]');
  x.choose('[data-tier=bonding][value="1"]');
  assert.equal(x.root.querySelector('[data-select=bonding]').checked,true);
  assert.equal(x.root.querySelector('[data-qty=bonding]').value,'2');
  assert.equal(x.root.querySelector('[data-tier=bonding][value="1"]').checked,true);
  const total=x.text();x.choose('[data-action=option][data-key=bonding]');
  assert.equal(x.text(),total);assert.equal(x.root.querySelector('[data-select=bonding]').checked,true);
 }finally{x.dom.window.close();}
});
test('aligner options omit duration copy while their selected tier still changes the estimate timing',async()=>{
 const x=await setup();try{
  x.choose('[data-category=cosmetic]');x.choose('[data-action=option][data-key=aligners]');
  assert.equal(x.root.querySelector('[data-select=aligners]').checked,false);
  assert.doesNotMatch(x.root.querySelector('[data-panel=option-aligners]').textContent,/months/);
  x.choose('[data-tier=aligners][value="0"]');
  assert.equal(x.root.querySelector('[data-select=aligners]').checked,true);
  const mild=x.root.querySelector('[data-output=duration]').textContent;
  x.choose('[data-tier=aligners][value="2"]');
  assert.notEqual(x.root.querySelector('[data-output=duration]').textContent,mild);
 }finally{x.dom.window.close();}
});

test('veneer quantities above 16 require both arches through typing and step controls',async()=>{
 const x=await setup();try{
  x.choose('[data-category=cosmetic]');x.choose('[data-select=veneers]');
  const quantity=n=>{const input=x.root.querySelector('[data-qty=veneers]');input.value=String(n);input.dispatchEvent(new x.w.Event('change',{bubbles:true}));};
  quantity(16);assert.equal(x.root.querySelector('[data-arch=lower]').checked,false);
  x.choose('[data-action=plus][data-key=veneers]');
  for(const arch of ['upper','lower']){const input=x.root.querySelector('[data-arch='+arch+']');assert.equal(input.checked,true);assert.equal(input.disabled,true);}
  assert.match(x.text(),/2 arches/);assert.ok(x.root.querySelector('[data-key=veneers-lower-prep]'));
  x.choose('[data-action=minus][data-key=veneers]');assert.equal(x.root.querySelector('[data-arch=lower]').disabled,false);
  x.choose('[data-arch=upper]');assert.equal(x.root.querySelector('[data-arch=upper]').checked,false);
  quantity(32);assert.equal(x.root.querySelector('[data-arch=upper]').checked,true);assert.equal(x.root.querySelector('[data-arch=lower]').checked,true);assert.match(x.text(),/2 arches/);
 }finally{x.dom.window.close();}
});
test('VIP overlays the drawer and restores the exact form and scroll position',async()=>{
 const x=await setup();try{
 x.choose('[data-category=cosmetic]');x.choose('[data-select=bonding]');await x.w.TDBCalculator.open(x.d.getElementById('open'));
 const dialog=x.d.querySelector('.tdbc-dialog'),vip=x.d.createElement('div');vip.id='tdb-vip-drawer';x.d.body.append(vip);
 x.w.TDBVIPDrawer={open(){vip.classList.add('is-open');},close(){vip.classList.remove('is-open');}};
 dialog.scrollTop=420;const form=dialog.querySelector('.tdbc-main'),button=dialog.querySelector('[data-action=vip]');button.click();
 assert.equal(dialog.open,true);assert.equal(x.d.querySelector('.tdbc-vip-overlay').open,true);assert.equal(dialog.querySelector('.tdbc-main'),form);
 x.w.TDBVIPDrawer.close();await new Promise(r=>setImmediate(r));assert.equal(x.d.querySelector('.tdbc-vip-overlay'),null);assert.equal(dialog.open,true);assert.equal(dialog.scrollTop,420);assert.equal(vip.parentNode,x.d.body);assert.equal(x.d.documentElement.style.overflow,'hidden');
 x.d.documentElement.style.fontSize='16px';dialog.querySelector('.tdbc-summary').getBoundingClientRect=()=>({top:-420});let frame;x.w.requestAnimationFrame=cb=>{frame=cb;return 1};x.w.matchMedia=()=>({matches:true});Object.defineProperty(dialog,'scrollHeight',{value:3000});Object.defineProperty(dialog,'clientHeight',{value:800});dialog.querySelector('[data-action=estimate]').click();assert.equal(dialog.scrollTop,420);assert.equal(typeof frame,'function');frame(x.w.performance.now()+325);assert.ok(dialog.scrollTop<420&&dialog.scrollTop>0);frame(x.w.performance.now()+700);assert.equal(dialog.scrollTop,0);dialog.scrollTop=420;x.w.TDBCalculator.close();assert.equal(dialog.style.getPropertyValue('--tdbc-close-scroll'),'420px');
 }finally{x.dom.window.close();}
});

const availabilityFeed=(date='October 2, 2099',time='14:55',slug='active')=>({ok:true,text:async()=>'<div data-banner-field="slug">'+slug+'</div><div data-banner-field="next-signature-slot">'+date+'</div><div data-banner-field="next-signature-uk-time">'+time+'</div>'});
const settle=()=>new Promise(r=>setImmediate(r));
test('inline and drawer use the first assessment slot, deduplicate requests and retain later planning',async()=>{
 let calls=0,next='October 2, 2099';const x=await setup({fetch:async()=>{calls++;return availabilityFeed(next);}});
 try{
  x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');
  assert.match(x.root.querySelector('[data-output=availability]').textContent,/2 Oct 2099 · 14:55/);
  assert.equal(x.root.querySelector('[data-availability-status]').dataset.live,'true');
  assert.equal(x.root.querySelectorAll('[data-output=availability]').length,1);
  assert.ok(x.root.querySelector('.tdbc-target-card').compareDocumentPosition(x.root.querySelector('[data-output=availability]'))&4);
  assert.match(x.root.querySelector('[data-output=availability]').textContent,/Start with your Signature Assessment ✦ as soon as/);
  assert.ok(x.root.querySelector('[data-action=availability] svg'));
  assert.equal(x.root.querySelector('[data-date=target]').value,'2099-11-20');
  assert.match(x.root.querySelector('[data-output=assessment-date]').textContent,/2 Oct 2099 · 14:55/);
  const slider=x.root.querySelector('[data-range=completion]');slider.value='21';slider.dispatchEvent(new x.w.Event('input',{bubbles:true}));
  assert.equal(x.root.querySelector('[data-date=target]').value,'2099-12-11');
  assert.match(x.root.querySelector('[data-output=timeline]').textContent,/Illustrative assessment date/);
  assert.doesNotMatch(x.root.querySelector('[data-output=assessment-date]').textContent,/14:55/);
  await x.w.TDBCalculator.open(x.d.getElementById('open'));
  assert.equal(calls,1);assert.match(x.d.querySelector('dialog [data-output=availability]').textContent,/23 Oct 2099/);
  next='October 5, 2099';x.choose('[data-action=availability]');await settle();
  assert.equal(calls,2);assert.equal(x.root.querySelector('[data-range=completion]'),slider);assert.equal(slider.value,'21');
  assert.match(x.d.querySelector('dialog [data-output=availability]').textContent,/26 Oct 2099/);
  assert.equal(x.root.querySelector('[data-date=target]').value,'2099-12-14');
 }finally{x.dom.window.close();}
});
test('freshness expires after five minutes and a failed refresh never claims a live date',async()=>{
 const clock={now:Date.parse('2099-09-20T12:00:00Z')};let failed=false;
 const x=await setup({clock,fetch:async()=>{if(failed)throw Error('offline');return availabilityFeed();}});
 try{
  x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');
  clock.now+=300001;
  const slider=x.root.querySelector('[data-range=completion]');slider.dispatchEvent(new x.w.Event('input',{bubbles:true}));
  assert.equal(x.root.querySelector('[data-availability-status]').dataset.live,'false');
  assert.match(x.root.querySelector('[data-output=availability]').textContent,/Last checked over five minutes ago/);
  failed=true;x.choose('[data-action=availability]');await settle();
  assert.equal(x.root.querySelector('[data-availability-status]').dataset.live,'false');
  assert.match(x.root.querySelector('[data-output=availability]').textContent,/Unable to check live availability/);
  assert.match(x.root.querySelector('[data-output=availability]').textContent,/2 Oct 2099/);
  assert.equal(x.root.querySelector('[data-action=availability]').disabled,false);
  failed=false;x.choose('[data-action=availability]');await settle();
  assert.equal(x.root.querySelector('[data-availability-status]').dataset.live,'true');
 }finally{x.dom.window.close();}
});
test('missing, past and malformed feed dates remain illustrative; Smile Design has no Signature date',async()=>{
 for(const response of [availabilityFeed('',''),availabilityFeed('October 2, 2000'),availabilityFeed('October 2, 2099','14:55','wrong')]){
  const x=await setup({fetch:async()=>response});try{
   x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');
   assert.equal(x.root.querySelector('[data-availability-status]').dataset.live,'false');
   assert.match(x.root.querySelector('[data-output=timeline]').textContent,/No live appointment date available|Unable to check live availability/);
   assert.match(x.root.querySelector('[data-output=availability]').textContent,/Dates are illustrative/);
  }finally{x.dom.window.close();}
 }
 const x=await setup({fetch:async()=>availabilityFeed()});try{
  x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');x.choose('[data-action=start-assessment]');
  assert.match(x.root.querySelector('[data-output=availability]').textContent,/2 Oct 2099/);
  x.choose('[data-assessment=design]');assert.equal(x.root.querySelector('[data-output=availability]'),null);
 }finally{x.dom.window.close();}
});

test('assessment refresh retains busy feedback until two complete turns and the new date is ready',async()=>{
 let date='October 2, 2099';const x=await setup({fetch:async()=>availabilityFeed(date)});
 try{
  x.choose('[data-category=cosmetic]');x.choose('[data-select=whitening]');
  let finish,turns,cancelled=false;
  const icon=x.root.querySelector('[data-action=availability] svg');
  icon.animate=()=>({currentTime:100,effect:{updateTiming(t){turns=t.iterations;}},finished:new Promise(r=>{finish=r;}),cancel(){cancelled=true;}});
  date='October 5, 2099';x.choose('[data-action=availability]');await settle();
  const button=x.root.querySelector('[data-action=availability]');
  assert.equal(button.getAttribute('aria-busy'),'true');assert.equal(button.disabled,true);
  assert.equal(turns,2);assert.match(x.root.querySelector('[data-output=assessment-date]').textContent,/2 Oct 2099/);
  finish();await settle();
  assert.equal(button.getAttribute('aria-busy'),null);assert.equal(button.disabled,false);assert.equal(cancelled,true);
  assert.match(x.root.querySelector('[data-output=assessment-date]').textContent,/5 Oct 2099/);
 }finally{x.dom.window.close();}
});
