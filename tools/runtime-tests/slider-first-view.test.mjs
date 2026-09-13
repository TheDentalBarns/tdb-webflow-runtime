import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = fs.readFileSync(path.join(root, 'src/sliders/sliders.js'), 'utf8');
const baseline = fs.readFileSync(path.join(root, 'tools/runtime-tests/fixtures/sliders-0.3.0.js'), 'utf8');
const results = [];
function test(name, fn) {
  try { fn(); results.push({name, passed: true}); }
  catch (error) { results.push({name, passed: false, error: error.stack}); }
}

class Events {
  constructor() { this.events = new Map(); }
  addEventListener(type, fn) {
    if (!this.events.has(type)) this.events.set(type, new Set());
    this.events.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.events.get(type)?.delete(fn); }
  emit(type) { [...this.events.get(type) || []].forEach(fn => fn({type, target: this})); }
  listenerCount() { return [...this.events.values()].reduce((n, set) => n + set.size, 0); }
}
class Element extends Events {
  constructor(kind, parent = null) {
    super(); this.kind = kind; this.parent = parent; this.attrs = new Map(); this.dataset = {};
    this.children = []; this.connected = true; this.visibility = 'visible'; this.hiddenAncestor = false;
    this.classWrites = []; this.style = {};
    this.classList = { add: (...a) => this.classWrites.push(a), remove: (...a) => this.classWrites.push(a), toggle: (...a) => this.classWrites.push(a) };
    this.rect = {top: 1100, bottom: 1600, left: 0, right: 800, width: 800, height: 500};
  }
  querySelector(selector) {
    const mapping = {'.swiper': 'swiper', '.swiper-count': 'count', '.swiper-btn-next': 'next', '.swiper-btn-prev': 'prev', '.swiper-pagination': 'pagination'};
    return this.children.find(el => el.kind === mapping[selector]) || null;
  }
  querySelectorAll() { return []; }
  matches(selector) { return this.kind === 'highlight' && selector === '.highlight-swiper_component'; }
  setAttribute(name, value) { this.attrs.set(name, value); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  getBoundingClientRect() { return this.rect; }
  contains(el) { return !!el && (el === this || el.parent === this); }
  closest() { return this.hiddenAncestor ? this.parent : null; }
}

function harness({reduced = false, io = true, count = 3, core = true, width = 1363, animated = false} = {}) {
  const components = [], observers = [], instances = [], mutations = [];
  let now = 0, nextID = 1;
  const jobs = new Map();
  function later(fn, delay) { const id = nextID++; jobs.set(id, {fn, due: now + delay}); return id; }
  function advance(ms) {
    const end = now + ms;
    for (let guard = 0; guard < 10000; guard++) {
      const next = [...jobs].filter(([, job]) => job.due <= end).sort((a,b) => a[1].due-b[1].due)[0];
      if (!next) { now = end; return; }
      jobs.delete(next[0]); now = next[1].due; next[1].fn();
    }
    throw new Error('unbounded timer loop');
  }
  const motion = new Events(); motion.matches = reduced;
  const doc = new Events();
  doc.readyState = 'complete'; doc.hidden = false; doc.activeElement = null;
  doc.body = new Element('body');
  doc.documentElement = new Element('html');
  doc.documentElement.contains = node => !!node?.connected && node.parent?.connected !== false;
  doc.querySelectorAll = selector => selector === '.highlight-swiper_component' ? components.filter(c=>c.connected) : [];
  function makeComponent(slides = count) {
    const c = new Element('highlight');
    c.children = ['swiper','count','next','prev','pagination'].map(kind => new Element(kind, c));
    c.querySelector('.swiper').slideCount = slides;
    components.push(c); return c;
  }
  class Swiper extends Events {
    constructor(el, params) {
      super(); this.el = el; this.params = params; this.activeIndex = 0; this.enabled = true;
      this.slides = Array.from({length:el.slideCount}, ()=>new Element('slide',el));
      this.animating = false; this.destroyed = false; this.isLocked = this.slides.length < 2;
      this.calls = []; this.updateCount = 0; el.swiper = this; instances.push(this);
    }
    on(types, fn) { types.split(' ').forEach(type=>this.addEventListener(type,fn)); }
    off(types, fn) { types.split(' ').forEach(type=>this.removeEventListener(type,fn)); }
    update() { this.updateCount++; }
    slideNext(speed = this.params.speed, callbacks = true) {
      this.calls.push({speed,callbacks,direction:'next'}); this.activeIndex = (this.activeIndex+1) % this.slides.length;
      if (callbacks) this.emit('slideChange');
      if (animated && speed) {this.animating=true; later(()=>{this.animating=false;this.emit('transitionEnd');},speed);}
    }
    slidePrev(speed = this.params.speed, callbacks = true) {
      this.calls.push({speed,callbacks,direction:'prev'}); this.activeIndex = (this.activeIndex-1+this.slides.length) % this.slides.length;
      if (callbacks) this.emit('slideChange');
      if (animated && speed) {this.animating=true; later(()=>{this.animating=false;this.emit('transitionEnd');},speed);}
    }
    destroy() { this.emit('beforeDestroy'); this.destroyed = true; }
  }
  class IO {
    constructor(callback, options) { this.callback=callback; this.options=options; this.targets=new Set(); observers.push(this); }
    observe(el) { this.targets.add(el); }
    unobserve(el) { this.targets.delete(el); }
    disconnect() { this.targets.clear(); }
    fire(target, visible = true, ratio = visible ? 0.5 : 0) {
      if (this.targets.has(target)) this.callback([{target, isIntersecting:visible, intersectionRatio:ratio}], this);
    }
  }
  const win = {innerWidth: width, innerHeight: 900};
  if (core) win.Swiper = Swiper;
  if (io) win.IntersectionObserver = IO;
  const c = makeComponent();
  const context = vm.createContext({
    window:win, document:doc, Element, location:{pathname:'/about-us'},
    matchMedia: query=>query.includes('prefers-reduced-motion') ? motion : {matches:false},
    getComputedStyle:el=>({visibility:el.visibility}),
    IntersectionObserver:IO,
    MutationObserver:class { constructor(callback) { this.callback=callback; mutations.push(this); } observe() {} },
    requestAnimationFrame: fn=>later(fn,16), cancelAnimationFrame:id=>jobs.delete(id),
    setTimeout:later, clearTimeout:id=>jobs.delete(id)
  });
  vm.runInContext(source, context, {timeout:1000});
  function proximity(target=c) {
    observers.find(o=>o.options.rootMargin==='100px' && o.targets.has(target))?.fire(target);
  }
  function visibility(visible=true, target=c, ratio=visible?0.5:0) {
    const el=target.querySelector('.swiper');
    el.rect = visible ? {top:300,bottom:800,left:0,right:800,width:800,height:500} : {...el.rect, top:1100, bottom:1600};
    observers.find(o=>o.options.rootMargin==='0px' && o.targets.has(el))?.fire(el,visible,ratio);
  }
  function remove(target=c) {
    target.connected=false;
    mutations[0].callback([{addedNodes:[],removedNodes:[target]}]);
  }
  return {c,components,instances,observers,motion,doc,win,advance,jobs,proximity,visibility,remove,
    status:(target=c)=>target.getAttribute('data-tdb-slider-first-view'),
    loadCore() {win.Swiper=Swiper;},
    add(slides=3) { const target=makeComponent(slides); mutations[0].callback([{addedNodes:[target],removedNodes:[]}]); return target; }
  };
}

test('Full candidate parses and retained parallax implementation is byte-identical',()=>{
  new vm.Script(source);
  const block=text=>text.split('  function initParallaxSwiper(component) {')[1].split('  function initByType')[0];
  assert.equal(block(source),block(baseline));
});
for (const width of [390,767,768,1363]) test(`Options preserve layout, navigation and gesture policy at ${width}px`,()=>{
  const h=harness({width}); h.proximity();
  const options=text=>vm.runInNewContext('('+text.split('function initHighlightSwiper(component)')[1].match(/new window\.Swiper\(swiperEl, (\{[\s\S]*?\n    \})\);/)[1]+')',{window:{innerWidth:width},component:{querySelector:s=>s}});
  const before=JSON.parse(JSON.stringify(options(baseline))), after=JSON.parse(JSON.stringify(options(source)));
  before.speed=400; before.autoplay=false; before.preventInteractionOnTransition=true; assert.deepEqual(after,before);
  assert.equal(h.instances[0].params.speed,400); assert.equal(h.instances[0].params.autoplay,false);
  assert.equal(h.instances[0].params.parallax,undefined);
});
test('Proximity initialization does not move an offscreen slider',()=>{
  const h=harness(); h.proximity(); h.advance(10000); assert.equal(h.instances[0].calls.length,0); assert.equal(h.status(),'pending');
});
test('Zero-area intersection is not first view',()=>{
  const h=harness(); h.proximity(); h.visibility(true,h.c,0); h.advance(1000); assert.equal(h.instances[0].calls.length,0);
});
test('First view moves exactly once after layout settles, then no autoplay',()=>{
  const h=harness(); h.proximity(); h.visibility(); h.advance(151); assert.equal(h.instances[0].calls.length,0);
  h.advance(1); assert.equal(h.instances[0].calls.length,1); assert.equal(h.instances[0].calls[0].speed,400);
  h.advance(60000); assert.equal(h.instances[0].calls.length,1); assert.equal(h.status(),'advanced');
  assert.equal(h.c.querySelector('.swiper-count').textContent,'2 of 3');
  assert.equal(h.c.listenerCount(),0); assert.equal(h.doc.events.get('visibilitychange').size,1); assert.equal(h.motion.listenerCount(),0);
});
test('Returning to viewport and calling refresh do not replay the entry move',()=>{
  const h=harness(); h.proximity(); h.visibility(); h.advance(1000); h.visibility(false); h.visibility();
  h.win.TDBSliders.refresh(); h.advance(1000); assert.equal(h.instances.length,1); assert.equal(h.instances[0].calls.length,1);
});
test('Leaving before entry cancels pending motion; returning can advance once',()=>{
  const h=harness(); h.proximity(); h.visibility(); h.advance(50); h.visibility(false); h.advance(1000);
  assert.equal(h.instances[0].calls.length,0); h.visibility(); h.advance(1000); assert.equal(h.instances[0].calls.length,1);
});
test('Intersection arriving before core initialization is retained safely',()=>{
  const h=harness({core:false}); h.proximity(); h.visibility(); h.advance(150); assert.equal(h.instances.length,0);
  h.loadCore(); h.advance(1000); assert.equal(h.instances.length,1); assert.equal(h.instances[0].calls.length,1);
});
for (const event of ['pointerdown','touchstart','keydown','click','focusin']) test(`${event} before initialization leaves the slider manual`,()=>{
  const h=harness(); h.c.emit(event); h.proximity(); h.visibility(); h.advance(1000);
  assert.equal(h.instances[0].calls.length,0); assert.equal(h.status(),'skipped-interaction');
});
test('User interaction during the entry delay cancels the pending move',()=>{
  const h=harness(); h.proximity(); h.visibility(); h.advance(60); h.c.emit('pointerdown'); h.advance(1000);
  assert.equal(h.instances[0].calls.length,0);
});
test('Existing slide-change or touch-start events win over auto entry',()=>{
  for (const event of ['touchStart','slideChange']) {
    const h=harness(); h.proximity(); h.instances[0].emit(event); h.visibility(); h.advance(1000);
    assert.equal(h.instances[0].calls.length,0); assert.equal(h.status(),'skipped-interaction');
  }
});
test('Already-focused content is not moved automatically',()=>{
  const h=harness(); h.doc.activeElement=h.c.children[2]; h.proximity(); h.visibility(); h.advance(1000);
  assert.equal(h.instances[0].calls.length,0);
});
test('Reduced motion from load skips entry permanently without disabling manual navigation',()=>{
  const h=harness({reduced:true}); h.proximity(); h.visibility(); h.advance(1000);
  assert.equal(h.instances[0].calls.length,0); assert.equal(h.status(),'skipped-reduced-motion');
  h.motion.matches=false; h.motion.emit('change'); h.instances[0].slideNext(); assert.equal(h.instances[0].activeIndex,1);
});
test('Live reduced-motion change cancels queued entry',()=>{
  const h=harness(); h.proximity(); h.visibility(); h.advance(60); h.motion.matches=true; h.motion.emit('change');
  h.advance(1000); assert.equal(h.instances[0].calls.length,0); assert.equal(h.status(),'skipped-reduced-motion');
});
test('Hidden tab waits; becoming visible advances once',()=>{
  const h=harness(); h.doc.hidden=true; h.proximity(); h.visibility(); h.advance(5000);
  assert.equal(h.instances[0].calls.length,0); h.doc.hidden=false; h.doc.emit('visibilitychange'); h.advance(1000);
  assert.equal(h.instances[0].calls.length,1);
});
test('Hiding the tab during entry delay cancels it',()=>{
  const h=harness(); h.proximity(); h.visibility(); h.advance(60); h.doc.hidden=true; h.doc.emit('visibilitychange');
  h.advance(5000); assert.equal(h.instances[0].calls.length,0);
});
for (const count of [0,1]) test(`${count}-slide component does not auto-advance`,()=>{
  const h=harness({count}); h.proximity(); h.visibility(); h.advance(1000);
  assert.equal(h.instances[0].calls.length,0); assert.equal(h.status(),'skipped-unavailable');
});
for (const state of ['locked','disabled','hidden','inert','active','animating']) test(`${state} component is not auto-advanced`,()=>{
  const h=harness(); h.proximity(); const s=h.instances[0], el=h.c.querySelector('.swiper');
  if (state==='locked') s.isLocked=true; if (state==='disabled') s.enabled=false;
  if (state==='hidden') el.visibility='hidden'; if (state==='inert') el.hiddenAncestor=true;
  if (state==='active') s.activeIndex=1; if (state==='animating') s.animating=true;
  h.visibility(); h.advance(1000); assert.equal(s.calls.length,0);
});
test('Final bounds check prevents stale observation advancing offscreen',()=>{
  const h=harness(); h.proximity(); h.visibility(); h.advance(60); h.c.querySelector('.swiper').rect.top=1200;
  h.advance(1000); assert.equal(h.instances[0].calls.length,0);
});
test('No IntersectionObserver leaves autoplay off and manual navigation available',()=>{
  const h=harness({io:false}); h.advance(1000); assert.equal(h.instances.length,1); assert.equal(h.instances[0].calls.length,0);
  assert.equal(h.status(),'skipped-unsupported'); h.instances[0].slideNext(); assert.equal(h.instances[0].activeIndex,1);
});
test('Destroying an initialized slider cancels entry and removes observer/listeners',()=>{
  const h=harness(); h.proximity(); h.visibility(); h.advance(60); h.instances[0].destroy(); h.advance(1000);
  assert.equal(h.instances[0].calls.length,0); assert.equal(h.status(),'skipped-destroyed'); assert.equal(h.c.listenerCount(),0);
});
test('Removing a pending root releases first-view listeners before core arrives',()=>{
  const h=harness({core:false}); h.proximity(); h.visibility(); h.remove(); h.advance(2000);
  assert.equal(h.instances.length,0); assert.equal(h.status(),'skipped-detached'); assert.equal(h.c.listenerCount(),0);
  assert.equal(h.motion.listenerCount(),0); assert.equal(h.observers.filter(o=>o.options.rootMargin==='0px')[0].targets.size,0);
});
test('Dynamically inserted roots initialize once and have independent first-view state',()=>{
  const h=harness(); const other=h.add(); h.proximity(); h.proximity(other); h.visibility(); h.advance(1000);
  assert.equal(h.instances[0].calls.length,1); assert.equal(h.instances[1].calls.length,0);
  h.visibility(true,other); h.advance(1000); assert.equal(h.instances[1].calls.length,1);
  h.win.TDBSliders.refresh(); assert.equal(h.instances.length,2);
});
test('First-view logic writes no opacity, image transforms or parallax moving classes',()=>{
  const h=harness(); h.proximity(); h.visibility(); h.advance(1000);
  assert.deepEqual(h.c.classWrites,[]); assert.deepEqual(h.c.style,{});
  h.c.children.forEach(el=>{assert.deepEqual(el.style,{}); assert.deepEqual(el.classWrites,[]);});
  const block=source.split('  function prepareHighlightFirstView(component) {')[1].split('  function getCurrentPath()')[0];
  assert.ok(!/opacity|data-fade-slide|\.style\.|classList/.test(block));
});

test('Rapid next/previous requests run sequentially at full duration and in order',()=>{
  const h=harness({animated:true}); h.proximity(); const s=h.instances[0];
  s.slideNext(); s.slideNext(); s.slidePrev(); s.slideNext();
  h.advance(399); assert.equal(s.calls.length,1); assert.equal(s.activeIndex,1);
  h.advance(17); assert.equal(s.calls.length,2); assert.equal(s.activeIndex,2);
  h.advance(416); assert.equal(s.calls.length,3); assert.equal(s.activeIndex,1);
  h.advance(416); assert.equal(s.calls.length,4); assert.equal(s.activeIndex,2);
  assert.deepEqual(s.calls.map(c=>c.direction),['next','next','prev','next']);
  assert.ok(s.calls.every(c=>c.speed===400)); h.advance(60000); assert.equal(s.calls.length,4);
});
test('A press during the settling frame joins the back of the queue',()=>{
  const h=harness({animated:true}); h.proximity(); const s=h.instances[0];
  s.slideNext(); s.slideNext(); h.advance(400); s.slidePrev(); h.advance(1000);
  assert.deepEqual(s.calls.map(c=>c.direction),['next','next','prev']);
});
test('Manual presses during first-view movement wait rather than interrupt it',()=>{
  const h=harness({animated:true}); h.proximity(); h.visibility(); h.advance(200); const s=h.instances[0];
  assert.equal(s.calls.length,1); s.slideNext(); s.slideNext(); h.advance(200); assert.equal(s.calls.length,1);
  h.advance(1500); assert.equal(s.calls.length,3); assert.equal(s.activeIndex,0); assert.equal(h.status(),'advanced');
});
test('Hidden tab discards pending manual requests without creating autoplay',()=>{
  const h=harness({animated:true}); h.proximity(); const s=h.instances[0]; s.slideNext(); s.slideNext();
  h.doc.hidden=true; h.doc.emit('visibilitychange'); h.advance(1000); h.doc.hidden=false; h.doc.emit('visibilitychange');
  h.advance(1000); assert.equal(s.calls.length,1);
});
test('Destroy clears queued navigation and its document listener',()=>{
  const h=harness({animated:true}); h.proximity(); const s=h.instances[0]; s.slideNext(); s.slideNext(); s.destroy();
  h.advance(1000); assert.equal(s.calls.length,1); assert.equal(h.doc.events.get('visibilitychange').size,0);
});
test('Zero-duration requests do not leave the queue stuck',()=>{
  const h=harness({animated:true}); h.proximity(); const s=h.instances[0]; s.slideNext(); s.slideNext(0); s.slidePrev();
  h.advance(1500); assert.equal(s.calls.length,3); assert.equal(s.activeIndex,1);
});

const output={status:results.every(r=>r.passed)?'PASS':'FAIL',checks:results.length,results,
  scope:'Full controller executed with deterministic DOM, Swiper, viewport and clock doubles. Not rendered staging or physical-device acceptance.'};
if (process.env.TDB_TEST_REPORT) fs.writeFileSync(process.env.TDB_TEST_REPORT,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
if (output.status!=='PASS') process.exitCode=1;
