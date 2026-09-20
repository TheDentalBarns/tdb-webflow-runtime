// Run after tools/build-calculator.cjs; uses the existing runtime-tests jsdom dependency.
const {JSDOM}=require('jsdom');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const C=require(path.join(root,'src/calculator/core.js'));
const dom=new JSDOM('<!doctype html><html><body>'+[
  ['assessment','Signature Assessment ✦','£450'],['bonding','Composite bonding','£395'],['aligners','Clear aligners','£4,195'],
].map(([key,label,price])=>`<div data-tdb-calc-record="${C.IDS[key]}" data-label="${label}" data-price="${price}" ${key==='aligners'?'data-tier1="£4,195" data-tier2="£5,295" data-tier1friendly="Simple" data-tier2friendly="Moderate"':''} data-min="2" data-max="4" data-unit="weeks"></div>`).join('')+
'<main data-tdb-calculator="inline"></main><section data-tdb-calculator="inline"></section><button id="open" data-tdb-calc-open>Calculator</button></body></html>',{url:'https://dentalbarns.webflow.io/dental-cost-calculator',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,requests=[];
w.Date.now=()=>Date.parse('2026-09-20T12:00:00Z');
w.matchMedia=()=>({matches:false});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false};
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.fetch=()=>new Promise((resolve,reject)=>requests.push({resolve,reject}));
const initial={...C.newState(),categories:['cosmetic'],selected:{bonding:{qty:2,tier:null},aligners:{qty:1,tier:null}},delay:0};
w.sessionStorage.setItem('tdb-treatment-estimate-v1',JSON.stringify({version:1,at:w.Date.now(),state:initial}));
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
const feed=(day='October 2, 2026')=>({ok:true,text:async()=>'<div data-banner-field="slug">active</div><div data-banner-field="next-signature-slot">'+day+'</div><div data-banner-field="next-signature-uk-time">'+(day?'14:55':'')+'</div>'});
const views=()=>[...d.querySelectorAll('.tdb-calc')];
const snapshot=v=>({assessment:v.querySelector('[data-output=assessment-date]').textContent,target:v.querySelector('[data-output=target-display]').textContent,rows:[...v.querySelectorAll('.tdbc-stage-toggle small')].map(e=>e.textContent)});
function checking(){for(const v of views()){
  assert(v.hasAttribute('data-availability-loading'));
  assert.equal(v.querySelector('[data-output=assessment-date]').textContent,'Checking live availability');
  assert.equal(v.querySelector('[data-availability-status]').textContent,'Checking live availability*');
  assert.equal(v.querySelector('[data-availability-status]').dataset.live,'false');
  assert.equal(v.querySelector('[data-output=target-display]').textContent,'Updating your timeline');
  assert([...v.querySelectorAll('.tdbc-stage-toggle small')].every(e=>e.textContent==='Updating your timeline'));
  assert(v.querySelector('[data-date=target]').disabled);assert.equal(v.querySelector('[data-date=target]').value,'');
  assert(v.querySelector('[data-range=completion]').disabled);
  assert.equal(v.querySelector('[data-range=completion]').getAttribute('aria-valuetext'),'Updating your timeline');
  assert(!/2026/.test(v.querySelector('[data-output=completion-range]').textContent));
}}
(async()=>{
  w.eval(fs.readFileSync(path.join(root,'dist/tdb-calculator.js'),'utf8'));
  d.dispatchEvent(new w.Event('DOMContentLoaded'));await flush();
  assert.equal(requests.length,1,'all inline views share the initial request');checking();
  requests.shift().resolve(feed());await flush();
  await w.TDBCalculator.open(d.getElementById('open'));await flush();
  assert.equal(views().length,3,'inline and drawer use the same loading state');
  for(const v of views())assert.equal(v.querySelector('[data-stage=aligners] .tdbc-stage-cost strong').textContent,'From £4,195–£5,295');
  views()[0].querySelector('[data-tier=aligners][value="1"]').click();
  for(const v of views()){assert.equal(v.querySelector('[data-stage=aligners] .tdbc-stage-cost strong').textContent,'From £5,295');assert.equal(v.querySelector('[data-stage=bonding] .tdbc-stage-cost strong').textContent,'£790');}
  const before=views().map(snapshot),price=views()[0].querySelector('[data-output=total]').textContent,duration=views()[0].querySelector('[data-output=duration]').textContent;
  d.querySelector('[data-action=availability]').click();await flush();checking();
  assert.equal(views()[0].querySelector('[data-output=total]').textContent,price);
  assert.equal(views()[0].querySelector('[data-output=duration]').textContent,duration);
  d.querySelector('[data-action=availability]').click();assert.equal(requests.length,1,'repeat refresh does not create duplicate requests');
  requests.shift().resolve(feed('October 9, 2026'));await flush();
  for(const [i,v] of views().entries()){
    assert(!v.hasAttribute('data-availability-loading'));assert(!v.querySelector('[data-date=target]').disabled);
    assert.equal(snapshot(v).assessment,'9th Oct 2026');assert.notEqual(snapshot(v).target,before[i].target);
    assert(!snapshot(v).rows.some(t=>/Updating/.test(t)));assert.equal(v.querySelector('[data-availability-status]').dataset.live,'true');
  }
  const confirmed=views().map(snapshot);
  d.querySelector('[data-action=availability]').click();await flush();checking();
  requests.shift().reject(Error('network unavailable'));await flush();
  views().forEach((v,i)=>{assert.deepEqual(snapshot(v),confirmed[i]);assert.match(v.querySelector('[data-availability-status]').textContent,/Couldn’t refresh — showing last checked availability/);assert.equal(v.querySelector('[data-availability-status]').dataset.live,'false')});
  const slider=views()[0].querySelector('[data-range=completion]');slider.value='40';slider.dispatchEvent(new w.Event('input',{bubbles:true}));slider.dispatchEvent(new w.Event('change',{bubbles:true}));
  d.querySelector('[data-action=availability]').click();await flush();checking();
  requests.shift().resolve(feed('October 9, 2026'));await flush();
  assert.equal(views()[0].querySelector('[data-range=completion]').value,'40','refresh preserves the chosen planning offset');
  d.querySelector('[data-action=availability]').click();await flush();checking();
  requests.shift().resolve(feed(''));await flush();
  for(const v of views()){assert.equal(v.querySelector('[data-output=assessment-date]').textContent,'Please enquire');assert.equal(v.querySelector('[data-availability-status]').dataset.live,'false');assert(!v.hasAttribute('data-availability-loading'));}
  console.log('PASS: shared initial/refresh loading, large dates, every stage, success, failure restoration, no-slot fallback, offsets, prices and durations.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>w.close());
