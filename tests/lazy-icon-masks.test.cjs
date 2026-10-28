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

test('platform artwork stays inert until proximity and preserves colours as images/backgrounds',()=>{
 const f=fixture();try{
  const d=f.w.document;
  for(const platform of ['google','facebook','yell','doctify'])for(const tag of ['div','img']){
   const node=d.createElement(tag);node.dataset.tdbLazyPlatform=platform;d.body.append(node);f.w.TDBLazyIconMasks.refresh();
   assert(!node.hasAttribute('src'));assert(!node.style.backgroundImage);assert(f.ios[0].nodes.has(node));
   f.ios[0].fn([{target:node,isIntersecting:false}]);assert(!node.hasAttribute('src'));assert(!node.style.backgroundImage);
   f.ios[0].fn([{target:node,isIntersecting:true}]);assert.match(tag==='img'?node.src:node.style.backgroundImage,new RegExp('tdb-review-'+platform+'\\.svg'));assert(!node.style.maskImage);
  }
 }finally{f.close()}
});

test('late icon observer never replaces the platform chosen by CMS hydration',()=>{
 const f=fixture();try{
  const d=f.w.document;
  for(const markup of ['','<img src="/facebook.svg">','Direct testimonial']){
   const node=d.createElement('span');node.className='tdb-quotes_source';node.innerHTML=markup;d.body.append(node);f.w.TDBLazyIconMasks.refresh();
   if(!markup){node.dataset.reviewPlatform='Facebook';node.style.backgroundImage='url("/facebook.svg")'}
   const before=node.outerHTML;f.ios[0].fn([{target:node,isIntersecting:true}]);assert.equal(node.outerHTML,before);
  }
  const fallback=d.createElement('span');fallback.className='tdb-quotes_source';d.body.append(fallback);f.w.TDBLazyIconMasks.refresh();f.ios[0].fn([{target:fallback,isIntersecting:true}]);assert.match(fallback.style.backgroundImage,/tdb-review-google.svg/);
 }finally{f.close()}
});

test('arrows are stylesheet-owned and excluded from the lazy mask observer',()=>{
 const f=fixture();try{for(const className of ['carousel-arrow-icon','icon-embed-xxsmall tdb-direct-arrow','tdb-arrow-asset','tdb-mask-icon is-arrow','tdb-announcement-arrow']){
 const node=f.w.document.createElement('span');node.className=className;f.w.document.body.append(node);f.w.TDBLazyIconMasks.refresh();assert(!f.ios[0].nodes.has(node));assert(!node.style.maskImage);
 }}finally{f.close()}
});

test('footer and speaker artwork wait for their own proximity and never fetch the combined sheet',()=>{
 const f=fixture();try{
  const speaker=f.w.document.createElement('button');speaker.setAttribute('data-tdb-compact-speaker','');
  const footer=f.w.document.createElement('a');footer.className='footer1_social-link tdb-footer-facebook';
  f.w.document.body.append(speaker,footer);f.w.TDBLazyIconMasks.refresh();
  assert.equal(speaker.style.getPropertyValue('--tdb-speaker-artwork'),'');assert.equal(footer.style.getPropertyValue('--tdb-footer-artwork'),'');
  f.ios[0].fn([{target:speaker,isIntersecting:true}]);
  assert.match(speaker.style.getPropertyValue('--tdb-speaker-artwork'),/tdb-control-speaker.svg/);
  assert.equal(footer.style.getPropertyValue('--tdb-footer-artwork'),'');
  f.ios[0].fn([{target:footer,isIntersecting:true}]);
  assert.match(footer.style.getPropertyValue('--tdb-footer-artwork'),/tdb-footer-facebook.svg/);
  assert.doesNotMatch(speaker.outerHTML+footer.outerHTML,/home-control-artwork/);
 }finally{f.close()}
});

test('consolidated decorative rows keep artwork deferred and do not create children',()=>{
 const f=fixture();try{
  const stars=f.w.document.createElement('div');stars.className='tdb-quote-decoration-stars tdb-summary-stars';
  const barns=f.w.document.createElement('div');barns.setAttribute('data-tdb-lazy-barns','');
  f.w.document.body.append(stars,barns);f.w.TDBLazyIconMasks.refresh();
  assert(f.ios[0].nodes.has(stars));assert(f.ios[0].nodes.has(barns));
  assert.equal(stars.style.maskImage,'');assert.equal(barns.style.getPropertyValue('--tdb-barns-artwork'),'');
  f.ios[0].fn([{target:stars,isIntersecting:true}]);
  assert.match(stars.style.maskImage,/tdb-review-star.svg/);
  assert.equal((stars.style.maskImage.match(/url\(/g)||[]).length,5);
  assert.equal(barns.style.getPropertyValue('--tdb-barns-artwork'),'');
  f.permit(false);f.ios[0].fn([{target:barns,isIntersecting:true}]);
  assert.equal(barns.style.getPropertyValue('--tdb-barns-artwork'),'');
  f.permit(true);
  assert.match(barns.style.getPropertyValue('--tdb-barns-artwork'),/tdb-barn-window-light.min.svg/);
  assert.equal(stars.childElementCount,0);assert.equal(barns.childElementCount,0);
  assert.equal(barns.style.maskImage,'');
 }finally{f.close()}
});

test('contact masks wait for proximity and reuse the exact footer social artwork',()=>{
 const f=fixture();try{
  for(const kind of ['email','phone','mobile','address','instagram','facebook']){
   const contact=f.w.document.createElement('a');contact.className='tdb-contact-item tdb-contact-'+kind;
   f.w.document.body.append(contact);f.w.TDBLazyIconMasks.refresh();
   assert.equal(contact.style.getPropertyValue('--tdb-contact-artwork'),'');
   f.ios[0].fn([{target:contact,isIntersecting:true}]);
   assert.match(contact.style.getPropertyValue('--tdb-contact-artwork'),new RegExp('tdb-(contact|footer)-'+kind+'\\.svg'));
   assert.equal(contact.childElementCount,0);
   if(['instagram','facebook'].includes(kind)){
    const footer=f.w.document.createElement('a');footer.className='footer1_social-link tdb-footer-'+kind;
    f.w.document.body.append(footer);f.w.TDBLazyIconMasks.refresh();f.ios[0].fn([{target:footer,isIntersecting:true}]);
    assert.equal(contact.style.getPropertyValue('--tdb-contact-artwork'),footer.style.getPropertyValue('--tdb-footer-artwork'));
   }
  }
 }finally{f.close()}
});

test('journey clock, distance and universal globe masks remain deferred and add no child DOM',()=>{
 const f=fixture();try{for(const kind of ['clock','distance','globe']){
  const node=f.w.document.createElement('span');node.dataset.tdbJourneyIcon=kind;f.w.document.body.append(node);f.w.TDBLazyIconMasks.refresh();
  assert.equal(node.style.getPropertyValue('--tdb-journey-icon'),'');
  f.ios[0].fn([{target:node,isIntersecting:true}]);
  assert.match(node.style.getPropertyValue('--tdb-journey-icon'),new RegExp('tdb-(review-clock-brand|journey-distance|globe)\\.svg'));
  assert.equal(node.childElementCount,0);
 }}finally{f.close()}
});
