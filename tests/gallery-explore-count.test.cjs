const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(count = 34, options = {}) {
  const dom = new JSDOM('<main><div data-tdb-gallery-count-source><div class="w-dyn-items">' +
    '<div data-tdb-gallery-count-item></div>'.repeat(count) +
    '</div></div><a href="/smile-gallery" data-tdb-gallery-ticker-link><span data-tdb-gallery-count-slot><span>34</span></span>' +
    (options.noNoun ? '' : '<span data-tdb-gallery-count-noun>wrong</span>') + '</a></main>',
    {url:'https://dentalbarns.webflow.io/',runScripts:'outside-only',pretendToBeVisual:true});
  const w = dom.window, animations = [], observers = [], requests = [];
  const motion = {matches:!!options.reduced,addEventListener(){},removeEventListener(){}};
  w.TDBMotion = {reduced:motion,defaults:{ticker:400}};
  w.Element.prototype.animate = function(frames,timing) {
    const animation = {target:this,frames,timing,cancel(){},onfinish:null};
    animations.push(animation); return animation;
  };
  w.IntersectionObserver = class {
    constructor(callback,options) {this.callback=callback;this.options=options;this.targets=new Set();observers.push(this);}
    observe(node){this.targets.add(node);} unobserve(node){this.targets.delete(node);} disconnect(){this.targets.clear();}
  };
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://cdn.example/dist/tdb-gallery.js'}});
  w.TDBModules = {load(url) {requests.push(String(url));if(options.fail)return Promise.reject(Error('offline'));
    w.eval(read('dist/tdb-ticker.js'));return Promise.resolve();}};
  w.eval(read('src/smile-gallery/explore-count.js'));
  const api=w.createGalleryExploreCount(),link=w.document.querySelector('a'),slot=link.querySelector('[data-tdb-gallery-count-slot]');
  const enter=(ratio=1)=>observers[0].callback([{target:link,isIntersecting:ratio>0,intersectionRatio:ratio}]);
  return {dom,w,api,link,slot,enter,animations,observers,requests};
}
test('native total stays correct; 25% entry plays exactly one n-1 to n shared transition',async()=>{
  const x=setup();
  try{
    x.api.refresh();assert.equal(x.slot.textContent,'34');assert.equal(x.link.getAttribute('aria-label'),'Explore 34 smile transformations');
    assert.equal(x.requests.length,0);x.enter(.2);await flush();assert.equal(x.requests.length,0);
    x.enter(.25);await flush();
    assert.deepEqual(x.animations.map(a=>a.target.textContent),['33','34']);
    assert.equal(x.animations[0].timing.duration,400);assert.equal(x.requests.length,1);
    x.animations[1].onfinish();x.api.refresh();x.enter();await flush();
    assert.equal(x.slot.textContent,'34');assert.equal(x.animations.length,2);
    assert.equal(x.observers[0].targets.size,0);
  }finally{x.dom.window.close();}
});
test('zero, singular and reduced-motion totals never go negative and retain accessible labels',async()=>{
  for(const count of [0,1]){
    const x=setup(count,{reduced:true});
    try{x.api.refresh();x.enter();await flush();assert.equal(x.slot.textContent,String(count));
      assert.equal(x.link.getAttribute('aria-label'),'Explore '+count+' smile transformation'+(count===1?'':'s'));
      assert.equal(x.requests.length,0);assert.equal(x.animations.length,0);
    }finally{x.dom.window.close();}
  }
});
test('missing noun and failed optional ticker retain the true static total',async()=>{
  const x=setup(7,{noNoun:true,fail:true});
  try{x.api.refresh();x.enter();await flush();assert.equal(x.slot.textContent,'7');
    assert.equal(x.link.getAttribute('aria-label'),'Explore 7 smile transformations');assert.equal(x.observers[0].targets.size,0);
  }finally{x.dom.window.close();}
});
test('hidden pages postpone motion and removed links cannot mount after a pending load',async()=>{
  const x=setup(2);
  try{
    let hidden=true,resolve;
    Object.defineProperty(x.w.document,'hidden',{get:()=>hidden});
    x.api.refresh();x.enter();await flush();assert.equal(x.requests.length,0);
    x.w.TDBModules.load=()=>new Promise(r=>{resolve=r;});
    hidden=false;x.w.document.dispatchEvent(new x.w.Event('visibilitychange'));await flush();
    x.link.remove();x.api.prune();x.w.eval(read('dist/tdb-ticker.js'));resolve();await flush();
    assert.equal(x.animations.length,0);assert.equal(x.observers[0].targets.size,0);
    assert.equal(x.link.hasAttribute('data-count-prepared'),false);
  }finally{x.dom.window.close();}
});
test('loop clones do not inflate count; refresh updates totals without replaying the entrance',async()=>{
  const x=setup(2);
  try{
    const source=x.w.document.querySelector('.w-dyn-items');
    source.insertAdjacentHTML('beforeend','<div class="swiper-slide-duplicate"><span data-tdb-gallery-count-item></span></div>');
    x.api.refresh();assert.equal(x.slot.textContent,'2');x.enter();await flush();x.animations[1].onfinish();
    source.insertAdjacentHTML('beforeend','<span data-tdb-gallery-count-item></span>');
    x.api.refresh();assert.equal(x.slot.textContent,'3');assert.equal(x.animations.length,2);
  }finally{x.dom.window.close();}
});
test('gallery refresh owns the count; legacy prepared links retain their original owner',()=>{
  const x=setup();
  try{
    x.link.dataset.countPrepared='true';x.api.refresh();assert.equal(x.observers.length,0);
    delete x.link.dataset.countPrepared;
    const built=read('dist/tdb-gallery.js');
    assert.match(built,/data-tdb-gallery-count-source/);
    x.w.TDBSwiper={register(){},refresh(){},prune(){}};
    x.w.eval(built);x.w.TDBGallery.refresh();
    assert.equal(x.link.dataset.countPrepared,'true');
    x.link.remove();x.w.TDBGallery.prune();
    assert.equal(x.link.hasAttribute('data-count-prepared'),false);
  }finally{x.dom.window.close();}
});

test('gallery-styled authored value and incoming use distinct elements in the deployed ticker',()=>{
  const x=setup(3);
  try{
    x.slot.innerHTML='<span class="tdb-gallery-count-value">2</span>';
    x.w.eval(read('dist/tdb-ticker.js'));
    const api=x.w.TDBNativeTicker.mount(x.slot,{valueClass:'tdb-gallery-count-value',incomingClass:'tdb-gallery-count-value'});
    api.update('3');
    assert.equal(x.slot.children.length,2);
    assert.notEqual(x.animations[0].target,x.animations[1].target);
    assert.deepEqual(x.animations.map(a=>a.target.textContent),['2','3']);
    x.animations[1].onfinish();assert.equal(x.slot.children.length,1);
    assert.equal(x.slot.firstElementChild.getAttribute('aria-hidden'),null);
    api.destroy();assert.equal(x.slot.textContent,'3');
  }finally{x.dom.window.close();}
});
