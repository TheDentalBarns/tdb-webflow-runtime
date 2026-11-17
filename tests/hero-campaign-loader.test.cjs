const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('src/runtime/hero-campaign-loader.js','utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(enabled=true){
  const dom=new JSDOM(`<div data-tdb-campaign-hero>${enabled?'<section data-tdb-campaign-panel></section>':''}</div>`,{runScripts:'outside-only'});
  const w=dom.window,calls=[],pending=[];let mounted=0,destroyed=0;
  w.TDBMotion={frames:{}};
  w.TDBCampaignHero={mount(root){assert(root.matches('[data-tdb-campaign-hero]'));mounted++;return {status:()=>({ready:true}),refresh(){},destroy(){destroyed++;}};}};
  w.TDBModules={load(url,options){calls.push({url,options});return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
  w.console.warn=()=>{};
  w.eval(`const TDBRuntimeModuleRoot='https://cdn.example/release/dist/';${source}\nprepareHeroCampaignLoader();`);
  return {w,calls,pending,get mounted(){return mounted;},get destroyed(){return destroyed;},close(){w.close();}};
}
test('campaign off requests no feature; enabled hero prepares its dependencies together and mounts once',async()=>{
  const off=fixture(false);assert.equal(off.calls.length,0);assert.equal(off.w.TDBHeroCampaign,undefined);off.close();
  const f=fixture();assert.deepEqual(f.calls.map(c=>c.url),['https://cdn.example/release/dist/tdb-motion.js','https://cdn.example/release/dist/tdb-hero-campaign.js']);
  f.w.TDBHeroCampaign.refresh();assert.equal(f.calls.length,2);assert.equal(f.mounted,0);
  f.pending[1].resolve();await tick();assert.equal(f.mounted,0);
  f.pending[0].resolve();await tick();assert.equal(f.mounted,1);
  assert.ok(f.calls.every(c=>c.options.ready()));f.w.TDBHeroCampaign.refresh();assert.equal(f.mounted,1);
  f.w.TDBHeroCampaign.destroy();assert.equal(f.destroyed,1);f.close();
});
test('a failed feature keeps native content and can recover without mounting after disposal',async()=>{
  const f=fixture();f.pending[0].resolve();f.pending[1].reject(Error('network'));await tick();assert.equal(f.mounted,0);
  assert.equal(f.w.TDBHeroCampaign.status().ready,false);assert(f.w.document.querySelector('[data-tdb-campaign-panel]'));
  f.w.dispatchEvent(new f.w.Event('online'));assert.equal(f.calls.length,4);
  f.w.TDBHeroCampaign.destroy();f.pending[2].resolve();f.pending[3].resolve();await tick();assert.equal(f.mounted,0);
  f.w.dispatchEvent(new f.w.Event('online'));assert.equal(f.calls.length,4);f.close();
});
