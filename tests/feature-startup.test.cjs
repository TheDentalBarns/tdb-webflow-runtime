const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/runtime/features-startup.js', 'utf8');
const names = [...source.match(/const steps\s*=\s*\[([^\]]+)\]/s)[1].matchAll(/\b(?:prepare\w+|updateNativeFooterDates)\b/g)].map(match => match[0]);
function fixture() {
  const calls = [], warnings = [], events = [];
  let fail = true;
  const context = vm.createContext({URL, document:{currentScript:{src:'https://example.test/runtime.js'}},
    window:{dispatchEvent:event=>events.push(event)}, console:{warn:(...args)=>warnings.push(args)},
    CustomEvent:class {constructor(type, options){this.type=type;this.detail=options.detail;}}});
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
