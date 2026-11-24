const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/runtime/features-startup.js', 'utf8');
const names = [...source.match(/const steps\s*=\s*\[([^\]]+)\]/s)[1].matchAll(/\b(?:prepare\w+|updateNativeFooterDates)\b/g)].map(match => match[0]);
function fixture(profile) {
  const calls = [], warnings = [], events = [];
  let fail = true;
  const context = vm.createContext({URL, document:{currentScript:{src:'https://example.test/runtime.js'}},
    window:{dispatchEvent:event=>events.push(event)}, console:{warn:(...args)=>warnings.push(args)},
    CustomEvent:class {constructor(type, options){this.type=type;this.detail=options.detail;}}});
  if(profile) {
    context.document.querySelector=()=>profile.template;
    context.TDBRuntimeModuleRoot='https://example.test/dist/';
    context.window.TDBConsent={allows:()=>profile.allowed};
    context.window.TDBModules={load:async url=>{profile.assets.push(url.href); await profile.gate;}};
    context.window.TDBPersonProfile={mount:template=>{assert.equal(template,profile.template);calls.push('profile');}};
  }
  for(const name of names) context[name] = Object.defineProperty(function(){calls.push(name);if(name===names[1]&&fail)throw Error('feature failed');},'name',{value:name});
  vm.runInContext(source+'\nthis.startup=TDBFeatureStartup;',context);
  return {calls,warnings,events,start:context.startup.start,recover(){fail=false;}};
}
test('one failed initializer cannot starve later features; retry only runs failed steps',async()=>{
  const f=fixture(),schedule=fn=>Promise.resolve().then(fn);
  const first=f.start(schedule),same=f.start(schedule);assert.equal(first,same);
  const result=await first;
  assert.deepEqual(f.calls,names);assert.equal(result.failures.length,1);
  assert.equal(f.warnings.length,1);assert.equal(f.events[0].type,'tdb:features-ready');
  f.recover();await f.start(schedule);
  assert.deepEqual(f.calls,[...names,names[1]]);
  await f.start(schedule);assert.equal(f.calls.length,names.length+1);
});
test('cancellation stops startup and does not publish a ready event; a later start can resume',async()=>{
  const f=fixture();f.recover();let active=true;
  await f.start(fn=>{fn();active=false;return Promise.resolve();},()=>active);
  assert.deepEqual(f.calls,[names[0]]);assert.equal(f.events.length,0);
  active=true;await f.start(fn=>Promise.resolve().then(fn),()=>active);
  assert.deepEqual(f.calls,names);assert.equal(f.events.length,1);
});
test('profile CMS preparation is consent-released and finishes before native sliders start',async()=>{
  const schedule=fn=>Promise.resolve().then(fn);
  for(const allowed of [false,true]){
    let release;
    const profile={allowed,assets:[],template:{},gate:new Promise(resolve=>{release=resolve;})};
    const f=fixture(profile); f.recover();
    const running=f.start(schedule);
    await new Promise(resolve=>setImmediate(resolve));
    if(allowed) assert.deepEqual(f.calls,[]);
    release(); await running;
    assert.deepEqual(profile.assets,allowed?['https://example.test/dist/tdb-person-profile.js']:[]);
    assert.deepEqual(f.calls,allowed?['profile',...names]:names);
  }
});
test('withdrawing consent while the profile module is in flight does not mount the profile',async()=>{
  let release;
  const profile={allowed:true,assets:[],template:{},gate:new Promise(resolve=>{release=resolve;})};
  const f=fixture(profile); f.recover();
  const pending=f.start(fn=>Promise.resolve().then(fn));
  await new Promise(resolve=>setImmediate(resolve));
  profile.allowed=false; release(); await pending;
  assert.deepEqual(f.calls,names);
});
test('the native People installation contributes only styles and inert article markup before consent',()=>{
  const {JSDOM}=require('jsdom');
  const markup=fs.readFileSync('src/people/template.html','utf8');
  const page=new JSDOM(markup);
  try {
    const doc=page.window.document;
    assert.equal(doc.querySelectorAll('script,link,[onload]').length,0);
    assert.equal(doc.querySelectorAll('template[data-tdb-person-profile]').length,1);
    assert.ok(!markup.includes('tdb-smile-feed.css'));
  } finally { page.window.close(); }
});
