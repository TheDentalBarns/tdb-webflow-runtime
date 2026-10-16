const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/runtime/lazy-icon-masks.js','utf8');
function fixture({allowed=true,observer=true}={}) {
  const dom=new JSDOM('<div data-tdb-native-holder-icon="instagram"></div><div data-tdb-native-holder-icon="smile"></div><div data-tdb-native-holder-icon="reviews"></div><div data-tdb-lazy-mask="review"></div><div class="tdb-review-summary-star-direct"></div>',{runScripts:'outside-only'}),w=dom.window,nodes=[...w.document.querySelectorAll('div')],ios=[];
  let notify;
  w.TDBConsent={allows:()=>allowed,subscribe(fn){notify=fn;fn();return()=>{notify=null}}};
  if(observer)w.IntersectionObserver=class{constructor(fn,options){this.fn=fn;this.options=options;this.nodes=new Set();ios.push(this)}observe(n){this.nodes.add(n)}unobserve(n){this.nodes.delete(n)}disconnect(){this.nodes.clear()}};
  w.eval(source+';prepareLazyIconMasks()');
  return {w,nodes,ios,permit(value){allowed=value;notify?.()},close(){w.TDBLazyIconMasks.destroy();w.close()}};
}
test('native masks have no URL before proximity; only approaching icons get one',()=>{
  const f=fixture();try{assert.equal(f.ios[0].options.rootMargin,'400px');assert(f.nodes.every(n=>!n.style.maskImage));
    f.ios[0].fn([{target:f.nodes[0],isIntersecting:false}]);assert(!f.nodes[0].style.maskImage);
    f.ios[0].fn([{target:f.nodes[0],isIntersecting:true}]);assert.match(f.nodes[0].style.maskImage,/tdb-icon-instagram.svg/);assert(!f.nodes[1].style.maskImage);assert(!f.ios[0].nodes.has(f.nodes[0]));
    f.ios[0].fn(f.nodes.slice(1).map(target=>({target,isIntersecting:true})));assert.match(f.nodes[1].style.maskImage,/tdb-exceptional-diamond.svg/);assert.equal(f.nodes[2].style.maskImage,f.nodes[3].style.maskImage);assert.doesNotMatch(f.nodes[2].style.maskImage,/brand/);assert.match(f.nodes[4].style.maskImage,/tdb-review-star.svg/);
  }finally{f.close()}
});
test('permission and teardown gate queued observer work',()=>{
 const f=fixture({allowed:false});try{assert.equal(f.ios[0].nodes.size,0);f.permit(true);assert.equal(f.ios[0].nodes.size,5);f.permit(false);f.ios[0].fn([{target:f.nodes[0],isIntersecting:true}]);assert(!f.nodes[0].style.maskImage);f.permit(true);assert.match(f.nodes[0].style.maskImage,/instagram/);f.w.TDBLazyIconMasks.destroy();f.ios[0].fn([{target:f.nodes[1],isIntersecting:true}]);assert(!f.nodes[1].style.maskImage)}finally{f.close()}
});
test('browsers without IntersectionObserver retain decorative icons',()=>{
 const f=fixture({observer:false});try{assert(f.nodes.every(n=>n.style.maskImage.includes('.svg')))}finally{f.close()}
});
