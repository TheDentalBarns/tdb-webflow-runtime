/* Consent gates, queued settings and independent loader pins survive retirement. */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require(process.env.TDB_JSDOM||'jsdom');
const bridge=fs.readFileSync('dist/tdb-consent.min.js','utf8');
function setup(categories,withAPI=true){
 const dom=new JSDOM('<a id="cookie-settings-link" href="#"><span>Settings</span></a>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'});
 const w=dom.window;let shown=0;
 const api={currentState:()=>({categories}),show:()=>{shown++;}};
 if(withAPI)w.CookieScript={instance:api};
 w.eval(bridge);
 return {dom,w,api,shown:()=>shown,scripts:()=>[...w.document.scripts].map(n=>n.src)};
}
function event(x,name,categories){x.w.dispatchEvent(new x.w.CustomEvent(name,{detail:{categories}}));}
(async()=>{
 for(const categories of [[],['strict']]){
  const x=setup(categories);
  for(const name of ['CookieScriptLoaded','CookieScriptReject','CookieScriptClose','CookieScriptAccept'])event(x,name,['strict']);
  x.w.TDBConsent.refresh();assert.deepEqual(x.scripts(),[],'essential-only/undecided never downloads optional vendors');
  x.w.document.querySelector('span').click();assert.equal(x.shown(),1);
  event(x,'CookieScriptAcceptAll');event(x,'CookieScriptCategory-performance');x.w.TDBConsent.loadPerformanceScripts();
  assert.equal(x.scripts().length,3);assert.ok(x.scripts().some(s=>s.includes('googletagmanager.com')));
  assert.ok(x.scripts().some(s=>s.includes('intellimize.co')));assert.ok(x.scripts().some(s=>s.includes('facebook.net')));
  assert.equal(x.scripts().some(s=>/elfsight/i.test(s)),false);
  x.w.eval(bridge);assert.equal(x.scripts().length,3,'duplicate bridge never duplicates vendors');x.dom.window.close();
 }
 let x=setup(['strict','performance']);assert.equal(x.scripts().length,3);x.dom.window.close();
 x=setup(['strict']);event(x,'CookieScriptAccept',['performance']);assert.equal(x.scripts().length,3);x.dom.window.close();
 x=setup(['strict'],false);x.w.document.querySelector('span').click();assert.equal(x.shown(),0);
 x.w.CookieScript={instance:x.api};event(x,'CookieScriptLoaded');assert.equal(x.shown(),1);assert.deepEqual(x.scripts(),[]);x.dom.window.close();
 const dom=new JSDOM('',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'}),w=dom.window;
 const tag=w.document.createElement('script');
 tag.src='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@consent-release/dist/tdb-immediate-runtime-batch.min.js';
 tag.dataset.tdbRuntimeBase='https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@independent-footer/dist/';
 Object.defineProperty(w.document,'currentScript',{value:tag});
 w.CookieScript={instance:{version:'4.0.2'}};
 const append=w.document.head.appendChild.bind(w.document.head);
 w.document.head.appendChild=node=>{const out=append(node);queueMicrotask(()=>node.dispatchEvent(new w.Event('load')));return out;};
 w.eval(fs.readFileSync('src/runtime/immediate-runtime-batch.js','utf8'));
 await w.TDBImmediateRuntimeBatch.ready;
 const scripts=[...w.document.scripts].map(n=>n.src);
 assert.ok(scripts.includes(tag.src.replace('tdb-immediate-runtime-batch.min.js','tdb-consent.min.js')));
 assert.ok(scripts.includes(tag.dataset.tdbRuntimeBase+'tdb-footer-runtime.min.js'));
 assert.ok(scripts.some(s=>s.includes('tdb-webflow-attribution@6fa2423188ddccf9ef354132d3c1a303245e17a5')));
 assert.equal(scripts.some(s=>/elfsight|@v0\.3\.0\/dist\/tdb-consent/.test(s)),false);
 assert.equal(w.__TDB_PRIORITY_READY__,true);dom.window.close();
 console.log('PASS: no Elfsight, essential/accept consent gates, vendor deduplication, pending settings and independent consent/footer pins.');
})().catch(error=>{console.error(error);process.exitCode=1;});
