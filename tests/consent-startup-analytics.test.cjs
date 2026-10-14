/* Scoped consent startup and analytics lifecycle checks against the built bundle. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require(process.env.TDB_JSDOM || 'jsdom');
const source = fs.readFileSync('dist/tdb-consent.js', 'utf8');
const accepted = {action:'accept',categories:['strict','performance','functionality']};
const providers = {analytics:'data-tdb-ga-js',intellimize:'data-tdb-intellimize-js',meta:'data-tdb-meta-js'};
function fixture({choice=accepted, loading=false, existing=''}={}) {
  const dom = new JSDOM('<!doctype html><html><head>'+existing+'</head><body><section data-vimeo-content-init></section><section data-tdb-team-quotes data-tdb-team-cms></section></body></html>',
    {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  let decision=choice, ready=loading?'loading':'interactive', now=0, next=0;
  const timers=new Map();
  w.setTimeout=(fn,delay=0)=>{timers.set(++next,{fn,at:now+delay});return next;};
  w.clearTimeout=id=>timers.delete(id);
  Object.defineProperty(d,'readyState',{get:()=>ready});
  const tag=d.createElement('script');tag.src='https://cdn.test/dist/tdb-consent.js';d.head.append(tag);
  Object.defineProperty(d,'currentScript',{get:()=>tag});
  // Native banner mechanics are exercised separately in consent-native.test.cjs.
  w.CookieScript={instance:{__tdbNative:true,currentState:()=>decision,show(){}}};
  function event(name,detail){w.dispatchEvent(new w.CustomEvent(name,{detail}));}
  const nodes=key=>[...d.querySelectorAll('script['+providers[key]+']')];
  function advance(ms) {
    const end=now+ms;
    for(;;) {
      const first=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!first)break;
      now=first[1].at;timers.delete(first[0]);first[1].fn();
    }
    now=end;
  }
  w.eval(source);
  return {w,d,nodes,event,advance,
    setChoice(value,name){decision=value;if(name)event(name);},
    boot(){ready='interactive';d.dispatchEvent(new w.Event('DOMContentLoaded'));},
    state(key){return w.TDBConsent.status().scripts[key];},
    close(){w.close();}};
}
test('missing, rejected and invalid decisions cannot load analytics via events or public calls',()=>{
  for(const choice of [
    {categories:['performance']},{action:'reject',categories:['performance']},
    {action:'invalid',categories:['performance']},{action:'accept',categories:['functionality']}
  ]) {
    const f=fixture({choice});
    for(const name of ['CookieScriptLoaded','CookieScriptAccept','CookieScriptAcceptAll','CookieScriptCategory-performance'])
      f.event(name,{categories:['performance']});
    f.w.TDBConsent.loadPerformanceScripts();f.w.TDBConsent.refresh();
    for(const key of Object.keys(providers))assert.equal(f.nodes(key).length,0);
    assert.equal(f.w.gtag,undefined);assert.equal(f.w.fbq,undefined);f.close();
  }
});
test('early readiness events wait for DOM preparation, then saved choices release all permitted work',()=>{
  const f=fixture({loading:true});
  f.event('CookieScriptLoaded');f.event('CookieScriptAcceptAll');f.w.TDBConsent.refresh();
  assert.equal(f.d.querySelectorAll('script').length,1);
  f.boot();
  for(const key of Object.keys(providers))assert.equal(f.nodes(key).length,1);
  assert(f.d.querySelector('[data-tdb-vimeo-loader]'));
  assert(f.d.querySelector('[data-tdb-team-quote-runtime]'));
  f.boot();f.w.TDBConsent.refresh();
  for(const key of Object.keys(providers))assert.equal(f.nodes(key).length,1);
  f.close();
});
test('successful requests expose load status and never repeat configuration or pageview',()=>{
  const f=fixture();
  for(const key of Object.keys(providers)) {
    assert.equal(f.state(key).status,'requested');
    f.nodes(key)[0].dispatchEvent(new f.w.Event('load'));
    assert.equal(f.state(key).status,'loaded');
    assert.equal(f.state(key).attempts,1);
  }
  f.event('CookieScriptAcceptAll');f.event('CookieScriptCategory-performance');f.w.TDBConsent.refresh();
  for(const key of Object.keys(providers))assert.equal(f.nodes(key).length,1);
  assert.equal(f.w.dataLayer.filter(row=>row[0]==='config').length,1);
  assert.equal(f.w.fbq.queue.filter(row=>row[0]==='init').length,1);
  assert.equal(f.w.fbq.queue.filter(row=>row[0]==='track'&&row[1]==='PageView').length,1);
  f.close();
});
for(const key of Object.keys(providers))test(key+' retries once after explicit failure, with no duplicate tags or boot calls',()=>{
  const f=fixture(), first=f.nodes(key)[0];
  first.dispatchEvent(new f.w.Event('error'));
  assert.equal(f.state(key).status,'failed');assert.equal(f.w.TDBConsent.status()[key],false);
  f.event('CookieScriptAcceptAll');f.w.TDBConsent.loadPerformanceScripts();
  f.advance(999);assert.equal(f.nodes(key).length,0);
  f.advance(1);
  const second=f.nodes(key)[0];assert(second);assert.notEqual(second,first);
  assert.equal(f.state(key).attempts,2);assert.equal(f.state(key).status,'requested');
  assert.equal(f.w.dataLayer.filter(row=>row[0]==='config').length,1);
  assert.equal(f.w.fbq.queue.filter(row=>row[0]==='track'&&row[1]==='PageView').length,1);
  // Stale events cannot modify the replacement request.
  first.dispatchEvent(new f.w.Event('load'));assert.equal(f.state(key).status,'requested');
  second.dispatchEvent(new f.w.Event('error'));f.advance(5000);f.w.TDBConsent.refresh();
  assert.equal(f.nodes(key).length,0);assert.equal(f.state(key).attempts,2);
  assert.equal(f.state(key).status,'failed');
  for(const other of Object.keys(providers).filter(v=>v!==key))assert.equal(f.nodes(other).length,1);
  f.close();
});
test('withdrawal cancels retries; a later accepted decision can use the remaining attempt',()=>{
  const f=fixture();
  f.nodes('analytics')[0].dispatchEvent(new f.w.Event('error'));
  f.setChoice({action:'reject',categories:['performance']},'CookieScriptReject');
  f.advance(1500);assert.equal(f.nodes('analytics').length,0);assert.equal(f.state('analytics').attempts,1);
  f.setChoice(accepted,'CookieScriptAcceptAll');
  assert.equal(f.nodes('analytics').length,1);assert.equal(f.state('analytics').attempts,2);
  f.nodes('analytics')[0].dispatchEvent(new f.w.Event('load'));
  assert.equal(f.state('analytics').status,'loaded');f.close();
});
test('retry rechecks consent even when the saved decision changes without an event',()=>{
  const f=fixture();
  f.nodes('meta')[0].dispatchEvent(new f.w.Event('error'));
  f.setChoice({action:'reject',categories:[]});f.advance(1000);
  assert.equal(f.nodes('meta').length,0);assert.equal(f.state('meta').attempts,1);f.close();
});
test('a slow request is not replaced merely because time passes',()=>{
  const f=fixture(), first=f.nodes('analytics')[0];
  f.advance(25000);f.w.TDBConsent.refresh();
  assert.equal(f.nodes('analytics')[0],first);assert.equal(f.state('analytics').attempts,1);
  first.dispatchEvent(new f.w.Event('load'));assert.equal(f.state('analytics').status,'loaded');f.close();
});
test('externally owned scripts are preserved without claiming unverified readiness',()=>{
  const f=fixture({existing:'<script data-tdb-ga-js src="https://www.googletagmanager.com/gtag/js?id=G-GCWCSWR50M"></script>'});
  const first=f.nodes('analytics')[0];
  assert.equal(f.state('analytics').status,'existing');assert.equal(f.state('analytics').attempts,0);
  first.dispatchEvent(new f.w.Event('error'));f.advance(2000);f.w.TDBConsent.refresh();
  assert.equal(f.nodes('analytics').length,1);assert.equal(f.nodes('analytics')[0],first);
  assert.equal(f.w.dataLayer.filter(row=>row[0]==='config').length,0);f.close();
});
