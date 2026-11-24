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
    context.document.querySelector=selector=>selector==='[data-tdb-person-profile]' ? profile.root : null;
    context.TDBRuntimeModuleRoot='https://example.test/dist/';
    context.window.TDBConsent={allows:()=>profile.allowed};
    context.window.TDBModules={load:async url=>{profile.assets.push(url.href); await profile.gate;}};
    context.window.TDBPersonProfile={mount:root=>{assert.equal(root,profile.root);calls.push('profile');}};
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
    const profile={allowed,assets:[],root:{},gate:new Promise(resolve=>{release=resolve;})};
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
  const profile={allowed:true,assets:[],root:{},gate:new Promise(resolve=>{release=resolve;})};
  const f=fixture(profile); f.recover();
  const pending=f.start(fn=>Promise.resolve().then(fn));
  await new Promise(resolve=>setImmediate(resolve));
  profile.allowed=false; release(); await pending;
  assert.deepEqual(f.calls,names);
});
test('the Team template leaves layout and CMS markup to native Webflow components',()=>{
  const {JSDOM}=require('jsdom');
  const markup=fs.readFileSync('src/people/template.html','utf8');
  const page=new JSDOM(markup);
  try {
    const doc=page.window.document;
    assert.equal(doc.querySelectorAll('script,style,link,[onload]').length,0);
    assert.equal(doc.querySelectorAll('template').length,0);
    assert.ok(!markup.includes('latest-articles'));
    assert.ok(!markup.includes('tdb-smile-feed.css'));
  } finally { page.window.close(); }
});

test('the native review holder opens only for a matching clinician after consent', () => {
  const { JSDOM } = require('jsdom');
  const script = fs.readFileSync('src/people/profile.js', 'utf8');
  const markup = `<main><div class="tdb-first-review-break"><div data-tdb-profile-review-holder hidden>
    <section data-tdb-review-section><div data-tdb-review-quotes><div data-tdb-team-track>
      <article data-tdb-team-slide><button data-tdb-team-content><span data-tdb-team-text></span>
        <span data-tdb-quotes-name></span></button></article></div><span data-tdb-team-total></span></div></section>
    </div></div><div data-profile-source="reviews" hidden><div data-profile-values>
      <span data-value="person">clinician-a</span><span data-value="quote">A patient’s words.</span>
      <span data-value="review">review-a</span><span data-value="author">Patient A</span></div></div></main>`;
  for (const person of ['clinician-a', 'clinician-b']) {
    const page = new JSDOM(markup, { url: 'https://example.test/team-members/' + person, runScripts: 'outside-only' });
    try {
      const { document } = page.window;
      const holder = document.querySelector('[data-tdb-profile-review-holder]');
      const root = document.querySelector('main');
      let allowed = false;
      page.window.TDBConsent = { allows: () => allowed };
      page.window.eval(script);
      page.window.TDBPersonProfile.mount(root);
      assert.equal(holder.hidden, true);
      allowed = true;
      page.window.TDBPersonProfile.mount(root);
      const card = holder.querySelector('[data-tdb-team-slide]');
      assert.equal(holder.hidden, person !== 'clinician-a');
      assert.equal(card?.textContent.includes('A patient’s words.') ?? false, person === 'clinician-a');
      page.window.TDBPersonProfile.mount(root);
      assert.equal(holder.querySelector('[data-tdb-team-slide]'), card);
    } finally { page.window.close(); }
  }
});
